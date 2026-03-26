import { useEffect, useRef, useState } from 'react'
import { useExecutionStore } from './store/executionStore'
import Sidebar from './components/Sidebar'
import CodeEditor from './components/CodeEditor'
import ControlBar from './components/ControlBar'
import VariablesPanel from './components/VariablesPanel'
import CallStackPanel from './components/CallStackPanel'
import ExecutionTreePanel from './components/ExecutionTreePanel'
import FlowTracePanel from './components/FlowTracePanel'
import OutputConsole from './components/OutputConsole'
import ErrorExplainer from './components/ErrorExplainer'
import ExecutionTimeline from './components/ExecutionTimeline'
import TimerBadge from './components/TimerBadge'
import './index.css'

// ── Icon helper ────────────────────────────────────────────────────────────
function Icon({ name, size = 20, style }: { name: string; size?: number; style?: React.CSSProperties }) {
  return <span className="msi" style={{ fontSize: size, lineHeight: 1, ...style }}>{name}</span>
}

// ── Sidebar nav config ─────────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    icon: 'account_tree', key: 'Timeline',
    label: 'Execution Tree',
    desc: 'See the full path the code took — every function call visualized as a tree.',
  },
  {
    icon: 'database', key: 'Variables',
    label: 'Variables',
    desc: 'Watch values change in real time as each line of code runs.',
  },
  {
    icon: 'layers', key: 'Stack',
    label: 'Call Stack',
    desc: 'See which function is currently running and how we got there.',
  },
  {
    icon: 'output', key: 'Logs',
    label: 'Output',
    desc: 'See what your code printed and any errors that occurred.',
  },
] as const
type NavKey = typeof NAV_ITEMS[number]['key']

// ── Language helpers ───────────────────────────────────────────────────────
const EXT: Record<string, string> = {
  javascript: 'js', python: 'py', java: 'java', cpp: 'cpp', c: 'c', pseudocode: 'txt',
}

// ── Status config ─────────────────────────────────────────────────────────
function statusInfo(status: string, hasFrames: boolean) {
  if (status === 'loading') return { dot: 'var(--yellow)', label: 'Running your code…', pulse: true  }
  if (status === 'error')   return { dot: 'var(--error)',  label: 'Something went wrong', pulse: false }
  if (hasFrames)            return { dot: 'var(--green)',  label: 'Ready to explore',  pulse: true  }
  return                          { dot: 'var(--text-hint)', label: 'Waiting for code', pulse: false }
}

