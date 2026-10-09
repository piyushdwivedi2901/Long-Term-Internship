import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useApi } from '../auth/AuthContext.tsx'
import type { MoveInput, ProjectInput, ProjectPatch, TaskInput, TaskPatch, TaskQuery } from '../../shared/schemas.ts'
import type { Project, Task } from '../../shared/types.ts'
import { localToday } from '../lib/dates.ts'

export const keys = {
  projects: ['projects'] as const,
  project: (id: number) => ['projects', id] as const,
  tasks: (q: TaskQuery = {}) => ['tasks', 'list', q] as const,
  task: (id: number) => ['tasks', 'one', id] as const,
  comments: (taskId: number) => ['comments', taskId] as const,
  activity: ['activity'] as const,
  stats: ['stats'] as const,
}

/** After any write, these views may be stale. */
function useInvalidateWorkspace() {
  const qc = useQueryClient()
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['tasks'] }),
      qc.invalidateQueries({ queryKey: keys.projects }),
      qc.invalidateQueries({ queryKey: keys.stats }),
      qc.invalidateQueries({ queryKey: keys.activity }),
    ])
}

// ---------- queries ----------
export const useProjects = () => {
  const api = useApi()
  return useQuery({ queryKey: keys.projects, queryFn: () => api.listProjects() })
}
export const useProject = (id: number) => {
  const api = useApi()
  return useQuery({ queryKey: keys.project(id), queryFn: () => api.getProject(id), enabled: id > 0 })
}
export const useTasks = (q: TaskQuery = {}) => {
  const api = useApi()
  const query = { ...q, today: q.today ?? localToday() }
  return useQuery({ queryKey: keys.tasks(q), queryFn: () => api.listTasks(query), placeholderData: (prev) => prev })
}
export const useTask = (id: number | null) => {
  const api = useApi()
  return useQuery({ queryKey: keys.task(id ?? 0), queryFn: () => api.getTask(id!), enabled: !!id })
}
export const useComments = (taskId: number) => {
  const api = useApi()
  return useQuery({ queryKey: keys.comments(taskId), queryFn: () => api.listComments(taskId) })
}
export const useActivity = (limit = 12) => {
  const api = useApi()
  return useQuery({ queryKey: [...keys.activity, limit], queryFn: () => api.activity(limit) })
}
export const useStats = () => {
  const api = useApi()
  return useQuery({ queryKey: keys.stats, queryFn: () => api.stats(localToday()) })
}

// ---------- project mutations ----------
export function useCreateProject() {
  const api = useApi()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (i: ProjectInput) => api.createProject(i), onSuccess: () => invalidate() })
}
export function useUpdateProject() {
  const api = useApi()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: ({ id, patch }: { id: number; patch: ProjectPatch }) => api.updateProject(id, patch), onSuccess: () => invalidate() })
}
export function useDeleteProject() {
  const api = useApi()
  const qc = useQueryClient()
  const invalidate = useInvalidateWorkspace()
  return useMutation({
    mutationFn: (id: number) => api.deleteProject(id),
    onSuccess: (_d, id) => {
      qc.removeQueries({ queryKey: keys.project(id) })
      return invalidate()
    },
  })
}
export function useSeedSample() {
  const api = useApi()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: () => api.seedSample(localToday()), onSuccess: () => invalidate() })
}

// ---------- task mutations ----------
export function useCreateTask() {
  const api = useApi()
  const invalidate = useInvalidateWorkspace()
  return useMutation({ mutationFn: (i: TaskInput) => api.createTask(i), onSuccess: () => invalidate() })
}

type Snapshot = [QueryKey, Task[] | undefined][]

/** Applies `change` to every cached task list, returning a snapshot for rollback. */
function patchCachedLists(qc: ReturnType<typeof useQueryClient>, change: (list: Task[]) => Task[]): Snapshot {
  const snapshot = qc.getQueriesData<Task[]>({ queryKey: ['tasks', 'list'] })
  for (const [key, list] of snapshot) if (list) qc.setQueryData(key, change(list))
  return snapshot
}

