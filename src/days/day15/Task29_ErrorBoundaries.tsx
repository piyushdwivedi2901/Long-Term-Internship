import { useEffect, useState } from 'react'
import { Bomb, Clock, FileJson, ShieldAlert } from 'lucide-react'
import { ErrorBoundary } from '../../components/ErrorBoundary'

/**
 * Day 15 — Task 29: Error Boundaries
 * Goal: Build an <ErrorBoundary>, wrap 2-3 components, and force one to
 * throw to see the fallback.
 *
 * Three independent widgets, each in its own boundary. Crashing one shows
 * that boundary's fallback while the other two keep running.
 */
interface CaughtError {
  widget: string
  message: string
  at: string
}

function ClockWidget() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return <p className="counter-value" style={{ fontSize: '1.5rem', margin: 0 }}>{now.toLocaleTimeString()}</p>
}

/** Throws during render once the count passes `limit` — a render-time bug. */
function FragileCounter({ limit }: { limit: number }) {
  const [count, setCount] = useState(0)
  if (count > limit) throw new Error(`Counter exceeded its limit of ${limit}`)
  return (
    <div>
      <p className="counter-value" style={{ fontSize: '1.5rem', margin: '0 0 8px' }}>{count}</p>
      <button onClick={() => setCount((c) => c + 1)}>
        Increment <span className="hint">(crashes above {limit})</span>
      </button>
    </div>
  )
}

/** Parses user-supplied JSON in render — bad input throws a SyntaxError. */
function JsonPreview({ source }: { source: string }) {
  const parsed: unknown = JSON.parse(source)
  return <pre className="code-block" style={{ margin: 0 }}>{JSON.stringify(parsed, null, 2)}</pre>
}

export default function Task29_ErrorBoundaries() {
  const [caught, setCaught] = useState<CaughtError[]>([])
  const [json, setJson] = useState('{ "valid": true }')

  const report = (widget: string) => (error: Error) =>
    setCaught((c) => [{ widget, message: error.message, at: new Date().toLocaleTimeString() }, ...c].slice(0, 5))

  return (
    <div className="task-section">
      <p className="task-eyebrow">Resilience</p>
      <h2>Error Boundaries</h2>
      <p className="task-goal">
        One <code>&lt;ErrorBoundary&gt;</code> class component wrapped around three independent widgets.
        Break one and only its fallback appears — the rest of the page keeps working.
      </p>

      <div className="split-layout" style={{ gap: 16 }}>
        <section className="card" style={{ minWidth: 220 }} aria-label="Clock widget">
          <h4><Clock size={14} className="icon-inline" />Clock</h4>
          <ErrorBoundary name="Clock" onError={report('Clock')}>
            <ClockWidget />
          </ErrorBoundary>
          <p className="hint" style={{ marginTop: 10 }}>Keeps ticking while others crash.</p>
        </section>

        <section className="card" style={{ minWidth: 240 }} aria-label="Fragile counter widget">
          <h4><Bomb size={14} className="icon-inline" />Fragile counter</h4>
          <ErrorBoundary name="Counter" onError={report('Counter')}>
            <FragileCounter limit={2} />
          </ErrorBoundary>
        </section>

        <section className="card" style={{ minWidth: 260 }} aria-label="JSON preview widget">
          <h4><FileJson size={14} className="icon-inline" />JSON preview</h4>
          <label htmlFor="t29-json" className="hint">Edit to something invalid, e.g. <code>{'{ oops'}</code></label>
          <textarea
            id="t29-json"
            value={json}
            onChange={(e) => setJson(e.target.value)}
            rows={2}
            style={{ width: '100%', margin: '6px 0 10px' }}
          />
          {/* resetKeys: fixing the input clears the error automatically */}
          <ErrorBoundary name="JSON preview" resetKeys={[json]} onError={report('JSON preview')}>
            <JsonPreview source={json} />
          </ErrorBoundary>
        </section>
      </div>

      <hr className="section-divider" />
      <p className="task-eyebrow"><ShieldAlert size={12} className="icon-inline" />Errors reported via onError</p>
      {caught.length === 0 ? (
        <p className="empty-state" style={{ maxWidth: 420 }}>Nothing has crashed yet.</p>
      ) : (
        <ul className="todo-list" style={{ maxWidth: 520 }}>
          {caught.map((c, i) => (
            <li key={`${c.at}-${i}`}>
              <span><strong>{c.widget}</strong> <span className="hint">{c.message}</span></span>
              <span className="hint">{c.at}</span>
            </li>
          ))}
        </ul>
      )}

      <pre className="code-block">{`// Catches: render, lifecycle and constructor errors below the boundary.
// Does NOT catch: event handlers, async callbacks, or the boundary itself.

<ErrorBoundary name="JSON preview" resetKeys={[json]} onError={report}>
  <JsonPreview source={json} />
</ErrorBoundary>`}</pre>
    </div>
  )
}
