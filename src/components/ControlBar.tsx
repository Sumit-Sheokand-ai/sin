import { useEffect, useRef } from 'react'
import { useExecutionStore } from '../store/executionStore'
import { runCode } from '../engine/index'

const BASE_INTERVAL = 800 // ms at 1x speed

export default function ControlBar() {
  const {
    code, language, frames, currentStep, setCurrentStep,
    isPlaying, setPlaying, speed, setSpeed,
    setFrames, setStatus, setElapsedMs, breakpoints, status,
  } = useExecutionStore()

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const handleRun = async () => {
    setStatus('loading')
    setPlaying(false)
    const { frames, elapsedMs } = await runCode(code, language, breakpoints)
    setFrames(frames)
    setElapsedMs(elapsedMs)
    setStatus(frames[frames.length - 1]?.error ? 'error' : 'paused')
  }

  const handleReset = () => {
    setPlaying(false)
    setCurrentStep(0)
  }

  const stepForward = () => {
    if (currentStep < frames.length - 1) setCurrentStep(currentStep + 1)
    else setPlaying(false)
  }

  const stepBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1)
  }

  // Auto-play with breakpoint check
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (!isPlaying) return
    intervalRef.current = setInterval(() => {
      const { currentStep: cs, frames: fs, setCurrentStep: scs, setPlaying: sp } = useExecutionStore.getState()
      const next = cs + 1
      if (next >= fs.length) { sp(false); return }
      scs(next)
      if (fs[next]?.isBreakpoint) sp(false)
    }, BASE_INTERVAL / speed)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isPlaying, speed])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'TEXTAREA') return
      if (e.key === ' ') { e.preventDefault(); setPlaying(!isPlaying) }
      if (e.key === 'ArrowRight') stepForward()
      if (e.key === 'ArrowLeft') stepBack()
      if (e.key === 'r' || e.key === 'R') handleReset()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isPlaying, currentStep, frames.length])

  const btn = (label: string, onClick: () => void, disabled = false) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '4px 10px', background: 'none', border: '1px solid var(--border-active)',
        borderRadius: 'var(--radius-sm)', color: disabled ? 'var(--text-dim)' : 'var(--text)',
        fontFamily: 'var(--font-ui)', fontSize: '12px', cursor: disabled ? 'default' : 'pointer',
        marginRight: '4px', transition: 'background 0.1s',
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
    >
      {label}
    </button>
  )

  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '6px 10px',
      borderBottom: '1px solid var(--border)', gap: '4px', background: 'var(--bg-panel)',
    }}>
      <button
        onClick={handleRun}
        style={{
          padding: '4px 14px', background: 'var(--blue)', border: 'none',
          borderRadius: 'var(--radius-sm)', color: '#fff', fontFamily: 'var(--font-ui)',
          fontSize: '12px', fontWeight: 500, cursor: 'pointer', marginRight: '8px',
        }}
      >
        {status === 'loading' ? '...' : '▶ Run'}
      </button>

      {btn('⏮', handleReset, frames.length === 0)}
      {btn('←', stepBack, currentStep === 0 || frames.length === 0)}
      {btn(isPlaying ? '⏸' : '▶', () => setPlaying(!isPlaying), frames.length === 0)}
      {btn('→', stepForward, currentStep >= frames.length - 1 || frames.length === 0)}

      <div style={{ marginLeft: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Speed:</span>
        {([0.5, 1, 2, 4] as const).map(s => (
          <button key={s} onClick={() => setSpeed(s)} style={{
            padding: '2px 6px', background: speed === s ? 'var(--blue)' : 'none',
            border: '1px solid var(--border-active)', borderRadius: 'var(--radius-sm)',
            color: speed === s ? '#fff' : 'var(--text-dim)', fontSize: '11px',
            fontFamily: 'var(--font-ui)', cursor: 'pointer',
          }}>{s}x</button>
        ))}
      </div>

      {frames.length > 0 && (
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-dim)' }}>
          Step {currentStep + 1} / {frames.length}
        </span>
      )}
    </div>
  )
}
