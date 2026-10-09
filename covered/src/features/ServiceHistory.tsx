import { useLayoutEffect, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { Pencil, Plus, Trash2, Wrench } from 'lucide-react'
import { useDeleteClaim, useSaveClaim } from '../api/hooks.ts'
import { ApiError } from '../api/types.ts'
import { CLAIM_STATUSES, CLAIM_STATUS_LABELS, claimSchema, type ClaimInput, type ClaimStatus } from '../../shared/schemas.ts'
import { formatInr, parseInr, toInputValue } from '../../shared/money.ts'
import type { Claim, ItemDetail } from '../../shared/types.ts'
import { formatDate, localToday } from '../lib/dates.ts'
import { useUi } from '../lib/uiStore.ts'
import { Button } from '../ui/Button.tsx'
import { ConfirmDialog } from '../ui/ConfirmDialog.tsx'
import { Field } from '../ui/Field.tsx'
import { Modal } from '../ui/Modal.tsx'

interface ClaimForm {
  date: string
  issue: string
  status: ClaimStatus
  underWarranty: boolean
  cost: string
  ticketNo: string
  notes: string
}

const toInput = (v: ClaimForm): ClaimInput => ({ ...v, cost: v.cost.trim() ? (parseInr(v.cost) ?? NaN) : 0 })

const resolver: Resolver<ClaimForm> = async (values) => {
  const errors: Record<string, { type: string; message: string }> = {}
  if (values.cost.trim() && parseInr(values.cost) === null) errors.cost = { type: 'format', message: 'Enter an amount like 1,850' }
  const r = claimSchema.safeParse(toInput(values))
  if (!r.success) for (const i of r.error.issues) errors[String(i.path[0] ?? 'root')] ??= { type: i.code, message: i.message }
  return Object.keys(errors).length ? { values: {}, errors: errors as never } : { values, errors: {} }
}

/** Was any cover running on this day? Used to pre-tick "under warranty". */
const coveredOn = (item: ItemDetail, day: string) => item.coverages.some((c) => c.start <= day && day <= c.end)

function ClaimDialog({ item, claim, open, onClose }: { item: ItemDetail; claim: Claim | null; open: boolean; onClose(): void }) {
  const save = useSaveClaim(item.id)
  const toast = useUi((s) => s.toast)
  const today = localToday()
  const blank = (): ClaimForm => ({ date: today, issue: '', status: 'open', underWarranty: coveredOn(item, today), cost: '', ticketNo: '', notes: '' })
  const { register, handleSubmit, reset, setError, setValue, formState: { errors, isSubmitting, dirtyFields } } = useForm<ClaimForm>({ resolver, defaultValues: blank() })

  // Reset before paint, so a re-opened dialog never flashes the previous repair.
  useLayoutEffect(() => {
    if (!open) return
    reset(
      claim
        ? { date: claim.date, issue: claim.issue, status: claim.status, underWarranty: claim.underWarranty, cost: claim.cost ? toInputValue(claim.cost) : '', ticketNo: claim.ticketNo, notes: claim.notes }
        : blank(),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, claim, reset])

  const onSubmit = handleSubmit(async (v) => {
    try {
      await save.mutateAsync({ id: claim?.id, input: toInput(v) })
      toast(claim ? 'Repair updated' : 'Repair logged', 'success')
      onClose()
    } catch (e) {
      if (e instanceof ApiError && e.fields) for (const [k, m] of Object.entries(e.fields)) setError(k as keyof ClaimForm, { message: m })
      else setError('root', { message: (e as Error).message })
    }
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={claim ? 'Edit repair' : 'Log a repair or claim'}
      description={item.name}
      sheet
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="claim-form" busy={isSubmitting}>{claim ? 'Save' : 'Log repair'}</Button>
        </>
      }
    >
      <form id="claim-form" className="stack" onSubmit={onSubmit} noValidate>
        <Field label="What went wrong?" error={errors.issue?.message}>
          <input data-autofocus placeholder="e.g. Not cooling, screen flickers" {...register('issue')} />
        </Field>
        <div className="form-row">
          <Field label="Date reported" error={errors.date?.message}>
            <input
              type="date"
              min={item.purchaseDate}
              max={today}
              {...register('date', {
                // Follow the date with the "under warranty" tick, until the user sets it themselves.
                onChange: (e) => !dirtyFields.underWarranty && setValue('underWarranty', coveredOn(item, e.target.value)),
              })}
            />
          </Field>
          <Field label="Status" error={errors.status?.message}>
            <select {...register('status')}>
              {CLAIM_STATUSES.map((s) => (
                <option key={s} value={s}>{CLAIM_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </Field>
        </div>
        <label className="check">
          <input type="checkbox" {...register('underWarranty')} />
          <span>
            Claimed under warranty
            <span className="muted small"> — ticked automatically when the date falls inside a cover</span>
          </span>
        </label>
        <div className="form-row">
          <Field label="You paid (₹)" hint="Leave empty if it was free" error={errors.cost?.message}>
            <input inputMode="decimal" placeholder="0" {...register('cost')} />
          </Field>
          <Field label="Complaint / ticket number" error={errors.ticketNo?.message}>
            <input className="mono" {...register('ticketNo')} />
          </Field>
        </div>
        <Field label="Notes" error={errors.notes?.message}>
          <textarea rows={3} placeholder="Technician's name, parts replaced, promised date…" {...register('notes')} />
        </Field>
        {errors.root && <p className="form-error" role="alert">{errors.root.message}</p>}
      </form>
    </Modal>
  )
}

/** Every repair, newest first — useful at the next claim, and when you sell it. */
export function ServiceHistory({ item }: { item: ItemDetail }) {
  const [editing, setEditing] = useState<Claim | null>(null)
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState<Claim | null>(null)
  const remove = useDeleteClaim(item.id)
  const toast = useUi((s) => s.toast)

  return (
    <section className="card" aria-labelledby="history-title">
      <div className="card__head">
        <h2 id="history-title" className="section-title">Repairs &amp; claims</h2>
        <Button size="sm" icon={<Plus size={15} aria-hidden />} onClick={() => (setEditing(null), setOpen(true))}>Log a repair</Button>
      </div>
      {item.claims.length === 0 ? (
        <p className="muted">No repairs so far. When something goes wrong, log it here with the ticket number so you can follow up.</p>
      ) : (
        <ol className="history">
          {item.claims.map((c) => (
            <li key={c.id} className={`history__item history__item--${c.status}`}>
              <span className="history__icon" aria-hidden><Wrench size={15} /></span>
              <div className="history__main">
                <div className="history__top">
                  <strong>{c.issue}</strong>
                  <span className={`claim-status claim-status--${c.status}`}>{CLAIM_STATUS_LABELS[c.status]}</span>
                </div>
                <p className="muted small">
                  {formatDate(c.date)} · {c.underWarranty ? 'Under warranty' : 'Paid repair'}
                  {c.cost > 0 && <> · {formatInr(c.cost)}</>}
                  {c.ticketNo && <> · ticket <span className="mono">{c.ticketNo}</span></>}
                </p>
                {c.notes && <p className="history__notes">{c.notes}</p>}
              </div>
              <div className="history__actions">
                <button type="button" className="icon-btn icon-btn--sm" aria-label={`Edit repair: ${c.issue}`} onClick={() => (setEditing(c), setOpen(true))}><Pencil size={15} aria-hidden /></button>
                <button type="button" className="icon-btn icon-btn--sm" aria-label={`Delete repair: ${c.issue}`} onClick={() => setDeleting(c)}><Trash2 size={15} aria-hidden /></button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <ClaimDialog item={item} claim={editing} open={open} onClose={() => setOpen(false)} />
      <ConfirmDialog
        open={!!deleting}
        title="Delete this repair?"
        confirmLabel="Delete"
        busy={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => remove.mutate(deleting!.id, { onSuccess: () => toast('Repair deleted', 'success'), onError: (e) => toast(e.message, 'error'), onSettled: () => setDeleting(null) })}
      >
        <p>“{deleting?.issue}” will be removed from the history.</p>
      </ConfirmDialog>
    </section>
  )
}
