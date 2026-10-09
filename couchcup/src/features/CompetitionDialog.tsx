import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GitFork, ListOrdered } from 'lucide-react'
import { competitionSchema, MAX_KNOCKOUT, MAX_LEAGUE, type Format } from '../../shared/schemas.ts'
import { roundCount } from '../../shared/fixtures.ts'
import type { Player } from '../../shared/types.ts'
import { useCreateCompetition } from '../api/hooks.ts'
import { ApiError } from '../api/types.ts'
import { useUi } from '../lib/uiStore.ts'
import { Button } from '../ui/Button.tsx'
import { Field } from '../ui/Field.tsx'
import { Kit } from '../ui/bits.tsx'
import { Modal } from '../ui/Modal.tsx'

const POINT_SYSTEMS = [
  { id: '310', label: '3 · 1 · 0', hint: 'Standard', points: { win: 3, draw: 1, loss: 0 } },
  { id: '210', label: '2 · 1 · 0', hint: 'Old school', points: { win: 2, draw: 1, loss: 0 } },
] as const

/** What the chosen setup will produce, before anything is created. */
export function competitionPreview(format: Format, players: number, legs: 1 | 2): string {
  if (players < 2) return 'Pick at least two players.'
  if (format === 'league') {
    const matches = ((players * (players - 1)) / 2) * legs
    const rounds = (players % 2 ? players : players - 1) * legs
    return `${matches} matches over ${rounds} matchdays${players % 2 ? ' — one player rests each matchday' : ''}.`
  }
  const size = 2 ** roundCount(players)
  const byes = size - players
  return `A ${size}-player bracket: ${players - 1} matches${byes ? `, ${byes} bye${byes === 1 ? '' : 's'} for the top seed${byes === 1 ? '' : 's'}` : ''}.`
}

export function CompetitionDialog({ open, onClose, crewId, players }: { open: boolean; onClose(): void; crewId: number; players: Player[] }) {
  const create = useCreateCompetition(crewId)
  const navigate = useNavigate()
  const toast = useUi((s) => s.toast)
  const [name, setName] = useState('')
  const [format, setFormat] = useState<Format>('league')
  const [chosen, setChosen] = useState<number[]>([])
  const [legs, setLegs] = useState<1 | 2>(1)
  const [points, setPoints] = useState<(typeof POINT_SYSTEMS)[number]['id']>('310')
  const [seeding, setSeeding] = useState<'rating' | 'random' | 'manual'>('rating')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const wasOpen = useRef(false)
  useLayoutEffect(() => {
    const opening = open && !wasOpen.current
    wasOpen.current = open
    if (!opening) return
    setName('')
    setFormat('league')
    setChosen(players.map((p) => p.id))
    setLegs(1)
    setPoints('310')
    setSeeding('rating')
    setErrors({})
  }, [open, players])

  const max = format === 'league' ? MAX_LEAGUE : MAX_KNOCKOUT
  const preview = useMemo(() => competitionPreview(format, chosen.length, legs), [format, chosen.length, legs])
  const toggle = (id: number) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))

  const submit = async () => {
    const input = { name, format, playerIds: players.filter((p) => chosen.includes(p.id)).map((p) => p.id), legs, points: POINT_SYSTEMS.find((p) => p.id === points)!.points, seeding }
    const check = competitionSchema.safeParse(input)
    if (!check.success) {
      const next: Record<string, string> = {}
      for (const i of check.error.issues) next[String(i.path[0] ?? 'root')] ??= i.message
      return setErrors(next)
    }
    try {
      const c = await create.mutateAsync(input)
      toast(`${c.name} is on — ${c.total} matches to play`, 'success')
      onClose()
      navigate(`/competitions/${c.id}`)
    } catch (e) {
      setErrors(e instanceof ApiError && e.fields ? e.fields : { root: (e as Error).message })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New competition"
      sheet
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" busy={create.isPending} onClick={submit}>Create & draw fixtures</Button>
        </>
      }
    >
      <form className="stack" onSubmit={(e) => (e.preventDefault(), void submit())} noValidate>
        <Field label="Name" error={errors.name}>
          <input data-autofocus value={name} maxLength={50} placeholder="e.g. Season 3, Diwali Cup" onChange={(e) => setName(e.target.value)} />
        </Field>

        <fieldset className="format-pick">
          <legend className="field__label">Format</legend>
          {(
            [
              ['league', 'League', 'Everyone plays everyone. Most points wins.', ListOrdered],
              ['knockout', 'Knockout cup', 'Lose and you’re out. Level games go to penalties.', GitFork],
            ] as const
          ).map(([value, label, hint, Icon]) => (
            <label key={value} className="format-card">
              <input type="radio" name="format" value={value} checked={format === value} onChange={() => setFormat(value)} />
              <Icon size={22} aria-hidden />
              <strong>{label}</strong>
              <span>{hint}</span>
            </label>
          ))}
        </fieldset>

        <fieldset className="pick-players">
          <legend className="field__label">
            Players <span className="muted">({chosen.length} of up to {max})</span>
          </legend>
          <div className="pick-players__list">
            {players.map((p) => (
              <label key={p.id} className="pick-chip">
                <input type="checkbox" checked={chosen.includes(p.id)} onChange={() => toggle(p.id)} />
                <Kit player={p} size={24} />
                <span>{p.name}</span>
              </label>
            ))}
          </div>
          <div className="row small">
            <button type="button" className="link-btn" onClick={() => setChosen(players.map((p) => p.id))}>Everyone</button>
            <button type="button" className="link-btn" onClick={() => setChosen([])}>Nobody</button>
          </div>
          {errors.playerIds && <p className="field__error" role="alert">{errors.playerIds}</p>}
        </fieldset>

        {format === 'league' ? (
          <div className="form-row">
            <fieldset>
              <legend className="field__label">Legs</legend>
              <div className="segmented" role="radiogroup" aria-label="Legs">
                <button type="button" role="radio" aria-checked={legs === 1} onClick={() => setLegs(1)}>Single</button>
                <button type="button" role="radio" aria-checked={legs === 2} onClick={() => setLegs(2)}>Home & away</button>
              </div>
            </fieldset>
            <fieldset>
              <legend className="field__label">Points (win · draw · loss)</legend>
              <div className="segmented" role="radiogroup" aria-label="Points (win · draw · loss)">
                {POINT_SYSTEMS.map((p) => (
                  <button key={p.id} type="button" role="radio" aria-checked={points === p.id} onClick={() => setPoints(p.id)} title={p.hint}>
                    {p.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        ) : (
          <fieldset>
            <legend className="field__label">Seeding</legend>
            <div className="segmented" role="radiogroup" aria-label="Seeding">
              {(
                [
                  ['rating', 'By rating'],
                  ['random', 'Random draw'],
                  ['manual', 'As listed'],
                ] as const
              ).map(([v, l]) => (
                <button key={v} type="button" role="radio" aria-checked={seeding === v} onClick={() => setSeeding(v)}>
                  {l}
                </button>
              ))}
            </div>
            <p className="field__hint">
              {seeding === 'rating' ? 'The highest-rated players are kept apart until the late rounds, and get any byes.' : seeding === 'random' ? 'Names out of a hat.' : 'Seeded in the order players are listed above.'}
            </p>
          </fieldset>
        )}

        <p className="preview-line" aria-live="polite">{preview}</p>
        {errors.root && <p className="form-error" role="alert">{errors.root}</p>}
      </form>
    </Modal>
  )
}
