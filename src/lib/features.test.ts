import { describe, expect, it } from 'vitest'
import { categorize, merchantKey, merchantName } from './categorize'
import { parseCSV, toCSV } from './csv'
import { addMonth, daysLeftInCycle } from './cycles'
import { carryIn, dailyPace, indexSpend, streak, suggestBudgets } from './insights'
import { applyRuleToPast, applyRules, upsertRule } from './rules'
import { resolveSplits } from './splits'
import { DEFAULT_DATA, makeBackup, mergeData, parseBackup } from './storage'
import { findSubscriptions } from './subscriptions'
import { DEFAULT_TRACKERS, makeTrackerAssigner } from './trackers'
import type { AppData, Transaction } from './types'

let n = 0
const tx = (date: string, description: string, amount: number, extra: Partial<Transaction> = {}): Transaction => ({
  id: `t${n++}`,
  date,
  description,
  amount,
  category: categorize(description),
  source: 'import',
  ...extra,
})

describe('merchant names', () => {
  it('drops store numbers and title-cases', () => {
    expect(merchantName('KUNG FU TEA #12')).toBe('Kung Fu Tea')
    expect(merchantName('AMZN Mktp US*2K39')).toBe('AMZN Mktp')
    expect(merchantKey('KUNG FU TEA #12')).toBe(merchantKey('Kung Fu Tea #99'))
  })
})

describe('rules', () => {
  it('applies a learned rule to matching merchants only', () => {
    const rules = upsertRule([], { merchant: merchantKey('KUNG FU TEA #12'), label: 'Kung Fu Tea', trackerId: 'coffee-boba' })
    expect(applyRules(tx('2026-10-01', 'KUNG FU TEA #40', 6), rules).trackerId).toBe('coffee-boba')
    expect(applyRules(tx('2026-10-01', 'CHIPOTLE 1', 12), rules).trackerId).toBeUndefined()
  })
  it('merges corrections into one rule per merchant', () => {
    let rules = upsertRule([], { merchant: 'x', label: 'X', category: 'Shopping' })
    rules = upsertRule(rules, { merchant: 'x', label: 'X', trackerId: 'fun' })
    expect(rules).toHaveLength(1)
    expect(rules[0]).toMatchObject({ category: 'Shopping', trackerId: 'fun' })
  })
})

describe('splits', () => {
  it('subtracts linked paybacks and zeroes them', () => {
    const dinner = tx('2026-10-05', 'SUSHI PLACE', 60)
    const p1 = tx('2026-10-06', 'VENMO FROM JESS', -15, { paybackFor: dinner.id })
    const p2 = tx('2026-10-06', 'VENMO FROM SAM', -30, { paybackFor: dinner.id })
    const [d, a, b] = resolveSplits([dinner, p1, p2])
    expect(d).toMatchObject({ amount: 15, fullAmount: 60 })
    expect(a.amount).toBe(0)
    expect(b.amount).toBe(0)
  })
  it('uses an explicit share over paybacks', () => {
    const dinner = tx('2026-10-05', 'SUSHI PLACE', 60, { myShare: 20 })
    const p = tx('2026-10-06', 'VENMO', -45, { paybackFor: dinner.id })
    expect(resolveSplits([dinner, p])[0].amount).toBe(20)
  })
  it('ignores paybacks pointing at deleted expenses', () => {
    expect(resolveSplits([tx('2026-10-06', 'VENMO', -45, { paybackFor: 'gone' })])[0].amount).toBe(-45)
  })
})

describe('subscriptions', () => {
  it('finds monthly charges and predicts the next one', () => {
    const txs = [
      tx('2026-08-03', 'SPOTIFY USA', 5.99),
      tx('2026-09-03', 'SPOTIFY USA', 5.99),
      tx('2026-10-03', 'SPOTIFY USA', 5.99),
      tx('2026-08-10', 'STARBUCKS 1', 5.5),
      tx('2026-08-12', 'STARBUCKS 2', 5.75),
      tx('2026-10-11', 'STARBUCKS 3', 5.6),
    ]
    const subs = findSubscriptions(txs, '2026-10-20')
    expect(subs.map((s) => [s.name, s.nextDate])).toEqual([['Spotify', '2026-11-03']])
  })
  it('drops subscriptions that stopped charging', () => {
    const txs = [tx('2026-05-03', 'NETFLIX.COM', 6.99), tx('2026-06-03', 'NETFLIX.COM', 6.99)]
    expect(findSubscriptions(txs, '2026-10-20')).toEqual([])
  })
})

describe('rollover, streaks, suggestions', () => {
  const coffee = { ...DEFAULT_TRACKERS[1], rollover: true } // $40, $5 each
  const assign = makeTrackerAssigner([coffee])
  const txs = [
    tx('2026-08-04', 'STARBUCKS', 30),
    tx('2026-09-04', 'STARBUCKS', 25),
    tx('2026-10-04', 'STARBUCKS', 50),
    tx('2026-10-05', 'TARGET', 10),
  ]
  const idx = indexSpend(txs, assign, 1)

  it('carries only last cycle\'s unused money', () => {
    expect(carryIn(coffee, '2026-10-01', idx)).toBe(15)
    expect(carryIn(coffee, '2026-08-01', idx)).toBe(0) // July has no data
    expect(carryIn({ ...coffee, rollover: false }, '2026-10-01', idx)).toBe(0)
  })
  it('counts streaks including rollover', () => {
    // Oct: $50 spent vs $40 + $15 carried -> still under.
    expect(streak(coffee, '2026-10-01', idx)).toBe(3)
    expect(streak({ ...coffee, rollover: false }, '2026-10-01', idx)).toBe(0)
  })
  it('suggests budgets rounded up to whole units', () => {
    const [s] = suggestBudgets([coffee], idx, '2026-11-01')
    expect(s.average).toBeCloseTo(35)
    expect(s.suggested).toBe(35)
    expect(s.cycles).toBe(3)
  })
})

