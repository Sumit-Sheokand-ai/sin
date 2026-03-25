# Rich Animations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add spring-physics variable animations, animated call stack frames, a live execution tree panel, and a full-width execution flow trace panel.

**Architecture:** Framer Motion handles React component enter/exit/layout animations (VariablesPanel, CallStackPanel). Two new canvas components handle the execution tree (replaces MemoryPanel in right slot) and the flow trace (new full-width bottom row). All new panels are purely derived from existing Zustand state — no store changes.

**Tech Stack:** React 18, Framer Motion 11, Canvas 2D API, Zustand 5, TypeScript, Vite 6, Vitest

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | Modify | Add framer-motion dependency |
| `src/components/VariablesPanel.tsx` | Modify | Spring-pop on new var, glow keyframe on changed |
| `src/components/CallStackPanel.tsx` | Modify | AnimatePresence slide-in/out for frames |
| `src/components/MemoryPanel.tsx` | Delete | Replaced by ExecutionTreePanel |
| `src/components/ExecutionTreePanel.tsx` | Create | Canvas call tree, nodes light up as execution reaches them |
| `src/components/FlowTracePanel.tsx` | Create | Full-width canvas, horizontal node path per step |
| `src/App.tsx` | Modify | Replace Memory tab with Exec Tree; add FlowTrace bottom row |
| `tests/components/ExecutionTreePanel.test.tsx` | Create | Mount/crash tests |
| `tests/components/FlowTracePanel.test.tsx` | Create | Mount/crash tests |

---

## Task 1: Install framer-motion

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

```bash
cd D:/sumit14/sem_4/my_github/github_projects/sin
npm install framer-motion
```

Expected: framer-motion appears in `dependencies` in `package.json`.

- [ ] **Step 2: Verify build still works**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add framer-motion dependency"
```

---

## Task 2: Animate VariablesPanel

**Files:**
- Modify: `src/components/VariablesPanel.tsx`
- Test: `tests/components/VariablesPanel.test.tsx` (existing — must still pass)

The existing `VariablesPanel.tsx` maps over `frame.variables` and renders plain `<div>` rows with a CSS `transition` for background/border on `changed`. Replace those divs with `motion.div` inside `AnimatePresence` for proper spring enter/exit and a scale keyframe on change.

- [ ] **Step 1: Run existing tests to confirm baseline**

```bash
npm test -- --reporter=verbose tests/components/VariablesPanel.test.tsx
```

Expected: 4 tests pass.

- [ ] **Step 2: Replace VariablesPanel.tsx with animated version**

Replace the entire file `src/components/VariablesPanel.tsx` with:

```tsx
import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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

