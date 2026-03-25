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
import './index.css'

const TABS_RIGHT = ['Variables', 'Call Stack', 'Exec Tree'] as const
const TABS_BOTTOM = ['Output', 'Error'] as const
type RightTab = typeof TABS_RIGHT[number]
type BottomTab = typeof TABS_BOTTOM[number]

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
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', padding:'2rem', textAlign:'center' }}>
        <div>
          <div style={{ fontSize:'2rem', marginBottom:'1rem' }}>💻</div>
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
      gridTemplateColumns: '220px 1fr 280px',
      gridTemplateRows: '1fr 220px 90px',
      height: '100vh',
      overflow: 'hidden',
      gap: '1px',
      background: 'var(--border)',
    }}>
      {/* Sidebar */}
      <div style={{ background: 'var(--bg-panel)', overflow: 'auto', gridRow: '1/2' }}>
        <Sidebar />
      </div>

      {/* Center: editor + controlbar */}
      <div style={{ background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ControlBar />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <CodeEditor />
        </div>
      </div>

      {/* Right panel */}
      <div style={{ background: 'var(--bg-panel)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {TABS_RIGHT.map(t => (
            <button key={t} onClick={() => setRightTab(t)} style={{
              flex: 1, padding: '8px 4px', background: 'none', border: 'none',
              color: rightTab === t ? 'var(--blue)' : 'var(--text-dim)',
              fontFamily: 'var(--font-ui)', fontSize: '11px', cursor: 'pointer',
              borderBottom: rightTab === t ? '2px solid var(--blue)' : '2px solid transparent',
            }}>{t}</button>
          ))}
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
          {rightTab === 'Variables'  && <VariablesPanel />}
          {rightTab === 'Call Stack' && <CallStackPanel />}
          {rightTab === 'Exec Tree'  && <ExecutionTreePanel />}
        </div>
      </div>

      {/* Bottom panel — spans all 3 columns */}
      <div style={{ gridColumn: '1/4', background: 'var(--bg-panel)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border)', padding: '0 8px' }}>
          {TABS_BOTTOM.map(t => (
            <button key={t} onClick={() => setBottomTab(t)} style={{
              padding: '6px 12px', background: 'none', border: 'none',
              color: bottomTab === t ? 'var(--blue)' : 'var(--text-dim)',
              fontFamily: 'var(--font-ui)', fontSize: '11px', cursor: 'pointer',
              borderBottom: bottomTab === t ? '2px solid var(--blue)' : '2px solid transparent',
            }}>{t}</button>
          ))}
          <div style={{ flex: 1 }} />
          <ExecutionTimeline />
          <TimerBadge />
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
          {bottomTab === 'Output' && <OutputConsole />}
          {bottomTab === 'Error'  && <ErrorExplainer />}
        </div>
      </div>

      {/* Flow Trace — full-width bottom row */}
      <div style={{
        gridColumn: '1/4',
        background: 'var(--bg-panel)',
        borderTop: '1px solid var(--border)',
        padding: '4px 0',
        overflow: 'hidden',
      }}>
        <div style={{
          fontSize: '9px', fontFamily: 'var(--font-ui)', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          color: 'var(--text-dim)', padding: '0 10px 3px',
        }}>
          Execution Flow
        </div>
        <div style={{ height: 'calc(100% - 18px)' }}>
          <FlowTracePanel />
        </div>
      </div>
    </div>
  )
}
