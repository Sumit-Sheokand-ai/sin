import { memo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useExecutionStore } from '../store/executionStore'

const FRAME_SPRING = { type: 'spring' as const, stiffness: 350, damping: 28 }

const CallStackPanel = memo(function CallStackPanel() {
  const frames = useExecutionStore(s => s.frames)
  const currentStep = useExecutionStore(s => s.currentStep)
  const reduced = useReducedMotion() ?? false
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
            layout={!reduced}
            initial={reduced ? false : { x: -20, opacity: 0, scale: 0.92 }}
            animate={{ x: 0, opacity: 1, scale: 1, transition: reduced ? { duration: 0 } : FRAME_SPRING }}
            exit={reduced ? { opacity: 0 } : { x: 20, opacity: 0, scale: 0.88, transition: { duration: 0.2 } }}
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
