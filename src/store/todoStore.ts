import { create } from 'zustand'

export type TodoFilter = 'all' | 'active' | 'done'

export interface Todo {
  id: number
  text: string
  done: boolean
}

export interface TodoState {
  todos: Todo[]
  filter: TodoFilter
}

export interface TodoActions {
  addTodo: (text: string) => void
  toggleTodo: (id: number) => void
  removeTodo: (id: number) => void
  setFilter: (filter: TodoFilter) => void
}

export type TodoStore = TodoState & TodoActions

/**
 * Zustand store for Tasks 24 + 28 — to-do state and actions live outside
 * the component tree, now fully typed: `TodoState` describes the data,
 * `TodoActions` the only ways to change it, and `create<TodoStore>()`
 * makes every selector (`useTodoStore((s) => s.todos)`) infer its return
 * type automatically.
 *
 * The store holds data + actions only. Derived values go through the pure
 * `getVisibleTodos` helper below (used with `useMemo` in components), not
 * a getter function stored as state.
 */
let nextId = 3

export const initialTodos: Todo[] = [
  { id: 1, text: 'Learn Zustand basics', done: true },
  { id: 2, text: 'Rebuild the to-do app with it', done: false },
]

export const useTodoStore = create<TodoStore>()((set) => ({
  todos: initialTodos,
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

/** Pure derived-state helper: the todos that match the active filter. */
export function getVisibleTodos(todos: Todo[], filter: TodoFilter): Todo[] {
  if (filter === 'active') return todos.filter((t) => !t.done)
  if (filter === 'done') return todos.filter((t) => t.done)
  return todos
}
