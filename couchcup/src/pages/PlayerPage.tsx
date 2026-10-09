import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Trophy } from 'lucide-react'
import { findClub } from '../../shared/clubs.ts'
import { useCrew, usePlayerProfile } from '../api/hooks.ts'
import { RatingChart } from '../features/RatingChart.tsx'
import { Scoreline } from '../features/Scoreline.tsx'
import { Form, Kit, PlayerTag, Stars, byId, kitColor } from '../ui/bits.tsx'
import { PageLoading } from '../ui/Spinner.tsx'

const STREAK: Record<string, string> = { W: 'win', D: 'draw', L: 'loss' }

export default function PlayerPage() {
  const params = useParams()
  const crewId = Number(params.crewId) || 0
  const playerId = Number(params.playerId) || 0
  const profile = usePlayerProfile(crewId, playerId)
  const crew = useCrew(crewId)
  const players = useMemo(() => byId(crew.data?.players ?? []), [crew.data])

  if (profile.isPending || crew.isPending) return <PageLoading label="Loading player" />
  if (profile.isError || crew.isError) {
    return (
      <div className="page page--narrow">
        <title>Not found · Couch Cup</title>
        <h1>We couldn't find that player</h1>
        <p className="muted">{(profile.error ?? crew.error)?.message}</p>
        <div><Link to="/" className="button">Back to your crews</Link></div>
      </div>
    )
  }
  const p = profile.data
  const color = kitColor(p.player.color)
  const goalsPerGame = p.played ? (p.goalsFor / p.played).toFixed(1) : '0'

  return (
    <div className="page">
      <title>{`${p.player.name} · Couch Cup`}</title>
      <Link to={`/crews/${crewId}`} className="back"><ArrowLeft size={16} aria-hidden /> {crew.data.name}</Link>
      <header className="player-head" style={{ ['--kit' as string]: color }}>
        <Kit player={p.player} size={72} />
        <div className="player-head__main">
          <p className="kicker">#{p.rank} in {crew.data.name}</p>
          <h1>{p.player.name}{p.player.isYou && <span className="you-tag you-tag--lg">you</span>}</h1>
          {p.trophies.length > 0 && (
            <p className="trophies">
              {p.trophies.map((t) => (
                <Link key={t.competitionId} to={`/competitions/${t.competitionId}`} className="trophy"><Trophy size={14} aria-hidden /> {t.name}</Link>
              ))}
            </p>
          )}
        </div>
        <div className="player-head__rating">
          <span>Rating</span>
          <strong>{p.player.rating}</strong>
          <span className="muted small">peak {p.peakRating}</span>
        </div>
      </header>

      <section className="stat-strip" aria-label="Career">
        <div><strong>{p.played}</strong><span>Played</span></div>
        <div><strong>{p.won}–{p.drawn}–{p.lost}</strong><span>W–D–L</span></div>
        <div><strong>{p.winRate}%</strong><span>Win rate</span></div>
        <div><strong>{p.goalsFor}</strong><span>Goals · {goalsPerGame} a game</span></div>
        <div><strong>{p.cleanSheets}</strong><span>Clean sheets</span></div>
        <div><strong>{p.longestWinStreak}</strong><span>Best win streak</span></div>
      </section>

      <div className="player-grid">
        <section className="card" aria-labelledby="rating-title">
          <div className="card__head">
            <h2 id="rating-title" className="section-title">Rating history</h2>
            <span className="row small">
              Form <Form form={p.form} label={`${p.player.name} form`} />
              {p.streak && p.streak.length > 1 && <span className="muted">· {p.streak.length}-match {STREAK[p.streak.kind]} run</span>}
            </span>
          </div>
          <RatingChart history={p.history} color={color} name={p.player.name} />
          {p.biggestWin && <p className="muted small">Biggest win: {p.biggestWin.for}–{p.biggestWin.against}</p>}
        </section>

        <section className="card" aria-labelledby="clubs-title">
          <h2 id="clubs-title" className="section-title">Clubs played</h2>
          {p.clubs.length === 0 ? (
            <p className="muted">No clubs recorded yet.</p>
          ) : (
            <ul className="club-list">
              {p.clubs.slice(0, 8).map((c) => {
                const info = findClub(c.club)
                return (
                  <li key={c.club}>
                    <span className="club-list__name">{c.club}</span>
                    {info && <Stars value={info.stars} />}
                    <span className="club-list__rec">{c.won}/{c.played} won</span>
                    <span className="club-list__bar" aria-hidden><span style={{ width: `${(c.won / c.played) * 100}%`, background: color }} /></span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="card" aria-labelledby="vs-title">
          <h2 id="vs-title" className="section-title">Against each rival</h2>
          {p.headToHead.length === 0 ? (
            <p className="muted">No matches yet.</p>
          ) : (
            <table className="vs-table">
              <caption className="sr-only">{p.player.name}'s record against each opponent</caption>
              <thead>
                <tr>
                  <th scope="col">Opponent</th>
                  <th scope="col"><abbr title="Played">P</abbr></th>
                  <th scope="col">W–D–L</th>
                  <th scope="col">Goals</th>
                </tr>
              </thead>
              <tbody>
                {p.headToHead.map((h) => (
                  <tr key={h.opponentId}>
                    <th scope="row"><PlayerTag player={players.get(h.opponentId)} crewId={crewId} size={22} /></th>
                    <td>{h.played}</td>
                    <td className={h.won > h.lost ? 'is-up' : h.won < h.lost ? 'is-down' : ''}>{h.won}–{h.drawn}–{h.lost}</td>
                    <td>{h.goalsFor}–{h.goalsAgainst}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card" aria-labelledby="recent-title">
          <h2 id="recent-title" className="section-title">Recent matches</h2>
          {p.recent.length === 0 ? (
            <p className="muted">No matches yet.</p>
          ) : (
            <ul className="match-list">
              {p.recent.map((m) => (
                <li key={m.id}><Scoreline match={m} players={players} context date rating /></li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
