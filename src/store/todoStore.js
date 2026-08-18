import { create } from 'zustand'

/**
 * Zustand store for Task 24 — same to-do behavior as Task 8, but state
 * and actions live outside the component tree. The filter also lives
 * here (not in component state) to show the store owning UI state too,
 * not just data.
 *
 * Deliberately does NOT store a `visibleTodos` getter function as state —
 * an earlier version did, which technically worked (it reads fresh state
 * via `get()`) but isn't the conventional shape for a Zustand store.
 * Components select the raw `todos`/`filter` and derive the visible list
 * themselves with `useMemo`, the same pattern used elsewhere in this repo.
 */
let nextId = 3

export const useTodoStore = create((set) => ({
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
}))
