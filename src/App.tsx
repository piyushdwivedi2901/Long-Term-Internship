import { Suspense, useEffect, useState } from 'react'
import { DayNav } from './components/DayNav'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ROADMAP_TOTAL, allTasks, findTask, taskRegistry } from './registry'

const hashToId = () => window.location.hash.replace(/^#\//, '')

/** Resolve the task for the current URL hash, falling back to task 1. */
function initialId(): string {
  const id = hashToId()
  return findTask(id) ? id : allTasks[0].id
}

export default function App() {
  const [activeId, setActiveId] = useState(initialId)

  // Deep links: `#/d4-t8` opens task 8, and back/forward keep working.
  useEffect(() => {
    const onHash = () => setActiveId(initialId())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const select = (id: string) => {
    setActiveId(id)
    if (hashToId() !== id) window.history.pushState(null, '', `#/${id}`)
  }

  const active = findTask(activeId) ?? allTasks[0]
  const activeDay = taskRegistry.find((d) => d.tasks.some((t) => t.id === active.id))!
  const ActiveComponent = active.Component
  const done = allTasks.length
  const pct = Math.round((done / ROADMAP_TOTAL) * 100)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <p className="sidebar-eyebrow">react / practice-log</p>
          <h1 className="sidebar-title">Long Term Internship</h1>
          <p className="sidebar-subtitle">{ROADMAP_TOTAL} tasks, one commit per day</p>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="Internship progress"
            aria-valuemin={0}
            aria-valuemax={ROADMAP_TOTAL}
            aria-valuenow={done}
          >
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <p className="progress-label">
            {done} / {ROADMAP_TOTAL} tasks complete
          </p>
          <a className="capstone-link" href={`${import.meta.env.BASE_URL}flowboard/`}>
            <span className="capstone-link__kicker">Capstone project</span>
            <span className="capstone-link__name">Open Flowboard</span>
          </a>
          <a className="capstone-link" href={`${import.meta.env.BASE_URL}fairshare/`}>
            <span className="capstone-link__kicker">Project</span>
            <span className="capstone-link__name">Open Fairshare</span>
          </a>
          <a className="capstone-link" href={`${import.meta.env.BASE_URL}covered/`}>
            <span className="capstone-link__kicker">Project</span>
            <span className="capstone-link__name">Open Covered</span>
          </a>
        </div>

        <DayNav value={active.id} onValueChange={select} aria-label="Internship tasks">
          {taskRegistry.map((day) => (
            <DayNav.Day key={day.day} label={day.label} active={day.day === activeDay.day}>
              {day.tasks.map((t) => (
                <DayNav.Item key={t.id} id={t.id} num={t.num} title={t.title} onPrefetch={t.preload} />
              ))}
            </DayNav.Day>
          ))}
        </DayNav>
      </aside>

      <div className="content-wrap">
        <div className="content-header">
          <span>{activeDay.label}</span>
          <span className="crumb-sep">/</span>
          <span className="crumb-current">
            Task {String(active.num).padStart(2, '0')} · {active.title}
          </span>
        </div>
        <main className="content" id="main">
          {/* Each task is a separate chunk: show a skeleton while it loads, and a
              recoverable error (e.g. offline / stale deploy) if the chunk fails. */}
          <ErrorBoundary name={`Task ${active.num}`} resetKeys={[active.id]}>
            <Suspense fallback={<p className="empty-state" role="status">Loading task…</p>}>
              <ActiveComponent />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
