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
  /** The user's own note, e.g. "boba with Jess". Kept separate so the bank's description stays intact for matching. */
  note?: string
  /** Positive = money spent, negative = money in (refund, income, payment). */
  amount: number
  category: Category
  source: 'import' | 'manual'
  /** Explicit tracker assignment. `undefined` = auto-match, `'none'` = never count toward a tracker. */
  trackerId?: string
  /** For a split expense: the part that's really yours. Overrides paybacks when set. */
  myShare?: number
  /** For money in: the id of the expense this repays (e.g. a friend's Venmo for dinner). */
  paybackFor?: string
  /** Fields the user set by hand, so a learned rule can leave them alone. */
  edited?: EditableField[]
}

export type EditableField = 'category' | 'trackerId'

/** A transaction after splits and paybacks are applied; `amount` is what counts as your spending. */
export interface ResolvedTransaction extends Transaction {
  /** The original bank amount, present only when it differs from `amount`. */
  fullAmount?: number
}

/** A personal rule learned from a correction: every transaction from `merchant` gets these values. */
export interface Rule {
  id: string
  /** Merchant key, see merchantKey() */
  merchant: string
  /** Human-friendly merchant name for display. */
  label: string
  category?: Category
  /** Tracker id or 'none' */
  trackerId?: string
}

export const COLORS = ['rose', 'orange', 'amber', 'emerald', 'sky', 'violet'] as const
export type ColorKey = (typeof COLORS)[number]

export interface Tracker {
  id: string
  name: string
  /** Key into the icon registry (src/lib/icons.ts). */
  icon: string
  color: ColorKey
  /** Free-form group used to organize trackers, e.g. "Food" or "Going out". */
  group: string
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
  /** Carry last cycle's unused money into this one. */
  rollover?: boolean
}

export interface Contribution {
  id: string
  /** ISO date */
  date: string
  amount: number
  note?: string
  /** Set when the money came from a finished cycle's tracker leftovers, so a cycle is only swept once. */
  fromCycle?: string
}

export interface Goal {
  id: string
  name: string
  icon: string
  color: ColorKey
  target: number
  /** Optional ISO date to hit the target by. */
  deadline?: string
  contributions: Contribution[]
}

export type Theme = 'light' | 'dark' | 'system'
export type TrackerView = 'cards' | 'list'

export interface Settings {
  /** Day of month a billing cycle starts on (1–28). 1 = calendar months. */
  cycleStartDay: number
  theme: Theme
  trackerView: TrackerView
}

export interface AppData {
  transactions: Transaction[]
  trackers: Tracker[]
  goals: Goal[]
  rules: Rule[]
  settings: Settings
}
