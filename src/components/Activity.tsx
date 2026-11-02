import { Inbox, Plus, Search, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { categorize } from '../lib/categorize'
import { TRACKER_COLORS } from '../lib/colors'
import { CATEGORY_ICONS } from '../lib/icons'
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
        <div className="relative basis-full sm:basis-auto sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <input className={cx(inputClass, 'pl-9')} placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className={cx(inputClass, 'flex-1 sm:w-auto sm:flex-none')} value={catFilter} onChange={(e) => setCatFilter(e.target.value as Category | '')}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <Button icon={adding ? X : Plus} variant={adding ? 'secondary' : 'primary'} onClick={() => setAdding((a) => !a)}>
          {adding ? 'Close' : 'Add'}
        </Button>
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
          <EmptyState icon={Inbox} title="No transactions here">
            {txs.length ? 'Nothing matches your filters.' : 'Import a statement or add one by hand.'}
          </EmptyState>
        </Card>
      ) : (
        <Card className="p-0">
          {groups.map(([date, items], gi) => (
            <div key={date} className={cx(gi > 0 && 'border-t border-zinc-100 dark:border-white/[0.06]')}>
              <div className="px-4 pb-1 pt-3 text-xs font-medium text-zinc-500 dark:text-zinc-400">{dayFmt.format(new Date(date + 'T00:00'))}</div>
              <ul className="pb-1">
                {items.map((t) => {
                  const tracker = trackerById.get(assign(t) ?? '')
                  const open = editing === t.id
                  const Icon = CATEGORY_ICONS[t.category]
                  return (
                    <li key={t.id} className={cx('transition', open ? 'bg-zinc-50 dark:bg-white/[0.03]' : 'hover:bg-zinc-50 dark:hover:bg-white/[0.03]')}>
                      <button className="flex w-full items-center gap-3 px-4 py-2.5 text-left" onClick={() => setEditing(open ? null : t.id)} aria-expanded={open}>
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{t.description}</span>
                          <span className="flex flex-wrap items-center gap-x-2 text-xs text-zinc-500 dark:text-zinc-400">
                            {t.category}
                            {tracker && (
                              <span className="inline-flex items-center gap-1">
                                <span className={cx('size-1.5 rounded-full', TRACKER_COLORS[tracker.color].dot)} />
                                {tracker.name}
                              </span>
                            )}
                            {t.source === 'manual' && <span>· logged</span>}
                          </span>
                        </span>
                        <span className={cx('shrink-0 text-sm font-medium tabular-nums', t.amount < 0 && 'text-emerald-600 dark:text-emerald-400')}>
                          {t.amount < 0 ? '+' : '−'}
                          {money(Math.abs(t.amount))}
                        </span>
                      </button>
                      {open && (
                        <div className="grid gap-2 px-4 pb-3 sm:grid-cols-[1fr_1fr_auto]">
                          <select className={inputClass} value={t.category} onChange={(e) => onUpdate(t.id, { category: e.target.value as Category })} aria-label="Category">
                            {CATEGORIES.map((c) => (
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                          <select className={inputClass} value={t.trackerId ?? ''} onChange={(e) => onUpdate(t.id, { trackerId: e.target.value || undefined })} aria-label="Tracker">
                            <option value="">Tracker: automatic</option>
                            <option value="none">Tracker: don't count</option>
                            {trackers.map((tr) => (
                              <option key={tr.id} value={tr.id}>
                                {tr.name}
                              </option>
                            ))}
                          </select>
                          <Button variant="danger" icon={Trash2} onClick={() => onDelete(t.id)}>
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
                'h-10 shrink-0 rounded-lg border px-3 text-sm font-medium transition',
                isIncome ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200' : 'border-zinc-200 text-zinc-700 dark:border-white/10 dark:text-zinc-200',
              )}
            >
              {isIncome ? 'Money in' : 'Spent'}
            </button>
          </div>
        </Field>
        <Field label="Date">
          <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Category" hint={!category && description ? `Detected: ${isIncome ? 'Income' : guessed}` : undefined}>
          <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value as Category | '')}>
            <option value="">Detect automatically</option>
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
