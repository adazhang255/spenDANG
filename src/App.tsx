import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Activity } from './components/Activity'
import { Breakdown } from './components/Breakdown'
import { Confetti } from './components/Confetti'
import { ImportPanel } from './components/ImportPanel'
import { TrackerCard } from './components/TrackerCard'
import { TrackerEditor } from './components/TrackerEditor'
import { Button, Card, Field, Modal, cx, inputClass } from './components/ui'
import { useAppData } from './hooks/useAppData'
import { dedupe } from './lib/csv'
import { cycleEnd, cycleKey, cycleLabel, cycleProgress, inCycle, shiftCycle } from './lib/cycles'
import { makeTrackerAssigner, trackerStats } from './lib/trackers'
import type { Tracker, Transaction } from './lib/types'
import { money, plural, todayISO, uid } from './lib/util'

type Tab = 'trackers' | 'breakdown' | 'activity' | 'import'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'trackers', label: 'Trackers', icon: '🎯' },
  { id: 'breakdown', label: 'Breakdown', icon: '📊' },
  { id: 'activity', label: 'Activity', icon: '🧾' },
  { id: 'import', label: 'Import', icon: '📥' },
]

interface Toast {
  id: string
  message: string
  undo?: () => void
}

export default function App() {
  const store = useAppData()
  const { transactions, trackers, settings } = store.data
  const today = todayISO()
  const currentCycle = cycleKey(today, settings.cycleStartDay)

  const [tab, setTab] = useState<Tab>(() => (transactions.length ? 'trackers' : 'import'))
  const [cycle, setCycle] = useState(currentCycle)
  const [editing, setEditing] = useState<Tracker | null | undefined>(undefined)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const [celebrateKey, setCelebrateKey] = useState(0)

  useTheme(settings.theme)

  // Re-anchor the viewed cycle when the cycle start day changes.
  const prevStart = useRef(settings.cycleStartDay)
  useEffect(() => {
    if (prevStart.current !== settings.cycleStartDay) {
      prevStart.current = settings.cycleStartDay
      setCycle((c) => cycleKey(c, settings.cycleStartDay))
    }
  }, [settings.cycleStartDay])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4500)
    return () => clearTimeout(t)
  }, [toast])

  const assign = useMemo(() => makeTrackerAssigner(trackers), [trackers])
  const cycleTxs = useMemo(() => transactions.filter((t) => inCycle(t.date, cycle)), [transactions, cycle])

  const stats = useMemo(() => {
    const buckets = new Map<string, Transaction[]>(trackers.map((t) => [t.id, []]))
    for (const t of cycleTxs) {
      const id = assign(t)
      if (id) buckets.get(id)?.push(t)
    }
    return new Map(trackers.map((t) => [t.id, trackerStats(t, buckets.get(t.id) ?? [])]))
  }, [trackers, cycleTxs, assign])

  const cycleEnded = cycleEnd(cycle) < today
  const progress = cycleProgress(cycle, today)
  const logDate = inCycle(today, cycle) ? today : cycleEnded ? cycleEnd(cycle) : cycle

  const showToast = useCallback((message: string, undo?: () => void) => setToast({ id: uid(), message, undo }), [])

  const logOne = (tracker: Tracker) => {
    const tx: Transaction = {
      id: uid(),
      date: logDate,
      description: `${tracker.emoji} ${tracker.name}`,
      amount: tracker.unitCost,
      category: tracker.categories[0] ?? 'Other',
      source: 'manual',
      trackerId: tracker.id,
    }
    store.addTransactions([tx])
    const left = (stats.get(tracker.id)?.timesLeft ?? 0) - 1
    showToast(
      left >= 0 ? `Logged 1 ${tracker.unit} · ${left} ${plural(tracker.unit, left)} left` : `Logged 1 ${tracker.unit} · over budget 😬`,
      () => store.deleteTransactions([tx.id]),
    )
  }

  const handleImport = (incoming: Transaction[]) => {
    const { added, skipped } = dedupe(transactions, incoming)
    store.addTransactions(added)
    if (added.length) {
      const latest = added.reduce((m, t) => (t.date > m ? t.date : m), added[0].date)
      setCycle(cycleKey(latest, settings.cycleStartDay))
      setCelebrateKey((k) => k + 1)
    }
    setTab('trackers')
    showToast(
      `Imported ${added.length} ${plural('transaction', added.length)}${skipped ? ` · ${skipped} duplicates skipped` : ''}`,
      added.length ? () => store.deleteTransactions(added.map((t) => t.id)) : undefined,
    )
  }

  return (
    <div className="mx-auto min-h-dvh max-w-6xl px-4 pb-28 pt-4 sm:px-6 sm:pb-12">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-violet-300 to-pink-300 text-xl font-extrabold text-violet-950 shadow-md shadow-violet-300/40 dark:shadow-none">$</div>
          <div>
            <h1 className="text-xl font-extrabold leading-none tracking-tight">
              spen<span className="text-violet-500 dark:text-violet-300">DANG</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">how many times can you?</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle theme={settings.theme} onChange={(theme) => store.updateSettings({ theme })} />
          <button onClick={() => setSettingsOpen(true)} className="grid size-10 place-items-center rounded-full text-lg hover:bg-violet-100 dark:hover:bg-white/10" aria-label="Settings">
            ⚙️
          </button>
        </div>
      </header>

      <nav className="mt-6 hidden gap-1 rounded-full bg-violet-100/70 p-1 sm:inline-flex dark:bg-white/5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cx(
              'rounded-full px-4 py-2 text-sm font-semibold transition',
              tab === t.id ? 'bg-white text-violet-700 shadow-sm dark:bg-white/15 dark:text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
            )}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </nav>

      {tab !== 'import' && (
        <div className="mt-5 flex items-center justify-between gap-2">
          <button onClick={() => setCycle((c) => shiftCycle(c, -1))} className="grid size-10 place-items-center rounded-full bg-white shadow-sm hover:bg-violet-50 dark:bg-white/5 dark:hover:bg-white/10" aria-label="Previous cycle">
            ‹
          </button>
          <div className="text-center">
            <div className="text-lg font-extrabold">{cycleLabel(cycle)}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {cycle === currentCycle ? `${Math.round(progress * 100)}% through this cycle` : cycleEnded ? 'Finished cycle' : 'Upcoming'}
              {cycle !== currentCycle && (
                <button onClick={() => setCycle(currentCycle)} className="ml-2 font-semibold text-violet-600 hover:underline dark:text-violet-300">
                  Back to now
                </button>
              )}
            </div>
          </div>
          <button onClick={() => setCycle((c) => shiftCycle(c, 1))} className="grid size-10 place-items-center rounded-full bg-white shadow-sm hover:bg-violet-50 dark:bg-white/5 dark:hover:bg-white/10" aria-label="Next cycle">
            ›
          </button>
        </div>
      )}

      <main className="mt-5 animate-rise" key={tab}>
        {tab === 'trackers' && (
          <div className="space-y-4">
            {!transactions.length && (
              <Card className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-bold">👋 Welcome! Your trackers are ready.</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Import a statement to fill them with real spending, or tap +1 whenever you treat yourself.</div>
                </div>
                <Button onClick={() => setTab('import')}>Import statement</Button>
              </Card>
            )}
            <SwapCard key={celebrateKey} trackers={trackers} stats={stats} cycleEnded={cycleEnded} celebrate={celebrateKey > 0} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trackers.map((t) => (
                <TrackerCard
                  key={t.id}
                  tracker={t}
                  stats={stats.get(t.id)!}
                  cycleEnded={cycleEnded}
                  cycleProgress={progress}
                  onLog={() => logOne(t)}
                  onEdit={() => setEditing(t)}
                />
              ))}
              <button
                onClick={() => setEditing(null)}
                className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-violet-200 text-slate-500 transition hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-violet-200"
              >
                <span className="text-3xl">＋</span>
                <span className="font-semibold">New tracker</span>
                <span className="text-xs">Boba runs, thrift trips, concerts…</span>
              </button>
            </div>
          </div>
        )}
        {tab === 'breakdown' && (
          <Breakdown cycle={cycle} cycleTxs={cycleTxs} allTxs={transactions} cycleStartDay={settings.cycleStartDay} onPickCycle={setCycle} />
        )}
        {tab === 'activity' && (
          <Activity
            txs={cycleTxs}
            trackers={trackers}
            assign={assign}
            defaultDate={logDate}
            onAdd={(t) => {
              store.addTransactions([t])
              if (!inCycle(t.date, cycle)) setCycle(cycleKey(t.date, settings.cycleStartDay))
              showToast('Transaction added', () => store.deleteTransactions([t.id]))
            }}
            onUpdate={store.updateTransaction}
            onDelete={(id) => {
              const t = transactions.find((x) => x.id === id)
              store.deleteTransactions([id])
              if (t) showToast('Transaction deleted', () => store.addTransactions([t]))
            }}
          />
        )}
        {tab === 'import' && <ImportPanel onImport={handleImport} />}
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-violet-100 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden dark:border-white/5 dark:bg-[#14121c]/90">
        <div className="grid grid-cols-4">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={cx('flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition', tab === t.id ? 'text-violet-600 dark:text-violet-300' : 'text-slate-400')}>
              <span className={cx('text-xl transition', tab === t.id && 'scale-110')}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {toast && (
        <div key={toast.id} className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white shadow-xl animate-rise sm:bottom-6 dark:bg-white dark:text-slate-900" role="status">
          <span>{toast.message}</span>
          {toast.undo && (
            <button
              className="shrink-0 font-bold text-violet-300 hover:underline dark:text-violet-600"
              onClick={() => {
                toast.undo?.()
                setToast(null)
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}

      <TrackerEditor tracker={editing} onSave={store.saveTracker} onDelete={store.deleteTracker} onClose={() => setEditing(undefined)} />

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Settings">
        <div className="space-y-5">
          <Field label="Billing cycle starts on day" hint="Match your card's statement date. Day 1 = regular calendar months.">
            <select className={inputClass} value={settings.cycleStartDay} onChange={(e) => store.updateSettings({ cycleStartDay: +e.target.value })}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d === 1 ? '1st (calendar month)' : `${d}${d === 2 || d === 22 ? 'nd' : d === 3 || d === 23 ? 'rd' : d === 21 ? 'st' : 'th'}`}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Theme">
            <select className={inputClass} value={settings.theme} onChange={(e) => store.updateSettings({ theme: e.target.value as typeof settings.theme })}>
              <option value="system">Match my device</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </Field>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-300">
            🔒 Your data lives only in this browser. {transactions.length} {plural('transaction', transactions.length)} stored.
          </div>
          <Button
            variant="danger"
            onClick={() => {
              if (confirm('Erase all transactions and reset trackers? This cannot be undone.')) {
                store.resetAll()
                setSettingsOpen(false)
                setTab('import')
              }
            }}
          >
            Erase everything
          </Button>
        </div>
      </Modal>
    </div>
  )
}

/** "Your leftover fun money = 9 drinks or 3 meals or 1 hangout" */
function SwapCard({ trackers, stats, cycleEnded, celebrate }: { trackers: Tracker[]; stats: Map<string, ReturnType<typeof trackerStats>>; cycleEnded: boolean; celebrate: boolean }) {
  if (!trackers.length) return null
  const left = trackers.reduce((s, t) => s + Math.max(0, stats.get(t.id)?.remaining ?? 0), 0)
  const allUnder = trackers.every((t) => (stats.get(t.id)?.remaining ?? 0) >= 0)
  const anySpent = trackers.some((t) => (stats.get(t.id)?.spent ?? 0) > 0)
  const swaps = trackers
    .filter((t) => t.unitCost > 0)
    .map((t) => {
      const n = Math.floor(left / t.unitCost)
      return `${n} ${plural(t.unit, n)}`
    })

  return (
    <Card className="relative overflow-visible bg-gradient-to-br from-violet-100 via-pink-50 to-amber-50 dark:from-violet-500/15 dark:via-pink-500/10 dark:to-amber-500/5">
      {celebrate && allUnder && anySpent && <Confetti count={24} />}
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{cycleEnded ? 'Left over this cycle' : 'Fun money left'}</div>
      <div className="mt-1 text-4xl font-extrabold tabular-nums">{money(left)}</div>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        That's {swaps.slice(0, -1).join(', ')}
        {swaps.length > 1 ? ' or ' : ''}
        <b>{swaps[swaps.length - 1]}</b>.
        {cycleEnded && allUnder && anySpent && ' You stayed under on every tracker 🎉'}
      </p>
    </Card>
  )
}

function ThemeToggle({ theme, onChange }: { theme: 'light' | 'dark' | 'system'; onChange: (t: 'light' | 'dark') => void }) {
  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  return (
    <button
      onClick={() => onChange(isDark ? 'light' : 'dark')}
      className="grid size-10 place-items-center rounded-full text-lg transition hover:rotate-12 hover:bg-violet-100 dark:hover:bg-white/10"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? '🌙' : '☀️'}
    </button>
  )
}

function useTheme(theme: 'light' | 'dark' | 'system') {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'system' && mq.matches))
    apply()
    if (theme !== 'system') return
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}
