import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../auth/AuthContext.tsx'
import type { ExpenseInput, GroupInput, GroupPatch, JoinInput, SettlementInput } from '../../shared/schemas.ts'
import { localToday } from '../lib/dates.ts'

export const keys = {
  overview: ['overview'] as const,
  groups: ['groups'] as const,
  group: (id: number) => ['group', id] as const,
  expenses: (id: number) => ['group', id, 'expenses'] as const,
  settlements: (id: number) => ['group', id, 'settlements'] as const,
  insights: (id: number) => ['group', id, 'insights'] as const,
  activity: (id: number) => ['group', id, 'activity'] as const,
}

/** Any money movement can change every number on screen, so refresh them all. */
function useRefreshGroup() {
  const qc = useQueryClient()
  return (groupId?: number) =>
    Promise.all([
      qc.invalidateQueries({ queryKey: keys.overview }),
      qc.invalidateQueries({ queryKey: keys.groups }),
      groupId ? qc.invalidateQueries({ queryKey: keys.group(groupId) }) : qc.invalidateQueries({ queryKey: ['group'] }),
    ])
}

export const useOverview = () => {
  const api = useApi()
  return useQuery({ queryKey: keys.overview, queryFn: () => api.overview() })
}
export const useGroups = () => {
  const api = useApi()
  return useQuery({ queryKey: keys.groups, queryFn: () => api.listGroups() })
}
export const useGroup = (id: number) => {
  const api = useApi()
  return useQuery({ queryKey: keys.group(id), queryFn: () => api.getGroup(id), enabled: id > 0 })
}
export const useExpenses = (id: number) => {
  const api = useApi()
  return useQuery({ queryKey: keys.expenses(id), queryFn: () => api.listExpenses(id) })
}
export const useSettlements = (id: number) => {
  const api = useApi()
  return useQuery({ queryKey: keys.settlements(id), queryFn: () => api.listSettlements(id) })
}
export const useInsights = (id: number) => {
  const api = useApi()
  return useQuery({ queryKey: keys.insights(id), queryFn: () => api.insights(id, localToday()) })
}
export const useActivity = (id: number) => {
  const api = useApi()
  return useQuery({ queryKey: keys.activity(id), queryFn: () => api.activity(id) })
}

export function useCreateGroup() {
  const api = useApi()
  const refresh = useRefreshGroup()
  return useMutation({ mutationFn: (i: GroupInput) => api.createGroup(i), onSuccess: () => refresh() })
}
export function useUpdateGroup(id: number) {
  const api = useApi()
  const refresh = useRefreshGroup()
  return useMutation({ mutationFn: (p: GroupPatch) => api.updateGroup(id, p), onSuccess: () => refresh(id) })
}
export function useDeleteGroup() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.deleteGroup(id),
    onSuccess: (_d, id) => {
      qc.removeQueries({ queryKey: keys.group(id) })
      return Promise.all([qc.invalidateQueries({ queryKey: keys.overview }), qc.invalidateQueries({ queryKey: keys.groups })])
    },
  })
}
export function useLeaveGroup() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.leaveGroup(id),
    onSuccess: (_d, id) => {
      qc.removeQueries({ queryKey: keys.group(id) })
      return Promise.all([qc.invalidateQueries({ queryKey: keys.overview }), qc.invalidateQueries({ queryKey: keys.groups })])
    },
  })
}
export function useRegenerateInvite(id: number) {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({ mutationFn: () => api.regenerateInvite(id), onSuccess: (g) => qc.setQueryData(keys.group(id), g) })
}
export function useJoinGroup() {
  const api = useApi()
  const refresh = useRefreshGroup()
  return useMutation({ mutationFn: (i: JoinInput) => api.joinGroup(i), onSuccess: (g) => refresh(g.id) })
}

export function useMemberMutations(groupId: number) {
  const api = useApi()
  const refresh = useRefreshGroup()
  const opts = { onSuccess: () => refresh(groupId) }
  return {
    add: useMutation({ mutationFn: (name: string) => api.addMember(groupId, name), ...opts }),
    rename: useMutation({ mutationFn: ({ id, name }: { id: number; name: string }) => api.renameMember(groupId, id, name), ...opts }),
    remove: useMutation({ mutationFn: (id: number) => api.removeMember(groupId, id), ...opts }),
  }
}

export function useSaveExpense(groupId: number) {
  const api = useApi()
  const refresh = useRefreshGroup()
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: ExpenseInput }) =>
      id ? api.updateExpense(groupId, id, input) : api.createExpense(groupId, input),
    onSuccess: () => refresh(groupId),
  })
}
export function useDeleteExpense(groupId: number) {
  const api = useApi()
  const refresh = useRefreshGroup()
  return useMutation({ mutationFn: (id: number) => api.deleteExpense(groupId, id), onSuccess: () => refresh(groupId) })
}
export function useCreateSettlement(groupId: number) {
  const api = useApi()
  const refresh = useRefreshGroup()
  return useMutation({ mutationFn: (i: SettlementInput) => api.createSettlement(groupId, i), onSuccess: () => refresh(groupId) })
}
export function useDeleteSettlement(groupId: number) {
  const api = useApi()
  const refresh = useRefreshGroup()
  return useMutation({ mutationFn: (id: number) => api.deleteSettlement(groupId, id), onSuccess: () => refresh(groupId) })
}
export function useSeedSample() {
  const api = useApi()
  const refresh = useRefreshGroup()
  return useMutation({ mutationFn: () => api.seedSample(localToday()), onSuccess: () => refresh() })
}
