import { z } from 'zod'
import { PRIORITIES, STATUSES, isoDate, taskSchema } from '../../../shared/schemas.ts'
import type { TaskInput } from '../../../shared/schemas.ts'

/**
 * The form's shape (strings from inputs) mapped onto the shared task schema.
 * Field rules (title length, date format…) are reused from shared/schemas.ts,
 * and the service validates the result again on the backend.
 */
export const taskFormSchema = z.object({
  title: taskSchema.shape.title,
  projectId: z.coerce.number<string>().int().positive('Choose a project'),
  status: z.enum(STATUSES),
  priority: z.enum(PRIORITIES),
  dueDate: z.union([z.literal(''), isoDate]),
  labels: z
    .string()
    .refine((s) => splitLabels(s).length <= 8, 'Use up to 8 labels')
    .refine((s) => splitLabels(s).every((l) => l.length <= 24), 'Labels are 24 characters or fewer'),
  description: z.string().max(4000, 'Use 4000 characters or fewer'),
})

export type TaskFormValues = z.input<typeof taskFormSchema>
export type TaskFormOutput = z.output<typeof taskFormSchema>

export const splitLabels = (s: string) =>
  [...new Set(s.split(',').map((l) => l.trim().toLowerCase()).filter(Boolean))]

export function toTaskInput(v: TaskFormOutput): TaskInput {
  return {
    projectId: v.projectId,
    title: v.title,
    status: v.status,
    priority: v.priority,
    dueDate: v.dueDate || null,
    labels: splitLabels(v.labels),
    description: v.description,
  }
}
