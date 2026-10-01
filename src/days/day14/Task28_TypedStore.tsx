import { useEffect, useMemo, useState } from 'react'
import { Activity, Plus, Trash2, CheckCheck } from 'lucide-react'
import {
  getVisibleTodos,
  useTodoStore,
  type TodoFilter,
  type TodoState,
} from '../../store/todoStore'

/**
 * Day 14 — Task 28: Typed Store
 * Goal: Convert todoStore to TypeScript for typed state and actions.
 *
 * The store itself lives in src/store/todoStore.ts. This page is a small
 * "store inspector": it drives the typed actions and subscribes to the
 * store to log each state transition. It shares the SAME store instance as
 * Task 24 — add a todo here and it appears there.
 */
const FILTERS: TodoFilter[] = ['all', 'active', 'done']

/** Pure helper: a one-line description of what changed between two states. */
export function describeTransition(next: TodoState, prev: TodoState): string | null {
  if (next.filter !== prev.filter) return `setFilter('${next.filter}')`
  if (next.todos.length > prev.todos.length) return `addTodo → ${next.todos.length} todos`
  if (next.todos.length < prev.todos.length) return `removeTodo → ${next.todos.length} todos`
  const changed = next.todos.find((t, i) => t.done !== prev.todos[i]?.done)
  if (changed) return `toggleTodo(${changed.id}) → ${changed.done ? 'done' : 'active'}`
  return null
}

let sampleCount = 0

export default function Task28_TypedStore() {
  const todos = useTodoStore((s) => s.todos)
  const filter = useTodoStore((s) => s.filter)
  const addTodo = useTodoStore((s) => s.addTodo)
  const toggleTodo = useTodoStore((s) => s.toggleTodo)
  const removeTodo = useTodoStore((s) => s.removeTodo)
  const setFilter = useTodoStore((s) => s.setFilter)
  const [log, setLog] = useState<string[]>([])

  // `subscribe` is typed: (state, prevState) => void, both TodoStore.
  useEffect(() => {
    return useTodoStore.subscribe((state, prev) => {
      const line = describeTransition(state, prev)
      if (line) setLog((l) => [line, ...l].slice(0, 6))
    })
  }, [])

  const visible = useMemo(() => getVisibleTodos(todos, filter), [todos, filter])
  const lastTodo = todos[todos.length - 1]

  return (
    <div className="task-section">
      <p className="task-eyebrow">TypeScript</p>
      <h2>Typed Store</h2>
      <p className="task-goal">
        The Zustand to-do store, converted to TypeScript: <code>TodoState</code> describes the data,
        <code> TodoActions</code> the only ways to change it, and every selector infers its return type.
      </p>

      <div className="toolbar">
        <button className="primary" onClick={() => addTodo(`Sample todo ${++sampleCount}`)}>
          <Plus size={13} className="icon-inline" />addTodo()
        </button>
        <button onClick={() => todos[0] && toggleTodo(todos[0].id)} disabled={todos.length === 0}>
          <CheckCheck size={13} className="icon-inline" />toggleTodo(first)
        </button>
        <button onClick={() => lastTodo && removeTodo(lastTodo.id)} disabled={todos.length === 0}>
          <Trash2 size={13} className="icon-inline" />removeTodo(last)
        </button>
        <div className="tab-group" role="group" aria-label="Filter">
          {FILTERS.map((f) => (
            <button key={f} className={`tab-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="split-layout" style={{ gap: 24 }}>
        <div>
          <p className="task-eyebrow">Live state ({visible.length} visible)</p>
          <pre className="code-block" tabIndex={0} aria-label="Store state (scrollable)" style={{ maxWidth: 320 }}>{JSON.stringify({ filter, todos }, null, 2)}</pre>
        </div>
        <div>
          <p className="task-eyebrow"><Activity size={12} className="icon-inline" />Transition log (via subscribe)</p>
          {log.length === 0 ? (
            <p className="empty-state">Use the buttons — each state change is logged here.</p>
          ) : (
            <ul className="todo-list" style={{ maxWidth: 320 }}>
              {log.map((line, i) => (
                <li key={`${line}-${i}`}><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{line}</span></li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <pre className="code-block">{`interface Todo { id: number; text: string; done: boolean }
type TodoFilter = 'all' | 'active' | 'done'

interface TodoState   { todos: Todo[]; filter: TodoFilter }
interface TodoActions {
  addTodo:    (text: string) => void
  toggleTodo: (id: number) => void
  removeTodo: (id: number) => void
  setFilter:  (filter: TodoFilter) => void
}

const useTodoStore = create<TodoState & TodoActions>()((set) => ({ … }))

// Selectors infer their return types — no annotations needed:
const todos  = useTodoStore((s) => s.todos)   // Todo[]
const filter = useTodoStore((s) => s.filter)  // TodoFilter`}</pre>
    </div>
  )
}
