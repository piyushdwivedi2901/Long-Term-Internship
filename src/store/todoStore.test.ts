import { beforeEach, describe, expect, it } from 'vitest'
import { getVisibleTodos, initialTodos, useTodoStore } from './todoStore'

beforeEach(() => {
  useTodoStore.setState({ todos: initialTodos, filter: 'all' })
})

describe('todoStore (typed)', () => {
  it('starts with the seeded todos and the "all" filter', () => {
    const { todos, filter } = useTodoStore.getState()
    expect(todos).toHaveLength(2)
    expect(filter).toBe('all')
  })

  it('addTodo appends an incomplete todo with a fresh id', () => {
    useTodoStore.getState().addTodo('Write types')
    const { todos } = useTodoStore.getState()
    const added = todos[todos.length - 1]
    expect(added).toMatchObject({ text: 'Write types', done: false })
    expect(new Set(todos.map((t) => t.id)).size).toBe(todos.length)
  })

  it('toggleTodo flips only the targeted todo', () => {
    useTodoStore.getState().toggleTodo(2)
    const [first, second] = useTodoStore.getState().todos
    expect(first.done).toBe(true) // untouched
    expect(second.done).toBe(true) // flipped from false
  })

  it('removeTodo drops the todo by id', () => {
    useTodoStore.getState().removeTodo(1)
    expect(useTodoStore.getState().todos.map((t) => t.id)).toEqual([2])
  })

  it('setFilter updates the filter and getVisibleTodos honours it', () => {
    useTodoStore.getState().setFilter('active')
    const { todos, filter } = useTodoStore.getState()
    expect(filter).toBe('active')
    expect(getVisibleTodos(todos, filter).map((t) => t.id)).toEqual([2])
    expect(getVisibleTodos(todos, 'done').map((t) => t.id)).toEqual([1])
    expect(getVisibleTodos(todos, 'all')).toHaveLength(2)
  })

  it('subscribers are notified with previous and next state', () => {
    const seen: number[] = []
    const unsubscribe = useTodoStore.subscribe((state, prev) => {
      seen.push(state.todos.length - prev.todos.length)
    })
    useTodoStore.getState().addTodo('One')
    useTodoStore.getState().removeTodo(1)
    unsubscribe()
    expect(seen).toEqual([1, -1])
  })
})
