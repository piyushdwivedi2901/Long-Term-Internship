import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { PRIORITIES, PRIORITY_LABELS, STATUSES, STATUS_LABELS } from '../../shared/schemas.ts'
import type { Task } from '../../shared/types.ts'
import { projectById, useProjects, useTasks, useUpdateTask } from '../api/hooks.ts'
import { DUE_BUCKET_LABELS, dueBucket, localToday, type DueBucket } from '../lib/dates.ts'
import { useDebounce } from '../lib/useDebounce.ts'
import { useUi } from '../lib/uiStore.ts'
import { DueChip, EmptyState, Label, LineDot, PriorityTag } from '../ui/bits.tsx'
import { PageLoading } from '../ui/Spinner.tsx'

const BUCKETS: DueBucket[] = ['overdue', 'today', 'week', 'later', 'none']
const PRIORITY_RANK = { urgent: 0, high: 1, medium: 2, low: 3 } as const

/** Every task across every project, grouped by when it's due. */
export default function MyTasksPage() {
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('q') ?? '')
  const q = useDebounce(search.trim(), 200)
  const status = params.get('status') ?? ''
  const priority = params.get('priority') ?? ''
  const project = params.get('project') ?? ''
  const due = params.get('due') ?? ''
  const showDone = params.get('done') === '1'
  const today = localToday()

  const { data: projects } = useProjects()
  const tasks = useTasks({
    q: q || undefined,
    status: (status || undefined) as Task['status'] | undefined,
    priority: (priority || undefined) as Task['priority'] | undefined,
    projectId: project ? Number(project) : undefined,
    due: (due || undefined) as 'overdue' | 'week' | 'none' | undefined,
  })
  const update = useUpdateTask()
  const toast = useUi((s) => s.toast)

  const set = (key: string, value: string) =>
    setParams((p) => {
      if (value) p.set(key, value)
      else p.delete(key)
      return p
    }, { replace: true })

  const groups = useMemo(() => {
    const visible = (tasks.data ?? []).filter((t) => showDone || status === 'done' || t.status !== 'done')
    const map = new Map<DueBucket, Task[]>(BUCKETS.map((b) => [b, []]))
    for (const t of visible) map.get(dueBucket(t.dueDate, today, t.status === 'done'))!.push(t)
    for (const list of map.values())
      list.sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '') || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
    return map
  }, [tasks.data, showDone, status, today])

  const total = [...groups.values()].reduce((n, l) => n + l.length, 0)

  const toggleDone = (t: Task) =>
    update.mutate(
      { id: t.id, patch: { status: t.status === 'done' ? 'todo' : 'done' } },
      {
        onSuccess: () =>
          toast(t.status === 'done' ? `Reopened “${t.title}”` : `Completed “${t.title}”`, 'success', {
            label: 'Undo',
            run: () => update.mutate({ id: t.id, patch: { status: t.status } }),
          }),
        onError: (e) => toast(e.message, 'error'),
      },
    )

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1>My tasks</h1>
          <p className="muted">{total} {total === 1 ? 'task' : 'tasks'} across {projects?.length ?? 0} projects</p>
        </div>
      </header>

      <div className="toolbar" role="search">
        <label className="search-field">
          <Search size={16} aria-hidden />
          <span className="sr-only">Search tasks</span>
          <input
            type="search"
            placeholder="Search tasks"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              set('q', e.target.value.trim())
            }}
          />
        </label>
        <label className="select-inline">
          <span className="sr-only">Project</span>
          <select value={project} onChange={(e) => set('project', e.target.value)}>
            <option value="">All projects</option>
            {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="select-inline">
          <span className="sr-only">Status</span>
          <select value={status} onChange={(e) => set('status', e.target.value)}>
            <option value="">Any status</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </label>
        <label className="select-inline">
          <span className="sr-only">Priority</span>
          <select value={priority} onChange={(e) => set('priority', e.target.value)}>
            <option value="">Any priority</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
          </select>
        </label>
        <label className="select-inline">
          <span className="sr-only">Due</span>
          <select value={due} onChange={(e) => set('due', e.target.value)}>
            <option value="">Any due date</option>
            <option value="overdue">Overdue</option>
            <option value="week">Due in 7 days</option>
            <option value="none">No due date</option>
          </select>
        </label>
        <label className="check-inline">
          <input type="checkbox" checked={showDone} onChange={(e) => set('done', e.target.checked ? '1' : '')} />
          Show completed
        </label>
      </div>

      {tasks.isPending ? (
        <PageLoading label="Loading tasks" />
      ) : total === 0 ? (
        <EmptyState title="Nothing here">
          {q || status || priority || project || due ? 'No tasks match these filters.' : 'Tasks you add to any project appear here.'}
        </EmptyState>
      ) : (
        BUCKETS.map((bucket) => {
          const list = groups.get(bucket)!
          if (!list.length) return null
          return (
            <section key={bucket} className="bucket" aria-labelledby={`b-${bucket}`}>
              <h2 id={`b-${bucket}`} className={`bucket__title bucket--${bucket}`}>
                {DUE_BUCKET_LABELS[bucket]} <span className="muted">{list.length}</span>
              </h2>
              <ul className="task-table">
                <AnimatePresence initial={false}>
                  {list.map((t) => {
                    const p = projectById(projects, t.projectId)
                    return (
                      <motion.li key={t.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className={t.status === 'done' ? 'is-done' : undefined}>
                        <input
                          type="checkbox"
                          className="task-table__check"
                          checked={t.status === 'done'}
                          aria-label={t.status === 'done' ? `Reopen “${t.title}”` : `Complete “${t.title}”`}
                          onChange={() => toggleDone(t)}
                        />
                        <button type="button" className="task-table__title" onClick={() => set('task', String(t.id))}>
                          {t.title}
                        </button>
                        <span className="task-table__labels">{t.labels.slice(0, 2).map((l) => <Label key={l}>{l}</Label>)}</span>
                        <span className="task-table__project">{p && <><LineDot color={p.color} /> {p.name}</>}</span>
                        <span className="task-table__status">{STATUS_LABELS[t.status]}</span>
                        <PriorityTag priority={t.priority} compact />
                        <span className="task-table__due">{t.dueDate ? <DueChip due={t.dueDate} today={today} done={t.status === 'done'} /> : <span className="muted small">—</span>}</span>
                      </motion.li>
                    )
                  })}
                </AnimatePresence>
              </ul>
            </section>
          )
        })
      )}
    </div>
  )
}