const ROW_SPRING = { type: 'spring' as const, stiffness: 400, damping: 25 }

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
      <AnimatePresence initial={false}>
        {vars.map(([name, info]) => (
          <motion.div
            key={name}
            layout
            initial={{ scale: 0.85, x: -8, opacity: 0 }}
            animate={info.changed
              ? { scale: [1, 1.06, 1], x: 0, opacity: 1,
                  transition: { scale: { duration: 0.35 }, x: ROW_SPRING, opacity: ROW_SPRING } }
              : { scale: 1, x: 0, opacity: 1, transition: ROW_SPRING }
            }
            exit={{ scale: 0.85, opacity: 0, transition: { duration: 0.18 } }}
            style={{
              display: 'flex', alignItems: 'center', padding: '5px 6px',
              borderRadius: 'var(--radius-sm)', marginBottom: '2px',
              background: info.changed ? 'rgba(166,227,161,0.08)' : 'transparent',
              border: `1px solid ${info.changed ? 'rgba(166,227,161,0.25)' : 'transparent'}`,
              boxShadow: info.changed ? '0 0 8px rgba(166,227,161,0.15)' : 'none',
              transition: 'background 0.3s, border 0.3s, box-shadow 0.3s',
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
            {info.changed && <span style={{ color: 'var(--green)', fontSize: '10px', marginLeft: '4px' }}>●</span>}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
})

export default VariablesPanel
```

- [ ] **Step 3: Run existing tests — they must still pass**

```bash
npm test -- --reporter=verbose tests/components/VariablesPanel.test.tsx
```

Expected: 4 tests pass. The tests use `@testing-library/react` which renders without animation — `motion.div` renders as a regular div in test env.

- [ ] **Step 4: Commit**

```bash
git add src/components/VariablesPanel.tsx
git commit -m "feat: animate VariablesPanel with Framer Motion spring transitions"
```

---

## Task 3: Animate CallStackPanel

**Files:**
- Modify: `src/components/CallStackPanel.tsx`
- Test: `tests/components/CallStackPanel.test.tsx` (existing — must still pass)

The existing panel maps over `[...frame.callStack].reverse()` and renders plain `<div>` rows. Wrap them in `AnimatePresence` + `motion.div` so frames slide in from the left on call and slide out to the right on return.

- [ ] **Step 1: Run existing tests to confirm baseline**

```bash
npm test -- --reporter=verbose tests/components/CallStackPanel.test.tsx
```

Expected: 3 tests pass.

- [ ] **Step 2: Replace CallStackPanel.tsx with animated version**

Replace the entire file `src/components/CallStackPanel.tsx` with:

```tsx
import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useExecutionStore } from '../store/executionStore'

const FRAME_SPRING = { type: 'spring' as const, stiffness: 350, damping: 28 }

const CallStackPanel = memo(function CallStackPanel() {
  const frames = useExecutionStore(s => s.frames)
  const currentStep = useExecutionStore(s => s.currentStep)
  const frame = frames[currentStep]

  if (!frame) {
    return <div style={{ color: 'var(--text-dim)', fontSize: '12px', padding: '16px', textAlign: 'center' }}>Click Run to start execution</div>
  }

  const stack = [...frame.callStack].reverse()

  return (
    <div>
      <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
        <span>Call Stack</span>
        <span>Depth: {frame.callStack.length}</span>
      </div>
      <AnimatePresence initial={false}>
        {stack.map((f, i) => (
          <motion.div
            key={`${f.name}-${i}`}
            layout
            initial={{ x: -20, opacity: 0, scale: 0.92 }}
            animate={{ x: 0, opacity: 1, scale: 1, transition: FRAME_SPRING }}
            exit={{ x: 20, opacity: 0, scale: 0.88, transition: { duration: 0.2 } }}
            style={{
              padding: '6px 8px', marginBottom: '4px', borderRadius: 'var(--radius-sm)',
              background: i === 0 ? 'rgba(0,122,204,0.1)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${i === 0 ? 'rgba(0,122,204,0.3)' : 'var(--border)'}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: i === 0 ? 'var(--blue)' : 'var(--yellow)', fontFamily: 'var(--font-code)', fontSize: '12px' }}>
                {f.name}
              </span>
              <span style={{ color: 'var(--text-dim)', fontSize: '10px' }}>line {f.line}</span>
            </div>
            {Object.keys(f.args).length > 0 && (
              <div style={{ marginTop: '3px', color: 'var(--text-dim)', fontFamily: 'var(--font-code)', fontSize: '11px' }}>
                {Object.entries(f.args).map(([k, v]) => (
                  <span key={k} style={{ marginRight: '8px' }}>
                    <span style={{ color: 'var(--teal)' }}>{k}</span>
                    <span style={{ color: 'var(--text-dim)' }}>=</span>
                    <span style={{ color: 'var(--text)' }}>{String(v)}</span>
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
})

export default CallStackPanel
```

- [ ] **Step 3: Run existing tests — must still pass**

```bash
npm test -- --reporter=verbose tests/components/CallStackPanel.test.tsx
```

Expected: 3 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/CallStackPanel.tsx
git commit -m "feat: animate CallStackPanel frames with spring slide-in/out"
```

---

## Task 4: Create ExecutionTreePanel (canvas, replaces Memory)

**Files:**
- Create: `src/components/ExecutionTreePanel.tsx`
- Create: `tests/components/ExecutionTreePanel.test.tsx`

This panel lives in the right-panel slot where MemoryPanel was. It draws a call tree from the `callStack` snapshots in `frames[0..currentStep]`. The active node pulses via a `requestAnimationFrame` sin-wave on its radius and `shadowBlur`.

The tree is built by scanning frames for `type === 'call'` and `type === 'return'` events to infer parent-child relationships. Nodes are laid out with a simple recursive x/y placement.

- [ ] **Step 1: Write the failing test**

Create `tests/components/ExecutionTreePanel.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import ExecutionTreePanel from '../../src/components/ExecutionTreePanel'
import { useExecutionStore } from '../../src/store/executionStore'
import type { ExecutionFrame } from '../../src/types/execution'

const makeFrame = (overrides: Partial<ExecutionFrame> = {}): ExecutionFrame => ({
  step: 0, line: 1, type: 'normal', isBreakpoint: false,
  variables: {}, callStack: [{ name: '(main)', line: 1, args: {} }],
  heap: [], output: [], error: null, ...overrides,
})

describe('ExecutionTreePanel', () => {
  beforeEach(() => {
    useExecutionStore.setState({ frames: [], currentStep: 0 })
  })

  it('renders without crashing when no frames', () => {
    const { container } = render(<ExecutionTreePanel />)
    expect(container).toBeTruthy()
  })

  it('renders canvas when frames exist', () => {
    useExecutionStore.setState({ frames: [makeFrame()], currentStep: 0 })
    const { container } = render(<ExecutionTreePanel />)
    expect(container.querySelector('canvas')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --reporter=verbose tests/components/ExecutionTreePanel.test.tsx
```

Expected: FAIL — `ExecutionTreePanel` module not found.

- [ ] **Step 3: Create ExecutionTreePanel.tsx**

Create `src/components/ExecutionTreePanel.tsx`:

```tsx
import { useEffect, useRef, memo } from 'react'
import { useExecutionStore } from '../store/executionStore'
import type { ExecutionFrame } from '../types/execution'

interface TreeNode {
  id: string
  label: string
  children: TreeNode[]
  x: number
  y: number
  revealed: boolean
  active: boolean
}

const TYPE_NODE_COLOR: Record<string, string> = {
  call: '#89b4fa',
  return: '#cba6f7',
  normal: '#a6e3a1',
  loop: '#fab387',
  error: '#f38ba8',
}

function buildTree(frames: ExecutionFrame[], currentStep: number): TreeNode[] {
  // Collect unique call nodes from callStack snapshots up to currentStep
  const nodes: TreeNode[] = []
  const seen = new Set<string>()

  for (let i = 0; i <= Math.min(currentStep, frames.length - 1); i++) {
    const f = frames[i]
    f.callStack.forEach((cs, depth) => {
      const id = `${cs.name}-${depth}`
      if (!seen.has(id)) {
        seen.add(id)
        nodes.push({ id, label: cs.name, children: [], x: 0, y: 0, revealed: true, active: false })
      }
    })
  }

  if (nodes.length === 0) return []

  // Mark active node — topmost frame of current step
  const cur = frames[Math.min(currentStep, frames.length - 1)]
  if (cur) {
    const cs = cur.callStack
    const activeId = `${cs[cs.length - 1]?.name}-${cs.length - 1}`
    nodes.forEach(n => { n.active = n.id === activeId })
  }

  return nodes
}

function layoutNodes(nodes: TreeNode[], width: number): void {
  if (nodes.length === 0) return
  const cols = Math.ceil(Math.sqrt(nodes.length))
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
      const W = canvas.clientWidth
      const H = canvas.clientHeight
      canvas.width = W * dpr
      canvas.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)

      if (frames.length === 0) {
        ctx.fillStyle = 'rgba(108,112,134,0.4)'
        ctx.font = '11px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('Run code to see execution tree', W / 2, H / 2)
        rafRef.current = requestAnimationFrame(draw)
        return
      }

      const nodes = buildTree(frames, currentStep)
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
        const frame = frames[Math.min(currentStep, frames.length - 1)]
        const frameType = frame?.type ?? 'normal'
        const baseColor = n.active ? (TYPE_NODE_COLOR[frameType] ?? '#89b4fa') : '#45475a'
        const r = n.active ? 11 + Math.sin(pulseRef.current) * 2 : 9

        ctx.beginPath()
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
        ctx.fillStyle = n.active ? baseColor + '33' : 'rgba(49,50,68,0.8)'
        ctx.fill()
        ctx.strokeStyle = baseColor
        ctx.lineWidth = n.active ? 2 : 1
        if (n.active) {
          ctx.shadowBlur = 12
          ctx.shadowColor = baseColor
        }
        ctx.stroke()
        ctx.shadowBlur = 0

        ctx.fillStyle = n.active ? '#fff' : 'rgba(205,214,244,0.7)'
        ctx.font = `${n.active ? '700 ' : ''}9px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        // Truncate long labels
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --reporter=verbose tests/components/ExecutionTreePanel.test.tsx
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/ExecutionTreePanel.tsx tests/components/ExecutionTreePanel.test.tsx
git commit -m "feat: add ExecutionTreePanel canvas with animated call tree"
```

---

## Task 5: Create FlowTracePanel (full-width canvas)

**Files:**
- Create: `src/components/FlowTracePanel.tsx`
- Create: `tests/components/FlowTracePanel.test.tsx`

This panel spans the full width of the app in a new bottom row (below the existing timeline/output row). It draws a horizontal node-per-step path: nodes 0..currentStep are visible and colored by `FrameType`, the current node pulses, future nodes are dimmed placeholders.

- [ ] **Step 1: Write the failing test**

Create `tests/components/FlowTracePanel.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import FlowTracePanel from '../../src/components/FlowTracePanel'
import { useExecutionStore } from '../../src/store/executionStore'
import type { ExecutionFrame } from '../../src/types/execution'

const makeFrame = (step: number, type: ExecutionFrame['type'] = 'normal'): ExecutionFrame => ({
  step, line: step + 1, type, isBreakpoint: false,
  variables: {}, callStack: [{ name: '(main)', line: 1, args: {} }],
  heap: [], output: [], error: null,
})

describe('FlowTracePanel', () => {
  beforeEach(() => {
    useExecutionStore.setState({ frames: [], currentStep: 0 })
  })

  it('renders without crashing when no frames', () => {
    const { container } = render(<FlowTracePanel />)
    expect(container).toBeTruthy()
  })

  it('renders canvas when frames exist', () => {
    useExecutionStore.setState({
      frames: [makeFrame(0), makeFrame(1, 'call'), makeFrame(2, 'return')],
      currentStep: 1,
    })
    const { container } = render(<FlowTracePanel />)
    expect(container.querySelector('canvas')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --reporter=verbose tests/components/FlowTracePanel.test.tsx
```

Expected: FAIL — `FlowTracePanel` module not found.

- [ ] **Step 3: Create FlowTracePanel.tsx**

Create `src/components/FlowTracePanel.tsx`:

```tsx
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
      const W = canvas.clientWidth
      const H = canvas.clientHeight
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
      // scroll so active node is always visible — offset if needed
      const activeX = PAD + currentStep * spacing
      const scrollOffset = Math.max(0, activeX - W + PAD * 3)
      const cy = H / 2

      // Draw connector line
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

        // Draw past connector segment in color
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

        // Step label alternating above/below
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --reporter=verbose tests/components/FlowTracePanel.test.tsx
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/FlowTracePanel.tsx tests/components/FlowTracePanel.test.tsx
git commit -m "feat: add FlowTracePanel full-width execution flow canvas"
```

---

## Task 6: Wire up App.tsx — replace Memory tab, add FlowTrace row

**Files:**
- Modify: `src/App.tsx`
- Delete: `src/components/MemoryPanel.tsx`

Replace the Memory tab in the right panel with "Exec Tree" (ExecutionTreePanel). Add a new full-width bottom row for FlowTracePanel below the existing bottom panel. The grid changes from `gridTemplateRows: '1fr 220px'` to `gridTemplateRows: '1fr 220px 90px'`.

- [ ] **Step 1: Delete MemoryPanel.tsx**

```bash
rm src/components/MemoryPanel.tsx
```

- [ ] **Step 2: Replace App.tsx**

Replace the entire file `src/App.tsx` with:

```tsx
import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import CodeEditor from './components/CodeEditor'
import ControlBar from './components/ControlBar'
import VariablesPanel from './components/VariablesPanel'
import CallStackPanel from './components/CallStackPanel'
import ExecutionTreePanel from './components/ExecutionTreePanel'
import FlowTracePanel from './components/FlowTracePanel'
import OutputConsole from './components/OutputConsole'
import ErrorExplainer from './components/ErrorExplainer'
import ExecutionTimeline from './components/ExecutionTimeline'
import TimerBadge from './components/TimerBadge'
import './index.css'

const TABS_RIGHT = ['Variables', 'Call Stack', 'Exec Tree'] as const
const TABS_BOTTOM = ['Output', 'Error'] as const
type RightTab = typeof TABS_RIGHT[number]
type BottomTab = typeof TABS_BOTTOM[number]

export default function App() {
  const [rightTab, setRightTab] = useState<RightTab>('Variables')
  const [bottomTab, setBottomTab] = useState<BottomTab>('Output')
  const [tooSmall, setTooSmall] = useState(window.innerWidth < 1024)

  useEffect(() => {
    const check = () => setTooSmall(window.innerWidth < 1024)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (tooSmall) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', padding:'2rem', textAlign:'center' }}>
        <div>
          <div style={{ fontSize:'2rem', marginBottom:'1rem' }}>💻</div>
          <p style={{ color:'var(--text)', fontFamily:'var(--font-ui)' }}>
            Code Visualizer is best viewed on a desktop (1024px+).
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '220px 1fr 280px',
      gridTemplateRows: '1fr 220px 90px',
      height: '100vh',
      overflow: 'hidden',
      gap: '1px',
      background: 'var(--border)',
    }}>
      {/* Sidebar */}
      <div style={{ background: 'var(--bg-panel)', overflow: 'auto', gridRow: '1/2' }}>
        <Sidebar />
      </div>

      {/* Center: editor + controlbar */}
      <div style={{ background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ControlBar />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <CodeEditor />
        </div>
      </div>

      {/* Right panel */}
      <div style={{ background: 'var(--bg-panel)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {TABS_RIGHT.map(t => (
            <button key={t} onClick={() => setRightTab(t)} style={{
              flex: 1, padding: '8px 4px', background: 'none', border: 'none',
              color: rightTab === t ? 'var(--blue)' : 'var(--text-dim)',
              fontFamily: 'var(--font-ui)', fontSize: '11px', cursor: 'pointer',
              borderBottom: rightTab === t ? '2px solid var(--blue)' : '2px solid transparent',
            }}>{t}</button>
          ))}
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
          {rightTab === 'Variables'  && <VariablesPanel />}
          {rightTab === 'Call Stack' && <CallStackPanel />}
          {rightTab === 'Exec Tree'  && <ExecutionTreePanel />}
        </div>
      </div>

      {/* Bottom panel — spans all 3 columns */}
      <div style={{ gridColumn: '1/4', background: 'var(--bg-panel)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border)', padding: '0 8px' }}>
          {TABS_BOTTOM.map(t => (
            <button key={t} onClick={() => setBottomTab(t)} style={{
              padding: '6px 12px', background: 'none', border: 'none',
              color: bottomTab === t ? 'var(--blue)' : 'var(--text-dim)',
              fontFamily: 'var(--font-ui)', fontSize: '11px', cursor: 'pointer',
              borderBottom: bottomTab === t ? '2px solid var(--blue)' : '2px solid transparent',
            }}>{t}</button>
          ))}
          <div style={{ flex: 1 }} />
          <ExecutionTimeline />
          <TimerBadge />
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
          {bottomTab === 'Output' && <OutputConsole />}
          {bottomTab === 'Error'  && <ErrorExplainer />}
        </div>
      </div>

      {/* Flow Trace — full-width bottom row */}
      <div style={{
        gridColumn: '1/4',
        background: 'var(--bg-panel)',
        borderTop: '1px solid var(--border)',
        padding: '4px 0',
        overflow: 'hidden',
      }}>
        <div style={{
          fontSize: '9px', fontFamily: 'var(--font-ui)', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          color: 'var(--text-dim)', padding: '0 10px 3px',
        }}>
          Execution Flow
        </div>
        <div style={{ height: 'calc(100% - 18px)' }}>
          <FlowTracePanel />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run full test suite**

```bash
npm test -- --reporter=verbose
```

Expected: all 24 tests pass (22 existing + 2 ExecutionTreePanel + 2 FlowTracePanel).

- [ ] **Step 4: Run build to verify no TypeScript errors**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git rm src/components/MemoryPanel.tsx
git commit -m "feat: wire up ExecutionTreePanel and FlowTracePanel in layout"
```

---

## Task 7: Final verification and push

- [ ] **Step 1: Run full test suite one last time**

```bash
npm test -- --reporter=verbose
```

Expected: all 24 tests pass.

- [ ] **Step 2: Run dev server and manually verify animations**

```bash
npm run dev
```

Open browser, run a JavaScript snippet (e.g. the Recursion example), then:
- Step through frames — verify variables spring-pop and glow on change
- Step through a function call — verify call stack frames slide in from left, slide out to right on return
- Switch right tab to "Exec Tree" — verify canvas draws nodes and active one pulses
- Look at the "Execution Flow" bottom row — verify horizontal nodes appear and active one pulses

- [ ] **Step 3: Push**

```bash
git push
```
