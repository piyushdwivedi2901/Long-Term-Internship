import { useState } from 'react'

/**
 * Day 4 — Task 8: To-Do List
 * Goal: Add, delete, and mark tasks complete.
 * Covers immutable array state updates (adding/removing items).
 */
let nextId = 4

export default function Task8_TodoList() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Finish React basics', done: true },
    { id: 2, text: 'Practice hooks', done: false },
    { id: 3, text: 'Build a mini project', done: false },
  ])
  const [input, setInput] = useState('')

  const addTodo = (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    setTodos((prev) => [...prev, { id: nextId++, text, done: false }])
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

  const remaining = todos.filter((t) => !t.done).length

  return (
    <div className="task-section">
      <h2>Task 8: To-Do List</h2>
      <form onSubmit={addTodo} className="todo-form">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a task..."
        />
        <button type="submit">Add</button>
      </form>
      <ul className="todo-list">
        {todos.map((todo) => (
          <li key={todo.id} className={todo.done ? 'done' : ''}>
            <label>
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => toggleTodo(todo.id)}
              />
              {todo.text}
            </label>
            <button onClick={() => deleteTodo(todo.id)} aria-label="Delete task">
              ✕
            </button>
          </li>
        ))}
      </ul>
      {todos.length === 0 ? (
        <p className="empty-state">No tasks — add one above.</p>
      ) : (
        <p className="todo-footer">{remaining} task(s) remaining</p>
      )}
    </div>
  )
}
