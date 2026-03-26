import { useEffect } from 'react'
import { useExecutionStore } from '../store/executionStore'
import { runCode } from '../engine/index'

const BASE_INTERVAL = 800 // ms at 1x speed

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return <span className="msi" style={{ fontSize: size, lineHeight: 1 }}>{name}</span>
}

export default function ControlBar() {
  const {
    code, language, frames, currentStep, setCurrentStep,
    isPlaying, setPlaying, speed, setSpeed,
    setFrames, setStatus, setElapsedMs, breakpoints, status,
  } = useExecutionStore()

  const handleRun = async () => {
    setStatus('loading')
    setPlaying(false)
    const { frames, elapsedMs } = await runCode(code, language, breakpoints)
    if (!frames.length) { setStatus('idle'); return }
    setFrames(frames)
    setElapsedMs(elapsedMs)
    setStatus(frames[frames.length - 1]?.error ? 'error' : 'paused')
  }

  const handleReset   = () => { setPlaying(false); setCurrentStep(0) }
  const stepForward   = () => { if (currentStep < frames.length - 1) setCurrentStep(currentStep + 1); else setPlaying(false) }
  const stepBack      = () => { if (currentStep > 0) setCurrentStep(currentStep - 1) }

  // Auto-play with breakpoint check
  useEffect(() => {
    if (!isPlaying) return
    const id = setInterval(() => {
      const { currentStep: cs, frames: fs, setCurrentStep: scs, setPlaying: sp } = useExecutionStore.getState()
      const next = cs + 1
      if (next >= fs.length) { sp(false); return }
      scs(next)
      if (fs[next]?.isBreakpoint) sp(false)
    }, BASE_INTERVAL / speed)
    return () => clearInterval(id)
  }, [isPlaying, speed])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'TEXTAREA') return
      if (e.key === ' ') { e.preventDefault(); setPlaying(!useExecutionStore.getState().isPlaying) }
      if (e.key === 'ArrowRight') stepForward()
      if (e.key === 'ArrowLeft')  stepBack()
      if (e.key === 'r' || e.key === 'R') handleReset()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isPlaying, currentStep, frames.length])

  const isLoading = status === 'loading'
  const noFrames  = frames.length === 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

      {/* ── Run button ── */}
      <button onClick={handleRun} disabled={isLoading} style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '6px 14px',
        background: isLoading
          ? 'rgba(140,183,254,0.15)'
          : 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dim) 100%)',
        border: isLoading ? '1px solid rgba(140,183,254,0.3)' : 'none',
        borderRadius: '10px',
        color: isLoading ? 'var(--primary)' : 'var(--on-primary)',
        fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 600,
        cursor: isLoading ? 'default' : 'pointer',
        boxShadow: isLoading ? 'none' : '0 2px 12px rgba(140,183,254,0.28)',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => { if (!isLoading) { e.currentTarget.style.boxShadow = '0 4px 18px rgba(140,183,254,0.45)'; e.currentTarget.style.transform = 'translateY(-1px)' }}}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = isLoading ? 'none' : '0 2px 12px rgba(140,183,254,0.28)'; e.currentTarget.style.transform = '' }}
      >
        <Icon name={isLoading ? 'hourglass_empty' : 'play_arrow'} size={16} />
        {isLoading ? 'Tracing…' : 'Run'}
      </button>

      {/* ── Step control group ── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border)',
        borderRadius: '10px', overflow: 'hidden',
      }}>
        {([
          { icon: 'replay',     action: handleReset,                     disabled: noFrames },
          { icon: 'skip_previous', action: stepBack,                      disabled: currentStep === 0 || noFrames },
          { icon: isPlaying ? 'pause' : 'play_arrow', action: () => setPlaying(!isPlaying), disabled: noFrames },
          { icon: 'skip_next',  action: stepForward,                     disabled: currentStep >= frames.length - 1 || noFrames },
        ] as const).map(({ icon, action, disabled }, i) => (
          <button key={i} onClick={action} disabled={disabled} style={{
            width: '32px', height: '32px',
            background: 'none', border: 'none',
            borderLeft: i > 0 ? '1px solid var(--border-dim)' : 'none',
            color: disabled ? 'var(--text-hint)' : 'var(--text-dim)',
            cursor: disabled ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--primary)' }}}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = disabled ? 'var(--text-hint)' : 'var(--text-dim)' }}
          >
            <Icon name={icon} size={17} />
          </button>
        ))}
      </div>

      {/* ── Speed pills ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
        {([0.5, 1, 2, 4] as const).map(s => (
          <button key={s} onClick={() => setSpeed(s)} style={{
            padding: '3px 7px',
            background:   speed === s ? 'rgba(140,183,254,0.14)' : 'none',
            border:       `1px solid ${speed === s ? 'rgba(140,183,254,0.35)' : 'var(--border-dim)'}`,
            borderRadius: '7px',
            color:        speed === s ? 'var(--primary)' : 'var(--text-hint)',
            fontSize:     '10px', fontFamily: 'var(--font-code)',
            cursor: 'pointer', transition: 'all 0.15s',
            whiteSpace: 'nowrap',
          }}>
            {s}x
          </button>
        ))}
      </div>
    </div>
  )
}
