import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Award, Pencil, Trash2, Trophy } from 'lucide-react'
import type { Match } from '../../shared/types.ts'
import { useCompetition, useCompetitionMutations, useCrew } from '../api/hooks.ts'
import { useUi } from '../lib/uiStore.ts'
import { Bracket } from '../features/Bracket.tsx'
import { LeagueTable } from '../features/LeagueTable.tsx'
import { ResultDialog } from '../features/ResultDialog.tsx'
import { Scoreline } from '../features/Scoreline.tsx'
import { useRecentClubs } from '../features/useRecentClubs.ts'
import { Button } from '../ui/Button.tsx'
import { ConfirmDialog } from '../ui/ConfirmDialog.tsx'
import { Kit, byId } from '../ui/bits.tsx'
import { Modal } from '../ui/Modal.tsx'
import { PageLoading } from '../ui/Spinner.tsx'

export default function CompetitionPage() {
  const id = Number(useParams().competitionId) || 0
  const comp = useCompetition(id)
  const crewId = comp.data?.crewId ?? 0
  const crew = useCrew(crewId)
  const recentClubs = useRecentClubs(crewId)
  const m = useCompetitionMutations(crewId, id)
  const navigate = useNavigate()
  const toast = useUi((s) => s.toast)
  const [dialog, setDialog] = useState<{ open: boolean; match: Match | null }>({ open: false, match: null })
  const [deleting, setDeleting] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState('')
  const players = useMemo(() => byId(crew.data?.players ?? []), [crew.data])

  if (comp.isPending || (crewId && crew.isPending)) return <PageLoading label="Loading competition" />
  if (comp.isError || !crew.data) {
    return (
      <div className="page page--narrow">
        <title>Not found · Couch Cup</title>
        <h1>We couldn't find that competition</h1>
        <p className="muted">{comp.error?.message ?? 'It may have been deleted.'}</p>
        <div><Link to="/" className="button">Back to your crews</Link></div>
      </div>
    )
  }
  const c = comp.data
  const champion = c.championId !== null ? players.get(c.championId) : undefined
  const open = (match: Match) => setDialog({ open: true, match })
  // Open the first round that still has a match to play.
  const current = c.rounds.find((r) => r.matches.some((x) => x.status === 'scheduled' && x.homeId !== null && x.awayId !== null))?.round

  return (
    <div className="page">
      <title>{`${c.name} · Couch Cup`}</title>
      <Link to={`/crews/${crewId}?tab=competitions`} className="back"><ArrowLeft size={16} aria-hidden /> {crew.data.name}</Link>
      <header className="comp-head">
        <div>
          <p className="kicker">{c.format === 'league' ? `League · ${c.legs === 2 ? 'home & away' : 'single round'} · ${c.points.win}-${c.points.draw}-${c.points.loss} points` : 'Knockout cup'}</p>
          <h1>{c.name}</h1>
          <p className="muted">{c.playerCount} players · {c.played} of {c.total} played</p>
          <span className="progress progress--lg" aria-hidden><span style={{ width: `${c.total ? (c.played / c.total) * 100 : 0}%` }} /></span>
        </div>
        <div className="row">
          <Button size="sm" icon={<Pencil size={15} aria-hidden />} onClick={() => (setName(c.name), setRenaming(true))}>Rename</Button>
          {c.canDelete && <Button size="sm" variant="ghost" icon={<Trash2 size={15} aria-hidden />} onClick={() => setDeleting(true)}>Delete</Button>}
        </div>
      </header>

      {champion && (
        <section className="champion" aria-label="Champion">
          <Trophy size={40} aria-hidden className="champion__cup" />
          <div>
            <p className="kicker">Champion</p>
            <p className="champion__name"><Kit player={champion} size={34} /> {champion.name}</p>
          </div>
        </section>
      )}

      {c.bracket && (
        <section className="card" aria-labelledby="bracket-title">
          <h2 id="bracket-title" className="section-title">Bracket</h2>
          <Bracket rounds={c.bracket} players={players} onOpen={open} />
        </section>
      )}

      <div className="comp-grid">
        <div className="stack">
          {c.table && (
            <section className="card" aria-labelledby="table-title">
              <h2 id="table-title" className="section-title">Table</h2>
              <LeagueTable rows={c.table} players={players} crewId={crewId} caption={`${c.name} table`} championId={c.championId} />
              <p className="muted small">Ties: goal difference, then goals scored, then head-to-head between the tied players.</p>
            </section>
          )}
          {c.awards.length > 0 && (
            <section className="card" aria-labelledby="awards-title">
              <h2 id="awards-title" className="section-title">{c.status === 'finished' ? 'Awards' : 'Leading the awards'}</h2>
              <ul className="awards">
                {c.awards.map((a) => (
                  <li key={a.title}>
                    <Award size={20} aria-hidden className="awards__icon" />
                    <span className="awards__title">{a.title}</span>
                    <span className="awards__who"><Kit player={players.get(a.playerId)} size={22} /> {players.get(a.playerId)?.name}</span>
                    <span className="muted small">{a.detail}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <section className="card fixtures" aria-labelledby="fixtures-title">
          <h2 id="fixtures-title" className="section-title">Fixtures &amp; results</h2>
          {c.rounds.map((r) => {
            const done = r.matches.filter((x) => x.status === 'played').length
            const real = r.matches.filter((x) => x.status !== 'bye').length
            return (
              <details key={r.round} className="round" open={r.round === current || (current === undefined && r.round === c.rounds.at(-1)?.round)}>
                <summary>
                  <span>{r.name}</span>
                  <span className="muted small">{done}/{real} played</span>
                </summary>
                <ul className="match-list">
                  {r.matches.map((x) => (
                    <li key={x.id}>
                      <Scoreline match={x} players={players} onOpen={open} />
                    </li>
                  ))}
                </ul>
              </details>
            )
          })}
        </section>
      </div>

      <ResultDialog open={dialog.open} onClose={() => setDialog((d) => ({ ...d, open: false }))} crewId={crewId} players={crew.data.players} match={dialog.match} knockout={c.format === 'knockout'} recentClubs={recentClubs} />
      <ConfirmDialog
        open={deleting}
        title={`Delete ${c.name}?`}
        confirmLabel="Delete competition"
        busy={m.remove.isPending}
        onCancel={() => setDeleting(false)}
        onConfirm={() =>
          m.remove.mutate(undefined, {
            onSuccess: () => {
              toast(`${c.name} deleted`, 'success')
              navigate(`/crews/${crewId}?tab=competitions`, { replace: true })
            },
            onError: (e) => (toast(e.message, 'error'), setDeleting(false)),
          })
        }
      >
        <p>All {c.played} results in it are deleted too, and everyone's ratings are recalculated without them.</p>
      </ConfirmDialog>
      <Modal
        open={renaming}
        onClose={() => setRenaming(false)}
        title="Rename competition"
        size="sm"
        footer={
          <>
            <Button onClick={() => setRenaming(false)}>Cancel</Button>
            <Button variant="primary" busy={m.rename.isPending} disabled={!name.trim()} onClick={() => m.rename.mutate(name, { onSuccess: () => (setRenaming(false), toast('Renamed', 'success')), onError: (e) => toast(e.message, 'error') })}>
              Save
            </Button>
          </>
        }
      >
        <label className="field">
          <span className="field__label">Name</span>
          <input data-autofocus value={name} maxLength={50} onChange={(e) => setName(e.target.value)} />
        </label>
      </Modal>
    </div>
  )
}
