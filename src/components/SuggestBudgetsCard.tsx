import { Lightbulb } from 'lucide-react'
import { useState } from 'react'
import type { BudgetSuggestion } from '../lib/insights'
import { money, plural } from '../lib/util'
import { Button, Card, IconTile, cx } from './ui'

interface Props {
  suggestions: BudgetSuggestion[]
  onApply: (picked: BudgetSuggestion[]) => void
  onDismiss: () => void
}

/** Shown after the first import: budgets based on the user's real average spending. */
export function SuggestBudgetsCard({ suggestions, onApply, onDismiss }: Props) {
  const changes = suggestions.filter((s) => s.suggested !== s.tracker.budget)
  const [skip, setSkip] = useState<Set<string>>(new Set())
  if (!changes.length) return null
  const picked = changes.filter((s) => !skip.has(s.tracker.id))
  const cycles = changes[0].cycles

  return (
    <Card className="animate-rise">
      <div className="mb-3 flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-lime-200 text-lime-900 dark:bg-lime-300/20 dark:text-lime-200">
          <Lightbulb className="size-5" />
        </span>
        <div>
          <div className="font-semibold">Budgets based on your actual spending</div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            Your averages over the last {cycles} {plural('cycle', cycles)}, rounded up to whole items. Untick any you want to keep.
          </div>
        </div>
      </div>
      <ul className="divide-y divide-zinc-100 dark:divide-white/[0.06]">
        {changes.map((s) => {
          const on = !skip.has(s.tracker.id)
          const times = Math.round(s.suggested / s.tracker.unitCost)
          return (
            <li key={s.tracker.id}>
              <label className="flex cursor-pointer items-center gap-3 py-2.5">
                <input
                  type="checkbox"
                  className="size-4 accent-zinc-900 dark:accent-zinc-100"
                  checked={on}
                  onChange={() =>
                    setSkip((prev) => {
                      const next = new Set(prev)
                      if (on) next.add(s.tracker.id)
                      else next.delete(s.tracker.id)
                      return next
                    })
                  }
                />
                <IconTile icon={s.tracker.icon} color={s.tracker.color} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{s.tracker.name}</span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400">You averaged {money(s.average)}</span>
                </span>
                <span className={cx('text-right text-sm tabular-nums', !on && 'opacity-40')}>
                  <span className="text-zinc-400 line-through">{money(s.tracker.budget, true)}</span>{' '}
                  <b>{money(s.suggested, true)}</b>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                    {times} {plural(s.tracker.unit, times)}
                  </span>
                </span>
              </label>
            </li>
          )
        })}
      </ul>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" onClick={onDismiss}>
          Keep my budgets
        </Button>
        <Button disabled={!picked.length} onClick={() => onApply(picked)}>
          Use {picked.length === changes.length ? 'these' : `${picked.length}`} budgets
        </Button>
      </div>
    </Card>
  )
}
