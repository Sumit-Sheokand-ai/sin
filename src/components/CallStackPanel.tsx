import { memo } from 'react'
import { useExecutionStore } from '../store/executionStore'

const CallStackPanel = memo(function CallStackPanel() {
  const frames = useExecutionStore(s => s.frames)
  const currentStep = useExecutionStore(s => s.currentStep)
  const frame = frames[currentStep]

  if (!frame) {
    return <div style={{ color: 'var(--text-dim)', fontSize: '12px', padding: '16px', textAlign: 'center' }}>Click Run to start execution</div>
  }

  const stack = [...frame.callStack].reverse()

  return (
    <div>
      <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
        <span>Call Stack</span>
        <span>Depth: {frame.callStack.length}</span>
      </div>
      {stack.map((f, i) => (
        <div key={i} style={{
          padding: '6px 8px', marginBottom: '4px', borderRadius: 'var(--radius-sm)',
          background: i === 0 ? 'rgba(0,122,204,0.1)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${i === 0 ? 'rgba(0,122,204,0.3)' : 'var(--border)'}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: i === 0 ? 'var(--blue)' : 'var(--yellow)', fontFamily: 'var(--font-code)', fontSize: '12px' }}>
              {f.name}
            </span>
            <span style={{ color: 'var(--text-dim)', fontSize: '10px' }}>line {f.line}</span>
          </div>
          {Object.keys(f.args).length > 0 && (
            <div style={{ marginTop: '3px', color: 'var(--text-dim)', fontFamily: 'var(--font-code)', fontSize: '11px' }}>
              {Object.entries(f.args).map(([k, v]) => (
                <span key={k} style={{ marginRight: '8px' }}>
                  <span style={{ color: 'var(--teal)' }}>{k}</span>
                  <span style={{ color: 'var(--text-dim)' }}>=</span>
                  <span style={{ color: 'var(--text)' }}>{String(v)}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
})

export default CallStackPanel
