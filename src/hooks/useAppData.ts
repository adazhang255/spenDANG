import { useCallback, useEffect, useState } from 'react'
import { LEGACY_COLORS } from '../lib/colors'
import { LEGACY_EMOJI_ICONS } from '../lib/icons'
import { DEFAULT_TRACKERS } from '../lib/trackers'
import { COLORS, type AppData, type ColorKey, type Contribution, type Goal, type Settings, type Tracker, type Transaction } from '../lib/types'

const STORAGE_KEY = 'spendang:v1'

const DEFAULT_DATA: AppData = {
  transactions: [],
  trackers: DEFAULT_TRACKERS,
  goals: [],
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

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_DATA
    const parsed = JSON.parse(raw) as Partial<AppData>
    return {
      transactions: parsed.transactions ?? [],
      trackers: (parsed.trackers ?? DEFAULT_TRACKERS).map(migrateTracker),
      goals: parsed.goals ?? [],
      settings: { ...DEFAULT_DATA.settings, ...parsed.settings },
    }
  } catch {
    return DEFAULT_DATA
  }
}

/** All app state, persisted to localStorage. Nothing ever leaves the browser. */
export function useAppData() {
  const [data, setData] = useState<AppData>(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // Storage full or blocked (private mode) — the app still works for this session.
    }
  }, [data])

  const addTransactions = useCallback((txs: Transaction[]) => {
    setData((d) => ({ ...d, transactions: [...d.transactions, ...txs] }))
  }, [])

  const updateTransaction = useCallback((id: string, patch: Partial<Transaction>) => {
    setData((d) => ({ ...d, transactions: d.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))
  }, [])

  const deleteTransactions = useCallback((ids: string[]) => {
    const drop = new Set(ids)
    setData((d) => ({ ...d, transactions: d.transactions.filter((t) => !drop.has(t.id)) }))
  }, [])

  const saveTracker = useCallback((tracker: Tracker) => {
    setData((d) => {
      const exists = d.trackers.some((t) => t.id === tracker.id)
      return {
        ...d,
        trackers: exists ? d.trackers.map((t) => (t.id === tracker.id ? tracker : t)) : [...d.trackers, tracker],
      }
    })
  }, [])

  const deleteTracker = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      trackers: d.trackers.filter((t) => t.id !== id),
      // Manual pins to a deleted tracker fall back to auto-matching.
      transactions: d.transactions.map((t) => (t.trackerId === id ? { ...t, trackerId: undefined } : t)),
    }))
  }, [])

  const saveGoal = useCallback((goal: Goal) => {
    setData((d) => {
      const exists = d.goals.some((g) => g.id === goal.id)
      return { ...d, goals: exists ? d.goals.map((g) => (g.id === goal.id ? goal : g)) : [...d.goals, goal] }
    })
  }, [])

  const deleteGoal = useCallback((id: string) => {
    setData((d) => ({ ...d, goals: d.goals.filter((g) => g.id !== id) }))
  }, [])

  const addContribution = useCallback((goalId: string, c: Contribution) => {
    setData((d) => ({ ...d, goals: d.goals.map((g) => (g.id === goalId ? { ...g, contributions: [...g.contributions, c] } : g)) }))
  }, [])

  const removeContribution = useCallback((goalId: string, contributionId: string) => {
    setData((d) => ({
      ...d,
      goals: d.goals.map((g) => (g.id === goalId ? { ...g, contributions: g.contributions.filter((c) => c.id !== contributionId) } : g)),
    }))
  }, [])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }))
  }, [])

  const resetAll = useCallback(() => setData(DEFAULT_DATA), [])

  return {
    data,
    addTransactions,
    updateTransaction,
    deleteTransactions,
    saveTracker,
    deleteTracker,
    saveGoal,
    deleteGoal,
    addContribution,
    removeContribution,
    updateSettings,
    resetAll,
  }
}

export type AppStore = ReturnType<typeof useAppData>
