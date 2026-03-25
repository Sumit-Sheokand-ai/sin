import { render } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import FlowTracePanel from '../../src/components/FlowTracePanel'
import { useExecutionStore } from '../../src/store/executionStore'
import type { ExecutionFrame } from '../../src/types/execution'

const makeFrame = (step: number, type: ExecutionFrame['type'] = 'normal'): ExecutionFrame => ({
  step, line: step + 1, type, isBreakpoint: false,
  variables: {}, callStack: [{ name: '(main)', line: 1, args: {} }],
  heap: [], output: [], error: null,
})

describe('FlowTracePanel', () => {
  beforeEach(() => {
    useExecutionStore.setState({ frames: [], currentStep: 0 })
  })

  it('renders without crashing when no frames', () => {
    const { container } = render(<FlowTracePanel />)
    expect(container).toBeTruthy()
  })

  it('renders canvas when frames exist', () => {
    useExecutionStore.setState({
      frames: [makeFrame(0), makeFrame(1, 'call'), makeFrame(2, 'return')],
      currentStep: 1,
    })
    const { container } = render(<FlowTracePanel />)
    expect(container.querySelector('canvas')).toBeTruthy()
  })
})
