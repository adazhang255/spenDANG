import { ArrowLeft, FileUp, Lock } from 'lucide-react'
import { useMemo, useRef, useState, type DragEvent } from 'react'
import { CATEGORY_ICONS } from '../lib/icons'
import { analyzeCSV, rowToTransaction, type ColumnMapping, type DateFormat, type ImportOptions, type ParsedFile, type SignMode } from '../lib/csv'
import { sampleCSV } from '../lib/sample'
import type { Transaction } from '../lib/types'
import { money } from '../lib/util'
import { Button, Card, Field, cx, inputClass } from './ui'

interface Props {
  onImport: (txs: Transaction[]) => void
}

const MAPPING_FIELDS: { key: keyof ColumnMapping; label: string; optional?: boolean }[] = [
  { key: 'date', label: 'Date' },
  { key: 'description', label: 'Description' },
  { key: 'amount', label: 'Amount', optional: true },
  { key: 'debit', label: 'Debit (money out)', optional: true },
  { key: 'credit', label: 'Credit (money in)', optional: true },
  { key: 'category', label: 'Bank category', optional: true },
]

export function ImportPanel({ onImport }: Props) {
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParsedFile | null>(null)
  const [options, setOptions] = useState<ImportOptions | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const load = (raw: string, name: string | null) => {
    setText(raw)
    setFileName(name)
    if (!raw.trim()) {
      setParsed(null)
      setOptions(null)
      return
    }
    const p = analyzeCSV(raw)
    setParsed(p)
    setOptions(p.options)
  }

  const readFile = (file: File) => file.text().then((t) => load(t, file.name))

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) readFile(f)
  }

  const results = useMemo(() => (parsed && options ? parsed.rows.map((r) => rowToTransaction(r, options)) : []), [parsed, options])
  const good = results.flatMap((r) => (r.tx ? [r.tx] : []))
  const errors = results.length - good.length
  const hasAmount = options && (options.mapping.amount >= 0 || options.mapping.debit >= 0 || options.mapping.credit >= 0)

  const setMapping = (key: keyof ColumnMapping, idx: number) => setOptions((o) => o && { ...o, mapping: { ...o.mapping, [key]: idx } })

  const reset = () => {
    load('', null)
    if (fileInput.current) fileInput.current.value = ''
  }

  if (!parsed || !options) {
    return (
      <Card>
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cx(
            'flex flex-col items-center gap-3 rounded-xl border border-dashed p-8 text-center transition',
            dragging ? 'border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-white/5' : 'border-zinc-300 dark:border-white/15',
          )}
        >
          <span className="grid size-11 place-items-center rounded-xl bg-zinc-100 text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
            <FileUp className="size-5" />
          </span>
          <div className="font-display text-lg font-bold tracking-tight">Drop a bank or card statement</div>
          <p className="max-w-md text-sm text-zinc-500 dark:text-zinc-400">Most banks let you export transactions as a CSV file.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => fileInput.current?.click()}>Choose file</Button>
            <Button variant="secondary" onClick={() => load(sampleCSV(), 'sample-statement.csv')}>
              Try sample data
            </Button>
          </div>
          <p className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <Lock className="size-3.5" /> Read in your browser. Nothing is uploaded.
          </p>
          <input ref={fileInput} type="file" accept=".csv,.tsv,.txt,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
        </div>
        <div className="mt-5">
          <Field label="…or paste CSV text">
            <textarea
              className={cx(inputClass, 'h-32 font-mono text-xs')}
              placeholder={'Date,Description,Amount\n10/03/2026,STARBUCKS,-6.25'}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </Field>
          <Button className="mt-2" variant="secondary" disabled={!text.trim()} onClick={() => load(text, null)}>
            Read pasted text
          </Button>
        </div>
      </Card>
    )
  }

  const columnOptions = (
    <>
      <option value={-1}>— none —</option>
      {parsed.headers.map((h, i) => (
        <option key={i} value={i}>
          {h || `Column ${i + 1}`}
        </option>
      ))}
    </>
  )

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold">{fileName ?? 'Pasted CSV'}</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {parsed.rows.length} rows found. We guessed the columns — double-check them.
            </p>
          </div>
          <Button variant="ghost" icon={ArrowLeft} onClick={reset}>
            Start over
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {MAPPING_FIELDS.map((f) => (
            <Field key={f.key} label={f.label}>
              <select className={inputClass} value={options.mapping[f.key]} onChange={(e) => setMapping(f.key, +e.target.value)}>
                {columnOptions}
              </select>
            </Field>
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-400">Use either one Amount column, or separate Debit/Credit columns. If Amount is set, Debit/Credit are ignored.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="In the Amount column, purchases are…">
            <select
              className={inputClass}
              value={options.signMode}
              disabled={options.mapping.amount < 0}
              onChange={(e) => setOptions({ ...options, signMode: e.target.value as SignMode })}
            >
              <option value="negative-is-spend">Negative (−6.25)</option>
              <option value="positive-is-spend">Positive (6.25)</option>
            </select>
          </Field>
          <Field label="Date format">
            <select className={inputClass} value={options.dateFormat} onChange={(e) => setOptions({ ...options, dateFormat: e.target.value as DateFormat })}>
              <option value="MDY">Month/Day/Year (US)</option>
              <option value="DMY">Day/Month/Year</option>
              <option value="YMD">Year-Month-Day</option>
            </select>
          </Field>
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Preview</h3>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {good.length} ready{errors > 0 && <span className="text-rose-500"> · {errors} skipped (unreadable)</span>}
          </span>
        </div>
        <ul className="divide-y divide-zinc-100 text-sm dark:divide-white/5">
          {good.slice(0, 8).map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2">
              <span className="w-20 shrink-0 text-xs tabular-nums text-zinc-400">{t.date}</span>
              <span className="min-w-0 flex-1 truncate">{t.description}</span>
              <span className="hidden shrink-0 items-center gap-1.5 text-xs text-zinc-500 sm:inline-flex">
                <CategoryIcon category={t.category} /> {t.category}
              </span>
              <span className={cx('w-20 shrink-0 text-right font-medium tabular-nums', t.amount < 0 && 'text-emerald-600 dark:text-emerald-400')}>
                {t.amount < 0 ? '+' : ''}
                {money(Math.abs(t.amount))}
              </span>
            </li>
          ))}
        </ul>
        {good.length > 8 && <p className="mt-2 text-xs text-zinc-400">…and {good.length - 8} more</p>}
        <p className="mt-3 text-xs text-zinc-400">Purchases show as plain amounts; refunds and income show in green with a +. If that's backwards, change the setting above.</p>
        <div className="mt-4 flex justify-end">
          <Button
            disabled={!good.length || !hasAmount}
            onClick={() => {
              onImport(good)
              reset()
            }}
          >
            Import {good.length} transactions
          </Button>
        </div>
      </Card>
    </div>
  )
}

function CategoryIcon({ category }: { category: Transaction['category'] }) {
  const Icon = CATEGORY_ICONS[category]
  return <Icon className="size-3.5" />
}
