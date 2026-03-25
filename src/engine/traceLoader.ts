// src/engine/traceLoader.ts
import type { ExecutionFrame } from '../types/execution'

interface TraceFile {
  language: string
  snippet: string
  code: string
  frames: ExecutionFrame[]
}

export async function loadTrace(language: string, snippet: string): Promise<ExecutionFrame[]> {
  const url = `${import.meta.env.BASE_URL}traces/${language}/${snippet}.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Trace not found: ${language}/${snippet}`)
  const data: TraceFile = await res.json()
  return data.frames
}
