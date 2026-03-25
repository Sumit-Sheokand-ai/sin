export type Language = 'javascript' | 'python' | 'java' | 'c' | 'cpp' | 'pseudocode'

export type FrameType = 'normal' | 'call' | 'return' | 'loop' | 'error'

export interface HeapNode {
  id: string
  label: string
  value: unknown
  type: string
  references: string[]
}

export interface ExecutionError {
  type: string
  message: string
  explanation: string
  suggestion: string
  line: number
}

export interface ExecutionFrame {
  step: number
  line: number
  type: FrameType
  isBreakpoint: boolean
  variables: Record<string, { value: unknown; type: string; changed: boolean }>
  callStack: Array<{ name: string; line: number; args: Record<string, unknown> }>
  heap: HeapNode[]
  output: string[]
  error: ExecutionError | null
}
