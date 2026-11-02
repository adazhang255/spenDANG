import type { Goal, Tracker } from './types'
import { plural } from './util'

export interface GoalStats {
  saved: number
  remaining: number
  /** saved / target, clamped to 0..1 */
  ratio: number
  done: boolean
  /** Whole-or-partial months until the deadline (min 1), or null without a deadline. */
  monthsLeft: number | null
  /** Amount to save each month to hit the deadline, or null without a deadline. */
  perMonth: number | null
  overdue: boolean
}

function monthsBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number)
  const [ty, tm, td] = to.split('-').map(Number)
  return (ty - fy) * 12 + (tm - fm) + (td - fd) / 30
}

export function goalStats(goal: Goal, today: string): GoalStats {
  const saved = goal.contributions.reduce((s, c) => s + c.amount, 0)
  const remaining = Math.max(0, goal.target - saved)
  const done = remaining <= 0.005
  let monthsLeft: number | null = null
  let perMonth: number | null = null
  let overdue = false
  if (goal.deadline) {
    const m = monthsBetween(today, goal.deadline)
    overdue = m < 0 && !done
    monthsLeft = Math.max(1, Math.ceil(m))
    perMonth = done ? 0 : remaining / monthsLeft
  }
  return { saved, remaining, ratio: goal.target > 0 ? Math.min(1, saved / goal.target) : 0, done, monthsLeft, perMonth, overdue }
}

/**
 * Express an amount in tracker units: "9 drinks or 3 meals". Uses up to `max` trackers,
 * cheapest first, skipping any where the amount buys less than one unit.
 */
export function inTrackerUnits(amount: number, trackers: Tracker[], max = 2): string | null {
  const parts = [...trackers]
    .filter((t) => t.unitCost > 0)
    .sort((a, b) => a.unitCost - b.unitCost)
    .map((t) => ({ t, n: Math.round(amount / t.unitCost) }))
    .filter(({ n }) => n >= 1)
    .slice(0, max)
    .map(({ t, n }) => `${n} ${plural(t.unit, n)}`)
  return parts.length ? parts.join(' or ') : null
}
