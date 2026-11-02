export const CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Transport',
  'Entertainment',
  'Shopping',
  'Subscriptions',
  'Utilities',
  'Housing',
  'Health',
  'Education',
  'Income',
  'Transfers',
  'Other',
] as const

export type Category = (typeof CATEGORIES)[number]

/** Categories that move money around rather than represent spending. */
export const NON_SPENDING: ReadonlySet<Category> = new Set<Category>(['Income', 'Transfers'])

export interface Transaction {
  id: string
  /** ISO date, YYYY-MM-DD */
  date: string
  description: string
  /** Positive = money spent, negative = money in (refund, income, payment). */
  amount: number
  category: Category
  source: 'import' | 'manual'
  /** Explicit tracker assignment. `undefined` = auto-match, `'none'` = never count toward a tracker. */
  trackerId?: string
}

export const COLORS = ['pink', 'peach', 'lemon', 'mint', 'sky', 'lavender'] as const
export type ColorKey = (typeof COLORS)[number]

export interface Tracker {
  id: string
  name: string
  emoji: string
  color: ColorKey
  /** Monthly (per-cycle) budget in dollars. */
  budget: number
  /** Cost of one "time" in dollars. */
  unitCost: number
  /** Singular noun for one unit, e.g. "coffee". */
  unit: string
  /** Description keywords that route a transaction here (checked before categories). */
  keywords: string[]
  /** Categories that route a transaction here. */
  categories: Category[]
}

export type Theme = 'light' | 'dark' | 'system'

export interface Settings {
  /** Day of month a billing cycle starts on (1–28). 1 = calendar months. */
  cycleStartDay: number
  theme: Theme
}

export interface AppData {
  transactions: Transaction[]
  trackers: Tracker[]
  settings: Settings
}
