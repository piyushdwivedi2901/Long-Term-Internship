import type { CSSProperties } from 'react'
import { clubCode } from '../../shared/clubs.ts'
import type { Match, Player } from '../../shared/types.ts'
import { formatDay } from '../lib/dates.ts'
import { cx } from '../lib/cx.ts'
import { Kit, Trend, kitColor } from '../ui/bits.tsx'

interface Props {
  match: Match
  players: Map<number, Player>
  onOpen?: (m: Match) => void
  /** show the competition / round above the score */
  context?: boolean
  /** show the date */
  date?: boolean
  /** show rating changes */
  rating?: boolean
}

const side = (players: Map<number, Player>, id: number | null) => (id === null ? undefined : players.get(id))

export function describeMatch(m: Match, players: Map<number, Player>): string {
  const h = side(players, m.homeId)?.name ?? 'TBD'
  const a = side(players, m.awayId)?.name ?? 'TBD'
  if (m.status === 'bye') return `${h ?? a} has a bye`
  if (m.status !== 'played') return `${h} vs ${a}`
  const pens = m.homePens !== null ? `, ${m.homePens}–${m.awayPens} on penalties` : ''
  return `${h} ${m.homeGoals}–${m.awayGoals} ${a}${pens}`
}

/**
 * A TV-style score bug: kit colour, name and club code either side of the
 * score. The winner is bold; the loser fades.
 */
export function Scoreline({ match: m, players, onOpen, context, date, rating }: Props) {
  const home = side(players, m.homeId)
  const away = side(players, m.awayId)
  const played = m.status === 'played'
  const ready = m.status === 'scheduled' && home && away
  const homeWon = played && m.winnerId === m.homeId
  const awayWon = played && m.winnerId === m.awayId
  const clickable = !!onOpen && (played || ready)
  const label = `${describeMatch(m, players)}${m.competitionName ? `, ${m.competitionName} ${m.roundLabel}` : m.roundLabel === 'Friendly' ? ', friendly' : ''}. ${played ? 'Edit result' : 'Enter result'}`

  const visual = (
    <>
      {(context || date) && (
        <span className="scoreline__meta">
          {context && <span>{m.competitionName ? `${m.competitionName} · ${m.roundLabel}` : m.roundLabel}</span>}
          {date && m.playedAt && <span>{formatDay(m.playedAt)}</span>}
        </span>
      )}
      <span className={cx('scoreline__side scoreline__side--home', played && !homeWon && m.winnerId !== null && 'is-loser')} style={{ '--kit': home ? kitColor(home.color) : 'var(--line-2)' } as CSSProperties}>
        <span className="scoreline__name">{home?.name ?? 'TBD'}</span>
        {(m.homeClub || (rating && played)) && (
          <span className="scoreline__sub">
            {m.homeClub && <abbr title={m.homeClub}>{clubCode(m.homeClub)}</abbr>}
            {rating && played && m.ratingDelta !== null && <Trend value={m.ratingDelta} />}
          </span>
        )}
        <Kit player={home} size={30} />
      </span>
      <span className={cx('scoreline__score', played && 'is-played', m.status === 'bye' && 'is-bye')}>
        {played ? (
          <>
            <span className="scoreline__goals">
              <span>{m.homeGoals}</span>
              <span className="scoreline__dash">–</span>
              <span>{m.awayGoals}</span>
            </span>
            {m.homePens !== null && <span className="scoreline__pens">{m.homePens}–{m.awayPens} pens</span>}
            {m.decidedBy === 'extra_time' && <span className="scoreline__pens">AET</span>}
            {m.decidedBy === 'forfeit' && <span className="scoreline__pens">forfeit</span>}
          </>
        ) : m.status === 'bye' ? (
          <span className="scoreline__vs">bye</span>
        ) : (
          <span className="scoreline__vs">{ready && onOpen ? 'Enter score' : 'vs'}</span>
        )}
      </span>
      <span className={cx('scoreline__side scoreline__side--away', played && !awayWon && m.winnerId !== null && 'is-loser')} style={{ '--kit': away ? kitColor(away.color) : 'var(--line-2)' } as CSSProperties}>
        <Kit player={away} size={30} />
        <span className="scoreline__name">{away?.name ?? (m.status === 'bye' ? '—' : 'TBD')}</span>
        {(m.awayClub || (rating && played)) && (
          <span className="scoreline__sub">
            {m.awayClub && <abbr title={m.awayClub}>{clubCode(m.awayClub)}</abbr>}
            {rating && played && m.ratingDelta !== null && <Trend value={-m.ratingDelta} />}
          </span>
        )}
      </span>
    </>
  )

  // Screen readers get one clear sentence; the visual score bug is hidden from them
  // (and laid out with display: contents, so the grid still works).
  const body = (
    <>
      <span className="sr-only">{clickable ? label : describeMatch(m, players)}</span>
      <span className="scoreline__visual" aria-hidden>{visual}</span>
    </>
  )
  return clickable ? (
    <button type="button" className={cx('scoreline', 'scoreline--button', homeWon && 'home-won', awayWon && 'away-won')} onClick={() => onOpen!(m)}>
      {body}
    </button>
  ) : (
    <div className={cx('scoreline', homeWon && 'home-won', awayWon && 'away-won')}>{body}</div>
  )
}
