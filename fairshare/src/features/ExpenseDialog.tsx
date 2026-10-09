import { useEffect, useId, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CATEGORIES, CATEGORY_LABELS, isoDate, type Category, type ExpenseInput } from '../../shared/schemas.ts'
import { formatMoney, parseMoney, toInputValue } from '../../shared/money.ts'
import { SplitError, computeShares, type Split, type SplitType } from '../../shared/split.ts'
import type { Expense, GroupDetail } from '../../shared/types.ts'
import { useSaveExpense } from '../api/hooks.ts'
import { ApiError } from '../api/types.ts'
import { localToday } from '../lib/dates.ts'
import { useUi } from '../lib/uiStore.ts'
import { Avatar, CATEGORY_ICONS } from '../ui/bits.tsx'
import { Button } from '../ui/Button.tsx'
import { Field } from '../ui/Field.tsx'
import { Modal } from '../ui/Modal.tsx'

const formSchema = z.object({
  description: z.string().trim().min(1, 'Describe the expense').max(80, 'Use 80 characters or fewer'),
  amount: z
    .string()
    .refine((s) => parseMoney(s) !== null, 'Enter an amount like 1200 or 99.50')
    .refine((s) => (parseMoney(s) ?? 0) > 0, 'Enter an amount above zero'),
  paidBy: z.string().min(1, 'Choose who paid'),
  date: isoDate,
  category: z.enum(CATEGORIES),
  notes: z.string().max(500, 'Use 500 characters or fewer'),
})
type FormValues = z.infer<typeof formSchema>

const MODES: { type: SplitType; label: string; hint: string }[] = [
  { type: 'equal', label: 'Equally', hint: 'Everyone ticked pays the same' },
  { type: 'exact', label: 'Exact amounts', hint: 'Type what each person owes' },
  { type: 'percent', label: 'Percentages', hint: 'Each person pays a share of 100%' },
  { type: 'shares', label: 'Shares', hint: 'e.g. a couple counts as 2, a single as 1' },
]

/** Per-person values for each split mode, kept separately so switching modes doesn't lose input. */
interface SplitDraft {
  type: SplitType
  included: Record<number, boolean>
  exact: Record<number, string>
  percent: Record<number, string>
  shares: Record<number, string>
}

function draftFrom(group: GroupDetail, expense?: Expense): SplitDraft {
  const ids = group.members.map((m) => m.id)
  const d: SplitDraft = {
    type: 'equal',
    included: Object.fromEntries(ids.map((id) => [id, true])),
    exact: Object.fromEntries(ids.map((id) => [id, ''])),
    percent: Object.fromEntries(ids.map((id) => [id, ''])),
    shares: Object.fromEntries(ids.map((id) => [id, '1'])),
  }
  const s = expense?.split
  if (!s) return d
  d.type = s.type
  if (s.type === 'equal') d.included = Object.fromEntries(ids.map((id) => [id, s.memberIds.includes(id)]))
  if (s.type === 'exact') for (const a of s.amounts) d.exact[a.memberId] = toInputValue(a.amount)
  if (s.type === 'percent') for (const p of s.percents) d.percent[p.memberId] = String(p.basisPoints / 100)
  if (s.type === 'shares') {
    for (const id of ids) d.shares[id] = '0'
    for (const x of s.shares) d.shares[x.memberId] = String(x.shares)
  }
  return d
}

const toBasisPoints = (s: string) => {
  if (!s.trim()) return 0
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(s.trim())) return NaN
  return Math.round(Number(s) * 100)
}

/** Turns the draft into the Split the API expects, or explains what's wrong. */
export function buildSplit(draft: SplitDraft, memberIds: number[]): { split?: Split; error?: string } {
  switch (draft.type) {
    case 'equal': {
      const ids = memberIds.filter((id) => draft.included[id])
      return ids.length ? { split: { type: 'equal', memberIds: ids } } : { error: 'Choose at least one person to split with' }
    }
    case 'exact': {
      const amounts = memberIds.map((id) => ({ memberId: id, amount: draft.exact[id]?.trim() ? parseMoney(draft.exact[id]) : 0 }))
      if (amounts.some((a) => a.amount === null)) return { error: 'Use amounts like 250 or 99.50' }
      return { split: { type: 'exact', amounts: amounts.filter((a) => (a.amount ?? 0) > 0) as { memberId: number; amount: number }[] } }
    }
    case 'percent': {
      const percents = memberIds.map((id) => ({ memberId: id, basisPoints: toBasisPoints(draft.percent[id] ?? '') }))
      if (percents.some((p) => Number.isNaN(p.basisPoints))) return { error: 'Use percentages like 25 or 33.33' }
      return { split: { type: 'percent', percents: percents.filter((p) => p.basisPoints > 0) } }
    }
    case 'shares': {
      const shares = memberIds.map((id) => ({ memberId: id, shares: Number(draft.shares[id] || 0) }))
      if (shares.some((s) => !Number.isInteger(s.shares) || s.shares < 0)) return { error: 'Shares are whole numbers' }
      return { split: { type: 'shares', shares: shares.filter((s) => s.shares > 0) } }
    }
  }
}

