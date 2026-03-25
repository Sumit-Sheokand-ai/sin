import { useRef, useEffect, memo } from 'react'
import { useExecutionStore } from '../store/executionStore'

const TYPE_COLORS: Record<string, string> = {
  normal: '#007acc', call: '#c586c0', return: '#c586c0',
  loop: '#4ec9b0', error: '#f44747',
}

const ExecutionTimeline = memo(function ExecutionTimeline() {
  const frames = useExecutionStore(s => s.frames)
  const currentStep = useExecutionStore(s => s.currentStep)
  const setCurrentStep = useExecutionStore(s => s.setCurrentStep)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const W = 300, H = 16

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || frames.length === 0) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, W, H)
    frames.forEach((f, i) => {
      const x = Math.floor((i / frames.length) * W)
      const w = Math.max(1, Math.floor(W / frames.length))
      ctx.fillStyle = TYPE_COLORS[f.type] ?? '#007acc'
      ctx.fillRect(x, 0, w, H)
    })
  }, [frames])

  if (frames.length === 0) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '8px' }}>
      <div style={{ position: 'relative', width: W, height: H }}>
        <canvas ref={canvasRef} width={W} height={H} style={{ borderRadius: '3px', display: 'block' }} />
        <input
          type="range" min={0} max={frames.length - 1} value={currentStep}
          onChange={e => setCurrentStep(Number(e.target.value))}
          style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            opacity: 0, cursor: 'pointer', margin: 0,
          }}
        />
      </div>
    </div>
  )
})

export default ExecutionTimeline
