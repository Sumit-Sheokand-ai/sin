import { memo } from 'react'
import { useExecutionStore } from '../store/executionStore'

const OutputConsole = memo(function OutputConsole() {
  const frames = useExecutionStore(s => s.frames)
  const currentStep = useExecutionStore(s => s.currentStep)
  const frame = frames[currentStep]

  if (!frame) {
    return <div style={{ color: 'var(--text-dim)', fontSize: '12px', fontFamily: 'var(--font-code)', padding: '4px' }}>No output yet</div>
  }

  return (
    <div style={{ fontFamily: 'var(--font-code)', fontSize: '12px', lineHeight: '1.6' }}>
      {frame.output.length === 0
        ? <span style={{ color: 'var(--text-dim)' }}>No output</span>
        : frame.output.map((line, i) => (
          <div key={i} style={{ color: 'var(--text)', padding: '1px 0' }}>
            <span style={{ color: 'var(--text-dim)', marginRight: '8px', userSelect: 'none' }}>{i + 1}</span>
            {line}
          </div>
        ))
      }
    </div>
  )
})

export default OutputConsole
