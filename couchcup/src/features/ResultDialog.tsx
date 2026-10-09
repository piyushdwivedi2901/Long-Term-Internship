import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Dices, Minus, Plus, Trash2 } from 'lucide-react'
import { CLUBS, TIERS, fairSpin, findClub } from '../../shared/clubs.ts'
import { DECIDED_BY, DECIDED_LABELS, friendlySchema, resultSchema, type DecidedBy, type ResultInput } from '../../shared/schemas.ts'
import type { Match, Player } from '../../shared/types.ts'
import { useResult } from '../api/hooks.ts'
import { ApiError } from '../api/types.ts'
import { fromLocalInput, toLocalInput } from '../lib/dates.ts'
import { useUi } from '../lib/uiStore.ts'
import { Button } from '../ui/Button.tsx'
import { Kit, Stars } from '../ui/bits.tsx'
import { Modal } from '../ui/Modal.tsx'

function Stepper({ value, onChange, label, max = 99 }: { value: number; onChange(n: number): void; label: string; max?: number }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" aria-label={`${label}: one fewer`} onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0}>
        <Minus size={18} aria-hidden />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        aria-label={label}
        value={value}
        onFocus={(e) => e.target.select()}
        onChange={(e) => onChange(Math.min(max, Math.max(0, Math.floor(Number(e.target.value) || 0))))}
      />
      <button type="button" aria-label={`${label}: one more`} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>
        <Plus size={18} aria-hidden />
      </button>
    </div>
  )
}

function ClubInput({ id, label, value, onChange, listId }: { id: string; label: string; value: string; onChange(v: string): void; listId: string }) {
  const club = findClub(value)
  return (
    <div className="field club-field">
      <label className="field__label" htmlFor={id}>{label}</label>
      <input id={id} list={listId} value={value} placeholder="Any club or team" autoComplete="off" onChange={(e) => onChange(e.target.value)} maxLength={40} />
      <span className="club-field__meta">{club ? <><Stars value={club.stars} /> {club.league}</> : value ? 'Not in the list — that’s fine' : ' '}</span>
    </div>
  )
}

interface Props {
  open: boolean
  onClose(): void
  crewId: number
  players: Player[]
  /** null = a new friendly */
  match: Match | null
  knockout?: boolean
  /** clubs each player used recently, to suggest and to avoid repeats when spinning */
  recentClubs?: Map<number, string[]>
}

interface State {
  homeId: number
  awayId: number
  homeGoals: number
  awayGoals: number
  homeClub: string
  awayClub: string
  decidedBy: DecidedBy
  homePens: number
  awayPens: number
  playedAt: string
  notes: string
}

/**
 * Enter or correct a score. Big steppers for thumbs, clubs from a list (or
 * anything typed), a fair random club spin, and penalties when it's level.
 */
