import { LEGACY_COLORS } from './colors'
import { toCSV, txKey } from './csv'
import { LEGACY_EMOJI_ICONS } from './icons'
import { DEFAULT_TRACKERS } from './trackers'
import { COLORS, type AppData, type ColorKey, type ResolvedTransaction, type Tracker } from './types'

export const STORAGE_KEY = 'spendang:v1'
const BACKUP_APP = 'spenDANG'
const BACKUP_VERSION = 1

export const DEFAULT_DATA: AppData = {
  transactions: [],
  trackers: DEFAULT_TRACKERS,
  goals: [],
  rules: [],
  settings: { cycleStartDay: 1, theme: 'system', trackerView: 'cards' },
}

function migrateColor(c: string): ColorKey {
  return (COLORS as readonly string[]).includes(c) ? (c as ColorKey) : (LEGACY_COLORS[c] ?? 'violet')
}

/** Trackers saved by older versions used `emoji` and had no group. */
function migrateTracker(t: Tracker & { emoji?: string }): Tracker {
  const defaults = DEFAULT_TRACKERS.find((d) => d.id === t.id)
  const { emoji, ...rest } = t
  return {
    ...rest,
    icon: t.icon ?? defaults?.icon ?? (emoji && LEGACY_EMOJI_ICONS[emoji]) ?? 'sparkles',
    group: t.group ?? defaults?.group ?? 'Other',
    color: migrateColor(t.color),
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

/** Bring any saved or restored data up to the current shape, dropping malformed records. */
export function migrate(raw: unknown): AppData {
  const p = isObj(raw) ? raw : {}
  const arr = (v: unknown) => (Array.isArray(v) ? v.filter(isObj) : [])
  return {
    transactions: arr(p.transactions).filter(
      (t) => typeof t.id === 'string' && typeof t.date === 'string' && typeof t.description === 'string' && typeof t.amount === 'number',
    ) as unknown as AppData['transactions'],
    trackers: Array.isArray(p.trackers) ? (arr(p.trackers) as unknown as Tracker[]).map(migrateTracker) : DEFAULT_TRACKERS,
    goals: arr(p.goals).map((g) => ({ ...g, contributions: arr(g.contributions) })) as unknown as AppData['goals'],
    rules: arr(p.rules).filter((r) => typeof r.merchant === 'string') as unknown as AppData['rules'],
    settings: { ...DEFAULT_DATA.settings, ...(isObj(p.settings) ? p.settings : {}) },
  }
}

export function makeBackup(data: AppData, now = new Date()): string {
  return JSON.stringify({ app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), data }, null, 2)
}

/** Parse a backup file. Throws with a readable message if it isn't one. */
export function parseBackup(text: string): AppData {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error("That file isn't valid JSON.")
  }
  if (isObj(json) && json.app === BACKUP_APP && isObj(json.data)) return migrate(json.data)
  // Also accept the raw localStorage blob.
  if (isObj(json) && Array.isArray(json.transactions)) return migrate(json)
  throw new Error("That file isn't a spenDANG backup.")
}

export interface MergeResult {
  data: AppData
  added: { transactions: number; trackers: number; goals: number; rules: number }
}

/**
 * Combine a backup with the data already here. What's here wins on any conflict;
 * transactions are matched by id, then by date + description + amount, so restoring
 * a backup that came from another device doesn't double anything up.
 */
export function mergeData(current: AppData, incoming: AppData): MergeResult {
  const ids = new Set(current.transactions.map((t) => t.id))
  const unmatched = new Map<string, string[]>()
  for (const t of current.transactions) unmatched.set(txKey(t), [...(unmatched.get(txKey(t)) ?? []), t.id])

  // Incoming id -> id of the transaction it duplicates here, so payback links survive.
  const sameAs = new Map<string, string>()
  const newTxs: AppData['transactions'] = []
  for (const t of incoming.transactions) {
    if (ids.has(t.id)) {
      sameAs.set(t.id, t.id)
      continue
    }
    const match = unmatched.get(txKey(t))?.shift()
    if (match) sameAs.set(t.id, match)
    else newTxs.push(t)
  }
  const linked = newTxs.map((t) => (t.paybackFor && sameAs.has(t.paybackFor) ? { ...t, paybackFor: sameAs.get(t.paybackFor) } : t))

  const trackerIds = new Set(current.trackers.map((t) => t.id))
  const newTrackers = incoming.trackers.filter((t) => !trackerIds.has(t.id))

  const incomingGoals = new Map(incoming.goals.map((g) => [g.id, g]))
  const goals = current.goals.map((g) => {
    const other = incomingGoals.get(g.id)
    if (!other) return g
    const have = new Set(g.contributions.map((c) => c.id))
    return { ...g, contributions: [...g.contributions, ...other.contributions.filter((c) => !have.has(c.id))] }
  })
  const goalIds = new Set(current.goals.map((g) => g.id))
  const newGoals = incoming.goals.filter((g) => !goalIds.has(g.id))

  const merchants = new Set(current.rules.map((r) => r.merchant))
  const newRules = incoming.rules.filter((r) => !merchants.has(r.merchant))

  return {
    data: {
      transactions: [...current.transactions, ...linked],
      trackers: [...current.trackers, ...newTrackers],
      goals: [...goals, ...newGoals],
      rules: [...current.rules, ...newRules],
      settings: current.settings,
    },
    added: { transactions: linked.length, trackers: newTrackers.length, goals: newGoals.length, rules: newRules.length },
  }
}

export function transactionsCSV(txs: ResolvedTransaction[], trackerName: (t: ResolvedTransaction) => string): string {
  const rows: (string | number)[][] = [['Date', 'Description', 'Note', 'Amount', 'Counted as spending', 'Category', 'Tracker']]
  for (const t of [...txs].sort((a, b) => a.date.localeCompare(b.date))) {
    rows.push([t.date, t.description, t.note ?? '', (t.fullAmount ?? t.amount).toFixed(2), t.amount.toFixed(2), t.category, trackerName(t)])
  }
  return toCSV(rows)
}
