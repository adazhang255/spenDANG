import { useCallback, useEffect, useState } from 'react'
import { applyRuleToPast, upsertRule, type RuleScope } from '../lib/rules'
import { DEFAULT_DATA, STORAGE_KEY, migrate } from '../lib/storage'
import type { AppData, Contribution, Goal, Rule, Settings, Tracker, Transaction } from '../lib/types'

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? migrate(JSON.parse(raw)) : DEFAULT_DATA
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

  const saveTrackers = useCallback((updated: Tracker[]) => {
    const byId = new Map(updated.map((t) => [t.id, t]))
    setData((d) => ({ ...d, trackers: d.trackers.map((t) => byId.get(t.id) ?? t) }))
  }, [])

  /** Save a rule for this merchant and apply it to existing transactions from them, as far as `scope` allows. */
  const learnRule = useCallback((rule: Omit<Rule, 'id'>, scope: RuleScope) => {
    setData((d) => ({
      ...d,
      rules: upsertRule(d.rules, rule),
      transactions: applyRuleToPast(d.transactions, rule, scope),
    }))
  }, [])

  const deleteRule = useCallback((id: string) => {
    setData((d) => ({ ...d, rules: d.rules.filter((r) => r.id !== id) }))
  }, [])

  const replaceAll = useCallback((next: AppData) => setData(next), [])

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
    saveTrackers,
    learnRule,
    deleteRule,
    replaceAll,
    updateSettings,
    resetAll,
  }
}

export type AppStore = ReturnType<typeof useAppData>