export function useUpdateTask() {
  const api = useApi()
  const qc = useQueryClient()
  const invalidate = useInvalidateWorkspace()
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: TaskPatch }) => api.updateTask(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ['tasks'] })
      const prevTask = qc.getQueryData<Task>(keys.task(id))
      if (prevTask) qc.setQueryData(keys.task(id), { ...prevTask, ...patch } as Task)
      const lists = patchCachedLists(qc, (l) => l.map((t) => (t.id === id ? ({ ...t, ...patch } as Task) : t)))
      return { prevTask, lists }
    },
    onError: (_e, { id }, ctx) => {
      if (ctx?.prevTask) qc.setQueryData(keys.task(id), ctx.prevTask)
      ctx?.lists.forEach(([k, v]) => qc.setQueryData(k, v))
    },
    onSettled: () => invalidate(),
  })
}

/** Optimistic drag-and-drop move with rollback. */
export function useMoveTask() {
  const api = useApi()
  const qc = useQueryClient()
  const invalidate = useInvalidateWorkspace()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: MoveInput }) => api.moveTask(id, input),
    onMutate: async ({ id, input }) => {
      await qc.cancelQueries({ queryKey: ['tasks'] })
      const lists = patchCachedLists(qc, (list) => applyMove(list, id, input))
      return { lists }
    },
    onError: (_e, _v, ctx) => ctx?.lists.forEach(([k, v]) => qc.setQueryData(k, v)),
    onSettled: () => invalidate(),
  })
}

/** Pure client-side mirror of the server's move rule (see shared/services.ts). */
export function applyMove(list: Task[], id: number, { status, index }: MoveInput): Task[] {
  const task = list.find((t) => t.id === id)
  if (!task) return list
  const sameProject = (t: Task) => t.projectId === task.projectId
  const target = list
    .filter((t) => sameProject(t) && t.status === status && t.id !== id)
    .sort((a, b) => a.position - b.position)
  target.splice(Math.min(index, target.length), 0, { ...task, status })
  const source = list
    .filter((t) => sameProject(t) && t.status === task.status && t.id !== id)
    .sort((a, b) => a.position - b.position)
  const positions = new Map<number, { status: Task['status']; position: number }>()
  source.forEach((t, i) => positions.set(t.id, { status: t.status, position: i }))
  target.forEach((t, i) => positions.set(t.id, { status, position: i }))
  return list.map((t) => (positions.has(t.id) ? { ...t, ...positions.get(t.id)! } : t))
}

export function useDeleteTask() {
  const api = useApi()
  const qc = useQueryClient()
  const invalidate = useInvalidateWorkspace()
  return useMutation({
    mutationFn: (id: number) => api.deleteTask(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['tasks'] })
      return { lists: patchCachedLists(qc, (l) => l.filter((t) => t.id !== id)) }
    },
    onError: (_e, _id, ctx) => ctx?.lists.forEach(([k, v]) => qc.setQueryData(k, v)),
    onSuccess: (_d, id) => qc.removeQueries({ queryKey: keys.task(id) }),
    onSettled: () => invalidate(),
  })
}

export function useAddComment(taskId: number) {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => api.addComment(taskId, { body }),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: keys.comments(taskId) }),
        qc.invalidateQueries({ queryKey: ['tasks'] }),
        qc.invalidateQueries({ queryKey: keys.activity }),
      ]),
  })
}
export function useDeleteComment(taskId: number) {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.deleteComment(id),
    onSuccess: () =>
      Promise.all([qc.invalidateQueries({ queryKey: keys.comments(taskId) }), qc.invalidateQueries({ queryKey: ['tasks'] })]),
  })
}

export const projectById = (projects: Project[] | undefined, id: number) => projects?.find((p) => p.id === id)
