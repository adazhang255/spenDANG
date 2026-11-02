import { useMemo, useState } from 'react'
import { CATEGORY_STYLE } from '../lib/colors'
import { cycleKey, cycleLabel, shiftCycle } from '../lib/cycles'
import { NON_SPENDING, type Category, type Transaction } from '../lib/types'
import { money } from '../lib/util'
import { Card, EmptyState, cx } from './ui'

const HISTORY = 6

interface Props {
  cycle: string
  cycleTxs: Transaction[]
  allTxs: Transaction[]
  cycleStartDay: number
  onPickCycle: (key: string) => void
}

export function Breakdown({ cycle, cycleTxs, allTxs, cycleStartDay, onPickCycle }: Props) {
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
        <EmptyState emoji="🗓️" title={`Nothing in ${cycleLabel(cycle)} yet`}>
          Import a statement or step to another cycle with the arrows above.
        </EmptyState>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="grid grid-cols-2 gap-3 lg:col-span-5 lg:grid-cols-4">
        <Stat label="Spent" value={money(spent)} sub={delta === null ? undefined : `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta * 100).toFixed(0)}% vs last cycle`} />
        <Stat label="Money in" value={money(moneyIn)} />
        <Stat label="Purchases" value={String(purchases)} sub={purchases ? `avg ${money(spent / purchases)}` : undefined} />
        <Stat label="Top category" value={byCategory[0] ? `${CATEGORY_STYLE[byCategory[0][0]].emoji} ${byCategory[0][0]}` : '—'} small />
      </div>

      <Card className="lg:col-span-3">
        <h3 className="mb-4 font-bold">Where it went</h3>
        <ul className="space-y-3">
          {byCategory.map(([cat, total]) => (
            <li key={cat}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <span className="font-semibold">
                  {CATEGORY_STYLE[cat].emoji} {cat}
                </span>
                <span className="tabular-nums text-slate-500 dark:text-slate-400">
                  {money(total)} <span className="text-xs">· {((total / spent) * 100).toFixed(0)}%</span>
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-violet-50 dark:bg-white/5">
                <div className="h-full rounded-full bg-violet-400 transition-[width] duration-700 ease-out dark:bg-violet-300" style={{ width: `${(total / maxCat) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-4 lg:col-span-2">
        <Card>
          <h3 className="mb-1 font-bold">Last {HISTORY} cycles</h3>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Total spending. Tap a bar to jump there.</p>
          <HistoryBars history={history} max={maxHist} current={cycle} onPick={onPickCycle} />
        </Card>

        <Card>
          <h3 className="mb-3 font-bold">Top spots</h3>
          <ol className="space-y-2 text-sm">
            {topMerchants.map(([name, { total, count }], i) => (
              <li key={name} className="flex items-center gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 dark:bg-white/10 dark:text-violet-200">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{name}</span>
                <span className="shrink-0 text-xs text-slate-400">×{count}</span>
                <span className="w-20 shrink-0 text-right font-semibold tabular-nums">{money(total)}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  )
}

function Stat({ label, value, sub, small }: { label: string; value: string; sub?: string; small?: boolean }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className={cx('mt-1 font-extrabold tabular-nums', small ? 'text-base leading-tight' : 'text-2xl')}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sub}</div>}
    </Card>
  )
}

function HistoryBars({ history, max, current, onPick }: { history: { key: string; total: number }[]; max: number; current: string; onPick: (k: string) => void }) {
  const [hover, setHover] = useState<string | null>(null)
  const focus = hover ?? current
  const focused = history.find((h) => h.key === focus)
  return (
    <div>
      <div className="mb-2 h-5 text-sm">
        {focused && (
          <>
            <span className="font-bold tabular-nums">{money(focused.total)}</span>{' '}
            <span className="text-slate-500 dark:text-slate-400">in {cycleLabel(focused.key)}</span>
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
            className="group flex h-full flex-1 flex-col items-center justify-end gap-1"
          >
            <div
              className={cx(
                'w-full max-w-10 rounded-t-[4px] transition-all duration-500',
                h.key === current ? 'bg-violet-500 dark:bg-violet-300' : 'bg-violet-200 group-hover:bg-violet-300 dark:bg-violet-400/30 dark:group-hover:bg-violet-400/50',
              )}
              style={{ height: `${Math.max(2, (h.total / max) * 100)}%` }}
            />
          </button>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5 border-t border-slate-200 pt-1 dark:border-white/10">
        {history.map((h) => (
          <span key={h.key} className={cx('flex-1 text-center text-[11px]', h.key === current ? 'font-bold' : 'text-slate-400')}>
            {cycleLabel(h.key, true).split(' – ')[0].split(' ')[0]}
          </span>
        ))}
      </div>
    </div>
  )
}
