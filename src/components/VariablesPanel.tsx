import { memo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useExecutionStore } from '../store/executionStore'
import DecryptedText from './ui/DecryptedText'
import ShinyText from './ui/ShinyText'

function formatValue(v: unknown): string {
  if (v === null) return 'null'
  if (v === undefined) return 'undefined'
  if (typeof v === 'string') return `"${v}"`
  if (Array.isArray(v)) return `[${(v as unknown[]).map(i => formatValue(i)).join(', ')}]`
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

const TYPE_COLORS: Record<string, string> = {
  number: '#f9e2af', string: '#fab387', boolean: '#89b4fa',
  null: '#89b4fa', undefined: '#89b4fa', array: '#94e2d5',
  object: '#cba6f7', ref: '#94e2d5',
}

const ROW_SPRING = { type: 'spring' as const, stiffness: 400, damping: 25 }

const VariablesPanel = memo(function VariablesPanel() {
  const frames = useExecutionStore(s => s.frames)
  const currentStep = useExecutionStore(s => s.currentStep)
  const reduced = useReducedMotion() ?? false
  const frame = frames[currentStep]

  if (!frame) {
    return (
      <div style={{ color: 'var(--text-dim)', fontSize: '12px', padding: '20px', textAlign: 'center', fontFamily: 'var(--font-ui)' }}>
        Click Run to start execution
      </div>
    )
  }

  const vars = Object.entries(frame.variables)
  if (vars.length === 0) {
    return <div style={{ color: 'var(--text-dim)', fontSize: '12px', padding: '20px', textAlign: 'center' }}>No variables in scope</div>
  }

  return (
    <div style={{ fontFamily: 'var(--font-code)', fontSize: '12px' }}>
      <AnimatePresence initial={false}>
        {vars.map(([name, info]) => (
          <motion.div
            key={name}
            layout={!reduced}
            initial={reduced ? false : { scale: 0.85, x: -12, opacity: 0 }}
            animate={reduced
              ? { scale: 1, x: 0, opacity: 1 }
              : info.changed
                ? { scale: [1, 1.05, 1], x: 0, opacity: 1,
                    transition: { scale: { duration: 0.4 }, x: ROW_SPRING, opacity: ROW_SPRING } }
                : { scale: 1, x: 0, opacity: 1, transition: ROW_SPRING }
            }
            exit={reduced ? { opacity: 0 } : { scale: 0.85, opacity: 0, transition: { duration: 0.18 } }}
            style={{
              display: 'flex', alignItems: 'center', padding: '6px 8px',
              borderRadius: 'var(--radius-sm)', marginBottom: '3px',
              background: info.changed
                ? 'rgba(166,227,161,0.06)'
                : 'rgba(255,255,255,0.02)',
              border: `1px solid ${info.changed ? 'rgba(166,227,161,0.25)' : 'rgba(49,50,68,0.6)'}`,
              boxShadow: info.changed ? '0 0 12px rgba(166,227,161,0.12)' : 'none',
              transition: 'background 0.3s, border 0.3s, box-shadow 0.3s',
            }}
          >
            {/* variable name */}
            <span style={{ color: 'var(--yellow)', minWidth: '80px', flexShrink: 0, fontWeight: 600 }}>
              {name}
            </span>
            {/* type badge */}
            <span style={{ margin: '0 8px', fontSize: '9px', flexShrink: 0 }}>
              <span style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)',
                borderRadius: '4px', padding: '2px 5px',
                color: TYPE_COLORS[info.type] ?? 'var(--text-dim)',
                fontWeight: 500,
              }}>{info.type}</span>
            </span>
            {/* value — scrambles when changed */}
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {info.changed && !reduced
                ? <DecryptedText
                    text={formatValue(info.value)}
                    speed={35}
                    style={{ color: 'var(--green)', fontWeight: 600 }}
                  />
                : <span style={{ color: 'var(--text)' }}>{formatValue(info.value)}</span>
              }
            </span>
            {/* changed indicator */}
            {info.changed && (
              <ShinyText text="●" speed={2} style={{ marginLeft: '6px', fontSize: '11px' }} />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
})

export default VariablesPanel
