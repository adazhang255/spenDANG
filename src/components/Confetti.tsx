import { useMemo, type CSSProperties } from 'react'

const COLORS = ['#bef264', '#fb7185', '#fbbf24', '#38bdf8', '#a78bfa', '#34d399']

/** A one-shot confetti burst. Re-mount (change `key`) to fire again. */
export function Confetti({ count = 22 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4
        const dist = 60 + Math.random() * 80
        return {
          style: {
            '--dx': `${Math.cos(angle) * dist}px`,
            '--dy': `${Math.sin(angle) * dist - 30}px`,
            '--rot': `${Math.random() * 540 - 270}deg`,
            background: COLORS[i % COLORS.length],
            width: i % 3 ? 6 : 8,
            height: i % 3 ? 10 : 8,
            borderRadius: i % 3 ? 1 : 999,
            animationDelay: `${Math.random() * 120}ms`,
          } as CSSProperties,
        }
      }),
    [count],
  )
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible" aria-hidden>
      {pieces.map((p, i) => (
        <span key={i} className="absolute animate-confetti" style={p.style} />
      ))}
    </div>
  )
}
