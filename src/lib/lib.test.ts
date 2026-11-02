import { describe, expect, it } from 'vitest'
import { categorize } from './categorize'
import { analyzeCSV, dedupe, parseAmount, parseCSV, parseDate, rowToTransaction } from './csv'
import { cycleEnd, cycleKey, cycleLabel, shiftCycle } from './cycles'
import { DEFAULT_TRACKERS, makeTrackerAssigner, trackerStats } from './trackers'
import type { Transaction } from './types'

const tx = (description: string, amount: number, extra: Partial<Transaction> = {}): Transaction => ({
  id: description,
  date: '2026-10-05',
  description,
  amount,
  category: categorize(description),
  source: 'import',
  ...extra,
})

describe('parseCSV', () => {
  it('handles quotes, escaped quotes and CRLF', () => {
    expect(parseCSV('a,b\r\n"x, y","he said ""hi"""\r\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'he said "hi"'],
    ])
  })
  it('detects semicolons', () => {
    expect(parseCSV('a;b\n1;2')).toEqual([['a', 'b'], ['1', '2']])
  })
})

describe('parseAmount', () => {
  it.each([
    ['$1,234.50', 1234.5],
    ['(12.00)', -12],
    ['12.00-', -12],
    ['-4.75', -4.75],
    ['5.00 CR', -5],
    ['1.234,56', 1234.56],
  ])('%s -> %d', (raw, n) => expect(parseAmount(raw)).toBe(n))
})

describe('parseDate', () => {
  it('parses common formats', () => {
    expect(parseDate('2026-10-05')).toBe('2026-10-05')
    expect(parseDate('10/05/2026')).toBe('2026-10-05')
    expect(parseDate('05/10/2026', 'DMY')).toBe('2026-10-05')
    expect(parseDate('10/5/26')).toBe('2026-10-05')
    expect(parseDate('Oct 5, 2026')).toBe('2026-10-05')
    expect(parseDate('5 Oct 2026')).toBe('2026-10-05')
    expect(parseDate('13/13/2026')).toBeNull()
  })
})

describe('analyzeCSV', () => {
  it('auto-detects a Chase-style card export (negative purchases)', () => {
    const csv = `Transaction Date,Post Date,Description,Category,Type,Amount,Memo
10/03/2026,10/04/2026,STARBUCKS STORE 123,Food & Drink,Sale,-6.25,
10/04/2026,10/05/2026,AMC 1234 ONLINE,Entertainment,Sale,-18.00,
10/05/2026,10/05/2026,Payment Thank You-Mobile,,Payment,200.00,`
    const { rows, options } = analyzeCSV(csv)
    expect(options.mapping).toMatchObject({ date: 0, description: 2, category: 3, amount: 5 })
    expect(options.signMode).toBe('negative-is-spend')
    const txs = rows.map((r) => rowToTransaction(r, options).tx!)
    expect(txs.map((t) => [t.amount, t.category])).toEqual([
      [6.25, 'Food & Dining'],
      [18, 'Entertainment'],
      [-200, 'Transfers'],
    ])
  })

  it('handles debit/credit columns and junk rows above the header', () => {
    const csv = `Account: Student Checking
Exported 2026-11-01

Date,Details,Debit,Credit
2026-10-02,TRADER JOE'S #55,42.10,
2026-10-03,PAYROLL CAMPUS JOBS,,350.00`
    const { rows, options } = analyzeCSV(csv)
    const txs = rows.map((r) => rowToTransaction(r, options).tx!)
    expect(txs.map((t) => [t.amount, t.category])).toEqual([
      [42.1, 'Groceries'],
      [-350, 'Income'],
    ])
  })
})

describe('categorize', () => {
  it.each([
    ['UBER *EATS PENDING', 'Food & Dining'],
    ['UBER *TRIP', 'Transport'],
    ['T-MOBILE AUTOPAY', 'Transfers'],
    ['T-MOBILE*POSTPAID', 'Utilities'],
    ['AMAZON DELIVERY', 'Shopping'],
    ['SQ *BOBA GUYS', 'Food & Dining'],
    ['RANDOM THING LLC', 'Other'],
  ])('%s -> %s', (d, c) => expect(categorize(d)).toBe(c))

  it('falls back to the bank category', () => {
    expect(categorize('XYZ 123', 'Bills & Utilities')).toBe('Utilities')
  })
})

describe('trackers', () => {
  const assign = makeTrackerAssigner(DEFAULT_TRACKERS)
  it('prefers keyword matches over category matches', () => {
    expect(assign(tx('STARBUCKS STORE 1', 5))).toBe('coffee-boba')
    expect(assign(tx('CHIPOTLE 22', 14))).toBe('eating-out')
    expect(assign(tx('AMC THEATRES', 18))).toBe('fun')
    expect(assign(tx('TARGET', 30))).toBeNull()
  })
  it('respects explicit assignments', () => {
    expect(assign(tx('STARBUCKS', 5, { trackerId: 'none' }))).toBeNull()
    expect(assign(tx('TARGET', 5, { trackerId: 'fun' }))).toBe('fun')
  })
  it('computes times left', () => {
    const coffee = DEFAULT_TRACKERS[1] // $40 / $5
    const s = trackerStats(coffee, [tx('a', 6.25), tx('b', 5.5)])
    expect(s.timesTotal).toBe(8)
    expect(s.remaining).toBeCloseTo(28.25)
    expect(s.timesLeft).toBe(5)
    expect(trackerStats(coffee, [tx('a', 50)]).timesLeft).toBe(0)
  })
})

describe('cycles', () => {
  it('uses calendar months by default', () => {
    expect(cycleKey('2026-10-31', 1)).toBe('2026-10-01')
    expect(cycleEnd('2026-10-01')).toBe('2026-10-31')
    expect(cycleLabel('2026-10-01')).toBe('Oct 2026')
  })
  it('supports mid-month statement cycles', () => {
    expect(cycleKey('2026-10-10', 15)).toBe('2026-09-15')
    expect(cycleKey('2026-10-15', 15)).toBe('2026-10-15')
    expect(cycleEnd('2026-12-15')).toBe('2027-01-14')
    expect(shiftCycle('2026-12-15', 1)).toBe('2027-01-15')
    expect(cycleLabel('2026-09-15')).toBe('Sep 15 – Oct 14')
  })
})

describe('dedupe', () => {
  it('skips overlap but keeps genuine duplicates within a file', () => {
    const existing = [tx('A', 5)]
    const { added, skipped } = dedupe(existing, [tx('A', 5), tx('A', 5), tx('B', 3)])
    expect(skipped).toBe(1)
    expect(added).toHaveLength(2)
  })
})
