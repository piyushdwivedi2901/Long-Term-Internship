import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useTodoStore } from '../../store/todoStore.js'

/**
 * Day 13 — Task 24: State Management Library
 * Goal: Redo the to-do app using a state management library (Zustand
 * chosen over Redux Toolkit for its minimal boilerplate) — state now
 * lives in a store outside the component, and any component can
 * subscribe to it. Extended so the filter lives in the store too,
 * not just the todos, and a stats row reads directly from the store.
 */
export default function Task24_StateManagement() {
  const todos = useTodoStore((state) => state.todos)
  const filter = useTodoStore((state) => state.filter)
  const addTodo = useTodoStore((state) => state.addTodo)
  const toggleTodo = useTodoStore((state) => state.toggleTodo)
  const removeTodo = useTodoStore((state) => state.removeTodo)
  const setFilter = useTodoStore((state) => state.setFilter)
  const visibleTodos = useTodoStore((state) => state.visibleTodos)
  const [input, setInput] = useState('')

  const handleAdd = (e) => {
    e.preventDefault()
    if (!input.trim()) return
    addTodo(input.trim())
    setInput('')
  }

  const visible = visibleTodos()
  const doneCount = todos.filter((t) => t.done).length

  return (
    <div className="task-section">
      <p className="task-eyebrow">State Management</p>
      <h2>State Management (Zustand)</h2>
      <p className="task-goal">Task 8's to-do app, rebuilt on a Zustand store — state, actions, <em>and</em> the active filter all live outside the component.</p>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', maxWidth: 260 }}>
        <div className="stat-card">
          <div className="stat-card-label">Total</div>
          <div className="stat-card-value">{todos.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Done</div>
          <div className="stat-card-value done">{doneCount}</div>
        </div>
      </div>

      <form onSubmit={handleAdd} className="todo-form">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Add a task…" />
        <button className="primary" type="submit">Add</button>
      </form>

      <div className="tab-group" style={{ marginBottom: 12 }}>
        {['all', 'active', 'done'].map((f) => (
          <button key={f} className={`tab-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Done'}
          </button>
        ))}
      </div>

      <ul className="todo-list">
        {visible.map((todo) => (
          <li key={todo.id} className={todo.done ? 'done' : ''}>
            <label>
              <input type="checkbox" checked={todo.done} onChange={() => toggleTodo(todo.id)} />
              {todo.text}
            </label>
            <button className="icon-btn" onClick={() => removeTodo(todo.id)} aria-label="Delete task"><Trash2 size={14} /></button>
          </li>
        ))}
      </ul>
    </div>
  )
}
