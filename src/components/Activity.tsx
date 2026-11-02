import { useMemo, useState } from 'react'
import { categorize } from '../lib/categorize'
import { CATEGORY_STYLE, TRACKER_COLORS } from '../lib/colors'
import { CATEGORIES, type Category, type Tracker, type Transaction } from '../lib/types'
import { money, todayISO, uid } from '../lib/util'
import { Button, Card, EmptyState, Field, cx, inputClass } from './ui'

interface Props {
  txs: Transaction[]
  trackers: Tracker[]
  assign: (t: Transaction) => string | null
  defaultDate: string
  onAdd: (t: Transaction) => void
  onUpdate: (id: string, patch: Partial<Transaction>) => void
  onDelete: (id: string) => void
}

const dayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

export function Activity({ txs, trackers, assign, defaultDate, onAdd, onUpdate, onDelete }: Props) {
  const [query, setQuery] = useState('')
  const [catFilter, setCatFilter] = useState<Category | ''>('')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const trackerById = useMemo(() => new Map(trackers.map((t) => [t.id, t])), [trackers])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return txs
      .filter((t) => (!catFilter || t.category === catFilter) && (!q || t.description.toLowerCase().includes(q)))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [txs, query, catFilter])

  const groups = useMemo(() => {
    const g = new Map<string, Transaction[]>()
    for (const t of filtered) g.set(t.date, [...(g.get(t.date) ?? []), t])
    return [...g.entries()]
  }, [filtered])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input className={cx(inputClass, 'basis-full sm:basis-auto sm:flex-1')} placeholder="🔎 Search" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className={cx(inputClass, 'flex-1 sm:w-auto sm:flex-none')} value={catFilter} onChange={(e) => setCatFilter(e.target.value as Category | '')}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <Button onClick={() => setAdding((a) => !a)}>{adding ? 'Close' : '+ Add'}</Button>
      </div>

      {adding && (
        <AddForm
          defaultDate={defaultDate}
          onAdd={(t) => {
            onAdd(t)
            setAdding(false)
          }}
        />
      )}

      {!groups.length ? (
        <Card>
          <EmptyState emoji="🫙" title="No transactions here">
            {txs.length ? 'Nothing matches your filters.' : 'Import a statement or add one by hand.'}
          </EmptyState>
        </Card>
      ) : (
        <Card className="p-2 sm:p-3">
          {groups.map(([date, items]) => (
            <div key={date}>
              <div className="px-3 pb-1 pt-3 text-xs font-bold uppercase tracking-wide text-slate-400">{dayFmt.format(new Date(date + 'T00:00'))}</div>
              <ul>
                {items.map((t) => {
                  const tracker = trackerById.get(assign(t) ?? '')
                  const open = editing === t.id
                  return (
                    <li key={t.id} className="rounded-2xl transition hover:bg-violet-50/60 dark:hover:bg-white/5">
                      <button className="flex w-full items-center gap-3 px-3 py-2.5 text-left" onClick={() => setEditing(open ? null : t.id)} aria-expanded={open}>
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-lg dark:bg-white/5">{CATEGORY_STYLE[t.category].emoji}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{t.description}</span>
                          <span className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            {t.category}
                            {tracker && (
                              <span className={cx('rounded-full px-2 py-px font-semibold', TRACKER_COLORS[tracker.color].chip)}>
                                {tracker.emoji} {tracker.name}
                              </span>
                            )}
                            {t.source === 'manual' && <span className="text-slate-400">· logged</span>}
                          </span>
                        </span>
                        <span className={cx('shrink-0 text-sm font-bold tabular-nums', t.amount < 0 && 'text-emerald-600 dark:text-emerald-400')}>
                          {t.amount < 0 ? '+' : '−'}
                          {money(Math.abs(t.amount))}
                        </span>
                      </button>
                      {open && (
                        <div className="grid gap-2 px-3 pb-3 sm:grid-cols-[1fr_1fr_auto]">
                          <select className={inputClass} value={t.category} onChange={(e) => onUpdate(t.id, { category: e.target.value as Category })} aria-label="Category">
                            {CATEGORIES.map((c) => (
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                          <select
                            className={inputClass}
                            value={t.trackerId ?? ''}
                            onChange={(e) => onUpdate(t.id, { trackerId: e.target.value || undefined })}
                            aria-label="Tracker"
                          >
                            <option value="">Tracker: auto</option>
                            <option value="none">Tracker: don't count</option>
                            {trackers.map((tr) => (
                              <option key={tr.id} value={tr.id}>
                                {tr.emoji} {tr.name}
                              </option>
                            ))}
                          </select>
                          <Button variant="danger" onClick={() => onDelete(t.id)}>
                            Delete
                          </Button>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

function AddForm({ defaultDate, onAdd }: { defaultDate: string; onAdd: (t: Transaction) => void }) {
  const [date, setDate] = useState(defaultDate || todayISO())
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [isIncome, setIsIncome] = useState(false)
  const [category, setCategory] = useState<Category | ''>('')
  const guessed = description ? categorize(description) : 'Other'
  const n = parseFloat(amount)
  const valid = description.trim() && n > 0 && date

  return (
    <Card className="animate-rise">
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!valid) return
          onAdd({
            id: uid(),
            date,
            description: description.trim(),
            amount: isIncome ? -n : n,
            category: category || (isIncome ? 'Income' : guessed),
            source: 'manual',
          })
        }}
      >
        <Field label="What">
          <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Boba with Jess" autoFocus />
        </Field>
        <Field label="Amount">
          <div className="flex gap-2">
            <input className={inputClass} type="number" min="0" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="6.50" />
            <button
              type="button"
              onClick={() => setIsIncome((v) => !v)}
              className={cx(
                'shrink-0 rounded-2xl px-3 text-sm font-semibold transition',
                isIncome ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-200' : 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200',
              )}
            >
              {isIncome ? 'Money in' : 'Spent'}
            </button>
          </div>
        </Field>
        <Field label="Date">
          <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Category" hint={!category && description ? `Auto: ${isIncome ? 'Income' : guessed}` : undefined}>
          <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value as Category | '')}>
            <option value="">Auto-detect</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit" disabled={!valid}>
            Add transaction
          </Button>
        </div>
      </form>
    </Card>
  )
}
