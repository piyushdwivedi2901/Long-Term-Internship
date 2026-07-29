import { useState } from 'react'
import { useTodoStore } from '../../store/todoStore.js'

/**
 * Day 13 — Task 24: State Management Library
 * Goal: Redo the to-do app using a state management library (Zustand chosen
 * over Redux Toolkit for its minimal boilerplate) — state now lives in a
 * store outside the component, and any component can subscribe to it.
 */
export default function Task24_StateManagement() {
  const todos = useTodoStore((state) => state.todos)
  const addTodo = useTodoStore((state) => state.addTodo)
  const toggleTodo = useTodoStore((state) => state.toggleTodo)
  const removeTodo = useTodoStore((state) => state.removeTodo)
  const [input, setInput] = useState('')

  const handleAdd = (e) => {
    e.preventDefault()
    if (!input.trim()) return
    addTodo(input.trim())
    setInput('')
  }

  return (
    <div className="task-section">
      <p className="task-eyebrow">State Management</p>
      <h2>State Management (Zustand)</h2>
      <p className="task-goal">Task 8's to-do app, rebuilt on a Zustand store instead of local <code>useState</code> — chosen over Redux Toolkit for its near-zero boilerplate.</p>
      <form onSubmit={handleAdd} className="todo-form">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Add a task…" />
        <button className="primary" type="submit">Add</button>
      </form>
      <ul className="todo-list">
        {todos.map((todo) => (
          <li key={todo.id} className={todo.done ? 'done' : ''}>
            <label>
              <input type="checkbox" checked={todo.done} onChange={() => toggleTodo(todo.id)} />
              {todo.text}
            </label>
            <button onClick={() => removeTodo(todo.id)} aria-label="Delete task">✕</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
