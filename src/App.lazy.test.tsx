import { lazy, type ComponentType } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// A registry with one instant task and one whose chunk we release by hand,
// so the loading and failure states can be asserted deterministically.
const control = vi.hoisted(() => ({
  release: (() => {}) as () => void,
  fail: (() => {}) as () => void,
}))

vi.mock('./registry', () => {
  const Fast = () => <h2>Fast task</h2>
  const Slow = () => <h2>Slow task</h2>
  const slowPromise = new Promise<{ default: typeof Slow }>((resolve) => {
    control.release = () => resolve({ default: Slow })
  })
  const brokenPromise = new Promise<{ default: typeof Slow }>((_, reject) => {
    control.fail = () => reject(new Error('Failed to fetch dynamically imported module'))
  })
  const mk = (id: string, num: number, title: string, load: () => Promise<{ default: ComponentType }>) => ({
    id, num, title, Component: lazy(load), preload: () => {},
  })
  const taskRegistry = [
    { day: 1, label: 'Day 1', tasks: [
      mk('d1-t1', 1, 'Fast', async () => ({ default: Fast })),
      mk('d1-t2', 2, 'Slow', () => slowPromise),
      mk('d1-t3', 3, 'Broken', () => brokenPromise),
    ] },
  ]
  const allTasks = taskRegistry.flatMap((d) => d.tasks)
  return {
    taskRegistry,
    allTasks,
    ROADMAP_TOTAL: 3,
    findTask: (id: string) => allTasks.find((t) => t.id === id),
  }
})

import App from './App'
import { silenceBoundaryErrors } from './test/silenceBoundaryErrors'

describe('App lazy loading', () => {
  silenceBoundaryErrors()

  it('shows a loading state while a task chunk loads, then the task', async () => {
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Fast task' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /^02 · / }))
    expect(screen.getByText('Loading task…')).toBeInTheDocument()

    await act(async () => control.release())
    expect(await screen.findByRole('heading', { name: 'Slow task' })).toBeInTheDocument()
    expect(screen.queryByText('Loading task…')).toBeNull()
  })

  it('contains a failed chunk load in the boundary and recovers when navigating away', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /^03 · / }))
    await act(async () => control.fail())
    expect(await screen.findByRole('alert')).toHaveTextContent(/dynamically imported module/)
    // The shell (sidebar) is still alive, and moving to another task resets the boundary.
    await userEvent.click(screen.getByRole('button', { name: /^01 · / }))
    expect(await screen.findByRole('heading', { name: 'Fast task' })).toBeInTheDocument()
  })
})
