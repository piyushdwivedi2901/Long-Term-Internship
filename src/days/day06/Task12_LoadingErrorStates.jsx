import { useCallback, useEffect, useState } from 'react'
import { RotateCw } from 'lucide-react'

/**
 * Day 6 — Task 12: Loading & Error States
 * Goal: Add spinners/error messages while fetching data, with a retry option.
 * Uses an endpoint that fails ~40% of the time to demonstrate real error handling.
 *
 * Extended: an attempt log with a running success-rate stat, so the
 * loading/error/success cycle is visibly exercised rather than a single
 * one-off request.
 */
export default function Task12_LoadingErrorStates() {
  const [status, setStatus] = useState('loading')
  const [todo, setTodo] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [log, setLog] = useState([])

  const load = useCallback(() => {
    setStatus('loading')
    const forceFail = Math.random() < 0.4
    const id = forceFail ? 999999 : Math.ceil(Math.random() * 200)

    fetch(`https://jsonplaceholder.typicode.com/todos/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found')
        return res.json()
      })
      .then((data) => {
        setTodo(data)
        setStatus('success')
        setLog((l) => [{ ok: true, t: Date.now() }, ...l].slice(0, 8))
      })
      .catch(() => {
        setStatus('error')
        setLog((l) => [{ ok: false, t: Date.now() }, ...l].slice(0, 8))
      })
  }, [])

  useEffect(() => {
    load()
  }, [load, attempt])

  const successRate = log.length ? Math.round((log.filter((l) => l.ok).length / log.length) * 100) : null

  return (
    <div className="task-section">
      <p className="task-eyebrow">Loading &amp; Error States</p>
      <h2>Loading &amp; Error States</h2>
      <p className="task-goal">A request that fails about 40% of the time on purpose, so the loading spinner, error message, and retry button all get real exercise.</p>

      {status === 'loading' && (
        <div className="spinner" role="status" aria-label="Loading">
          <div className="spinner-circle" />
          <span>Loading todo…</span>
        </div>
      )}

      {status === 'error' && (
        <div className="error-box">
          <p className="error-text" style={{ margin: 0 }}>Couldn't fetch that todo.</p>
          <button onClick={() => setAttempt((a) => a + 1)}><RotateCw size={13} className="icon-inline" />Retry</button>
        </div>
      )}

      {status === 'success' && todo && (
        <div className="card" style={{ maxWidth: 380 }}>
          <p><strong>#{todo.id}</strong> {todo.title}</p>
          <p>{todo.completed ? '✅ Completed' : '⏳ Not completed'}</p>
          <button className="primary" onClick={() => setAttempt((a) => a + 1)}>Load another</button>
        </div>
      )}

      {log.length > 0 && (
        <>
          <hr className="section-divider" />
          <div className="toolbar" style={{ marginBottom: 8 }}>
            <p className="task-eyebrow" style={{ margin: 0 }}>Attempt log</p>
            {successRate !== null && <span className="result-count">{successRate}% success over last {log.length}</span>}
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            {log.map((l) => (
              <span
                key={l.t}
                title={l.ok ? 'Success' : 'Failed'}
                style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: l.ok ? 'var(--done)' : 'var(--danger)',
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
