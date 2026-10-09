import { Link } from 'react-router-dom'
import { GitFork, ListOrdered, Plus, Trophy } from 'lucide-react'
import type { CrewDetail, Player } from '../../../shared/types.ts'
import { Button } from '../../ui/Button.tsx'
import { Empty, Kit } from '../../ui/bits.tsx'

export function CompetitionsTab({ crew, players, onNew }: { crew: CrewDetail; players: Map<number, Player>; onNew(): void }) {
  if (crew.competitions.length === 0) {
    return (
      <Empty icon={<Trophy size={34} strokeWidth={1.5} />} title="No competitions yet" action={<Button variant="primary" icon={<Plus size={17} aria-hidden />} onClick={onNew}>New competition</Button>}>
        Start a league where everyone plays everyone, or a knockout cup with a proper bracket. Fixtures are drawn for you.
      </Empty>
    )
  }
  return (
    <div className="stack">
      <div className="row row--end">
        <Button variant="primary" icon={<Plus size={17} aria-hidden />} onClick={onNew}>New competition</Button>
      </div>
      <ul className="comp-list">
        {crew.competitions.map((c) => {
          const lead = c.championId ?? c.leaderId
          const leader = lead !== null ? players.get(lead) : undefined
          const pct = c.total ? Math.round((c.played / c.total) * 100) : 0
          return (
            <li key={c.id}>
              <Link to={`/competitions/${c.id}`} className={`comp-card comp-card--${c.status}`}>
                <span className="comp-card__icon" aria-hidden>{c.format === 'league' ? <ListOrdered size={22} /> : <GitFork size={22} />}</span>
                <span className="comp-card__main">
                  <span className="comp-card__name">{c.name}</span>
                  <span className="comp-card__meta">
                    {c.format === 'league' ? 'League' : 'Knockout'} · {c.playerCount} players · {c.played}/{c.total} played
                  </span>
                  <span className="progress" aria-hidden>
                    <span style={{ width: `${pct}%` }} />
                  </span>
                </span>
                <span className="comp-card__lead">
                  {c.status === 'finished' ? (
                    <span className="badge badge--gold"><Trophy size={13} aria-hidden /> Champion</span>
                  ) : (
                    <span className="badge">{c.played ? (c.format === 'league' ? 'Leader' : 'Top seed left') : 'Not started'}</span>
                  )}
                  {leader && c.played > 0 && (
                    <span className="comp-card__who">
                      <Kit player={leader} size={22} /> {leader.name}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
