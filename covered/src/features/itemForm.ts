import type { Resolver } from 'react-hook-form'
import { CATEGORIES, itemSchema, type Category, type CoverageKind, type ItemInput } from '../../shared/schemas.ts'
import { parseInr, toInputValue } from '../../shared/money.ts'
import type { ItemDetail } from '../../shared/types.ts'

export interface CoverRow {
  kind: CoverageKind
  label: string
  amount: string
  unit: 'years' | 'months'
  provider: string
}
export interface ItemFormValues {
  name: string
  brand: string
  model: string
  category: Category
  room: string
  purchaseDate: string
  price: string
  store: string
  invoiceNo: string
  serialNo: string
  coverages: CoverRow[]
  support: { phone: string; email: string; website: string }
  notes: string
}

export const DEFAULT_LABEL: Record<CoverageKind, string> = { standard: 'Standard', extended: 'Extended', component: '' }

export const emptyForm = (today: string): ItemFormValues => ({
  name: '',
  brand: '',
  model: '',
  category: 'other',
  room: '',
  purchaseDate: today,
  price: '',
  store: '',
  invoiceNo: '',
  serialNo: '',
  coverages: [{ kind: 'standard', label: 'Standard', amount: '1', unit: 'years', provider: '' }],
  support: { phone: '', email: '', website: '' },
  notes: '',
})

export const toForm = (i: ItemDetail): ItemFormValues => ({
  name: i.name,
  brand: i.brand,
  model: i.model,
  category: i.category,
  room: i.room,
  purchaseDate: i.purchaseDate,
  price: i.price === null ? '' : toInputValue(i.price),
  store: i.store,
  invoiceNo: i.invoiceNo,
  serialNo: i.serialNo,
  coverages: i.coverages.map((c) => ({
    kind: c.kind,
    label: c.label,
    amount: String(c.months % 12 === 0 ? c.months / 12 : c.months),
    unit: c.months % 12 === 0 ? 'years' : 'months',
    provider: c.provider,
  })),
  support: { ...i.support },
  notes: i.notes,
})

/** Months from what was typed, or NaN. "1.5 years" is allowed (18 months). */
export const rowMonths = (r: CoverRow) => {
  const n = Number(r.amount.replace(',', '.'))
  if (!r.amount.trim() || !Number.isFinite(n)) return NaN
  return r.unit === 'years' ? Math.round(n * 12 * 100) / 100 : n
}

export function toInput(v: ItemFormValues): ItemInput {
  const price = v.price.trim() ? parseInr(v.price) : null
  return {
    name: v.name,
    brand: v.brand,
    model: v.model,
    category: (CATEGORIES as readonly string[]).includes(v.category) ? v.category : 'other',
    room: v.room,
    purchaseDate: v.purchaseDate,
    price: price ?? null,
    store: v.store,
    invoiceNo: v.invoiceNo,
    serialNo: v.serialNo,
    coverages: v.coverages.map((r) => ({ kind: r.kind, label: r.kind === 'standard' ? r.label || 'Standard' : r.label, months: rowMonths(r), provider: r.provider })),
    support: v.support,
    notes: v.notes,
  }
}

type FieldErrors = Record<string, { type: string; message: string }>

/** Maps a schema path to the form field that shows the message. */
const fieldFor = (path: (string | number | symbol)[]) => {
  const p = path.map(String)
  if (p[0] === 'coverages' && p.length >= 3) return `coverages.${p[1]}.${p[2] === 'months' ? 'amount' : p[2]}`
  return p.join('.') || 'root'
}

/**
 * Validates with the exact schema the server uses, after turning "54,990"
 * and "5 years" into paise and months.
 */
export const itemResolver: Resolver<ItemFormValues> = async (values) => {
  const errors: FieldErrors = {}
  if (values.price.trim() && parseInr(values.price) === null) errors.price = { type: 'format', message: 'Enter an amount like 54,990 or 54990.50' }
  values.coverages.forEach((r, i) => {
    const m = rowMonths(r)
    if (Number.isNaN(m)) errors[`coverages.${i}.amount`] = { type: 'required', message: 'How long?' }
    else if (!Number.isInteger(m)) errors[`coverages.${i}.amount`] = { type: 'format', message: 'Use whole months' }
  })
  const result = itemSchema.safeParse(toInput(values))
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = fieldFor(issue.path)
      errors[key] ??= { type: issue.code, message: issue.message }
    }
  }
  if (Object.keys(errors).length) {
    // react-hook-form expects nested errors
    const nested: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(errors)) {
      const parts = k.split('.')
      let o = nested as Record<string, unknown>
      for (let j = 0; j < parts.length - 1; j++) {
        o[parts[j]] ??= /^\d+$/.test(parts[j + 1]) ? [] : {}
        o = o[parts[j]] as Record<string, unknown>
      }
      o[parts.at(-1)!] = v
    }
    return { values: {}, errors: nested as never }
  }
  return { values, errors: {} }
}

export interface Preset {
  id: string
  label: string
  row: Omit<CoverRow, 'provider'>
}
export const PRESETS: Preset[] = [
  { id: 'std1', label: 'Standard · 1 year', row: { kind: 'standard', label: 'Standard', amount: '1', unit: 'years' } },
  { id: 'std2', label: 'Standard · 2 years', row: { kind: 'standard', label: 'Standard', amount: '2', unit: 'years' } },
  { id: 'ext', label: 'Extended warranty', row: { kind: 'extended', label: 'Extended', amount: '2', unit: 'years' } },
  { id: 'comp5', label: 'Compressor · 5 years', row: { kind: 'component', label: 'Compressor', amount: '5', unit: 'years' } },
  { id: 'comp10', label: 'Compressor · 10 years', row: { kind: 'component', label: 'Compressor', amount: '10', unit: 'years' } },
  { id: 'motor', label: 'Motor · 10 years', row: { kind: 'component', label: 'Motor', amount: '10', unit: 'years' } },
  { id: 'panel', label: 'Panel · 2 years', row: { kind: 'component', label: 'Panel', amount: '2', unit: 'years' } },
  { id: 'battery', label: 'Battery · 3 years', row: { kind: 'component', label: 'Battery', amount: '3', unit: 'years' } },
]