describe('daily pace', () => {
  it('phrases as every N days or N a day', () => {
    expect(dailyPace(20, 5, 12)).toMatchObject({ everyNDays: 3, unitsPerDay: null })
    expect(dailyPace(100, 5, 10)).toMatchObject({ everyNDays: null, unitsPerDay: 2 })
    expect(dailyPace(-1, 5, 10)).toBeNull()
    expect(daysLeftInCycle('2026-11-01', '2026-11-01')).toBe(30)
    expect(addMonth('2026-01-31')).toBe('2026-02-28')
  })
})

describe('backup & csv export', () => {
  it('round-trips a backup', () => {
    const data = { ...DEFAULT_DATA, transactions: [tx('2026-10-01', 'X', 1, { note: 'hi' })] }
    expect(parseBackup(makeBackup(data))).toEqual(data)
  })
  it('rejects non-backups', () => {
    expect(() => parseBackup('nope')).toThrow(/JSON/)
    expect(() => parseBackup('{"a":1}')).toThrow(/backup/)
  })
  it('escapes CSV fields so they parse back', () => {
    const rows = [['a', 'b'], ['has, comma', 'say "hi"\nthere']]
    expect(parseCSV(toCSV(rows))).toEqual(rows)
  })
})

describe('rule scopes', () => {
  const tx = (id: string, extra: Partial<Transaction> = {}): Transaction => ({
    id, date: '2026-10-01', description: 'KUNG FU TEA #12', amount: 6, category: 'Food & Dining', source: 'import', ...extra,
  })
  const rule = { merchant: merchantKey('KUNG FU TEA #12'), label: 'Kung Fu Tea', trackerId: 'coffee-boba' }
  const txs = [tx('a'), tx('b', { trackerId: 'fun', edited: ['trackerId'] }), tx('c', { category: 'Shopping', edited: ['category'] })]

  it('all overwrites hand edits and clears their marker', () => {
    const out = applyRuleToPast(txs, rule, 'all')
    expect(out.map((t) => t.trackerId)).toEqual(['coffee-boba', 'coffee-boba', 'coffee-boba'])
    expect(out[1].edited).toBeUndefined()
    expect(out[2].edited).toEqual(['category'])
  })

  it('unedited skips only fields the rule touches', () => {
    const out = applyRuleToPast(txs, rule, 'unedited')
    expect(out.map((t) => t.trackerId)).toEqual(['coffee-boba', 'fun', 'coffee-boba'])
  })

  it('future leaves the past alone', () => {
    expect(applyRuleToPast(txs, rule, 'future')).toBe(txs)
  })
})

describe('mergeData', () => {
  const base = (over: Partial<AppData> = {}): AppData => ({ ...DEFAULT_DATA, ...over })
  const t = (id: string, description: string, extra: Partial<Transaction> = {}): Transaction => ({
    id, date: '2026-10-01', description, amount: 10, category: 'Shopping', source: 'import', ...extra,
  })

  it('adds new records, skips duplicates by id or content, keeps local versions', () => {
    const current = base({
      transactions: [t('1', 'Dinner', { note: 'mine' }), t('2', 'Target')],
      rules: [{ id: 'r', merchant: 'target', label: 'Target', category: 'Groceries' }],
      goals: [{ id: 'g', name: 'Trip', icon: 'plane', color: 'sky', target: 500, contributions: [{ id: 'c1', date: '2026-10-01', amount: 20 }] }],
    })
    const backup = base({
      transactions: [t('1', 'Dinner', { note: 'theirs' }), t('x', 'Target'), t('y', 'Venmo', { amount: -5, paybackFor: '1' }), t('z', 'Books')],
      rules: [{ id: 'r2', merchant: 'target', label: 'Target', category: 'Shopping' }, { id: 'r3', merchant: 'books', label: 'Books', category: 'Education' }],
      goals: [{ id: 'g', name: 'Trip', icon: 'plane', color: 'sky', target: 500, contributions: [{ id: 'c1', date: '2026-10-01', amount: 20 }, { id: 'c2', date: '2026-10-02', amount: 30 }] }],
      settings: { ...DEFAULT_DATA.settings, cycleStartDay: 15 },
    })
    const { data, added } = mergeData(current, backup)
    expect(data.transactions.map((x) => x.id)).toEqual(['1', '2', 'y', 'z'])
    expect(data.transactions[0].note).toBe('mine')
    expect(data.rules.map((r) => r.category)).toEqual(['Groceries', 'Education'])
    expect(data.goals[0].contributions).toHaveLength(2)
    expect(data.settings.cycleStartDay).toBe(1)
    expect(added).toEqual({ transactions: 2, trackers: 0, goals: 0, rules: 1 })
  })

  it('relinks paybacks to the local copy of a duplicated expense', () => {
    const current = base({ transactions: [t('local', 'Dinner')] })
    const backup = base({ transactions: [t('remote', 'Dinner'), t('pay', 'Venmo', { amount: -5, paybackFor: 'remote' })] })
    const { data } = mergeData(current, backup)
    expect(data.transactions.find((x) => x.id === 'pay')?.paybackFor).toBe('local')
  })
})
