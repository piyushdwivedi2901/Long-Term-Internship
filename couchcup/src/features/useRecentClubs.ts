import { useMemo } from 'react'
import { useMatches } from '../api/hooks.ts'

/** Each player's clubs, most recent first — to pre-fill the next result and keep spins fresh. */
export function useRecentClubs(crewId: number): Map<number, string[]> {
  const matches = useMatches(crewId)
  return useMemo(() => {
    const out = new Map<number, string[]>()
    for (const m of matches.data ?? []) {
      for (const [id, club] of [
        [m.homeId, m.homeClub],
        [m.awayId, m.awayClub],
      ] as const) {
        if (id === null || !club) continue
        const list = out.get(id) ?? []
        if (!list.includes(club)) list.push(club)
        out.set(id, list)
      }
    }
    return out
  }, [matches.data])
}
