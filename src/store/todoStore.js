import { create } from 'zustand'

/**
 * Zustand store for Task 24 — same to-do behavior as Task 8,
 * but state and actions live outside the component tree.
 */
let nextId = 3

export const useTodoStore = create((set) => ({
  todos: [
    { id: 1, text: 'Learn Zustand basics', done: true },
    { id: 2, text: 'Rebuild the to-do app with it', done: false },
  ],
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
}))
