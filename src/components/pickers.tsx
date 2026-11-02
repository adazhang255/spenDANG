import { TRACKER_COLORS } from '../lib/colors'
import { PICKABLE_ICONS } from '../lib/icons'
import { COLORS, type ColorKey } from '../lib/types'
import { cx } from './ui'

export function IconPicker({ value, color, onChange }: { value: string; color: ColorKey; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-9 gap-1 sm:grid-cols-12">
      {Object.entries(PICKABLE_ICONS).map(([key, Icon]) => (
        <button
          key={key}
          type="button"
          aria-label={key}
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          className={cx(
            'grid aspect-square place-items-center rounded-lg transition',
            value === key ? TRACKER_COLORS[color].tile : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-100',
          )}
        >
          <Icon className="size-[18px]" strokeWidth={2} />
        </button>
      ))}
    </div>
  )
}

export function ColorPicker({ value, onChange }: { value: ColorKey; onChange: (v: ColorKey) => void }) {
  return (
    <div className="flex gap-2">
      {COLORS.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={c}
          aria-pressed={value === c}
          onClick={() => onChange(c)}
          className={cx(
            'size-7 rounded-full transition',
            TRACKER_COLORS[c].dot,
            value === c ? 'ring-2 ring-zinc-900 ring-offset-2 ring-offset-white dark:ring-zinc-100 dark:ring-offset-zinc-900' : 'hover:scale-110',
          )}
        />
      ))}
    </div>
  )
}
