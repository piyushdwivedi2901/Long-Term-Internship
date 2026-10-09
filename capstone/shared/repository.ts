import type { ActivityKind, ChecklistItem, Priority, ProjectColor, Status } from './types.ts'

/**
 * Storage interface. The Express server implements it with SQLite
 * (server/sqliteRepository.ts); the static demo implements it in memory with
 * localStorage persistence (shared/memoryRepository.ts). All business rules
 * live in services.ts, above this line, so both behave identically.
 */
export interface UserRow {
  id: number
  name: string
  email: string
  passwordHash: string
  createdAt: string
}

export interface ProjectRow {
  id: number
  ownerId: number
  name: string
  description: string
  color: ProjectColor
  createdAt: string
  updatedAt: string
}

export interface TaskRow {
  id: number
  ownerId: number
  projectId: number
  title: string
  description: string
  status: Status
  priority: Priority
  dueDate: string | null
  labels: string[]
  checklist: ChecklistItem[]
  position: number
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export interface CommentRow {
  id: number
  taskId: number
  authorId: number
  body: string
  createdAt: string
}

export interface ActivityRow {
  id: number
  ownerId: number
  kind: ActivityKind
  projectId: number | null
  taskId: number | null
  summary: string
  createdAt: string
}

type New<T> = Omit<T, 'id'>

export interface Repository {
  users: {
    insert(row: New<UserRow>): UserRow
    byId(id: number): UserRow | undefined
    byEmail(email: string): UserRow | undefined
    update(id: number, patch: Partial<New<UserRow>>): void
    delete(id: number): void
  }
  projects: {
    insert(row: New<ProjectRow>): ProjectRow
    byId(id: number): ProjectRow | undefined
    listByOwner(ownerId: number): ProjectRow[]
    update(id: number, patch: Partial<New<ProjectRow>>): void
    delete(id: number): void
  }
  tasks: {
    insert(row: New<TaskRow>): TaskRow
    byId(id: number): TaskRow | undefined
    listByOwner(ownerId: number): TaskRow[]
    update(id: number, patch: Partial<New<TaskRow>>): void
    delete(id: number): void
  }
  comments: {
    insert(row: New<CommentRow>): CommentRow
    byId(id: number): CommentRow | undefined
    listByTask(taskId: number): CommentRow[]
    countByTasks(taskIds: number[]): Map<number, number>
    delete(id: number): void
  }
  activity: {
    insert(row: New<ActivityRow>): ActivityRow
    listByOwner(ownerId: number, limit: number): ActivityRow[]
    deleteByOwner(ownerId: number): void
  }
  /** Runs fn atomically (a real transaction in SQLite). */
  transaction<T>(fn: () => T): T
}
