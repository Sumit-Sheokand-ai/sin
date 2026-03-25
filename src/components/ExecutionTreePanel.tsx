import { memo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useExecutionStore } from '../store/executionStore'
import type { ExecutionFrame } from '../types/execution'

// Layout constants
const H_SPACING = 170  // px between depth levels
const V_SPACING = 68   // px between siblings
const NODE_W = 108
const NODE_H = 52

const DEPTH_COLORS = [
  { border: '#89b4fa', bg: 'rgba(137,180,250,0.10)', glow: 'rgba(137,180,250,0.5)', text: '#89b4fa' },
  { border: '#cba6f7', bg: 'rgba(203,166,247,0.10)', glow: 'rgba(203,166,247,0.5)', text: '#cba6f7' },
  { border: '#a6e3a1', bg: 'rgba(166,227,161,0.10)', glow: 'rgba(166,227,161,0.5)', text: '#a6e3a1' },
  { border: '#fab387', bg: 'rgba(250,179,135,0.10)', glow: 'rgba(250,179,135,0.5)', text: '#fab387' },
  { border: '#f38ba8', bg: 'rgba(243,139,168,0.10)', glow: 'rgba(243,139,168,0.5)', text: '#f38ba8' },
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

function buildTree(frames: ExecutionFrame[], upToStep: number): VisualNode[] {
  const nodes: VisualNode[] = []
  const nodeMap = new Map<string, VisualNode>()

  // Root node always exists
  const root: VisualNode = { id: 'root', name: '(main)', args: '', depth: 0, parentId: null, x: 0, y: 0 }
  nodes.push(root)
  nodeMap.set('root', root)

  // Track current "active path" — stack of node IDs as we walk the trace
  const activePath: string[] = ['root']
  const siblingCount = new Map<string, number>() // parentId → count of children seen so far

  for (let i = 0; i <= Math.min(upToStep, frames.length - 1); i++) {
    const f = frames[i]
    if (f.type === 'call') {
      const topFrame = f.callStack[f.callStack.length - 1]
      if (!topFrame || topFrame.name === '(main)') continue
      const parentId = activePath[activePath.length - 1]
      const sibKey = parentId
      const sibIdx = (siblingCount.get(sibKey) ?? 0)
      siblingCount.set(sibKey, sibIdx + 1)
      const nodeId = `n-${i}`
      const args = topFrame.args
        ? Object.entries(topFrame.args).map(([k, v]) => `${k}=${v}`).join(', ')
        : ''
      const depth = activePath.length
      const parent = nodeMap.get(parentId)!
      const node: VisualNode = {
        id: nodeId,
        name: topFrame.name,
        args,
        depth,
        parentId,
        x: parent.x + H_SPACING + NODE_W,
        y: 0, // will be set during layout
      }
      nodes.push(node)
      nodeMap.set(nodeId, node)
      activePath.push(nodeId)
    } else if (f.type === 'return') {
      if (activePath.length > 1) activePath.pop()
    }
  }

  // Layout: for each depth level, distribute nodes vertically centered
  const byDepth = new Map<number, VisualNode[]>()
  for (const n of nodes) {
    const arr = byDepth.get(n.depth) ?? []
    arr.push(n)
    byDepth.set(n.depth, arr)
  }
  byDepth.forEach(depthNodes => {
    const total = (depthNodes.length - 1) * V_SPACING
    depthNodes.forEach((n, i) => {
      n.y = (i * V_SPACING) - total / 2
    })
  })

  return nodes
}

function getActiveId(frames: ExecutionFrame[], currentStep: number, nodes: VisualNode[]): string {
  if (nodes.length === 0) return 'root'
  const frame = frames[Math.min(currentStep, frames.length - 1)]
  if (!frame) return 'root'
  const stackTop = frame.callStack[frame.callStack.length - 1]
  if (!stackTop || stackTop.name === '(main)') return 'root'
  // find the last node whose name matches the top of the stack
  for (let i = nodes.length - 1; i >= 0; i--) {
    if (nodes[i].name === stackTop.name) return nodes[i].id
  }
  return 'root'
}

interface NodeProps {
  node: VisualNode
  isActive: boolean
  reduced: boolean
}

const TreeNodeEl = memo(function TreeNodeEl({ node, isActive, reduced }: NodeProps) {
  const col = DEPTH_COLORS[node.depth % DEPTH_COLORS.length]

  return (
    <motion.div
      layout
      initial={reduced ? false : { scale: 0, opacity: 0 }}
      animate={
        isActive && !reduced
          ? {
              scale: [1, 1.06, 1],
              boxShadow: [
                `0 0 0px ${col.glow}`,
                `0 0 18px ${col.glow}`,
                `0 0 8px ${col.glow}`,
              ],
              transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
            }
          : { scale: 1, opacity: 1 }
      }
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        width: NODE_W,
        height: NODE_H,
        borderRadius: 8,
        background: isActive ? col.bg : 'rgba(49,50,68,0.7)',
        border: `1.5px solid ${isActive ? col.border : 'rgba(69,71,90,0.7)'}`,
        boxShadow: isActive ? `0 0 10px ${col.glow}` : 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 6px',
        cursor: 'default',
        backdropFilter: 'blur(4px)',
        transition: reduced ? 'none' : 'border 0.3s, box-shadow 0.3s, background 0.3s',
      }}
    >
      {isActive && !reduced && (
        <motion.div
          animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
          style={{
            position: 'absolute', inset: -6, borderRadius: 12,
            border: `1px solid ${col.border}`,
            pointerEvents: 'none',
          }}
        />
      )}
      <div style={{
        fontFamily: 'var(--font-code)', fontSize: '11px', fontWeight: 700,
        color: isActive ? col.text : 'var(--text)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        maxWidth: NODE_W - 12,
      }}>
        {node.name}
      </div>
      {node.args && (
        <div style={{
          fontFamily: 'var(--font-code)', fontSize: '9px',
          color: 'var(--text-dim)', marginTop: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          maxWidth: NODE_W - 12,
        }}>
          {node.args}
        </div>
      )}
    </motion.div>
  )
})

