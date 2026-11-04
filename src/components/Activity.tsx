import { Inbox, PenLine, Plus, Search, Trash2, Unlink, Users, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { merchantName } from '../lib/categorize'
import { TRACKER_COLORS } from '../lib/colors'
import { daysBetween } from '../lib/cycles'
import { CATEGORY_ICONS } from '../lib/icons'
import { paybacksByExpense } from '../lib/splits'
import { CATEGORIES, type Category, type ResolvedTransaction, type Tracker, type Transaction } from '../lib/types'
import { money, todayISO, uid } from '../lib/util'
import { Button, Card, EmptyState, Field, cx, inputClass } from './ui'

interface Props {
  /** This cycle's transactions, with splits applied. */
  txs: ResolvedTransaction[]
  /** Every stored transaction, raw, for finding payback candidates. */
  allTxs: Transaction[]
  trackers: Tracker[]
  assign: (t: Transaction) => string | null
  /** Category for a new manual transaction (personal rules, then keyword rules). */
  detect: (description: string) => Category
  defaultDate: string
  onAdd: (t: Transaction) => void
  onUpdate: (id: string, patch: Partial<Transaction>) => void
  /** A category or tracker change the user made by hand, which may become a rule. */
  onCorrect: (t: Transaction, patch: Pick<Transaction, 'category'> | Pick<Transaction, 'trackerId'>) => void
  onDelete: (id: string) => void
}

const dayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
const fmtShort = (iso: string) => shortDate.format(new Date(iso + 'T00:00'))

export function Activity({ txs, allTxs, trackers, assign, detect, defaultDate, onAdd, onUpdate, onCorrect, onDelete }: Props) {
  const [query, setQuery] = useState('')
  const [catFilter, setCatFilter] = useState<Category | ''>('')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const trackerById = useMemo(() => new Map(trackers.map((t) => [t.id, t])), [trackers])
  const txById = useMemo(() => new Map(allTxs.map((t) => [t.id, t])), [allTxs])
  const paybacks = useMemo(() => paybacksByExpense(allTxs), [allTxs])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return txs
      .filter((t) => (!catFilter || t.category === catFilter) && (!q || t.description.toLowerCase().includes(q) || t.note?.toLowerCase().includes(q)))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [txs, query, catFilter])

  const groups = useMemo(() => {
    const g = new Map<string, ResolvedTransaction[]>()
    for (const t of filtered) g.set(t.date, [...(g.get(t.date) ?? []), t])
    return [...g.entries()]
  }, [filtered])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative basis-full sm:basis-auto sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <input className={cx(inputClass, 'pl-9')} placeholder="Search descriptions and notes" value={query} onChange={(e) => setQuery(e.target.value)} />
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
          detect={detect}
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
                  const raw = t.fullAmount ?? t.amount
                  const repays = t.paybackFor ? txById.get(t.paybackFor) : undefined
                  const isSplit = t.fullAmount !== undefined && !repays
                  return (
                    <li key={t.id} className={cx('transition', open ? 'bg-zinc-50 dark:bg-white/[0.03]' : 'hover:bg-zinc-50 dark:hover:bg-white/[0.03]')}>
                      <button className="flex w-full items-center gap-3 px-4 py-2.5 text-left" onClick={() => setEditing(open ? null : t.id)} aria-expanded={open}>
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{t.description}</span>
                          {t.note && <span className="block truncate text-[13px] text-zinc-700 dark:text-zinc-300">{t.note}</span>}
                          <span className="flex flex-wrap items-center gap-x-2 text-xs text-zinc-500 dark:text-zinc-400">
                            {repays ? <span>Payback for {merchantName(repays.description)}</span> : t.category}
                            {tracker && (
                              <span className="inline-flex items-center gap-1">
                                <span className={cx('size-1.5 rounded-full', TRACKER_COLORS[tracker.color].dot)} />
                                {tracker.name}
                              </span>
                            )}
                            {isSplit && (
                              <span className="inline-flex items-center gap-1">
                                <Users className="size-3" /> Split
                              </span>
                            )}
                            {t.source === 'manual' && <span>· logged</span>}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className={cx('block text-sm font-medium tabular-nums', raw < 0 && 'text-emerald-600 dark:text-emerald-400', repays && 'opacity-50')}>
                            {raw < 0 ? '+' : '−'}
                            {money(Math.abs(isSplit ? t.amount : raw))}
                          </span>
                          {isSplit && <span className="block text-xs tabular-nums text-zinc-500">of {money(raw)}</span>}
                        </span>
                      </button>
                      {open && (
                        <div className="grid gap-2 px-4 pb-4 sm:grid-cols-[1fr_1fr_auto]">
                          <NoteInput value={t.note} onCommit={(note) => onUpdate(t.id, { note })} />
                          <select
                            className={inputClass}
                            value={t.category}
                            onChange={(e) => onCorrect(t, { category: e.target.value as Category })}
                            aria-label="Category"
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                          <select className={inputClass} value={t.trackerId ?? ''} onChange={(e) => onCorrect(t, { trackerId: e.target.value || undefined })} aria-label="Tracker">
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
                          <div className="sm:col-span-3">
                            {raw > 0 ? (
                              <SplitControls tx={t} raw={raw} paybacks={paybacks.get(t.id) ?? []} onUpdate={onUpdate} />
                            ) : (
                              <PaybackPicker tx={t} allTxs={allTxs} onUpdate={onUpdate} />
                            )}
                          </div>
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

const SPLITS = [2, 3, 4, 5]

/** Split an expense evenly or set your share; shows any paybacks linked to it. */
function SplitControls({
  tx,
  raw,
  paybacks,
  onUpdate,
}: {
  tx: ResolvedTransaction
  raw: number
  paybacks: Transaction[]
  onUpdate: Props['onUpdate']
}) {
  const [custom, setCustom] = useState(tx.myShare?.toString() ?? '')
  useEffect(() => setCustom(tx.myShare?.toString() ?? ''), [tx.myShare])
  const share = (n: number) => Math.round((raw / n) * 100) / 100
  const activeSplit = tx.myShare === undefined ? null : SPLITS.find((n) => share(n) === tx.myShare)

  const commitCustom = () => {
    const v = parseFloat(custom)
    const next = Number.isFinite(v) && v >= 0 && v < raw ? Math.round(v * 100) / 100 : undefined
    if (next !== tx.myShare) onUpdate(tx.id, { myShare: next })
  }

  const chip = (active: boolean) =>
    cx(
      'h-8 rounded-md border px-2.5 text-[13px] font-medium transition',
      active ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900' : 'border-zinc-200 hover:border-zinc-400 dark:border-white/10',
    )

  return (
    <div className="rounded-xl border border-zinc-200 p-3 dark:border-white/10">
      <div className="mb-2 flex items-center justify-between gap-2 text-[13px]">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Users className="size-4 text-zinc-400" /> Split with friends
        </span>
        <span className="text-zinc-500 dark:text-zinc-400">
          Counts as <b className="tabular-nums text-zinc-900 dark:text-zinc-100">{money(tx.amount)}</b>
          {tx.fullAmount !== undefined && <> of {money(raw)}</>}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <button className={chip(tx.myShare === undefined && !paybacks.length)} onClick={() => onUpdate(tx.id, { myShare: undefined })}>
          Just me
        </button>
        {SPLITS.map((n) => (
          <button key={n} className={chip(activeSplit === n)} onClick={() => onUpdate(tx.id, { myShare: share(n) })} title={`${money(share(n))} each`}>
            ÷{n}
          </button>
        ))}
        <div className="relative w-32">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-zinc-400">$</span>
          <input
            className={cx(inputClass, 'h-8 pl-5 text-[13px]')}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="My share"
            aria-label="My share"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onBlur={commitCustom}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
        </div>
      </div>
      {paybacks.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-zinc-100 pt-2 text-[13px] dark:border-white/[0.06]">
          {paybacks.map((p) => (
            <li key={p.id} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-zinc-600 dark:text-zinc-300">
                Paid back {fmtShort(p.date)}: {p.note ?? merchantName(p.description)}
              </span>
              <span className="tabular-nums text-emerald-600 dark:text-emerald-400">{money(Math.abs(p.amount))}</span>
              <button className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100" title="Unlink payback" onClick={() => onUpdate(p.id, { paybackFor: undefined })}>
                <Unlink className="size-3.5" />
              </button>
            </li>
          ))}
          {tx.myShare !== undefined && <li className="text-xs text-zinc-500">Your share is set by hand, so paybacks don't change it.</li>}
        </ul>
      )}
    </div>
  )
}

/** For money coming in: link it to the expense it pays you back for. */
function PaybackPicker({ tx, allTxs, onUpdate }: { tx: ResolvedTransaction; allTxs: Transaction[]; onUpdate: Props['onUpdate'] }) {
  const candidates = useMemo(
    () =>
      allTxs
        .filter((e) => e.amount > 0 && !e.paybackFor && daysBetween(e.date, tx.date) >= -3 && daysBetween(e.date, tx.date) <= 60)
        .sort((a, b) => Math.abs(daysBetween(a.date, tx.date)) - Math.abs(daysBetween(b.date, tx.date)))
        .slice(0, 30),
    [allTxs, tx.date],
  )
  return (
    <div className="rounded-xl border border-zinc-200 p-3 dark:border-white/10">
      <Field label="Is this someone paying you back?" hint="Linked paybacks come off the expense instead of counting as income.">
        <select className={inputClass} value={tx.paybackFor ?? ''} onChange={(e) => onUpdate(tx.id, { paybackFor: e.target.value || undefined })}>
          <option value="">No, it's not a payback</option>
          {candidates.map((e) => (
            <option key={e.id} value={e.id}>
              {fmtShort(e.date)} · {merchantName(e.description)} · {money(e.amount)}
            </option>
          ))}
        </select>
      </Field>
    </div>
  )
}

/** Edits a transaction note locally and saves on blur or Enter, so typing doesn't rewrite storage per keystroke. */
function NoteInput({ value, onCommit }: { value?: string; onCommit: (note: string | undefined) => void }) {
  const [draft, setDraft] = useState(value ?? '')
  useEffect(() => setDraft(value ?? ''), [value])

  const commit = () => {
    const next = draft.trim() || undefined
    if (next !== value) onCommit(next)
  }

  return (
    <div className="relative sm:col-span-3">
      <PenLine className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
      <input
        className={cx(inputClass, 'pl-9')}
        placeholder="Add a note, e.g. boba with Jess"
        aria-label="Note"
        maxLength={140}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            setDraft(value ?? '')
            e.currentTarget.blur()
          }
        }}
      />
    </div>
  )
}

function AddForm({ defaultDate, detect, onAdd }: { defaultDate: string; detect: (d: string) => Category; onAdd: (t: Transaction) => void }) {
  const [date, setDate] = useState(defaultDate || todayISO())
  const [description, setDescription] = useState('')
  const [note, setNote] = useState('')
  const [amount, setAmount] = useState('')
  const [isIncome, setIsIncome] = useState(false)
  const [category, setCategory] = useState<Category | ''>('')
  const guessed = description ? detect(description) : 'Other'
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
            note: note.trim() || undefined,
            amount: isIncome ? -n : n,
            category: category || (isIncome ? 'Income' : guessed),
            source: 'manual',
          })
        }}
      >
        <Field label="What">
          <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Kung Fu Tea" autoFocus />
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
        <div className="sm:col-span-2">
          <Field label="Note (optional)">
            <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} placeholder="Boba with Jess after the midterm" />
          </Field>
        </div>
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit" disabled={!valid}>
            Add transaction
          </Button>
        </div>
      </form>
    </Card>
  )
}
