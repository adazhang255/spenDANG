import { cycleKey, shiftCycle } from './cycles'
import type { Tracker, Transaction } from './types'

/** Spending per tracker per cycle, plus which cycles have any data at all. */
export interface SpendIndex {
  byTracker: Map<string, Map<string, number>>
  activeCycles: Set<string>
}

export function indexSpend(txs: Transaction[], assign: (t: Transaction) => string | null, cycleStartDay: number): SpendIndex {
  const byTracker = new Map<string, Map<string, number>>()
  const activeCycles = new Set<string>()
  for (const t of txs) {
    const k = cycleKey(t.date, cycleStartDay)
    activeCycles.add(k)
    const id = assign(t)
    if (!id) continue
    const m = byTracker.get(id) ?? new Map<string, number>()
    m.set(k, (m.get(k) ?? 0) + t.amount)
    byTracker.set(id, m)
  }
  return { byTracker, activeCycles }
}

export function spentIn(idx: SpendIndex, trackerId: string, cycle: string): number {
  return Math.max(0, idx.byTracker.get(trackerId)?.get(cycle) ?? 0)
}

/**
 * Unused money carried in from the previous cycle, for trackers with rollover on.
 * Only one cycle carries over (no snowballing), only unused money (overspending isn't
 * deducted), and only if last cycle has data, so the month before you started doesn't
 * count as a full unspent budget.
 */
export function carryIn(tracker: Tracker, cycle: string, idx: SpendIndex): number {
  if (!tracker.rollover) return 0
  const prev = shiftCycle(cycle, -1)
  if (!idx.activeCycles.has(prev)) return 0
  return Math.max(0, Math.round((tracker.budget - spentIn(idx, tracker.id, prev)) * 100) / 100)
}

/** Consecutive cycles, ending at `lastCycle`, where the tracker stayed within budget. */
export function streak(tracker: Tracker, lastCycle: string, idx: SpendIndex): number {
  let n = 0
  for (let k = lastCycle; idx.activeCycles.has(k) && n < 120; k = shiftCycle(k, -1)) {
    if (spentIn(idx, tracker.id, k) > tracker.budget + carryIn(tracker, k, idx) + 0.005) break
    n++
  }
  return n
}

export interface BudgetSuggestion {
  tracker: Tracker
  /** Average spend over the sampled cycles. */
  average: number
  /** Average rounded up to a whole number of units. */
  suggested: number
  cycles: number
}

/** Suggest budgets from the average of up to `lookback` cycles before `currentCycle` that have data. */
export function suggestBudgets(trackers: Tracker[], idx: SpendIndex, currentCycle: string, lookback = 3): BudgetSuggestion[] {
  const cycles: string[] = []
  for (let i = 1; i <= 24 && cycles.length < lookback; i++) {
    const k = shiftCycle(currentCycle, -i)
    if (idx.activeCycles.has(k)) cycles.push(k)
  }
  if (!cycles.length) return []
  return trackers.flatMap((t) => {
    const average = cycles.reduce((s, k) => s + spentIn(idx, t.id, k), 0) / cycles.length
    if (average <= 0 || t.unitCost <= 0) return []
    const suggested = Math.ceil(average / t.unitCost - 1e-9) * t.unitCost
    return [{ tracker: t, average, suggested, cycles: cycles.length }]
  })
}

export interface DailyPace {
  daysLeft: number
  perDay: number
  /** "1 drink every N days" when there's less than one unit a day. */
  everyNDays: number | null
  /** "N drinks a day" when there's at least one a day. */
  unitsPerDay: number | null
}

export function dailyPace(remaining: number, unitCost: number, daysLeft: number): DailyPace | null {
  if (daysLeft <= 0 || remaining <= 0) return null
  const perDay = remaining / daysLeft
  const units = unitCost > 0 ? Math.floor(remaining / unitCost) : 0
  if (units <= 0) return { daysLeft, perDay, everyNDays: null, unitsPerDay: null }
  return units >= daysLeft
    ? { daysLeft, perDay, everyNDays: null, unitsPerDay: Math.floor(units / daysLeft) }
    : { daysLeft, perDay, everyNDays: Math.max(1, Math.round(daysLeft / units)), unitsPerDay: null }
}
