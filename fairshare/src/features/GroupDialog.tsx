import { useLayoutEffect, useState, type KeyboardEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { X } from 'lucide-react'
import { CURRENCIES, CURRENCY_NAMES } from '../../shared/money.ts'
import { GROUP_EMOJIS, groupSchema } from '../../shared/schemas.ts'
import type { GroupDetail } from '../../shared/types.ts'
import { useCreateGroup, useUpdateGroup } from '../api/hooks.ts'
import { ApiError } from '../api/types.ts'
import { useUi } from '../lib/uiStore.ts'
import { Button } from '../ui/Button.tsx'
import { Field } from '../ui/Field.tsx'
import { Modal } from '../ui/Modal.tsx'

const schema = z.object({
  name: groupSchema.shape.name,
  emoji: z.enum(GROUP_EMOJIS),
  currency: z.enum(CURRENCIES),
})
type Values = z.infer<typeof schema>

/** New group (with the people in it) or edit an existing group's details. */
export function GroupDialog({ open, onClose, group }: { open: boolean; onClose(): void; group?: GroupDetail }) {
  const create = useCreateGroup()
  const update = useUpdateGroup(group?.id ?? 0)
  const toast = useUi((s) => s.toast)
  const navigate = useNavigate()
  const [people, setPeople] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const [peopleError, setPeopleError] = useState('')
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) })

  useLayoutEffect(() => {
    if (open) {
      reset({ name: group?.name ?? '', emoji: (group?.emoji as Values['emoji']) ?? '🏖️', currency: group?.currency ?? 'INR' })
      setPeople([])
      setDraft('')
      setPeopleError('')
    }
  }, [open, group, reset])

  const addPerson = () => {
    const name = draft.trim()
    if (!name) return
    if (people.some((p) => p.toLowerCase() === name.toLowerCase())) return setPeopleError(`${name} is already on the list`)
    if (people.length >= 19) return setPeopleError('A group can have up to 20 people')
    setPeople([...people, name])
    setDraft('')
    setPeopleError('')
  }
  const onPersonKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addPerson()
    }
  }

  const onSubmit = handleSubmit(async (v) => {
    try {
      if (group) {
        await update.mutateAsync(v)
        toast('Group updated', 'success')
        onClose()
      } else {
        const names = draft.trim() ? [...people, draft.trim()] : people
        const g = await create.mutateAsync({ ...v, memberNames: names })
        toast(`Created ${g.emoji} ${g.name}`, 'success')
        onClose()
        navigate(`/groups/${g.id}`)
      }
    } catch (err) {
      const fields = err instanceof ApiError ? err.fields : undefined
      if (fields?.memberNames) setPeopleError(fields.memberNames)
      else if (fields) for (const [k, m] of Object.entries(fields)) setError(k as keyof Values, { message: m })
      else setError('root', { message: (err as Error).message })
    }
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={group ? 'Edit group' : 'New group'}
      size="md"
      sheet
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="group-form" busy={isSubmitting}>{group ? 'Save changes' : 'Create group'}</Button>
        </>
      }
    >
      <form id="group-form" className="stack" onSubmit={onSubmit} noValidate>
        <Field label="Group name" error={errors.name?.message}>
          <input data-autofocus autoComplete="off" placeholder="e.g. Goa trip, Flat 4B" {...register('name')} />
        </Field>
        <fieldset className="emoji-pick">
          <legend className="field__label">Icon</legend>
          {GROUP_EMOJIS.map((e) => (
            <label key={e}>
              <input type="radio" value={e} {...register('emoji')} />
              <span aria-hidden>{e}</span>
              <span className="sr-only">{e}</span>
            </label>
          ))}
        </fieldset>
        <Field label="Currency" hint={group && group.expenseCount > 0 ? "Locked because the group has expenses" : undefined} error={errors.currency?.message}>
          <select disabled={!!group && group.expenseCount > 0} {...register('currency')}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c} — {CURRENCY_NAMES[c]}</option>)}
          </select>
        </Field>
        {!group && (
          <div className="field">
            <label htmlFor="people-input" className="field__label">Who's in it, besides you?</label>
            {people.length > 0 && (
              <ul className="people-chips" aria-label="People added">
                {people.map((p) => (
                  <li key={p}>
                    {p}
                    <button type="button" className="icon-btn icon-btn--sm" aria-label={`Remove ${p}`} onClick={() => setPeople(people.filter((x) => x !== p))}>
                      <X size={13} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="inline-add">
              <input id="people-input" value={draft} placeholder="Type a name, press Enter" autoComplete="off" onChange={(e) => setDraft(e.target.value)} onKeyDown={onPersonKey} aria-describedby="people-hint" />
              <Button onClick={addPerson} disabled={!draft.trim()}>Add</Button>
            </div>
            <p id="people-hint" className="field__hint">They don't need an account. Share the invite code later and they can join as themselves.</p>
            {peopleError && <p className="field__error" role="alert">{peopleError}</p>}
          </div>
        )}
        {errors.root && <p className="form-error" role="alert">{errors.root.message}</p>}
      </form>
    </Modal>
  )
}
