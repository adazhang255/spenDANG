import type { ResolvedTransaction, Transaction } from './types'

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Turn raw bank amounts into what really counts as your spending.
 *
 * - An expense with `myShare` counts as exactly that.
 * - Otherwise, money linked to it as a payback is subtracted ($60 dinner - $45 Venmo = $15).
 * - The payback itself counts as 0, so it isn't also treated as income.
 */
export function resolveSplits(txs: Transaction[]): ResolvedTransaction[] {
  const ids = new Set(txs.map((t) => t.id))
  const paidBack = new Map<string, number>()
  for (const t of txs) {
    if (t.paybackFor && ids.has(t.paybackFor)) paidBack.set(t.paybackFor, (paidBack.get(t.paybackFor) ?? 0) + Math.abs(t.amount))
  }
  return txs.map((t) => {
    if (t.paybackFor && ids.has(t.paybackFor)) return { ...t, amount: 0, fullAmount: t.amount }
    const back = paidBack.get(t.id) ?? 0
    if (t.myShare === undefined && back === 0) return t
    const effective = t.myShare ?? Math.max(0, round2(t.amount - back))
    return effective === t.amount ? t : { ...t, amount: effective, fullAmount: t.amount }
  })
}

/** Paybacks linked to each expense id. */
export function paybacksByExpense(txs: Transaction[]): Map<string, Transaction[]> {
  const m = new Map<string, Transaction[]>()
  for (const t of txs) if (t.paybackFor) m.set(t.paybackFor, [...(m.get(t.paybackFor) ?? []), t])
  return m
}
