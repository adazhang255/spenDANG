import { CalendarClock, ChevronDown, Flag, PartyPopper, Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { TRACKER_COLORS } from '../lib/colors'
import { goalStats, inTrackerUnits } from '../lib/goals'
import type { Contribution, Goal, Tracker } from '../lib/types'
import { money, todayISO, uid } from '../lib/util'
import { Confetti } from './Confetti'
import { ColorPicker, IconPicker } from './pickers'
import { Button, Card, EmptyState, Field, IconButton, IconTile, Modal, ProgressBar, cx, inputClass } from './ui'

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const fmtDate = (iso: string) => dateFmt.format(new Date(iso + 'T00:00'))

interface Props {
  goals: Goal[]
  trackers: Tracker[]
  onSave: (g: Goal) => void
  onDelete: (id: string) => void
  onContribute: (goalId: string, c: Contribution) => void
  onRemoveContribution: (goalId: string, contributionId: string) => void
}

export function Goals({ goals, trackers, onSave, onDelete, onContribute, onRemoveContribution }: Props) {
  const [editing, setEditing] = useState<Goal | null | undefined>(undefined)
  const today = todayISO()
  const totalSaved = goals.reduce((s, g) => s + goalStats(g, today).saved, 0)
  const totalTarget = goals.reduce((s, g) => s + g.target, 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">Goals</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {goals.length ? `${money(totalSaved)} saved of ${money(totalTarget, true)} across ${goals.length} goal${goals.length === 1 ? '' : 's'}` : 'Save up for something specific.'}
          </p>
        </div>
        <Button icon={Plus} onClick={() => setEditing(null)}>
          New goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card>
          <EmptyState icon={Flag} title="No goals yet">
            Spring break, a new laptop, concert tickets. Set a target and an optional date, and we'll tell you what it takes each month, in coffees.
          </EmptyState>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} trackers={trackers} onEdit={() => setEditing(g)} onContribute={onContribute} onRemoveContribution={onRemoveContribution} />
          ))}
        </div>
      )}

      <GoalEditor goal={editing} onSave={onSave} onDelete={onDelete} onClose={() => setEditing(undefined)} />
    </div>
  )
}

