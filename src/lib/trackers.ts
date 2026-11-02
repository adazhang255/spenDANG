import { keywordMatcher, matchesAny, normalize } from './categorize'
import { NON_SPENDING, type Tracker, type Transaction } from './types'

export const DEFAULT_TRACKERS: Tracker[] = [
  {
    id: 'eating-out',
    name: 'Eating Out',
    emoji: '🍜',
    color: 'peach',
    budget: 150,
    unitCost: 15,
    unit: 'meal',
    keywords: [],
    categories: ['Food & Dining'],
  },
  {
    id: 'coffee-boba',
    name: 'Coffee & Boba',
    emoji: '🧋',
    color: 'lavender',
    budget: 40,
    unitCost: 5,
    unit: 'drink',
    keywords: [
      'starbucks', 'dunkin', 'coffee', 'cafe', 'boba', 'tea', 'kung fu tea', 'gong cha', 'sharetea', 'tiger sugar',
      'peets', 'blue bottle', 'philz', 'dutch bros', 'tim hortons', 'latte', 'espresso',
    ],
    categories: [],
  },
  {
    id: 'fun',
    name: 'Entertainment & Fun',
    emoji: '🎟️',
    color: 'mint',
    budget: 80,
    unitCost: 20,
    unit: 'hangout',
    keywords: [],
    categories: ['Entertainment'],
  },
]

/**
 * Decide which tracker (if any) a transaction counts toward. Explicit assignments win; then
 * keyword matches across all trackers (so "Starbucks" lands in Coffee before the broader
 * Food & Dining category sends it to Eating Out); then category matches, in tracker order.
 */
export function makeTrackerAssigner(trackers: Tracker[]): (tx: Transaction) => string | null {
  const ids = new Set(trackers.map((t) => t.id))
  const compiled = trackers.map((t) => ({ id: t.id, matchers: t.keywords.filter(Boolean).map(keywordMatcher), cats: t.categories }))
  return (tx) => {
    if (tx.trackerId === 'none') return null
    if (tx.trackerId && ids.has(tx.trackerId)) return tx.trackerId
    if (NON_SPENDING.has(tx.category)) return null
    const text = normalize(tx.description)
    for (const t of compiled) if (t.matchers.length && matchesAny(text, t.matchers)) return t.id
    for (const t of compiled) if (t.cats.includes(tx.category)) return t.id
    return null
  }
}

export interface TrackerStats {
  spent: number
  remaining: number
  /** Whole units still affordable. */
  timesLeft: number
  /** Whole units the full budget buys. */
  timesTotal: number
  /** Number of matching purchases this cycle. */
  count: number
  /** spent / budget, can exceed 1. */
  ratio: number
}

export function trackerStats(tracker: Tracker, txs: Transaction[]): TrackerStats {
  const spent = Math.max(0, txs.reduce((s, t) => s + t.amount, 0))
  const remaining = tracker.budget - spent
  const unit = tracker.unitCost > 0 ? tracker.unitCost : 1
  return {
    spent,
    remaining,
    timesLeft: Math.max(0, Math.floor((remaining + 1e-9) / unit)),
    timesTotal: Math.floor((tracker.budget + 1e-9) / unit),
    count: txs.filter((t) => t.amount > 0).length,
    ratio: tracker.budget > 0 ? spent / tracker.budget : spent > 0 ? 1 : 0,
  }
}
