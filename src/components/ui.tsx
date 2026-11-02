import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cx(
        'rounded-3xl border border-violet-100 bg-white/80 p-5 shadow-sm shadow-violet-200/40 backdrop-blur dark:border-white/5 dark:bg-white/[0.04] dark:shadow-none',
        className,
      )}
    >
      {children}
    </div>
  )
}

type Variant = 'primary' | 'soft' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-violet-500 text-white hover:bg-violet-600 shadow-md shadow-violet-500/25 dark:bg-violet-400 dark:text-violet-950 dark:hover:bg-violet-300',
  soft: 'bg-violet-100 text-violet-800 hover:bg-violet-200 dark:bg-white/10 dark:text-violet-100 dark:hover:bg-white/15',
  ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10',
  danger: 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-400/15 dark:text-rose-200 dark:hover:bg-rose-400/25',
}

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 disabled:pointer-events-none disabled:opacity-40',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500',
        VARIANTS[variant],
        className,
      )}
    />
  )
}

export const inputClass =
  'w-full rounded-2xl border border-violet-100 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-200/60 dark:border-white/10 dark:bg-white/5 dark:focus:border-violet-400 dark:focus:ring-violet-400/20'

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  )
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-rise" onClick={onClose} />
      <div className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-2xl animate-rise sm:max-w-lg sm:rounded-3xl sm:pb-5 dark:bg-[#1f1b2b]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ProgressBar({ ratio, barClass, className }: { ratio: number; barClass: string; className?: string }) {
  const over = ratio > 1
  return (
    <div className={cx('h-3 overflow-hidden rounded-full bg-white/70 dark:bg-white/10', className)}>
      <div
        className={cx('h-full rounded-full transition-[width] duration-700 ease-out', over ? 'bg-rose-400' : barClass)}
        style={{ width: `${Math.min(100, ratio * 100)}%` }}
      />
    </div>
  )
}

export function EmptyState({ emoji, title, children }: { emoji: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <div className="text-4xl">{emoji}</div>
      <div className="font-bold">{title}</div>
      <div className="max-w-sm text-sm text-slate-500 dark:text-slate-400">{children}</div>
    </div>
  )
}
