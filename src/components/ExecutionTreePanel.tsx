import { memo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useExecutionStore } from '../store/executionStore'
import type { ExecutionFrame } from '../types/execution'

// ── BST-visualizer-style execution call tree ─────────────────────────────────
// Nodes are circles arranged top-down (root at top, children below).
// Active node pulses with glow ring. Edges animate in with SVG pathLength.
// Color-coded by depth level, catppuccin mocha palette.

const NODE_R = 28          // circle radius px
const V_SPACING = 90       // vertical gap between depth rows
const H_GAP = 72           // min horizontal gap between node centers
const PAD = 40             // canvas padding

const DEPTH_COLORS = [
  { fill: '#89b4fa', stroke: '#89b4fa', glow: 'rgba(137,180,250,0.6)',  text: '#1e1e2e' },
  { fill: '#cba6f7', stroke: '#cba6f7', glow: 'rgba(203,166,247,0.6)',  text: '#1e1e2e' },
  { fill: '#a6e3a1', stroke: '#a6e3a1', glow: 'rgba(166,227,161,0.6)',  text: '#1e1e2e' },
  { fill: '#fab387', stroke: '#fab387', glow: 'rgba(250,179,135,0.6)',  text: '#1e1e2e' },
  { fill: '#f38ba8', stroke: '#f38ba8', glow: 'rgba(243,139,168,0.6)',  text: '#1e1e2e' },
  { fill: '#94e2d5', stroke: '#94e2d5', glow: 'rgba(148,226,213,0.6)',  text: '#1e1e2e' },
]

interface VisualNode {
  id: string
  name: string
  args: string
  depth: number
  parentId: string | null
  x: number
  y: number
}

// ── Build tree from execution trace ──────────────────────────────────────────
function buildTree(frames: ExecutionFrame[], upToStep: number): VisualNode[] {
  const nodes: VisualNode[] = []
  const nodeMap = new Map<string, VisualNode>()
  const activePath: string[] = ['root']

  const root: VisualNode = { id: 'root', name: 'main', args: '', depth: 0, parentId: null, x: 0, y: 0 }
  nodes.push(root)
  nodeMap.set('root', root)

  for (let i = 0; i <= Math.min(upToStep, frames.length - 1); i++) {
    const f = frames[i]
    if (f.type === 'call') {
      const top = f.callStack[f.callStack.length - 1]
      if (!top || top.name === '(main)') continue
      const parentId = activePath[activePath.length - 1]
      const args = top.args
        ? Object.entries(top.args).map(([k, v]) => `${k}=${v}`).join(', ')
        : ''
      const depth = activePath.length
      const node: VisualNode = {
        id: `n-${i}`, name: top.name, args,
        depth, parentId, x: 0, y: 0,
      }
      nodes.push(node)
      nodeMap.set(node.id, node)
      activePath.push(node.id)
    } else if (f.type === 'return') {
      if (activePath.length > 1) activePath.pop()
    }
  }

  // ── Top-down layout: y = depth × spacing, x = evenly spread per row ──
  const byDepth = new Map<number, VisualNode[]>()
  for (const n of nodes) {
    const arr = byDepth.get(n.depth) ?? []
    arr.push(n)
    byDepth.set(n.depth, arr)
  }

  // Canvas width based on widest row
  const maxCount = Math.max(...Array.from(byDepth.values()).map(a => a.length))
  const canvasW = Math.max(maxCount * (NODE_R * 2 + H_GAP), 280)

  byDepth.forEach((rowNodes, depth) => {
    const count = rowNodes.length
    const totalSpan = (count - 1) * (NODE_R * 2 + H_GAP)
    const startX = (canvasW - totalSpan) / 2
    rowNodes.forEach((n, i) => {
      n.x = startX + i * (NODE_R * 2 + H_GAP)
      n.y = PAD + depth * V_SPACING
    })
  })

  return nodes
}

// ── Get which node is currently active ───────────────────────────────────────
function getActiveId(frames: ExecutionFrame[], step: number, nodes: VisualNode[]): string {
  if (!nodes.length) return 'root'
  const frame = frames[Math.min(step, frames.length - 1)]
  if (!frame) return 'root'
  const top = frame.callStack[frame.callStack.length - 1]
  if (!top || top.name === '(main)') return 'root'
  for (let i = nodes.length - 1; i >= 0; i--) {
    if (nodes[i].name === top.name) return nodes[i].id
  }
  return 'root'
}

