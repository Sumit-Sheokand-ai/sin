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
import SpotlightCard from './components/ui/SpotlightCard'
import './index.css'

// ── Material Symbol helper ────────────────────────────────────────────────────
function Icon({ name, size = 20, style }: { name: string; size?: number; style?: React.CSSProperties }) {
  return <span className="msi" style={{ fontSize: size, lineHeight: 1, ...style }}>{name}</span>
}

// ── Right-panel tab config ────────────────────────────────────────────────────
const RIGHT_TABS = ['Tree', 'Variables', 'Stack'] as const
type RightTab = typeof RIGHT_TABS[number]
const RIGHT_COLOR: Record<RightTab, string> = {
  Tree:      'var(--primary)',
  Variables: 'var(--green)',
  Stack:     'var(--secondary)',
}
const RIGHT_ICON: Record<RightTab, string> = {
  Tree:      'account_tree',
  Variables: 'database',
  Stack:     'layers',
}

// ── Bottom-panel tab config ───────────────────────────────────────────────────
const BOT_TABS = ['Flow', 'Output', 'Error'] as const
type BotTab = typeof BOT_TABS[number]
const BOT_COLOR: Record<BotTab, string> = {
  Flow:   'var(--primary)',
  Output: 'var(--teal)',
  Error:  'var(--error)',
}

// ── Mini sparkline metric card ────────────────────────────────────────────────
function MetricCard({ label, value, color, pct }: {
  label: string; value: string; color: string; pct: number
}) {
  const heights = [0.25, 0.45, 0.35, 0.65, 0.55, pct || 0.1]
  return (
    <div style={{
      padding: '8px 10px',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(71,70,88,0.2)',
      borderRadius: '10px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
        <span style={{ fontSize: '9px', fontFamily: 'var(--font-ui)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-hint)' }}>
          {label}
        </span>
        <span style={{ fontSize: '12px', fontFamily: 'var(--font-code)', color, fontWeight: 600 }}>{value}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '18px' }}>
        {heights.map((h, i) => (
          <div key={i} style={{
            flex: 1,
            height: `${Math.max(h * 100, 8)}%`,
            background: i === heights.length - 1 ? color : `${color}33`,
            borderRadius: '2px 2px 0 0',
            transition: 'height 0.4s ease',
          }} />
        ))}
      </div>
    </div>
  )
}

// ── Language file extension ───────────────────────────────────────────────────
const EXT: Record<string, string> = {
  javascript: 'js', python: 'py', java: 'java', cpp: 'cpp', c: 'c', pseudocode: 'txt'
}

