import { memo } from 'react'
import { useExecutionStore } from '../store/executionStore'

const ErrorExplainer = memo(function ErrorExplainer() {
  const frames = useExecutionStore(s => s.frames)
  const errorFrame = frames.find(f => f.error !== null)

  if (!errorFrame?.error) {
    return <div style={{ color: 'var(--text-dim)', fontSize: '12px', padding: '4px' }}>No errors</div>
  }

  const { error } = errorFrame

  return (
    <div style={{ fontFamily: 'var(--font-ui)', fontSize: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span style={{
          background: 'rgba(244,71,71,0.15)', border: '1px solid rgba(244,71,71,0.4)',
          color: 'var(--red)', borderRadius: 'var(--radius-sm)', padding: '2px 8px', fontSize: '11px', fontFamily: 'var(--font-code)',
        }}>{error.type}</span>
        <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>on line {error.line}</span>
      </div>

      <div style={{ color: 'var(--text-dim)', fontSize: '11px', fontFamily: 'var(--font-code)', marginBottom: '10px', padding: '6px 8px', background: 'rgba(244,71,71,0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(244,71,71,0.15)' }}>
        {error.message}
      </div>

      <div style={{ marginBottom: '8px' }}>
        <div style={{ color: 'var(--text-dim)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>What happened</div>
        <div style={{ color: 'var(--text)', lineHeight: '1.5' }}>{error.explanation}</div>
      </div>

      <div>
        <div style={{ color: 'var(--text-dim)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>How to fix it</div>
        <div style={{ color: 'var(--teal)', lineHeight: '1.5' }}>{error.suggestion}</div>
      </div>
    </div>
  )
})

export default ErrorExplainer
