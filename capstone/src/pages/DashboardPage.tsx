import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Sparkles } from 'lucide-react'
import { STATUSES, STATUS_LABELS } from '../../shared/schemas.ts'
import type { Stats, Task } from '../../shared/types.ts'
import { projectById, useActivity, useProjects, useSeedSample, useStats, useTasks } from '../api/hooks.ts'
import { useAuth } from '../auth/AuthContext.tsx'
import { formatDay, formatLongToday, localToday, timeAgo } from '../lib/dates.ts'
import { useUi } from '../lib/uiStore.ts'
import { DueChip, EmptyState, LineDot, PriorityTag } from '../ui/bits.tsx'
import { Button } from '../ui/Button.tsx'
import { PageLoading } from '../ui/Spinner.tsx'

function greeting(now = new Date()) {
  const h = now.getHours()
  return h < 5 ? 'Working late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export default function DashboardPage() {
  const { user } = useAuth()
  const stats = useStats()
  const { data: projects } = useProjects()
  const seed = useSeedSample()
  const setNewProjectOpen = useUi((s) => s.setNewProjectOpen)
  const toast = useUi((s) => s.toast)

  if (stats.isPending) return <PageLoading label="Loading dashboard" />
  if (stats.error) return <p className="form-error" role="alert">{(stats.error as Error).message}</p>
  const s = stats.data
  const firstName = user?.name.split(' ')[0] ?? ''

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1>{greeting()}, {firstName}</h1>
          <p className="muted">{formatLongToday()}</p>
        </div>
      </header>

      {projects && projects.length === 0 ? (
        <EmptyState
          title="Start your first line"
          action={
            <div className="row">
              <Button variant="primary" icon={<Plus size={16} aria-hidden />} onClick={() => setNewProjectOpen(true)}>
                New project
              </Button>
              <Button
                icon={<Sparkles size={16} aria-hidden />}
                busy={seed.isPending}
                onClick={() => seed.mutate(undefined, { onSuccess: () => toast('Sample workspace added', 'success') })}
              >
                Load a sample workspace
              </Button>
            </div>
          }
        >
          A project is a line; its tasks travel from To do to Done. Create one, or load three sample projects to look around.
        </EmptyState>
      ) : (
        <>
          <Summary s={s} />
          <div className="dash-grid">
            <section className="panel panel--wide" aria-labelledby="lines-h">
              <h2 id="lines-h" className="panel__title">Lines</h2>
              <LineMap s={s} />
            </section>
            <section className="panel" aria-labelledby="attention-h">
              <h2 id="attention-h" className="panel__title">Needs attention</h2>
              <Attention />
            </section>
            <section className="panel" aria-labelledby="done-h">
              <h2 id="done-h" className="panel__title">Completed in the last 14 days</h2>
              <CompletedChart days={s.completedByDay} />
            </section>
            <section className="panel" aria-labelledby="activity-h">
              <h2 id="activity-h" className="panel__title">Recent activity</h2>
              <ActivityFeed />
            </section>
          </div>
        </>
      )}
    </div>
  )
}

