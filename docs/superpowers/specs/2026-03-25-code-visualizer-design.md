# Code Execution Visualizer — Design Spec
**Date:** 2026-03-25
**Stack:** React + Vite, hosted on GitHub Pages

---

## Overview

A premium educational web app that visualizes how code runs behind the scenes. Users choose a programming language, write or paste code, and watch execution step by step. The app explains variable changes, memory behavior, call stack updates, control flow, loops, functions, recursion, output, and errors. It handles broken code by showing valid execution up to the point of failure, then explains the error clearly in plain English.

The interface is strongly inspired by Visual Studio Code: dark theme, minimal layout, professional typography, subtle borders, calm color accents, and a developer-tool feel.

---

## Layout

Four-zone VSCode-inspired layout. **Desktop-only; minimum supported viewport is 1024×768.** Below 1024px, a "best viewed on desktop" message is shown. Panels are resizable via drag handles.

```
┌─────────┬──────────────────┬──────────────────┐
│ Sidebar │   Code Editor    │  Variables/Stack  │
│ Lang    │  (CodeMirror 6)  │  Memory Panel     │
│ Select  │  + Breakpoints   │  Call Stack       │
│ Examples│                  │  Watch Panel      │
├─────────┴──────────────────┴──────────────────┤
│  Output Console │ Error Explanation │ Timeline  │
│                                    │    ⏱ 0.03s│
└────────────────────────────────────────────────┘
```

- **Left sidebar** — language selector dropdown, sample code snippets organized by language
- **Center** — CodeMirror 6 editor with breakpoint gutter (click line numbers to set breakpoints), highlighted current execution line
- **Right panel** — tabbed: Variables/Watch, Call Stack, Memory Visualization
- **Bottom panel** — tabbed: Output Console, Error Explanation; execution timeline scrubber; small timer badge bottom-right

---

## Editor: CodeMirror 6

**Decision: CodeMirror 6** (not Monaco). Reasons: simpler Vite bundling, no worker file configuration, smaller bundle size, sufficient for this use case. Monaco's worker file setup creates significant complexity for GitHub Pages static hosting.

CodeMirror packages needed: `@codemirror/view`, `@codemirror/state`, `@codemirror/lang-javascript`, `@codemirror/lang-python`, `@codemirror/lang-java`, `@codemirror/lang-cpp`, `@codemirror/theme-one-dark`.

Breakpoints are implemented via a custom `GutterMarker` extension — click on a line number gutter marker toggles a red dot and calls `toggleBreakpoint(line)` in the Zustand store (stored as `number[]`).

---

## Components

| Component | Responsibility |
|---|---|
| `App` | Layout shell, global Zustand store provider, theme |
| `Sidebar` | Language picker, sample snippet list |
| `CodeEditor` | CodeMirror 6 wrapper, breakpoint gutter, current-line highlight |
| `ExecutionEngine` | AST-based stepper / Pyodide bridge / simulated trace loader; produces `ExecutionFrame[]` |
| `VariablesPanel` | Live variable state with diff highlights per step |
| `CallStackPanel` | Function frame list, active frame highlighted |
| `MemoryPanel` | Heap/stack visual block diagram (CSS/DOM, no canvas) |
| `OutputConsole` | Captured stdout/stderr per step |
| `ErrorExplainer` | Plain-English breakdown of errors with suggestions |
| `ExecutionTimeline` | Scrubable step history with color-coded segments |
| `TimerBadge` | Small bottom-right elapsed execution time |
| `ControlBar` | Play, Pause, Step Forward, Step Back, Reset, Speed controls |

---

## ExecutionFrame Data Shape

