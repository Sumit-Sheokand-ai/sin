# Code Execution Visualizer — Design Spec
**Date:** 2026-03-25
**Stack:** React + Vite, hosted on GitHub Pages

---

## Overview

A premium educational web app that visualizes how code runs behind the scenes. Users choose a programming language, write or paste code, and watch execution step by step. The app explains variable changes, memory behavior, call stack updates, control flow, loops, functions, recursion, output, and errors. It handles broken code by showing valid execution up to the point of failure, then explains the error clearly in plain English.

The interface is strongly inspired by Visual Studio Code: dark theme, minimal layout, professional typography, subtle borders, calm color accents, and a developer-tool feel.

---

## Layout

Four-zone VSCode-inspired layout:

```
┌─────────┬──────────────────┬──────────────────┐
│ Sidebar │   Code Editor    │  Variables/Stack  │
│ Lang    │  (Monaco/CM)     │  Memory Panel     │
│ Select  │  + Breakpoints   │  Call Stack       │
│ Examples│                  │  Watch Panel      │
├─────────┴──────────────────┴──────────────────┤
│  Output Console │ Error Explanation │ Timeline  │
│                                    │    ⏱ 0.03s│
└────────────────────────────────────────────────┘
```

- **Left sidebar** — language selector dropdown, sample code snippets organized by language
- **Center** — Monaco Editor with breakpoint gutter (click line numbers to set breakpoints), highlighted current execution line
- **Right panel** — tabbed: Variables/Watch, Call Stack, Memory Visualization
- **Bottom panel** — tabbed: Output Console, Error Explanation; execution timeline scrubber; small timer badge bottom-right

---

## Components

| Component | Responsibility |
|---|---|
| `App` | Layout shell, global state, theme |
| `Sidebar` | Language picker, sample snippet list |
| `CodeEditor` | Monaco Editor wrapper, breakpoint gutter, line highlight |
| `ExecutionEngine` | AST-based stepper, produces execution frames |
| `VariablesPanel` | Live variable state with diff highlights per step |
| `CallStackPanel` | Function frame list, active frame highlighted |
| `MemoryPanel` | Heap/stack visual block diagram |
| `OutputConsole` | Captured stdout/stderr per step |
| `ErrorExplainer` | Plain-English breakdown of errors with suggestions |
| `ExecutionTimeline` | Scrubable step history with step counter |
| `TimerBadge` | Small bottom-right elapsed execution time |
| `ControlBar` | Play, Pause, Step Forward, Step Back, Reset, Speed controls |

---

## Execution Engine

### JavaScript (real execution)
- Parse code with **Acorn** (AST parser)
- Walk AST with a custom sandboxed interpreter
- Capture variable scope, call stack, and output at each node evaluation
- Produce an ordered array of `ExecutionFrame` objects

### Python (real execution)
- Run via **Pyodide** (CPython compiled to WASM)
- Intercept `sys.settrace` to capture frames
- Stream frames back to the UI

### Java, C, C++, Pseudocode (simulated/demo mode)
- Pre-baked execution traces for each sample snippet
- Custom trace format allows community-contributed traces
- Clear "simulated" badge shown in UI so users understand the distinction

### ExecutionFrame shape
```ts
interface ExecutionFrame {
  step: number;
  line: number;
  variables: Record<string, { value: unknown; type: string; changed: boolean }>;
  callStack: Array<{ name: string; line: number; args: Record<string, unknown> }>;
  heap: Array<{ id: string; label: string; value: unknown; type: string }>;
  output: string[];
  error: ExecutionError | null;
}

interface ExecutionError {
  type: string;         // e.g. "ReferenceError"
  message: string;      // raw message
  explanation: string;  // plain-English explanation
  suggestion: string;   // what to fix
  line: number;
}
```

---

## Features

### Step-by-step execution
- Play/Pause auto-steps at configurable speed (0.5x – 4x)
- Step Forward / Step Back buttons
- Keyboard shortcuts: Space (play/pause), → (step forward), ← (step back), R (reset)

