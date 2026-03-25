import { useEffect, useRef, memo } from 'react'
import { useExecutionStore } from '../store/executionStore'

const TYPE_COLOR: Record<string, string> = {
  normal: '#89b4fa',
  call:   '#cba6f7',
  return: '#a6e3a1',
  loop:   '#fab387',
  error:  '#f38ba8',
}

const FlowTracePanel = memo(function FlowTracePanel() {
  const frames = useExecutionStore(s => s.frames)
  const currentStep = useExecutionStore(s => s.currentStep)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const pulseRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function draw() {
      if (!canvas || !ctx) return
      pulseRef.current += 0.07
      const dpr = window.devicePixelRatio || 1
      const W = canvas.clientWidth || 400
      const H = canvas.clientHeight || 60
      canvas.width = W * dpr
      canvas.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)

      if (frames.length === 0) {
        ctx.fillStyle = 'rgba(108,112,134,0.4)'
        ctx.font = '11px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('Execution flow will appear here', W / 2, H / 2)
        rafRef.current = requestAnimationFrame(draw)
        return
      }

      const NODE_R = 7
      const PAD = 16
      const spacing = Math.max(28, Math.min(48, (W - PAD * 2) / Math.max(frames.length - 1, 1)))
      const totalW = PAD * 2 + (frames.length - 1) * spacing
      const activeX = PAD + currentStep * spacing
      const scrollOffset = Math.max(0, activeX - W + PAD * 3)
      const cy = H / 2

      // Draw base connector line
      ctx.strokeStyle = 'rgba(69,71,90,0.5)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(PAD - scrollOffset, cy)
      ctx.lineTo(Math.min(totalW, W + scrollOffset) - scrollOffset, cy)
      ctx.stroke()
      ctx.setLineDash([])

      frames.forEach((f, i) => {
        const x = PAD + i * spacing - scrollOffset
        if (x < -20 || x > W + 20) return

        const isPast = i < currentStep
        const isCur = i === currentStep
        const col = TYPE_COLOR[f.type] ?? '#89b4fa'
        const r = isCur ? NODE_R + Math.sin(pulseRef.current) * 1.5 : (isPast ? NODE_R : NODE_R - 2)

        // Colored past connector
        if (isPast && i > 0) {
          const prevX = PAD + (i - 1) * spacing - scrollOffset
          ctx.strokeStyle = col + '66'
          ctx.lineWidth = 1.5
          ctx.setLineDash([])
          ctx.beginPath()
          ctx.moveTo(prevX, cy)
          ctx.lineTo(x, cy)
          ctx.stroke()
        }

        ctx.beginPath()
        ctx.arc(x, cy, r, 0, Math.PI * 2)
        ctx.fillStyle = isCur ? col + '33' : (isPast ? col + '22' : 'rgba(49,50,68,0.6)')
        ctx.fill()
        ctx.strokeStyle = isCur ? col : (isPast ? col + '88' : 'rgba(69,71,90,0.5)')
        ctx.lineWidth = isCur ? 2 : 1
        if (isCur) { ctx.shadowBlur = 10; ctx.shadowColor = col }
        ctx.stroke()
        ctx.shadowBlur = 0

        // Alternating labels above/below
        const above = i % 2 === 0
        ctx.fillStyle = isCur ? '#fff' : (isPast ? col + 'cc' : 'rgba(108,112,134,0.5)')
        ctx.font = `${isCur ? '700 ' : ''}8px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = above ? 'bottom' : 'top'
        ctx.fillText(f.type.slice(0, 3), x, above ? cy - r - 3 : cy + r + 3)
      })

      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [frames, currentStep])

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  )
})

export default FlowTracePanel
