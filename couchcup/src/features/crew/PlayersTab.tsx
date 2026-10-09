import { useLayoutEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Pencil, RefreshCw, Trash2 } from 'lucide-react'
import { KIT_COLORS } from '../../../shared/schemas.ts'
import type { CrewDetail, Player } from '../../../shared/types.ts'
import { useCrewMutations } from '../../api/hooks.ts'
import { ApiError } from '../../api/types.ts'
import { useUi } from '../../lib/uiStore.ts'
import { Button } from '../../ui/Button.tsx'
import { ConfirmDialog } from '../../ui/ConfirmDialog.tsx'
import { Field } from '../../ui/Field.tsx'
import { Kit } from '../../ui/bits.tsx'
import { Modal } from '../../ui/Modal.tsx'

function EditPlayer({ crewId, player, onClose }: { crewId: number; player: Player | null; onClose(): void }) {
  const { updatePlayer } = useCrewMutations(crewId)
  const toast = useUi((s) => s.toast)
  const [name, setName] = useState('')
  const [color, setColor] = useState(0)
  const [error, setError] = useState('')
  useLayoutEffect(() => {
    if (!player) return
    setName(player.name)
    setColor(player.color)
    setError('')
  }, [player])
  const locked = !!player?.claimed && !player.isYou
  const save = async () => {
    try {
      await updatePlayer.mutateAsync({ id: player!.id, input: { name, color } })
      toast('Player updated', 'success')
      onClose()
    } catch (e) {
      setError(e instanceof ApiError ? (e.fields?.name ?? e.message) : String(e))
    }
  }
  return (
    <Modal
      open={!!player}
      onClose={onClose}
      title="Edit player"
      size="sm"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" busy={updatePlayer.isPending} onClick={save}>Save</Button>
        </>
      }
    >
      <form className="stack" onSubmit={(e) => (e.preventDefault(), void save())} noValidate>
        <Field label="Name" hint={locked ? 'They have an account — only they can change their name' : undefined} error={error}>
          <input data-autofocus value={name} maxLength={24} readOnly={locked} onChange={(e) => setName(e.target.value)} />
        </Field>
        <fieldset className="swatches">
          <legend className="field__label">Kit colour</legend>
          {KIT_COLORS.map((c, i) => (
            <label key={c} style={{ ['--kit' as string]: c }}>
              <input type="radio" name="kit" checked={color === i} onChange={() => setColor(i)} />
              <span className="sr-only">Colour {i + 1}</span>
            </label>
          ))}
        </fieldset>
        <div className="row"><Kit player={{ name: name || '?', color }} size={40} /> <span className="muted small">How {name || 'they'} will look on scoreboards and charts</span></div>
      </form>
    </Modal>
  )
}