function GoalCard({
  goal,
  trackers,
  onEdit,
  onContribute,
  onRemoveContribution,
}: {
  goal: Goal
  trackers: Tracker[]
  onEdit: () => void
  onContribute: Props['onContribute']
  onRemoveContribution: Props['onRemoveContribution']
}) {
  const today = todayISO()
  const s = goalStats(goal, today)
  const [amount, setAmount] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [burst, setBurst] = useState(0)

  // Celebrate the moment a goal crosses the line, not every time it renders.
  const wasDone = useRef(s.done)
  useEffect(() => {
    if (s.done && !wasDone.current) setBurst((b) => b + 1)
    wasDone.current = s.done
  }, [s.done])

  const add = () => {
    const n = parseFloat(amount)
    if (!(n > 0)) return
    onContribute(goal.id, { id: uid(), date: today, amount: Math.round(n * 100) / 100 })
    setAmount('')
  }

  const perMonthUnits = s.perMonth ? inTrackerUnits(s.perMonth, trackers) : null
  const remainingUnits = inTrackerUnits(s.remaining, trackers)

  return (
    <Card className="relative flex flex-col gap-4">
      {burst > 0 && <Confetti key={burst} count={28} />}
      <button onClick={onEdit} className="-m-1 flex items-center gap-3 rounded-xl p-1 text-left hover:bg-zinc-50 dark:hover:bg-white/5" title="Edit goal">
        <IconTile icon={goal.icon} color={goal.color} />
        <div className="min-w-0">
          <div className="truncate font-semibold leading-tight">{goal.name}</div>
          <div className={cx('text-[13px]', s.overdue ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-500 dark:text-zinc-400')}>
            {goal.deadline ? `${s.overdue ? 'Was due' : 'By'} ${fmtDate(goal.deadline)}` : 'No deadline'}
          </div>
        </div>
      </button>

      <div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-display text-4xl font-bold tracking-tight tabular-nums">{money(s.saved)}</span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            of {money(goal.target, true)} · {Math.round(s.ratio * 100)}%
          </span>
        </div>
        <ProgressBar ratio={s.ratio} barClass={TRACKER_COLORS[goal.color].bar} className="mt-3 h-2.5" />
      </div>

      {s.done ? (
        <div className="inline-flex items-center gap-2 self-start rounded-md bg-lime-200 px-2.5 py-1.5 text-sm font-semibold text-lime-950 dark:bg-lime-300/20 dark:text-lime-200">
          <PartyPopper className="size-4" /> Goal reached
        </div>
      ) : (
        <div className="rounded-xl bg-zinc-50 p-3 text-sm dark:bg-white/[0.03]">
          {s.perMonth !== null ? (
            <div className="flex gap-2.5">
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-zinc-400" />
              <div>
                <b className="tabular-nums">{money(s.perMonth)}</b> a month for {s.monthsLeft} month{s.monthsLeft === 1 ? '' : 's'}
                {perMonthUnits && <div className="text-zinc-500 dark:text-zinc-400">That's skipping about {perMonthUnits} a month.</div>}
              </div>
            </div>
          ) : (
            <div>
              <b className="tabular-nums">{money(s.remaining)}</b> to go
              {remainingUnits && <span className="text-zinc-500 dark:text-zinc-400"> · about {remainingUnits}</span>}
            </div>
          )}
        </div>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">$</span>
          <input className={cx(inputClass, 'pl-6')} type="number" min="0" step="0.01" inputMode="decimal" placeholder="Add money" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label={`Add money to ${goal.name}`} />
        </div>
        <Button type="submit" variant="secondary" disabled={!(parseFloat(amount) > 0)}>
          Add
        </Button>
      </form>

      {goal.contributions.length > 0 && (
        <div className="border-t border-zinc-100 pt-2 dark:border-white/[0.06]">
          <button onClick={() => setShowHistory((v) => !v)} className="flex w-full items-center justify-between py-1 text-[13px] text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
            {goal.contributions.length} deposit{goal.contributions.length === 1 ? '' : 's'}
            <ChevronDown className={cx('size-4 transition', showHistory && 'rotate-180')} />
          </button>
          {showHistory && (
            <ul className="mt-1 space-y-0.5">
              {[...goal.contributions].reverse().map((c) => (
                <li key={c.id} className="flex items-center gap-2 text-sm">
                  <span className="w-24 shrink-0 text-xs tabular-nums text-zinc-500">{fmtDate(c.date)}</span>
                  <span className="min-w-0 flex-1 truncate text-zinc-600 dark:text-zinc-300">{c.note ?? 'Deposit'}</span>
                  <span className="tabular-nums">{money(c.amount)}</span>
                  <IconButton icon={Trash2} label="Remove deposit" className="size-7" onClick={() => onRemoveContribution(goal.id, c.id)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  )
}

const BLANK: Goal = { id: '', name: '', icon: 'plane', color: 'sky', target: 500, contributions: [] }

function GoalEditor({ goal, onSave, onDelete, onClose }: { goal: Goal | null | undefined; onSave: (g: Goal) => void; onDelete: (id: string) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<Goal>(BLANK)
  const [starting, setStarting] = useState('')

  useEffect(() => {
    if (goal === undefined) return
    setDraft(goal ?? { ...BLANK, id: uid() })
    setStarting('')
  }, [goal])

  const set = <K extends keyof Goal>(k: K, v: Goal[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const valid = draft.name.trim() && draft.target > 0

  const save = () => {
    if (!valid) return
    const start = parseFloat(starting)
    const contributions = !goal && start > 0 ? [{ id: uid(), date: todayISO(), amount: start, note: 'Starting balance' }] : draft.contributions
    onSave({ ...draft, name: draft.name.trim(), deadline: draft.deadline || undefined, contributions })
    onClose()
  }

  return (
    <Modal open={goal !== undefined} onClose={onClose} title={goal ? 'Edit goal' : 'New goal'}>
      <div className="space-y-4">
        <Field label="What are you saving for?">
          <input className={inputClass} value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Spring break" autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Target">
            <input className={inputClass} type="number" min={0} step="1" inputMode="decimal" value={draft.target || ''} onChange={(e) => set('target', +e.target.value)} />
          </Field>
          <Field label="By (optional)">
            <input className={inputClass} type="date" min={todayISO()} value={draft.deadline ?? ''} onChange={(e) => set('deadline', e.target.value)} />
          </Field>
        </div>
        {!goal && (
          <Field label="Already saved (optional)">
            <input className={inputClass} type="number" min={0} step="0.01" inputMode="decimal" value={starting} onChange={(e) => setStarting(e.target.value)} placeholder="0" />
          </Field>
        )}
        <Field label="Icon">
          <IconPicker value={draft.icon} color={draft.color} onChange={(v) => set('icon', v)} />
        </Field>
        <Field label="Color">
          <ColorPicker value={draft.color} onChange={(v) => set('color', v)} />
        </Field>
        <div className="flex items-center justify-between gap-2 pt-2">
          {goal ? (
            <Button
              variant="danger"
              onClick={() => {
                if (confirm(`Delete “${goal.name}” and its deposit history?`)) {
                  onDelete(goal.id)
                  onClose()
                }
              }}
            >
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!valid}>
              {goal ? 'Save' : 'Create goal'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
