import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users } from 'lucide-react'
import type { JoinPreview } from '../../shared/types.ts'
import { useJoinCrew } from '../api/hooks.ts'
import { useApi } from '../auth/AuthContext.tsx'
import { useUi } from '../lib/uiStore.ts'
import { Button } from '../ui/Button.tsx'
import { Field } from '../ui/Field.tsx'
import { Modal } from '../ui/Modal.tsx'

/**
 * Join a crew by invite code. If the crew already lists you (someone added
 * "Rohan" before Rohan signed up), join as that player and keep every result.
 */
export function JoinFlow({ initialCode = '', onDone }: { initialCode?: string; onDone?(): void }) {
  const api = useApi()
  const join = useJoinCrew()
  const navigate = useNavigate()
  const toast = useUi((s) => s.toast)
  const [code, setCode] = useState(initialCode)
  const [preview, setPreview] = useState<JoinPreview | null>(null)
  const [claim, setClaim] = useState('new')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const look = async (value: string) => {
    setBusy(true)
    setError('')
    try {
      const p = await api.previewInvite(value)
      setPreview(p)
      setClaim('new')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => {
    if (initialCode) void look(initialCode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode])

  const submitCode = (e: FormEvent) => {
    e.preventDefault()
    void look(code)
  }

  const confirm = async () => {
    if (!preview) return
    if (preview.alreadyMember) {
      onDone?.()
      return navigate(`/crews/${preview.crewId}`)
    }
    try {
      const crew = await join.mutateAsync({ code, claimPlayerId: claim === 'new' ? undefined : Number(claim) })
      toast(`Welcome to ${crew.name}`, 'success')
      onDone?.()
      navigate(`/crews/${crew.id}`)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (!preview) {
    return (
      <form onSubmit={submitCode} className="stack" noValidate>
        <Field label="Invite code" hint="8 letters and numbers, e.g. K7QM2XPA" error={error}>
          <input data-autofocus autoFocus={!!initialCode} className="code-input" autoComplete="off" autoCapitalize="characters" maxLength={8} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        </Field>
        <Button type="submit" variant="primary" busy={busy} disabled={code.trim().length < 8}>Find crew</Button>
      </form>
    )
  }

  return (
    <div className="stack">
      <div className="join-card">
        <span className="join-card__icon" aria-hidden><Users size={22} /></span>
        <div>
          <h3>{preview.name}</h3>
          <p className="muted small">{preview.playerCount} players</p>
        </div>
      </div>
      {preview.alreadyMember ? (
        <p>You're already in this crew.</p>
      ) : (
        <fieldset className="claim">
          <legend className="field__label">Which one is you?</legend>
          {preview.placeholders.map((p) => (
            <label key={p.id} className="claim__option">
              <input type="radio" name="claim" value={p.id} checked={claim === String(p.id)} onChange={(e) => setClaim(e.target.value)} />
              I'm {p.name}
            </label>
          ))}
          <label className="claim__option">
            <input type="radio" name="claim" value="new" checked={claim === 'new'} onChange={(e) => setClaim(e.target.value)} />
            I'm not listed — add me
          </label>
          {preview.placeholders.length > 0 && <p className="field__hint">Joining as an existing player keeps their results, rating and trophies.</p>}
        </fieldset>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="row">
        <Button onClick={() => setPreview(null)}>Use a different code</Button>
        <Button variant="primary" busy={join.isPending} onClick={confirm}>{preview.alreadyMember ? 'Open crew' : 'Join crew'}</Button>
      </div>
    </div>
  )
}

export function JoinDialog({ open, onClose }: { open: boolean; onClose(): void }) {
  return (
    <Modal open={open} onClose={onClose} title="Join a crew" description="Ask anyone in the crew for its invite code." size="sm">
      <JoinFlow onDone={onClose} />
    </Modal>
  )
}
