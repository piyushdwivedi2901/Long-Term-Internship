import { useCallback, useEffect, useState } from 'react'

/**
 * Day 6 — Task 12: Loading & Error States
 * Goal: Add spinners/error messages while fetching data, with a retry option.
 * Uses an endpoint that fails ~40% of the time to demonstrate real error handling.
 */
export default function Task12_LoadingErrorStates() {
  const [status, setStatus] = useState('loading')
  const [todo, setTodo] = useState(null)
  const [attempt, setAttempt] = useState(0)

  const load = useCallback(() => {
    setStatus('loading')
    // Randomly pick an id; occasionally hit a bad id to trigger a real error path.
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
      })
      .catch(() => setStatus('error'))
  }, [])

  useEffect(() => {
    load()
  }, [load, attempt])

  return (
    <div className="task-section">
      <h2>Task 12: Loading & Error States</h2>

      {status === 'loading' && (
        <div className="spinner" role="status" aria-label="Loading">
          <div className="spinner-circle" />
          <span>Loading todo…</span>
        </div>
      )}

      {status === 'error' && (
        <div className="error-box">
          <p className="error-text">Something went wrong fetching the todo.</p>
          <button onClick={() => setAttempt((a) => a + 1)}>Retry</button>
        </div>
      )}

      {status === 'success' && todo && (
        <div className="card">
          <p><strong>#{todo.id}</strong> {todo.title}</p>
          <p>{todo.completed ? '✅ Completed' : '⏳ Not completed'}</p>
          <button onClick={() => setAttempt((a) => a + 1)}>Load another</button>
        </div>
      )}
    </div>
  )
}
