import {
  ArrowDownToLine,
  ChartColumn,
  Check,
  ChevronLeft,
  ChevronRight,
  Flag,
  LayoutGrid,
  List,
  Lock,
  Moon,
  Plus,
  Receipt,
  Settings as SettingsIcon,
  Sun,
  Target,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Activity } from './components/Activity'
import { Breakdown } from './components/Breakdown'
import { Confetti } from './components/Confetti'
import { Goals } from './components/Goals'
import { ImportPanel } from './components/ImportPanel'
import { TrackerCard } from './components/TrackerCard'
import { TrackerEditor } from './components/TrackerEditor'
import { TrackerList } from './components/TrackerList'
import { Button, Card, EmptyState, Field, IconButton, Modal, Segmented, cx, inputClass } from './components/ui'
import { useAppData } from './hooks/useAppData'
import { dedupe } from './lib/csv'
import { cycleEnd, cycleKey, cycleLabel, cycleProgress, inCycle, shiftCycle } from './lib/cycles'
import { inTrackerUnits } from './lib/goals'
import { makeTrackerAssigner, trackerGroups, trackerStats, type TrackerStats } from './lib/trackers'
import type { Goal, Theme, Tracker, Transaction } from './lib/types'
import { money, plural, todayISO, uid } from './lib/util'

type Tab = 'trackers' | 'goals' | 'breakdown' | 'activity' | 'import'

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'trackers', label: 'Trackers', icon: Target },
  { id: 'goals', label: 'Goals', icon: Flag },
  { id: 'breakdown', label: 'Breakdown', icon: ChartColumn },
  { id: 'activity', label: 'Activity', icon: Receipt },
  { id: 'import', label: 'Import', icon: ArrowDownToLine },
]

const ALL = '__all__'

interface Toast {
  id: string
  message: string
  undo?: () => void
}

