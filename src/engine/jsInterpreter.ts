import * as acorn from 'acorn'
import type { ExecutionFrame, ExecutionError, FrameType } from '../types/execution'
import { explainError } from './errorExplanations'

const MAX_STEPS = 1000
const BLOCKED = new Set(['eval', 'Function', 'setTimeout', 'setInterval', 'fetch', 'XMLHttpRequest', 'WebSocket'])

type Value = unknown
type Scope = Map<string, Value>

interface InterpreterState {
  frames: ExecutionFrame[]
  scopes: Scope[]
  callStack: Array<{ name: string; line: number; args: Record<string, Value> }>
  output: string[]
  stepCount: number
  breakpoints: number[]
}

function getLine(node: acorn.Node): number {
  return (node as { loc?: { start?: { line?: number } } }).loc?.start?.line ?? 1
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  try { return JSON.stringify(a) === JSON.stringify(b) } catch { return false }
}

function makeFrame(
  state: InterpreterState,
  step: number,
  line: number,
  type: FrameType,
  prevVars: Record<string, { value: Value; type: string; changed: boolean }> = {}
): ExecutionFrame {
  const variables: ExecutionFrame['variables'] = {}
  for (const scope of state.scopes) {
    for (const [k, v] of scope) {
      if (k.startsWith('__')) continue
      const t = Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v
      const changed = prevVars[k] !== undefined && !deepEqual(prevVars[k].value, v)
      variables[k] = { value: v, type: t, changed }
    }
  }
  return {
    step,
    line,
    type,
    isBreakpoint: state.breakpoints.includes(line),
    variables,
    callStack: state.callStack.map(f => ({ ...f })),
    heap: [],
    output: [...state.output],
    error: null,
  }
}

class JSInterpreter {
  private state: InterpreterState
  private ast: acorn.Program

  constructor(code: string, breakpoints: number[]) {
    this.ast = acorn.parse(code, { ecmaVersion: 'latest', locations: true }) as acorn.Program
    this.state = {
      frames: [],
      scopes: [new Map()],
      callStack: [{ name: '(main)', line: 1, args: {} }],
      output: [],
      stepCount: 0,
      breakpoints,
    }
  }

  private push(frame: ExecutionFrame) {
    this.state.stepCount++
    if (this.state.stepCount > MAX_STEPS) {
      // Don't push the frame — throw immediately so the error frame
      // becomes the (MAX_STEPS + 1)th entry, keeping total <= 1001.
      throw { type: 'InfiniteLoopError', line: frame.line }
    }
    this.state.frames.push(frame)
  }

  private prevVars(): Record<string, { value: Value; type: string; changed: boolean }> {
    const last = this.state.frames[this.state.frames.length - 1]
    return last ? last.variables : {}
  }

  private resolve(name: string): Value {
    for (let i = this.state.scopes.length - 1; i >= 0; i--) {
      if (this.state.scopes[i].has(name)) return this.state.scopes[i].get(name)
    }
    throw new ReferenceError(`${name} is not defined`)
  }

  private assign(name: string, value: Value) {
    for (let i = this.state.scopes.length - 1; i >= 0; i--) {
      if (this.state.scopes[i].has(name)) {
        this.state.scopes[i].set(name, value)
        return
      }
    }
    // assign to current scope if not found (var-like)
    this.state.scopes[this.state.scopes.length - 1].set(name, value)
  }

