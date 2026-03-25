import { useEffect, useRef, memo } from 'react'
import { useExecutionStore } from '../store/executionStore'

const TYPE_COLOR: Record<string, string> = {
  normal: '#89b4fa',
  call:   '#cba6f7',
  return: '#a6e3a1',
  loop:   '#fab387',
  error:  '#f38ba8',
}

const NODE_R = 10
const PAD = 20
const LABEL_FONT = '11px "JetBrains Mono", "Fira Code", monospace'

// Track per-node alpha for smooth fade-in of newly revealed nodes
const nodeAlphas: number[] = []

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
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

    // Reset alphas when frames change
    nodeAlphas.length = 0

    function draw() {
      if (!canvas || !ctx) return
      const reduced = prefersReducedMotion()
      if (!reduced) pulseRef.current += 0.06

      const dpr = window.devicePixelRatio || 1
      const W = canvas.clientWidth || 400
      const H = canvas.clientHeight || 80
      canvas.width = W * dpr
      canvas.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)

      if (frames.length === 0) {
        ctx.fillStyle = 'rgba(108,112,134,0.4)'
        ctx.font = LABEL_FONT
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('Execution flow will appear here', W / 2, H / 2)
        // No rAF when idle
        return
      }

      const spacing = Math.max(32, Math.min(52, (W - PAD * 2) / Math.max(frames.length - 1, 1)))
      const totalW = PAD * 2 + (frames.length - 1) * spacing
      const activeX = PAD + currentStep * spacing
      const scrollOffset = Math.max(0, activeX - W * 0.7)
      const cy = H / 2

      // Ensure alpha array is sized; fade in newly visible nodes
      for (let i = nodeAlphas.length; i < frames.length; i++) {
        nodeAlphas.push(i <= currentStep ? 0 : 0)
      }
      for (let i = 0; i <= currentStep; i++) {
        if (nodeAlphas[i] < 1) {
          nodeAlphas[i] = reduced ? 1 : Math.min(1, nodeAlphas[i] + 0.08)
        }
      }

      // Draw base connector line (dashed, muted)
      ctx.strokeStyle = 'rgba(69,71,90,0.45)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([3, 4])
      ctx.beginPath()
      ctx.moveTo(PAD - scrollOffset, cy)
      ctx.lineTo(Math.min(totalW, W + scrollOffset) - scrollOffset, cy)
      ctx.stroke()
      ctx.setLineDash([])

      frames.forEach((f, i) => {
        const x = PAD + i * spacing - scrollOffset
        if (x < -NODE_R * 2 || x > W + NODE_R * 2) return

        const isPast = i < currentStep
        const isCur = i === currentStep
        const col = TYPE_COLOR[f.type] ?? '#89b4fa'
        const alpha = nodeAlphas[i] ?? (i <= currentStep ? 1 : 0)
        if (alpha <= 0) return

        const pulse = isCur && !reduced ? Math.sin(pulseRef.current) * 2 : 0
        const r = isCur ? NODE_R + pulse : (isPast ? NODE_R : NODE_R - 2)

        ctx.globalAlpha = alpha

        // Colored connector for past segments
        if (isPast && i > 0) {
          const prevX = PAD + (i - 1) * spacing - scrollOffset
          const prevAlpha = nodeAlphas[i - 1] ?? 1
          ctx.globalAlpha = Math.min(alpha, prevAlpha) * 0.6
          ctx.strokeStyle = col
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.moveTo(prevX, cy)
          ctx.lineTo(x, cy)
          ctx.stroke()
          ctx.globalAlpha = alpha
        }

        // Glow for active node
        if (isCur && !reduced) {
          ctx.shadowBlur = 14 + pulse
          ctx.shadowColor = col
        }

        // Node circle
        ctx.beginPath()
        ctx.arc(x, cy, r, 0, Math.PI * 2)
        ctx.fillStyle = isCur
          ? col + '40'
          : isPast
            ? col + '28'
            : 'rgba(49,50,68,0.55)'
        ctx.fill()
        ctx.strokeStyle = isCur ? col : isPast ? col + 'aa' : 'rgba(69,71,90,0.55)'
        ctx.lineWidth = isCur ? 2 : 1
        ctx.stroke()
        ctx.shadowBlur = 0

        // Alternating label above/below
        const above = i % 2 === 0
        ctx.font = isCur ? `700 ${LABEL_FONT}` : LABEL_FONT
        ctx.fillStyle = isCur
          ? '#cdd6f4'
          : isPast
            ? col + 'dd'
            : 'rgba(108,112,134,0.55)'
        ctx.textAlign = 'center'
        ctx.textBaseline = above ? 'bottom' : 'top'
        ctx.fillText(f.type.slice(0, 3), x, above ? cy - r - 4 : cy + r + 4)

        ctx.globalAlpha = 1
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
