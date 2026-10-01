import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import Task28_TypedStore, { describeTransition } from './Task28_TypedStore'
import { initialTodos, useTodoStore } from '../../store/todoStore'

beforeEach(() => {
  useTodoStore.setState({ todos: initialTodos, filter: 'all' })
})

describe('describeTransition', () => {
  const base = { todos: initialTodos, filter: 'all' as const }
  it('describes filter, add, remove and toggle transitions', () => {
    expect(describeTransition({ ...base, filter: 'done' }, base)).toBe("setFilter('done')")
    expect(describeTransition({ ...base, todos: [...initialTodos, { id: 9, text: 'x', done: false }] }, base)).toContain('addTodo')
    expect(describeTransition({ ...base, todos: initialTodos.slice(1) }, base)).toContain('removeTodo')
    const toggled = initialTodos.map((t) => (t.id === 2 ? { ...t, done: true } : t))
    expect(describeTransition({ ...base, todos: toggled }, base)).toBe('toggleTodo(2) → done')
  })
  it('returns null when nothing relevant changed', () => {
    expect(describeTransition(base, base)).toBeNull()
  })
})

describe('Task28_TypedStore', () => {
  it('logs each store transition triggered from the UI', () => {
    render(<Task28_TypedStore />)
    fireEvent.click(screen.getByRole('button', { name: /addTodo\(\)/ }))
    fireEvent.click(screen.getByRole('button', { name: 'done' }))
    expect(screen.getByText(/addTodo → 3 todos/)).toBeInTheDocument()
    expect(screen.getByText("setFilter('done')")).toBeInTheDocument()
    expect(useTodoStore.getState().todos).toHaveLength(3)
  })
})
