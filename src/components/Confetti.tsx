import { useMemo, type CSSProperties } from 'react'

const PIECES = ['🎉', '✨', '💜', '⭐', '🫶', '💸']

/** A one-shot emoji burst. Re-mount (change `key`) to fire again. */
export function Confetti({ count = 18 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4
        const dist = 60 + Math.random() * 70
        return {
          char: PIECES[i % PIECES.length],
          style: {
            '--dx': `${Math.cos(angle) * dist}px`,
            '--dy': `${Math.sin(angle) * dist - 30}px`,
            '--rot': `${Math.random() * 360 - 180}deg`,
            animationDelay: `${Math.random() * 120}ms`,
          } as CSSProperties,
        }
      }),
    [count],
  )
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible" aria-hidden>
      {pieces.map((p, i) => (
        <span key={i} className="absolute text-lg animate-confetti" style={p.style}>
          {p.char}
        </span>
      ))}
    </div>
  )
}
