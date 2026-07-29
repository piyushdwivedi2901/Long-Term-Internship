import { useMemo, useState } from 'react'
import { Trash2, ListTodo } from 'lucide-react'

/**
 * Day 4 — Task 8: To-Do List
 * Goal: Add, delete, and mark tasks complete.
 * Covers immutable array state updates (adding/removing items).
 *
 * Extended: a priority tag per task, filter tabs (All / Active / Done),
 * and a completion progress bar — the underlying add/toggle/delete logic
 * is the same immutable-array pattern, just applied to richer objects.
 */
let nextId = 4

const PRIORITIES = ['low', 'medium', 'high']

export default function Task8_TodoList() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Finish React basics', done: true, priority: 'medium' },
    { id: 2, text: 'Practice hooks', done: false, priority: 'high' },
    { id: 3, text: 'Build a mini project', done: false, priority: 'low' },
  ])
  const [input, setInput] = useState('')
  const [priority, setPriority] = useState('medium')
  const [filter, setFilter] = useState('all')

  const addTodo = (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    setTodos((prev) => [...prev, { id: nextId++, text, done: false, priority }])
    setInput('')
  }

  const toggleTodo = (id) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    )
  }

  const deleteTodo = (id) => {
    setTodos((prev) => prev.filter((t) => t.id !== id))
  }

  const visible = useMemo(() => {
    if (filter === 'active') return todos.filter((t) => !t.done)
    if (filter === 'done') return todos.filter((t) => t.done)
    return todos
  }, [todos, filter])

  const remaining = todos.filter((t) => !t.done).length
  const doneCount = todos.length - remaining
  const pct = todos.length ? Math.round((doneCount / todos.length) * 100) : 0

  return (
    <div className="task-section">
      <p className="task-eyebrow">Immutable Array State</p>
      <h2>To-Do List</h2>
      <p className="task-goal">Add, complete, and delete tasks — each action replaces the array immutably rather than mutating it in place.</p>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', maxWidth: 400 }}>
        <div className="stat-card">
          <div className="stat-card-label">Total</div>
          <div className="stat-card-value">{todos.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Remaining</div>
          <div className="stat-card-value accent">{remaining}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Done</div>
          <div className="stat-card-value done">{doneCount}</div>
        </div>
      </div>

      <div className="progress-bar-track" style={{ marginBottom: 18 }}>
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>

      <form onSubmit={addTodo} className="todo-form">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a task..."
        />
        <select className="select-input" value={priority} onChange={(e) => setPriority(e.target.value)}>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button className="primary" type="submit">Add</button>
      </form>

      <div className="tab-group" style={{ marginBottom: 12 }}>
        {['all', 'active', 'done'].map((f) => (
          <button key={f} className={`tab-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Done'}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="empty-state">
          <ListTodo size={16} className="icon-inline" />
          {filter === 'all' ? "Nothing here yet — add your first task above." : `No ${filter} tasks.`}
        </p>
      ) : (
        <ul className="todo-list">
          {visible.map((todo) => (
            <li key={todo.id} className={todo.done ? 'done' : ''}>
              <label>
                <input
                  type="checkbox"
                  checked={todo.done}
                  onChange={() => toggleTodo(todo.id)}
                />
                {todo.text}
              </label>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`pill p-${todo.priority}`}>{todo.priority}</span>
                <button className="icon-btn" onClick={() => deleteTodo(todo.id)} aria-label="Delete task">
                  <Trash2 size={14} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
