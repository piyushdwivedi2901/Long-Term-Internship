import { create } from 'zustand'

/**
 * Zustand store for Task 24 — same to-do behavior as Task 8, but state
 * and actions live outside the component tree. The filter also lives
 * here (not in component state) to show the store owning UI state too,
 * not just data.
 */
let nextId = 3

export const useTodoStore = create((set, get) => ({
  todos: [
    { id: 1, text: 'Learn Zustand basics', done: true },
    { id: 2, text: 'Rebuild the to-do app with it', done: false },
  ],
  filter: 'all',

  addTodo: (text) =>
    set((state) => ({
      todos: [...state.todos, { id: nextId++, text, done: false }],
    })),
  toggleTodo: (id) =>
    set((state) => ({
      todos: state.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    })),
  removeTodo: (id) =>
    set((state) => ({
      todos: state.todos.filter((t) => t.id !== id),
    })),
  setFilter: (filter) => set({ filter }),

  // A selector-style getter — components can call this instead of
  // deriving the same filtered list themselves.
  visibleTodos: () => {
    const { todos, filter } = get()
    if (filter === 'active') return todos.filter((t) => !t.done)
    if (filter === 'done') return todos.filter((t) => t.done)
    return todos
  },
}))
