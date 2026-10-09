import { useLayoutEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { PRIORITIES, PRIORITY_LABELS, STATUSES, STATUS_LABELS } from '../../../shared/schemas.ts'
import { useCreateTask, useProjects } from '../../api/hooks.ts'
import { ApiError } from '../../api/types.ts'
import { useUi } from '../../lib/uiStore.ts'
import { Button } from '../../ui/Button.tsx'
import { Field } from '../../ui/Field.tsx'
import { Modal } from '../../ui/Modal.tsx'
import { taskFormSchema, toTaskInput, type TaskFormOutput, type TaskFormValues } from './taskForm.ts'

export function NewTaskDialog() {
  const preset = useUi((s) => s.newTask)
  const close = useUi((s) => s.closeNewTask)
  const toast = useUi((s) => s.toast)
  const navigate = useNavigate()
  const { data: projects = [] } = useProjects()
  const create = useCreateTask()

  const form = useForm<TaskFormValues, unknown, TaskFormOutput>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: { title: '', projectId: '', status: 'todo', priority: 'medium', dueDate: '', labels: '', description: '' },
  })
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = form

  useLayoutEffect(() => {
    if (preset) {
      reset({
        title: '',
        projectId: String(preset.projectId ?? projects[0]?.id ?? ''),
        status: preset.status ?? 'todo',
        priority: 'medium',
        dueDate: '',
        labels: '',
        description: '',
      })
    }
    // Only when the dialog opens with a new preset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      const task = await create.mutateAsync(toTaskInput(values))
      close()
      toast(`Added “${task.title}”`, 'success', {
        label: 'Open',
        run: () => navigate(`/projects/${task.projectId}?task=${task.id}`),
      })
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        for (const [name, message] of Object.entries(err.fields)) setError(name as keyof TaskFormValues, { message })
      } else {
        setError('root', { message: (err as Error).message })
      }
    }
  })

  return (
    <Modal
      open={preset !== null}
      onClose={close}
      title="New task"
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="primary" type="submit" form="new-task-form" busy={isSubmitting}>Add task</Button>
        </>
      }
    >
      {projects.length === 0 ? (
        <p className="prose">Create a project first — tasks always belong to one.</p>
      ) : (
        <form id="new-task-form" onSubmit={onSubmit} noValidate className="form-grid">
          <Field label="Title" error={errors.title?.message} className="span-2">
            <input data-autofocus autoComplete="off" placeholder="What needs to happen?" {...register('title')} />
          </Field>
          <Field label="Project" error={errors.projectId?.message}>
            <select {...register('projectId')}>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select {...register('status')}>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select {...register('priority')}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
            </select>
          </Field>
          <Field label="Due date" error={errors.dueDate?.message}>
            <input type="date" {...register('dueDate')} />
          </Field>
          <Field label="Labels" hint="Separate with commas, e.g. design, bug" error={errors.labels?.message} className="span-2">
            <input autoComplete="off" {...register('labels')} />
          </Field>
          <Field label="Notes" error={errors.description?.message} className="span-2">
            <textarea rows={4} {...register('description')} />
          </Field>
          {errors.root && <p className="form-error span-2" role="alert">{errors.root.message}</p>}
        </form>
      )}
    </Modal>
  )
}