```ts
type FrameType = 'normal' | 'call' | 'return' | 'loop' | 'error';

interface HeapNode {
  id: string;           // unique reference ID (e.g. "ref_1")
  label: string;        // display name
  value: unknown;       // serialized value
  type: string;         // "array" | "object" | "list" | "dict" | etc.
  references: string[]; // IDs of other HeapNodes this node points to
}

interface ExecutionFrame {
  step: number;
  line: number;
  type: FrameType;      // used for timeline color-coding
  isBreakpoint: boolean; // true if this frame's line has a breakpoint set
  variables: Record<string, {
    value: unknown;
    type: string;
    changed: boolean;   // true if value differs from previous frame
  }>;
  callStack: Array<{
    name: string;
    line: number;
    args: Record<string, unknown>;
  }>;
  heap: HeapNode[];     // all heap-allocated objects at this step
  output: string[];     // all stdout lines captured up to this step
  error: ExecutionError | null;
}

interface ExecutionError {
  type: string;         // e.g. "ReferenceError", "SyntaxError"
  message: string;      // raw engine message
  explanation: string;  // plain-English explanation (see Error Explanations)
  suggestion: string;   // what to fix
  line: number;
}
```

### Timeline color mapping (from `frame.type`)
- `normal` → blue `#007acc`
- `call` / `return` → purple `#c586c0`
- `loop` → teal `#4ec9b0`
- `error` → red `#f44747`

---

## State Management: Zustand

Single Zustand store (`useExecutionStore`) with the following shape:

```ts
interface ExecutionStore {
  // Code & language
  code: string;
  language: Language;
  setCode: (code: string) => void;
  setLanguage: (lang: Language) => void;

  // Frames
  frames: ExecutionFrame[];
  currentStep: number;
  setFrames: (frames: ExecutionFrame[]) => void;
  setCurrentStep: (step: number) => void;

  // Breakpoints — stored as number[] (not Set) for Zustand devtools compatibility.
  // Lookups use Array.includes(); toggle adds/removes from array.
  breakpoints: number[];
  toggleBreakpoint: (line: number) => void;

  // Playback
  isPlaying: boolean;
  speed: number;  // 0.5 | 1 | 2 | 4 (multiplier)
  setPlaying: (v: boolean) => void;
  setSpeed: (v: number) => void;

  // Status & timing
  status: 'idle' | 'running' | 'paused' | 'error' | 'loading';
  elapsedMs: number;
  // Updated after frames are generated. For JS: performance.now() diff around JSInterpreter run.
  // For Python: worker sends { type: 'frames', frames, elapsedMs } — the worker times its own run.
  setElapsedMs: (ms: number) => void;
}
```

**Frame invalidation:** The execution engine re-runs **only on explicit "Run" button click**, not on every keystroke. This avoids performance issues and UI thrashing. While typing, the editor shows code only. Pressing Run triggers `ExecutionEngine.run(code, language)` → sets `frames`. A debounced auto-run (1.5s after last keystroke) is available as an opt-in toggle.

**Re-render performance:** `VariablesPanel`, `CallStackPanel`, `MemoryPanel` are wrapped in `React.memo`. They only re-render when `currentStep` changes. With a max of 1000 frames (hard cap), re-renders are bounded.

---

## Execution Engine

### JavaScript (real, sandboxed)

- Parse with **Acorn** (`acorn` npm package, ESNext target)
- Walk AST with a custom interpreter class (`JSInterpreter`)
- Produce one `ExecutionFrame` per statement/expression evaluation

**Sandbox security constraints:**
- The interpreter runs in a **pure JS environment** — no DOM access, no `window`, no `document`, no `fetch`, no `XMLHttpRequest`, no `WebSocket`, no `import()`
- `console.log` is intercepted and routed to `frame.output`
- **Infinite loop protection:** a global step counter is checked on every loop iteration. If `stepCount > 1000`, execution halts and a synthetic `ExecutionError` of type `InfiniteLoopError` is emitted with the explanation "This loop ran more than 1000 steps. It may be an infinite loop."
- **Maximum frame count:** 1000 frames hard cap. If exceeded, the last frame contains a `MAX_STEPS_EXCEEDED` error.
- **Timeout:** The interpreter runs synchronously on the main thread (it is a step-by-step interpreter, not eval). No async operations are involved.
- Blocked identifiers: `eval`, `Function`, `setTimeout`, `setInterval`, `fetch`, `XMLHttpRequest`, `WebSocket`, `import`

