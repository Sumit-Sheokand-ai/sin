import { describe, it, expect } from 'vitest'
import { runJS } from '../../src/engine/jsInterpreter'

describe('runJS — variable declarations', () => {
  it('captures let declaration', () => {
    const frames = runJS('let x = 5;', [])
    const last = frames[frames.length - 1]
    expect(last.variables['x'].value).toBe(5)
    expect(last.variables['x'].type).toBe('number')
  })

  it('captures string variable', () => {
    const frames = runJS('let name = "Alice";', [])
    const last = frames[frames.length - 1]
    expect(last.variables['name'].value).toBe('Alice')
  })

  it('captures console.log output', () => {
    const frames = runJS('console.log("hello");', [])
    const last = frames[frames.length - 1]
    expect(last.output).toContain('hello')
  })

  it('marks changed variables', () => {
    const frames = runJS('let x = 1;\nx = 2;', [])
    const changeFrame = frames.find(f => f.variables['x']?.value === 2)
    expect(changeFrame?.variables['x'].changed).toBe(true)
  })
})

describe('runJS — errors', () => {
  it('returns error frame for undefined variable', () => {
    const frames = runJS('console.log(y);', [])
    const errorFrame = frames.find(f => f.error !== null)
    expect(errorFrame).toBeTruthy()
    expect(errorFrame!.error!.type).toBe('ReferenceError')
  })

  it('returns frames up to error point', () => {
    const frames = runJS('let x = 1;\nconsole.log(y);', [])
    expect(frames.length).toBeGreaterThan(1)
    expect(frames[frames.length - 1].error).not.toBeNull()
  })
})

describe('runJS — control flow', () => {
  it('handles if statement', () => {
    const frames = runJS('let x = 5;\nif (x > 3) {\n  let y = 1;\n}', [])
    const last = frames[frames.length - 1]
    expect(last.variables['y']).toBeTruthy()
  })

  it('handles for loop — produces loop frames', () => {
    const frames = runJS('for (let i = 0; i < 3; i++) {\n  console.log(i);\n}', [])
    expect(frames.some(f => f.type === 'loop')).toBe(true)
  })
})

describe('runJS — functions', () => {
  it('tracks call stack on function call', () => {
    const frames = runJS('function add(a, b) { return a + b; }\nadd(1, 2);', [])
    const callFrame = frames.find(f => f.callStack.length > 1)
    expect(callFrame).toBeTruthy()
    expect(callFrame!.type).toBe('call')
  })
})

describe('runJS — infinite loop protection', () => {
  it('halts after 1000 steps', () => {
    const frames = runJS('while(true) {}', [])
    expect(frames.length).toBeLessThanOrEqual(1001)
    const last = frames[frames.length - 1]
    expect(last.error?.type).toBe('InfiniteLoopError')
  })
})
