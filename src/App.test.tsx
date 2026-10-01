import { beforeEach, describe, expect, it } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { ROADMAP_TOTAL, allTasks } from './registry'

beforeEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('App shell', () => {
  it('opens task 1 by default and lazy-loads its content', async () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /^01 · / })).toHaveAttribute('aria-current', 'page')
    expect(await screen.findByRole('heading', { level: 2 })).toBeInTheDocument()
  })

  it('reports progress from the registry', () => {
    render(<App />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', String(allTasks.length))
    expect(bar).toHaveAttribute('aria-valuemax', String(ROADMAP_TOTAL))
  })

  it('navigates and updates the URL hash', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /^08 · / }))
    expect(window.location.hash).toBe('#/d4-t8')
    expect(screen.getByRole('button', { name: /^08 · / })).toHaveAttribute('aria-current', 'page')
    expect(await screen.findByRole('heading', { name: 'To-Do List' })).toBeInTheDocument()
  })

  it('shows a loading state while a task chunk loads', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /^12 · / }))
    expect(screen.getByText('Loading task…')).toBeInTheDocument()
    await screen.findByRole('heading', { level: 2 })
  })

  it('honours a deep link on load', () => {
    window.history.replaceState(null, '', '#/d4-t8')
    render(<App />)
    expect(screen.getByRole('button', { name: /^08 · / })).toHaveAttribute('aria-current', 'page')
  })

  it('falls back to task 1 for an unknown hash and follows hashchange', () => {
    window.history.replaceState(null, '', '#/nope')
    render(<App />)
    expect(screen.getByRole('button', { name: /^01 · / })).toHaveAttribute('aria-current', 'page')
    act(() => {
      window.history.replaceState(null, '', '#/d4-t7')
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(screen.getByRole('button', { name: /^07 · / })).toHaveAttribute('aria-current', 'page')
  })
})
