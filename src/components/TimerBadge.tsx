import { useExecutionStore } from '../store/executionStore'

export default function TimerBadge() {
  const elapsedMs = useExecutionStore(s => s.elapsedMs)
  const frames = useExecutionStore(s => s.frames)
  if (frames.length === 0) return null

  const display = elapsedMs >= 1000 ? `${(elapsedMs / 1000).toFixed(2)}s` : `${elapsedMs}ms`

  return (
    <span style={{
      fontSize: '11px', color: 'var(--text-dim)',
      fontFamily: 'var(--font-code)', marginRight: '8px', userSelect: 'none',
    }}>
      ⏱ {display}
    </span>
  )
}