export default function App() {
  const store = useAppData()
  const { transactions, trackers, goals, settings } = store.data
  const today = todayISO()
  const currentCycle = cycleKey(today, settings.cycleStartDay)

  const [tab, setTab] = useState<Tab>(() => (transactions.length ? 'trackers' : 'import'))
  const [cycle, setCycle] = useState(currentCycle)
  const [groupFilter, setGroupFilter] = useState(ALL)
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

  const groups = useMemo(() => trackerGroups(trackers), [trackers])
  // Fall back to "All" if the selected group disappears (last tracker moved or deleted).
  const activeGroup = groupFilter !== ALL && groups.includes(groupFilter) ? groupFilter : ALL

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

  const visibleGroups = useMemo(
    () =>
      (activeGroup === ALL ? groups : [activeGroup]).map((name) => ({
        name,
        trackers: trackers.filter((t) => (t.group.trim() || 'Other') === name),
      })),
    [groups, activeGroup, trackers],
  )

  const cycleEnded = cycleEnd(cycle) < today
  const progress = cycleProgress(cycle, today)
  const logDate = inCycle(today, cycle) ? today : cycleEnded ? cycleEnd(cycle) : cycle

  const showToast = useCallback((message: string, undo?: () => void) => setToast({ id: uid(), message, undo }), [])

  const logOne = (tracker: Tracker) => {
    const tx: Transaction = {
      id: uid(),
      date: logDate,
      description: tracker.name,
      amount: tracker.unitCost,
      category: tracker.categories[0] ?? 'Other',
      source: 'manual',
      trackerId: tracker.id,
    }
    store.addTransactions([tx])
    const left = (stats.get(tracker.id)?.timesLeft ?? 0) - 1
    showToast(
      left >= 0 ? `Logged 1 ${tracker.unit}. ${left} ${plural(tracker.unit, left)} left.` : `Logged 1 ${tracker.unit}. You're over budget.`,
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
      `Imported ${added.length} ${plural('transaction', added.length)}${skipped ? `, skipped ${skipped} duplicates` : ''}`,
      added.length ? () => store.deleteTransactions(added.map((t) => t.id)) : undefined,
    )
  }

  return (
    <div className="mx-auto min-h-dvh max-w-6xl px-4 pb-28 pt-5 sm:px-6 sm:pb-12">
      <header className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          spen<span className="relative px-0.5 before:absolute before:inset-x-0 before:bottom-1 before:-z-10 before:h-3 before:-rotate-1 before:rounded-sm before:bg-lime-300 dark:before:bg-lime-400/70">DANG</span>
        </h1>
        <div className="flex items-center gap-1">
          <ThemeToggle theme={settings.theme} onChange={(theme) => store.updateSettings({ theme })} />
          <IconButton icon={SettingsIcon} label="Settings" onClick={() => setSettingsOpen(true)} />
        </div>
      </header>

      <nav className="mt-5 hidden border-b border-zinc-200 sm:flex dark:border-white/10">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cx(
              '-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition',
              tab === t.id ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100' : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
            )}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </nav>

      {(tab === 'trackers' || tab === 'breakdown' || tab === 'activity') && (
        <div className="mt-5 flex items-center justify-between gap-2">
          <div>
            <div className="font-display text-2xl font-bold tracking-tight">{cycleLabel(cycle)}</div>
            <div className="text-[13px] text-zinc-500 dark:text-zinc-400">
              {cycle === currentCycle ? `${Math.round(progress * 100)}% through this cycle` : cycleEnded ? 'Finished cycle' : 'Upcoming cycle'}
              {cycle !== currentCycle && (
                <button onClick={() => setCycle(currentCycle)} className="ml-2 font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100">
                  Back to now
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <IconButton icon={ChevronLeft} label="Previous cycle" className="border border-zinc-200 dark:border-white/10" onClick={() => setCycle((c) => shiftCycle(c, -1))} />
            <IconButton icon={ChevronRight} label="Next cycle" className="border border-zinc-200 dark:border-white/10" onClick={() => setCycle((c) => shiftCycle(c, 1))} />
          </div>
        </div>
      )}

      <main className="mt-5 animate-rise" key={tab}>
        {tab === 'trackers' && (
          <div className="space-y-5">
            {!transactions.length && (
              <Card className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-semibold">Your trackers are set up</div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">Import a statement to fill them with real spending, or log a purchase with the + button.</div>
                </div>
                <Button icon={ArrowDownToLine} onClick={() => setTab('import')}>
                  Import statement
                </Button>
              </Card>
            )}

            <LeftoverCard
              key={celebrateKey}
              cycle={cycle}
              trackers={trackers}
              stats={stats}
              goals={goals}
              cycleEnded={cycleEnded}
              celebrate={celebrateKey > 0}
              onSweep={(goal, amount) => {
                const id = uid()
                store.addContribution(goal.id, { id, date: today, amount, note: `Leftover from ${cycleLabel(cycle)}`, fromCycle: cycle })
                showToast(`Moved ${money(amount)} to ${goal.name}`, () => store.removeContribution(goal.id, id))
              }}
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Tracker groups">
                {[ALL, ...groups].map((g) => {
                  const count = g === ALL ? trackers.length : trackers.filter((t) => (t.group.trim() || 'Other') === g).length
                  const active = activeGroup === g
                  return (
                    <button
                      key={g}
                      role="tab"
                      aria-selected={active}
                      onClick={() => setGroupFilter(g)}
                      className={cx(
                        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition',
                        active
                          ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                          : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 dark:border-white/10 dark:bg-transparent dark:text-zinc-300',
                      )}
                    >
                      {g === ALL ? 'All' : g}
                      <span className={cx('tabular-nums', active ? 'opacity-60' : 'text-zinc-400')}>{count}</span>
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center gap-2">
                <Segmented
                  value={settings.trackerView}
                  onChange={(trackerView) => store.updateSettings({ trackerView })}
                  options={[
                    { value: 'cards', title: 'Card view', label: <LayoutGrid className="size-4" /> },
                    { value: 'list', title: 'List view', label: <List className="size-4" /> },
                  ]}
                />
                <Button icon={Plus} onClick={() => setEditing(null)}>
                  New tracker
                </Button>
              </div>
            </div>

            {!trackers.length ? (
              <Card>
                <EmptyState icon={Target} title="No trackers">
                  Create one for anything you want to count: boba runs, thrift trips, concerts.
                </EmptyState>
              </Card>
            ) : settings.trackerView === 'list' ? (
              <TrackerList groups={visibleGroups} stats={stats} showGroupHeaders={activeGroup === ALL && groups.length > 1} onLog={logOne} onEdit={setEditing} />
            ) : (
              visibleGroups.map((g) => (
                <section key={g.name} className="space-y-3">
                  {(activeGroup === ALL ? groups.length > 1 : true) && <GroupHeader name={g.name} trackers={g.trackers} stats={stats} />}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {g.trackers.map((t) => (
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
                  </div>
                </section>
              ))
            )}
          </div>
        )}
        {tab === 'goals' && (
          <Goals
            goals={goals}
            trackers={trackers}
            onSave={store.saveGoal}
            onDelete={store.deleteGoal}
            onContribute={store.addContribution}
            onRemoveContribution={store.removeContribution}
          />
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
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden dark:border-white/10 dark:bg-ink/95">
        <div className="grid grid-cols-5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cx('flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition', tab === t.id ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400')}
            >
              <t.icon className="size-5" strokeWidth={tab === t.id ? 2.4 : 1.8} />
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {toast && (
        <div
          key={toast.id}
          className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl bg-zinc-900 px-4 py-3 text-sm text-white shadow-lg animate-rise sm:bottom-6 dark:bg-zinc-100 dark:text-zinc-900"
          role="status"
        >
          <span>{toast.message}</span>
          {toast.undo && (
            <button
              className="shrink-0 font-semibold text-lime-300 hover:underline dark:text-lime-700"
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

      <TrackerEditor
        tracker={editing}
        groups={groups}
        defaultGroup={activeGroup === ALL ? undefined : activeGroup}
        onSave={store.saveTracker}
        onDelete={store.deleteTracker}
        onClose={() => setEditing(undefined)}
      />

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Settings">
        <div className="space-y-5">
          <Field label="Billing cycle starts on day" hint="Match your card's statement date. Day 1 means regular calendar months.">
            <select className={inputClass} value={settings.cycleStartDay} onChange={(e) => store.updateSettings({ cycleStartDay: +e.target.value })}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d === 1 ? '1st (calendar month)' : `${d}${d === 2 || d === 22 ? 'nd' : d === 3 || d === 23 ? 'rd' : d === 21 ? 'st' : 'th'}`}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Theme">
            <select className={inputClass} value={settings.theme} onChange={(e) => store.updateSettings({ theme: e.target.value as Theme })}>
              <option value="system">Match my device</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </Field>
          <div className="flex gap-2.5 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600 dark:bg-white/[0.03] dark:text-zinc-300">
            <Lock className="mt-0.5 size-4 shrink-0" />
            <span>
              Your data stays in this browser. {transactions.length} {plural('transaction', transactions.length)}, {trackers.length} {plural('tracker', trackers.length)} and {goals.length}{' '}
              {plural('goal', goals.length)} stored.
            </span>
          </div>
          <Button
            variant="danger"
            onClick={() => {
              if (confirm('Erase all transactions, trackers and goals? This cannot be undone.')) {
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

function GroupHeader({ name, trackers, stats }: { name: string; trackers: Tracker[]; stats: Map<string, TrackerStats> }) {
  const budget = trackers.reduce((s, t) => s + t.budget, 0)
  const left = trackers.reduce((s, t) => s + (stats.get(t.id)?.remaining ?? 0), 0)
  return (
    <div className="flex items-baseline justify-between gap-2">
      <h2 className="font-display text-lg font-bold tracking-tight">{name}</h2>
      <span className={cx('text-[13px] tabular-nums', left < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-500 dark:text-zinc-400')}>
        {left < 0 ? `${money(-left)} over a ${money(budget, true)} budget` : `${money(left)} left of ${money(budget, true)}`}
      </span>
    </div>
  )
}

/** Remaining tracker money, translated into units, with the option to sweep a finished cycle's leftovers into a goal. */
function LeftoverCard({
  cycle,
  trackers,
  stats,
  goals,
  cycleEnded,
  celebrate,
  onSweep,
}: {
  cycle: string
  trackers: Tracker[]
  stats: Map<string, TrackerStats>
  goals: Goal[]
  cycleEnded: boolean
  celebrate: boolean
  onSweep: (goal: Goal, amount: number) => void
}) {
  const [goalId, setGoalId] = useState('')
  if (!trackers.length) return null
  const left = Math.round(trackers.reduce((s, t) => s + Math.max(0, stats.get(t.id)?.remaining ?? 0), 0) * 100) / 100
  const allUnder = trackers.every((t) => (stats.get(t.id)?.remaining ?? 0) >= 0)
  const anySpent = trackers.some((t) => (stats.get(t.id)?.spent ?? 0) > 0)
  const units = inTrackerUnits(left, trackers, 3)
  const swept = goals.flatMap((g) => g.contributions.filter((c) => c.fromCycle === cycle).map((c) => ({ goal: g, c })))
  const target = goals.find((g) => g.id === goalId) ?? goals[0]

  return (
    <Card className="relative">
      {celebrate && allUnder && anySpent && <Confetti count={26} />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[13px] text-zinc-500 dark:text-zinc-400">{cycleEnded ? 'Left over from this cycle' : 'Left to spend this cycle'}</div>
          <div className="mt-0.5 font-display text-4xl font-bold tracking-tight tabular-nums">{money(left)}</div>
          {units && <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">That's {units}.</p>}
          {cycleEnded && allUnder && anySpent && <p className="mt-1 text-sm font-medium text-lime-700 dark:text-lime-300">You stayed under on every tracker.</p>}
        </div>

        {cycleEnded && left > 0 && goals.length > 0 && (
          <div className="w-full sm:w-auto">
            {swept.length ? (
              <div className="inline-flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-white/[0.04]">
                <Check className="size-4 text-lime-600 dark:text-lime-400" />
                Moved {money(swept.reduce((s, x) => s + x.c.amount, 0))} to {swept.map((x) => x.goal.name).join(', ')}
              </div>
            ) : (
              <div className="flex gap-2">
                <select className={cx(inputClass, 'sm:w-44')} value={target.id} onChange={(e) => setGoalId(e.target.value)} aria-label="Goal to move leftovers to">
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <Button className="shrink-0" onClick={() => onSweep(target, left)}>
                  Move to goal
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  return <IconButton icon={isDark ? Moon : Sun} label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => onChange(isDark ? 'light' : 'dark')} />
}

function useTheme(theme: Theme) {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'system' && mq.matches))
    apply()
    if (theme !== 'system') return
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}
