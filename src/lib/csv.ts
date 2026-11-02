import { categorize } from './categorize'
import type { Transaction } from './types'
import { uid } from './util'

/** Parse delimited text into rows. Handles quoted fields, escaped quotes ("") and CRLF. */
export function parseCSV(text: string, delimiter = detectDelimiter(text)): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === delimiter) {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.map((r) => r.map((f) => f.trim())).filter((r) => r.some((f) => f !== ''))
}

export function detectDelimiter(text: string): string {
  const sample = text.split(/\r?\n/).slice(0, 5).join('\n')
  const counts = [',', ';', '\t', '|'].map((d) => [d, sample.split(d).length] as const)
  counts.sort((a, b) => b[1] - a[1])
  return counts[0][1] > 1 ? counts[0][0] : ','
}

export interface ColumnMapping {
  date: number
  description: number
  /** Single signed amount column, or -1 when the file uses separate debit/credit columns. */
  amount: number
  debit: number
  credit: number
  category: number
}

export type SignMode = 'negative-is-spend' | 'positive-is-spend'
export type DateFormat = 'MDY' | 'DMY' | 'YMD'

export interface ImportOptions {
  mapping: ColumnMapping
  signMode: SignMode
  dateFormat: DateFormat
}

const HEADER_PATTERNS: Record<keyof ColumnMapping, RegExp> = {
  date: /^(transaction |trans |posted |posting )?date$|^date|date$/i,
  description: /description|merchant|payee|^name$|details|memo|narrative|particulars/i,
  amount: /^amount|amount$|^value$/i,
  debit: /debit|withdrawal|money out|paid out|outflow/i,
  credit: /credit|deposit|money in|paid in|inflow/i,
  category: /category/i,
}

/** Find which row holds the headers (some banks put account info above the table). */
export function findHeaderRow(rows: string[][]): number {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const m = guessMapping(rows[i])
    if (m.date >= 0 && (m.amount >= 0 || m.debit >= 0 || m.credit >= 0)) return i
  }
  return 0
}

export function guessMapping(headers: string[]): ColumnMapping {
  const used = new Set<number>()
  const find = (key: keyof ColumnMapping) => {
    const idx = headers.findIndex((h, i) => !used.has(i) && HEADER_PATTERNS[key].test(h.trim()))
    if (idx >= 0) used.add(idx)
    return idx
  }
  // Order matters: claim the most specific columns first.
  const date = find('date')
  const category = find('category')
  const amount = find('amount')
  const debit = amount >= 0 ? -1 : find('debit')
  const credit = amount >= 0 ? -1 : find('credit')
  const description = find('description')
  return { date, description, amount, debit, credit, category }
}

/** "$1,234.50" -> 1234.5, "(12.00)" -> -12, "12.00-" -> -12, "12.00 CR" -> -12. NaN if unparseable. */
export function parseAmount(raw: string): number {
  if (!raw) return NaN
  let s = raw.trim()
  let negative = false
  if (/^\(.*\)$/.test(s)) {
    negative = true
    s = s.slice(1, -1)
  }
  if (/\s*cr$/i.test(s)) {
    negative = !negative
    s = s.replace(/\s*cr$/i, '')
  }
  s = s.replace(/\s*dr$/i, '')
  if (s.endsWith('-')) {
    negative = !negative
    s = s.slice(0, -1)
  }
  // European style "1.234,56" -> "1234.56"
  if (/^-?[\d.]+,\d{1,2}$/.test(s.replace(/[^\d.,-]/g, ''))) s = s.replace(/\./g, '').replace(',', '.')
  s = s.replace(/[^\d.-]/g, '')
  const n = parseFloat(s)
  if (Number.isNaN(n)) return NaN
  return negative ? -n : n
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function isoIfValid(y: number, m: number, d: number): string | null {
  if (y < 100) y += 2000
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  const dt = new Date(y, m - 1, d)
  if (dt.getMonth() !== m - 1) return null
  return `${y}-${pad(m)}-${pad(d)}`
}

/** Parse a date string into YYYY-MM-DD, or null. */
export function parseDate(raw: string, format: DateFormat = 'MDY'): string | null {
  const s = raw.trim()
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (m) return isoIfValid(+m[1], +m[2], +m[3])
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/)
  if (m) {
    const [a, b, y] = [+m[1], +m[2], +m[3]]
    return format === 'DMY' ? isoIfValid(y, b, a) : isoIfValid(y, a, b)
  }
  // "Jan 5, 2026", "05 Jan 2026", "5-Jan-26"
  m = s.match(/^(\d{1,2})[\s-]([a-z]{3})[a-z]*[\s-,]+(\d{2,4})/i)
  if (m) {
    const mo = MONTHS.indexOf(m[2].toLowerCase())
    if (mo >= 0) return isoIfValid(+m[3], mo + 1, +m[1])
  }
  m = s.match(/^([a-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{2,4})/i)
  if (m) {
    const mo = MONTHS.indexOf(m[1].toLowerCase())
    if (mo >= 0) return isoIfValid(+m[3], mo + 1, +m[2])
  }
  return null
}

/** If any first segment of a slash date is >12 it must be a day, so the file is DMY. */
export function guessDateFormat(values: string[]): DateFormat {
  for (const v of values) {
    const m = v.trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.]\d{2,4}/)
    if (m && +m[1] > 12) return 'DMY'
  }
  return 'MDY'
}

