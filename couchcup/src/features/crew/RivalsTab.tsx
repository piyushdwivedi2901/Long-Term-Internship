import { useMemo, useState, type CSSProperties } from 'react'
import { playerStats, type PlayedMatch } from '../../../shared/engine.ts'
import type { Match, Player } from '../../../shared/types.ts'
import { useMatches } from '../../api/hooks.ts'
import { Kit, kitColor } from '../../ui/bits.tsx'
import { PageLoading } from '../../ui/Spinner.tsx'
import { Scoreline } from '../Scoreline.tsx'

const asPlayed = (ms: Match[]) => ms.filter((m) => m.status === 'played') as unknown as PlayedMatch[]

/** Head-to-head: any two players side by side, plus the whole crew as a grid. */
export function RivalsTab({ crewId, players, onOpen }: { crewId: number; players: Player[]; onOpen(m: Match): void }) {
  const matches = useMatches(crewId)
  const me = players.find((p) => p.isYou) ?? players[0]
  const played = useMemo(() => asPlayed(matches.data ?? []), [matches.data])
  // Default rival: whoever you've played most.
  const defaultRival = useMemo(() => {
    const h = me ? playerStats(me.id, played).headToHead[0] : undefined
    return h?.opponentId ?? players.find((p) => p.id !== me?.id)?.id ?? 0
  }, [me, played, players])
  const [a, setA] = useState(me?.id ?? 0)
  const [bChoice, setB] = useState<number | null>(null)
  const b = bChoice ?? defaultRival
  const map = useMemo(() => new Map(players.map((p) => [p.id, p])), [players])

  if (matches.isPending) return <PageLoading label="Loading head-to-heads" />
  const pa = map.get(a)
  const pb = map.get(b)
  const h = playerStats(a, played).headToHead.find((x) => x.opponentId === b)
  const meetings = (matches.data ?? []).filter((m) => (m.homeId === a && m.awayId === b) || (m.homeId === b && m.awayId === a)).slice(0, 5)
  const total = h?.played ?? 0

  return (
    <div className="stack">
      <section className="card h2h" aria-labelledby="h2h-title">
        <h2 id="h2h-title" className="section-title">Head to head</h2>
        <div className="h2h__pick">
          <label>
            <span className="sr-only">First player</span>
            <select value={a} onChange={(e) => setA(Number(e.target.value))}>
              {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <span className="h2h__v" aria-hidden>v</span>
          <label>
            <span className="sr-only">Second player</span>
            <select value={b} onChange={(e) => setB(Number(e.target.value))}>
              {players.map((p) => <option key={p.id} value={p.id} disabled={p.id === a}>{p.name}</option>)}
            </select>
          </label>
        </div>
        {a === b ? (
          <p className="muted">Pick two different players.</p>
        ) : !h ? (
          <p className="muted">{pa?.name} and {pb?.name} haven't played each other yet.</p>
        ) : (
          <>
            <div className="h2h__score" aria-label={`${pa?.name} ${h.won} wins, ${h.drawn} draws, ${pb?.name} ${h.lost} wins`}>
              <div className="h2h__side"><Kit player={pa} size={48} /><strong>{h.won}</strong><span>{pa?.name} wins</span></div>
              <div className="h2h__side h2h__side--draw"><strong>{h.drawn}</strong><span>draws</span></div>
              <div className="h2h__side"><Kit player={pb} size={48} /><strong>{h.lost}</strong><span>{pb?.name} wins</span></div>
            </div>
            <div className="h2h__bar" aria-hidden>
              <span style={{ flexGrow: h.won, background: kitColor(pa?.color ?? 0) }} />
              <span style={{ flexGrow: h.drawn }} className="h2h__bar-draw" />
              <span style={{ flexGrow: h.lost, background: kitColor(pb?.color ?? 1) }} />
            </div>
            <p className="muted small h2h__goals">
              {total} {total === 1 ? 'game' : 'games'} · goals {h.goalsFor}–{h.goalsAgainst}
            </p>
            <h3 className="sub-title">Last meetings</h3>
            <ul className="match-list">
              {meetings.map((m) => (
                <li key={m.id}><Scoreline match={m} players={map} onOpen={onOpen} context date /></li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="card" aria-labelledby="grid-title">
        <h2 id="grid-title" className="section-title">The whole crew</h2>
        <p className="muted small">Each cell is the row player's wins–draws–losses against the column player.</p>
        <div className="table-wrap">
          <table className="matrix">
            <caption className="sr-only">Head-to-head record of every pair of players</caption>
            <thead>
              <tr>
                <td />
                {players.map((p) => (
                  <th key={p.id} scope="col"><Kit player={p} size={26} /><span className="sr-only">{p.name}</span></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {players.map((row) => {
                const s = playerStats(row.id, played)
                return (
                  <tr key={row.id}>
                    <th scope="row"><span className="matrix__name"><Kit player={row} size={22} /> {row.name}</span></th>
                    {players.map((col) => {
                      if (col.id === row.id) return <td key={col.id} className="matrix__self" aria-label="—" />
                      const x = s.headToHead.find((v) => v.opponentId === col.id)
                      if (!x) return <td key={col.id} className="matrix__none">·</td>
                      const net = x.won - x.lost
                      return (
                        <td key={col.id} className={net > 0 ? 'is-up' : net < 0 ? 'is-down' : 'is-even'} style={{ '--n': Math.min(1, Math.abs(net) / 4) } as CSSProperties}>
                          {x.won}–{x.drawn}–{x.lost}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
