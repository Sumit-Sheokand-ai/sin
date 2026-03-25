{% raw %}

# Code Execution Visualizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a premium VSCode-inspired web app that visualizes code execution step-by-step with variable, call stack, memory, and output panels.

**Architecture:** React + Vite SPA with a Zustand store holding `ExecutionFrame[]`. A custom Acorn-based JS interpreter and a Pyodide Web Worker produce frames; Java/C/C++/Pseudocode use pre-baked JSON traces. All panels are memo-ized subscribers to `currentStep`.

**Tech Stack:** React 18, TypeScript, Vite, Zustand, CodeMirror 6, Acorn, Pyodide, Framer Motion, @fontsource/inter, @fontsource/jetbrains-mono, Vitest, gh-pages

---

## File Map

```
sin/
├── .github/workflows/deploy.yml       # Auto-deploy to GitHub Pages
├── public/                            # Static assets
├── src/
│   ├── main.tsx                       # React root mount
│   ├── App.tsx                        # 4-zone layout shell + desktop guard
│   ├── index.css                      # CSS variables (VSCode Dark+ theme) + resets
│   ├── types/
│   │   └── execution.ts               # ExecutionFrame, HeapNode, ExecutionError, Language
│   ├── store/
│   │   └── executionStore.ts          # Zustand store (all shared state)
│   ├── engine/
│   │   ├── index.ts                   # run(code, language) dispatcher
│   │   ├── jsInterpreter.ts           # Acorn AST walker → ExecutionFrame[]
│   │   ├── errorExplanations.ts       # Error type → { explanation, suggestion }
│   │   ├── traceLoader.ts             # Load + post-process simulated JSON traces
│   │   └── pyodide.worker.ts          # Web Worker: Pyodide Python execution
│   ├── data/
│   │   └── snippets.ts                # Sample code strings per language (5 each)
│   ├── components/
│   │   ├── Sidebar.tsx                # Language picker + snippet list
│   │   ├── CodeEditor.tsx             # CodeMirror 6 + breakpoint gutter
│   │   ├── ControlBar.tsx             # Play/Pause/Step/Reset/Speed + keyboard shortcuts
│   │   ├── VariablesPanel.tsx         # Variable table with change-flash
│   │   ├── CallStackPanel.tsx         # Stack frame cards
│   │   ├── MemoryPanel.tsx            # Stack blocks + heap cards + SVG arrows
│   │   ├── OutputConsole.tsx          # stdout/stderr display
│   │   ├── ErrorExplainer.tsx         # Plain-English error breakdown
│   │   ├── ExecutionTimeline.tsx      # Canvas segment bar + range scrubber
│   │   └── TimerBadge.tsx             # ⏱ elapsed time badge
├── public/
│   └── traces/                        # Pre-baked simulated traces (served as static assets)
│       ├── java/   (hello-world, variables, loops, recursion, error).json
│       ├── c/      (same 5)
│       ├── cpp/    (same 5)
│       └── pseudocode/ (same 5)
├── tests/
│   ├── engine/
│   │   ├── jsInterpreter.test.ts
│   │   └── errorExplanations.test.ts
│   └── components/
│       ├── VariablesPanel.test.tsx
│       └── CallStackPanel.test.tsx
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `vitest.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`

- [ ] **Step 1: Scaffold Vite + React + TypeScript project**

```bash
cd D:/sumit14/sem_4/my_github/github_projects/sin
npm create vite@latest . -- --template react-ts
```
Answer prompts: select `React`, then `TypeScript`. When asked about existing files, select to ignore/overwrite.

- [ ] **Step 2: Install all dependencies**

```bash
npm install zustand acorn framer-motion codemirror @codemirror/view @codemirror/state @codemirror/lang-javascript @codemirror/lang-python @codemirror/lang-java @codemirror/lang-cpp @codemirror/theme-one-dark @codemirror/commands @codemirror/search @fontsource/inter @fontsource/jetbrains-mono
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event gh-pages
```

> **Note on TypeScript:** The default Vite template sets `"moduleResolution": "bundler"` in `tsconfig.json`. Verify this is present — it is required for Acorn and CodeMirror imports to resolve correctly. If it says `"node"` instead, change it to `"bundler"`.

- [ ] **Step 3: Configure vite.config.ts**

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/sin/',
  plugins: [react()],
})
```

- [ ] **Step 4: Configure vitest.config.ts**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
})
```

- [ ] **Step 5: Create test setup file**

```ts
// tests/setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Update package.json scripts**

Add to the `scripts` section:
```json
"test": "vitest",
"test:ui": "vitest --ui",
"deploy": "npm run build && gh-pages -d dist"
```

- [ ] **Step 7: Replace index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Code Visualizer</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Verify dev server starts**

```bash
npm run dev
```
Expected: Vite dev server running at `http://localhost:5173/sin/`

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + React + TypeScript project"
```

---

## Task 2: Types + Zustand Store

**Files:**
- Create: `src/types/execution.ts`, `src/store/executionStore.ts`

- [ ] **Step 1: Create types**

```ts
// src/types/execution.ts
export type Language = 'javascript' | 'python' | 'java' | 'c' | 'cpp' | 'pseudocode'

export type FrameType = 'normal' | 'call' | 'return' | 'loop' | 'error'

export interface HeapNode {
  id: string
  label: string
  value: unknown
  type: string
  references: string[]
}

export interface ExecutionError {
  type: string
  message: string
  explanation: string
  suggestion: string
  line: number
}

export interface ExecutionFrame {
  step: number
  line: number
  type: FrameType
  isBreakpoint: boolean
  variables: Record<string, { value: unknown; type: string; changed: boolean }>
  callStack: Array<{ name: string; line: number; args: Record<string, unknown> }>
  heap: HeapNode[]
  output: string[]
  error: ExecutionError | null
}
```

- [ ] **Step 2: Create Zustand store**

```ts
// src/store/executionStore.ts
import { create } from 'zustand'
import type { ExecutionFrame, Language } from '../types/execution'

type Status = 'idle' | 'running' | 'paused' | 'error' | 'loading'

interface ExecutionStore {
  code: string
  language: Language
  setCode: (code: string) => void
  setLanguage: (lang: Language) => void

  frames: ExecutionFrame[]
  currentStep: number
  setFrames: (frames: ExecutionFrame[]) => void
  setCurrentStep: (step: number) => void

  breakpoints: number[]
  toggleBreakpoint: (line: number) => void

  isPlaying: boolean
  speed: number
  setPlaying: (v: boolean) => void
  setSpeed: (v: number) => void

  status: Status
  setStatus: (s: Status) => void
  elapsedMs: number
  setElapsedMs: (ms: number) => void

  stale: boolean
  setStale: (v: boolean) => void
}

export const useExecutionStore = create<ExecutionStore>((set, get) => ({
  code: '',
  language: 'javascript',
  setCode: (code) => set({ code, stale: get().frames.length > 0 }),
  setLanguage: (language) => set({ language }),

  frames: [],
  currentStep: 0,
  setFrames: (frames) => set({ frames, currentStep: 0, stale: false }),
  setCurrentStep: (currentStep) => set({ currentStep }),

  breakpoints: [],
  toggleBreakpoint: (line) =>
    set((s) => ({
      breakpoints: s.breakpoints.includes(line)
        ? s.breakpoints.filter((l) => l !== line)
        : [...s.breakpoints, line],
    })),

  isPlaying: false,
  speed: 1,
  setPlaying: (isPlaying) => set({ isPlaying }),
  setSpeed: (speed) => set({ speed }),

  status: 'idle',
  setStatus: (status) => set({ status }),
  elapsedMs: 0,
  setElapsedMs: (elapsedMs) => set({ elapsedMs }),

  stale: false,
  setStale: (stale) => set({ stale }),
}))
```

- [ ] **Step 3: Commit**

```bash
git add src/types/ src/store/
git commit -m "feat: add ExecutionFrame types and Zustand store"
```

---

## Task 3: Theme + App Layout Shell

**Files:**
- Modify: `src/index.css`, `src/main.tsx`, `src/App.tsx`

- [ ] **Step 1: Write global CSS with VSCode Dark+ theme variables**

```css
/* src/index.css */
@import '@fontsource/inter/400.css';
@import '@fontsource/inter/500.css';
@import '@fontsource/inter/600.css';
@import '@fontsource/jetbrains-mono/400.css';
@import '@fontsource/jetbrains-mono/500.css';

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:        #1e1e1e;
  --bg-panel:  #252526;
  --bg-hover:  #2a2d2e;
  --border:    #2d2d2d;
  --border-active: #3e3e3e;
  --text:      #cccccc;
  --text-dim:  #6a6a6a;
  --text-hint: #858585;
  --blue:      #007acc;
  --purple:    #c586c0;
  --teal:      #4ec9b0;
  --red:       #f44747;
  --yellow:    #dcdcaa;
  --green:     #6a9955;
  --font-ui:   'Inter', system-ui, sans-serif;
  --font-code: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  --radius:    8px;
  --radius-sm: 4px;
}

html, body, #root { height: 100%; background: var(--bg); color: var(--text); font-family: var(--font-ui); }

/* Scrollbars */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-active); border-radius: 3px; }
```

- [ ] **Step 2: Write App.tsx with 4-zone layout**

```tsx
// src/App.tsx
import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import CodeEditor from './components/CodeEditor'
import ControlBar from './components/ControlBar'
import VariablesPanel from './components/VariablesPanel'
import CallStackPanel from './components/CallStackPanel'
import MemoryPanel from './components/MemoryPanel'
import OutputConsole from './components/OutputConsole'
import ErrorExplainer from './components/ErrorExplainer'
import ExecutionTimeline from './components/ExecutionTimeline'
import TimerBadge from './components/TimerBadge'
import './index.css'

