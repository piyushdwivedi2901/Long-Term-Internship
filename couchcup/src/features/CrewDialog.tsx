import { useLayoutEffect, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { MAX_PLAYERS, crewSchema } from '../../shared/schemas.ts'
import { useCreateCrew } from '../api/hooks.ts'
import { ApiError } from '../api/types.ts'
import { useUi } from '../lib/uiStore.ts'
import { Button } from '../ui/Button.tsx'
import { Field } from '../ui/Field.tsx'
import { Modal } from '../ui/Modal.tsx'

/** Start a crew: a name and the friends you play with. */
export function CrewDialog({ open, onClose }: { open: boolean; onClose(): void }) {
  const create = useCreateCrew()
  const toast = useUi((s) => s.toast)
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [people, setPeople] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useLayoutEffect(() => {
    if (!open) return
    setName('')
    setPeople([])
    setDraft('')
    setErrors({})
  }, [open])

  const addPerson = () => {
    const n = draft.trim()
    if (!n) return
    if (n.length > 24) return setErrors({ playerNames: 'Use 24 characters or fewer' })
    if (people.some((p) => p.toLowerCase() === n.toLowerCase())) return setErrors({ playerNames: `${n} is already on the list` })
    if (people.length >= MAX_PLAYERS - 1) return setErrors({ playerNames: `A crew can have up to ${MAX_PLAYERS} players` })
    setPeople([...people, n])
    setDraft('')
    setErrors({})
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addPerson()
    }
  }

  const submit = async () => {
    const input = { name, playerNames: draft.trim() ? [...people, draft.trim()] : people }
    const check = crewSchema.safeParse(input)
    if (!check.success) {
      const next: Record<string, string> = {}
      for (const i of check.error.issues) next[String(i.path[0] ?? 'root')] ??= i.message
      return setErrors(next)
    }
    try {
      const crew = await create.mutateAsync(input)
      toast(`${crew.name} is ready`, 'success')
      onClose()
      navigate(`/crews/${crew.id}`)
    } catch (e) {
      setErrors(e instanceof ApiError && e.fields ? e.fields : { root: (e as Error).message })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Start a crew"
      description="The friends you play with. Everyone gets a rating; you can run any number of leagues and cups."
      sheet
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" busy={create.isPending} onClick={submit}>Create crew</Button>
        </>
      }
    >
      <form className="stack" onSubmit={(e) => (e.preventDefault(), void submit())} noValidate>
        <Field label="Crew name" error={errors.name}>
          <input data-autofocus value={name} maxLength={40} placeholder="e.g. Hostel Room 12, Friday FIFA" onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="field">
          <label htmlFor="crew-people" className="field__label">Who plays, besides you?</label>
          {people.length > 0 && (
            <ul className="name-chips" aria-label="Players added">
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
            <input id="crew-people" value={draft} placeholder="Type a name, press Enter" autoComplete="off" onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} aria-describedby="crew-people-hint" />
            <Button onClick={addPerson} disabled={!draft.trim()}>Add</Button>
          </div>
          <p id="crew-people-hint" className="field__hint">They don't need accounts. Share the invite code later and they can claim their name — results included.</p>
          {errors.playerNames && <p className="field__error" role="alert">{errors.playerNames}</p>}
        </div>
        {errors.root && <p className="form-error" role="alert">{errors.root}</p>}
      </form>
    </Modal>
  )
}
