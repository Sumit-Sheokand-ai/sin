// ReactBits StarBorder — animated star/comet that traces the border
// Adapted from https://reactbits.dev/animations/star-border

interface StarBorderProps {
  children: React.ReactNode
  color?: string
  speed?: string
  style?: React.CSSProperties
}

export default function StarBorder({
  children,
  color = '#89b4fa',
  speed = '3s',
  style,
}: StarBorderProps) {
  return (
    <div style={{
      position: 'relative',
      borderRadius: 8,
      overflow: 'hidden',
      padding: '1.5px 0',
      ...style,
    }}>
      {/* bottom comet */}
      <div style={{
        position: 'absolute',
        width: '300%', height: '50%',
        bottom: -10, right: '-250%',
        borderRadius: '50%', opacity: 0.85,
        background: `radial-gradient(circle, ${color}, transparent 12%)`,
        animation: `star-move-bottom linear infinite alternate`,
        animationDuration: speed,
        zIndex: 0,
      }} />
      {/* top comet */}
      <div style={{
        position: 'absolute',
        width: '300%', height: '50%',
        top: -10, left: '-250%',
        borderRadius: '50%', opacity: 0.85,
        background: `radial-gradient(circle, ${color}, transparent 12%)`,
        animation: `star-move-top linear infinite alternate`,
        animationDuration: speed,
        zIndex: 0,
      }} />
      {/* inner content */}
      <div style={{
        position: 'relative', zIndex: 1,
        border: `1px solid ${color}44`,
        borderRadius: 8,
        background: `rgba(30,30,46,0.9)`,
        backdropFilter: 'blur(6px)',
      }}>
        {children}
      </div>
    </div>
  )
}
