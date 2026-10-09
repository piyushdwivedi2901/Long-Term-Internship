import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../auth/AuthContext.tsx'
import type { ClaimInput, FileInput, ItemInput } from '../../shared/schemas.ts'
import type { ItemDetail } from '../../shared/types.ts'
import { localToday } from '../lib/dates.ts'

export const keys = {
  dashboard: ['dashboard'] as const,
  items: ['items'] as const,
  item: (id: number) => ['item', id] as const,
  file: (id: number) => ['file', id] as const,
}

/** A change to one item can move every number on the dashboard. */
function useRefresh() {
  const qc = useQueryClient()
  return (itemId?: number) =>
    Promise.all([
      qc.invalidateQueries({ queryKey: keys.dashboard }),
      qc.invalidateQueries({ queryKey: keys.items }),
      itemId ? qc.invalidateQueries({ queryKey: keys.item(itemId) }) : Promise.resolve(),
    ])
}

export const useDashboard = () => {
  const api = useApi()
  return useQuery({ queryKey: keys.dashboard, queryFn: () => api.dashboard(localToday()) })
}
export const useItems = () => {
  const api = useApi()
  return useQuery({ queryKey: keys.items, queryFn: () => api.listItems(localToday()) })
}
export const useItem = (id: number) => {
  const api = useApi()
  return useQuery({ queryKey: keys.item(id), queryFn: () => api.getItem(id, localToday()), enabled: id > 0 })
}

/** A stored bill or photo as an object URL, revoked when no longer cached. */
export const useFileUrl = (fileId: number | null) => {
  const api = useApi()
  return useQuery({
    queryKey: keys.file(fileId ?? 0),
    queryFn: async () => URL.createObjectURL(await api.fileBlob(fileId!)),
    enabled: !!fileId,
    staleTime: Infinity,
    gcTime: 60_000,
  })
}

export function useSaveItem() {
  const api = useApi()
  const qc = useQueryClient()
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: ItemInput }) => (id ? api.updateItem(id, input, localToday()) : api.createItem(input, localToday())),
    onSuccess: (item) => {
      qc.setQueryData(keys.item(item.id), item)
      return refresh()
    },
  })
}
export function useDeleteItem() {
  const api = useApi()
  const qc = useQueryClient()
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (id: number) => api.deleteItem(id),
    onSuccess: (_d, id) => {
      qc.removeQueries({ queryKey: keys.item(id) })
      return refresh()
    },
  })
}

export function useUploadFile(itemId: number) {
  const api = useApi()
  const refresh = useRefresh()
  return useMutation({ mutationFn: (i: FileInput) => api.uploadFile(itemId, i), onSuccess: () => refresh(itemId) })
}
export function useDeleteFile(itemId: number) {
  const api = useApi()
  const qc = useQueryClient()
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (fileId: number) => api.deleteFile(fileId),
    // Optimistic: the thumbnail disappears at once and comes back if the delete fails.
    onMutate: async (fileId) => {
      await qc.cancelQueries({ queryKey: keys.item(itemId) })
      const prev = qc.getQueryData<ItemDetail>(keys.item(itemId))
      if (prev) qc.setQueryData<ItemDetail>(keys.item(itemId), { ...prev, files: prev.files.filter((f) => f.id !== fileId), fileCount: prev.fileCount - 1 })
      return { prev }
    },
    onError: (_e, _id, ctx) => ctx?.prev && qc.setQueryData(keys.item(itemId), ctx.prev),
    onSettled: (_d, _e, fileId) => {
      const url = qc.getQueryData<string>(keys.file(fileId))
      if (url) URL.revokeObjectURL(url)
      qc.removeQueries({ queryKey: keys.file(fileId) })
      return refresh(itemId)
    },
  })
}

export function useSaveClaim(itemId: number) {
  const api = useApi()
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: ClaimInput }) => (id ? api.updateClaim(id, input, localToday()) : api.createClaim(itemId, input, localToday())),
    onSuccess: () => refresh(itemId),
  })
}
export function useDeleteClaim(itemId: number) {
  const api = useApi()
  const refresh = useRefresh()
  return useMutation({ mutationFn: (id: number) => api.deleteClaim(id), onSuccess: () => refresh(itemId) })
}

export function useSeedSample() {
  const api = useApi()
  const refresh = useRefresh()
  return useMutation({ mutationFn: () => api.seedSample(localToday()), onSuccess: () => refresh() })
}
