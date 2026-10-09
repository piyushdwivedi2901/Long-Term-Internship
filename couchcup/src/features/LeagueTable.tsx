import type { Player, TableRow } from '../../shared/types.ts'
import { cx } from '../lib/cx.ts'
import { Form, PlayerTag } from '../ui/bits.tsx'

/** The league table, with the usual columns and a form guide. */
export function LeagueTable({ rows, players, crewId, caption, championId }: { rows: TableRow[]; players: Map<number, Player>; crewId: number; caption: string; championId: number | null }) {
  return (
    <div className="table-wrap">
      <table className="league">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col"><abbr title="Position">#</abbr></th>
            <th scope="col" className="league__player">Player</th>
            <th scope="col"><abbr title="Played">P</abbr></th>
            <th scope="col"><abbr title="Won">W</abbr></th>
            <th scope="col"><abbr title="Drawn">D</abbr></th>
            <th scope="col"><abbr title="Lost">L</abbr></th>
            <th scope="col" className="hide-sm"><abbr title="Goals for">GF</abbr></th>
            <th scope="col" className="hide-sm"><abbr title="Goals against">GA</abbr></th>
            <th scope="col"><abbr title="Goal difference">GD</abbr></th>
            <th scope="col"><abbr title="Points">Pts</abbr></th>
            <th scope="col" className="hide-sm">Form</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const p = players.get(r.playerId)
            return (
              <tr key={r.playerId} className={cx(p?.isYou && 'is-you', r.playerId === championId && 'is-champion')}>
                <td className="league__pos">{r.position}</td>
                <th scope="row" className="league__player">
                  <PlayerTag player={p} crewId={crewId} size={24} you />
                  {r.playerId === championId && <span className="champ-tag" title="Champion">🏆<span className="sr-only"> champion</span></span>}
                </th>
                <td>{r.played}</td>
                <td>{r.won}</td>
                <td>{r.drawn}</td>
                <td>{r.lost}</td>
                <td className="hide-sm">{r.goalsFor}</td>
                <td className="hide-sm">{r.goalsAgainst}</td>
                <td>{r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}</td>
                <td className="league__pts">{r.points}</td>
                <td className="hide-sm"><Form form={r.form} label={`${p?.name ?? ''} form`} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
