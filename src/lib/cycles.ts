/**
 * Billing cycles. A cycle starting on day D runs from the Dth of one month to the (D-1)th of
 * the next. With D = 1 cycles are plain calendar months. Cycles are keyed by their start date.
 */

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function iso(y: number, m: number, d: number): string {
  const dt = new Date(y, m, d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

function parts(isoDate: string): [number, number, number] {
  const [y, m, d] = isoDate.split('-').map(Number)
  return [y, m - 1, d]
}

export function cycleKey(date: string, startDay: number): string {
  const [y, m, d] = parts(date)
  return d >= startDay ? iso(y, m, startDay) : iso(y, m - 1, startDay)
}

export function shiftCycle(key: string, delta: number): string {
  const [y, m, d] = parts(key)
  return iso(y, m + delta, d)
}

/** Inclusive last day of the cycle. */
export function cycleEnd(key: string): string {
  const [y, m, d] = parts(key)
  return iso(y, m + 1, d - 1)
}

export function inCycle(date: string, key: string): boolean {
  return date >= key && date <= cycleEnd(key)
}

export function cycleLabel(key: string, short = false): string {
  const [y, m, d] = parts(key)
  if (d === 1) return short ? MONTH_SHORT[m] : `${MONTH_SHORT[m]} ${y}`
  const [, em, ed] = parts(cycleEnd(key))
  return `${MONTH_SHORT[m]} ${d} – ${MONTH_SHORT[em]} ${ed}`
}

/** 0..1 how far through the cycle `today` is (clamped). */
export function cycleProgress(key: string, today: string): number {
  const start = new Date(key).getTime()
  const end = new Date(shiftCycle(key, 1)).getTime()
  const now = new Date(today).getTime()
  return Math.min(1, Math.max(0, (now - start) / (end - start)))
}

/** Whole days from `a` to `b` (ISO dates); negative if b is earlier. */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = parts(a)
  const [by, bm, bd] = parts(b)
  return Math.round((Date.UTC(by, bm, bd) - Date.UTC(ay, am, ad)) / 86_400_000)
}

/** Days left in the cycle counting today, or 0 if `today` is past it. */
export function daysLeftInCycle(key: string, today: string): number {
  return Math.max(0, daysBetween(today, cycleEnd(key)) + 1)
}

/** Same day next month, clamped to the month's last day (Jan 31 -> Feb 28). */
export function addMonth(isoDate: string): string {
  const [y, m, d] = parts(isoDate)
  const last = new Date(y, m + 2, 0).getDate()
  return iso(y, m + 1, Math.min(d, last))
}
