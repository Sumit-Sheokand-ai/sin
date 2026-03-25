import { create } from 'zustand'
import type { ExecutionFrame, Language } from '../types/execution'

type Status = 'idle' | 'running' | 'paused' | 'error' | 'loading'

interface ExecutionStore {
  code: string
  language: Language
  setCode: (code: string) => void
  setLanguage: (lang: Language) => void

  frames: ExecutionFrame[]
  currentStep: number
  setFrames: (frames: ExecutionFrame[]) => void
  setCurrentStep: (step: number) => void

  breakpoints: number[]
  toggleBreakpoint: (line: number) => void

  isPlaying: boolean
  speed: number
  setPlaying: (v: boolean) => void
  setSpeed: (v: number) => void

  status: Status
  setStatus: (s: Status) => void
  elapsedMs: number
  setElapsedMs: (ms: number) => void

  stale: boolean
  setStale: (v: boolean) => void
}

export const useExecutionStore = create<ExecutionStore>((set, get) => ({
  code: '',
  language: 'javascript',
  setCode: (code) => set({ code, stale: get().frames.length > 0 }),
  setLanguage: (language) => set({ language }),

  frames: [],
  currentStep: 0,
  setFrames: (frames) => set({ frames, currentStep: 0, stale: false }),
  setCurrentStep: (currentStep) => set({ currentStep }),

  breakpoints: [],
  toggleBreakpoint: (line) =>
    set((s) => ({
      breakpoints: s.breakpoints.includes(line)
        ? s.breakpoints.filter((l) => l !== line)
        : [...s.breakpoints, line],
    })),

  isPlaying: false,
  speed: 1,
  setPlaying: (isPlaying) => set({ isPlaying }),
  setSpeed: (speed) => set({ speed }),

  status: 'idle',
  setStatus: (status) => set({ status }),
  elapsedMs: 0,
  setElapsedMs: (elapsedMs) => set({ elapsedMs }),

  stale: false,
  setStale: (stale) => set({ stale }),
}))
