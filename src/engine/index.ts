// src/engine/index.ts
import type { ExecutionFrame, Language } from '../types/execution'
import { runJS } from './jsInterpreter'
import { loadTrace } from './traceLoader'

const SIMULATED: Language[] = ['java', 'c', 'cpp', 'pseudocode']

let pyodideWorker: Worker | null = null

function getPyodideWorker(): Worker {
  if (!pyodideWorker) {
    pyodideWorker = new Worker(new URL('./pyodide.worker.ts', import.meta.url), { type: 'module' })
  }
  return pyodideWorker
}

function findSnippetName(code: string, language: Language): string {
  const trimmed = code.trim()
  if (language === 'java') {
    if (trimmed.includes('println("Hello')) return 'hello-world'
    if (trimmed.includes('int x = 10') && trimmed.includes('int y = 20')) return 'variables'
    if (trimmed.includes('for (int i = 0')) return 'loops'
    if (trimmed.includes('fib(')) return 'recursion'
    return 'error'
  }
  if (language === 'c' || language === 'cpp') {
    if (trimmed.includes('Hello')) return 'hello-world'
    if (trimmed.includes('x = 10') && trimmed.includes('y = 20')) return 'variables'
    if (trimmed.includes('for (int i = 0') || trimmed.includes('for(int i=0')) return 'loops'
    if (trimmed.includes('fib(')) return 'recursion'
    return 'error'
  }
  if (language === 'pseudocode') {
    if (trimmed.startsWith('PRINT "Hello')) return 'hello-world'
    if (trimmed.startsWith('SET x = 10')) return 'variables'
    if (trimmed.startsWith('FOR i')) return 'loops'
    if (trimmed.includes('FUNCTION fib')) return 'recursion'
    return 'error'
  }
  return 'hello-world'
}

export async function runCode(
  code: string,
  language: Language,
  breakpoints: number[]
): Promise<{ frames: ExecutionFrame[]; elapsedMs: number }> {
  if (!code.trim()) return { frames: [], elapsedMs: 0 }

  if (language === 'javascript') {
    const t0 = performance.now()
    const frames = runJS(code, breakpoints)
    const elapsedMs = Math.round(performance.now() - t0)
    return { frames, elapsedMs }
  }

  if (language === 'python') {
    return new Promise((resolve) => {
      const worker = getPyodideWorker()
      const handler = (e: MessageEvent) => {
        worker.removeEventListener('message', handler)
        if (e.data.type === 'frames') {
          resolve({ frames: e.data.frames, elapsedMs: e.data.elapsedMs })
        } else {
          const errFrame: ExecutionFrame = {
            step: 0, line: 1, type: 'error', isBreakpoint: false,
            variables: {}, callStack: [{ name: '(main)', line: 1, args: {} }],
            heap: [], output: [], error: e.data.error,
          }
          resolve({ frames: [errFrame], elapsedMs: 0 })
        }
      }
      worker.addEventListener('message', handler)
      worker.postMessage({ type: 'run', code })
    })
  }

  // Simulated languages (Java, C, C++, Pseudocode)
  const snippet = findSnippetName(code, language)
  try {
    const frames = await loadTrace(language, snippet)
    const processed = frames.map(f => ({ ...f, isBreakpoint: breakpoints.includes(f.line) }))
    return { frames: processed, elapsedMs: 0 }
  } catch {
    const errFrame: ExecutionFrame = {
      step: 0, line: 1, type: 'error', isBreakpoint: false,
      variables: {}, callStack: [{ name: '(main)', line: 1, args: {} }],
      heap: [], output: [],
      error: {
        type: 'TraceNotFound',
        message: 'No pre-baked trace for this code.',
        explanation: 'This language uses simulated execution. Select a sample snippet from the sidebar to see it in action.',
        suggestion: 'Choose one of the example snippets from the left sidebar.',
        line: 1,
      },
    }
    return { frames: [errFrame], elapsedMs: 0 }
  }
}
