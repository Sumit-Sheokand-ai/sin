import { useEffect, useRef, memo } from 'react'
import { useExecutionStore } from '../store/executionStore'
import type { ExecutionFrame } from '../types/execution'

interface TreeNode {
  id: string
  label: string
  x: number
  y: number
  active: boolean
  color: string
}

const TYPE_NODE_COLOR: Record<string, string> = {
  call: '#89b4fa',
  return: '#cba6f7',
  normal: '#a6e3a1',
  loop: '#fab387',
  error: '#f38ba8',
}

function buildNodes(frames: ExecutionFrame[], currentStep: number): TreeNode[] {
  const nodes: TreeNode[] = []
  const seen = new Set<string>()

  for (let i = 0; i <= Math.min(currentStep, frames.length - 1); i++) {
    const f = frames[i]
    f.callStack.forEach((cs, depth) => {
      const id = `${cs.name}-${depth}`
      if (!seen.has(id)) {
        seen.add(id)
        nodes.push({ id, label: cs.name, x: 0, y: 0, active: false, color: '#45475a' })
      }
    })
  }

  if (nodes.length === 0) return []

  const cur = frames[Math.min(currentStep, frames.length - 1)]
  if (cur) {
    const cs = cur.callStack
    const activeId = `${cs[cs.length - 1]?.name}-${cs.length - 1}`
    const frameType = cur.type
    nodes.forEach(n => {
      n.active = n.id === activeId
      if (n.active) n.color = TYPE_NODE_COLOR[frameType] ?? '#89b4fa'
    })
  }

  return nodes
}

function layoutNodes(nodes: TreeNode[], width: number): void {
  if (nodes.length === 0) return
  const cols = Math.max(1, Math.ceil(Math.sqrt(nodes.length)))
  const xStep = width / (cols + 1)
  nodes.forEach((n, i) => {
    n.x = xStep * ((i % cols) + 1)
    n.y = 24 + Math.floor(i / cols) * 44
  })
}

const ExecutionTreePanel = memo(function ExecutionTreePanel() {
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
      pulseRef.current += 0.06
      const dpr = window.devicePixelRatio || 1
      const W = canvas.clientWidth || 200
      const H = canvas.clientHeight || 200
      canvas.width = W * dpr
      canvas.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)

      if (frames.length === 0) {
        ctx.fillStyle = 'rgba(108,112,134,0.4)'
        ctx.font = '11px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('Run code to see execution tree', W / 2, H / 2)
        rafRef.current = requestAnimationFrame(draw)
        return
      }

      const nodes = buildNodes(frames, currentStep)
      layoutNodes(nodes, W)

      // Draw edges between sequential nodes
      ctx.strokeStyle = 'rgba(69,71,90,0.5)'
      ctx.lineWidth = 1
      for (let i = 1; i < nodes.length; i++) {
        ctx.beginPath()
        ctx.moveTo(nodes[i - 1].x, nodes[i - 1].y)
        ctx.lineTo(nodes[i].x, nodes[i].y)
        ctx.stroke()
      }

      // Draw nodes
      nodes.forEach(n => {
        const r = n.active ? 11 + Math.sin(pulseRef.current) * 2 : 9
        ctx.beginPath()
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
        ctx.fillStyle = n.active ? n.color + '33' : 'rgba(49,50,68,0.8)'
        ctx.fill()
        ctx.strokeStyle = n.active ? n.color : '#45475a'
        ctx.lineWidth = n.active ? 2 : 1
        if (n.active) {
          ctx.shadowBlur = 12
          ctx.shadowColor = n.color
        }
        ctx.stroke()
        ctx.shadowBlur = 0

        ctx.fillStyle = n.active ? '#fff' : 'rgba(205,214,244,0.7)'
        ctx.font = `${n.active ? '700 ' : ''}9px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const label = n.label.length > 10 ? n.label.slice(0, 9) + '…' : n.label
        ctx.fillText(label, n.x, n.y)
      })

      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [frames, currentStep])

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '120px' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  )
})

export default ExecutionTreePanel
