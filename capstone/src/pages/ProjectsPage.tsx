import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { STATUSES, STATUS_LABELS } from '../../shared/schemas.ts'
import type { Project } from '../../shared/types.ts'
import { useDeleteProject, useProjects } from '../api/hooks.ts'
import { ProjectDialog } from '../features/projects/ProjectDialog.tsx'
import { useUi } from '../lib/uiStore.ts'
import { EmptyState, LineDot } from '../ui/bits.tsx'
import { Button } from '../ui/Button.tsx'
import { ConfirmDialog } from '../ui/ConfirmDialog.tsx'
import { PageLoading } from '../ui/Spinner.tsx'

export default function ProjectsPage() {
  const { data: projects, isPending, error } = useProjects()
  const setNewProjectOpen = useUi((s) => s.setNewProjectOpen)
  const toast = useUi((s) => s.toast)
  const remove = useDeleteProject()
  const [editing, setEditing] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState<Project | null>(null)

  if (isPending) return <PageLoading label="Loading projects" />
  if (error) return <p className="form-error" role="alert">{error.message}</p>

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1>Projects</h1>
          <p className="muted">{projects.length} {projects.length === 1 ? 'line' : 'lines'}</p>
        </div>
        <Button variant="primary" icon={<Plus size={16} aria-hidden />} onClick={() => setNewProjectOpen(true)}>New project</Button>
      </header>

      {projects.length === 0 ? (
        <EmptyState title="No projects yet" action={<Button variant="primary" onClick={() => setNewProjectOpen(true)}>Create a project</Button>}>
          Projects group related tasks — a launch, a course, a side project.
        </EmptyState>
      ) : (
        <ul className="project-list">
          {projects.map((p) => {
            const total = STATUSES.reduce((n, s) => n + p.counts[s], 0)
            const pct = total ? Math.round((p.counts.done / total) * 100) : 0
            return (
              <li key={p.id} className={`project-row line--${p.color}`}>
                <div className="project-row__main">
                  <h2 className="project-row__name">
                    <LineDot color={p.color} size={12} />
                    <Link to={`/projects/${p.id}`}>{p.name}</Link>
                  </h2>
                  {p.description && <p className="muted">{p.description}</p>}
                  <dl className="project-row__counts">
                    {STATUSES.map((s) => (
                      <div key={s}>
                        <dt>{STATUS_LABELS[s]}</dt>
                        <dd>{p.counts[s]}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div className="project-row__progress">
                  <div className="meter meter--line" role="progressbar" aria-label={`${p.name} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <span className="small muted">{pct}% done</span>
                </div>
                <div className="project-row__actions">
                  <button type="button" className="icon-button" aria-label={`Edit ${p.name}`} onClick={() => setEditing(p)}>
                    <Pencil size={16} aria-hidden />
                  </button>
                  <button type="button" className="icon-button" aria-label={`Delete ${p.name}`} onClick={() => setDeleting(p)}>
                    <Trash2 size={16} aria-hidden />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ProjectDialog open={!!editing} project={editing ?? undefined} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!deleting}
        title={`Delete “${deleting?.name}”?`}
        confirmLabel="Delete project"
        busy={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() =>
          remove.mutate(deleting!.id, {
            onSuccess: () => {
              toast(`Deleted “${deleting!.name}”`)
              setDeleting(null)
            },
            onError: (e) => toast(e.message, 'error'),
          })
        }
      >
        <p>This removes the project and all of its tasks and comments. This can't be undone.</p>
      </ConfirmDialog>
    </div>
  )
}
