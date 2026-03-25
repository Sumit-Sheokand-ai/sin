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