// ── Single animated node ──────────────────────────────────────────────────────
const TreeNode = memo(function TreeNode({
  node, isActive, reduced,
}: {
  node: VisualNode
  isActive: boolean
  reduced: boolean
}) {
  const col = DEPTH_COLORS[node.depth % DEPTH_COLORS.length]

  return (
    <motion.g
      key={node.id}
      initial={reduced ? false : { scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22, delay: node.depth * 0.06 }}
      style={{ transformOrigin: `${node.x}px ${node.y}px` }}
    >
      {/* outer glow ring — pulses when active */}
      {isActive && !reduced && (
        <motion.circle
          cx={node.x} cy={node.y} r={NODE_R + 8}
          fill="none"
          stroke={col.stroke}
          strokeWidth={1.5}
          strokeOpacity={0.5}
          animate={{ r: [NODE_R + 6, NODE_R + 16, NODE_R + 6], strokeOpacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* second pulse ring */}
      {isActive && !reduced && (
        <motion.circle
          cx={node.x} cy={node.y} r={NODE_R + 4}
          fill="none"
          stroke={col.stroke}
          strokeWidth={2}
          animate={{ r: [NODE_R + 2, NODE_R + 12, NODE_R + 2], strokeOpacity: [0.8, 0, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
        />
      )}

      {/* drop shadow filter */}
      <defs>
        <filter id={`glow-${node.id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={isActive ? '4' : '1'} result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* main circle */}
      <motion.circle
        cx={node.x} cy={node.y} r={NODE_R}
        fill={isActive ? col.fill : 'rgba(30,30,46,0.9)'}
        stroke={col.stroke}
        strokeWidth={isActive ? 2.5 : 1.5}
        strokeOpacity={isActive ? 1 : 0.45}
        filter={isActive ? `url(#glow-${node.id})` : undefined}
        animate={isActive && !reduced
          ? { r: [NODE_R, NODE_R + 2, NODE_R] }
          : { r: NODE_R }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* function name */}
      <text
        x={node.x} y={node.y - (node.args ? 5 : 0)}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={node.name.length > 8 ? 9 : 11}
        fontWeight={700}
        fontFamily="'JetBrains Mono', monospace"
        fill={isActive ? col.text : col.stroke}
        opacity={isActive ? 1 : 0.85}
      >
        {node.name.length > 10 ? node.name.slice(0, 9) + '…' : node.name}
      </text>

      {/* args text below name */}
      {node.args && (
        <text
          x={node.x} y={node.y + 10}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={8}
          fontFamily="'JetBrains Mono', monospace"
          fill={isActive ? col.text + 'cc' : 'rgba(108,112,134,0.8)'}
        >
          {node.args.length > 12 ? node.args.slice(0, 11) + '…' : node.args}
        </text>
      )}
    </motion.g>
  )
})

// ── Animated edge ─────────────────────────────────────────────────────────────
const TreeEdge = memo(function TreeEdge({
  parent, child, reduced,
}: {
  parent: VisualNode
  child: VisualNode
  reduced: boolean
}) {
  const col = DEPTH_COLORS[child.depth % DEPTH_COLORS.length]

  // Curved path: start at bottom of parent, end at top of child
  const x1 = parent.x
  const y1 = parent.y + NODE_R
  const x2 = child.x
  const y2 = child.y - NODE_R
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2

  return (
    <motion.path
      key={`edge-${child.id}`}
      d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
      fill="none"
      stroke={col.stroke}
      strokeWidth={1.5}
      strokeOpacity={0.35}
      strokeDasharray="none"
      initial={reduced ? false : { pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: child.depth * 0.05 }}
    />
  )
})

// ── Main panel ────────────────────────────────────────────────────────────────
const ExecutionTreePanel = memo(function ExecutionTreePanel() {
  const frames = useExecutionStore(s => s.frames)
  const currentStep = useExecutionStore(s => s.currentStep)
  const reduced = useReducedMotion() ?? false

  if (frames.length === 0) {
    return (
      <div style={{
        width: '100%', height: '100%', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-dim)', fontSize: '11px',
        fontFamily: 'var(--font-ui)',
      }}>
        Run code to see the call tree
      </div>
    )
  }

  const nodes = buildTree(frames, currentStep)
  const activeId = getActiveId(frames, currentStep, nodes)

  // Canvas dimensions
  const maxCount = Math.max(...Array.from(
    nodes.reduce((m, n) => {
      m.set(n.depth, (m.get(n.depth) ?? 0) + 1)
      return m
    }, new Map<number, number>()).values()
  ))
  const maxDepth = Math.max(...nodes.map(n => n.depth))
  const canvasW = Math.max(maxCount * (NODE_R * 2 + H_GAP), 280)
  const canvasH = PAD + maxDepth * V_SPACING + NODE_R * 2 + PAD

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
      <svg
        width={canvasW}
        height={Math.max(canvasH, 120)}
        style={{ display: 'block', minWidth: '100%' }}
      >
        {/* background grid dots — subtle premium touch */}
        <defs>
          <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.8" fill="rgba(69,71,90,0.4)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />

        {/* edges */}
        <AnimatePresence>
          {nodes
            .filter(n => n.parentId !== null)
            .map(n => {
              const parent = nodes.find(p => p.id === n.parentId)
              if (!parent) return null
              return (
                <TreeEdge key={`e-${n.id}`} parent={parent} child={n} reduced={reduced} />
              )
            })}
        </AnimatePresence>

        {/* nodes */}
        <AnimatePresence>
          {nodes.map(n => (
            <TreeNode
              key={n.id}
              node={n}
              isActive={n.id === activeId}
              reduced={reduced}
            />
          ))}
        </AnimatePresence>
      </svg>
    </div>
  )
})

export default ExecutionTreePanel
