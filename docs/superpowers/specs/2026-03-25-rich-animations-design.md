# Rich Step-by-Step Animations Design

## Goal

Add rich, BST-visualizer-style animations to the code execution visualizer — variables spring into view, call stack frames slide in/out, and two new canvas panels show an execution tree and a full-width flow trace.

## Architecture

Framer Motion handles all React component animations (variables panel, call stack). Canvas handles both new graph panels (execution tree, flow trace) for performance. No Zustand store changes — all animation is driven by the existing `currentStep` + `frames` state.

## Tech Stack

- **Framer Motion** (re-add as dependency) — spring physics, `AnimatePresence` for mount/unmount
- **Canvas 2D API** — execution tree panel, flow trace panel
- **Existing stack** — React 18, Zustand, TypeScript, Vite

## Layout Change

```
Before:
grid-template-rows: auto 1fr 16px
                    topbar | main | timeline

After:
grid-template-rows: auto 1fr 16px 120px
                    topbar | main | timeline | FlowTrace (new full-width row)
```

Right panel slot: MemoryPanel removed → ExecutionTreePanel replaces it.

## Components

### Modified

**`VariablesPanel.tsx`**
- Wrap each variable row in `motion.div` with `layout` prop
- New variable: `initial={{ scale: 0.8, x: -8, opacity: 0 }}` → `animate={{ scale: 1, x: 0, opacity: 1 }}`, spring `stiffness: 400, damping: 25`
- Changed variable: brief `scale: [1, 1.06, 1]` keyframe animation + green glow via CSS transition (already present, enhance)
- `AnimatePresence` wraps the list so removed variables fade out

**`CallStackPanel.tsx`**
- Wrap each frame in `motion.div` inside `AnimatePresence`
- Enter: `initial={{ x: -20, opacity: 0 }}` → `animate={{ x: 0, opacity: 1 }}`, spring `stiffness: 350, damping: 28`
- Exit: `exit={{ x: 20, opacity: 0 }}`

### Deleted

**`MemoryPanel.tsx`** — removed; ExecutionTreePanel takes its slot.

### New

**`ExecutionTreePanel.tsx`**
- Canvas panel in the right-panel slot (same grid cell as old MemoryPanel)
- Builds a call tree by replaying `callStack` snapshots from `frames[0..currentStep]`
- Active node pulses radius ±2px via `requestAnimationFrame` sin wave + `shadowBlur` glow
- Nodes revealed progressively as execution reaches them
- Color-coded by frame type: call=blue, return=purple, normal=green

**`FlowTracePanel.tsx`**
- Full-width canvas in the new bottom row (below timeline)
- Horizontal node path: one node per step, colored by `FrameType`
- Nodes 0..currentStep are visible; current node pulses; future nodes dimmed
- Labels alternate above/below to avoid overlap
- Auto-scrolls right as execution progresses past the visible width

## Animation Specs

| Element | Enter | Active | Exit |
|---|---|---|---|
| Variable row (new) | scale 0.8→1, x -8→0, opacity 0→1, spring 400/25 | — | opacity→0 |
| Variable row (changed) | — | scale keyframe [1,1.06,1], green glow | — |
| Call stack frame | x -20→0, opacity 0→1, spring 350/28 | — | x→20, opacity→0 |
| Tree node (active) | — | radius sin-pulse ±2px, shadowBlur glow | — |
| Flow trace node (new) | alpha lerp 0→1 over 6 frames | pulse scale | — |

## Data Flow

Both canvas panels are purely derived from store state — no new Zustand slices:

```
useExecutionStore(s => s.frames)        → FlowTracePanel node list
useExecutionStore(s => s.currentStep)   → active node index
frames[0..currentStep].callStack        → ExecutionTreePanel tree structure
```

## Testing

- Existing 22 tests unchanged (engine + VariablesPanel logic + CallStackPanel logic)
- Add 2 new render tests: `ExecutionTreePanel` and `FlowTracePanel` mount without crashing with empty/populated frames
