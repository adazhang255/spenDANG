import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_TRACKERS } from '../lib/trackers'
import type { AppData, Settings, Tracker, Transaction } from '../lib/types'

const STORAGE_KEY = 'spendang:v1'

const DEFAULT_DATA: AppData = {
  transactions: [],
  trackers: DEFAULT_TRACKERS,
  settings: { cycleStartDay: 1, theme: 'system' },
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_DATA
    const parsed = JSON.parse(raw) as Partial<AppData>
    return {
      transactions: parsed.transactions ?? [],
      trackers: parsed.trackers ?? DEFAULT_TRACKERS,
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

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }))
  }, [])

  const resetAll = useCallback(() => setData(DEFAULT_DATA), [])

  return { data, addTransactions, updateTransaction, deleteTransactions, saveTracker, deleteTracker, updateSettings, resetAll }
}

export type AppStore = ReturnType<typeof useAppData>