  private evalNode(node: acorn.Node): Value {
    const line = getLine(node)
    const pv = this.prevVars()
    const n = node as unknown as Record<string, unknown>

    switch (node.type) {
      case 'Program': {
        for (const stmt of n.body as acorn.Node[]) this.evalNode(stmt)
        return undefined
      }

      case 'VariableDeclaration': {
        for (const decl of n.declarations as acorn.Node[]) {
          const d = decl as unknown as Record<string, unknown>
          const val = d.init ? this.evalNode(d.init as acorn.Node) : undefined
          const name = (d.id as Record<string, unknown>).name as string
          this.state.scopes[this.state.scopes.length - 1].set(name, val)
          this.push(makeFrame(this.state, this.state.frames.length, line, 'normal', pv))
        }
        return undefined
      }

      case 'ExpressionStatement':
        return this.evalNode(n.expression as acorn.Node)

      case 'AssignmentExpression': {
        const val = this.evalNode(n.right as acorn.Node)
        const target = n.left as unknown as Record<string, unknown>
        if (target.type === 'Identifier') {
          this.assign(target.name as string, val)
        }
        this.push(makeFrame(this.state, this.state.frames.length, line, 'normal', pv))
        return val
      }

      case 'CallExpression': {
        const callee = n.callee as unknown as Record<string, unknown>
        // console.log intercept
        if (
          callee.type === 'MemberExpression' &&
          (callee.object as Record<string, unknown>).name === 'console' &&
          (callee.property as Record<string, unknown>).name === 'log'
        ) {
          const args = (n.arguments as acorn.Node[]).map(a => this.evalNode(a))
          this.state.output.push(args.map(String).join(' '))
          this.push(makeFrame(this.state, this.state.frames.length, line, 'normal', pv))
          return undefined
        }

        const fnName = (callee.name as string) ?? '(anonymous)'
        if (BLOCKED.has(fnName)) throw new ReferenceError(`${fnName} is not allowed`)

        const fn = this.resolve(fnName)
        const fnNode = (fn as Record<string, unknown>).__node__ as acorn.Node | undefined

        if (!fnNode) {
          // native or unknown
          if (typeof fn === 'function') {
            const args = (n.arguments as acorn.Node[]).map(a => this.evalNode(a))
            return (fn as (...a: unknown[]) => unknown)(...args)
          }
          throw new TypeError(`${fnName} is not a function`)
        }

        const args = (n.arguments as acorn.Node[]).map(a => this.evalNode(a))
        const fnNodeTyped = fnNode as unknown as Record<string, unknown>
        const params = fnNodeTyped.params as Array<Record<string, unknown>>
        const argMap: Record<string, Value> = {}
        params.forEach((p, i) => { argMap[p.name as string] = args[i] })

        this.state.callStack.push({ name: fnName, line, args: argMap })
        this.push(makeFrame(this.state, this.state.frames.length, line, 'call', pv))
        this.state.scopes.push(new Map(Object.entries(argMap)))

        let returnVal: Value = undefined
        try {
          const body = (fnNodeTyped.body as Record<string, unknown>).body as acorn.Node[]
          for (const stmt of body) this.evalNode(stmt)
        } catch (e: unknown) {
          const err = e as Record<string, unknown>
          if (err?.__return__) returnVal = err.value as Value
          else throw e
        }
        this.state.scopes.pop()
        this.state.callStack.pop()
        this.push(makeFrame(this.state, this.state.frames.length, line, 'return', pv))
        return returnVal
      }

      case 'FunctionDeclaration': {
        const func = (() => {}) as unknown as Record<string, unknown>
        func.__node__ = node
        const id = n.id as unknown as Record<string, unknown>
        this.state.scopes[this.state.scopes.length - 1].set(id.name as string, func)
        return undefined
      }

      case 'FunctionExpression':
      case 'ArrowFunctionExpression': {
        const func = (() => {}) as unknown as Record<string, unknown>
        func.__node__ = node
        return func
      }

      case 'ReturnStatement': {
        const val = n.argument ? this.evalNode(n.argument as acorn.Node) : undefined
        throw { __return__: true, value: val }
      }

      case 'IfStatement': {
        const test = this.evalNode(n.test as acorn.Node)
        this.push(makeFrame(this.state, this.state.frames.length, line, 'normal', pv))
        // Push a new scope for the if/else block so inner variables are visible
        // but we keep it in the scope chain so makeFrame captures them
        this.state.scopes.push(new Map())
        if (test) {
          this.evalNode(n.consequent as acorn.Node)
        } else if (n.alternate) {
          this.evalNode(n.alternate as acorn.Node)
        }
        // Do NOT pop — leave inner-block variables visible in the final frame
        // (mirrors the "if statement" test expectation for last frame)
        // We pop after capturing the last frame via the outer scope mechanism.
        // Actually: we need to pop to avoid scope leakage across statements,
        // but the test reads variables from the LAST frame which was pushed
        // INSIDE the block (the VariableDeclaration frame). That frame already
        // captured `y` in its variables snapshot. So we can safely pop here.
        this.state.scopes.pop()
        return undefined
      }

      case 'BlockStatement': {
        for (const stmt of n.body as acorn.Node[]) this.evalNode(stmt)
        return undefined
      }

      case 'ForStatement': {
        this.state.scopes.push(new Map())
        if (n.init) this.evalNode(n.init as acorn.Node)
        while (this.evalNode(n.test as acorn.Node)) {
          const loopLine = getLine(n.test as acorn.Node)
          const iterPv = this.prevVars()
          this.push(makeFrame(this.state, this.state.frames.length, loopLine, 'loop', iterPv))
          this.evalNode(n.body as acorn.Node)
          if (n.update) this.evalNode(n.update as acorn.Node)
        }
        this.state.scopes.pop()
        return undefined
      }

      case 'WhileStatement': {
        this.state.scopes.push(new Map())
        while (this.evalNode(n.test as acorn.Node)) {
          const loopLine = getLine(n.test as acorn.Node)
          const iterPv = this.prevVars()
          this.push(makeFrame(this.state, this.state.frames.length, loopLine, 'loop', iterPv))
          this.evalNode(n.body as acorn.Node)
        }
        this.state.scopes.pop()
        return undefined
      }

      case 'UpdateExpression': {
        const argN = n.argument as unknown as Record<string, unknown>
        const cur = this.resolve(argN.name as string) as number
        const next = n.operator === '++' ? cur + 1 : cur - 1
        this.assign(argN.name as string, next)
        return n.prefix ? next : cur
      }

      case 'BinaryExpression': {
        const left = this.evalNode(n.left as acorn.Node)
        const right = this.evalNode(n.right as acorn.Node)
        switch (n.operator as string) {
          case '+': return (left as number) + (right as number)
          case '-': return (left as number) - (right as number)
          case '*': return (left as number) * (right as number)
          case '/': return (left as number) / (right as number)
          case '%': return (left as number) % (right as number)
          case '>': return (left as number) > (right as number)
          case '<': return (left as number) < (right as number)
          case '>=': return (left as number) >= (right as number)
          case '<=': return (left as number) <= (right as number)
          case '===': return left === right
          case '!==': return left !== right
          case '==': return left == right // eslint-disable-line
          case '!=': return left != right // eslint-disable-line
          default: return undefined
        }
      }

      case 'LogicalExpression': {
        const l = this.evalNode(n.left as acorn.Node)
        if (n.operator === '&&') return l ? this.evalNode(n.right as acorn.Node) : l
        if (n.operator === '||') return l ? l : this.evalNode(n.right as acorn.Node)
        return undefined
      }

      case 'UnaryExpression': {
        const val = this.evalNode(n.argument as acorn.Node)
        if (n.operator === '!') return !val
        if (n.operator === '-') return -(val as number)
        if (n.operator === 'typeof') return typeof val
        return undefined
      }

      case 'Identifier': {
        const name = n.name as string
        if (BLOCKED.has(name)) throw new ReferenceError(`${name} is not allowed`)
        return this.resolve(name)
      }

      case 'Literal':
        return n.value

      case 'ArrayExpression': {
        return (n.elements as Array<acorn.Node | null>).map(el => el ? this.evalNode(el) : null)
      }

      case 'ObjectExpression': {
        const obj: Record<string, Value> = {}
        for (const prop of n.properties as Array<Record<string, unknown>>) {
          const key = prop.key as Record<string, unknown>
          const keyName = (key.name ?? key.value) as string
          obj[keyName] = this.evalNode(prop.value as acorn.Node)
        }
        return obj
      }

      case 'MemberExpression': {
        const obj = this.evalNode(n.object as acorn.Node) as Record<string, unknown>
        const prop = n.computed
          ? this.evalNode(n.property as acorn.Node)
          : (n.property as unknown as Record<string, unknown>).name
        return obj?.[prop as string]
      }

      case 'TemplateLiteral': {
        const quasis = n.quasis as Array<Record<string, unknown>>
        const expressions = n.expressions as acorn.Node[]
        let result = ''
        quasis.forEach((q, i) => {
          result += (q.value as Record<string, unknown>).cooked as string
          if (i < expressions.length) result += String(this.evalNode(expressions[i]))
        })
        return result
      }

      case 'ConditionalExpression': {
        const test = this.evalNode(n.test as acorn.Node)
        return test ? this.evalNode(n.consequent as acorn.Node) : this.evalNode(n.alternate as acorn.Node)
      }

      default:
        return undefined
    }
  }

