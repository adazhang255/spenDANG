import type { ColorKey } from './types'

/** Literal class strings so Tailwind's scanner picks them up. */
export const TRACKER_COLORS: Record<ColorKey, { tile: string; bar: string; dot: string }> = {
  rose: {
    tile: 'bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300',
    bar: 'bg-rose-400',
    dot: 'bg-rose-400',
  },
  orange: {
    tile: 'bg-orange-100 text-orange-700 dark:bg-orange-400/15 dark:text-orange-300',
    bar: 'bg-orange-400',
    dot: 'bg-orange-400',
  },
  amber: {
    tile: 'bg-amber-100 text-amber-700 dark:bg-amber-300/15 dark:text-amber-300',
    bar: 'bg-amber-400',
    dot: 'bg-amber-400',
  },
  emerald: {
    tile: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
    bar: 'bg-emerald-500',
    dot: 'bg-emerald-500',
  },
  sky: {
    tile: 'bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300',
    bar: 'bg-sky-500',
    dot: 'bg-sky-500',
  },
  violet: {
    tile: 'bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300',
    bar: 'bg-violet-500',
    dot: 'bg-violet-500',
  },
}

/** Map colors saved before the palette rename. */
export const LEGACY_COLORS: Record<string, ColorKey> = {
  pink: 'rose',
  peach: 'orange',
  lemon: 'amber',
  mint: 'emerald',
  lavender: 'violet',
}
