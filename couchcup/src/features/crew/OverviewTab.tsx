import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Flame, Goal, Swords, Zap } from 'lucide-react'
import type { CrewDetail, Match, Player } from '../../../shared/types.ts'
import { Form, Kit, PlayerTag, Trend } from '../../ui/bits.tsx'
import { Scoreline } from '../Scoreline.tsx'

function RecordCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="record">
      <span className="record__icon" aria-hidden>{icon}</span>
      <span className="record__title">{title}</span>
      <span className="record__body">{children}</span>
    </div>
  )
}

export function OverviewTab({ crew, players, onOpen }: { crew: CrewDetail; players: Map<number, Player>; onOpen(m: Match): void }) {
  const r = crew.records
  const name = (id: number) => players.get(id)?.name ?? '—'
  return (
    <div className="overview">
      <section className="card rankings" aria-labelledby="rank-title">
        <div className="card__head">
          <h2 id="rank-title" className="section-title">Power rankings</h2>
          <span className="muted small">Elo rating · every match counts</span>
        </div>
        <ol className="rank-list">
          {crew.leaderboard.map((row) => {
            const p = players.get(row.playerId)
            return (
              <li key={row.playerId} className={p?.isYou ? 'is-you' : undefined}>
                <span className="rank-list__pos">{row.rank}</span>
                <PlayerTag player={p} crewId={crew.id} size={30} you />
                <span className="rank-list__record">
                  {row.played ? `${row.won}W ${row.drawn}D ${row.lost}L` : 'No games yet'}
                </span>
                <Form form={row.form} label={`${p?.name ?? ''} form`} />
                <span className="rank-list__rating">
                  <strong>{row.rating}</strong>
                  <Trend value={row.trend} />
                </span>
              </li>
            )
          })}
        </ol>
      </section>

      <div className="overview__side">
        <section className="card" aria-labelledby="next-title">
          <h2 id="next-title" className="section-title">Up next</h2>
          {crew.upcoming.length === 0 ? (
            <p className="muted">No fixtures waiting. Start a competition or play a friendly.</p>
          ) : (
            <ul className="match-list">
              {crew.upcoming.map((m) => (
                <li key={m.id}>
                  <Scoreline match={m} players={players} onOpen={onOpen} context />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card" aria-labelledby="records-title">
          <h2 id="records-title" className="section-title">Crew records</h2>
          <div className="records">
            <RecordCard icon={<Zap size={18} />} title="Biggest win">
              {r.biggestWin ? <><strong>{name(r.biggestWin.winnerId)}</strong> {r.biggestWin.for}–{r.biggestWin.against} {name(r.biggestWin.loserId)}</> : '—'}
            </RecordCard>
            <RecordCard icon={<Goal size={18} />} title="Most goals in a game">
              {r.mostGoals ? <><strong>{r.mostGoals.total}</strong> goals</> : '—'}
            </RecordCard>
            <RecordCard icon={<Flame size={18} />} title="Longest win streak">
              {r.longestWinStreak ? <><strong>{r.longestWinStreak.length}</strong> in a row · {name(r.longestWinStreak.playerId)}</> : '—'}
            </RecordCard>
            <RecordCard icon={<Swords size={18} />} title="Biggest rivalry">
              {r.topRivalry ? (
                <span className="rivalry">
                  <Kit player={players.get(r.topRivalry.a)} size={20} />
                  <Kit player={players.get(r.topRivalry.b)} size={20} />
                  {name(r.topRivalry.a)} v {name(r.topRivalry.b)} · <strong>{r.topRivalry.played}</strong> games
                </span>
              ) : (
                '—'
              )}
            </RecordCard>
          </div>
        </section>
      </div>

      <section className="card overview__latest" aria-labelledby="latest-title">
        <div className="card__head">
          <h2 id="latest-title" className="section-title">Latest results</h2>
          <Link to="?tab=results" className="link-more">All results</Link>
        </div>
        {crew.recent.length === 0 ? (
          <p className="muted">No results yet.</p>
        ) : (
          <ul className="match-list">
            {crew.recent.map((m) => (
              <li key={m.id}>
                <Scoreline match={m} players={players} onOpen={onOpen} context date rating />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
