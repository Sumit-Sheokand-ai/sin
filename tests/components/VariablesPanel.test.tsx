import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import VariablesPanel from '../../src/components/VariablesPanel'
import { useExecutionStore } from '../../src/store/executionStore'
import type { ExecutionFrame } from '../../src/types/execution'

const mockFrame: ExecutionFrame = {
  step: 1, line: 2, type: 'normal', isBreakpoint: false,
  variables: {
    x: { value: 42, type: 'number', changed: true },
    name: { value: 'Alice', type: 'string', changed: false },
  },
  callStack: [], heap: [], output: [], error: null,
}

describe('VariablesPanel', () => {
  beforeEach(() => {
    useExecutionStore.setState({ frames: [mockFrame], currentStep: 0 })
  })

  it('renders variable names', () => {
    render(<VariablesPanel />)
    expect(screen.getByText('x')).toBeTruthy()
    expect(screen.getByText('name')).toBeTruthy()
  })

  it('renders variable values', () => {
    render(<VariablesPanel />)
    expect(screen.getByText('42')).toBeTruthy()
    expect(screen.getByText('"Alice"')).toBeTruthy()
  })

  it('renders type badges', () => {
    render(<VariablesPanel />)
    expect(screen.getByText('number')).toBeTruthy()
    expect(screen.getByText('string')).toBeTruthy()
  })

  it('shows empty state when no frames', () => {
    useExecutionStore.setState({ frames: [], currentStep: 0 })
    render(<VariablesPanel />)
    expect(screen.getByText(/run/i)).toBeTruthy()
  })
})
