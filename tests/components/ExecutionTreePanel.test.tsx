import { render } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import ExecutionTreePanel from '../../src/components/ExecutionTreePanel'
import { useExecutionStore } from '../../src/store/executionStore'
import type { ExecutionFrame } from '../../src/types/execution'

const makeFrame = (overrides: Partial<ExecutionFrame> = {}): ExecutionFrame => ({
  step: 0, line: 1, type: 'normal', isBreakpoint: false,
  variables: {}, callStack: [{ name: '(main)', line: 1, args: {} }],
  heap: [], output: [], error: null, ...overrides,
})

describe('ExecutionTreePanel', () => {
  beforeEach(() => {
    useExecutionStore.setState({ frames: [], currentStep: 0 })
  })

  it('renders without crashing when no frames', () => {
    const { container } = render(<ExecutionTreePanel />)
    expect(container).toBeTruthy()
  })

  it('renders canvas when frames exist', () => {
    useExecutionStore.setState({ frames: [makeFrame()], currentStep: 0 })
    const { container } = render(<ExecutionTreePanel />)
    expect(container.querySelector('canvas')).toBeTruthy()
  })
})