interface Props {
  open: boolean
  onClose(): void
  group: GroupDetail
  /** Edit this expense; omit to add a new one. */
  expense?: Expense
}

export function ExpenseDialog({ open, onClose, group, expense }: Props) {
  const save = useSaveExpense(group.id)
  const toast = useUi((s) => s.toast)
  const [draft, setDraft] = useState<SplitDraft>(() => draftFrom(group, expense))
  const [splitTouched, setSplitTouched] = useState(false)
  const splitHeading = useId()

  const defaults = (): FormValues => ({
    description: expense?.description ?? '',
    amount: expense ? toInputValue(expense.amount) : '',
    paidBy: String(expense?.paidBy ?? group.myMemberId),
    date: expense?.date ?? localToday(),
    category: expense?.category ?? 'food',
    notes: expense?.notes ?? '',
  })
  const { register, handleSubmit, reset, watch, setError, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaults(),
  })

  useEffect(() => {
    if (open) {
      reset(defaults())
      setDraft(draftFrom(group, expense))
      setSplitTouched(false)
    }
    // reset only when the dialog opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const amount = parseMoney(watch('amount') ?? '') ?? 0
  const memberIds = group.members.map((m) => m.id)
  const built = buildSplit(draft, memberIds)

  /** Live preview of what each person will owe, or the reason the split doesn't work yet. */
  const preview = useMemo(() => {
    if (built.error) return { error: built.error }
    if (!amount) return { shares: new Map<number, number>() }
    try {
      return { shares: computeShares(amount, built.split!) }
    } catch (e) {
      return { error: e instanceof SplitError ? e.message.replace(/(\d+\.\d{2})/g, (m) => formatMoney(Math.round(Number(m) * 100), group.currency)) : String(e) }
    }
  }, [amount, built.error, built.split, group.currency])

  const remaining = (() => {
    if (!amount) return null
    if (draft.type === 'exact') {
      const sum = memberIds.reduce((n, id) => n + (parseMoney(draft.exact[id] || '0') ?? 0), 0)
      return { left: amount - sum, label: formatMoney(Math.abs(amount - sum), group.currency) }
    }
    if (draft.type === 'percent') {
      const sum = memberIds.reduce((n, id) => n + (toBasisPoints(draft.percent[id] ?? '') || 0), 0)
      return { left: 10_000 - sum, label: `${(Math.abs(10_000 - sum) / 100).toFixed(2).replace(/\.00$/, '')}%` }
    }
    return null
  })()

  const set = <K extends 'included' | 'exact' | 'percent' | 'shares'>(key: K, id: number, value: SplitDraft[K][number]) => {
    setSplitTouched(true)
    setDraft((d) => ({ ...d, [key]: { ...d[key], [id]: value } }))
  }

  const onSubmit = handleSubmit(async (values) => {
    setSplitTouched(true)
    if (preview.error || !built.split) return
    const input: ExpenseInput = {
      description: values.description,
      amount: parseMoney(values.amount)!,
      paidBy: Number(values.paidBy),
      date: values.date,
      category: values.category as Category,
      notes: values.notes,
      split: built.split,
    }
    try {
      await save.mutateAsync({ id: expense?.id, input })
      toast(expense ? 'Expense updated' : `Added “${input.description}”`, 'success')
      onClose()
    } catch (err) {
      const fields = err instanceof ApiError ? err.fields : undefined
      if (fields) {
        for (const [k, m] of Object.entries(fields)) {
          if (k in values) setError(k as keyof FormValues, { message: m })
          else setError('root', { message: m })
        }
      } else setError('root', { message: (err as Error).message })
    }
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={expense ? 'Edit expense' : 'Add an expense'}
      description={`${group.emoji} ${group.name}`}
      size="lg"
      sheet
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="expense-form" busy={isSubmitting}>
            {expense ? 'Save changes' : 'Add expense'}
          </Button>
        </>
      }
    >
      <form id="expense-form" className="expense-form" onSubmit={onSubmit} noValidate>
        <div className="field amount-field">
          <label htmlFor="expense-amount" className="field__label">Amount ({group.currency})</label>
          <span className="money-input">
            <span className="money-input__symbol" aria-hidden>{formatMoney(0, group.currency).replace(/[\d.,\s]/g, '')}</span>
            <input
              id="expense-amount"
              data-autofocus
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              aria-invalid={errors.amount ? true : undefined}
              aria-describedby={errors.amount ? 'expense-amount-error' : undefined}
              {...register('amount')}
            />
          </span>
          {errors.amount && <p id="expense-amount-error" className="field__error" role="alert">{errors.amount.message}</p>}
        </div>
        <Field label="What was it for?" error={errors.description?.message}>
          <input autoComplete="off" placeholder="e.g. Dinner at Thalassa" {...register('description')} />
        </Field>
        <div className="form-row">
          <Field label="Paid by" error={errors.paidBy?.message}>
            <select {...register('paidBy')}>
              {group.members.map((m) => (
                <option key={m.id} value={m.id}>{m.isYou ? `${m.name} (you)` : m.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Date" error={errors.date?.message}>
            <input type="date" {...register('date')} />
          </Field>
        </div>

        <fieldset className="chips">
          <legend className="field__label">Category</legend>
          {CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICONS[c]
            return (
              <label key={c} className={`chip cat--${c}`}>
                <input type="radio" value={c} {...register('category')} />
                <Icon size={15} aria-hidden /> {CATEGORY_LABELS[c]}
              </label>
            )
          })}
        </fieldset>

        <section className="split" aria-labelledby={splitHeading}>
          <h3 id={splitHeading} className="field__label">Split</h3>
          <div className="segmented" role="radiogroup" aria-label="How to split">
            {MODES.map((m) => (
              <button
                key={m.type}
                type="button"
                role="radio"
                aria-checked={draft.type === m.type}
                onClick={() => setDraft((d) => ({ ...d, type: m.type }))}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="hint">{MODES.find((m) => m.type === draft.type)!.hint}</p>

          <ul className="split__people">
            {group.members.map((m) => {
              const share = preview.shares?.get(m.id) ?? 0
              const label = m.isYou ? `${m.name} (you)` : m.name
              return (
                <li key={m.id}>
                  <Avatar name={m.name} size={30} you={m.isYou} />
                  {draft.type === 'equal' ? (
                    <label className="split__check">
                      <input type="checkbox" checked={!!draft.included[m.id]} onChange={(e) => set('included', m.id, e.target.checked)} />
                      {label}
                    </label>
                  ) : (
                    <span className="split__name">{label}</span>
                  )}
                  {draft.type === 'exact' && (
                    <input className="split__input" inputMode="decimal" aria-label={`Amount for ${m.name}`} placeholder="0" value={draft.exact[m.id]} onChange={(e) => set('exact', m.id, e.target.value)} />
                  )}
                  {draft.type === 'percent' && (
                    <span className="split__suffix">
                      <input className="split__input" inputMode="decimal" aria-label={`Percent for ${m.name}`} placeholder="0" value={draft.percent[m.id]} onChange={(e) => set('percent', m.id, e.target.value)} />%
                    </span>
                  )}
                  {draft.type === 'shares' && (
                    <span className="stepper">
                      <button type="button" aria-label={`Fewer shares for ${m.name}`} onClick={() => set('shares', m.id, String(Math.max(0, Number(draft.shares[m.id] || 0) - 1)))}>−</button>
                      <input inputMode="numeric" aria-label={`Shares for ${m.name}`} value={draft.shares[m.id]} onChange={(e) => set('shares', m.id, e.target.value)} />
                      <button type="button" aria-label={`More shares for ${m.name}`} onClick={() => set('shares', m.id, String(Number(draft.shares[m.id] || 0) + 1))}>+</button>
                    </span>
                  )}
                  <span className="split__owes" aria-label={`${m.name} owes ${formatMoney(share, group.currency)}`}>
                    {formatMoney(share, group.currency)}
                  </span>
                </li>
              )
            })}
          </ul>
          <div className="split__status" aria-live="polite">
            {remaining && remaining.left !== 0 && (
              <span className="split__remaining">{remaining.left > 0 ? `${remaining.label} left to assign` : `${remaining.label} over the total`}</span>
            )}
            {splitTouched && preview.error && <p className="field__error" role="alert">{preview.error}</p>}
          </div>
        </section>

        <Field label="Notes" hint="Optional" error={errors.notes?.message}>
          <textarea rows={2} {...register('notes')} />
        </Field>
        {errors.root && <p className="form-error" role="alert">{errors.root.message}</p>}
      </form>
    </Modal>
  )
}