**Heap tracking (JS):** Object/array values are tracked by reference ID. When a new object is created, it is assigned a `ref_N` ID and added to `heap[]`. Primitive values go directly into `variables`. References in `variables` hold `{ value: "ref_1", type: "ref" }` pointing to heap.

### Python (real, Pyodide WASM)

- Pyodide runs in a **Web Worker** (`pyodide.worker.js`) to prevent UI thread freezing
- Worker message protocol:
  - Main thread → worker: `{ type: 'run', code: string }`
  - Worker → main thread: `{ type: 'frames', frames: ExecutionFrame[], elapsedMs: number }` or `{ type: 'error', error: ExecutionError }`
- **Loading state:** First load of Pyodide (~15MB) shows a full-panel loading overlay with a progress message. After initial load, Pyodide is cached in the worker (no reload on subsequent runs).
- **Frame serialization:** Python's `sys.settrace` emits `call`, `line`, `return`, `exception` events. Each `line` event → one `ExecutionFrame`. The worker serializes `locals()` + `f_code.co_filename` + traceback into the `ExecutionFrame` interface.
- **Heap (Python):** Objects (lists, dicts, class instances) are identified by `id()`. Each unique `id()` maps to a `HeapNode`. References in `variables` use `ref_<id>` pattern.
- **Infinite loop protection:** Python execution is limited by a `sys.settrace` line-event counter. After 1000 `line` events, the trace function sets `sys.settrace(None)` and raises a custom `ExecutionLimitExceeded` exception (defined in the worker's Python bootstrap code). This avoids corrupting user code that uses generators or iterables, since `StopIteration` is a semantically reserved Python exception.
- **Fallback:** If Pyodide fails to load (network error, timeout), a toast notification shows "Python WASM failed to load. Using simulated mode." and falls back to a pre-baked Python trace.

### Java, C, C++, Pseudocode (simulated/demo mode)

- Pre-baked execution traces stored as JSON files in `src/traces/<language>/<snippet-name>.json`
- Each trace file conforms to the `ExecutionFrame[]` schema
- A clear **"Simulated"** badge appears in the editor toolbar for these languages
- Simulated mode supports all UI features (step, breakpoints, timeline) since traces contain all `ExecutionFrame` fields

### Simulated Trace JSON Format

```jsonc
// src/traces/java/hello-world.json
{
  "language": "java",
  "snippet": "hello-world",
  "code": "public class Main {\n  public static void main(String[] args) {\n    System.out.println(\"Hello, World!\");\n  }\n}",
  "frames": [
    {
      "step": 0,
      "line": 2,
      "type": "call",
      "isBreakpoint": false,
      "variables": {},
      "callStack": [{ "name": "main", "line": 2, "args": { "args": "[]" } }],
      "heap": [],
      "output": [],
      "error": null
    },
    {
      "step": 1,
      "line": 3,
      "type": "normal",
      "isBreakpoint": false,
      "variables": {},
      "callStack": [{ "name": "main", "line": 3, "args": { "args": "[]" } }],
      "heap": [],
      "output": ["Hello, World!"],
      "error": null
    }
  ]
}
```

---

## Breakpoints

- Clicking a line number in the gutter calls `toggleBreakpoint(line)` in Zustand store
- Breakpoints are stored as `number[]` in the store (persisted across resets; array used instead of `Set` for Zustand serialization compatibility)
- During **frame generation**, each `ExecutionFrame` has `isBreakpoint` set by checking `breakpoints.includes(frame.line)` **after** all frames are generated (post-processing pass)
- During **playback**, the `ControlBar` "Play" mode checks `frames[currentStep + 1].isBreakpoint` before advancing — if true, it pauses
- "Play to next breakpoint" runs until `frames[n].isBreakpoint === true` then halts

---

## Features

### Step-by-step execution
- Play/Pause auto-steps at configurable speed (0.5x – 4x), implemented with `setInterval`
- Step Forward / Step Back buttons
- Keyboard shortcuts: `Space` (play/pause), `→` (step forward), `←` (step back), `R` (reset)

### Execution timeline
- A single `<canvas>` element renders the color-coded segment bar (one pixel column per frame, colored by `frame.type`). This avoids DOM node explosion at high step counts.
- A transparent `<input type="range">` is overlaid on the canvas — its thumb acts as the scrubber.
- Moving the scrubber calls `setCurrentStep` with the selected step index.

### Variable watch
- All in-scope variables shown with current value and type badge
- Changed variables (`changed: true`) flash with a yellow highlight for 400ms (CSS transition)
- Supports primitives, arrays, objects, null/undefined

### Call stack panel
- Each stack frame shown as a card with function name, line, and args
- Active (top) frame highlighted with accent border
- Recursion depth shown as a counter badge

### Memory visualization (CSS/DOM, no canvas)
- Stack frames: vertically stacked colored blocks with variable labels
- Heap objects: CSS flex-positioned cards
- Reference arrows: CSS `border` + `::after` pseudo-elements for simple cases; complex graphs use a lightweight SVG overlay (absolute positioned)
- `references[]` array on each `HeapNode` drives arrow rendering

### Output console
- Shows `frame.output` (all lines up to current step)
- Color-codes: stdout (white), errors (red `#f44747`), system messages (gray `#6a9955`)

### Error handling
- Execution runs to error point; last frame has `error != null`
- Editor highlights error line in red
- Error Explainer shows: error type badge, plain-English explanation, suggestion
- Partial runs (valid steps before error) are fully playable

### Timer badge
- Bottom-right, outside all panels
- Shows `⏱ {elapsedMs}ms` or `⏱ {elapsed}s` for runs > 1s
- Muted color `#858585`, font-size `11px`, no border, no background

---

## Error Explanations

**JavaScript** — explanations are generated programmatically from error type + message pattern matching:
```ts
const errorExplanations: Record<string, (msg: string) => { explanation: string; suggestion: string }> = {
  'ReferenceError': (msg) => ({
    explanation: `You tried to use a variable that hasn't been declared yet.`,
    suggestion: `Check spelling and make sure the variable is declared before this line.`
  }),
  'TypeError': (msg) => ({ ... }),
  'SyntaxError': (msg) => ({ ... }),
  'InfiniteLoopError': (_) => ({
    explanation: `This loop ran more than 1000 steps without finishing.`,
    suggestion: `Check your loop condition — it may never become false.`
  }),
  // ... etc.
}
```

**Python** — same pattern, Python error types mapped to same structure.

**Simulated languages** — `explanation` and `suggestion` are hardcoded in the trace JSON files (each error frame includes them directly).

---

## Supported Languages at Launch

| Language | Mode | Notes |
|---|---|---|
| JavaScript | Real (Acorn AST, sandboxed) | Full variable/stack/heap capture, 1000-step cap |
| Python | Real (Pyodide WASM, Web Worker) | Full trace via sys.settrace, 1000-line-event cap |
| Java | Simulated | Pre-baked JSON traces in `src/traces/java/` |
| C | Simulated | Pre-baked JSON traces in `src/traces/c/` |
| C++ | Simulated | Pre-baked JSON traces in `src/traces/cpp/` |
| Pseudocode | Simulated | Pre-baked JSON traces in `src/traces/pseudocode/` |

---

## Sample Snippets (per language, 5 per language)

1. Hello World / basic output
2. Variables and types
3. Loops (for/while)
4. Functions and recursion (Fibonacci)
5. Error example (broken code — e.g., undefined variable, off-by-one)

---

## Styling & Theme

- **Base:** VSCode Dark+ (`#1e1e1e` bg, `#252526` panels, `#2d2d2d` borders)
- **Accent:** Blue `#007acc`, Purple `#c586c0`, Teal `#4ec9b0`, Red `#f44747`, Yellow `#dcdcaa`
- **Typography:**
  - Code: `JetBrains Mono` — loaded via `@fontsource/jetbrains-mono` (npm, bundled locally — no Google Fonts network dependency)
  - UI: `Inter` — loaded via `@fontsource/inter` (npm, bundled locally)
  - Fallback stack: `'JetBrains Mono', 'Fira Code', 'Consolas', monospace`
