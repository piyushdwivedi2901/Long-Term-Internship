import { useId, useState, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckSquare, MessageSquare, Plus, Trash2, X } from 'lucide-react'
import { PRIORITIES, PRIORITY_LABELS, STATUSES, STATUS_LABELS } from '../../../shared/schemas.ts'
import type { ChecklistItem, Task } from '../../../shared/types.ts'
import {
  projectById,
  useAddComment,
  useComments,
  useDeleteComment,
  useDeleteTask,
  useProjects,
  useTask,
  useUpdateTask,
} from '../../api/hooks.ts'
import { ApiError } from '../../api/types.ts'
import { useAuth } from '../../auth/AuthContext.tsx'
import { localToday, timeAgo } from '../../lib/dates.ts'
import { useUi } from '../../lib/uiStore.ts'
import { Avatar, DueChip, LineDot } from '../../ui/bits.tsx'
import { Button } from '../../ui/Button.tsx'
import { ConfirmDialog } from '../../ui/ConfirmDialog.tsx'
import { Field } from '../../ui/Field.tsx'
import { Modal } from '../../ui/Modal.tsx'
import { Spinner } from '../../ui/Spinner.tsx'
import { taskFormSchema, toTaskInput, type TaskFormOutput, type TaskFormValues } from './taskForm.ts'

/** Task details as a drawer, opened from anywhere with `?task=<id>`. */
export function TaskDrawer() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('task')
  const taskId = raw && /^\d+$/.test(raw) ? Number(raw) : null
  const close = () =>
    setParams((p) => {
      p.delete('task')
      return p
    })

  return (
    <Modal open={taskId !== null} onClose={close} variant="drawer" size="lg" title="Task details">
      {taskId !== null && <TaskDetails id={taskId} onClose={close} />}
    </Modal>
  )
}

function TaskDetails({ id, onClose }: { id: number; onClose: () => void }) {
  const { data: task, isPending, error } = useTask(id)
  if (isPending) return <div className="center-pad"><Spinner label="Loading task" /></div>
  if (error || !task) {
    return (
      <div className="prose">
        <p>{error instanceof ApiError && error.status === 404 ? 'This task no longer exists. It may have been deleted.' : (error as Error)?.message}</p>
        <Button onClick={onClose}>Close</Button>
      </div>
    )
  }
  return <TaskEditor key={task.id} task={task} onClose={onClose} />
}

function TaskEditor({ task, onClose }: { task: Task; onClose: () => void }) {
  const today = localToday()
  const { data: projects } = useProjects()
  const project = projectById(projects, task.projectId)
  const update = useUpdateTask()
  const remove = useDeleteTask()
  const toast = useUi((s) => s.toast)
  const [confirming, setConfirming] = useState(false)

  const defaults: TaskFormValues = {
    title: task.title,
    projectId: String(task.projectId),
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ?? '',
    labels: task.labels.join(', '),
    description: task.description,
  }
  const { register, handleSubmit, reset, setError, formState: { errors, isDirty, isSubmitting } } = useForm<TaskFormValues, unknown, TaskFormOutput>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: defaults,
  })

  const save = handleSubmit(async (values) => {
    const { projectId: _p, status: _s, ...patch } = toTaskInput(values)
    void _p
    void _s
    try {
      const saved = await update.mutateAsync({ id: task.id, patch })
      reset({
        ...defaults,
        title: saved.title,
        priority: saved.priority,
        dueDate: saved.dueDate ?? '',
        labels: saved.labels.join(', '),
        description: saved.description,
      })
      toast('Changes saved', 'success')
    } catch (err) {
      const fields = err instanceof ApiError ? err.fields : undefined
      if (fields) for (const [k, m] of Object.entries(fields)) setError(k as keyof TaskFormValues, { message: m })
      else setError('root', { message: (err as Error).message })
    }
  })

  const setStatus = (status: Task['status']) =>
    update.mutate(
      { id: task.id, patch: { status } },
      {
        onSuccess: () => toast(status === 'done' ? `Completed “${task.title}”` : `Moved to ${STATUS_LABELS[status]}`, 'success'),
        onError: (e) => toast((e as Error).message, 'error'),
      },
    )

  const doDelete = () =>
    remove.mutate(task.id, {
      onSuccess: () => {
        setConfirming(false)
        onClose()
        toast(`Deleted “${task.title}”`, 'info')
      },
      onError: (e) => toast((e as Error).message, 'error'),
    })

  return (
    <div className="task-detail">
      <div className="task-detail__meta">
        {project && (
          <Link to={`/projects/${project.id}`} className="project-link">
            <LineDot color={project.color} /> {project.name}
          </Link>
        )}
        {task.dueDate && <DueChip due={task.dueDate} today={today} done={task.status === 'done'} />}
      </div>

      <div className="status-switch" role="group" aria-label="Status">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            className={`status-switch__option status--${s}`}
            aria-pressed={task.status === s}
            onClick={() => task.status !== s && setStatus(s)}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <form onSubmit={save} noValidate className="form-grid" aria-label="Edit task">
        <Field label="Title" error={errors.title?.message} className="span-2">
          <input autoComplete="off" {...register('title')} />
        </Field>
        <Field label="Priority">
          <select {...register('priority')}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
          </select>
        </Field>
        <Field label="Due date" error={errors.dueDate?.message}>
          <input type="date" {...register('dueDate')} />
        </Field>
        <Field label="Labels" hint="Separate with commas" error={errors.labels?.message} className="span-2">
          <input autoComplete="off" {...register('labels')} />
        </Field>
        <Field label="Notes" error={errors.description?.message} className="span-2">
          <textarea rows={5} placeholder="Add context, links or acceptance criteria" {...register('description')} />
        </Field>
        {errors.root && <p className="form-error span-2" role="alert">{errors.root.message}</p>}
        <div className="row span-2">
          <Button type="submit" variant="primary" disabled={!isDirty} busy={isSubmitting}>Save changes</Button>
          {isDirty && <Button onClick={() => reset(defaults)}>Discard</Button>}
        </div>
      </form>

      <Checklist task={task} />
      <Comments taskId={task.id} />

      <div className="task-detail__footer">
        <span>Created {timeAgo(task.createdAt)} · Updated {timeAgo(task.updatedAt)}</span>
        <Button variant="ghost" size="sm" icon={<Trash2 size={15} aria-hidden />} onClick={() => setConfirming(true)}>
          Delete task
        </Button>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Delete this task?"
        confirmLabel="Delete task"
        busy={remove.isPending}
        onConfirm={doDelete}
        onCancel={() => setConfirming(false)}
      >
        <p>“{task.title}” and its comments will be removed. This can't be undone.</p>
      </ConfirmDialog>
    </div>
  )
}

