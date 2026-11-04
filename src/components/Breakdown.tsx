import { CalendarX2, Repeat, TrendingDown, TrendingUp } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { cycleKey, cycleLabel, daysBetween, shiftCycle } from '../lib/cycles'
import { CATEGORY_ICONS } from '../lib/icons'
import type { Subscription } from '../lib/subscriptions'
import { NON_SPENDING, type Category, type Transaction } from '../lib/types'
import { money } from '../lib/util'
import { Card, EmptyState, cx } from './ui'

const HISTORY = 6

interface Props {
  cycle: string
  cycleTxs: Transaction[]
  allTxs: Transaction[]
  cycleStartDay: number
  subscriptions: Subscription[]
  today: string
  onPickCycle: (key: string) => void
}

export function Breakdown({ cycle, cycleTxs, allTxs, cycleStartDay, subscriptions, today, onPickCycle }: Props) {
  const spending = cycleTxs.filter((t) => !NON_SPENDING.has(t.category))
  const spent = spending.reduce((s, t) => s + t.amount, 0)
  const moneyIn = cycleTxs.filter((t) => t.category === 'Income').reduce((s, t) => s - t.amount, 0)
  const purchases = spending.filter((t) => t.amount > 0).length

  const byCategory = useMemo(() => {
    const m = new Map<Category, number>()
    for (const t of spending) m.set(t.category, (m.get(t.category) ?? 0) + t.amount)
    return [...m.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
  }, [spending])

  const topMerchants = useMemo(() => {
    const m = new Map<string, { total: number; count: number }>()
    for (const t of spending) {
      if (t.amount <= 0) continue
      // Drop trailing store numbers / reference codes: "AMZN Mktp US*2K39" -> "AMZN Mktp"
      const words = t.description.split(/\s+/)
      const cut = words.findIndex((w, i) => i > 0 && /\d/.test(w))
      const name = (cut > 0 ? words.slice(0, cut) : words).join(' ').replace(/[#*]+$/, '')
      const e = m.get(name) ?? { total: 0, count: 0 }
      m.set(name, { total: e.total + t.amount, count: e.count + 1 })
    }
    return [...m.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 5)
  }, [spending])

  const history = useMemo(() => {
    const totals = new Map<string, number>()
    for (const t of allTxs) {
      if (NON_SPENDING.has(t.category)) continue
      const k = cycleKey(t.date, cycleStartDay)
      totals.set(k, (totals.get(k) ?? 0) + t.amount)
    }
    return Array.from({ length: HISTORY }, (_, i) => {
      const k = shiftCycle(cycle, i - HISTORY + 1)
      return { key: k, total: Math.max(0, totals.get(k) ?? 0) }
    })
  }, [allTxs, cycle, cycleStartDay])

  const maxCat = byCategory[0]?.[1] ?? 1
  const maxHist = Math.max(1, ...history.map((h) => h.total))
  const prev = history[HISTORY - 2]?.total ?? 0
  const delta = prev > 0 ? (spent - prev) / prev : null

  if (!cycleTxs.length) {
    return (
      <Card>
        <EmptyState icon={CalendarX2} title={`Nothing in ${cycleLabel(cycle)} yet`}>
          Import a statement or step to another cycle with the arrows above.
        </EmptyState>
      </Card>
    )
  }

  const TopIcon = byCategory[0] ? CATEGORY_ICONS[byCategory[0][0]] : null

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="grid grid-cols-2 gap-3 lg:col-span-5 lg:grid-cols-4">
        <Stat label="Spent" value={money(spent)}>
          {delta !== null && (
            <span className="inline-flex items-center gap-1">
              {delta > 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              {Math.abs(delta * 100).toFixed(0)}% vs last cycle
            </span>
          )}
        </Stat>
        <Stat label="Money in" value={money(moneyIn)} />
        <Stat label="Purchases" value={String(purchases)}>
          {purchases > 0 && `avg ${money(spent / purchases)}`}
        </Stat>
        <Stat label="Top category" value={byCategory[0]?.[0] ?? '—'} small>
          {TopIcon && <TopIcon className="size-4" />}
        </Stat>
      </div>

      <Card className="lg:col-span-3">
        <h3 className="mb-4 font-semibold">Where it went</h3>
        <ul className="space-y-3.5">
          {byCategory.map(([cat, total]) => {
            const Icon = CATEGORY_ICONS[cat]
            return (
              <li key={cat} className="flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{cat}</span>
                    <span className="shrink-0 tabular-nums">
                      {money(total)} <span className="text-xs text-zinc-500">{((total / spent) * 100).toFixed(0)}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-white/[0.06]">
                    <div className="h-full rounded-full bg-zinc-800 transition-[width] duration-700 ease-out dark:bg-zinc-300" style={{ width: `${(total / maxCat) * 100}%` }} />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </Card>

      <div className="grid gap-4 lg:col-span-2">
        {subscriptions.length > 0 && <Subscriptions subs={subscriptions} today={today} />}
        <Card>
          <h3 className="font-semibold">Last {HISTORY} cycles</h3>
          <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">Total spending. Select a bar to jump there.</p>
          <HistoryBars history={history} max={maxHist} current={cycle} onPick={onPickCycle} />
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold">Top spots</h3>
          <ol className="space-y-2.5 text-sm">
            {topMerchants.map(([name, { total, count }], i) => (
              <li key={name} className="flex items-center gap-3">
                <span className="w-4 shrink-0 text-xs tabular-nums text-zinc-400">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{name}</span>
                <span className="shrink-0 text-xs text-zinc-500">{count}×</span>
                <span className="w-20 shrink-0 text-right font-medium tabular-nums">{money(total)}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  )
}

function Stat({ label, value, small, children }: { label: string; value: string; small?: boolean; children?: ReactNode }) {
  return (
    <Card className="p-4">
      <div className="text-[13px] text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className={cx('mt-1 font-display font-bold tracking-tight tabular-nums', small ? 'text-lg leading-tight' : 'text-2xl')}>{value}</div>
      {children && <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{children}</div>}
    </Card>
  )
}

function HistoryBars({ history, max, current, onPick }: { history: { key: string; total: number }[]; max: number; current: string; onPick: (k: string) => void }) {
  const [hover, setHover] = useState<string | null>(null)
  const focused = history.find((h) => h.key === (hover ?? current))
  return (
    <div>
      <div className="mb-2 h-5 text-sm">
        {focused && (
          <>
            <span className="font-semibold tabular-nums">{money(focused.total)}</span>{' '}
            <span className="text-zinc-500 dark:text-zinc-400">in {cycleLabel(focused.key)}</span>
          </>
        )}
      </div>
      <div className="flex h-32 items-end gap-1.5" onMouseLeave={() => setHover(null)}>
        {history.map((h) => (
          <button
            key={h.key}
            onClick={() => onPick(h.key)}
            onMouseEnter={() => setHover(h.key)}
            onFocus={() => setHover(h.key)}
            onBlur={() => setHover(null)}
            aria-label={`${cycleLabel(h.key)}: ${money(h.total)}`}
            className="group flex h-full flex-1 flex-col items-center justify-end"
          >
            <div
              className={cx(
                'w-full max-w-10 rounded-t-[4px] transition-all duration-500',
                h.key === current ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-200 group-hover:bg-zinc-300 dark:bg-white/15 dark:group-hover:bg-white/25',
              )}
              style={{ height: `${Math.max(2, (h.total / max) * 100)}%` }}
            />
          </button>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5 border-t border-zinc-200 pt-1 dark:border-white/10">
        {history.map((h) => (
          <span key={h.key} className={cx('flex-1 text-center text-[11px]', h.key === current ? 'font-semibold' : 'text-zinc-400')}>
            {cycleLabel(h.key, true).split(' – ')[0].split(' ')[0]}
          </span>
        ))}
      </div>
    </div>
  )
}

const nextFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

function Subscriptions({ subs, today }: { subs: Subscription[]; today: string }) {
  const monthly = subs.reduce((s, x) => s + x.amount, 0)
  return (
    <Card>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="inline-flex items-center gap-2 font-semibold">
          <Repeat className="size-4 text-zinc-400" /> Subscriptions
        </h3>
        <span className="text-sm tabular-nums">
          <b>{money(monthly)}</b>
          <span className="text-zinc-500 dark:text-zinc-400">/mo</span>
        </span>
      </div>
      <ul className="space-y-2.5 text-sm">
        {subs.map((s) => {
          const inDays = daysBetween(today, s.nextDate)
          const soon = inDays >= 0 && inDays <= 7
          return (
            <li key={s.key} className="flex items-center gap-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate">{s.name}</span>
                <span className={cx('text-xs', soon ? 'font-medium text-amber-600 dark:text-amber-400' : 'text-zinc-500 dark:text-zinc-400')}>
                  {inDays < 0 ? 'Was due' : 'Next'} {nextFmt.format(new Date(s.nextDate + 'T00:00'))}
                  {soon && (inDays === 0 ? ' · today' : inDays === 1 ? ' · tomorrow' : ` · in ${inDays} days`)}
                </span>
              </span>
              <span className="shrink-0 tabular-nums">{money(s.amount)}</span>
            </li>
          )
        })}
      </ul>
      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">Found by spotting charges that repeat monthly at about the same amount.</p>
    </Card>
  )
}
