import { useRef, useState } from 'react'

// ReactBits-inspired spotlight card — moving radial gradient follows mouse
interface SpotlightCardProps {
  children: React.ReactNode
  style?: React.CSSProperties
  spotlightColor?: string
}

export default function SpotlightCard({
  children,
  style,
  spotlightColor = 'rgba(137,180,250,0.07)',
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [opacity, setOpacity] = useState(0)

  const onMove = (e: React.MouseEvent) => {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top })
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      style={{ position: 'relative', ...style }}
    >
      {/* spotlight overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        opacity, transition: 'opacity 0.4s',
        background: `radial-gradient(500px circle at ${pos.x}px ${pos.y}px, ${spotlightColor}, transparent 40%)`,
        borderRadius: 'inherit',
      }} />
      <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>
        {children}
      </div>
    </div>
  )
}
