import { Plus, PartyPopper } from 'lucide-react'
import { useCountUp } from '../hooks/useCountUp'
import { TRACKER_COLORS } from '../lib/colors'
import type { TrackerStats } from '../lib/trackers'
import type { Tracker } from '../lib/types'
import { money, plural } from '../lib/util'
import { Confetti } from './Confetti'
import { Button, IconTile, ProgressBar, cx } from './ui'

const MAX_PIPS = 20

interface Props {
  tracker: Tracker
  stats: TrackerStats
  /** The viewed cycle is over, so we can celebrate (or commiserate). */
  cycleEnded: boolean
  /** 0..1 through the current cycle, used for the pace hint. */
  cycleProgress: number
  onLog: () => void
  onEdit: () => void
}

export function paceNote(stats: TrackerStats, cycleEnded: boolean, cycleProgress: number): string | null {
  if (cycleEnded || stats.remaining < 0 || stats.spent <= 0 || cycleProgress <= 0.1) return null
  return stats.ratio <= cycleProgress ? 'On pace' : 'Spending fast'
}

export function TrackerCard({ tracker, stats, cycleEnded, cycleProgress, onLog, onEdit }: Props) {
  const c = TRACKER_COLORS[tracker.color]
  const shown = useCountUp(stats.timesLeft)
  const over = stats.remaining < 0
  const used = stats.timesTotal - stats.timesLeft
  const celebrate = cycleEnded && !over && stats.spent > 0
  const pace = paceNote(stats, cycleEnded, cycleProgress)

  return (
    <div className="relative flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 dark:border-white/[0.08] dark:bg-zinc-900 dark:hover:border-white/15">
      {celebrate && <Confetti />}

      <button onClick={onEdit} className="-m-1 flex items-center gap-3 rounded-xl p-1 text-left hover:bg-zinc-50 dark:hover:bg-white/5" title="Edit tracker">
        <IconTile icon={tracker.icon} color={tracker.color} />
        <div className="min-w-0">
          <div className="truncate font-semibold leading-tight">{tracker.name}</div>
          <div className="text-[13px] text-zinc-500 dark:text-zinc-400">
            {money(tracker.unitCost)} / {tracker.unit} · {money(tracker.budget, true)} a month
          </div>
        </div>
      </button>

      <div className="flex items-baseline gap-2">
        <span key={stats.timesLeft} className={cx('font-display text-6xl font-bold leading-none tracking-tight tabular-nums animate-pop', over && 'text-rose-500')}>
          {Math.round(shown)}
        </span>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {plural(tracker.unit, stats.timesLeft)} left of {stats.timesTotal}
        </span>
      </div>

      {stats.timesTotal > 0 && stats.timesTotal <= MAX_PIPS ? (
        <div className="flex gap-1" role="img" aria-label={`${stats.timesLeft} of ${stats.timesTotal} left`}>
          {Array.from({ length: stats.timesTotal }, (_, i) => (
            <span
              key={i}
              className={cx('h-2 flex-1 rounded-full transition-colors duration-500', i < used ? 'bg-zinc-100 dark:bg-white/[0.07]' : c.bar)}
              style={{ transitionDelay: `${i * 25}ms` }}
            />
          ))}
        </div>
      ) : (
        <ProgressBar ratio={1 - Math.max(0, stats.remaining) / (tracker.budget || 1)} barClass={c.bar} />
      )}

      <div className="flex justify-between text-[13px] text-zinc-500 dark:text-zinc-400">
        <span className="tabular-nums">{money(stats.spent)} spent</span>
        <span className={cx('tabular-nums', over && 'font-medium text-rose-600 dark:text-rose-400')}>
          {over ? `${money(-stats.remaining)} over` : `${money(stats.remaining)} left`}
        </span>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-zinc-100 pt-3 dark:border-white/[0.06]">
        {celebrate ? (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-lime-200 px-2 py-1 text-xs font-semibold text-lime-950 dark:bg-lime-300/20 dark:text-lime-200">
            <PartyPopper className="size-3.5" /> Saved {money(stats.remaining)}
          </span>
        ) : (
          <span className={cx('text-[13px]', pace === 'Spending fast' ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-500 dark:text-zinc-400')}>
            {pace ?? `${stats.count} ${plural('purchase', stats.count)}`}
          </span>
        )}
        <Button variant="secondary" size="sm" icon={Plus} onClick={onLog} title={`Log one ${tracker.unit} for ${money(tracker.unitCost)}`}>
          {tracker.unit}
        </Button>
      </div>
    </div>
  )
}