const TABS_RIGHT = ['Variables', 'Call Stack', 'Memory'] as const
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
    <div style={{ display:'grid', gridTemplateColumns:'220px 1fr 280px', gridTemplateRows:'1fr 220px', height:'100vh', overflow:'hidden', gap:'1px', background:'var(--border)' }}>
      {/* Sidebar */}
      <div style={{ background:'var(--bg-panel)', overflow:'auto', gridRow:'1/2' }}>
        <Sidebar />
      </div>

      {/* Center: editor + controlbar */}
      <div style={{ background:'var(--bg)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <ControlBar />
        <div style={{ flex:1, overflow:'hidden' }}>
          <CodeEditor />
        </div>
      </div>

      {/* Right panel */}
      <div style={{ background:'var(--bg-panel)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ display:'flex', borderBottom:'1px solid var(--border)' }}>
          {TABS_RIGHT.map(t => (
            <button key={t} onClick={() => setRightTab(t)} style={{
              flex:1, padding:'8px 4px', background:'none', border:'none', color: rightTab===t ? 'var(--blue)' : 'var(--text-dim)',
              fontFamily:'var(--font-ui)', fontSize:'11px', cursor:'pointer', borderBottom: rightTab===t ? '2px solid var(--blue)' : '2px solid transparent'
            }}>{t}</button>
          ))}
        </div>
        <div style={{ flex:1, overflow:'auto', padding:'8px' }}>
          {rightTab === 'Variables' && <VariablesPanel />}
          {rightTab === 'Call Stack' && <CallStackPanel />}
          {rightTab === 'Memory' && <MemoryPanel />}
        </div>
      </div>

      {/* Bottom panel — spans all 3 columns */}
      <div style={{ gridColumn:'1/4', background:'var(--bg-panel)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', borderBottom:'1px solid var(--border)', padding:'0 8px' }}>
          {TABS_BOTTOM.map(t => (
            <button key={t} onClick={() => setBottomTab(t)} style={{
              padding:'6px 12px', background:'none', border:'none', color: bottomTab===t ? 'var(--blue)' : 'var(--text-dim)',
              fontFamily:'var(--font-ui)', fontSize:'11px', cursor:'pointer', borderBottom: bottomTab===t ? '2px solid var(--blue)' : '2px solid transparent'
            }}>{t}</button>
          ))}
          <div style={{ flex:1 }} />
          <ExecutionTimeline />
          <TimerBadge />
        </div>
        <div style={{ flex:1, overflow:'auto', padding:'8px' }}>
          {bottomTab === 'Output' && <OutputConsole />}
          {bottomTab === 'Error' && <ErrorExplainer />}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update main.tsx**

```tsx
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 4: Create all component stubs** (so App.tsx compiles)

Create each file with a placeholder export:

```tsx
// src/components/Sidebar.tsx
export default function Sidebar() { return <div style={{padding:'8px',color:'var(--text-dim)',fontSize:'12px'}}>Sidebar</div> }
```

Repeat for: `CodeEditor`, `ControlBar`, `VariablesPanel`, `CallStackPanel`, `MemoryPanel`, `OutputConsole`, `ErrorExplainer`, `ExecutionTimeline`, `TimerBadge` — each returning a minimal `<div>` with the component name.

- [ ] **Step 5: Verify app renders without errors**

```bash
npm run dev
```
Expected: 4-zone layout visible, all panels show stub text, no console errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add theme CSS variables and App 4-zone layout shell"
```

---

## Task 4: Sidebar Component

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Create: `src/data/snippets.ts`

- [ ] **Step 1: Create snippet data**

```ts
// src/data/snippets.ts
import type { Language } from '../types/execution'

export interface Snippet { label: string; code: string }

export const SNIPPETS: Record<Language, Snippet[]> = {
  javascript: [
    { label: 'Hello World', code: `console.log("Hello, World!");` },
    { label: 'Variables', code: `let x = 10;\nlet y = 20;\nlet sum = x + y;\nconsole.log(sum);` },
    { label: 'Loop', code: `for (let i = 0; i < 5; i++) {\n  console.log(i);\n}` },
    { label: 'Recursion', code: `function fib(n) {\n  if (n <= 1) return n;\n  return fib(n - 1) + fib(n - 2);\n}\nconsole.log(fib(5));` },
    { label: 'Error', code: `let x = 10;\nconsole.log(y);` },
  ],
  python: [
    { label: 'Hello World', code: `print("Hello, World!")` },
    { label: 'Variables', code: `x = 10\ny = 20\nsum = x + y\nprint(sum)` },
    { label: 'Loop', code: `for i in range(5):\n    print(i)` },
    { label: 'Recursion', code: `def fib(n):\n    if n <= 1:\n        return n\n    return fib(n-1) + fib(n-2)\nprint(fib(5))` },
    { label: 'Error', code: `x = 10\nprint(y)` },
  ],
  java: [
    { label: 'Hello World', code: `public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, World!");\n  }\n}` },
    { label: 'Variables', code: `public class Main {\n  public static void main(String[] args) {\n    int x = 10;\n    int y = 20;\n    int sum = x + y;\n    System.out.println(sum);\n  }\n}` },
    { label: 'Loop', code: `public class Main {\n  public static void main(String[] args) {\n    for (int i = 0; i < 5; i++) {\n      System.out.println(i);\n    }\n  }\n}` },
    { label: 'Recursion', code: `public class Main {\n  static int fib(int n) {\n    if (n <= 1) return n;\n    return fib(n-1) + fib(n-2);\n  }\n  public static void main(String[] args) {\n    System.out.println(fib(5));\n  }\n}` },
    { label: 'Error', code: `public class Main {\n  public static void main(String[] args) {\n    int x = 10;\n    System.out.println(y);\n  }\n}` },
  ],
  c: [
    { label: 'Hello World', code: `#include <stdio.h>\nint main() {\n  printf("Hello, World!\\n");\n  return 0;\n}` },
    { label: 'Variables', code: `#include <stdio.h>\nint main() {\n  int x = 10;\n  int y = 20;\n  int sum = x + y;\n  printf("%d\\n", sum);\n  return 0;\n}` },
    { label: 'Loop', code: `#include <stdio.h>\nint main() {\n  for (int i = 0; i < 5; i++) {\n    printf("%d\\n", i);\n  }\n  return 0;\n}` },
    { label: 'Recursion', code: `#include <stdio.h>\nint fib(int n) {\n  if (n <= 1) return n;\n  return fib(n-1) + fib(n-2);\n}\nint main() {\n  printf("%d\\n", fib(5));\n  return 0;\n}` },
    { label: 'Error', code: `#include <stdio.h>\nint main() {\n  int x = 10;\n  printf("%d\\n", y);\n  return 0;\n}` },
  ],
  cpp: [
    { label: 'Hello World', code: `#include <iostream>\nint main() {\n  std::cout << "Hello, World!" << std::endl;\n  return 0;\n}` },
    { label: 'Variables', code: `#include <iostream>\nint main() {\n  int x = 10;\n  int y = 20;\n  int sum = x + y;\n  std::cout << sum << std::endl;\n  return 0;\n}` },
    { label: 'Loop', code: `#include <iostream>\nint main() {\n  for (int i = 0; i < 5; i++) {\n    std::cout << i << std::endl;\n  }\n  return 0;\n}` },
    { label: 'Recursion', code: `#include <iostream>\nint fib(int n) {\n  if (n <= 1) return n;\n  return fib(n-1) + fib(n-2);\n}\nint main() {\n  std::cout << fib(5) << std::endl;\n  return 0;\n}` },
    { label: 'Error', code: `#include <iostream>\nint main() {\n  int x = 10;\n  std::cout << y << std::endl;\n  return 0;\n}` },
  ],
  pseudocode: [
    { label: 'Hello World', code: `PRINT "Hello, World!"` },
    { label: 'Variables', code: `SET x = 10\nSET y = 20\nSET sum = x + y\nPRINT sum` },
    { label: 'Loop', code: `FOR i FROM 0 TO 4:\n  PRINT i` },
    { label: 'Recursion', code: `FUNCTION fib(n):\n  IF n <= 1: RETURN n\n  RETURN fib(n-1) + fib(n-2)\nPRINT fib(5)` },
    { label: 'Error', code: `SET x = 10\nPRINT y` },
  ],
}

export const LANGUAGE_LABELS: Record<Language, string> = {
  javascript: 'JavaScript',
  python: 'Python',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
  pseudocode: 'Pseudocode',
}
```

- [ ] **Step 2: Build Sidebar component**

```tsx
// src/components/Sidebar.tsx
import { useExecutionStore } from '../store/executionStore'
import { SNIPPETS, LANGUAGE_LABELS } from '../data/snippets'
import type { Language } from '../types/execution'

const LANGUAGES: Language[] = ['javascript', 'python', 'java', 'c', 'cpp', 'pseudocode']

export default function Sidebar() {
  const { language, setLanguage, setCode } = useExecutionStore()

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'12px 10px 8px', borderBottom:'1px solid var(--border)' }}>
        <div style={{ fontSize:'10px', color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'6px' }}>Language</div>
        <select
          value={language}
          onChange={e => setLanguage(e.target.value as Language)}
          style={{ width:'100%', background:'var(--bg)', color:'var(--text)', border:'1px solid var(--border-active)', borderRadius:'var(--radius-sm)', padding:'5px 8px', fontFamily:'var(--font-ui)', fontSize:'12px', cursor:'pointer', outline:'none' }}
        >
          {LANGUAGES.map(l => <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>)}
        </select>
      </div>

      <div style={{ padding:'8px 10px 4px' }}>
        <div style={{ fontSize:'10px', color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Examples</div>
      </div>

      <div style={{ flex:1, overflow:'auto' }}>
        {SNIPPETS[language].map((s, i) => (
          <button
            key={i}
            onClick={() => setCode(s.code)}
            style={{
              display:'block', width:'100%', textAlign:'left', padding:'7px 10px',
              background:'none', border:'none', borderBottom:'1px solid var(--border)',
              color:'var(--text)', fontFamily:'var(--font-ui)', fontSize:'12px',
              cursor:'pointer', transition:'background 0.15s'
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify sidebar renders language dropdown and snippet list**

```bash
npm run dev
```
Expected: Left sidebar shows "Language" dropdown with 6 options; clicking a snippet name does not crash.

- [ ] **Step 4: Commit**

```bash
git add src/components/Sidebar.tsx src/data/snippets.ts
git commit -m "feat: add Sidebar with language selector and sample snippets"
```

---

## Task 5: CodeEditor Component

**Files:**
- Modify: `src/components/CodeEditor.tsx`

- [ ] **Step 1: Build CodeMirror 6 editor with breakpoint gutter and line highlight**

```tsx
// src/components/CodeEditor.tsx
import { useEffect, useRef, useCallback } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState, StateField, StateEffect, RangeSetBuilder } from '@codemirror/state'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { java } from '@codemirror/lang-java'
import { cpp } from '@codemirror/lang-cpp'
import { oneDark } from '@codemirror/theme-one-dark'
import { GutterMarker, gutter, lineNumbers, Decoration, DecorationSet } from '@codemirror/view'
import { useExecutionStore } from '../store/executionStore'
import type { Language } from '../types/execution'

// --- Breakpoint gutter ---
const breakpointEffect = StateEffect.define<{ pos: number; on: boolean }>()
const breakpointState = StateField.define<Set<number>>({
  create: () => new Set(),
  update(bp, tr) {
    bp = new Set(bp)
    for (const e of tr.effects) {
      if (e.is(breakpointEffect)) {
        if (e.value.on) bp.add(e.value.pos)
        else bp.delete(e.value.pos)
      }
    }
    return bp
  },
})

class BpMarker extends GutterMarker {
  toDOM() {
    const d = document.createElement('div')
    d.style.cssText = 'width:8px;height:8px;border-radius:50%;background:#f44747;margin:0 auto;cursor:pointer'
    return d
  }
}
const bpMarker = new BpMarker()

function getLanguageExtension(lang: Language) {
  if (lang === 'javascript') return javascript()
  if (lang === 'python') return python()
  if (lang === 'java') return java()
  if (lang === 'cpp' || lang === 'c') return cpp()
  return javascript() // pseudocode fallback
}

// --- Active line highlight effect + field ---
const setActiveLineEffect = StateEffect.define<number>()

const activeLineField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes)
    for (const e of tr.effects) {
      if (e.is(setActiveLineEffect)) {
        try {
          const line = tr.state.doc.line(e.value)
          deco = Decoration.set([
            Decoration.line({ class: 'cm-active-exec-line' }).range(line.from),
          ])
        } catch {
          deco = Decoration.none
        }
      }
    }
    return deco
  },
  provide: (f) => EditorView.decorations.from(f),
})

export default function CodeEditor() {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const { code, setCode, language, toggleBreakpoint, frames, currentStep, stale } = useExecutionStore()

  const initEditor = useCallback(() => {
    if (viewRef.current) viewRef.current.destroy()
    const state = EditorState.create({
      doc: code,
      extensions: [
        basicSetup,
        oneDark,
        getLanguageExtension(language),
        breakpointState,
        activeLineField,
        lineNumbers(),
        gutter({
          class: 'cm-breakpoint-gutter',
          markers: (view) => {
            const bp = view.state.field(breakpointState)
            const builder = new RangeSetBuilder<GutterMarker>()
            for (const { from, to } of view.visibleRanges) {
              for (let pos = from; pos <= to;) {
                const line = view.state.doc.lineAt(pos)
                if (bp.has(line.number)) builder.add(line.from, line.from, bpMarker)
                pos = line.to + 1
              }
            }
            return builder.finish()
          },
          domEventHandlers: {
            mousedown: (view, line) => {
              const lineNum = view.state.doc.lineAt(line.from).number
              const bp = view.state.field(breakpointState)
              const on = !bp.has(lineNum)
              view.dispatch({ effects: breakpointEffect.of({ pos: lineNum, on }) })
              toggleBreakpoint(lineNum)
              return true
            },
          },
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) setCode(update.state.doc.toString())
        }),
        EditorView.theme({
          '&': { height: '100%', fontSize: '13px' },
          '.cm-scroller': { fontFamily: 'var(--font-code)', overflow: 'auto' },
          '.cm-content': { paddingBottom: '40px' },
          '.cm-active-exec-line': { background: 'rgba(0,122,204,0.15) !important' },
        }),
      ],
    })
    viewRef.current = new EditorView({ state, parent: containerRef.current! })
  }, [language])

  useEffect(() => { initEditor() }, [language])

  // Dispatch active-line highlight effect whenever step changes
  useEffect(() => {
    const view = viewRef.current
    const frame = frames[currentStep]
    if (!view || !frame) return
    view.dispatch({ effects: setActiveLineEffect.of(frame.line) })
  }, [currentStep, frames])

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      {stale && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, background: '#3a2f00', color: 'var(--yellow)', padding: '4px 12px', fontSize: '11px', textAlign: 'center' }}>
          Code changed — click Run to re-execute
        </div>
      )}
      <div ref={containerRef} style={{ height: '100%' }} />
    </div>
  )
}
```

- [ ] **Step 2: Verify editor renders with syntax highlighting**

```bash
npm run dev
```
Expected: Code editor visible with dark theme, syntax-highlighted JS. Clicking line number gutter shows red dot.

- [ ] **Step 3: Commit**

```bash
git add src/components/CodeEditor.tsx
git commit -m "feat: add CodeMirror 6 editor with breakpoint gutter"
```

---

## Task 6: Error Explanations Module

**Files:**
- Create: `src/engine/errorExplanations.ts`
- Create: `tests/engine/errorExplanations.test.ts`

- [ ] **Step 1: Write failing tests first**

```ts
// tests/engine/errorExplanations.test.ts
import { describe, it, expect } from 'vitest'
import { explainError } from '../../src/engine/errorExplanations'

describe('explainError', () => {
  it('explains ReferenceError', () => {
    const r = explainError('ReferenceError', 'y is not defined')
    expect(r.explanation).toContain('variable')
    expect(r.suggestion).toBeTruthy()
  })
  it('explains TypeError', () => {
    const r = explainError('TypeError', 'Cannot read properties of undefined')
    expect(r.explanation).toBeTruthy()
  })
  it('explains SyntaxError', () => {
    const r = explainError('SyntaxError', 'Unexpected token')
    expect(r.explanation).toBeTruthy()
  })
  it('explains InfiniteLoopError', () => {
    const r = explainError('InfiniteLoopError', '')
    expect(r.explanation).toContain('1000')
  })
  it('handles unknown error types gracefully', () => {
    const r = explainError('WeirdError', 'something weird')
    expect(r.explanation).toBeTruthy()
    expect(r.suggestion).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests — expect all to fail**

```bash
npm test -- tests/engine/errorExplanations.test.ts
```
Expected: FAIL — `explainError` not found.

- [ ] **Step 3: Implement errorExplanations.ts**

```ts
// src/engine/errorExplanations.ts
interface Explanation { explanation: string; suggestion: string }

const EXPLANATIONS: Record<string, (msg: string) => Explanation> = {
  ReferenceError: () => ({
    explanation: "You tried to use a variable that hasn't been declared yet.",
    suggestion: "Check spelling and make sure the variable is declared with let, const, or var before this line.",
  }),
  TypeError: (msg) => ({
    explanation: msg.includes('undefined') || msg.includes('null')
      ? "You tried to access a property or call a method on a value that doesn't exist (undefined or null)."
      : "You used a value in a way that doesn't match its type.",
    suggestion: "Check that the variable has been assigned a value before using it, and that you're calling the right method.",
  }),
  SyntaxError: () => ({
    explanation: "Your code has a syntax error — the language couldn't understand it.",
    suggestion: "Check for missing brackets, parentheses, or quotes near the highlighted line.",
  }),
  RangeError: () => ({
    explanation: "A value was outside the expected range (e.g. too large, negative, or stack overflow from deep recursion).",
    suggestion: "Check your loop bounds or recursion base case.",
  }),
  InfiniteLoopError: () => ({
    explanation: "This loop ran more than 1000 steps without finishing. It may be an infinite loop.",
    suggestion: "Check your loop condition — make sure it can eventually become false.",
  }),
  MAX_STEPS_EXCEEDED: () => ({
    explanation: "Execution produced more than 1000 steps. The trace was stopped to protect performance.",
    suggestion: "Try a smaller input, or simplify the code to reduce the number of steps.",
  }),
  NameError: () => ({
    explanation: "You used a name (variable or function) that hasn't been defined.",
    suggestion: "Check spelling and make sure the variable is defined before this line.",
  }),
  AttributeError: () => ({
    explanation: "You tried to access an attribute or method that doesn't exist on this object.",
    suggestion: "Check that you're using the correct attribute name for this type.",
  }),
  IndexError: () => ({
    explanation: "You tried to access an index that is outside the range of the list or array.",
    suggestion: "Check that your index is within bounds (0 to length-1).",
  }),
  ZeroDivisionError: () => ({
    explanation: "You tried to divide a number by zero.",
    suggestion: "Check your divisor — make sure it's never zero before dividing.",
  }),
  ExecutionLimitExceeded: () => ({
    explanation: "Python execution reached the 1000-step limit. The code may contain an infinite loop.",
    suggestion: "Check your loop conditions and recursion base cases.",
  }),
}

export function explainError(type: string, message: string): Explanation {
  const factory = EXPLANATIONS[type]
  if (factory) return factory(message)
  return {
    explanation: `An error occurred: ${type}${message ? ` — ${message}` : ''}.`,
    suggestion: "Check the highlighted line for mistakes.",
  }
}
```

- [ ] **Step 4: Run tests — expect all to pass**

```bash
npm test -- tests/engine/errorExplanations.test.ts
```
Expected: 5/5 PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/errorExplanations.ts tests/engine/errorExplanations.test.ts
git commit -m "feat: add error explanations module with tests"
```

---

## Task 7: JavaScript Interpreter (Core)

**Files:**
- Create: `src/engine/jsInterpreter.ts`
- Create: `tests/engine/jsInterpreter.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/engine/jsInterpreter.test.ts
import { describe, it, expect } from 'vitest'
import { runJS } from '../../src/engine/jsInterpreter'

describe('runJS — variable declarations', () => {
  it('captures let declaration', () => {
    const frames = runJS('let x = 5;', [])
    const last = frames[frames.length - 1]
    expect(last.variables['x'].value).toBe(5)
    expect(last.variables['x'].type).toBe('number')
  })

  it('captures string variable', () => {
    const frames = runJS('let name = "Alice";', [])
    const last = frames[frames.length - 1]
    expect(last.variables['name'].value).toBe('Alice')
  })

  it('captures console.log output', () => {
    const frames = runJS('console.log("hello");', [])
    const last = frames[frames.length - 1]
    expect(last.output).toContain('hello')
  })

  it('marks changed variables', () => {
    const frames = runJS('let x = 1;\nx = 2;', [])
    const changeFrame = frames.find(f => f.variables['x']?.value === 2)
    expect(changeFrame?.variables['x'].changed).toBe(true)
  })
})

describe('runJS — errors', () => {
  it('returns error frame for undefined variable', () => {
    const frames = runJS('console.log(y);', [])
    const errorFrame = frames.find(f => f.error !== null)
    expect(errorFrame).toBeTruthy()
    expect(errorFrame!.error!.type).toBe('ReferenceError')
  })

  it('returns frames up to error point', () => {
    const frames = runJS('let x = 1;\nconsole.log(y);', [])
    expect(frames.length).toBeGreaterThan(1)
    expect(frames[frames.length - 1].error).not.toBeNull()
  })
})

describe('runJS — control flow', () => {
  it('handles if statement', () => {
    const frames = runJS('let x = 5;\nif (x > 3) {\n  let y = 1;\n}', [])
    const last = frames[frames.length - 1]
    expect(last.variables['y']).toBeTruthy()
  })

  it('handles for loop', () => {
    const frames = runJS('for (let i = 0; i < 3; i++) {\n  console.log(i);\n}', [])
    expect(frames.some(f => f.type === 'loop')).toBe(true)
  })
})

describe('runJS — functions', () => {
  it('tracks call stack on function call', () => {
    const frames = runJS('function add(a, b) { return a + b; }\nadd(1, 2);', [])
    const callFrame = frames.find(f => f.callStack.length > 1)
    expect(callFrame).toBeTruthy()
    expect(callFrame!.type).toBe('call')
  })
})

describe('runJS — infinite loop protection', () => {
  it('halts after 1000 steps', () => {
    const frames = runJS('while(true) {}', [])
    expect(frames.length).toBeLessThanOrEqual(1001)
    const last = frames[frames.length - 1]
    expect(last.error?.type).toBe('InfiniteLoopError')
  })
})
```

- [ ] **Step 2: Run tests — expect all to fail**

```bash
npm test -- tests/engine/jsInterpreter.test.ts
```
Expected: FAIL — `runJS` not found.

- [ ] **Step 3: Implement jsInterpreter.ts**

```ts
// src/engine/jsInterpreter.ts
import * as acorn from 'acorn'
import type { ExecutionFrame, ExecutionError, HeapNode, FrameType } from '../types/execution'
import { explainError } from './errorExplanations'

const MAX_STEPS = 1000
const BLOCKED = new Set(['eval','Function','setTimeout','setInterval','fetch','XMLHttpRequest','WebSocket'])

type Value = unknown
type Scope = Map<string, Value>

interface InterpreterState {
  frames: ExecutionFrame[]
  scopes: Scope[]
  callStack: Array<{ name: string; line: number; args: Record<string, Value> }>
  output: string[]
  heap: HeapNode[]
  heapCounter: number
  stepCount: number
  breakpoints: number[]
}

function makeFrame(
  state: InterpreterState,
  step: number,
  line: number,
  type: FrameType,
  prevVars: Record<string, { value: Value; type: string; changed: boolean }> = {}
): ExecutionFrame {
  const variables: ExecutionFrame['variables'] = {}
  for (const scope of state.scopes) {
    for (const [k, v] of scope) {
      const t = Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v
      const changed = prevVars[k] !== undefined && prevVars[k].value !== v
      variables[k] = { value: v, type: t, changed }
    }
  }
  return {
    step, line, type,
    isBreakpoint: state.breakpoints.includes(line),
    variables,
    callStack: [...state.callStack],
    heap: [...state.heap],
    output: [...state.output],
    error: null,
  }
}

function getLine(node: acorn.Node): number {
  return (node as any).loc?.start?.line ?? 0
}

class JSInterpreter {
  private state: InterpreterState
  private ast: acorn.Program

  constructor(code: string, breakpoints: number[]) {
    this.ast = acorn.parse(code, { ecmaVersion: 'latest', locations: true }) as acorn.Program
    this.state = {
      frames: [],
      scopes: [new Map()],
      callStack: [{ name: '(main)', line: 1, args: {} }],
      output: [],
      heap: [],
      heapCounter: 0,
      stepCount: 0,
      breakpoints,
    }
  }

  private push(frame: ExecutionFrame) {
    this.state.frames.push(frame)
    this.state.stepCount++
    if (this.state.stepCount > MAX_STEPS) throw { type: 'InfiniteLoopError', line: frame.line }
    if (this.state.frames.length > MAX_STEPS) throw { type: 'MAX_STEPS_EXCEEDED', line: frame.line }
  }

  private resolve(name: string): Value {
    for (let i = this.state.scopes.length - 1; i >= 0; i--) {
      if (this.state.scopes[i].has(name)) return this.state.scopes[i].get(name)
    }
    throw new ReferenceError(`${name} is not defined`)
  }

  private assign(name: string, value: Value) {
    for (let i = this.state.scopes.length - 1; i >= 0; i--) {
      if (this.state.scopes[i].has(name)) { this.state.scopes[i].set(name, value); return }
    }
    this.state.scopes[this.state.scopes.length - 1].set(name, value)
  }

  private prevVars(): Record<string, { value: Value; type: string; changed: boolean }> {
    return this.state.frames.length > 0
      ? this.state.frames[this.state.frames.length - 1].variables
      : {}
  }

  private evalNode(node: acorn.Node): Value {
    const line = getLine(node)
    const pv = this.prevVars()

    switch (node.type) {
      case 'Program':
        for (const stmt of (node as any).body) this.evalNode(stmt)
        return undefined

      case 'VariableDeclaration':
        for (const decl of (node as any).declarations) {
          const val = decl.init ? this.evalNode(decl.init) : undefined
          this.state.scopes[this.state.scopes.length - 1].set(decl.id.name, val)
          this.push(makeFrame(this.state, this.state.frames.length, line, 'normal', pv))
        }
        return undefined

      case 'ExpressionStatement':
        return this.evalNode((node as any).expression)

      case 'AssignmentExpression': {
        const val = this.evalNode((node as any).right)
        this.assign((node as any).left.name, val)
        this.push(makeFrame(this.state, this.state.frames.length, line, 'normal', pv))
        return val
      }

      case 'CallExpression': {
        const callee = (node as any).callee
        if (callee.type === 'MemberExpression' && callee.object.name === 'console' && callee.property.name === 'log') {
          const args = (node as any).arguments.map((a: acorn.Node) => this.evalNode(a))
          this.state.output.push(args.map(String).join(' '))
          this.push(makeFrame(this.state, this.state.frames.length, line, 'normal', pv))
          return undefined
        }
        const fnName = callee.name ?? '(anonymous)'
        if (BLOCKED.has(fnName)) throw new ReferenceError(`${fnName} is not allowed`)
        const fn = this.resolve(fnName)
        if (typeof fn !== 'function') throw new TypeError(`${fnName} is not a function`)
        const args = (node as any).arguments.map((a: acorn.Node) => this.evalNode(a))
        const fnNode = (fn as any).__node__
        if (!fnNode) return (fn as Function)(...args)
        const argMap: Record<string, Value> = {}
        fnNode.params.forEach((p: any, i: number) => { argMap[p.name] = args[i] })
        this.state.callStack.push({ name: fnName, line, args: argMap })
        this.push(makeFrame(this.state, this.state.frames.length, line, 'call', pv))
        this.state.scopes.push(new Map(Object.entries(argMap)))
        let returnVal: Value = undefined
        try {
          this.execBody(fnNode.body.body)
        } catch (e: any) {
          if (e?.__return__) returnVal = e.value
          else throw e
        }
        this.state.scopes.pop()
        this.state.callStack.pop()
        this.push(makeFrame(this.state, this.state.frames.length, line, 'return', pv))
        return returnVal
      }

      case 'FunctionDeclaration': {
        const fn = (node as any)
        const func = function() {} as any
        func.__node__ = fn
        this.state.scopes[this.state.scopes.length - 1].set(fn.id.name, func)
        return undefined
      }

      case 'ReturnStatement': {
        const val = (node as any).argument ? this.evalNode((node as any).argument) : undefined
        throw { __return__: true, value: val }
      }

      case 'IfStatement': {
        const test = this.evalNode((node as any).test)
        this.push(makeFrame(this.state, this.state.frames.length, line, 'normal', pv))
        if (test) this.evalNode((node as any).consequent)
        else if ((node as any).alternate) this.evalNode((node as any).alternate)
        return undefined
      }

      case 'BlockStatement':
        for (const stmt of (node as any).body) this.evalNode(stmt)
        return undefined

      case 'ForStatement': {
        const n = node as any
        this.state.scopes.push(new Map())
        if (n.init) this.evalNode(n.init)
        while (this.evalNode(n.test)) {
          this.push(makeFrame(this.state, this.state.frames.length, line, 'loop', pv))
          this.evalNode(n.body)
          if (n.update) this.evalNode(n.update)
        }
        this.state.scopes.pop()
        return undefined
      }

      case 'WhileStatement': {
        const n = node as any
        while (this.evalNode(n.test)) {
          this.push(makeFrame(this.state, this.state.frames.length, line, 'loop', pv))
          this.evalNode(n.body)
        }
        return undefined
      }

      case 'UpdateExpression': {
        const n = node as any
        const cur = this.resolve(n.argument.name) as number
        const next = n.operator === '++' ? cur + 1 : cur - 1
        this.assign(n.argument.name, next)
        return n.prefix ? next : cur
      }

      case 'BinaryExpression': {
        const n = node as any
        const l = this.evalNode(n.left) as any
        const r = this.evalNode(n.right) as any
        switch (n.operator) {
          case '+': return l + r; case '-': return l - r
          case '*': return l * r; case '/': return l / r
          case '%': return l % r; case '>': return l > r
          case '<': return l < r; case '>=': return l >= r
          case '<=': return l <= r; case '===': return l === r
          case '!==': return l !== r; case '==': return l == r
          case '!=': return l != r
        }
        return undefined
      }

      case 'LogicalExpression': {
        const n = node as any
        const l = this.evalNode(n.left)
        if (n.operator === '&&') return l ? this.evalNode(n.right) : l
        if (n.operator === '||') return l ? l : this.evalNode(n.right)
        return undefined
      }

      case 'UnaryExpression': {
        const n = node as any
        const val = this.evalNode(n.argument)
        if (n.operator === '!') return !val
        if (n.operator === '-') return -(val as number)
        if (n.operator === 'typeof') return typeof val
        return undefined
      }

      case 'Identifier': {
        const name = (node as any).name
        if (BLOCKED.has(name)) throw new ReferenceError(`${name} is not allowed`)
        return this.resolve(name)
      }

      case 'Literal': return (node as any).value

      case 'ArrayExpression': {
        const arr = (node as any).elements.map((el: acorn.Node) => el ? this.evalNode(el) : null)
        return arr
      }

      case 'ObjectExpression': {
        const obj: Record<string, Value> = {}
        for (const prop of (node as any).properties) {
          obj[prop.key.name ?? prop.key.value] = this.evalNode(prop.value)
        }
        return obj
      }

      case 'MemberExpression': {
        const obj = this.evalNode((node as any).object) as any
        const prop = (node as any).computed
          ? this.evalNode((node as any).property)
          : (node as any).property.name
        return obj?.[prop as string]
      }

      case 'TemplateLiteral': {
        const n = node as any
        let result = ''
        n.quasis.forEach((q: any, i: number) => {
          result += q.value.cooked
          if (i < n.expressions.length) result += String(this.evalNode(n.expressions[i]))
        })
        return result
      }

      default:
        return undefined
    }
  }

  private execBody(body: acorn.Node[]) {
    for (const stmt of body) this.evalNode(stmt)
  }

  run(): ExecutionFrame[] {
    try {
      this.evalNode(this.ast)
    } catch (e: any) {
      if (e?.__return__) return this.state.frames
      const type = e?.type ?? e?.constructor?.name ?? 'RuntimeError'
      const message = e?.message ?? String(e)
      const line = e?.line ?? (this.state.frames.length > 0 ? this.state.frames[this.state.frames.length - 1].line : 1)
      const { explanation, suggestion } = explainError(type, message)
      const error: ExecutionError = { type, message, explanation, suggestion, line }
      const pv = this.prevVars()
      this.state.frames.push({ ...makeFrame(this.state, this.state.frames.length, line, 'error', pv), error })
    }
    return this.state.frames
  }
}

export function runJS(code: string, breakpoints: number[]): ExecutionFrame[] {
  return new JSInterpreter(code, breakpoints).run()
}
```

- [ ] **Step 4: Run tests — expect all to pass**

```bash
npm test -- tests/engine/jsInterpreter.test.ts
```
Expected: All tests PASS. Fix any failing tests before continuing.

- [ ] **Step 5: Commit**

```bash
git add src/engine/jsInterpreter.ts tests/engine/jsInterpreter.test.ts
git commit -m "feat: add sandboxed JavaScript AST interpreter with tests"
```

---

## Task 8: Pyodide Web Worker

**Files:**
- Create: `src/engine/pyodide.worker.ts`

- [ ] **Step 1: Create Pyodide worker**

> **Important:** The worker uses `worker: { format: 'es' }` in vite.config.ts, which means `importScripts` is NOT available. Use a dynamic `import()` from the Pyodide ESM CDN URL instead.

```ts
// src/engine/pyodide.worker.ts
/* eslint-disable */
// @ts-nocheck
let pyodide: any = null

async function loadPyodide() {
  if (pyodide) return pyodide
  // Use ESM import — importScripts() is not available in ES module workers
  const { loadPyodide: load } = await import('https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.mjs')
  pyodide = await load()
  return pyodide
}

self.onmessage = async (e: MessageEvent) => {
  const { type, code } = e.data
  if (type !== 'run') return

  const start = performance.now()
  try {
    const py = await loadPyodide()

    const bootstrap = `
import sys
import traceback as _tb

class ExecutionLimitExceeded(Exception):
    pass

_frames = []
_output = []
_step_count = [0]
_call_stack = [{'name': '(main)', 'line': 1, 'args': {}}]
_heap = {}
_heap_counter = [0]

def _serialize_value(v):
    if v is None: return None
    if isinstance(v, bool): return bool(v)
    if isinstance(v, int): return int(v)
    if isinstance(v, float): return float(v)
    if isinstance(v, str): return str(v)
    if isinstance(v, (list, tuple)):
        ref_id = f"ref_{id(v)}"
        return ref_id
    if isinstance(v, dict):
        ref_id = f"ref_{id(v)}"
        return ref_id
    return repr(v)

def _get_type(v):
    if v is None: return 'None'
    return type(v).__name__

def _trace(frame, event, arg):
    global _step_count, _frames
    if event == 'line':
        _step_count[0] += 1
        if _step_count[0] > 1000:
            sys.settrace(None)
            raise ExecutionLimitExceeded("Execution limit of 1000 steps reached")

        lvars = dict(frame.f_locals)
        variables = {}
        prev_vars = _frames[-1]['variables'] if _frames else {}
        for k, v in lvars.items():
            if k.startswith('_'): continue
            sv = _serialize_value(v)
            variables[k] = {
                'value': sv,
                'type': _get_type(v),
                'changed': k not in prev_vars or prev_vars[k]['value'] != sv
            }

        _frames.append({
            'step': len(_frames),
            'line': frame.f_lineno,
            'type': 'normal',
            'isBreakpoint': False,
            'variables': variables,
            'callStack': list(_call_stack),
            'heap': [],
            'output': list(_output),
            'error': None
        })

    elif event == 'call':
        fn_name = frame.f_code.co_name
        if fn_name != '<module>':
            args = {k: _serialize_value(v) for k, v in frame.f_locals.items() if not k.startswith('_')}
            _call_stack.append({'name': fn_name, 'line': frame.f_lineno, 'args': args})
            if _frames:
                _frames[-1]['type'] = 'call'
                _frames[-1]['callStack'] = list(_call_stack)

    elif event == 'return':
        fn_name = frame.f_code.co_name
        if fn_name != '<module>' and len(_call_stack) > 1:
            _call_stack.pop()
            if _frames:
                _frames[-1]['type'] = 'return'

    return _trace

import builtins
_original_print = builtins.print
def _captured_print(*args, **kwargs):
    msg = ' '.join(str(a) for a in args)
    _output.append(msg)
    if _frames:
        _frames[-1]['output'] = list(_output)
builtins.print = _captured_print
`

    const runCode = `
${bootstrap}

try:
    sys.settrace(_trace)
    exec(compile(${JSON.stringify(code)}, '<user_code>', 'exec'))
    sys.settrace(None)
except ExecutionLimitExceeded as e:
    _frames.append({
        'step': len(_frames),
        'line': _frames[-1]['line'] if _frames else 1,
        'type': 'error',
        'isBreakpoint': False,
        'variables': _frames[-1]['variables'] if _frames else {},
        'callStack': list(_call_stack),
        'heap': [],
        'output': list(_output),
        'error': {
            'type': 'ExecutionLimitExceeded',
            'message': str(e),
            'explanation': 'Python execution reached the 1000-step limit.',
            'suggestion': 'Check your loop conditions and recursion base cases.',
            'line': _frames[-1]['line'] if _frames else 1
        }
    })
except Exception as e:
    err_type = type(e).__name__
    err_line = getattr(e, 'lineno', _frames[-1]['line'] if _frames else 1)
    explanations = {
        'NameError': ('You used a name that has not been defined.', 'Check spelling and make sure the variable is defined first.'),
        'TypeError': ('You used a value in a way that does not match its type.', 'Check that you are calling the right method and using the right types.'),
        'IndexError': ('You accessed an index outside the list range.', 'Check that your index is between 0 and len(list)-1.'),
        'ZeroDivisionError': ('You divided by zero.', 'Make sure your divisor is never zero.'),
        'AttributeError': ('You accessed an attribute that does not exist on this object.', 'Check the attribute name for this type.'),
        'SyntaxError': ('Your code has a syntax error.', 'Check for missing colons, parentheses, or indentation errors.'),
    }
    expl, sugg = explanations.get(err_type, (f'An error occurred: {str(e)}', 'Check the highlighted line for mistakes.'))
    _frames.append({
        'step': len(_frames),
        'line': int(err_line) if isinstance(err_line, int) else (_frames[-1]['line'] if _frames else 1),
        'type': 'error',
        'isBreakpoint': False,
        'variables': _frames[-1]['variables'] if _frames else {},
        'callStack': list(_call_stack),
        'heap': [],
        'output': list(_output),
        'error': {'type': err_type, 'message': str(e), 'explanation': expl, 'suggestion': sugg, 'line': int(err_line) if isinstance(err_line, int) else 1}
    })
finally:
    sys.settrace(None)
    import builtins
    builtins.print = _original_print

import json as _json
_result = _json.dumps(_frames)
_result
`

    const result = py.runPython(runCode)
    const frames = JSON.parse(result)
    const elapsedMs = Math.round(performance.now() - start)
    self.postMessage({ type: 'frames', frames, elapsedMs })
  } catch (err: any) {
    self.postMessage({
      type: 'error',
      error: {
        type: 'RuntimeError',
        message: String(err),
        explanation: 'An unexpected error occurred while running your Python code.',
        suggestion: 'Check your code for syntax errors.',
        line: 1,
      }
    })
  }
}
```

- [ ] **Step 2: Add worker initialization to vite.config.ts**

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/sin/',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['pyodide'],
  },
  worker: {
    format: 'es',
  },
})
```

- [ ] **Step 3: Commit**

```bash
git add src/engine/pyodide.worker.ts vite.config.ts
git commit -m "feat: add Pyodide Web Worker for Python execution"
```

---

## Task 9: Simulated Trace Loader + JSON Traces

**Files:**
- Create: `src/engine/traceLoader.ts`
- Create: `public/traces/java/hello-world.json` (and 19 more trace files)

- [ ] **Step 1: Create traceLoader.ts**

```ts
// src/engine/traceLoader.ts
import type { ExecutionFrame } from '../types/execution'

interface TraceFile {
  language: string
  snippet: string
  code: string
  frames: ExecutionFrame[]
}

export async function loadTrace(language: string, snippet: string): Promise<ExecutionFrame[]> {
  const url = `${import.meta.env.BASE_URL}traces/${language}/${snippet}.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Trace not found: ${language}/${snippet}`)
  const data: TraceFile = await res.json()
  return data.frames
}
```

- [ ] **Step 2: Move traces to public/ so they're served as static assets**

Traces must be in `public/traces/` (not `src/traces/`) so Vite serves them as static files:

```bash
mkdir -p "D:/sumit14/sem_4/my_github/github_projects/sin/public/traces/java"
mkdir -p "D:/sumit14/sem_4/my_github/github_projects/sin/public/traces/c"
mkdir -p "D:/sumit14/sem_4/my_github/github_projects/sin/public/traces/cpp"
mkdir -p "D:/sumit14/sem_4/my_github/github_projects/sin/public/traces/pseudocode"
```

- [ ] **Step 3: Create Java traces (5 files)**

Create `public/traces/java/hello-world.json`:
```json
{
  "language": "java", "snippet": "hello-world",
  "code": "public class Main {\n  public static void main(String[] args) {\n    System.out.println(\"Hello, World!\");\n  }\n}",
  "frames": [
    {"step":0,"line":2,"type":"call","isBreakpoint":false,"variables":{},"callStack":[{"name":"main","line":2,"args":{"args":"[]"}}],"heap":[],"output":[],"error":null},
    {"step":1,"line":3,"type":"normal","isBreakpoint":false,"variables":{},"callStack":[{"name":"main","line":3,"args":{"args":"[]"}}],"heap":[],"output":["Hello, World!"],"error":null}
  ]
}
```

Create `public/traces/java/variables.json`:
```json
{
  "language": "java", "snippet": "variables",
  "code": "public class Main {\n  public static void main(String[] args) {\n    int x = 10;\n    int y = 20;\n    int sum = x + y;\n    System.out.println(sum);\n  }\n}",
  "frames": [
    {"step":0,"line":2,"type":"call","isBreakpoint":false,"variables":{},"callStack":[{"name":"main","line":2,"args":{}}],"heap":[],"output":[],"error":null},
    {"step":1,"line":3,"type":"normal","isBreakpoint":false,"variables":{"x":{"value":10,"type":"int","changed":true}},"callStack":[{"name":"main","line":3,"args":{}}],"heap":[],"output":[],"error":null},
    {"step":2,"line":4,"type":"normal","isBreakpoint":false,"variables":{"x":{"value":10,"type":"int","changed":false},"y":{"value":20,"type":"int","changed":true}},"callStack":[{"name":"main","line":4,"args":{}}],"heap":[],"output":[],"error":null},
    {"step":3,"line":5,"type":"normal","isBreakpoint":false,"variables":{"x":{"value":10,"type":"int","changed":false},"y":{"value":20,"type":"int","changed":false},"sum":{"value":30,"type":"int","changed":true}},"callStack":[{"name":"main","line":5,"args":{}}],"heap":[],"output":[],"error":null},
    {"step":4,"line":6,"type":"normal","isBreakpoint":false,"variables":{"x":{"value":10,"type":"int","changed":false},"y":{"value":20,"type":"int","changed":false},"sum":{"value":30,"type":"int","changed":false}},"callStack":[{"name":"main","line":6,"args":{}}],"heap":[],"output":["30"],"error":null}
  ]
}
```

Create `public/traces/java/loops.json`:
```json
{
  "language": "java", "snippet": "loops",
  "code": "public class Main {\n  public static void main(String[] args) {\n    for (int i = 0; i < 5; i++) {\n      System.out.println(i);\n    }\n  }\n}",
  "frames": [
    {"step":0,"line":2,"type":"call","isBreakpoint":false,"variables":{},"callStack":[{"name":"main","line":2,"args":{}}],"heap":[],"output":[],"error":null},
    {"step":1,"line":3,"type":"loop","isBreakpoint":false,"variables":{"i":{"value":0,"type":"int","changed":true}},"callStack":[{"name":"main","line":3,"args":{}}],"heap":[],"output":[],"error":null},
    {"step":2,"line":4,"type":"normal","isBreakpoint":false,"variables":{"i":{"value":0,"type":"int","changed":false}},"callStack":[{"name":"main","line":4,"args":{}}],"heap":[],"output":["0"],"error":null},
    {"step":3,"line":3,"type":"loop","isBreakpoint":false,"variables":{"i":{"value":1,"type":"int","changed":true}},"callStack":[{"name":"main","line":3,"args":{}}],"heap":[],"output":["0"],"error":null},
    {"step":4,"line":4,"type":"normal","isBreakpoint":false,"variables":{"i":{"value":1,"type":"int","changed":false}},"callStack":[{"name":"main","line":4,"args":{}}],"heap":[],"output":["0","1"],"error":null},
    {"step":5,"line":3,"type":"loop","isBreakpoint":false,"variables":{"i":{"value":2,"type":"int","changed":true}},"callStack":[{"name":"main","line":3,"args":{}}],"heap":[],"output":["0","1"],"error":null},
    {"step":6,"line":4,"type":"normal","isBreakpoint":false,"variables":{"i":{"value":2,"type":"int","changed":false}},"callStack":[{"name":"main","line":4,"args":{}}],"heap":[],"output":["0","1","2"],"error":null},
    {"step":7,"line":3,"type":"loop","isBreakpoint":false,"variables":{"i":{"value":3,"type":"int","changed":true}},"callStack":[{"name":"main","line":3,"args":{}}],"heap":[],"output":["0","1","2"],"error":null},
    {"step":8,"line":4,"type":"normal","isBreakpoint":false,"variables":{"i":{"value":3,"type":"int","changed":false}},"callStack":[{"name":"main","line":4,"args":{}}],"heap":[],"output":["0","1","2","3"],"error":null},
    {"step":9,"line":3,"type":"loop","isBreakpoint":false,"variables":{"i":{"value":4,"type":"int","changed":true}},"callStack":[{"name":"main","line":3,"args":{}}],"heap":[],"output":["0","1","2","3"],"error":null},
    {"step":10,"line":4,"type":"normal","isBreakpoint":false,"variables":{"i":{"value":4,"type":"int","changed":false}},"callStack":[{"name":"main","line":4,"args":{}}],"heap":[],"output":["0","1","2","3","4"],"error":null}
  ]
}
```

Create `public/traces/java/recursion.json`:
```json
{
  "language": "java", "snippet": "recursion",
  "code": "public class Main {\n  static int fib(int n) {\n    if (n <= 1) return n;\n    return fib(n-1) + fib(n-2);\n  }\n  public static void main(String[] args) {\n    System.out.println(fib(5));\n  }\n}",
  "frames": [
    {"step":0,"line":6,"type":"call","isBreakpoint":false,"variables":{},"callStack":[{"name":"main","line":6,"args":{}}],"heap":[],"output":[],"error":null},
    {"step":1,"line":7,"type":"normal","isBreakpoint":false,"variables":{},"callStack":[{"name":"main","line":7,"args":{}}],"heap":[],"output":[],"error":null},
    {"step":2,"line":2,"type":"call","isBreakpoint":false,"variables":{"n":{"value":5,"type":"int","changed":true}},"callStack":[{"name":"main","line":7,"args":{}},{"name":"fib","line":2,"args":{"n":5}}],"heap":[],"output":[],"error":null},
    {"step":3,"line":3,"type":"normal","isBreakpoint":false,"variables":{"n":{"value":5,"type":"int","changed":false}},"callStack":[{"name":"main","line":7,"args":{}},{"name":"fib","line":3,"args":{"n":5}}],"heap":[],"output":[],"error":null},
    {"step":4,"line":4,"type":"normal","isBreakpoint":false,"variables":{"n":{"value":5,"type":"int","changed":false}},"callStack":[{"name":"main","line":7,"args":{}},{"name":"fib","line":4,"args":{"n":5}}],"heap":[],"output":[],"error":null},
    {"step":5,"line":7,"type":"return","isBreakpoint":false,"variables":{},"callStack":[{"name":"main","line":7,"args":{}}],"heap":[],"output":["5"],"error":null}
  ]
}
```

Create `public/traces/java/error.json`:
```json
{
  "language": "java", "snippet": "error",
  "code": "public class Main {\n  public static void main(String[] args) {\n    int x = 10;\n    System.out.println(y);\n  }\n}",
  "frames": [
    {"step":0,"line":2,"type":"call","isBreakpoint":false,"variables":{},"callStack":[{"name":"main","line":2,"args":{}}],"heap":[],"output":[],"error":null},
    {"step":1,"line":3,"type":"normal","isBreakpoint":false,"variables":{"x":{"value":10,"type":"int","changed":true}},"callStack":[{"name":"main","line":3,"args":{}}],"heap":[],"output":[],"error":null},
    {"step":2,"line":4,"type":"error","isBreakpoint":false,"variables":{"x":{"value":10,"type":"int","changed":false}},"callStack":[{"name":"main","line":4,"args":{}}],"heap":[],"output":[],"error":{"type":"SymbolError","message":"cannot find symbol: variable y","explanation":"You used a variable 'y' that has not been declared.","suggestion":"Declare the variable with its type (e.g. int y = ...) before using it.","line":4}}
  ]
}
```

Repeat the same pattern for `c/`, `cpp/`, and `pseudocode/` (5 files each — use language-appropriate code from `snippets.ts` and adapt the frames to match).

- [ ] **Step 4: Commit all traces**

```bash
git add public/traces/ src/engine/traceLoader.ts
git commit -m "feat: add simulated trace loader and JSON traces for Java/C/C++/Pseudocode"
```

---

## Task 10: Execution Engine Dispatcher

**Files:**
- Create: `src/engine/index.ts`

- [ ] **Step 1: Create engine dispatcher**

```ts
// src/engine/index.ts
import type { ExecutionFrame, Language } from '../types/execution'
import { runJS } from './jsInterpreter'
import { loadTrace } from './traceLoader'
import { explainError } from './errorExplanations'

const SIMULATED: Language[] = ['java', 'c', 'cpp', 'pseudocode']

const SNIPPET_NAMES = ['hello-world', 'variables', 'loops', 'recursion', 'error']

function findSnippetName(code: string, language: Language): string {
  // Match code to a known snippet name by first line
  const trimmed = code.trim()
  if (language === 'java') {
    if (trimmed.includes('println("Hello')) return 'hello-world'
    if (trimmed.includes('int x = 10') && trimmed.includes('int y = 20')) return 'variables'
    if (trimmed.includes('for (int i = 0')) return 'loops'
    if (trimmed.includes('fib(')) return 'recursion'
    return 'error'
  }
  if (language === 'c' || language === 'cpp') {
    if (trimmed.includes('Hello')) return 'hello-world'
    if (trimmed.includes('x = 10') && trimmed.includes('y = 20')) return 'variables'
    if (trimmed.includes('for (int i = 0') || trimmed.includes('for(int i=0')) return 'loops'
    if (trimmed.includes('fib(')) return 'recursion'
    return 'error'
  }
  if (language === 'pseudocode') {
    if (trimmed.startsWith('PRINT "Hello')) return 'hello-world'
    if (trimmed.startsWith('SET x = 10')) return 'variables'
    if (trimmed.startsWith('FOR i')) return 'loops'
    if (trimmed.includes('FUNCTION fib')) return 'recursion'
    return 'error'
  }
  return 'hello-world'
}

let pyodideWorker: Worker | null = null

function getPyodideWorker(): Worker {
  if (!pyodideWorker) {
    pyodideWorker = new Worker(new URL('./pyodide.worker.ts', import.meta.url), { type: 'module' })
  }
  return pyodideWorker
}

export async function runCode(
  code: string,
  language: Language,
  breakpoints: number[]
): Promise<{ frames: ExecutionFrame[]; elapsedMs: number }> {
  if (!code.trim()) return { frames: [], elapsedMs: 0 }

  if (language === 'javascript') {
    const t0 = performance.now()
    const frames = runJS(code, breakpoints)
    const elapsedMs = Math.round(performance.now() - t0)
    return { frames, elapsedMs }
  }

  if (language === 'python') {
    return new Promise((resolve) => {
      const worker = getPyodideWorker()
      const handler = (e: MessageEvent) => {
        worker.removeEventListener('message', handler)
        if (e.data.type === 'frames') {
          resolve({ frames: e.data.frames, elapsedMs: e.data.elapsedMs })
        } else {
          const errFrame: ExecutionFrame = {
            step: 0, line: 1, type: 'error', isBreakpoint: false,
            variables: {}, callStack: [{ name: '(main)', line: 1, args: {} }],
            heap: [], output: [], error: e.data.error,
          }
          resolve({ frames: [errFrame], elapsedMs: 0 })
        }
      }
      worker.addEventListener('message', handler)
      worker.postMessage({ type: 'run', code })
    })
  }

  // Simulated languages
  const snippet = findSnippetName(code, language)
  try {
    const frames = await loadTrace(language, snippet)
    // Post-process: stamp breakpoints
    const processed = frames.map(f => ({ ...f, isBreakpoint: breakpoints.includes(f.line) }))
    return { frames: processed, elapsedMs: 0 }
  } catch {
    const errFrame: ExecutionFrame = {
      step: 0, line: 1, type: 'error', isBreakpoint: false,
      variables: {}, callStack: [{ name: '(main)', line: 1, args: {} }],
      heap: [], output: [],
      error: {
        type: 'TraceNotFound',
        message: 'No pre-baked trace for this code.',
        explanation: 'This language uses simulated execution. Select a sample snippet from the sidebar to see it in action.',
        suggestion: 'Choose one of the example snippets from the left sidebar.',
        line: 1,
      },
    }
    return { frames: [errFrame], elapsedMs: 0 }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/engine/index.ts
git commit -m "feat: add execution engine dispatcher (JS/Python/simulated)"
```

---

## Task 11: ControlBar Component

**Files:**
- Modify: `src/components/ControlBar.tsx`

- [ ] **Step 1: Build ControlBar**

```tsx
// src/components/ControlBar.tsx
import { useEffect, useRef } from 'react'
import { useExecutionStore } from '../store/executionStore'
import { runCode } from '../engine/index'

const BASE_INTERVAL = 800 // ms at 1x speed

export default function ControlBar() {
  const {
    code, language, frames, currentStep, setCurrentStep,
    isPlaying, setPlaying, speed, setSpeed,
    setFrames, setStatus, setElapsedMs, breakpoints, status,
  } = useExecutionStore()

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const handleRun = async () => {
    setStatus('loading')
    setPlaying(false)
    const { frames, elapsedMs } = await runCode(code, language, breakpoints)
    setFrames(frames)
    setElapsedMs(elapsedMs)
    setStatus(frames[frames.length - 1]?.error ? 'error' : 'paused')
  }

  const handleReset = () => {
    setPlaying(false)
    setCurrentStep(0)
  }

  const stepForward = () => {
    if (currentStep < frames.length - 1) setCurrentStep(currentStep + 1)
    else setPlaying(false)
  }

  const stepBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1)
  }

  // Auto-play with breakpoint check
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (!isPlaying) return
    intervalRef.current = setInterval(() => {
      const { currentStep: cs, frames: fs, setCurrentStep: scs, setPlaying: sp } = useExecutionStore.getState()
      const next = cs + 1
      if (next >= fs.length) { sp(false); return }
      scs(next)
      if (fs[next]?.isBreakpoint) sp(false)
    }, BASE_INTERVAL / speed)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isPlaying, speed])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'TEXTAREA') return
      if (e.key === ' ') { e.preventDefault(); setPlaying(!isPlaying) }
      if (e.key === 'ArrowRight') stepForward()
      if (e.key === 'ArrowLeft') stepBack()
      if (e.key === 'r' || e.key === 'R') handleReset()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isPlaying, currentStep, frames.length])

  const btn = (label: string, onClick: () => void, disabled = false) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '4px 10px', background: 'none', border: '1px solid var(--border-active)',
        borderRadius: 'var(--radius-sm)', color: disabled ? 'var(--text-dim)' : 'var(--text)',
        fontFamily: 'var(--font-ui)', fontSize: '12px', cursor: disabled ? 'default' : 'pointer',
        marginRight: '4px', transition: 'background 0.1s',
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
    >
      {label}
    </button>
  )

  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '6px 10px',
      borderBottom: '1px solid var(--border)', gap: '4px', background: 'var(--bg-panel)',
    }}>
      <button
        onClick={handleRun}
        style={{
          padding: '4px 14px', background: 'var(--blue)', border: 'none',
          borderRadius: 'var(--radius-sm)', color: '#fff', fontFamily: 'var(--font-ui)',
          fontSize: '12px', fontWeight: 500, cursor: 'pointer', marginRight: '8px',
        }}
      >
        {status === 'loading' ? '...' : '▶ Run'}
      </button>

      {btn('⏮', handleReset, frames.length === 0)}
      {btn('←', stepBack, currentStep === 0 || frames.length === 0)}
      {btn(isPlaying ? '⏸' : '▶', () => setPlaying(!isPlaying), frames.length === 0)}
      {btn('→', stepForward, currentStep >= frames.length - 1 || frames.length === 0)}

      <div style={{ marginLeft: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Speed:</span>
        {([0.5, 1, 2, 4] as const).map(s => (
          <button key={s} onClick={() => setSpeed(s)} style={{
            padding: '2px 6px', background: speed === s ? 'var(--blue)' : 'none',
            border: '1px solid var(--border-active)', borderRadius: 'var(--radius-sm)',
            color: speed === s ? '#fff' : 'var(--text-dim)', fontSize: '11px',
            fontFamily: 'var(--font-ui)', cursor: 'pointer',
          }}>{s}x</button>
        ))}
      </div>

      {frames.length > 0 && (
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-dim)' }}>
          Step {currentStep + 1} / {frames.length}
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify Run button executes JS snippets**

```bash
npm run dev
```
Load the page, select "Hello World" from the sidebar, click Run. Expected: step counter shows "Step 1 / N".

- [ ] **Step 3: Commit**

```bash
git add src/components/ControlBar.tsx
git commit -m "feat: add ControlBar with play/pause/step/reset and keyboard shortcuts"
```

---

## Task 12: Variables Panel + Tests

**Files:**
- Modify: `src/components/VariablesPanel.tsx`
- Create: `tests/components/VariablesPanel.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// tests/components/VariablesPanel.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import VariablesPanel from '../../src/components/VariablesPanel'
import { useExecutionStore } from '../../src/store/executionStore'
import type { ExecutionFrame } from '../../src/types/execution'

const mockFrame: ExecutionFrame = {
  step: 1, line: 2, type: 'normal', isBreakpoint: false,
  variables: {
    x: { value: 42, type: 'number', changed: true },
    name: { value: 'Alice', type: 'string', changed: false },
  },
  callStack: [], heap: [], output: [], error: null,
}

describe('VariablesPanel', () => {
  beforeEach(() => {
    useExecutionStore.setState({ frames: [mockFrame], currentStep: 0 })
  })

  it('renders variable names', () => {
    render(<VariablesPanel />)
    expect(screen.getByText('x')).toBeTruthy()
    expect(screen.getByText('name')).toBeTruthy()
  })

  it('renders variable values', () => {
    render(<VariablesPanel />)
    expect(screen.getByText('42')).toBeTruthy()
    expect(screen.getByText('"Alice"')).toBeTruthy()
  })

  it('renders type badges', () => {
    render(<VariablesPanel />)
    expect(screen.getByText('number')).toBeTruthy()
    expect(screen.getByText('string')).toBeTruthy()
  })

  it('shows empty state when no frames', () => {
    useExecutionStore.setState({ frames: [], currentStep: 0 })
    render(<VariablesPanel />)
    expect(screen.getByText(/run/i)).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test — expect fail**

```bash
npm test -- tests/components/VariablesPanel.test.tsx
```

- [ ] **Step 3: Implement VariablesPanel**

```tsx
// src/components/VariablesPanel.tsx
import { memo } from 'react'
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
      {vars.map(([name, info]) => (
        <div
          key={name}
          style={{
            display: 'flex', alignItems: 'center', padding: '5px 6px',
            borderRadius: 'var(--radius-sm)', marginBottom: '2px',
            background: info.changed ? 'rgba(220,220,170,0.08)' : 'transparent',
            border: `1px solid ${info.changed ? 'rgba(220,220,170,0.2)' : 'transparent'}`,
            transition: 'background 0.3s, border 0.3s',
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
          {info.changed && <span style={{ color: 'var(--yellow)', fontSize: '10px', marginLeft: '4px' }}>●</span>}
        </div>
      ))}
    </div>
  )
})

export default VariablesPanel
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- tests/components/VariablesPanel.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/VariablesPanel.tsx tests/components/VariablesPanel.test.tsx
git commit -m "feat: add VariablesPanel with change highlighting and tests"
```

---

## Task 13: CallStack Panel + Tests

**Files:**
- Modify: `src/components/CallStackPanel.tsx`
- Create: `tests/components/CallStackPanel.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// tests/components/CallStackPanel.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import CallStackPanel from '../../src/components/CallStackPanel'
import { useExecutionStore } from '../../src/store/executionStore'
import type { ExecutionFrame } from '../../src/types/execution'

const mockFrame: ExecutionFrame = {
  step: 2, line: 3, type: 'call', isBreakpoint: false,
  variables: {},
  callStack: [
    { name: '(main)', line: 1, args: {} },
    { name: 'fib', line: 3, args: { n: 5 } },
  ],
  heap: [], output: [], error: null,
}

describe('CallStackPanel', () => {
  beforeEach(() => {
    useExecutionStore.setState({ frames: [mockFrame], currentStep: 0 })
  })

  it('renders all frame names', () => {
    render(<CallStackPanel />)
    expect(screen.getByText('(main)')).toBeTruthy()
    expect(screen.getByText('fib')).toBeTruthy()
  })

  it('shows depth badge', () => {
    render(<CallStackPanel />)
    expect(screen.getByText('Depth: 2')).toBeTruthy()
  })

  it('shows empty state', () => {
    useExecutionStore.setState({ frames: [], currentStep: 0 })
    render(<CallStackPanel />)
    expect(screen.getByText(/run/i)).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run — expect fail**

```bash
npm test -- tests/components/CallStackPanel.test.tsx
```

- [ ] **Step 3: Implement CallStackPanel**

```tsx
// src/components/CallStackPanel.tsx
import { memo } from 'react'
import { useExecutionStore } from '../store/executionStore'

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
      {stack.map((f, i) => (
        <div key={i} style={{
          padding: '6px 8px', marginBottom: '4px', borderRadius: 'var(--radius-sm)',
          background: i === 0 ? 'rgba(0,122,204,0.1)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${i === 0 ? 'rgba(0,122,204,0.3)' : 'var(--border)'}`,
        }}>
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
        </div>
      ))}
    </div>
  )
})

