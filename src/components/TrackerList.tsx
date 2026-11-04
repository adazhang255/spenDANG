import { Plus } from 'lucide-react'
import { TRACKER_COLORS } from '../lib/colors'
import type { TrackerStats } from '../lib/trackers'
import type { Tracker } from '../lib/types'
import { money, plural } from '../lib/util'
import { StreakBadge } from './TrackerCard'
import { IconButton, IconTile, ProgressBar, cx } from './ui'

interface Props {
  groups: { name: string; trackers: Tracker[] }[]
  stats: Map<string, TrackerStats>
  streaks: Map<string, number>
  showGroupHeaders: boolean
  onLog: (t: Tracker) => void
  onEdit: (t: Tracker) => void
}

/** Dense one-row-per-tracker view, so every tracker fits on one screen. */
export function TrackerList({ groups, stats, streaks, showGroupHeaders, onLog, onEdit }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-white/[0.08] dark:bg-zinc-900">
      <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_5.5rem_6.5rem_2.5rem] gap-4 border-b border-zinc-100 px-4 py-2 text-xs font-medium text-zinc-500 sm:grid dark:border-white/[0.06] dark:text-zinc-400">
        <span>Tracker</span>
        <span>Spent</span>
        <span className="text-right">Left</span>
        <span className="text-right">Times left</span>
        <span />
      </div>
      {groups.map((g) => (
        <div key={g.name}>
          {showGroupHeaders && (
            <div className="bg-zinc-50 px-4 py-1.5 text-xs font-semibold text-zinc-500 dark:bg-white/[0.02] dark:text-zinc-400">{g.name}</div>
          )}
          <ul className="divide-y divide-zinc-100 dark:divide-white/[0.06]">
            {g.trackers.map((t) => {
              const s = stats.get(t.id)!
              const over = s.remaining < 0
              return (
                <li key={t.id} className="grid grid-cols-[minmax(0,1fr)_auto_2.5rem] items-center gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_5.5rem_6.5rem_2.5rem]">
                  <button onClick={() => onEdit(t)} className="flex min-w-0 items-center gap-3 text-left">
                    <IconTile icon={t.icon} color={t.color} size="sm" />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium hover:underline">{t.name}</span>
                        {(streaks.get(t.id) ?? 0) >= 2 && <StreakBadge streak={streaks.get(t.id)!} unit={t.unit} compact />}
                      </span>
                      <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                        {money(t.unitCost)} / {t.unit}
                      </span>
                    </span>
                  </button>
                  <div className="order-last col-span-3 sm:order-none sm:col-span-1">
                    <ProgressBar ratio={s.ratio} barClass={TRACKER_COLORS[t.color].bar} />
                    <div className="mt-1 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                      {money(s.spent)} of {money(s.budget, true)}
                      {s.carried > 0 && ` (incl. ${money(s.carried)} rolled over)`}
                    </div>
                  </div>
                  <span className={cx('hidden text-right text-sm tabular-nums sm:block', over && 'text-rose-600 dark:text-rose-400')}>
                    {over ? `−${money(-s.remaining)}` : money(s.remaining)}
                  </span>
                  <span className="text-right">
                    <span className={cx('font-display text-xl font-bold tabular-nums', over && 'text-rose-500')}>{s.timesLeft}</span>
                    <span className="ml-1 text-xs text-zinc-500 dark:text-zinc-400">{plural(t.unit, s.timesLeft)}</span>
                  </span>
                  <IconButton icon={Plus} label={`Log one ${t.unit} for ${money(t.unitCost)}`} onClick={() => onLog(t)} />
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