/** The squad list, the invite code, and crew settings. */
export function PlayersTab({ crew }: { crew: CrewDetail }) {
  const m = useCrewMutations(crew.id)
  const toast = useUi((s) => s.toast)
  const navigate = useNavigate()
  const [draft, setDraft] = useState('')
  const [addError, setAddError] = useState('')
  const [editing, setEditing] = useState<Player | null>(null)
  const [removing, setRemoving] = useState<Player | null>(null)
  const [crewName, setCrewName] = useState(crew.name)
  const [danger, setDanger] = useState<'delete' | 'leave' | null>(null)
  const link = `${location.origin}${location.pathname}#/join/${crew.inviteCode}`

  const add = async (e: FormEvent) => {
    e.preventDefault()
    setAddError('')
    try {
      await m.addPlayer.mutateAsync({ name: draft })
      toast(`${draft.trim()} added`, 'success')
      setDraft('')
    } catch (err) {
      setAddError(err instanceof ApiError ? (err.fields?.name ?? err.message) : String(err))
    }
  }
  const copy = (text: string, what: string) => navigator.clipboard?.writeText(text).then(() => toast(`${what} copied`, 'success'), () => toast(`Couldn't copy — the code is ${crew.inviteCode}`, 'error'))

  return (
    <div className="players-grid">
      <section className="card" aria-labelledby="squad-title">
        <h2 id="squad-title" className="section-title">Squad · {crew.players.length}</h2>
        <ul className="squad">
          {crew.players.map((p) => (
            <li key={p.id}>
              <Kit player={p} size={34} />
              <span className="squad__name">
                {p.name}
                {p.isYou && <span className="you-tag">you</span>}
                {p.isOwner && <span className="tag">owner</span>}
                {!p.claimed && <span className="tag tag--muted">no account yet</span>}
              </span>
              <span className="squad__rating">{p.rating}</span>
              <span className="squad__actions">
                <button type="button" className="icon-btn icon-btn--sm" aria-label={`Edit ${p.name}`} onClick={() => setEditing(p)}><Pencil size={15} aria-hidden /></button>
                {!p.claimed && (
                  <button type="button" className="icon-btn icon-btn--sm" aria-label={`Remove ${p.name}`} onClick={() => setRemoving(p)}><Trash2 size={15} aria-hidden /></button>
                )}
              </span>
            </li>
          ))}
        </ul>
        <form className="inline-add" onSubmit={add} noValidate>
          <label htmlFor="add-player" className="sr-only">New player's name</label>
          <input id="add-player" value={draft} maxLength={24} placeholder="Add a player" onChange={(e) => setDraft(e.target.value)} aria-invalid={addError ? true : undefined} aria-describedby={addError ? 'add-player-error' : undefined} />
          <Button type="submit" busy={m.addPlayer.isPending} disabled={!draft.trim()}>Add</Button>
        </form>
        {addError && <p id="add-player-error" className="field__error" role="alert">{addError}</p>}
      </section>

      <div className="stack">
        <section className="card invite" aria-labelledby="invite-title">
          <h2 id="invite-title" className="section-title">Invite your mates</h2>
          <p className="muted small">They can join as a player already listed and keep every result.</p>
          <p className="invite__code" aria-label={`Invite code ${crew.inviteCode.split('').join(' ')}`}>{crew.inviteCode}</p>
          <div className="row">
            <Button size="sm" icon={<Copy size={15} aria-hidden />} onClick={() => copy(link, 'Invite link')}>Copy invite link</Button>
            <Button size="sm" onClick={() => copy(crew.inviteCode, 'Code')}>Copy code</Button>
            {crew.isOwner && (
              <Button size="sm" variant="ghost" icon={<RefreshCw size={15} aria-hidden />} busy={m.regenerate.isPending} onClick={() => m.regenerate.mutate(undefined, { onSuccess: () => toast('New code made — the old one no longer works', 'success') })}>
                New code
              </Button>
            )}
          </div>
        </section>

        <section className="card" aria-labelledby="crew-settings-title">
          <h2 id="crew-settings-title" className="section-title">Crew settings</h2>
          {crew.isOwner ? (
            <>
              <form
                className="inline-add"
                onSubmit={(e) => {
                  e.preventDefault()
                  m.rename.mutate(crewName, { onSuccess: () => toast('Crew renamed', 'success'), onError: (err) => toast(err.message, 'error') })
                }}
              >
                <label htmlFor="crew-name" className="sr-only">Crew name</label>
                <input id="crew-name" value={crewName} maxLength={40} onChange={(e) => setCrewName(e.target.value)} />
                <Button type="submit" disabled={!crewName.trim() || crewName === crew.name} busy={m.rename.isPending}>Rename</Button>
              </form>
              <Button variant="danger" size="sm" onClick={() => setDanger('delete')}>Delete crew</Button>
            </>
          ) : (
            <>
              <p className="muted small">Leaving keeps your player and results here, unclaimed, so the tables don't change.</p>
              <Button variant="danger" size="sm" onClick={() => setDanger('leave')}>Leave crew</Button>
            </>
          )}
        </section>
      </div>

      <EditPlayer crewId={crew.id} player={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!removing}
        title={`Remove ${removing?.name}?`}
        confirmLabel="Remove"
        busy={m.removePlayer.isPending}
        onCancel={() => setRemoving(null)}
        onConfirm={() => m.removePlayer.mutate(removing!.id, { onSuccess: () => toast('Player removed', 'success'), onError: (e) => toast(e.message, 'error'), onSettled: () => setRemoving(null) })}
      >
        <p>Only players who haven't played yet can be removed.</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={danger !== null}
        title={danger === 'delete' ? `Delete ${crew.name}?` : `Leave ${crew.name}?`}
        confirmLabel={danger === 'delete' ? 'Delete crew' : 'Leave crew'}
        busy={m.remove.isPending || m.leave.isPending}
        onCancel={() => setDanger(null)}
        onConfirm={() =>
          (danger === 'delete' ? m.remove : m.leave).mutate(undefined, {
            onSuccess: () => {
              toast(danger === 'delete' ? 'Crew deleted' : 'You left the crew', 'success')
              navigate('/', { replace: true })
            },
            onError: (e) => (toast(e.message, 'error'), setDanger(null)),
          })
        }
      >
        <p>{danger === 'delete' ? 'Every competition, result and rating in this crew is deleted for everyone. This can’t be undone.' : 'You can rejoin later with the invite code.'}</p>
      </ConfirmDialog>
    </div>
  )
}
