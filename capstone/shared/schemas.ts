import { z } from 'zod'

/**
 * The single source of truth for every rule Flowboard enforces. The same
 * schemas validate request bodies on the Express server, drive the React Hook
 * Form resolvers in the browser, and back the in-browser demo backend — so a
 * rule can never disagree between client and server.
 */

export const STATUSES = ['todo', 'in_progress', 'review', 'done'] as const
export const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const
export const PROJECT_COLORS = ['blue', 'teal', 'amber', 'magenta', 'green', 'violet'] as const

export const STATUS_LABELS: Record<(typeof STATUSES)[number], string> = {
  todo: 'To do',
  in_progress: 'In progress',
  review: 'In review',
  done: 'Done',
}

export const PRIORITY_LABELS: Record<(typeof PRIORITIES)[number], string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address'))
const password = z.string().min(8, 'Use at least 8 characters').max(128, 'Use 128 characters or fewer')
const name = z.string().trim().min(1, 'Enter your name').max(60, 'Use 60 characters or fewer')

export const signupSchema = z.object({ name, email, password })
export const loginSchema = z.object({ email, password: z.string().min(1, 'Enter your password') })
export const profileSchema = z.object({ name })
export const deleteAccountSchema = z.object({ password: z.string().min(1, 'Enter your password to confirm') })

export const projectSchema = z.object({
  name: z.string().trim().min(1, 'Give the project a name').max(60, 'Use 60 characters or fewer'),
  description: z.string().trim().max(280, 'Use 280 characters or fewer').default(''),
  color: z.enum(PROJECT_COLORS).default('blue'),
})
export const projectPatchSchema = z.object({
  name: projectSchema.shape.name.optional(),
  description: z.string().trim().max(280, 'Use 280 characters or fewer').optional(),
  color: z.enum(PROJECT_COLORS).optional(),
})

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), 'Enter a real date')

export const checklistItemSchema = z.object({
  id: z.string().min(1).max(40),
  text: z.string().trim().min(1, 'Checklist items need text').max(120),
  done: z.boolean(),
})

const label = z.string().trim().min(1).max(24, 'Labels are 24 characters or fewer')

export const taskSchema = z.object({
  projectId: z.number().int().positive('Choose a project'),
  title: z.string().trim().min(1, 'Give the task a title').max(120, 'Use 120 characters or fewer'),
  description: z.string().max(4000, 'Use 4000 characters or fewer').default(''),
  status: z.enum(STATUSES).default('todo'),
  priority: z.enum(PRIORITIES).default('medium'),
  dueDate: isoDate.nullable().default(null),
  labels: z.array(label).max(8, 'Use up to 8 labels').default([]),
  checklist: z.array(checklistItemSchema).max(30, 'Use up to 30 checklist items').default([]),
})

export const taskPatchSchema = z.object({
  title: taskSchema.shape.title.optional(),
  description: z.string().max(4000, 'Use 4000 characters or fewer').optional(),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  dueDate: isoDate.nullable().optional(),
  labels: z.array(label).max(8, 'Use up to 8 labels').optional(),
  checklist: z.array(checklistItemSchema).max(30, 'Use up to 30 checklist items').optional(),
})

export const moveSchema = z.object({
  status: z.enum(STATUSES),
  index: z.number().int().min(0),
})

export const commentSchema = z.object({
  body: z.string().trim().min(1, 'Write a comment first').max(2000, 'Use 2000 characters or fewer'),
})

export const taskQuerySchema = z.object({
  projectId: z.coerce.number().int().positive().optional(),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  q: z.string().trim().max(100).optional(),
  due: z.enum(['overdue', 'week', 'none']).optional(),
  today: isoDate.optional(),
})

export type SignupInput = z.input<typeof signupSchema>
export type LoginInput = z.input<typeof loginSchema>
export type ProfileInput = z.input<typeof profileSchema>
export type ProjectInput = z.input<typeof projectSchema>
export type ProjectPatch = z.input<typeof projectPatchSchema>
export type TaskInput = z.input<typeof taskSchema>
export type TaskPatch = z.input<typeof taskPatchSchema>
export type MoveInput = z.input<typeof moveSchema>
export type CommentInput = z.input<typeof commentSchema>
export type TaskQuery = z.input<typeof taskQuerySchema>
