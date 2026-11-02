import { useEffect, useState } from 'react'
import { EMOJI_CHOICES, TRACKER_COLORS } from '../lib/colors'
import { CATEGORIES, COLORS, NON_SPENDING, type Category, type Tracker } from '../lib/types'
import { money, plural, uid } from '../lib/util'
import { Button, Field, Modal, cx, inputClass } from './ui'

interface Props {
  /** Tracker to edit, or `null` to create a new one. Modal is closed when `undefined`. */
  tracker: Tracker | null | undefined
  onSave: (t: Tracker) => void
  onDelete: (id: string) => void
  onClose: () => void
}

const BLANK: Tracker = {
  id: '',
  name: '',
  emoji: '🧋',
  color: 'pink',
  budget: 50,
  unitCost: 10,
  unit: 'trip',
  keywords: [],
  categories: [],
}

export function TrackerEditor({ tracker, onSave, onDelete, onClose }: Props) {
  const [draft, setDraft] = useState<Tracker>(BLANK)
  const [keywordText, setKeywordText] = useState('')

  useEffect(() => {
    if (tracker === undefined) return
    const t = tracker ?? { ...BLANK, id: uid() }
    setDraft(t)
    setKeywordText(t.keywords.join(', '))
  }, [tracker])

  const set = <K extends keyof Tracker>(k: K, v: Tracker[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const toggleCategory = (c: Category) =>
    set('categories', draft.categories.includes(c) ? draft.categories.filter((x) => x !== c) : [...draft.categories, c])

  const valid = draft.name.trim() && draft.budget > 0 && draft.unitCost > 0 && draft.unit.trim()
  const times = draft.unitCost > 0 ? Math.floor(draft.budget / draft.unitCost) : 0

  const save = () => {
    if (!valid) return
    onSave({
      ...draft,
      name: draft.name.trim(),
      unit: draft.unit.trim().toLowerCase(),
      keywords: keywordText.split(',').map((k) => k.trim()).filter(Boolean),
    })
    onClose()
  }

  return (
    <Modal open={tracker !== undefined} onClose={onClose} title={tracker ? 'Edit tracker' : 'New tracker'}>
      <div className="space-y-4">
        <div className={cx('flex items-center gap-3 rounded-2xl p-4 ring-1', TRACKER_COLORS[draft.color].card, TRACKER_COLORS[draft.color].ring)}>
          <span className="text-3xl">{draft.emoji}</span>
          <div className="text-sm">
            <div className="font-bold">{draft.name || 'Your tracker'}</div>
            <div className="text-slate-600 dark:text-slate-300">
              {money(draft.budget || 0, true)} = <b>{times}</b> {plural(draft.unit || 'thing', times)} a month
            </div>
          </div>
        </div>

        <Field label="Name">
          <input className={inputClass} value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Thrift Store Trips" autoFocus />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Monthly budget">
            <input className={inputClass} type="number" min={0} step="1" inputMode="decimal" value={draft.budget || ''} onChange={(e) => set('budget', +e.target.value)} />
          </Field>
          <Field label="Cost each">
            <input className={inputClass} type="number" min={0} step="0.5" inputMode="decimal" value={draft.unitCost || ''} onChange={(e) => set('unitCost', +e.target.value)} />
          </Field>
          <Field label="One is a…">
            <input className={inputClass} value={draft.unit} onChange={(e) => set('unit', e.target.value)} placeholder="trip" />
          </Field>
        </div>

        <Field label="Icon">
          <div className="flex flex-wrap gap-1.5">
            {EMOJI_CHOICES.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => set('emoji', e)}
                className={cx('grid size-10 place-items-center rounded-xl text-xl transition hover:scale-110', draft.emoji === e ? 'bg-violet-200 dark:bg-violet-400/30' : 'bg-slate-100 dark:bg-white/5')}
              >
                {e}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Color">
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => set('color', c)}
                className={cx('size-9 rounded-full transition', TRACKER_COLORS[c].swatch, draft.color === c ? 'scale-110 ring-4 ring-violet-400/50' : 'hover:scale-105')}
              />
            ))}
          </div>
        </Field>

        <Field label="Counts purchases matching" hint="Comma-separated words found in the transaction description, e.g. goodwill, depop, thrift">
          <input className={inputClass} value={keywordText} onChange={(e) => setKeywordText(e.target.value)} placeholder="goodwill, depop, thrift" />
        </Field>

        <Field label="…or anything in these categories">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.filter((c) => !NON_SPENDING.has(c)).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleCategory(c)}
                className={cx(
                  'rounded-full px-3 py-1 text-xs font-semibold transition',
                  draft.categories.includes(c) ? 'bg-violet-500 text-white dark:bg-violet-400 dark:text-violet-950' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300',
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </Field>

        <div className="flex items-center justify-between gap-2 pt-2">
          {tracker ? (
            <Button
              variant="danger"
              onClick={() => {
                if (confirm(`Delete “${tracker.name}”? Your transactions stay.`)) {
                  onDelete(tracker.id)
                  onClose()
                }
              }}
            >
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!valid}>
              {tracker ? 'Save' : 'Create tracker'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
