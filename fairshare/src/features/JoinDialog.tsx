import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { JoinPreview } from '../../shared/types.ts'
import { useJoinGroup } from '../api/hooks.ts'
import { useApi } from '../auth/AuthContext.tsx'
import { useUi } from '../lib/uiStore.ts'
import { Button } from '../ui/Button.tsx'
import { Field } from '../ui/Field.tsx'
import { Modal } from '../ui/Modal.tsx'

/**
 * Join a group from an invite code. If the group already lists you by name
 * (someone added "Aisha" before Aisha signed up), you can join *as* that
 * person and inherit their expenses and balance.
 */
export function JoinFlow({ initialCode = '', onDone }: { initialCode?: string; onDone?(): void }) {
  const api = useApi()
  const join = useJoinGroup()
  const navigate = useNavigate()
  const toast = useUi((s) => s.toast)
  const [code, setCode] = useState(initialCode)
  const [preview, setPreview] = useState<JoinPreview | null>(null)
  const [claim, setClaim] = useState<string>('new')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const look = async (value: string) => {
    setBusy(true)
    setError('')
    try {
      const p = await api.previewInvite(value)
      setPreview(p)
      setClaim(p.placeholders[0] ? String(p.placeholders[0].id) : 'new')
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
      return navigate(`/groups/${preview.groupId}`)
    }
    try {
      const g = await join.mutateAsync({ code, claimMemberId: claim === 'new' ? undefined : Number(claim) })
      toast(`You joined ${g.emoji} ${g.name}`, 'success')
      onDone?.()
      navigate(`/groups/${g.id}`)
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
        <Button type="submit" variant="primary" busy={busy} disabled={code.trim().length < 8}>Find group</Button>
      </form>
    )
  }

  return (
    <div className="stack">
      <div className="join-card">
        <span className="join-card__emoji" aria-hidden>{preview.emoji}</span>
        <div>
          <h3>{preview.name}</h3>
          <p className="muted small">{preview.memberCount} people · {preview.currency}</p>
        </div>
      </div>
      {preview.alreadyMember ? (
        <p>You're already in this group.</p>
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
          <p className="field__hint">Joining as an existing name takes over their share of past expenses.</p>
        </fieldset>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="row">
        <Button onClick={() => setPreview(null)}>Use a different code</Button>
        <Button variant="primary" busy={join.isPending} onClick={confirm}>{preview.alreadyMember ? 'Open group' : 'Join group'}</Button>
      </div>
    </div>
  )
}

export function JoinDialog({ open, onClose }: { open: boolean; onClose(): void }) {
  return (
    <Modal open={open} onClose={onClose} title="Join a group" description="Ask anyone in the group for its invite code." size="sm">
      <JoinFlow onDone={onClose} />
    </Modal>
  )
}
