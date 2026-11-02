import { useEffect, useState } from 'react'
import { CATEGORIES, NON_SPENDING, type Category, type Tracker } from '../lib/types'
import { money, plural, uid } from '../lib/util'
import { ColorPicker, IconPicker } from './pickers'
import { Button, Field, IconTile, Modal, cx, inputClass } from './ui'

interface Props {
  /** Tracker to edit, or `null` to create a new one. Modal is closed when `undefined`. */
  tracker: Tracker | null | undefined
  /** Existing group names, offered as suggestions. */
  groups: string[]
  /** Group to preselect for a new tracker. */
  defaultGroup?: string
  onSave: (t: Tracker) => void
  onDelete: (id: string) => void
  onClose: () => void
}

const BLANK: Tracker = {
  id: '',
  name: '',
  icon: 'shoppingBag',
  color: 'rose',
  group: '',
  budget: 50,
  unitCost: 10,
  unit: 'trip',
  keywords: [],
  categories: [],
}

export function TrackerEditor({ tracker, groups, defaultGroup, onSave, onDelete, onClose }: Props) {
  const [draft, setDraft] = useState<Tracker>(BLANK)
  const [keywordText, setKeywordText] = useState('')

  useEffect(() => {
    if (tracker === undefined) return
    const t = tracker ?? { ...BLANK, id: uid(), group: defaultGroup ?? groups[0] ?? 'General' }
    setDraft(t)
    setKeywordText(t.keywords.join(', '))
    // Only reset when the modal opens for a different tracker, not when groups change.
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
      group: draft.group.trim() || 'General',
      unit: draft.unit.trim().toLowerCase(),
      keywords: keywordText.split(',').map((k) => k.trim()).filter(Boolean),
    })
    onClose()
  }

  return (
    <Modal open={tracker !== undefined} onClose={onClose} title={tracker ? 'Edit tracker' : 'New tracker'}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3 dark:bg-white/[0.03]">
          <IconTile icon={draft.icon} color={draft.color} />
          <div className="text-sm">
            <div className="font-semibold">{draft.name || 'Untitled tracker'}</div>
            <div className="text-zinc-500 dark:text-zinc-400">
              {money(draft.budget || 0, true)} a month = <b className="text-zinc-900 dark:text-zinc-100">{times}</b> {plural(draft.unit || 'thing', times)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Name">
            <input className={inputClass} value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Thrift trips" autoFocus />
          </Field>
          <Field label="Group">
            <input className={inputClass} list="tracker-groups" value={draft.group} onChange={(e) => set('group', e.target.value)} placeholder="Shopping" />
            <datalist id="tracker-groups">
              {groups.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </Field>
        </div>
        {groups.length > 0 && (
          <div className="-mt-2 flex flex-wrap gap-1.5">
            {groups.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => set('group', g)}
                className={cx(
                  'rounded-md px-2 py-0.5 text-xs font-medium transition',
                  draft.group === g ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-white/5 dark:text-zinc-300',
                )}
              >
                {g}
              </button>
            ))}
          </div>
        )}

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
          <IconPicker value={draft.icon} color={draft.color} onChange={(v) => set('icon', v)} />
        </Field>

        <Field label="Color">
          <ColorPicker value={draft.color} onChange={(v) => set('color', v)} />
        </Field>

        <Field label="Count purchases whose description contains" hint="Comma-separated, e.g. goodwill, depop, thrift">
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
                  'rounded-md border px-2.5 py-1 text-xs font-medium transition',
                  draft.categories.includes(c)
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                    : 'border-zinc-200 text-zinc-600 hover:border-zinc-400 dark:border-white/10 dark:text-zinc-300',
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
