import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../auth/AuthContext.tsx'
import type { CompetitionInput, CrewInput, FriendlyInput, JoinInput, PlayerInput, ResultInput } from '../../shared/schemas.ts'

export const keys = {
  overview: ['overview'] as const,
  crew: (id: number) => ['crew', id] as const,
  matches: (id: number) => ['crew', id, 'matches'] as const,
  activity: (id: number) => ['crew', id, 'activity'] as const,
  player: (crewId: number, id: number) => ['crew', crewId, 'player', id] as const,
  competition: (id: number) => ['competition', id] as const,
}

/**
 * One result moves the table, the bracket, everybody's rating and the
 * records — so refresh the whole crew.
 */
function useRefreshCrew() {
  const qc = useQueryClient()
  return (crewId?: number) =>
    Promise.all([
      qc.invalidateQueries({ queryKey: keys.overview }),
      crewId ? qc.invalidateQueries({ queryKey: ['crew', crewId] }) : qc.invalidateQueries({ queryKey: ['crew'] }),
      qc.invalidateQueries({ queryKey: ['competition'] }),
    ])
}

export const useOverview = () => {
  const api = useApi()
  return useQuery({ queryKey: keys.overview, queryFn: () => api.overview() })
}
export const useCrew = (id: number) => {
  const api = useApi()
  return useQuery({ queryKey: keys.crew(id), queryFn: () => api.getCrew(id), enabled: id > 0 })
}
export const useMatches = (id: number) => {
  const api = useApi()
  return useQuery({ queryKey: keys.matches(id), queryFn: () => api.listMatches(id) })
}
export const useActivity = (id: number) => {
  const api = useApi()
  return useQuery({ queryKey: keys.activity(id), queryFn: () => api.crewActivity(id) })
}
export const usePlayerProfile = (crewId: number, id: number) => {
  const api = useApi()
  return useQuery({ queryKey: keys.player(crewId, id), queryFn: () => api.playerProfile(crewId, id), enabled: id > 0 })
}
export const useCompetition = (id: number) => {
  const api = useApi()
  return useQuery({ queryKey: keys.competition(id), queryFn: () => api.getCompetition(id), enabled: id > 0 })
}

export function useCreateCrew() {
  const api = useApi()
  const refresh = useRefreshCrew()
  return useMutation({ mutationFn: (i: CrewInput) => api.createCrew(i), onSuccess: () => refresh() })
}
export function useCrewMutations(crewId: number) {
  const api = useApi()
  const qc = useQueryClient()
  const refresh = useRefreshCrew()
  const ok = { onSuccess: () => refresh(crewId) }
  return {
    rename: useMutation({ mutationFn: (name: string) => api.renameCrew(crewId, name), ...ok }),
    regenerate: useMutation({ mutationFn: () => api.regenerateInvite(crewId), onSuccess: (c) => qc.setQueryData(keys.crew(crewId), c) }),
    remove: useMutation({ mutationFn: () => api.deleteCrew(crewId), onSuccess: () => (qc.removeQueries({ queryKey: ['crew', crewId] }), refresh()) }),
    leave: useMutation({ mutationFn: () => api.leaveCrew(crewId), onSuccess: () => (qc.removeQueries({ queryKey: ['crew', crewId] }), refresh()) }),
    addPlayer: useMutation({ mutationFn: (i: PlayerInput) => api.addPlayer(crewId, i), ...ok }),
    updatePlayer: useMutation({ mutationFn: ({ id, input }: { id: number; input: PlayerInput }) => api.updatePlayer(crewId, id, input), ...ok }),
    removePlayer: useMutation({ mutationFn: (id: number) => api.removePlayer(crewId, id), ...ok }),
  }
}
export function useJoinCrew() {
  const api = useApi()
  const refresh = useRefreshCrew()
  return useMutation({ mutationFn: (i: JoinInput) => api.joinCrew(i), onSuccess: (c) => refresh(c.id) })
}

export function useCreateCompetition(crewId: number) {
  const api = useApi()
  const refresh = useRefreshCrew()
  return useMutation({ mutationFn: (i: CompetitionInput) => api.createCompetition(crewId, i), onSuccess: () => refresh(crewId) })
}
export function useCompetitionMutations(crewId: number, id: number) {
  const api = useApi()
  const qc = useQueryClient()
  const refresh = useRefreshCrew()
  return {
    rename: useMutation({ mutationFn: (name: string) => api.renameCompetition(id, name), onSuccess: () => refresh(crewId) }),
    remove: useMutation({ mutationFn: () => api.deleteCompetition(id), onSuccess: () => (qc.removeQueries({ queryKey: keys.competition(id) }), refresh(crewId)) }),
  }
}

export function useResult(crewId: number) {
  const api = useApi()
  const refresh = useRefreshCrew()
  return {
    record: useMutation({ mutationFn: ({ matchId, input }: { matchId: number; input: ResultInput }) => api.recordResult(matchId, input), onSuccess: () => refresh(crewId) }),
    clear: useMutation({ mutationFn: (matchId: number) => api.clearResult(matchId), onSuccess: () => refresh(crewId) }),
    friendly: useMutation({ mutationFn: (i: FriendlyInput) => api.addFriendly(crewId, i), onSuccess: () => refresh(crewId) }),
  }
}

export function useSeedSample() {
  const api = useApi()
  const refresh = useRefreshCrew()
  return useMutation({ mutationFn: () => api.seedSample(), onSuccess: () => refresh() })
}
