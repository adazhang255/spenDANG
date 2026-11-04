import { merchantKey } from './categorize'
import type { EditableField, Rule, Transaction } from './types'

export function ruleFor(description: string, rules: Rule[]): Rule | undefined {
  if (!rules.length) return undefined
  const key = merchantKey(description)
  return rules.find((r) => r.merchant === key)
}

/** Apply the matching personal rule (if any) to a transaction. */
export function applyRules<T extends Transaction>(tx: T, rules: Rule[]): T {
  const r = ruleFor(tx.description, rules)
  if (!r) return tx
  return {
    ...tx,
    ...(r.category && { category: r.category }),
    ...(r.trackerId && { trackerId: r.trackerId }),
  }
}

/** Merge a correction into the rule for that merchant, creating it if needed. */
export function upsertRule(rules: Rule[], rule: Omit<Rule, 'id'> & { id?: string }): Rule[] {
  const existing = rules.find((r) => r.merchant === rule.merchant)
  if (existing) return rules.map((r) => (r === existing ? { ...existing, ...stripUndefined(rule), id: existing.id } : r))
  return [...rules, { ...rule, id: rule.id ?? rule.merchant }]
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>
}

/** Which past transactions a newly learned rule should change. */
export type RuleScope = 'all' | 'unedited' | 'future'

const ruleFields = (rule: Omit<Rule, 'id'>): EditableField[] =>
  (['category', 'trackerId'] as const).filter((f) => rule[f] !== undefined)

/** True if the user hand-set any field this rule would change. */
export function editedForRule(tx: Transaction, rule: Omit<Rule, 'id'>): boolean {
  return ruleFields(rule).some((f) => tx.edited?.includes(f))
}

/** Apply a rule to existing transactions from its merchant, limited by scope. */
export function applyRuleToPast(txs: Transaction[], rule: Omit<Rule, 'id'>, scope: RuleScope): Transaction[] {
  if (scope === 'future') return txs
  return txs.map((t) => {
    if (merchantKey(t.description) !== rule.merchant) return t
    if (scope === 'unedited' && editedForRule(t, rule)) return t
    // A rule now owns these fields, so they no longer count as hand edits.
    const edited = t.edited?.filter((f) => !ruleFields(rule).includes(f))
    return {
      ...t,
      ...(rule.category && { category: rule.category }),
      ...(rule.trackerId && { trackerId: rule.trackerId }),
      edited: edited?.length ? edited : undefined,
    }
  })
}