function Checklist({ task }: { task: Task }) {
  const update = useUpdateTask()
  const toast = useUi((s) => s.toast)
  const [draft, setDraft] = useState('')
  const inputId = useId()
  const items = task.checklist
  const done = items.filter((i) => i.done).length

  const save = (checklist: ChecklistItem[]) =>
    update.mutate({ id: task.id, patch: { checklist } }, { onError: (e) => toast((e as Error).message, 'error') })

  const add = (e: FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    save([...items, { id: crypto.randomUUID().slice(0, 12), text, done: false }])
    setDraft('')
  }

  return (
    <section className="detail-section" aria-labelledby={`${inputId}-h`}>
      <h3 id={`${inputId}-h`} className="detail-section__title">
        <CheckSquare size={16} aria-hidden /> Checklist
        {items.length > 0 && <span className="muted"> {done} of {items.length}</span>}
      </h3>
      {items.length > 0 && (
        <div className="meter" role="progressbar" aria-label="Checklist progress" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={done}>
          <span style={{ width: `${(done / items.length) * 100}%` }} />
        </div>
      )}
      <ul className="checklist">
        {items.map((item) => (
          <li key={item.id}>
            <label>
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => save(items.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)))}
              />
              <span className={item.done ? 'is-done' : undefined}>{item.text}</span>
            </label>
            <button type="button" className="icon-button icon-button--sm" aria-label={`Remove “${item.text}”`} onClick={() => save(items.filter((i) => i.id !== item.id))}>
              <X size={14} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <form className="inline-form" onSubmit={add}>
        <label htmlFor={inputId} className="sr-only">New checklist item</label>
        <input id={inputId} value={draft} maxLength={120} placeholder="Add an item" onChange={(e) => setDraft(e.target.value)} />
        <Button type="submit" size="sm" icon={<Plus size={15} aria-hidden />} disabled={!draft.trim()}>Add</Button>
      </form>
    </section>
  )
}

function Comments({ taskId }: { taskId: number }) {
  const { user } = useAuth()
  const { data: comments, isPending } = useComments(taskId)
  const add = useAddComment(taskId)
  const remove = useDeleteComment(taskId)
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const inputId = useId()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    add.mutate(body, { onSuccess: () => setBody(''), onError: (err) => setError((err as Error).message) })
  }

  return (
    <section className="detail-section" aria-labelledby={`${inputId}-h`}>
      <h3 id={`${inputId}-h`} className="detail-section__title">
        <MessageSquare size={16} aria-hidden /> Comments
      </h3>
      {isPending ? (
        <Spinner label="Loading comments" />
      ) : comments?.length ? (
        <ol className="comments">
          {comments.map((c) => (
            <li key={c.id}>
              <Avatar name={c.authorName} size={26} />
              <div>
                <p className="comments__meta">
                  <strong>{c.authorName}</strong> <span className="muted">{timeAgo(c.createdAt)}</span>
                </p>
                <p className="comments__body">{c.body}</p>
              </div>
              {c.authorId === user?.id && (
                <button type="button" className="icon-button icon-button--sm" aria-label="Delete comment" onClick={() => remove.mutate(c.id)}>
                  <Trash2 size={14} aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted">No comments yet.</p>
      )}
      <form className="stack-sm" onSubmit={submit}>
        <label htmlFor={inputId} className="sr-only">Write a comment</label>
        <textarea
          id={inputId}
          rows={2}
          value={body}
          maxLength={2000}
          placeholder="Write a comment"
          aria-invalid={error ? true : undefined}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e)
          }}
        />
        {error && <p className="field__error" role="alert">{error}</p>}
        <div className="row">
          <Button type="submit" size="sm" variant="primary" busy={add.isPending} disabled={!body.trim()}>Comment</Button>
          <span className="muted small">Ctrl + Enter to send</span>
        </div>
      </form>
    </section>
  )
}