const ExecutionTreePanel = memo(function ExecutionTreePanel() {
  const frames = useExecutionStore(s => s.frames)
  const currentStep = useExecutionStore(s => s.currentStep)
  const reduced = useReducedMotion() ?? false

  if (frames.length === 0) {
    return (
      <div style={{
        width: '100%', height: '100%', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-dim)', fontSize: '11px', fontFamily: 'var(--font-ui)',
      }}>
        Run code to see execution tree
      </div>
    )
  }

  const nodes = buildTree(frames, currentStep)
  const activeId = getActiveId(frames, currentStep, nodes)

  // Compute SVG canvas size
  const maxX = Math.max(...nodes.map(n => n.x)) + NODE_W + 20
  const minY = Math.min(...nodes.map(n => n.y)) - 20
  const maxY = Math.max(...nodes.map(n => n.y)) + NODE_H + 20
  const canvasH = maxY - minY
  const offsetY = -minY + 20

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'auto', position: 'relative' }}>
      <div style={{
        position: 'relative',
        width: maxX + 20,
        height: Math.max(canvasH + 40, 120),
        minHeight: '100%',
      }}>
        {/* SVG edges */}
        <svg
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}
          width={maxX + 20}
          height={Math.max(canvasH + 40, 120)}
        >
          {nodes.filter(n => n.parentId !== null).map(n => {
            const parent = nodes.find(p => p.id === n.parentId)
            if (!parent) return null
            const x1 = parent.x + NODE_W
            const y1 = parent.y + NODE_H / 2 + offsetY
            const x2 = n.x
            const y2 = n.y + NODE_H / 2 + offsetY
            const mx = (x1 + x2) / 2
            return (
              <motion.path
                key={`edge-${n.id}`}
                d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                fill="none"
                stroke="rgba(69,71,90,0.6)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                initial={reduced ? false : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            )
          })}
        </svg>

        {/* Nodes */}
        <AnimatePresence initial={false}>
          {nodes.map((node, i) => (
            <motion.div
              key={node.id}
              initial={reduced ? false : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{
                type: 'spring', stiffness: 260, damping: 20,
                delay: reduced ? 0 : node.depth * 0.08 + i * 0.02,
              }}
              style={{
                position: 'absolute',
                left: node.x,
                top: node.y + offsetY,
                transformOrigin: 'center',
              }}
            >
              <TreeNodeEl
                node={{ ...node, x: 0, y: 0 }}
                isActive={node.id === activeId}
                reduced={reduced}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
})

export default ExecutionTreePanel
