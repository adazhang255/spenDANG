import { useEffect, useRef, useState } from 'react'

/** Animate a number from its previous value to `target`. */
export function useCountUp(target: number, duration = 600): number {
  const [value, setValue] = useState(target)
  const from = useRef(target)

  useEffect(() => {
    const start = from.current
    if (start === target) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      from.current = target
      setValue(target)
      return
    }
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      const v = start + (target - start) * eased
      from.current = v
      setValue(v)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return value
}