// ── Status config ─────────────────────────────────────────────────────────────
function statusInfo(status: string, hasFrames: boolean) {
  if (status === 'loading') return { dot: 'var(--yellow)',  label: 'Tracing…', pulse: true }
  if (status === 'error')   return { dot: 'var(--error)',   label: 'Error',    pulse: false }
  if (hasFrames)            return { dot: 'var(--green)',   label: 'Ready',    pulse: true }
  return                          { dot: 'var(--text-hint)',label: 'Idle',     pulse: false }
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [rightTab, setRightTab] = useState<RightTab>('Tree')
  const [botTab,   setBotTab]   = useState<BotTab>('Flow')
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
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💻</div>
          <p style={{ color: 'var(--text)', fontFamily: 'var(--font-ui)' }}>
            Code Tracer is best viewed on a desktop (1024px+).
          </p>
        </div>
      </div>
    )
  }

  const SIDEBAR_W = sideOpen ? 256 : 64
  const st        = statusInfo(status, frames.length > 0)
  const pct       = frames.length > 0 ? (currentStep + 1) / frames.length : 0
  const ext       = EXT[language] ?? 'txt'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ╔═══════════════════════════════════════ HEADER ══╗ */}
      <header style={{
        height: '60px', flexShrink: 0,
        display: 'flex', alignItems: 'center',
        padding: '0 16px 0 20px', gap: '12px',
        background: '#0b0b1a',
        borderBottom: '1px solid var(--border-dim)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        zIndex: 50, position: 'relative',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginRight: '4px', flexShrink: 0 }}>
          <div style={{
            width: '34px', height: '34px',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            borderRadius: '11px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 18px rgba(140,183,254,0.4)',
            flexShrink: 0,
          }}>
            <Icon name="code" size={19} style={{ color: '#fff' }} />
          </div>
          <span style={{
            fontFamily: 'var(--font-headline)', fontWeight: 700,
            fontSize: '17px', letterSpacing: '-0.02em',
            color: 'var(--primary)',
            animation: 'logo-glow 4s ease-in-out infinite',
            whiteSpace: 'nowrap',
          }}>
            Code Tracer
          </span>
        </div>

        {/* ── Divider ── */}
        <div style={{ width: '1px', height: '24px', background: 'var(--border-dim)', flexShrink: 0 }} />

        {/* ── Controls ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <ControlBar />
        </div>

        {/* ── Right meta ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Status pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '4px 10px',
            background: 'rgba(255,255,255,0.03)',
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

          {/* Language badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '4px 9px',
            background: 'rgba(140,183,254,0.07)',
            border: '1px solid rgba(140,183,254,0.18)',
            borderRadius: '100px',
          }}>
            <Icon name="terminal" size={13} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-code)', color: 'var(--primary)', fontWeight: 500, letterSpacing: '0.06em' }}>
              {language.toUpperCase()}
            </span>
          </div>

          {/* Timer */}
          <TimerBadge />

          {/* Step counter */}
          {frames.length > 0 && (
            <div style={{
              padding: '4px 10px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border)',
              borderRadius: '100px',
              fontSize: '11px',
              fontFamily: 'var(--font-code)',
            }}>
              <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{currentStep + 1}</span>
              <span style={{ color: 'var(--text-hint)' }}> / {frames.length}</span>
            </div>
          )}

          {/* Settings hint */}
          <button style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-hint)', borderRadius: '8px', transition: 'color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-hint)')}
          >
            <Icon name="settings" size={18} />
          </button>
        </div>
      </header>

      {/* ╔════════════════════════════════════════ BODY ══╗ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ╔═══ LEFT SIDEBAR ═══╗ */}
        <aside style={{
          width: `${SIDEBAR_W}px`, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          background: '#0b0b1a',
          borderRight: '1px solid var(--border-dim)',
          transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
          overflow: 'hidden', zIndex: 10,
        }}>
          {/* Sidebar header */}
          <div style={{
            height: '48px', flexShrink: 0,
            display: 'flex', alignItems: 'center',
            padding: sideOpen ? '0 12px 0 16px' : '0 0 0 0',
            justifyContent: sideOpen ? 'space-between' : 'center',
            borderBottom: '1px solid var(--border-dim)',
          }}>
            {sideOpen && (
              <div>
                <div style={{ fontSize: '9px', fontFamily: 'var(--font-ui)', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
                  Execution Explorer
                </div>
                <div style={{ fontSize: '8px', fontFamily: 'var(--font-code)', color: 'rgba(140,183,254,0.45)', marginTop: '1px' }}>
                  v1.0.0-stable
                </div>
              </div>
            )}
            <button onClick={() => setSideOpen(!sideOpen)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-hint)', padding: '6px', borderRadius: '8px',
              transition: 'color 0.2s, background 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--bg-hover)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-hint)'; e.currentTarget.style.background = 'none' }}
            >
              <Icon name={sideOpen ? 'menu_open' : 'menu'} size={18} />
            </button>
          </div>

          {/* Sidebar content */}
          <div style={{ flex: 1, overflow: sideOpen ? 'auto' : 'hidden' }}>
            {sideOpen
              ? <Sidebar />
              : (
                <div style={{ padding: '10px 0', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                  {[
                    { icon: 'timeline',    active: true  },
                    { icon: 'folder_open', active: false },
                    { icon: 'history',     active: false },
                  ].map(({ icon, active }) => (
                    <button key={icon} style={{
                      padding: '10px', borderRadius: '12px',
                      background: active ? 'rgba(140,183,254,0.1)' : 'none',
                      border: active ? '1px solid rgba(140,183,254,0.2)' : '1px solid transparent',
                      cursor: 'pointer',
                      color: active ? 'var(--primary)' : 'var(--text-hint)',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--bg-hover)' }}}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.color = 'var(--text-hint)'; e.currentTarget.style.background = 'none' }}}
                    >
                      <Icon name={icon} size={20} />
                    </button>
                  ))}
                </div>
              )
            }
          </div>

          {/* New Trace CTA */}
          {sideOpen && (
            <div style={{ padding: '10px 14px 14px', flexShrink: 0 }}>
              <button style={{
                width: '100%', padding: '10px 12px',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                border: 'none', borderRadius: '12px',
                color: 'var(--on-primary)',
                fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                boxShadow: '0 4px 16px rgba(140,183,254,0.22)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 7px 22px rgba(140,183,254,0.38)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 16px rgba(140,183,254,0.22)' }}
              >
                <Icon name="add_circle" size={15} style={{ color: 'inherit' }} />
                New Trace
              </button>
            </div>
          )}
        </aside>

        {/* ╔═══ MAIN CANVAS ═══╗ */}
        <main style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(140,183,254,0.055) 1px, transparent 0)',
          backgroundSize: '28px 28px',
          backgroundColor: 'var(--bg)',
        }}>

          {/* ── Editor + Viz ── */}
          <div style={{
            flex: 1, display: 'grid',
            gridTemplateColumns: '1fr 360px',
            overflow: 'hidden',
          }}>

            {/* Code Editor */}
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--border-dim)' }}>
              {/* Editor tab bar */}
              <div style={{
                height: '34px', flexShrink: 0,
                display: 'flex', alignItems: 'center',
                padding: '0 12px',
                background: 'rgba(11,11,26,0.85)',
                borderBottom: '1px solid var(--border-dim)',
                gap: '8px',
              }}>
                {/* macOS dots */}
                <div style={{ display: 'flex', gap: '5px', marginRight: '4px' }}>
                  {['#ff5f57','#ffbd2e','#27c93f'].map(c => (
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
                      <div style={{
                        width: '64px', height: '3px',
                        background: 'var(--border-dim)',
                        borderRadius: '2px',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%', width: `${pct * 100}%`,
                          background: `linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)`,
                          borderRadius: '2px',
                          transition: 'width 0.25s ease',
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

            {/* ── Right Glass Viz Panel ── */}
            <SpotlightCard
              spotlightColor="rgba(140,183,254,0.04)"
              style={{
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
                background: 'rgba(11,11,26,0.97)',
                borderLeft: '1px solid rgba(71,70,88,0.25)',
                animation: 'border-glow-flow 5s ease-in-out infinite',
              }}
            >
              {/* Tab nav */}
              <div style={{
                display: 'flex', height: '36px', flexShrink: 0,
                borderBottom: '1px solid var(--border-dim)',
                background: 'rgba(18,18,35,0.9)',
              }}>
                {RIGHT_TABS.map(t => {
                  const isActive = t === rightTab
                  const col = RIGHT_COLOR[t]
                  return (
                    <button key={t} onClick={() => setRightTab(t)} style={{
                      flex: 1, height: '100%',
                      background: 'none', border: 'none',
                      color: isActive ? col : 'var(--text-hint)',
                      fontFamily: 'var(--font-ui)', fontSize: '10px',
                      fontWeight: isActive ? 700 : 400,
                      letterSpacing: '0.07em', textTransform: 'uppercase',
                      cursor: 'pointer', position: 'relative',
                      transition: 'color 0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    }}>
                      <Icon name={RIGHT_ICON[t]} size={13} style={{ color: isActive ? col : 'var(--text-hint)' }} />
                      {t}
                      {isActive && (
                        <span style={{
                          position: 'absolute', bottom: 0, left: '18%', right: '18%', height: '2px',
                          background: col, borderRadius: '2px 2px 0 0',
                          boxShadow: `0 0 8px ${col}`,
                        }} />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Panel content */}
              <div style={{
                flex: 1, overflow: 'auto',
                padding: rightTab === 'Tree' ? '0' : '10px',
              }}>
                {rightTab === 'Tree'      && <ExecutionTreePanel />}
                {rightTab === 'Variables' && <VariablesPanel />}
                {rightTab === 'Stack'     && <CallStackPanel />}
              </div>

              {/* Metric cards */}
              {frames.length > 0 && (
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr',
                  gap: '8px', padding: '8px 10px',
                  borderTop: '1px solid var(--border-dim)',
                  flexShrink: 0,
                  background: 'rgba(18,18,35,0.6)',
                }}>
                  <MetricCard label="Frames" value={String(frames.length)} color="var(--primary)"   pct={pct} />
                  <MetricCard label="Step"   value={String(currentStep + 1)} color="var(--secondary)" pct={pct} />
                </div>
              )}
            </SpotlightCard>
          </div>

          {/* ── Bottom Timeline Panel ── */}
          <div style={{
            height: '132px', flexShrink: 0,
            display: 'flex', flexDirection: 'column',
            borderTop: '1px solid var(--border-dim)',
            background: 'rgba(11,11,26,0.92)',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Tab + controls bar */}
            <div style={{
              height: '32px', flexShrink: 0,
              display: 'flex', alignItems: 'center',
              borderBottom: '1px solid var(--border-dim)',
              padding: '0 12px', gap: '2px',
            }}>
              {BOT_TABS.map(t => {
                const isActive = t === botTab
                const col = BOT_COLOR[t]
                return (
                  <button key={t} onClick={() => setBotTab(t)} style={{
                    padding: '0 12px', height: '100%',
                    background: 'none', border: 'none',
                    color: isActive ? col : 'var(--text-hint)',
                    fontFamily: 'var(--font-ui)', fontSize: '10px',
                    fontWeight: isActive ? 700 : 400,
                    letterSpacing: '0.07em', textTransform: 'uppercase',
                    cursor: 'pointer', position: 'relative',
                    transition: 'color 0.2s',
                  }}>
                    {t}
                    {isActive && (
                      <span style={{
                        position: 'absolute', bottom: 0, left: '15%', right: '15%', height: '2px',
                        background: col, borderRadius: '2px 2px 0 0',
                        boxShadow: `0 0 6px ${col}`,
                      }} />
                    )}
                  </button>
                )
              })}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ExecutionTimeline />
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {botTab === 'Flow'   && <FlowTracePanel />}
              {botTab === 'Output' && <div style={{ height: '100%', overflow: 'auto', padding: '6px 10px' }}><OutputConsole /></div>}
              {botTab === 'Error'  && <div style={{ height: '100%', overflow: 'auto', padding: '6px 10px' }}><ErrorExplainer /></div>}
            </div>

            {/* Scrub bar */}
            <div style={{ height: '5px', flexShrink: 0, background: 'rgba(255,255,255,0.03)', position: 'relative' }}>
              <div style={{
                height: '100%',
                width: `${pct * 100}%`,
                background: 'linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)',
                transition: 'width 0.22s ease',
                position: 'relative',
              }}>
                {pct > 0 && (
                  <div style={{
                    position: 'absolute', right: '-6px', top: '50%',
                    transform: 'translateY(-50%)',
                    width: '12px', height: '12px', borderRadius: '50%',
                    background: 'var(--primary)',
                    boxShadow: '0 0 8px var(--primary-glow)',
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
