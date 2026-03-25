import { useEffect, useRef, useState } from 'react'

// ReactBits-inspired DecryptedText — scrambles chars then reveals on change
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()'

interface DecryptedTextProps {
  text: string
  speed?: number          // ms per iteration
  style?: React.CSSProperties
}

export default function DecryptedText({ text, speed = 40, style }: DecryptedTextProps) {
  const [display, setDisplay] = useState(text)
  const prev = useRef(text)
  const timer = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    if (text === prev.current) { setDisplay(text); return }
    prev.current = text
    let iter = 0
    clearInterval(timer.current)
    timer.current = setInterval(() => {
      setDisplay(
        text.split('').map((ch, i) =>
          i < iter
            ? ch
            : CHARS[Math.floor(Math.random() * CHARS.length)]
        ).join('')
      )
      iter += 0.4
      if (iter >= text.length + 1) {
        setDisplay(text)
        clearInterval(timer.current)
      }
    }, speed)
    return () => clearInterval(timer.current)
  }, [text, speed])

  return <span style={style}>{display}</span>
}
