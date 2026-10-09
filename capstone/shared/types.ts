import type { PRIORITIES, PROJECT_COLORS, STATUSES } from './schemas.ts'

export type Status = (typeof STATUSES)[number]
export type Priority = (typeof PRIORITIES)[number]
export type ProjectColor = (typeof PROJECT_COLORS)[number]

export interface User {
  id: number
  name: string
  email: string
  createdAt: string
}

export interface Session {
  token: string
  user: User
}

export type StatusCounts = Record<Status, number>

export interface Project {
  id: number
  name: string
  description: string
  color: ProjectColor
  createdAt: string
  updatedAt: string
  counts: StatusCounts
}

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface Task {
  id: number
  projectId: number
  title: string
  description: string
  status: Status
  priority: Priority
  dueDate: string | null
  labels: string[]
  checklist: ChecklistItem[]
  position: number
  commentCount: number
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export interface Comment {
  id: number
  taskId: number
  authorId: number
  authorName: string
  body: string
  createdAt: string
}

export type ActivityKind =
  | 'project.created'
  | 'project.updated'
  | 'project.deleted'
  | 'task.created'
  | 'task.updated'
  | 'task.moved'
  | 'task.completed'
  | 'task.deleted'
  | 'comment.added'

export interface Activity {
  id: number
  kind: ActivityKind
  projectId: number | null
  taskId: number | null
  summary: string
  createdAt: string
}

export interface Stats {
  total: number
  counts: StatusCounts
  overdue: number
  dueThisWeek: number
  /** 0–1, done / total (0 when there are no tasks). */
  completionRate: number
  /** One entry per day for the last 14 days, oldest first. */
  completedByDay: { date: string; count: number }[]
  projects: { id: number; name: string; color: ProjectColor; counts: StatusCounts; total: number }[]
}

export interface ApiErrorBody {
  error: { code: string; message: string; fields?: Record<string, string> }
}
