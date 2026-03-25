import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import CallStackPanel from '../../src/components/CallStackPanel'
import { useExecutionStore } from '../../src/store/executionStore'
import type { ExecutionFrame } from '../../src/types/execution'

const mockFrame: ExecutionFrame = {
  step: 2, line: 3, type: 'call', isBreakpoint: false,
  variables: {},
  callStack: [
    { name: '(main)', line: 1, args: {} },
    { name: 'fib', line: 3, args: { n: 5 } },
  ],
  heap: [], output: [], error: null,
}

describe('CallStackPanel', () => {
  beforeEach(() => {
    useExecutionStore.setState({ frames: [mockFrame], currentStep: 0 })
  })

  it('renders all frame names', () => {
    render(<CallStackPanel />)
    expect(screen.getByText('(main)')).toBeTruthy()
    expect(screen.getByText('fib')).toBeTruthy()
  })

  it('shows depth badge', () => {
    render(<CallStackPanel />)
    expect(screen.getByText('Depth: 2')).toBeTruthy()
  })

  it('shows empty state', () => {
    useExecutionStore.setState({ frames: [], currentStep: 0 })
    render(<CallStackPanel />)
    expect(screen.getByText(/run/i)).toBeTruthy()
  })
})