// ── Drag-resize hook ───────────────────────────────────────────────────────
function useDragResize(
  initial: number,
  min: number,
  max: number,
  axis: 'x' | 'y',
  direction: 1 | -1 = 1,
): [number, (e: React.MouseEvent) => void] {
  const [size, setSize] = useState(initial)
  const startRef = useRef(0)
  const sizeRef  = useRef(initial)

  const onDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    startRef.current = axis === 'x' ? e.clientX : e.clientY
    sizeRef.current  = size

    const onMove = (ev: MouseEvent) => {
      const delta = ((axis === 'x' ? ev.clientX : ev.clientY) - startRef.current) * direction
      setSize(Math.max(min, Math.min(max, sizeRef.current + delta)))
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return [size, onDragStart]
}

// ── Drag handle ────────────────────────────────────────────────────────────
function DragHandle({ onDragStart, axis }: {
  onDragStart: (e: React.MouseEvent) => void
  axis: 'x' | 'y'
}) {
  const [hover, setHover] = useState(false)
  const isX = axis === 'x'
  return (
    <div
      onMouseDown={onDragStart}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title="Drag to resize"
      style={{
        flexShrink: 0,
        width:  isX ? '5px' : '100%',
        height: isX ? '100%' : '5px',
        cursor: isX ? 'col-resize' : 'row-resize',
        background: hover ? 'rgba(140,183,254,0.25)' : 'transparent',
        transition: 'background 0.15s',
        position: 'relative',
        zIndex: 20,
        userSelect: 'none',
      }}
    >
      <div style={{
        position: 'absolute',
        top: isX ? '50%' : '0', left: isX ? '0' : '50%',
        transform: isX ? 'translateY(-50%)' : 'translateX(-50%)',
        width:  isX ? '2px' : '40px',
        height: isX ? '40px' : '2px',
        background: hover ? 'rgba(140,183,254,0.6)' : 'rgba(71,70,88,0.3)',
        borderRadius: '2px',
        transition: 'background 0.15s',
      }} />
    </div>
  )
}

// ── Beginner "Getting Started" empty state ────────────────────────────────
function GettingStarted({ currentNav }: { currentNav: NavKey }) {
  const steps = [
    { n: '1', icon: 'edit_note',  text: 'Choose a language and pick an example from the left sidebar, or paste your own code.' },
    { n: '2', icon: 'play_arrow', text: 'Hit the Run button to trace through the code step by step.' },
    { n: '3', icon: 'skip_next',  text: 'Use the arrow buttons (or ← → keys) to step forward and backward through execution.' },
    { n: '4', icon: 'school',     text: 'Watch this panel update at each step — see variables change, calls stack up, and output appear.' },
  ]
  const navDesc = NAV_ITEMS.find(n => n.key === currentNav)?.desc ?? ''
  return (
    <div style={{ padding: '20px 16px' }}>
      <div style={{
        padding: '12px 14px', marginBottom: '20px',
        background: 'rgba(140,183,254,0.06)',
        border: '1px solid rgba(140,183,254,0.18)',
        borderRadius: '12px',
      }}>
        <div style={{ fontSize: '11px', fontFamily: 'var(--font-ui)', color: 'var(--primary)', fontWeight: 600, marginBottom: '4px' }}>
          About this panel
        </div>
        <p style={{ fontSize: '12px', fontFamily: 'var(--font-ui)', color: 'var(--text-dim)', lineHeight: 1.6, margin: 0 }}>
          {navDesc}
        </p>
      </div>

      <div style={{ fontSize: '11px', fontFamily: 'var(--font-ui)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-hint)', marginBottom: '12px' }}>
        How to get started
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {steps.map(s => (
          <div key={s.n} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{
              width: '28px', height: '28px', flexShrink: 0,
              borderRadius: '50%',
              background: 'rgba(140,183,254,0.1)',
              border: '1px solid rgba(140,183,254,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name={s.icon} size={15} style={{ color: 'var(--primary)' }} />
            </div>
            <p style={{ fontSize: '12px', fontFamily: 'var(--font-ui)', color: 'var(--text-dim)', lineHeight: 1.6, margin: 0, paddingTop: '4px' }}>
              {s.text}
            </p>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: '20px', padding: '10px 12px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(71,70,88,0.15)',
        borderRadius: '10px',
        fontSize: '11px', fontFamily: 'var(--font-ui)', color: 'var(--text-hint)',
        lineHeight: 1.6,
      }}>
        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Tip:</span> Use{' '}
        <span style={{ fontFamily: 'var(--font-code)', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.05)', padding: '1px 5px', borderRadius: '4px' }}>←</span>{' / '}
        <span style={{ fontFamily: 'var(--font-code)', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.05)', padding: '1px 5px', borderRadius: '4px' }}>→</span>{' '}
        arrow keys to step through execution after running.
      </div>
    </div>
  )
}

// ── Step progress bar ──────────────────────────────────────────────────────
function StepProgress({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? (current / (total - 1)) * 100 : 0
  const label =
    total === 0 ? 'No trace yet' :
    current === 0 ? 'At the beginning' :
    current === total - 1 ? 'Reached the end' :
    `Step ${current + 1} of ${total}`

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ fontSize: '11px', fontFamily: 'var(--font-ui)', color: 'var(--text-dim)', whiteSpace: 'nowrap', minWidth: '100px' }}>
        {label}
      </span>
      {total > 0 && (
        <div style={{ width: '80px', height: '4px', background: 'rgba(71,70,88,0.3)', borderRadius: '2px', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
            borderRadius: '2px', transition: 'width 0.2s ease',
          }} />
        </div>
      )}
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────
export default function App() {
  const [navKey,   setNavKey]   = useState<NavKey>('Variables')
  const [sideOpen, setSideOpen] = useState(true)
  const [tooSmall, setTooSmall] = useState(window.innerWidth < 1024)

  // Resizable panels
  const [sidebarW,   onSidebarDrag]   = useDragResize(230, 160, 360, 'x',  1)
  const [inspectorW, onInspectorDrag] = useDragResize(300, 220, 520, 'x', -1)
  const [bottomH,    onBottomDrag]    = useDragResize(130,  60, 280, 'y', -1)

  const { frames, currentStep, status, language } = useExecutionStore()

  useEffect(() => {
    const check = () => setTooSmall(window.innerWidth < 1024)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (tooSmall) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '2rem', textAlign: 'center', background: 'var(--bg)' }}>
        <div>
          <Icon name="laptop" size={40} style={{ color: 'var(--primary)', display: 'block', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '14px', marginBottom: '8px', fontWeight: 600 }}>
            Screen too small
          </p>
          <p style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-ui)', fontSize: '13px' }}>
            Luminous Tracer works best on a desktop or laptop (1024px+).
          </p>
        </div>
      </div>
    )
  }

  const SIDEBAR_W = sideOpen ? sidebarW : 56
  const st  = statusInfo(status, frames.length > 0)
  const pct = frames.length > 0 ? (currentStep + 1) / frames.length : 0
  const ext = EXT[language] ?? 'txt'
  const hasRun = frames.length > 0

  // Inspector content driven by nav key
  const inspectorContent = () => {
    if (!hasRun) return <GettingStarted currentNav={navKey} />
    switch (navKey) {
      case 'Variables': return <div style={{ padding: '10px' }}><VariablesPanel /></div>
      case 'Stack':     return <div style={{ padding: '10px' }}><CallStackPanel /></div>
      case 'Logs':      return (
        <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <OutputConsole />
          <ErrorExplainer />
        </div>
      )
      default:          return <ExecutionTreePanel />
    }
  }

  const activeNav = NAV_ITEMS.find(n => n.key === navKey)!

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ══════════════════════════════════════ HEADER ══════════════════════════════════════ */}
      <header style={{
        height: '56px', flexShrink: 0, position: 'relative',
        display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: '10px',
        background: '#0d0d1c',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        zIndex: 50,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div style={{
            width: '30px', height: '30px',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            borderRadius: '9px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(140,183,254,0.4)',
          }}>
            <Icon name="code" size={16} style={{ color: '#fff' }} />
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-headline)', fontWeight: 700,
              fontSize: '15px', letterSpacing: '-0.02em',
              color: '#89b4fa',
              animation: 'logo-glow 4s ease-in-out infinite',
              lineHeight: 1.1,
            }}>
              Luminous Tracer
            </div>
            <div style={{ fontSize: '9px', fontFamily: 'var(--font-ui)', color: 'rgba(140,183,254,0.4)', letterSpacing: '0.06em' }}>
              Code Execution Explorer
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: '1px', height: '28px', background: 'var(--border-dim)', flexShrink: 0 }} />

        {/* Controls */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <ControlBar />
        </div>

        {/* Right: status + step + timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Status pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '4px 12px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-dim)',
            borderRadius: '100px',
          }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: st.dot,
              animation: st.pulse ? 'pulse-dot 1.6s ease-in-out infinite' : 'none',
              boxShadow: st.pulse ? `0 0 6px ${st.dot}` : 'none',
            }} />
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-ui)', color: 'var(--text-dim)' }}>
              {st.label}
            </span>
          </div>

          <TimerBadge />

          <StepProgress current={currentStep} total={frames.length} />
        </div>

        {/* Glow line */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(137,180,250,0.18), rgba(209,171,253,0.18), transparent)',
        }} />
      </header>

      {/* ══════════════════════════════════════ BODY ══════════════════════════════════════ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ══════════════════ SIDEBAR ══════════════════ */}
        <aside style={{
          width: `${SIDEBAR_W}px`, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          background: '#0d0d1c',
          borderRight: '1px solid #1a1a2e',
          transition: sideOpen ? 'none' : 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
          overflow: 'hidden', zIndex: 10,
          position: 'relative',
        }}>
          {/* Sidebar top header */}
          <div style={{
            height: '40px', flexShrink: 0,
            display: 'flex', alignItems: 'center',
            padding: sideOpen ? '0 8px 0 14px' : '0',
            justifyContent: sideOpen ? 'space-between' : 'center',
            borderBottom: '1px solid #1a1a2e',
          }}>
            {sideOpen && (
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-ui)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
                Explorer
              </span>
            )}
            <button onClick={() => setSideOpen(o => !o)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-hint)', padding: '6px', borderRadius: '8px',
              transition: 'color 0.2s, background 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#89b4fa'; e.currentTarget.style.background = 'rgba(137,180,250,0.06)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-hint)'; e.currentTarget.style.background = 'none' }}
            title={sideOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <Icon name={sideOpen ? 'menu_open' : 'menu'} size={18} />
            </button>
          </div>

          {/* Nav items */}
          <nav style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {NAV_ITEMS.map(({ icon, label, key, desc }) => {
              const isActive = navKey === key
              return (
                <button type="button" key={key} onClick={() => setNavKey(key as NavKey)} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 10px',
                  background: isActive ? 'rgba(137,180,250,0.08)' : 'none',
                  border: isActive ? '1px solid rgba(137,180,250,0.15)' : '1px solid transparent',
                  borderRadius: '10px',
                  color: isActive ? '#89b4fa' : 'rgba(230,227,250,0.45)',
                  cursor: 'pointer', transition: 'all 0.18s',
                  width: '100%', textAlign: 'left',
                  justifyContent: sideOpen ? 'flex-start' : 'center',
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = 'rgba(230,227,250,0.85)'; e.currentTarget.style.background = 'rgba(230,227,250,0.04)' }}}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = 'rgba(230,227,250,0.45)'; e.currentTarget.style.background = 'none' }}}
                title={sideOpen ? undefined : `${label} — ${desc}`}
                >
                  <Icon name={icon} size={19} style={{ flexShrink: 0 }} />
                  {sideOpen && (
                    <span style={{ fontSize: '12px', fontFamily: 'var(--font-ui)', fontWeight: isActive ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {label}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Divider */}
          {sideOpen && <div style={{ height: '1px', background: '#1a1a2e', margin: '4px 8px' }} />}

          {/* Language + snippets */}
          {sideOpen && (
            <div style={{ flex: 1, overflow: 'hidden', padding: '0 8px 8px' }}>
              <Sidebar />
            </div>
          )}

          {/* Resize handle (right edge of sidebar) */}
          {sideOpen && (
            <div
              onMouseDown={onSidebarDrag}
              style={{
                position: 'absolute', right: 0, top: 0, bottom: 0, width: '4px',
                cursor: 'col-resize', zIndex: 20,
              }}
              title="Drag to resize sidebar"
            />
          )}
        </aside>

        {/* ══════════════════ MAIN CANVAS ══════════════════ */}
        <main style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          overflow: 'hidden', position: 'relative',
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(140,183,254,0.05) 1px, transparent 0)',
          backgroundSize: '32px 32px',
          backgroundColor: 'var(--bg)',
        }}>

          {/* ── Editor row + Inspector ── */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

            {/* Code Editor */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
              {/* Editor tab bar */}
              <div style={{
                height: '34px', flexShrink: 0,
                display: 'flex', alignItems: 'center',
                padding: '0 12px', gap: '8px',
                background: 'rgba(11,11,26,0.95)',
                borderBottom: '1px solid var(--border-dim)',
              }}>
                {/* macOS dots */}
                <div style={{ display: 'flex', gap: '5px', marginRight: '4px' }}>
                  {['#ff5f57', '#ffbd2e', '#27c93f'].map(c => (
                    <div key={c} style={{ width: '9px', height: '9px', borderRadius: '50%', background: c, opacity: 0.85 }} />
                  ))}
                </div>
                <Icon name="insert_drive_file" size={13} style={{ color: 'var(--text-hint)' }} />
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-code)', color: 'var(--text-dim)' }}>
                  trace.{ext}
                </span>
                {/* Inline progress bar */}
                {hasRun && (
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '80px', height: '3px', background: 'var(--border-dim)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct * 100}%`,
                        background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                        transition: 'width 0.22s ease',
                      }} />
                    </div>
                    <span style={{ fontSize: '10px', fontFamily: 'var(--font-code)', color: 'var(--text-hint)' }}>
                      {Math.round(pct * 100)}%
                    </span>
                  </div>
                )}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <CodeEditor />
              </div>
            </div>

            {/* Inspector drag handle */}
            <DragHandle onDragStart={onInspectorDrag} axis="x" />

            {/* ── Glass Inspector Panel ── */}
            <div style={{
              width: `${inspectorW}px`, flexShrink: 0,
              display: 'flex', flexDirection: 'column',
              background: 'rgba(13,13,28,0.96)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderLeft: '1px solid rgba(71,70,88,0.12)',
              boxShadow: '-8px 0 32px rgba(0,0,0,0.3)',
              overflow: 'hidden',
            }}>
              {/* Inspector header */}
              <div style={{
                padding: '10px 14px',
                borderBottom: '1px solid rgba(71,70,88,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexShrink: 0, background: 'rgba(18,18,35,0.5)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon name={activeNav.icon} size={16} style={{ color: 'var(--primary)' }} />
                  <div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                      {activeNav.label}
                    </div>
                    {hasRun && (
                      <div style={{ fontSize: '10px', fontFamily: 'var(--font-code)', color: 'rgba(140,183,254,0.5)', lineHeight: 1.2 }}>
                        Frame {currentStep + 1} / {frames.length}
                      </div>
                    )}
                  </div>
                </div>
                {/* Tab switcher icons */}
                <div style={{ display: 'flex', gap: '3px' }}>
                  {NAV_ITEMS.map(({ icon, key, label }) => (
                    <button key={key} onClick={() => setNavKey(key as NavKey)}
                      title={label}
                      style={{
                        padding: '5px',
                        background: navKey === key ? 'rgba(140,183,254,0.1)' : 'none',
                        border: navKey === key ? '1px solid rgba(140,183,254,0.22)' : '1px solid transparent',
                        borderRadius: '8px', cursor: 'pointer',
                        color: navKey === key ? 'var(--primary)' : 'var(--text-hint)',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { if (navKey !== key) { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}}
                      onMouseLeave={e => { if (navKey !== key) { e.currentTarget.style.color = 'var(--text-hint)'; e.currentTarget.style.background = 'none' }}}
                    >
                      <Icon name={icon} size={15} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Inspector body */}
              <div style={{ flex: 1, overflow: 'auto' }}>
                {inspectorContent()}
              </div>

              {/* Inspector footer — beginner hint */}
              {hasRun && (
                <div style={{
                  padding: '8px 14px',
                  borderTop: '1px solid rgba(71,70,88,0.1)',
                  flexShrink: 0,
                  background: 'rgba(18,18,35,0.4)',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <Icon name="keyboard" size={14} style={{ color: 'var(--text-hint)', flexShrink: 0 }} />
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-ui)', color: 'var(--text-hint)', lineHeight: 1.4 }}>
                    Press <kbd style={{ fontFamily: 'var(--font-code)', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(71,70,88,0.4)', borderRadius: '4px', padding: '1px 5px', fontSize: '10px' }}>←</kbd> <kbd style={{ fontFamily: 'var(--font-code)', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(71,70,88,0.4)', borderRadius: '4px', padding: '1px 5px', fontSize: '10px' }}>→</kbd> to step through execution
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ══════════════════ BOTTOM TIMELINE ══════════════════ */}
          {/* Drag handle (top of bottom panel) */}
          <DragHandle onDragStart={onBottomDrag} axis="y" />

          <div style={{
            height: `${bottomH}px`, flexShrink: 0,
            display: 'flex', flexDirection: 'column',
            borderTop: '1px solid rgba(71,70,88,0.12)',
            background: 'rgba(13,13,28,0.96)',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Timeline header */}
            <div style={{
              height: '30px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 14px',
              borderBottom: '1px solid rgba(71,70,88,0.1)',
              background: 'rgba(18,18,35,0.5)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="timeline" size={14} style={{ color: 'var(--text-hint)' }} />
                <span style={{ fontSize: '10px', fontFamily: 'var(--font-ui)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
                  Execution Flow
                </span>
                {hasRun && (
                  <span style={{ fontSize: '10px', fontFamily: 'var(--font-ui)', color: 'var(--text-hint)' }}>
                    — {frames.length} steps recorded
                  </span>
                )}
              </div>
              <ExecutionTimeline />
            </div>

            {/* Flow canvas */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <FlowTracePanel />
            </div>

            {/* Scrub bar */}
            <div style={{ height: '4px', flexShrink: 0, background: 'rgba(140,183,254,0.04)', position: 'relative' }}>
              <div style={{
                height: '100%', width: `${pct * 100}%`,
                background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                transition: 'width 0.2s ease', position: 'relative',
              }}>
                {pct > 0 && (
                  <div style={{
                    position: 'absolute', right: '-6px', top: '50%', transform: 'translateY(-50%)',
                    width: '12px', height: '12px', borderRadius: '50%',
                    background: 'var(--primary)',
                    boxShadow: '0 0 10px rgba(140,183,254,0.6)',
                  }} />
                )}
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