export function ResultDialog({ open, onClose, crewId, players, match, knockout, recentClubs }: Props) {
  const { record, clear, friendly } = useResult(crewId)
  const toast = useUi((s) => s.toast)
  const uid = useId()
  const listId = `${uid}-clubs`
  const [s, setS] = useState<State | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [tier, setTier] = useState<number>(5)
  const [spinning, setSpinning] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const spinTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const isFriendly = match === null

  // Fill the form before paint so a reopened dialog never shows the last match —
  // but only as it opens, so a background refresh can't wipe a half-entered score.
  const wasOpen = useRef(false)
  useLayoutEffect(() => {
    const opening = open && !wasOpen.current
    wasOpen.current = open
    if (!opening) return
    const homeId = match?.homeId ?? players[0]?.id ?? 0
    const awayId = match?.awayId ?? players[1]?.id ?? 0
    const last = (id: number) => recentClubs?.get(id)?.[0] ?? ''
    setS({
      homeId,
      awayId,
      homeGoals: match?.homeGoals ?? 0,
      awayGoals: match?.awayGoals ?? 0,
      homeClub: match?.homeClub || last(homeId),
      awayClub: match?.awayClub || last(awayId),
      decidedBy: match?.decidedBy ?? 'normal',
      homePens: match?.homePens ?? 0,
      awayPens: match?.awayPens ?? 0,
      playedAt: toLocalInput(match?.playedAt ?? new Date().toISOString()),
      notes: match?.notes ?? '',
    })
    setErrors({})
    setConfirmClear(false)
  }, [open, match, players, recentClubs])

  useEffect(() => () => void (spinTimer.current && clearInterval(spinTimer.current)), [])

  if (!s) return null
  const set = (patch: Partial<State>) => setS((prev) => (prev ? { ...prev, ...patch } : prev))
  const home = players.find((p) => p.id === s.homeId)
  const away = players.find((p) => p.id === s.awayId)
  const level = s.homeGoals === s.awayGoals
  const editing = match?.status === 'played'

  const spin = () => {
    const avoid = [...(recentClubs?.get(s.homeId)?.slice(0, 1) ?? []), ...(recentClubs?.get(s.awayId)?.slice(0, 1) ?? [])]
    const [a, b] = fairSpin(tier, Math.random, avoid)
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return set({ homeClub: a.name, awayClub: b.name })
    // A quick slot-machine roll through the tier, then land.
    const pool = CLUBS.filter((c) => c.stars === tier)
    let ticks = 0
    setSpinning(true)
    spinTimer.current = setInterval(() => {
      ticks++
      if (ticks >= 9) {
        clearInterval(spinTimer.current!)
        setSpinning(false)
        set({ homeClub: a.name, awayClub: b.name })
        return
      }
      set({ homeClub: pool[Math.floor(Math.random() * pool.length)].name, awayClub: pool[Math.floor(Math.random() * pool.length)].name })
    }, 60)
  }

  const submit = async () => {
    const input: ResultInput = {
      homeGoals: s.homeGoals,
      awayGoals: s.awayGoals,
      homeClub: s.homeClub,
      awayClub: s.awayClub,
      decidedBy: s.decidedBy,
      homePens: s.decidedBy === 'penalties' ? s.homePens : null,
      awayPens: s.decidedBy === 'penalties' ? s.awayPens : null,
      playedAt: s.playedAt ? fromLocalInput(s.playedAt) : undefined,
      notes: s.notes,
    }
    const check = isFriendly ? friendlySchema.safeParse({ ...input, homeId: s.homeId, awayId: s.awayId }) : resultSchema.safeParse(input)
    if (!check.success) {
      const next: Record<string, string> = {}
      for (const i of check.error.issues) next[String(i.path[0] ?? 'root')] ??= i.message
      return setErrors(next)
    }
    if (knockout && level && s.decidedBy !== 'penalties') return setErrors({ decidedBy: 'Knockout matches need a winner — add the penalty shoot-out' })
    try {
      if (isFriendly) await friendly.mutateAsync({ ...input, homeId: s.homeId, awayId: s.awayId })
      else await record.mutateAsync({ matchId: match.id, input })
      toast(`${home?.name} ${s.homeGoals}–${s.awayGoals} ${away?.name} saved`, 'success')
      onClose()
    } catch (e) {
      if (e instanceof ApiError && e.fields) setErrors(e.fields)
      else setErrors({ root: (e as Error).message })
    }
  }

  const doClear = async () => {
    try {
      await clear.mutateAsync(match!.id)
      toast(match!.competitionId ? 'Result cleared — the match is back on the fixture list' : 'Friendly deleted', 'success')
      onClose()
    } catch (e) {
      setErrors({ root: (e as Error).message })
      setConfirmClear(false)
    }
  }

  const title = isFriendly ? 'Play a friendly' : editing ? 'Edit result' : 'Enter result'
  const busy = record.isPending || friendly.isPending
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={match ? `${match.competitionName ?? 'Friendly'} · ${match.roundLabel}` : 'Counts towards ratings and head-to-heads, not any competition'}
      sheet
      size="lg"
      footer={
        <>
          {editing && !confirmClear && (
            <Button variant="ghost" className="foot-left" icon={<Trash2 size={16} aria-hidden />} onClick={() => setConfirmClear(true)}>
              {match.competitionId ? 'Clear result' : 'Delete'}
            </Button>
          )}
          {confirmClear && (
            <span className="foot-left confirm-inline">
              {match!.competitionId ? 'Clear this result?' : 'Delete this friendly?'}
              <Button size="sm" variant="danger" busy={clear.isPending} onClick={doClear}>Yes</Button>
              <Button size="sm" onClick={() => setConfirmClear(false)}>No</Button>
            </span>
          )}
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" busy={busy} onClick={submit}>Save result</Button>
        </>
      }
    >
      <form className="result-form" onSubmit={(e) => (e.preventDefault(), void submit())} noValidate>
        <datalist id={listId}>
          {CLUBS.map((c) => (
            <option key={c.name} value={c.name}>{`${c.league} · ${c.stars}★`}</option>
          ))}
        </datalist>

        <div className="result-board">
          <div className="result-board__side">
            {isFriendly ? (
              <label className="player-select">
                <span className="sr-only">Home player</span>
                <Kit player={home} size={44} />
                <select value={s.homeId} onChange={(e) => set({ homeId: Number(e.target.value), homeClub: recentClubs?.get(Number(e.target.value))?.[0] ?? s.homeClub })}>
                  {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
            ) : (
              <div className="player-select"><Kit player={home} size={44} /><strong>{home?.name}</strong></div>
            )}
            <Stepper label={`${home?.name ?? 'Home'} goals`} value={s.homeGoals} onChange={(n) => set({ homeGoals: n })} />
          </div>
          <span className="result-board__dash" aria-hidden>–</span>
          <div className="result-board__side">
            {isFriendly ? (
              <label className="player-select">
                <span className="sr-only">Away player</span>
                <Kit player={away} size={44} />
                <select value={s.awayId} onChange={(e) => set({ awayId: Number(e.target.value), awayClub: recentClubs?.get(Number(e.target.value))?.[0] ?? s.awayClub })}>
                  {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
            ) : (
              <div className="player-select"><Kit player={away} size={44} /><strong>{away?.name}</strong></div>
            )}
            <Stepper label={`${away?.name ?? 'Away'} goals`} value={s.awayGoals} onChange={(n) => set({ awayGoals: n })} />
          </div>
        </div>
        {errors.awayId && <p className="field__error" role="alert">{errors.awayId}</p>}
        {(errors.homeGoals || errors.awayGoals) && <p className="field__error" role="alert">{errors.homeGoals ?? errors.awayGoals}</p>}

        <fieldset className="decided">
          <legend className="field__label">How did it end?</legend>
          <div className="segmented" role="radiogroup" aria-label="How did it end?">
            {DECIDED_BY.map((d) => (
              <button key={d} type="button" role="radio" aria-checked={s.decidedBy === d} onClick={() => set({ decidedBy: d, ...(d === 'forfeit' && level ? { homeGoals: 3, awayGoals: 0 } : {}) })}>
                {DECIDED_LABELS[d]}
              </button>
            ))}
          </div>
          {knockout && level && s.decidedBy !== 'penalties' && <p className="hint-warn">It's level — a knockout needs a winner. Choose Penalties.</p>}
          {s.decidedBy === 'forfeit' && <p className="field__hint">A forfeit is usually recorded as 3–0 to whoever didn't quit.</p>}
          {s.decidedBy === 'penalties' && (
            <div className="pens">
              <span className="field__label">Shoot-out</span>
              <Stepper label={`${home?.name ?? 'Home'} penalties`} value={s.homePens} onChange={(n) => set({ homePens: n })} max={30} />
              <span aria-hidden>–</span>
              <Stepper label={`${away?.name ?? 'Away'} penalties`} value={s.awayPens} onChange={(n) => set({ awayPens: n })} max={30} />
            </div>
          )}
          {(errors.decidedBy || errors.homePens) && <p className="field__error" role="alert">{errors.decidedBy ?? errors.homePens}</p>}
        </fieldset>

        <div className="clubs">
          <ClubInput id={`${uid}-hc`} label={`${home?.name ?? 'Home'} played as`} value={s.homeClub} onChange={(v) => set({ homeClub: v })} listId={listId} />
          <ClubInput id={`${uid}-ac`} label={`${away?.name ?? 'Away'} played as`} value={s.awayClub} onChange={(v) => set({ awayClub: v })} listId={listId} />
          <div className="spin" aria-live="polite">
            <span className="field__label" id={`${uid}-tier`}>Fair spin</span>
            <div className="segmented segmented--tight" role="radiogroup" aria-labelledby={`${uid}-tier`}>
              {TIERS.map((t) => (
                <button key={t} type="button" role="radio" aria-checked={tier === t} onClick={() => setTier(t)}>
                  {t}★
                </button>
              ))}
            </div>
            <Button size="sm" icon={<Dices size={16} aria-hidden />} busy={spinning} onClick={spin}>Spin clubs</Button>
            <p className="field__hint">Two different random clubs from the same tier, skipping what each of you just played.</p>
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label className="field__label" htmlFor={`${uid}-when`}>Played</label>
            <input id={`${uid}-when`} type="datetime-local" value={s.playedAt} onChange={(e) => set({ playedAt: e.target.value })} aria-invalid={errors.playedAt ? true : undefined} />
            {errors.playedAt && <p className="field__error">{errors.playedAt}</p>}
          </div>
          <div className="field">
            <label className="field__label" htmlFor={`${uid}-notes`}>Notes</label>
            <input id={`${uid}-notes`} value={s.notes} maxLength={200} placeholder="Last-minute winner, controller died…" onChange={(e) => set({ notes: e.target.value })} />
          </div>
        </div>
        {errors.root && <p className="form-error" role="alert">{errors.root}</p>}
      </form>
    </Modal>
  )
}