export default CallStackPanel
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- tests/components/CallStackPanel.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/CallStackPanel.tsx tests/components/CallStackPanel.test.tsx
git commit -m "feat: add CallStackPanel with recursion depth badge and tests"
```

---

## Task 14: Memory Panel

**Files:**
- Modify: `src/components/MemoryPanel.tsx`

- [ ] **Step 1: Implement MemoryPanel**

```tsx
// src/components/MemoryPanel.tsx
import { memo, useRef, useEffect } from 'react'
import { useExecutionStore } from '../store/executionStore'
import type { HeapNode } from '../types/execution'

const MemoryPanel = memo(function MemoryPanel() {
  const frames = useExecutionStore(s => s.frames)
  const currentStep = useExecutionStore(s => s.currentStep)
  const frame = frames[currentStep]

  if (!frame) {
    return <div style={{ color: 'var(--text-dim)', fontSize: '12px', padding: '16px', textAlign: 'center' }}>Click Run to start execution</div>
  }

  const stackVars = Object.entries(frame.variables).filter(([, v]) => typeof v.value !== 'string' || !v.value.startsWith('ref_'))
  const heapNodes = frame.heap

  return (
    <div style={{ fontFamily: 'var(--font-code)', fontSize: '11px' }}>
      {/* Stack section */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ color: 'var(--text-dim)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Stack</div>
        {frame.callStack.length === 0
          ? <div style={{ color: 'var(--text-dim)', fontSize: '11px' }}>Empty</div>
          : [...frame.callStack].reverse().map((f, i) => (
            <div key={i} style={{
              padding: '5px 8px', marginBottom: '3px',
              background: i === 0 ? 'rgba(0,122,204,0.1)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${i === 0 ? 'rgba(0,122,204,0.25)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-sm)',
            }}>
              <div style={{ color: 'var(--blue)', marginBottom: '3px' }}>{f.name}()</div>
              {Object.entries(f.args).map(([k, v]) => (
                <div key={k} style={{ color: 'var(--text-dim)', paddingLeft: '8px' }}>
                  <span style={{ color: 'var(--yellow)' }}>{k}</span>: <span style={{ color: 'var(--text)' }}>{String(v)}</span>
                </div>
              ))}
            </div>
          ))
        }
      </div>

      {/* Heap section */}
      {heapNodes.length > 0 && (
        <div>
          <div style={{ color: 'var(--text-dim)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Heap</div>
          {heapNodes.map((node) => (
            <div key={node.id} style={{
              padding: '5px 8px', marginBottom: '4px',
              border: '1px solid var(--border-active)',
              borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.02)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--teal)' }}>{node.id}</span>
                <span style={{ color: 'var(--text-dim)', fontSize: '10px' }}>{node.type}</span>
              </div>
              <div style={{ color: 'var(--text)', marginTop: '2px' }}>{JSON.stringify(node.value)}</div>
              {node.references.length > 0 && (
                <div style={{ color: 'var(--purple)', fontSize: '10px', marginTop: '2px' }}>
                  → {node.references.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {heapNodes.length === 0 && stackVars.length === 0 && (
        <div style={{ color: 'var(--text-dim)', textAlign: 'center', marginTop: '16px' }}>No memory allocated yet</div>
      )}
    </div>
  )
})

export default MemoryPanel
```

- [ ] **Step 2: Commit**

```bash
git add src/components/MemoryPanel.tsx
git commit -m "feat: add MemoryPanel with stack frames and heap nodes"
```

---

## Task 15: Output Console + Error Explainer

**Files:**
- Modify: `src/components/OutputConsole.tsx`, `src/components/ErrorExplainer.tsx`

- [ ] **Step 1: Implement OutputConsole**

```tsx
// src/components/OutputConsole.tsx
import { memo } from 'react'
import { useExecutionStore } from '../store/executionStore'

const OutputConsole = memo(function OutputConsole() {
  const frames = useExecutionStore(s => s.frames)
  const currentStep = useExecutionStore(s => s.currentStep)
  const frame = frames[currentStep]

  if (!frame) {
    return <div style={{ color: 'var(--text-dim)', fontSize: '12px', fontFamily: 'var(--font-code)', padding: '4px' }}>No output yet</div>
  }

  return (
    <div style={{ fontFamily: 'var(--font-code)', fontSize: '12px', lineHeight: '1.6' }}>
      {frame.output.length === 0
        ? <span style={{ color: 'var(--text-dim)' }}>No output</span>
        : frame.output.map((line, i) => (
          <div key={i} style={{ color: 'var(--text)', padding: '1px 0' }}>
            <span style={{ color: 'var(--text-dim)', marginRight: '8px', userSelect: 'none' }}>{i + 1}</span>
            {line}
          </div>
        ))
      }
    </div>
  )
})

export default OutputConsole
```

- [ ] **Step 2: Implement ErrorExplainer**

```tsx
// src/components/ErrorExplainer.tsx
import { memo } from 'react'
import { useExecutionStore } from '../store/executionStore'

const ErrorExplainer = memo(function ErrorExplainer() {
  const frames = useExecutionStore(s => s.frames)
  const errorFrame = frames.find(f => f.error !== null)

  if (!errorFrame?.error) {
    return <div style={{ color: 'var(--text-dim)', fontSize: '12px', padding: '4px' }}>No errors</div>
  }

  const { error } = errorFrame

  return (
    <div style={{ fontFamily: 'var(--font-ui)', fontSize: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span style={{
          background: 'rgba(244,71,71,0.15)', border: '1px solid rgba(244,71,71,0.4)',
          color: 'var(--red)', borderRadius: 'var(--radius-sm)', padding: '2px 8px', fontSize: '11px', fontFamily: 'var(--font-code)',
        }}>{error.type}</span>
        <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>on line {error.line}</span>
      </div>

      <div style={{ color: 'var(--text-dim)', fontSize: '11px', fontFamily: 'var(--font-code)', marginBottom: '10px', padding: '6px 8px', background: 'rgba(244,71,71,0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(244,71,71,0.15)' }}>
        {error.message}
      </div>

      <div style={{ marginBottom: '8px' }}>
        <div style={{ color: 'var(--text-dim)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>What happened</div>
        <div style={{ color: 'var(--text)', lineHeight: '1.5' }}>{error.explanation}</div>
      </div>

      <div>
        <div style={{ color: 'var(--text-dim)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>How to fix it</div>
        <div style={{ color: 'var(--teal)', lineHeight: '1.5' }}>{error.suggestion}</div>
      </div>
    </div>
  )
})

export default ErrorExplainer
```

- [ ] **Step 3: Commit**

```bash
git add src/components/OutputConsole.tsx src/components/ErrorExplainer.tsx
git commit -m "feat: add OutputConsole and ErrorExplainer panels"
```

---

## Task 16: Execution Timeline + Timer Badge

**Files:**
- Modify: `src/components/ExecutionTimeline.tsx`, `src/components/TimerBadge.tsx`

- [ ] **Step 1: Implement ExecutionTimeline**

```tsx
// src/components/ExecutionTimeline.tsx
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
```

- [ ] **Step 2: Implement TimerBadge**

```tsx
// src/components/TimerBadge.tsx
import { useExecutionStore } from '../store/executionStore'

export default function TimerBadge() {
  const elapsedMs = useExecutionStore(s => s.elapsedMs)
  const frames = useExecutionStore(s => s.frames)
  if (frames.length === 0) return null

  const display = elapsedMs >= 1000 ? `${(elapsedMs / 1000).toFixed(2)}s` : `${elapsedMs}ms`

  return (
    <span style={{
      fontSize: '11px', color: 'var(--text-hint)',
      fontFamily: 'var(--font-code)', marginRight: '8px', userSelect: 'none',
    }}>
      ⏱ {display}
    </span>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ExecutionTimeline.tsx src/components/TimerBadge.tsx
git commit -m "feat: add ExecutionTimeline canvas scrubber and TimerBadge"
```

---

## Task 17: GitHub Pages Deployment Setup

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create GitHub Actions workflow**

```bash
mkdir -p "D:/sumit14/sem_4/my_github/github_projects/sin/.github/workflows"
```

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist
      - uses: actions/deploy-pages@v4
        id: deployment
```

- [ ] **Step 2: Verify build succeeds**

```bash
npm run build
```
Expected: `dist/` folder created with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add .github/
git commit -m "feat: add GitHub Actions deploy workflow for GitHub Pages"
```

---

## Task 18: Integration QA Pass

- [ ] **Step 1: Run all tests**

```bash
npm test
```
Expected: All unit and component tests pass.

- [ ] **Step 2: Manual QA checklist**

Open `npm run dev` and verify:

- [ ] JS "Hello World" snippet → Run → step through → output shows "Hello, World!"
- [ ] JS "Variables" snippet → variables panel shows x, y, sum with types
- [ ] JS "Loop" snippet → timeline shows teal loop segments
- [ ] JS "Recursion" → call stack shows fib frames with n argument
- [ ] JS "Error" snippet → error panel shows ReferenceError with explanation
- [ ] Click line number gutter → red breakpoint dot appears → Play stops at breakpoint
- [ ] Speed controls (0.5x / 1x / 2x / 4x) change playback speed
- [ ] Space/arrow/R keyboard shortcuts work
- [ ] Language switcher → sidebar snippets update
- [ ] Java "Hello World" → simulated badge visible → steps through
- [ ] Timer badge shows elapsed time bottom-right
- [ ] Timeline scrubber jumps to any step
- [ ] Right panel tabs (Variables / Call Stack / Memory) all switch correctly
- [ ] Bottom panel tabs (Output / Error) switch correctly
- [ ] Resize window below 1024px → desktop-only message shown

- [ ] **Step 3: Fix any issues found during QA**

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: code execution visualizer — complete implementation"
```

---

## Dependency Graph

```
Task 1 (scaffold)
  └── Task 2 (types + store)
        ├── Task 3 (layout)
        │     ├── Task 4 (sidebar)
        │     └── Task 5 (editor)
        ├── Task 6 (error explanations)  ← independent
        │     └── Task 7 (JS interpreter)
        ├── Task 8 (Pyodide worker)       ← independent after Task 2
        ├── Task 9 (trace loader)         ← independent after Task 2
        │
        Tasks 6+7+8+9 all feed into:
        └── Task 10 (engine dispatcher)
              └── Task 11 (ControlBar)
                    ├── Task 12 (VariablesPanel)
                    ├── Task 13 (CallStackPanel)
                    ├── Task 14 (MemoryPanel)
                    ├── Task 15 (Output + Error)
                    └── Task 16 (Timeline + Timer)
                          └── Task 17 (GitHub Pages)
                                └── Task 18 (QA)
```

{% endraw %}
