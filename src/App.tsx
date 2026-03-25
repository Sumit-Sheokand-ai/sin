import { useEffect, useState } from 'react'
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
import ShinyText from './components/ui/ShinyText'
import './index.css'

const TABS_RIGHT = ['Variables', 'Call Stack', 'Exec Tree'] as const
const TABS_BOTTOM = ['Output', 'Error'] as const
type RightTab = typeof TABS_RIGHT[number]
type BottomTab = typeof TABS_BOTTOM[number]

const TAB_COLORS: Record<string, string> = {
  'Variables':  'var(--green)',
  'Call Stack': 'var(--blue)',
  'Exec Tree':  'var(--purple)',
  'Output':     'var(--teal)',
  'Error':      'var(--red)',
}

function PanelTab({ tabs, active, onSelect }: {
  tabs: readonly string[]
  active: string
  onSelect: (t: string) => void
}) {
  return (
    <div style={{
      display: 'flex',
      borderBottom: '1px solid var(--border)',
      background: 'rgba(13,13,20,0.6)',
      backdropFilter: 'blur(8px)',
    }}>
      {tabs.map(t => {
        const isActive = t === active
        const col = TAB_COLORS[t] ?? 'var(--blue)'
        return (
          <button key={t} onClick={() => onSelect(t)} style={{
            flex: 1, padding: '9px 4px', background: 'none', border: 'none',
            color: isActive ? col : 'var(--text-dim)',
            fontFamily: 'var(--font-ui)', fontSize: '11px', cursor: 'pointer',
            fontWeight: isActive ? 700 : 400,
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
            position: 'relative',
            transition: 'color 0.2s',
          }}>
            {t}
            {isActive && (
              <span style={{
                position: 'absolute', bottom: 0, left: '15%', right: '15%', height: '2px',
                background: col,
                borderRadius: '2px 2px 0 0',
                boxShadow: `0 0 8px ${col}`,
              }} />
            )}
          </button>
        )
      })}
    </div>
  )
}

export default function App() {
  const [rightTab, setRightTab] = useState<RightTab>('Variables')
  const [bottomTab, setBottomTab] = useState<BottomTab>('Output')
  const [tooSmall, setTooSmall] = useState(window.innerWidth < 1024)

  useEffect(() => {
    const check = () => setTooSmall(window.innerWidth < 1024)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (tooSmall) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', padding:'2rem', textAlign:'center', background:'var(--bg)' }}>
        <div>
          <div style={{ fontSize:'2.5rem', marginBottom:'1rem' }}>💻</div>
          <p style={{ color:'var(--text)', fontFamily:'var(--font-ui)' }}>
            Code Visualizer is best viewed on a desktop (1024px+).
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '220px 1fr 285px',
      gridTemplateRows: '1fr 220px 88px',
      height: '100vh',
      overflow: 'hidden',
      gap: '1px',
      background: 'var(--border)',
    }}>
      {/* ── Sidebar ── */}
      <SpotlightCard
        spotlightColor="rgba(137,180,250,0.04)"
        style={{ background: 'var(--bg-panel)', overflow: 'auto', gridRow: '1/2' }}
      >
        <Sidebar />
      </SpotlightCard>

      {/* ── Center: editor ── */}
      <div style={{ background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ControlBar />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <CodeEditor />
        </div>
      </div>

      {/* ── Right panel ── */}
      <SpotlightCard
        spotlightColor={`${TAB_COLORS[rightTab]}11`}
        style={{ background: 'var(--bg-panel)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <PanelTab tabs={TABS_RIGHT} active={rightTab} onSelect={t => setRightTab(t as RightTab)} />
        <div style={{ flex: 1, overflow: 'auto', padding: '10px' }}>
          {rightTab === 'Variables'  && <VariablesPanel />}
          {rightTab === 'Call Stack' && <CallStackPanel />}
          {rightTab === 'Exec Tree'  && <ExecutionTreePanel />}
        </div>
      </SpotlightCard>

      {/* ── Bottom panel ── */}
      <SpotlightCard
        spotlightColor="rgba(148,226,213,0.04)"
        style={{ gridColumn: '1/4', background: 'var(--bg-panel)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border)', background: 'rgba(13,13,20,0.5)' }}>
          <div style={{ display: 'flex', flex: 1 }}>
            {TABS_BOTTOM.map(t => {
              const isActive = t === bottomTab
              const col = TAB_COLORS[t] ?? 'var(--blue)'
              return (
                <button key={t} onClick={() => setBottomTab(t)} style={{
                  padding: '9px 16px', background: 'none', border: 'none',
                  color: isActive ? col : 'var(--text-dim)',
                  fontFamily: 'var(--font-ui)', fontSize: '11px', cursor: 'pointer',
                  fontWeight: isActive ? 700 : 400,
                  letterSpacing: '0.03em', textTransform: 'uppercase',
                  position: 'relative', transition: 'color 0.2s',
                }}>
                  {t}
                  {isActive && <span style={{ position:'absolute', bottom:0, left:'15%', right:'15%', height:'2px', background:col, borderRadius:'2px 2px 0 0', boxShadow:`0 0 8px ${col}` }} />}
                </button>
              )
            })}
          </div>
          <ExecutionTimeline />
          <TimerBadge />
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
          {bottomTab === 'Output' && <OutputConsole />}
          {bottomTab === 'Error'  && <ErrorExplainer />}
        </div>
      </SpotlightCard>

      {/* ── Flow Trace row ── */}
      <div style={{
        gridColumn: '1/4',
        background: 'var(--bg-panel)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '0 12px',
        overflow: 'hidden',
      }}>
        <ShinyText text="EXECUTION FLOW" speed={6} style={{ fontSize: '9px', letterSpacing: '0.1em', flexShrink: 0 }} />
        <div style={{ flex: 1, height: '100%', paddingTop: 4, paddingBottom: 4 }}>
          <FlowTracePanel />
        </div>
      </div>
    </div>
  )
}
