import type { CSSProperties } from 'react'
import type { BracketRound, Match, Player } from '../../shared/types.ts'
import { cx } from '../lib/cx.ts'
import { Kit, kitColor } from '../ui/bits.tsx'
import { describeMatch } from './Scoreline.tsx'

function Line({ player, goals, pens, won, bye }: { player: Player | undefined; goals: number | null; pens: number | null; won: boolean; bye?: boolean }) {
  return (
    <span className={cx('bracket__line', won && 'is-winner', !player && 'is-tbd')} style={{ '--kit': player ? kitColor(player.color) : 'transparent' } as CSSProperties}>
      <Kit player={player} size={22} />
      <span className="bracket__name">{player?.name ?? (bye ? 'bye' : 'TBD')}</span>
      <span className="bracket__goals">
        {goals ?? ''}
        {pens !== null && <sup>({pens})</sup>}
      </span>
    </span>
  )
}

/**
 * The knockout tree, left to right. Each round is a column; connectors are
 * drawn in CSS. Ready or played ties open the result dialog.
 */
export function Bracket({ rounds, players, onOpen }: { rounds: BracketRound[]; players: Map<number, Player>; onOpen(m: Match): void }) {
  return (
    <ol className="bracket" aria-label="Bracket">
      {rounds.map((r) => (
        <li key={r.round} className="bracket__round" aria-label={r.name}>
          <h3 className="bracket__title">{r.name}</h3>
          <ol className="bracket__matches">
            {r.matches.map((m) => {
              const home = m.homeId !== null ? players.get(m.homeId) : undefined
              const away = m.awayId !== null ? players.get(m.awayId) : undefined
              const ready = m.status === 'played' || (m.status === 'scheduled' && home && away)
              const content = (
                <>
                  <Line player={home} goals={m.homeGoals} pens={m.homePens} won={m.winnerId !== null && m.winnerId === m.homeId} bye={m.status === 'bye' && !home} />
                  <Line player={away} goals={m.awayGoals} pens={m.awayPens} won={m.winnerId !== null && m.winnerId === m.awayId} bye={m.status === 'bye' && !away} />
                </>
              )
              return (
                <li key={m.id} className={cx('bracket__match', m.status === 'bye' && 'is-bye', m.status === 'played' && 'is-played')}>
                  {ready ? (
                    <button type="button" className="bracket__card" onClick={() => onOpen(m)}>
                      <span className="sr-only">{`${r.name}: ${describeMatch(m, players)}. ${m.status === 'played' ? 'Edit result' : 'Enter result'}`}</span>
                      <span className="bracket__visual" aria-hidden>{content}</span>
                    </button>
                  ) : (
                    <div className="bracket__card">
                      <span className="sr-only">{`${r.name}: ${describeMatch(m, players)}`}</span>
                      <span className="bracket__visual" aria-hidden>{content}</span>
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        </li>
      ))}
    </ol>
  )
}
