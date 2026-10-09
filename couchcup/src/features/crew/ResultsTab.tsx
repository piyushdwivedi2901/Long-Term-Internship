import { useMemo, useState } from 'react'
import { Gamepad2 } from 'lucide-react'
import type { Match, Player } from '../../../shared/types.ts'
import { useMatches } from '../../api/hooks.ts'
import { formatDay } from '../../lib/dates.ts'
import { Button } from '../../ui/Button.tsx'
import { Empty } from '../../ui/bits.tsx'
import { PageLoading } from '../../ui/Spinner.tsx'
import { Scoreline } from '../Scoreline.tsx'

/** Every result, newest first, grouped by day — filterable by player. */
export function ResultsTab({ crewId, players, onOpen, onFriendly }: { crewId: number; players: Player[]; onOpen(m: Match): void; onFriendly(): void }) {
  const matches = useMatches(crewId)
  const [who, setWho] = useState(0)
  const map = useMemo(() => new Map(players.map((p) => [p.id, p])), [players])
  const groups = useMemo(() => {
    const list = (matches.data ?? []).filter((m) => !who || m.homeId === who || m.awayId === who)
    const out: { day: string; matches: Match[] }[] = []
    for (const m of list) {
      const day = formatDay(m.playedAt!)
      const g = out.at(-1)
      if (g?.day === day) g.matches.push(m)
      else out.push({ day, matches: [m] })
    }
    return out
  }, [matches.data, who])

  if (matches.isPending) return <PageLoading label="Loading results" />
  return (
    <div className="stack">
      <div className="toolbar">
        <select aria-label="Show results for" value={who} onChange={(e) => setWho(Number(e.target.value))}>
          <option value={0}>Everyone</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <Button variant="primary" icon={<Gamepad2 size={17} aria-hidden />} onClick={onFriendly}>Play a friendly</Button>
      </div>
      {groups.length === 0 ? (
        <Empty icon={<Gamepad2 size={34} strokeWidth={1.5} />} title="No results yet">
          Play a friendly or start a competition — every result counts towards ratings.
        </Empty>
      ) : (
        groups.map((g) => (
          <section key={g.day} aria-label={g.day} className="day-group">
            <h2 className="day-group__title">{g.day}</h2>
            <ul className="match-list">
              {g.matches.map((m) => (
                <li key={m.id}>
                  <Scoreline match={m} players={map} onOpen={onOpen} context rating />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
