import { useEffect, useState } from 'react'
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

// ── Material Symbol helper ─────────────────────────────────────────────────
function Icon({ name, size = 20, style }: { name: string; size?: number; style?: React.CSSProperties }) {
  return <span className="msi" style={{ fontSize: size, lineHeight: 1, ...style }}>{name}</span>
}

// ── Sidebar nav items ──────────────────────────────────────────────────────
const NAV_ITEMS = [
  { icon: 'timeline', label: 'Timeline', key: 'Timeline' },
  { icon: 'database', label: 'Variables', key: 'Variables' },
  { icon: 'layers',   label: 'Stack',     key: 'Stack'    },
  { icon: 'subject',  label: 'Logs',      key: 'Logs'     },
] as const
type NavKey = typeof NAV_ITEMS[number]['key']

// ── Bento metric sparkline card ────────────────────────────────────────────
function MetricCard({ label, value, color, bars }: {
  label: string; value: string; color: string; bars: number[]
}) {
  return (
    <div style={{
      padding: '14px 16px',
      background: 'rgba(18,18,35,0.8)',
      border: '1px solid rgba(71,70,88,0.12)',
      borderRadius: '18px',
      minWidth: '130px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
        <span style={{ fontSize: '9px', fontFamily: 'var(--font-ui)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-hint)' }}>
          {label}
        </span>
        <span style={{ fontSize: '12px', fontFamily: 'var(--font-code)', color, fontWeight: 600 }}>{value}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '28px' }}>
        {bars.map((h, i) => (
          <div key={i} style={{
            flex: 1,
            height: `${h}%`,
            background: i === bars.length - 1 ? color : `${color}33`,
            borderRadius: '2px 2px 0 0',
            transition: 'height 0.4s ease',
          }} />
        ))}
      </div>
    </div>
  )
}

// ── Language extension + trace name maps ──────────────────────────────────
const EXT: Record<string, string> = {
  javascript: 'js', python: 'py', java: 'java', cpp: 'cpp', c: 'c', pseudocode: 'txt',
}
const LANG_TRACE: Record<string, string> = {
  javascript: 'JS_Sequence',  python: 'Py_Sequence',
  java: 'Java_Sequence',      cpp:  'Cpp_Sequence',
  c: 'C_Sequence',            pseudocode: 'Pseudo_Sequence',
}

// ── Status config ─────────────────────────────────────────────────────────
function statusInfo(status: string, hasFrames: boolean) {
  if (status === 'loading') return { dot: 'var(--yellow)',   label: 'Tracing…',      pulse: true  }
  if (status === 'error')   return { dot: 'var(--error)',    label: 'Error',         pulse: false }
  if (hasFrames)            return { dot: 'var(--green)',    label: 'Active Session', pulse: true  }
  return                          { dot: 'var(--text-hint)', label: 'Idle',          pulse: false }
}

