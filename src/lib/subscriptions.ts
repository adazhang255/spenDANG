import { merchantKey, merchantName } from './categorize'
import { addMonth, daysBetween } from './cycles'
import { NON_SPENDING, type Category, type Transaction } from './types'

export interface Subscription {
  key: string
  name: string
  /** Latest charge amount. */
  amount: number
  lastDate: string
  /** Expected next charge, one month after the last. */
  nextDate: string
  /** Number of matching monthly charges seen. */
  count: number
  category: Category
}

const MIN_GAP = 25
const MAX_GAP = 35
/** Stop listing a subscription if it hasn't charged in this many days. */
const STALE_AFTER = 40

/**
 * Spot recurring monthly charges: the same merchant charging about the same amount
 * (within 10% or $1) roughly a month apart. Three charges are required, except for
 * merchants already categorized as subscriptions or bills, where two are enough.
 */
export function findSubscriptions(txs: Transaction[], today: string): Subscription[] {
  const byMerchant = new Map<string, Transaction[]>()
  for (const t of txs) {
    if (t.amount <= 0 || NON_SPENDING.has(t.category)) continue
    const k = merchantKey(t.description)
    byMerchant.set(k, [...(byMerchant.get(k) ?? []), t])
  }

  const out: Subscription[] = []
  for (const [key, charges] of byMerchant) {
    if (charges.length < 2) continue
    charges.sort((a, b) => a.date.localeCompare(b.date))
    const latest = charges[charges.length - 1]
    const tolerance = Math.max(1, latest.amount * 0.1)
    const similar = charges.filter((c) => Math.abs(c.amount - latest.amount) <= tolerance)
    const recent = similar.slice(-3)
    const billLike = latest.category === 'Subscriptions' || latest.category === 'Utilities'
    if (recent.length < (billLike ? 2 : 3)) continue

    const monthly = recent.slice(1).every((c, i) => {
      const gap = daysBetween(recent[i].date, c.date)
      return gap >= MIN_GAP && gap <= MAX_GAP
    })
    if (!monthly || daysBetween(latest.date, today) > STALE_AFTER) continue

    out.push({
      key,
      name: merchantName(latest.description),
      amount: latest.amount,
      lastDate: latest.date,
      nextDate: addMonth(latest.date),
      count: similar.length,
      category: latest.category,
    })
  }
  return out.sort((a, b) => a.nextDate.localeCompare(b.nextDate))
}
