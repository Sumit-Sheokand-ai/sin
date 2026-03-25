import { memo } from 'react'
import { useExecutionStore } from '../store/executionStore'

const MemoryPanel = memo(function MemoryPanel() {
  const frames = useExecutionStore(s => s.frames)
  const currentStep = useExecutionStore(s => s.currentStep)
  const frame = frames[currentStep]

  if (!frame) {
    return <div style={{ color: 'var(--text-dim)', fontSize: '12px', padding: '16px', textAlign: 'center' }}>Click Run to start execution</div>
  }

  const heapNodes = frame.heap

  return (
    <div style={{ fontFamily: 'var(--font-code)', fontSize: '11px' }}>
      {/* Stack section */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ color: 'var(--text-dim)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Stack</div>
        {frame.callStack.length === 0
          ? <div style={{ color: 'var(--text-dim)', fontSize: '11px' }}>Empty</div>
          : [...frame.callStack].reverse().map((f, i) => (
            <div key={i} style={{
              padding: '5px 8px', marginBottom: '3px',
              background: i === 0 ? 'rgba(0,122,204,0.1)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${i === 0 ? 'rgba(0,122,204,0.25)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-sm)',
            }}>
              <div style={{ color: 'var(--blue)', marginBottom: '3px' }}>{f.name}()</div>
              {Object.entries(f.args).map(([k, v]) => (
                <div key={k} style={{ color: 'var(--text-dim)', paddingLeft: '8px' }}>
                  <span style={{ color: 'var(--yellow)' }}>{k}</span>: <span style={{ color: 'var(--text)' }}>{String(v)}</span>
                </div>
              ))}
            </div>
          ))
        }
      </div>

      {/* Heap section */}
      {heapNodes.length > 0 && (
        <div>
          <div style={{ color: 'var(--text-dim)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Heap</div>
          {heapNodes.map((node) => (
            <div key={node.id} style={{
              padding: '5px 8px', marginBottom: '4px',
              border: '1px solid var(--border-active)',
              borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.02)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--teal)' }}>{node.id}</span>
                <span style={{ color: 'var(--text-dim)', fontSize: '10px' }}>{node.type}</span>
              </div>
              <div style={{ color: 'var(--text)', marginTop: '2px' }}>{JSON.stringify(node.value)}</div>
              {node.references.length > 0 && (
                <div style={{ color: 'var(--purple)', fontSize: '10px', marginTop: '2px' }}>
                  → {node.references.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {heapNodes.length === 0 && frame.callStack.length > 0 && (
        <div style={{ color: 'var(--text-dim)', fontSize: '11px' }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Heap</div>
          No heap objects
        </div>
      )}
    </div>
  )
})

export default MemoryPanel
