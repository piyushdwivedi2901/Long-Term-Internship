import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isoDate } from '../../shared/schemas.ts'
import { formatMoney, parseMoney, toInputValue } from '../../shared/money.ts'
import type { GroupDetail } from '../../shared/types.ts'
import { useCreateSettlement } from '../api/hooks.ts'
import { ApiError } from '../api/types.ts'
import { localToday } from '../lib/dates.ts'
import { useUi } from '../lib/uiStore.ts'
import { Button } from '../ui/Button.tsx'
import { Field } from '../ui/Field.tsx'
import { Modal } from '../ui/Modal.tsx'

const schema = z
  .object({
    fromMember: z.string(),
    toMember: z.string(),
    amount: z.string().refine((s) => (parseMoney(s) ?? 0) > 0, 'Enter an amount above zero'),
    date: isoDate,
    note: z.string().max(120, 'Use 120 characters or fewer'),
  })
  .refine((v) => v.fromMember !== v.toMember, { path: ['toMember'], message: 'Choose two different people' })
type Values = z.infer<typeof schema>

export interface SettlePreset {
  from: number
  to: number
  amount: number
}

/** Record that someone paid someone back (cash, UPI, bank transfer…). */
export function SettleDialog({ open, onClose, group, preset }: { open: boolean; onClose(): void; group: GroupDetail; preset?: SettlePreset }) {
  const create = useCreateSettlement(group.id)
  const toast = useUi((s) => s.toast)
  const name = (id: number) => group.members.find((m) => m.id === id)?.name ?? ''
  const fallbackTo = group.members.find((m) => m.id !== group.myMemberId)?.id ?? group.myMemberId
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (open) {
      reset({
        fromMember: String(preset?.from ?? group.myMemberId),
        toMember: String(preset?.to ?? fallbackTo),
        amount: preset ? toInputValue(preset.amount) : '',
        date: localToday(),
        note: '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const onSubmit = handleSubmit(async (v) => {
    try {
      const s = await create.mutateAsync({ fromMember: Number(v.fromMember), toMember: Number(v.toMember), amount: parseMoney(v.amount)!, date: v.date, note: v.note })
      toast(`Recorded ${name(s.fromMember)} paying ${name(s.toMember)} ${formatMoney(s.amount, group.currency)}`, 'success')
      onClose()
    } catch (err) {
      const fields = err instanceof ApiError ? err.fields : undefined
      if (fields) for (const [k, m] of Object.entries(fields)) setError(k as keyof Values, { message: m })
      else setError('root', { message: (err as Error).message })
    }
  })

  const options = group.members.map((m) => (
    <option key={m.id} value={m.id}>{m.isYou ? `${m.name} (you)` : m.name}</option>
  ))
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record a payment"
      description="Money changed hands outside Fairshare? Record it here to update everyone's balances."
      size="sm"
      sheet
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="settle-form" busy={isSubmitting}>Record payment</Button>
        </>
      }
    >
      <form id="settle-form" className="stack" onSubmit={onSubmit} noValidate>
        <div className="form-row">
          <Field label="Who paid" error={errors.fromMember?.message}>
            <select {...register('fromMember')}>{options}</select>
          </Field>
          <Field label="Paid to" error={errors.toMember?.message}>
            <select {...register('toMember')}>{options}</select>
          </Field>
        </div>
        <Field label="Amount" error={errors.amount?.message}>
          <input inputMode="decimal" data-autofocus autoComplete="off" {...register('amount')} />
        </Field>
        <div className="form-row">
          <Field label="Date" error={errors.date?.message}>
            <input type="date" {...register('date')} />
          </Field>
          <Field label="Note" hint="e.g. UPI, cash" error={errors.note?.message}>
            <input autoComplete="off" {...register('note')} />
          </Field>
        </div>
        {errors.root && <p className="form-error" role="alert">{errors.root.message}</p>}
      </form>
    </Modal>
  )
}
