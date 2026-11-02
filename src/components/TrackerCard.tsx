import { useCountUp } from '../hooks/useCountUp'
import { TRACKER_COLORS } from '../lib/colors'
import type { TrackerStats } from '../lib/trackers'
import type { Tracker } from '../lib/types'
import { money, plural } from '../lib/util'
import { Confetti } from './Confetti'
import { Button, ProgressBar, cx } from './ui'

const MAX_TOKENS = 16

interface Props {
  tracker: Tracker
  stats: TrackerStats
  /** The viewed cycle is over, so we can celebrate (or commiserate). */
  cycleEnded: boolean
  /** 0..1 through the current cycle, used for the "on pace" hint. */
  cycleProgress: number
  onLog: () => void
  onEdit: () => void
}

export function TrackerCard({ tracker, stats, cycleEnded, cycleProgress, onLog, onEdit }: Props) {
  const c = TRACKER_COLORS[tracker.color]
  const shown = useCountUp(stats.timesLeft)
  const over = stats.remaining < 0
  const used = stats.timesTotal - stats.timesLeft
  const celebrate = cycleEnded && !over && stats.spent > 0

  let paceNote: string | null = null
  if (!cycleEnded && !over && stats.spent > 0 && cycleProgress > 0.1) {
    paceNote = stats.ratio <= cycleProgress ? 'On pace 👌' : 'Spending fast 👀'
  }

  return (
    <div className={cx('relative flex flex-col gap-4 rounded-3xl p-5 ring-1 transition hover:-translate-y-0.5 hover:shadow-lg', c.card, c.ring)}>
      {celebrate && <Confetti />}

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-white/80 text-2xl shadow-sm dark:bg-white/10">{tracker.emoji}</div>
          <div>
            <div className="font-bold leading-tight">{tracker.name}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {money(tracker.unitCost)} per {tracker.unit} · {money(tracker.budget, true)}/mo
            </div>
          </div>
        </div>
        <button
          onClick={onEdit}
          className="rounded-full px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-white/70 dark:text-slate-400 dark:hover:bg-white/10"
        >
          Edit
        </button>
      </div>

      <div className="flex items-end gap-2">
        <span key={stats.timesLeft} className={cx('text-6xl font-extrabold leading-none tabular-nums animate-pop', over && 'text-rose-500')}>
          {Math.round(shown)}
        </span>
        <span className="pb-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300">
          {plural(tracker.unit, stats.timesLeft)} left
          <span className="font-normal text-slate-400"> / {stats.timesTotal}</span>
        </span>
      </div>

      {stats.timesTotal > 0 && stats.timesTotal <= MAX_TOKENS && (
        <div className="flex flex-wrap gap-1" aria-hidden>
          {Array.from({ length: stats.timesTotal }, (_, i) => (
            <span
              key={i}
              className={cx('text-lg transition duration-500', i < used ? 'scale-75 opacity-25 grayscale' : 'scale-100')}
              style={{ transitionDelay: `${i * 30}ms` }}
            >
              {tracker.emoji}
            </span>
          ))}
        </div>
      )}

      <div>
        <ProgressBar ratio={stats.ratio} barClass={c.bar} />
        <div className="mt-2 flex justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{money(stats.spent)} spent</span>
          <span className={cx(over && 'font-semibold text-rose-500')}>
            {over ? `${money(-stats.remaining)} over 😬` : `${money(stats.remaining)} left`}
          </span>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2">
        {celebrate ? (
          <span className={cx('rounded-full px-3 py-1 text-xs font-bold', c.chip)}>🎉 Stayed under · saved {money(stats.remaining)}</span>
        ) : (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {paceNote ?? `${stats.count} ${plural('purchase', stats.count)}`}
          </span>
        )}
        <Button variant="soft" onClick={onLog} className="shrink-0 bg-white/80 dark:bg-white/10" title={`Log one ${tracker.unit} for ${money(tracker.unitCost)}`}>
          +1 {tracker.unit}
        </Button>
      </div>
    </div>
  )
}