function Summary({ s }: { s: Stats }) {
  const open = s.total - s.counts.done
  const parts = [
    `${open} open ${open === 1 ? 'task' : 'tasks'}`,
    s.dueThisWeek ? `${s.dueThisWeek} due in the next 7 days` : null,
    s.overdue ? `${s.overdue} overdue` : null,
  ].filter(Boolean)
  return (
    <p className="summary">
      {parts.join(', ')}. {s.total > 0 && <>You've finished {Math.round(s.completionRate * 100)}% of everything on your lines.</>}{' '}
      {s.overdue > 0 && <Link to="/tasks?due=overdue">Review overdue tasks</Link>}
    </p>
  )
}

/** The signature view: each project drawn as a transit line with four stations. */
function LineMap({ s }: { s: Stats }) {
  return (
    <ol className="linemap">
      {s.projects.map((p) => {
        const progress = p.total ? p.counts.done / p.total : 0
        return (
          <li key={p.id} className={`linemap__row line--${p.color}`}>
            <Link to={`/projects/${p.id}`} className="linemap__name">
              {p.name}
              <span className="muted small">{p.total ? `${Math.round(progress * 100)}% done` : 'No tasks yet'}</span>
            </Link>
            <div className="linemap__track" role="img" aria-label={`${p.name}: ${STATUSES.map((st) => `${p.counts[st]} ${STATUS_LABELS[st].toLowerCase()}`).join(', ')}`}>
              <span className="linemap__rail" />
              <span className="linemap__fill" style={{ width: `${progress * 100}%` }} />
              {STATUSES.map((st, i) => (
                <span key={st} className={`linemap__station${p.counts[st] ? ' has-tasks' : ''}`} style={{ left: `${(i / 3) * 100}%` }}>
                  <span className="linemap__dot" />
                  <span className="linemap__label">
                    <strong>{p.counts[st]}</strong> {STATUS_LABELS[st]}
                  </span>
                </span>
              ))}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function Attention() {
  const today = localToday()
  const overdue = useTasks({ due: 'overdue' })
  const week = useTasks({ due: 'week' })
  const { data: projects } = useProjects()
  const [, setParams] = useSearchParams()
  if (overdue.isPending || week.isPending) return <PageLoading />
  const list: Task[] = [...(overdue.data ?? []), ...(week.data ?? []).filter((t) => t.status !== 'done')]
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
    .slice(0, 7)
  if (!list.length) return <p className="muted">Nothing is due in the next 7 days.</p>
  return (
    <ul className="task-rows">
      {list.map((t) => {
        const p = projectById(projects, t.projectId)
        return (
          <li key={t.id}>
            <button type="button" className="task-row" onClick={() => setParams({ task: String(t.id) })}>
              {p && <LineDot color={p.color} />}
              <span className="task-row__title">{t.title}</span>
              <PriorityTag priority={t.priority} compact />
              {t.dueDate && <DueChip due={t.dueDate} today={today} />}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function CompletedChart({ days }: { days: Stats['completedByDay'] }) {
  const max = Math.max(1, ...days.map((d) => d.count))
  const total = days.reduce((n, d) => n + d.count, 0)
  const W = 14 * 22
  const H = 96
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H + 18}`} role="img" aria-label={`${total} tasks completed in the last 14 days`}>
        <line x1="0" x2={W} y1={H} y2={H} className="chart__axis" />
        {days.map((d, i) => {
          const h = (d.count / max) * (H - 8)
          return (
            <g key={d.date}>
              <rect x={i * 22 + 4} y={H - h} width="14" height={Math.max(h, d.count ? 2 : 0)} rx="3" className="chart__bar">
                <title>{`${formatDay(d.date)}: ${d.count} completed`}</title>
              </rect>
              {(i === 0 || i === 13) && (
                <text x={i === 0 ? 0 : W} y={H + 14} textAnchor={i === 0 ? 'start' : 'end'} className="chart__tick">{i === 13 ? 'Today' : formatDay(d.date)}</text>
              )}
            </g>
          )
        })}
      </svg>
      <figcaption className="muted small">{total} completed · best day {max > 1 || total ? max : 0}</figcaption>
    </figure>
  )
}

function ActivityFeed() {
  const { data, isPending } = useActivity(8)
  const { data: projects } = useProjects()
  if (isPending) return <PageLoading />
  if (!data?.length) return <p className="muted">Changes you make will show up here.</p>
  return (
    <ol className="feed">
      {data.map((a) => {
        const p = a.projectId ? projectById(projects, a.projectId) : undefined
        return (
          <li key={a.id}>
            {p ? <LineDot color={p.color} size={8} /> : <span className="feed__dot" aria-hidden />}
            <span className="feed__text">{a.summary}</span>
            <time dateTime={a.createdAt} className="muted small">{timeAgo(a.createdAt)}</time>
          </li>
        )
      })}
    </ol>
  )
}
