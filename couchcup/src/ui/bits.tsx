import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { KIT_COLORS } from '../../shared/schemas.ts'
import type { Outcome, Player } from '../../shared/types.ts'
import { cx } from '../lib/cx.ts'

export const kitColor = (color: number) => KIT_COLORS[color] ?? KIT_COLORS[0]
export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?'

/** A player's badge: their initials on their kit colour. */
export function Kit({ player, size = 32 }: { player: Pick<Player, 'name' | 'color'> | undefined; size?: number }) {
  return (
    <span className="kit" aria-hidden style={{ width: size, height: size, fontSize: size * 0.4, ['--kit' as string]: player ? kitColor(player.color) : 'var(--line-2)' } as CSSProperties}>
      {player ? initials(player.name) : '?'}
    </span>
  )
}

/** Kit + name, linking to the player's profile. */
export function PlayerTag({ player, crewId, size = 26, you }: { player: Player | undefined; crewId: number; size?: number; you?: boolean }) {
  if (!player) return <span className="player-tag player-tag--tbd"><Kit player={undefined} size={size} /> <span>TBD</span></span>
  return (
    <Link to={`/crews/${crewId}/players/${player.id}`} className="player-tag">
      <Kit player={player} size={size} />
      <span className="player-tag__name">{player.name}</span>
      {you && player.isYou && <span className="you-tag">you</span>}
    </Link>
  )
}

const OUTCOME_LABEL: Record<Outcome, string> = { W: 'Win', D: 'Draw', L: 'Loss' }

/** Last-five form guide, oldest first — as on every football results page. */
export function Form({ form, label = 'Form' }: { form: Outcome[]; label?: string }) {
  if (!form.length) return <span className="muted small">—</span>
  return (
    <span className="form" role="img" aria-label={`${label}: ${form.map((f) => OUTCOME_LABEL[f]).join(', ')}`}>
      {form.map((f, i) => (
        <span key={i} className={`form__pip form__pip--${f}`} aria-hidden>
          {f}
        </span>
      ))}
    </span>
  )
}

/** Rating change: ▲ 14 / ▼ 6 / – */
export function Trend({ value, className }: { value: number; className?: string }) {
  if (value === 0) return <span className={cx('trend', className)}>–<span className="sr-only">no change</span></span>
  return (
    <span className={cx('trend', value > 0 ? 'trend--up' : 'trend--down', className)}>
      <span aria-hidden>{value > 0 ? '▲' : '▼'}</span>
      <span className="sr-only">{value > 0 ? 'up' : 'down'} </span>
      {Math.abs(value)}
    </span>
  )
}

export function Empty({ title, children, action, icon }: { title: string; children?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="empty">
      {icon && <span className="empty__icon" aria-hidden>{icon}</span>}
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}

export function Stars({ value }: { value: number }) {
  return (
    <span className="stars" role="img" aria-label={`${value} stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} aria-hidden className={value >= i + 1 ? 'is-full' : value >= i + 0.5 ? 'is-half' : ''}>★</span>
      ))}
    </span>
  )
}

/** Players by id, for components that render many matches. */
export const byId = (players: Player[]) => new Map(players.map((p) => [p.id, p]))