// ── Main App ──────────────────────────────────────────────────────────────
export default function App() {
  const [navKey,   setNavKey]   = useState<NavKey>('Timeline')
  const [sideOpen, setSideOpen] = useState(true)
  const [tooSmall, setTooSmall] = useState(window.innerWidth < 1024)

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
          <p style={{ color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '14px' }}>
            Luminous Tracer is best viewed on a desktop (1024px+).
          </p>
        </div>
      </div>
    )
  }

  const SIDEBAR_W = sideOpen ? 256 : 80
  const st        = statusInfo(status, frames.length > 0)
  const pct       = frames.length > 0 ? (currentStep + 1) / frames.length : 0
  const ext       = EXT[language] ?? 'txt'
  const traceName = LANG_TRACE[language] ?? 'Sequence'

  // Sparkline bar heights (6 bars; last bar = live progress)
  const mkBars = (seed: number[]) => seed.map((h, i, a) =>
    i === a.length - 1 ? Math.max(8, pct * 100) : Math.max(8, h * 100)
  )
  const framesBars = mkBars([0.25, 0.45, 0.35, 0.65, 0.55, pct])
  const stepBars   = mkBars([0.35, 0.55, 0.45, 0.75, 0.65, pct])

  // Right inspector content driven by sidebar nav
  const inspectorContent = () => {
    switch (navKey) {
      case 'Variables': return <div style={{ padding: '10px' }}><VariablesPanel /></div>
      case 'Stack':     return <div style={{ padding: '10px' }}><CallStackPanel /></div>
      case 'Logs':      return (
        <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <OutputConsole />
          <ErrorExplainer />
        </div>
      )
      default:          return <ExecutionTreePanel />
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ══════════════════════════════════ TOP APP BAR ══════════════════════════════════ */}
      <header style={{
        height: '64px', flexShrink: 0, position: 'relative',
        display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: '12px',
        background: '#0d0d1c',
        boxShadow: '0 8px 32px rgba(137,180,250,0.08)',
        zIndex: 50,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', flexShrink: 0 }}>
          <div style={{
            width: '32px', height: '32px',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 18px rgba(140,183,254,0.4)',
          }}>
            <Icon name="code" size={17} style={{ color: '#fff' }} />
          </div>
          <span style={{
            fontFamily: 'var(--font-headline)', fontWeight: 700,
            fontSize: '18px', letterSpacing: '-0.03em',
            color: '#89b4fa',
            animation: 'logo-glow 4s ease-in-out infinite',
            whiteSpace: 'nowrap',
          }}>
            Luminous Tracer
          </span>
        </div>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: '2px', marginLeft: '20px' }}>
          {([
            { label: 'Analyzer', active: true  },
            { label: 'Project',  active: false },
            { label: 'History',  active: false },
          ] as const).map(({ label, active }) => (
            <button key={label} style={{
              padding: '4px 14px',
              background: active ? 'rgba(137,180,250,0.08)' : 'none',
              border: active ? '1px solid rgba(137,180,250,0.15)' : '1px solid transparent',
              borderRadius: '100px',
              color: active ? '#89b4fa' : 'rgba(230,227,250,0.5)',
              fontFamily: 'var(--font-headline)', fontSize: '13px',
              fontWeight: active ? 700 : 400, letterSpacing: '-0.01em',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.color = '#89b4fa'; e.currentTarget.style.background = 'rgba(137,180,250,0.05)' }}}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.color = 'rgba(230,227,250,0.5)'; e.currentTarget.style.background = 'none' }}}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{ width: '1px', height: '24px', background: 'var(--border-dim)', flexShrink: 0, marginLeft: '4px' }} />

        {/* ControlBar */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <ControlBar />
        </div>

        {/* Right meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Terminal pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '5px 12px',
            background: 'rgba(18,18,42,0.9)',
            borderRadius: '100px',
            border: '1px solid rgba(71,70,88,0.3)',
          }}>
            <Icon name="terminal" size={13} style={{ color: 'rgba(140,183,254,0.7)' }} />
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-code)', color: 'rgba(140,183,254,0.7)' }}>
              root@tracer:~#
            </span>
          </div>

          {/* Status pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '4px 10px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border)',
            borderRadius: '100px',
          }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: st.dot,
              animation: st.pulse ? 'pulse-dot 1.6s ease-in-out infinite' : 'none',
              boxShadow: st.pulse ? `0 0 6px ${st.dot}` : 'none',
            }} />
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-ui)', color: 'var(--text-dim)', letterSpacing: '0.03em' }}>
              {st.label}
            </span>
          </div>

          {/* Timer */}
          <TimerBadge />

          {/* Step counter */}
          {frames.length > 0 && (
            <div style={{
              padding: '4px 10px',
              background: 'rgba(140,183,254,0.07)',
              border: '1px solid rgba(140,183,254,0.18)',
              borderRadius: '100px',
              fontSize: '11px', fontFamily: 'var(--font-code)',
            }}>
              <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{currentStep + 1}</span>
              <span style={{ color: 'var(--text-hint)' }}> / {frames.length}</span>
            </div>
          )}

          {/* Settings */}
          <button style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(230,227,250,0.4)', borderRadius: '8px', transition: 'color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#89b4fa')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(230,227,250,0.4)')}
          >
            <Icon name="settings" size={20} />
          </button>
          <button style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(230,227,250,0.4)', borderRadius: '8px', transition: 'color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#89b4fa')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(230,227,250,0.4)')}
          >
            <Icon name="help" size={20} />
          </button>

          {/* Avatar */}
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'rgba(140,183,254,0.12)',
            border: '1px solid rgba(140,183,254,0.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#89b4fa', fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-ui)',
            flexShrink: 0,
          }}>
            LT
          </div>
        </div>

        {/* Glowing bottom border */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(137,180,250,0.2) 30%, rgba(209,171,253,0.2) 70%, transparent 100%)',
        }} />
      </header>

      {/* ══════════════════════════════════ BODY ════════════════════════════════════════ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ══════════════════ LEFT SIDE NAV ══════════════════ */}
        <aside style={{
          width: `${SIDEBAR_W}px`, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          background: '#0d0d1c',
          borderRight: '1px solid #1a1a2e',
          transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
          overflow: 'hidden', zIndex: 10,
        }}>

          {/* Sidebar label */}
          {sideOpen && (
            <div style={{ padding: '20px 24px 6px' }}>
              <div style={{ fontSize: '10px', fontFamily: 'var(--font-ui)', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '2px' }}>
                Execution Explorer
              </div>
              <div style={{ fontSize: '9px', fontFamily: 'var(--font-code)', color: 'rgba(140,183,254,0.45)' }}>
                v2.4.0-stable
              </div>
            </div>
          )}

          {/* Toggle button */}
          <div style={{ display: 'flex', justifyContent: sideOpen ? 'flex-end' : 'center', padding: sideOpen ? '4px 14px' : '12px 0 6px' }}>
            <button onClick={() => setSideOpen(o => !o)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-hint)', padding: '6px', borderRadius: '8px',
              transition: 'color 0.2s, background 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#89b4fa'; e.currentTarget.style.background = 'rgba(137,180,250,0.06)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-hint)'; e.currentTarget.style.background = 'none' }}
            >
              <Icon name={sideOpen ? 'menu_open' : 'menu'} size={18} />
            </button>
          </div>

          {/* Nav items */}
          <nav style={{ flex: 1, padding: '4px 12px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
            {NAV_ITEMS.map(({ icon, label, key }) => {
              const isActive = navKey === key
              return (
                <button key={key} onClick={() => setNavKey(key as NavKey)} style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '10px 12px',
                  background: isActive ? 'rgba(137,180,250,0.05)' : 'none',
                  border: 'none',
                  borderRight: isActive ? '2px solid #89b4fa' : '2px solid transparent',
                  borderRadius: '6px 0 0 6px',
                  color: isActive ? '#89b4fa' : 'rgba(230,227,250,0.4)',
                  cursor: 'pointer', transition: 'all 0.2s',
                  width: '100%', textAlign: 'left',
                  justifyContent: sideOpen ? 'flex-start' : 'center',
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = 'rgba(230,227,250,0.8)'; e.currentTarget.style.background = 'rgba(230,227,250,0.03)' }}}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = 'rgba(230,227,250,0.4)'; e.currentTarget.style.background = 'none' }}}
                >
                  <Icon name={icon} size={20} style={{ flexShrink: 0 }} />
                  {sideOpen && (
                    <span style={{ fontSize: '10px', fontFamily: 'var(--font-ui)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      {label}
                    </span>
                  )}
                </button>
              )
            })}

            {/* Language selector + snippets (only when open) */}
            {sideOpen && (
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-dim)', flex: 1, overflow: 'hidden' }}>
                <Sidebar />
              </div>
            )}
          </nav>

          {/* New Trace CTA */}
          <div style={{ padding: sideOpen ? '8px 14px 12px' : '8px 12px 12px', flexShrink: 0 }}>
            <button style={{
              width: '100%', padding: sideOpen ? '11px' : '10px',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
              border: 'none', borderRadius: '14px',
              color: '#001e40',
              fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 700,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              boxShadow: '0 4px 20px rgba(140,183,254,0.22)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(140,183,254,0.42)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(140,183,254,0.22)' }}
            >
              <Icon name="add" size={16} style={{ color: 'inherit' }} />
              {sideOpen && 'New Trace'}
            </button>
          </div>

          {/* Bottom utility links */}
          <div style={{ padding: '0 12px 16px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {([
              { icon: 'menu_book', label: 'Docs'   },
              { icon: 'sensors',   label: 'Status' },
            ] as const).map(({ icon, label }) => (
              <button key={label} style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '7px 12px',
                background: 'none', border: 'none',
                color: 'rgba(230,227,250,0.28)',
                cursor: 'pointer', transition: 'color 0.2s',
                justifyContent: sideOpen ? 'flex-start' : 'center',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(230,227,250,0.65)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(230,227,250,0.28)')}
              >
                <Icon name={icon} size={16} style={{ flexShrink: 0 }} />
                {sideOpen && (
                  <span style={{ fontSize: '9px', fontFamily: 'var(--font-ui)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    {label}
                  </span>
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* ══════════════════ MAIN CANVAS ══════════════════ */}
        <main style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          overflow: 'hidden', position: 'relative',
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(140,183,254,0.055) 1px, transparent 0)',
          backgroundSize: '32px 32px',
          backgroundColor: 'var(--bg)',
        }}>

          {/* ── Header Info / Bento Metrics row ── */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            padding: '20px 28px 14px', flexShrink: 0, zIndex: 10,
          }}>
            <div>
              <h1 style={{
                fontFamily: 'var(--font-headline)', fontSize: '24px', fontWeight: 700,
                color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1.2,
              }}>
                Trace: <span style={{ color: 'var(--primary)' }}>{traceName}_{String(currentStep).padStart(3, '0')}</span>
              </h1>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                {/* Status badge */}
                <span style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '4px 12px',
                  background: 'rgba(18,18,42,0.85)',
                  border: '1px solid rgba(71,70,88,0.2)',
                  borderRadius: '100px',
                  fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-ui)',
                }}>
                  <span style={{
                    width: '7px', height: '7px', borderRadius: '50%', background: st.dot,
                    animation: st.pulse ? 'pulse-dot 1.6s ease-in-out infinite' : 'none',
                    boxShadow: st.pulse ? `0 0 5px ${st.dot}` : 'none',
                  }} />
                  {st.label}
                </span>
                {/* Latency / frames badge */}
                <span style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '4px 12px',
                  background: 'rgba(18,18,42,0.85)',
                  border: '1px solid rgba(71,70,88,0.2)',
                  borderRadius: '100px',
                  fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-ui)',
                }}>
                  <Icon name="schedule" size={13} />
                  {frames.length > 0 ? `${frames.length} frames` : '— frames'}
                </span>
                {/* Language badge */}
                <span style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '4px 12px',
                  background: 'rgba(140,183,254,0.07)',
                  border: '1px solid rgba(140,183,254,0.18)',
                  borderRadius: '100px',
                  fontSize: '11px', color: 'var(--primary)', fontFamily: 'var(--font-code)',
                }}>
                  <Icon name="code" size={13} />
                  trace.{ext}
                </span>
              </div>
            </div>

            {/* Bento metric cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', flexShrink: 0 }}>
              <MetricCard
                label="Frames"
                value={frames.length > 0 ? String(frames.length) : '0'}
                color="var(--primary)"
                bars={framesBars}
              />
              <MetricCard
                label="Step"
                value={frames.length > 0 ? String(currentStep + 1) : '0'}
                color="var(--secondary)"
                bars={stepBars}
              />
            </div>
          </div>

          {/* ── Editor + Floating Glass Inspector ── */}
          <div style={{
            flex: 1, display: 'flex', overflow: 'hidden', position: 'relative',
          }}>

            {/* Code Editor */}
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
              borderRight: '1px solid var(--border-dim)',
            }}>
              {/* Editor tab bar (macOS style) */}
              <div style={{
                height: '34px', flexShrink: 0,
                display: 'flex', alignItems: 'center',
                padding: '0 12px', gap: '8px',
                background: 'rgba(11,11,26,0.92)',
                borderBottom: '1px solid var(--border-dim)',
              }}>
                <div style={{ display: 'flex', gap: '5px', marginRight: '4px' }}>
                  {['#ff5f57', '#ffbd2e', '#27c93f'].map(c => (
                    <div key={c} style={{ width: '9px', height: '9px', borderRadius: '50%', background: c, opacity: 0.9 }} />
                  ))}
                </div>
                <Icon name="code" size={13} style={{ color: 'var(--text-hint)' }} />
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-code)', color: 'var(--text-dim)' }}>
                  trace.{ext}
                </span>
                {/* Progress micro-bar */}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {frames.length > 0 && (
                    <>
                      <div style={{ width: '64px', height: '3px', background: 'var(--border-dim)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${pct * 100}%`,
                          background: 'linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)',
                          borderRadius: '2px', transition: 'width 0.25s ease',
                        }} />
                      </div>
                      <span style={{ fontSize: '9px', fontFamily: 'var(--font-code)', color: 'var(--text-hint)' }}>
                        {Math.round(pct * 100)}%
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <CodeEditor />
              </div>
            </div>

            {/* ── Floating Glass Inspector ── */}
            <div style={{
              width: '320px', flexShrink: 0,
              display: 'flex', flexDirection: 'column',
              background: 'rgba(13,13,28,0.94)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderLeft: '1px solid rgba(71,70,88,0.15)',
              boxShadow: 'inset 1px 0 0 rgba(140,183,254,0.06), -12px 0 40px rgba(0,0,0,0.35)',
              animation: 'border-glow-flow 5s ease-in-out infinite',
            }}>
              {/* Inspector header */}
              <div style={{
                padding: '16px 20px 12px',
                borderBottom: '1px solid rgba(71,70,88,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexShrink: 0,
              }}>
                <div>
                  <h3 style={{
                    fontFamily: 'var(--font-headline)', fontSize: '14px', fontWeight: 700,
                    color: 'var(--text)', letterSpacing: '-0.01em',
                  }}>
                    {navKey === 'Timeline'  ? 'Execution Tree'    :
                     navKey === 'Variables' ? 'Variables & State' :
                     navKey === 'Stack'     ? 'Call Stack'        : 'Output Logs'}
                  </h3>
                  {frames.length > 0 && (
                    <p style={{ fontSize: '9px', fontFamily: 'var(--font-code)', color: 'rgba(140,183,254,0.5)', marginTop: '2px' }}>
                      Frame {currentStep + 1} / {frames.length}
                    </p>
                  )}
                </div>
                {/* Mini tab switcher */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  {NAV_ITEMS.map(({ icon, key }) => (
                    <button key={key} onClick={() => setNavKey(key as NavKey)} style={{
                      padding: '5px',
                      background: navKey === key ? 'rgba(140,183,254,0.1)' : 'none',
                      border: navKey === key ? '1px solid rgba(140,183,254,0.22)' : '1px solid transparent',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      color: navKey === key ? 'var(--primary)' : 'var(--text-hint)',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { if (navKey !== key) { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}}
                    onMouseLeave={e => { if (navKey !== key) { e.currentTarget.style.color = 'var(--text-hint)'; e.currentTarget.style.background = 'none' }}}
                    title={key}
                    >
                      <Icon name={icon} size={15} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Inspector content */}
              <div style={{ flex: 1, overflow: 'auto' }}>
                {inspectorContent()}
              </div>

              {/* Bottom sparkline metrics */}
              {frames.length > 0 && (
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr',
                  gap: '8px', padding: '10px 12px',
                  borderTop: '1px solid rgba(71,70,88,0.1)',
                  flexShrink: 0,
                  background: 'rgba(18,18,35,0.6)',
                }}>
                  {/* Frames mini-card */}
                  <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(71,70,88,0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '8px', fontFamily: 'var(--font-ui)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-hint)' }}>Frames</span>
                      <span style={{ fontSize: '11px', fontFamily: 'var(--font-code)', color: 'var(--primary)', fontWeight: 600 }}>{frames.length}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '16px' }}>
                      {framesBars.map((h, i) => (
                        <div key={i} style={{ flex: 1, height: `${h}%`, background: i === framesBars.length - 1 ? 'var(--primary)' : 'rgba(140,183,254,0.2)', borderRadius: '1px 1px 0 0' }} />
                      ))}
                    </div>
                  </div>
                  {/* Step mini-card */}
                  <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(71,70,88,0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '8px', fontFamily: 'var(--font-ui)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-hint)' }}>Step</span>
                      <span style={{ fontSize: '11px', fontFamily: 'var(--font-code)', color: 'var(--secondary)', fontWeight: 600 }}>{currentStep + 1}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '16px' }}>
                      {stepBars.map((h, i) => (
                        <div key={i} style={{ flex: 1, height: `${h}%`, background: i === stepBars.length - 1 ? 'var(--secondary)' : 'rgba(209,171,253,0.2)', borderRadius: '1px 1px 0 0' }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ══════════════════════ EXECUTION HISTORY TIMELINE FOOTER ══════════════════════ */}
          <div style={{
            height: '130px', flexShrink: 0,
            display: 'flex', flexDirection: 'column',
            borderTop: '1px solid rgba(71,70,88,0.12)',
            background: 'rgba(13,13,28,0.94)',
            position: 'relative', overflow: 'hidden', zIndex: 30,
          }}>
            {/* Controls bar */}
            <div style={{
              height: '32px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 24px',
              borderBottom: '1px solid rgba(71,70,88,0.1)',
            }}>
              <span style={{ fontSize: '9px', fontFamily: 'var(--font-ui)', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
                Execution History Timeline
              </span>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <ExecutionTimeline />
              </div>
            </div>

            {/* Flow trace canvas */}
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
              <FlowTracePanel />
            </div>

            {/* Scrub bar */}
            <div style={{ height: '5px', flexShrink: 0, background: 'rgba(140,183,254,0.04)', position: 'relative' }}>
              <div style={{
                height: '100%', width: `${pct * 100}%`,
                background: 'linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)',
                transition: 'width 0.22s ease', position: 'relative',
              }}>
                {pct > 0 && (
                  <div style={{
                    position: 'absolute', right: '-7px', top: '50%', transform: 'translateY(-50%)',
                    width: '14px', height: '14px', borderRadius: '50%',
                    background: 'var(--primary)',
                    boxShadow: '0 0 10px rgba(140,183,254,0.55)',
                  }} />
                )}
              </div>
            </div>
          </div>

        </main>
      </div>

      {/* Global frame decoration */}
      <div style={{
        position: 'fixed', inset: 0,
        border: '12px solid rgba(0,0,0,0.12)',
        pointerEvents: 'none', zIndex: 60,
        borderRadius: '0',
      }} />
    </div>
  )
}