/** Most bank exports show purchases as negative; most card exports show them as positive. */
export function guessSignMode(amounts: number[]): SignMode {
  const valid = amounts.filter((n) => !Number.isNaN(n) && n !== 0)
  const negatives = valid.filter((n) => n < 0).length
  return negatives > valid.length / 2 ? 'negative-is-spend' : 'positive-is-spend'
}

export interface ParsedFile {
  headers: string[]
  rows: string[][]
  options: ImportOptions
}

/** Parse raw CSV text and auto-detect everything we can. */
export function analyzeCSV(text: string): ParsedFile {
  const all = parseCSV(text)
  const headerIdx = findHeaderRow(all)
  const headers = all[headerIdx] ?? []
  const rows = all.slice(headerIdx + 1).filter((r) => r.length >= Math.min(2, headers.length))
  const mapping = guessMapping(headers)
  const dateFormat = mapping.date >= 0 ? guessDateFormat(rows.map((r) => r[mapping.date] ?? '')) : 'MDY'
  const signMode =
    mapping.amount >= 0 ? guessSignMode(rows.map((r) => parseAmount(r[mapping.amount] ?? ''))) : 'positive-is-spend'
  return { headers, rows, options: { mapping, signMode, dateFormat } }
}

export interface RowResult {
  tx?: Transaction
  error?: string
}

export function rowToTransaction(row: string[], { mapping, signMode, dateFormat }: ImportOptions): RowResult {
  const date = mapping.date >= 0 ? parseDate(row[mapping.date] ?? '', dateFormat) : null
  if (!date) return { error: 'Unreadable date' }

  let amount: number
  if (mapping.amount >= 0) {
    const raw = parseAmount(row[mapping.amount] ?? '')
    if (Number.isNaN(raw)) return { error: 'Unreadable amount' }
    amount = signMode === 'negative-is-spend' ? -raw : raw
  } else {
    const debit = mapping.debit >= 0 ? parseAmount(row[mapping.debit] ?? '') : NaN
    const credit = mapping.credit >= 0 ? parseAmount(row[mapping.credit] ?? '') : NaN
    if (Number.isNaN(debit) && Number.isNaN(credit)) return { error: 'No amount' }
    amount = (Number.isNaN(debit) ? 0 : Math.abs(debit)) - (Number.isNaN(credit) ? 0 : Math.abs(credit))
  }

  const description = (mapping.description >= 0 ? row[mapping.description] : '') || 'Untitled transaction'
  const bankCategory = mapping.category >= 0 ? row[mapping.category] : undefined
  return {
    tx: {
      id: uid(),
      date,
      description,
      amount: Math.round(amount * 100) / 100,
      category: categorize(description, bankCategory),
      source: 'import',
    },
  }
}

const txKey = (t: Pick<Transaction, 'date' | 'description' | 'amount'>) => `${t.date}|${t.description}|${t.amount}`

/**
 * Drop incoming transactions that already exist, so re-importing an overlapping statement is
 * safe. Uses counts so two genuinely identical purchases in one file both survive.
 */
export function dedupe(existing: Transaction[], incoming: Transaction[]): { added: Transaction[]; skipped: number } {
  const counts = new Map<string, number>()
  for (const t of existing) counts.set(txKey(t), (counts.get(txKey(t)) ?? 0) + 1)
  const added: Transaction[] = []
  let skipped = 0
  for (const t of incoming) {
    const k = txKey(t)
    const c = counts.get(k) ?? 0
    if (c > 0) {
      counts.set(k, c - 1)
      skipped++
    } else added.push(t)
  }
  return { added, skipped }
}
