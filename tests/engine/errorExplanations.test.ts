import { describe, it, expect } from 'vitest'
import { explainError } from '../../src/engine/errorExplanations'

describe('explainError', () => {
  it('explains ReferenceError', () => {
    const r = explainError('ReferenceError', 'y is not defined')
    expect(r.explanation).toContain('variable')
    expect(r.suggestion).toBeTruthy()
  })
  it('explains TypeError', () => {
    const r = explainError('TypeError', 'Cannot read properties of undefined')
    expect(r.explanation).toBeTruthy()
    expect(r.suggestion).toBeTruthy()
  })
  it('explains SyntaxError', () => {
    const r = explainError('SyntaxError', 'Unexpected token')
    expect(r.explanation).toBeTruthy()
    expect(r.suggestion).toBeTruthy()
  })
  it('explains InfiniteLoopError', () => {
    const r = explainError('InfiniteLoopError', '')
    expect(r.explanation).toContain('1000')
    expect(r.suggestion).toBeTruthy()
  })
  it('handles unknown error types gracefully', () => {
    const r = explainError('WeirdError', 'something weird')
    expect(r.explanation).toBeTruthy()
    expect(r.suggestion).toBeTruthy()
  })
})