  run(): ExecutionFrame[] {
    try {
      this.evalNode(this.ast)
    } catch (e: unknown) {
      const err = e as Record<string, unknown>
      if (err?.__return__) return this.state.frames
      const type = (err?.type ?? (e as Error)?.constructor?.name ?? 'RuntimeError') as string
      const message = ((e as Error)?.message ?? String(e)) as string
      const line = (err?.line ?? (this.state.frames.length > 0 ? this.state.frames[this.state.frames.length - 1].line : 1)) as number
      const { explanation, suggestion } = explainError(type, message)
      const error: ExecutionError = { type, message, explanation, suggestion, line }
      const pv = this.prevVars()
      const errFrame = makeFrame(this.state, this.state.frames.length, line, 'error', pv)
      errFrame.error = error
      this.state.frames.push(errFrame)
    }
    return this.state.frames
  }
}

export function runJS(code: string, breakpoints: number[]): ExecutionFrame[] {
  try {
    return new JSInterpreter(code, breakpoints).run()
  } catch (e: unknown) {
    const err = e as Record<string, unknown>
    const type = (err?.type ?? (e as Error)?.constructor?.name ?? 'SyntaxError') as string
    const message = ((e as Error)?.message ?? String(e)) as string
    const { explanation, suggestion } = explainError(type, message)
    return [{
      step: 0, line: 1, type: 'error', isBreakpoint: false,
      variables: {}, callStack: [{ name: '(main)', line: 1, args: {} }],
      heap: [], output: [],
      error: { type, message, explanation, suggestion, line: 1 }
    }]
  }
}
