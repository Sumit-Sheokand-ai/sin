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
