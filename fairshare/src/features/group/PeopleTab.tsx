import { useState, type FormEvent } from 'react'
import { Check, Copy, Link2, Pencil, RefreshCw, Trash2, X } from 'lucide-react'
import type { GroupDetail, Member } from '../../../shared/types.ts'
import { useMemberMutations, useRegenerateInvite } from '../../api/hooks.ts'
import { useUi } from '../../lib/uiStore.ts'
import { Avatar } from '../../ui/bits.tsx'
import { Button } from '../../ui/Button.tsx'

export const inviteLink = (code: string) => `${location.origin}${location.pathname}#/join/${code}`

export function PeopleTab({ group }: { group: GroupDetail }) {
  const { add, rename, remove } = useMemberMutations(group.id)
  const regenerate = useRegenerateInvite(group.id)
  const toast = useUi((s) => s.toast)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<number | null>(null)
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)

  const copy = async (what: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(what === 'code' ? group.inviteCode : inviteLink(group.inviteCode))
      setCopied(what)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      toast("Couldn't copy — select the code and copy it manually", 'error')
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    add.mutate(name, {
      onSuccess: (m) => {
        setName('')
        toast(`Added ${m.name}`, 'success')
      },
      onError: (err) => setError(err.message),
    })
  }

  return (
    <div className="people-grid">
      <section aria-labelledby="ppl-h">
        <h2 id="ppl-h" className="section-title">{group.members.length} people</h2>
        <ul className="people">
          {group.members.map((m) =>
            editing === m.id ? (
              <RenameRow key={m.id} member={m} onDone={() => setEditing(null)} onSave={(n) => rename.mutate({ id: m.id, name: n }, { onSuccess: () => setEditing(null), onError: (err) => toast(err.message, 'error') })} />
            ) : (
              <li key={m.id}>
                <Avatar name={m.name} size={36} you={m.isYou} />
                <span className="people__name">
                  {m.name}
                  {m.isYou && <span className="tag">you</span>}
                  {m.isOwner && <span className="tag">creator</span>}
                  {!m.claimed && <span className="tag tag--muted">no account yet</span>}
                </span>
                {!m.claimed && (
                  <span className="people__actions">
                    <button type="button" className="icon-btn" aria-label={`Rename ${m.name}`} onClick={() => setEditing(m.id)}><Pencil size={16} aria-hidden /></button>
                    <button type="button" className="icon-btn" aria-label={`Remove ${m.name}`} onClick={() => remove.mutate(m.id, { onSuccess: () => toast(`Removed ${m.name}`), onError: (err) => toast(err.message, 'error') })}>
                      <Trash2 size={16} aria-hidden />
                    </button>
                  </span>
                )}
              </li>
            ),
          )}
        </ul>
        <form className="inline-add" onSubmit={submit}>
          <label htmlFor="add-person" className="sr-only">Add a person</label>
          <input id="add-person" placeholder="Add a person by name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={error ? 'add-person-err' : undefined} />
          <Button type="submit" busy={add.isPending} disabled={!name.trim()}>Add</Button>
        </form>
        {error && <p id="add-person-err" className="field__error" role="alert">{error}</p>}
      </section>

      <section aria-labelledby="inv-h" className="invite">
        <h2 id="inv-h" className="section-title">Invite friends</h2>
        <p className="muted small">Anyone with this code can join and see the group's expenses. If they're already listed, they can join as themselves.</p>
        <p className="invite__code" aria-label={`Invite code ${group.inviteCode.split('').join(' ')}`}>{group.inviteCode}</p>
        <div className="row">
          <Button size="sm" icon={copied === 'code' ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />} onClick={() => copy('code')}>{copied === 'code' ? 'Copied' : 'Copy code'}</Button>
          <Button size="sm" icon={copied === 'link' ? <Check size={15} aria-hidden /> : <Link2 size={15} aria-hidden />} onClick={() => copy('link')}>{copied === 'link' ? 'Copied' : 'Copy invite link'}</Button>
          {group.isOwner && (
            <Button size="sm" variant="ghost" icon={<RefreshCw size={15} aria-hidden />} busy={regenerate.isPending} onClick={() => regenerate.mutate(undefined, { onSuccess: () => toast('New invite code created — the old one no longer works', 'success') })}>
              New code
            </Button>
          )}
        </div>
        <span className="sr-only" aria-live="polite">{copied ? `${copied === 'code' ? 'Code' : 'Link'} copied` : ''}</span>
      </section>
    </div>
  )
}

function RenameRow({ member, onSave, onDone }: { member: Member; onSave(name: string): void; onDone(): void }) {
  const [value, setValue] = useState(member.name)
  return (
    <li>
      <Avatar name={value || member.name} size={36} />
      <form
        className="inline-add grow"
        onSubmit={(e) => {
          e.preventDefault()
          if (value.trim()) onSave(value.trim())
        }}
      >
        <label htmlFor={`rename-${member.id}`} className="sr-only">New name for {member.name}</label>
        <input id={`rename-${member.id}`} autoFocus value={value} maxLength={40} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && onDone()} />
        <button type="submit" className="icon-btn" aria-label="Save name"><Check size={16} aria-hidden /></button>
        <button type="button" className="icon-btn" aria-label="Cancel renaming" onClick={onDone}><X size={16} aria-hidden /></button>
      </form>
    </li>
  )
}
