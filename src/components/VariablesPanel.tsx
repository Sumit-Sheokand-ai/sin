import { memo } from 'react'
import { useExecutionStore } from '../store/executionStore'

function formatValue(v: unknown): string {
  if (v === null) return 'null'
  if (v === undefined) return 'undefined'
  if (typeof v === 'string') return `"${v}"`
  if (Array.isArray(v)) return `[${(v as unknown[]).map(i => formatValue(i)).join(', ')}]`
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

const TYPE_COLORS: Record<string, string> = {
  number: '#b5cea8', string: '#ce9178', boolean: '#569cd6',
  null: '#569cd6', undefined: '#569cd6', array: '#4ec9b0',
  object: '#c586c0', ref: '#4ec9b0',
}

const VariablesPanel = memo(function VariablesPanel() {
  const frames = useExecutionStore(s => s.frames)
  const currentStep = useExecutionStore(s => s.currentStep)
  const frame = frames[currentStep]

  if (!frame) {
    return (
      <div style={{ color: 'var(--text-dim)', fontSize: '12px', padding: '16px', textAlign: 'center' }}>
        Click Run to start execution
      </div>
    )
  }

  const vars = Object.entries(frame.variables)
  if (vars.length === 0) {
    return <div style={{ color: 'var(--text-dim)', fontSize: '12px', padding: '16px', textAlign: 'center' }}>No variables in scope</div>
  }

  return (
    <div style={{ fontFamily: 'var(--font-code)', fontSize: '12px' }}>
      {vars.map(([name, info]) => (
        <div
          key={name}
          style={{
            display: 'flex', alignItems: 'center', padding: '5px 6px',
            borderRadius: 'var(--radius-sm)', marginBottom: '2px',
            background: info.changed ? 'rgba(220,220,170,0.08)' : 'transparent',
            border: `1px solid ${info.changed ? 'rgba(220,220,170,0.2)' : 'transparent'}`,
            transition: 'background 0.3s, border 0.3s',
          }}
        >
          <span style={{ color: 'var(--yellow)', minWidth: '80px', flexShrink: 0 }}>{name}</span>
          <span style={{ color: 'var(--text-dim)', margin: '0 6px', fontSize: '10px' }}>
            <span style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
              borderRadius: '3px', padding: '1px 4px',
              color: TYPE_COLORS[info.type] ?? 'var(--text-dim)',
            }}>{info.type}</span>
          </span>
          <span style={{ color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {formatValue(info.value)}
          </span>
          {info.changed && <span style={{ color: 'var(--yellow)', fontSize: '10px', marginLeft: '4px' }}>●</span>}
        </div>
      ))}
    </div>
  )
})

export default VariablesPanel
