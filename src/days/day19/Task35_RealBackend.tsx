import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Database, RefreshCw, Server, Trash2 } from 'lucide-react'
import { getApi, type Api, type Todo } from '../../api'

/**
 * Task 35 — Real backend
 * The todo list from Task 24 (in-memory Zustand) now persists to a database:
 * Express + SQLite (`server/`) when `VITE_API_URL` is set, or an in-browser
 * stand-in with the identical interface on the static GitHub Pages site.
 *
 * Writes are optimistic where it is safe (toggle / delete) and roll back with
 * a visible error if the server rejects them.
 */
interface Props {
  /** Injected in tests; defaults to the app-wide client. */
  api?: Api
}

type Status = 'loading' | 'ready' | 'error'

function TodoApp({ api }: { api: Api }) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [draft, setDraft] = useState('')
  const [adding, setAdding] = useState(false)

  const load = useCallback(() => {
    let cancelled = false
    setStatus('loading')
    api.todos
      .list()
      .then((list) => {
        if (cancelled) return
        setTodos(list)
        setStatus('ready')
      })
      .catch((err: Error) => {
        if (cancelled) return
        setLoadError(err.message || 'Could not reach the server')
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [api])

  useEffect(() => load(), [load])

  const add = async (e: FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || adding) return
    setAdding(true)
    setActionError('')
    try {
      const created = await api.todos.create(text)
      setTodos((prev) => [...prev, created])
      setDraft('')
    } catch (err) {
      setActionError(`Couldn't add the todo: ${(err as Error).message}`)
    } finally {
      setAdding(false)
    }
  }

  const toggle = async (todo: Todo) => {
    setActionError('')
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t)))
    try {
      await api.todos.update(todo.id, { done: !todo.done })
    } catch (err) {
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? todo : t))) // roll back
      setActionError(`Couldn't update "${todo.text}": ${(err as Error).message}`)
    }
  }

  const remove = async (todo: Todo) => {
    setActionError('')
    const before = todos
    setTodos((prev) => prev.filter((t) => t.id !== todo.id))
    try {
      await api.todos.remove(todo.id)
    } catch (err) {
      setTodos(before) // roll back
      setActionError(`Couldn't delete "${todo.text}": ${(err as Error).message}`)
    }
  }

  if (status === 'loading') return <p className="empty-state" role="status">Loading todos…</p>
  if (status === 'error') {
    return (
      <div role="alert">
        <p className="field-error">Couldn't load todos: {loadError}</p>
        <button type="button" onClick={load}>Retry</button>
      </div>
    )
  }

  const remaining = todos.filter((t) => !t.done).length

  return (
    <>
      <form onSubmit={add} className="toolbar">
        <input
          className="search-input"
          aria-label="New todo"
          placeholder="What needs doing?"
          value={draft}
          maxLength={200}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className="primary" disabled={adding || !draft.trim()}>
          {adding ? 'Saving…' : 'Add'}
        </button>
      </form>

      {actionError && <p className="field-error" role="alert">{actionError}</p>}

      {todos.length === 0 ? (
        <p className="empty-state">Nothing here yet — add your first todo.</p>
      ) : (
        <ul className="todo-list">
          {todos.map((t) => (
            <li key={t.id} className={t.done ? 'done' : ''}>
              <label>
                <input type="checkbox" checked={t.done} onChange={() => toggle(t)} /> {t.text}
              </label>
              <button type="button" className="icon-btn" aria-label={`Delete ${t.text}`} onClick={() => remove(t)}>
                <Trash2 size={13} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="todo-footer">{remaining} remaining · {todos.length} total</p>
    </>
  )
}

export default function Task35_RealBackend({ api = getApi() }: Props) {
  // Bumping `session` remounts the app, which re-fetches from storage — the
  // same thing a browser refresh does — proving the data is really persisted.
  const [session, setSession] = useState(0)

  return (
    <div className="task-section">
      <p className="task-eyebrow">Full stack</p>
      <h2>Real Backend</h2>
      <p className="task-goal">
        Todos are stored in a database instead of component state. Add some, then press
        “Reload from storage” (or refresh the page) — they are still there.
      </p>

      <p className="hint" data-testid="t35-mode">
        {api.mode === 'server' ? (
          <><Server size={13} className="icon-inline" aria-hidden="true" />Connected to the Express + SQLite API.</>
        ) : (
          <><Database size={13} className="icon-inline" aria-hidden="true" />
            Demo mode — data lives in this browser. Run <code>npm run server</code> and set <code>VITE_API_URL</code> to use the real SQLite backend.</>
        )}
      </p>

      <TodoApp key={session} api={api} />

      <p>
        <button type="button" onClick={() => setSession((s) => s + 1)}>
          <RefreshCw size={13} className="icon-inline" aria-hidden="true" />Reload from storage
        </button>
      </p>
    </div>
  )
}
