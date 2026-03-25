// ReactBits ShinyText — gradient shimmer sweeps across text
interface ShinyTextProps {
  text: string
  speed?: number   // seconds
  style?: React.CSSProperties
}

export default function ShinyText({ text, speed = 4, style }: ShinyTextProps) {
  return (
    <span style={{
      background: 'linear-gradient(120deg, #6c7086 30%, #cdd6f4 50%, #6c7086 70%)',
      backgroundSize: '300% 100%',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
      animation: `shiny-sweep ${speed}s linear infinite`,
      display: 'inline-block',
      fontWeight: 700,
      ...style,
    }}>
      {text}
    </span>
  )
}