### Breakpoints
- Click line number gutter in editor to toggle breakpoints
- "Play to breakpoint" runs until next breakpoint then pauses
- Breakpoints persist across resets

### Execution timeline
- Horizontal scrubber showing all steps
- Click any point to jump to that frame
- Color-coded segments: normal (blue), function call (purple), loop iteration (teal), error (red)

### Variable watch
- All in-scope variables shown with current value and type
- Changed variables flash/highlight on each step
- Supports primitives, arrays, objects, null/undefined

### Call stack panel
- Each stack frame shown as a card with function name, line number, and arguments
- Active frame highlighted
- Shows recursion depth visually

### Memory visualization
- Stack frames as stacked blocks
- Heap objects as nodes with reference arrows
- Simplified for beginners, accurate for primitives and references

### Output console
- Shows printed output line by line as execution progresses
- Color-codes: stdout (white), stderr (red), system messages (gray)

### Error handling
- Execution runs as far as possible before the error
- Error frame shown with red line highlight in editor
- Error Explainer panel shows: error type, plain-English explanation, suggestion for fix
- "What went wrong" panel visible even for partial runs

### Timer badge
- Small badge bottom-right corner
- Shows total elapsed real time for the execution trace
- Format: `⏱ 0.032s` — kept minimal, no border, muted color

---

## Supported Languages at Launch

| Language | Mode | Notes |
|---|---|---|
| JavaScript | Real (Acorn AST) | Full variable/stack/heap capture |
| Python | Real (Pyodide WASM) | Full trace via sys.settrace |
| Java | Simulated | Pre-baked sample traces |
| C | Simulated | Pre-baked sample traces |
| C++ | Simulated | Pre-baked sample traces |
| Pseudocode | Simulated | Pre-baked sample traces |

---

## Sample Snippets (per language)

Each language includes 4–6 sample snippets covering:
- Hello World / basic output
- Variables and types
- Loops (for, while)
- Functions and recursion
- Error example (broken code)
- Data structures (arrays/objects)

---

## Styling & Theme

- **Base:** VSCode Dark+ color scheme (`#1e1e1e` background, `#252526` panels, `#2d2d2d` borders)
- **Accent:** Blue (`#007acc`), Purple (`#c586c0`), Teal (`#4ec9b0`), Red (`#f44747`)
- **Typography:** `JetBrains Mono` for code, `Inter` for UI text
- **Animations:** Framer Motion — smooth panel transitions, variable flash on change, step highlight slide
- **Panels:** Subtle 1px borders, no harsh shadows, consistent 8px radius on cards

---

## GitHub Pages Deployment

- `vite.config.js`: `base` set to `/<repo-name>/`
- `package.json` scripts:
  - `npm run build` — production build
  - `npm run deploy` — builds and pushes to `gh-pages` branch via `gh-pages` package
- GitHub Actions workflow (`.github/workflows/deploy.yml`) for automatic deploy on push to `main`

---

## Data Flow

```
User types code
    → CodeEditor updates state
    → ExecutionEngine.parse(code, language)
    → produces ExecutionFrame[]
    → stored in executionStore

User clicks Play / Step
    → currentStep increments
    → all panels subscribe to executionStore[currentStep]
    → VariablesPanel, CallStackPanel, MemoryPanel, OutputConsole all re-render
    → CodeEditor highlights currentStep.line
    → TimerBadge shows elapsed time
```

---

## Error Handling

- Malformed code: execution engine catches parse errors, maps to frame 0 with error state
- Runtime errors: execution runs to error point, produces final error frame
- Pyodide load failure: falls back to simulated Python mode with a toast notification
- Empty code: "Write some code to get started" empty state

---

## Testing Strategy

- Unit tests on `ExecutionEngine` for correct frame generation (Vitest)
- Component tests for `VariablesPanel`, `CallStackPanel` with mock frames (React Testing Library)
- E2E: manual verification of sample snippets in all languages
