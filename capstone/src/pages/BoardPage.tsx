import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Columns3, List, Pencil, Plus, Search } from 'lucide-react'
import { PRIORITIES, PRIORITY_LABELS, STATUSES, STATUS_LABELS } from '../../shared/schemas.ts'
import type { Priority, Status } from '../../shared/types.ts'
import { useMoveTask, useProject, useTasks } from '../api/hooks.ts'
import { ApiError } from '../api/types.ts'
import { Board } from '../features/board/Board.tsx'
import { ProjectDialog } from '../features/projects/ProjectDialog.tsx'
import { localToday } from '../lib/dates.ts'
import { useDebounce } from '../lib/useDebounce.ts'
import { useUi } from '../lib/uiStore.ts'
import { DueChip, EmptyState, LineDot, PriorityTag } from '../ui/bits.tsx'
import { Button } from '../ui/Button.tsx'
import { PageLoading } from '../ui/Spinner.tsx'
import NotFoundPage from './NotFoundPage.tsx'

export default function BoardPage() {
  const projectId = Number(useParams().projectId)
  const [params, setParams] = useSearchParams()
  const view = params.get('view') === 'list' ? 'list' : 'board'
  const priority = (params.get('priority') ?? '') as Priority | ''
  const [search, setSearch] = useState(params.get('q') ?? '')
  const q = useDebounce(search.trim(), 200)
  const [editing, setEditing] = useState(false)

  const project = useProject(projectId)
  const tasks = useTasks({ projectId, q: q || undefined, priority: priority || undefined })
  const move = useMoveTask()
  const openNewTask = useUi((s) => s.openNewTask)
  const toast = useUi((s) => s.toast)
  const today = localToday()

  const setParam = (key: string, value: string) =>
    setParams((p) => {
      if (value) p.set(key, value)
      else p.delete(key)
      return p
    }, { replace: true })

  if (!Number.isInteger(projectId) || (project.error instanceof ApiError && project.error.status === 404)) return <NotFoundPage what="project" />
  if (project.isPending || tasks.isPending) return <PageLoading label="Loading board" />
  if (project.error) return <p className="form-error" role="alert">{project.error.message}</p>

  const p = project.data
  const list = tasks.data ?? []
  const filtered = Boolean(q || priority)
  const openTask = (id: number) => setParam('task', String(id))

  return (
    <div className={`page page--board line--${p.color}`}>
      <header className="page__header">
        <div>
          <p className="breadcrumb"><Link to="/projects">Projects</Link></p>
          <h1 className="with-dot"><LineDot color={p.color} size={14} /> {p.name}</h1>
          {p.description && <p className="muted">{p.description}</p>}
        </div>
        <div className="row">
          <Button icon={<Pencil size={16} aria-hidden />} onClick={() => setEditing(true)}>Edit</Button>
          <Button variant="primary" icon={<Plus size={16} aria-hidden />} onClick={() => openNewTask({ projectId })}>Add task</Button>
        </div>
      </header>

      <div className="toolbar" role="search">
        <label className="search-field">
          <Search size={16} aria-hidden />
          <span className="sr-only">Filter tasks</span>
          <input
            type="search"
            placeholder="Filter by title, notes or label"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setParam('q', e.target.value.trim())
            }}
          />
        </label>
        <label className="select-inline">
          <span className="sr-only">Priority</span>
          <select value={priority} onChange={(e) => setParam('priority', e.target.value)}>
            <option value="">Any priority</option>
            {PRIORITIES.map((pr) => <option key={pr} value={pr}>{PRIORITY_LABELS[pr]}</option>)}
          </select>
        </label>
        <div className="segmented" role="group" aria-label="View">
          <button type="button" aria-pressed={view === 'board'} onClick={() => setParam('view', '')}>
            <Columns3 size={16} aria-hidden /> Board
          </button>
          <button type="button" aria-pressed={view === 'list'} onClick={() => setParam('view', 'list')}>
            <List size={16} aria-hidden /> List
          </button>
        </div>
        {filtered && (
          <p className="muted small" role="status">
            Showing {list.length} matching {list.length === 1 ? 'task' : 'tasks'} · clear filters to reorder
          </p>
        )}
      </div>

      {list.length === 0 && !filtered ? (
        <EmptyState title="This line has no stops yet" action={<Button variant="primary" onClick={() => openNewTask({ projectId })}>Add the first task</Button>}>
          Add tasks, then drag them from To do to Done as work moves along.
        </EmptyState>
      ) : view === 'board' ? (
        <Board
          tasks={list}
          today={today}
          reorderDisabled={filtered}
          onOpen={openTask}
          onAdd={(status: Status) => openNewTask({ projectId, status })}
          onMove={(id, status, index) =>
            move.mutate(
              { id, input: { status, index } },
              { onError: (e) => toast(`Couldn't move the task: ${e.message}`, 'error') },
            )
          }
        />
      ) : (
        <div className="list-view">
          {STATUSES.map((s) => {
            const rows = list.filter((t) => t.status === s)
            if (!rows.length) return null
            return (
              <section key={s} aria-labelledby={`lv-${s}`}>
                <h2 id={`lv-${s}`} className={`list-view__heading status--${s}`}>
                  {STATUS_LABELS[s]} <span className="muted">{rows.length}</span>
                </h2>
                <ul className="task-rows">
                  {rows.map((t) => (
                    <li key={t.id}>
                      <button type="button" className="task-row" onClick={() => openTask(t.id)}>
                        <span className="task-row__title">{t.title}</span>
                        <PriorityTag priority={t.priority} compact />
                        {t.dueDate && <DueChip due={t.dueDate} today={today} done={t.status === 'done'} />}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
          {list.length === 0 && <p className="muted">No tasks match these filters.</p>}
        </div>
      )}

      <ProjectDialog open={editing} project={p} onClose={() => setEditing(false)} />
    </div>
  )
}