- **Animations:** Framer Motion — panel transitions, variable flash, step highlight slide
- **Panels:** 1px borders, 8px radius on cards

---

## Performance

- **Hard cap:** 1000 frames per execution run. Prevents memory and render issues.
- **Memoization:** All panel components are `React.memo`. They re-render only on `currentStep` change.
- **Timeline rendering:** Authoritative approach — single `<canvas>` for color-coded segments, `<input type="range">` overlaid for scrubbing (see Features → Execution timeline).
- **Pyodide:** Loaded once, cached in Web Worker. Subsequent Python runs reuse the loaded instance.
- **Large traces:** If frame count approaches 1000, a subtle "Large trace — performance may be reduced" warning is shown.

---

## GitHub Pages Deployment

**vite.config.ts:**
```ts
export default defineConfig({
  base: '/sin/', // repository name
  plugins: [react()],
})
```

**package.json scripts:**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```

**GitHub Actions** (`.github/workflows/deploy.yml`) — auto-deploy on push to `main`:
```yaml
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci && npm run build
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

---

## Data Flow

```
User types code → CodeEditor updates store.code
User clicks Run → ExecutionEngine.run(code, language)
  → JS: Acorn parse → JSInterpreter walk → ExecutionFrame[]
  → Python: postMessage to Pyodide worker → ExecutionFrame[] via message reply
  → Simulated: fetch src/traces/<lang>/<snippet>.json → ExecutionFrame[]
  → store.setFrames(frames), store.setCurrentStep(0)

ControlBar Play/Step → store.setCurrentStep(n)
  → CodeEditor: highlight frame[n].line
  → VariablesPanel: render frame[n].variables (memo)
  → CallStackPanel: render frame[n].callStack (memo)
  → MemoryPanel: render frame[n].heap (memo)
  → OutputConsole: render frame[n].output (memo)
  → TimerBadge: render store.elapsedMs
  → ExecutionTimeline: scrubber at step n
```

---

## Error Handling (Edge Cases)

| Scenario | Behavior |
|---|---|
| Empty code | "Write some code to get started" empty state, Run button disabled |
| Parse error (JS/Python) | Frame 0 contains `error` with explanation, no execution steps |
| Runtime error mid-execution | Frames generated up to error point, final frame has `error != null` |
| Infinite loop (JS) | Halted at 1000 steps, `InfiniteLoopError` frame inserted |
| Pyodide load failure | Toast: "Python WASM unavailable. Using simulated mode." |
| Max frames exceeded | Warning badge + truncated trace |
| Code edited after run | Run button re-activates, previous frames shown with "Stale — click Run" banner |

---

## Testing Strategy

- **Unit (Vitest):** `ExecutionEngine` — correct frame count, variable capture, error detection for JS; Pyodide worker message protocol (mocked worker)
- **Component (React Testing Library):** `VariablesPanel`, `CallStackPanel` with fixture `ExecutionFrame[]` data
- **Smoke (Playwright):** Run each JS sample snippet, assert step count > 0, assert no console errors
- **Manual QA checklist:** All 5 snippets × 6 languages verified before release
