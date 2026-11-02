import type { Category, ColorKey } from './types'

/** Literal class strings so Tailwind's scanner picks them up. */
export const TRACKER_COLORS: Record<ColorKey, { card: string; bar: string; chip: string; ring: string; swatch: string }> = {
  pink: {
    card: 'bg-pink-100/70 dark:bg-pink-400/10',
    bar: 'bg-pink-400',
    chip: 'bg-pink-200 text-pink-900 dark:bg-pink-400/20 dark:text-pink-200',
    ring: 'ring-pink-300 dark:ring-pink-400/40',
    swatch: 'bg-pink-300',
  },
  peach: {
    card: 'bg-orange-100/70 dark:bg-orange-400/10',
    bar: 'bg-orange-400',
    chip: 'bg-orange-200 text-orange-900 dark:bg-orange-400/20 dark:text-orange-200',
    ring: 'ring-orange-300 dark:ring-orange-400/40',
    swatch: 'bg-orange-300',
  },
  lemon: {
    card: 'bg-amber-100/70 dark:bg-amber-300/10',
    bar: 'bg-amber-400',
    chip: 'bg-amber-200 text-amber-900 dark:bg-amber-300/20 dark:text-amber-200',
    ring: 'ring-amber-300 dark:ring-amber-300/40',
    swatch: 'bg-amber-300',
  },
  mint: {
    card: 'bg-emerald-100/70 dark:bg-emerald-400/10',
    bar: 'bg-emerald-400',
    chip: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-200',
    ring: 'ring-emerald-300 dark:ring-emerald-400/40',
    swatch: 'bg-emerald-300',
  },
  sky: {
    card: 'bg-sky-100/70 dark:bg-sky-400/10',
    bar: 'bg-sky-400',
    chip: 'bg-sky-200 text-sky-900 dark:bg-sky-400/20 dark:text-sky-200',
    ring: 'ring-sky-300 dark:ring-sky-400/40',
    swatch: 'bg-sky-300',
  },
  lavender: {
    card: 'bg-violet-100/70 dark:bg-violet-400/10',
    bar: 'bg-violet-400',
    chip: 'bg-violet-200 text-violet-900 dark:bg-violet-400/20 dark:text-violet-200',
    ring: 'ring-violet-300 dark:ring-violet-400/40',
    swatch: 'bg-violet-300',
  },
}

export const CATEGORY_STYLE: Record<Category, { emoji: string; bar: string }> = {
  'Food & Dining': { emoji: '🍔', bar: 'bg-orange-400' },
  Groceries: { emoji: '🥦', bar: 'bg-lime-400' },
  Transport: { emoji: '🚌', bar: 'bg-sky-400' },
  Entertainment: { emoji: '🎮', bar: 'bg-emerald-400' },
  Shopping: { emoji: '🛍️', bar: 'bg-pink-400' },
  Subscriptions: { emoji: '📺', bar: 'bg-violet-400' },
  Utilities: { emoji: '💡', bar: 'bg-amber-400' },
  Housing: { emoji: '🏠', bar: 'bg-teal-400' },
  Health: { emoji: '💊', bar: 'bg-rose-400' },
  Education: { emoji: '📚', bar: 'bg-indigo-400' },
  Income: { emoji: '💸', bar: 'bg-green-400' },
  Transfers: { emoji: '🔁', bar: 'bg-slate-400' },
  Other: { emoji: '✨', bar: 'bg-stone-400' },
}

export const EMOJI_CHOICES = ['🧋', '☕', '🍜', '🍕', '🌮', '🍣', '🎟️', '🎮', '🎬', '🎤', '🛍️', '👟', '🧥', '📚', '🚕', '✈️', '💅', '🌱', '🐶', '🎁']
