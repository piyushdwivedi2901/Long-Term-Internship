import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Task35 from './Task35_RealBackend'
import { createLocalApi, ApiError, type Api } from '../../api'

function memoryApi(): Api {
  localStorage.clear()
  return createLocalApi()
}

describe('Task 35 – real backend', () => {
  it('shows loading, then an empty state', async () => {
    render(<Task35 api={memoryApi()} />)
    expect(screen.getByText('Loading todos…')).toBeInTheDocument()
    expect(await screen.findByText(/add your first todo/i)).toBeInTheDocument()
  })

  it('adds, toggles and deletes a todo through the API', async () => {
    const api = memoryApi()
    render(<Task35 api={api} />)
    await screen.findByText(/add your first todo/i)

    await userEvent.type(screen.getByLabelText('New todo'), 'Ship it{Enter}')
    expect(await screen.findByText('Ship it')).toBeInTheDocument()
    expect(await api.todos.list()).toHaveLength(1)

    await userEvent.click(screen.getByRole('checkbox'))
    await waitFor(async () => expect((await api.todos.list())[0].done).toBe(true))
    expect(screen.getByText(/0 remaining · 1 total/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Delete Ship it' }))
    await waitFor(async () => expect(await api.todos.list()).toEqual([]))
  })

  it('keeps data across a "reload from storage"', async () => {
    const api = memoryApi()
    await api.todos.create('persisted')
    render(<Task35 api={api} />)
    expect(await screen.findByText('persisted')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /reload from storage/i }))
    expect(await screen.findByText('persisted')).toBeInTheDocument()
  })

  it('shows an error with retry when the server is unreachable', async () => {
    const api = memoryApi()
    const list = vi.spyOn(api.todos, 'list').mockRejectedValueOnce(new Error('Failed to fetch'))
    render(<Task35 api={api} />)
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load todos: Failed to fetch")
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText(/add your first todo/i)).toBeInTheDocument()
    expect(list).toHaveBeenCalledTimes(2)
  })

  it('rolls back an optimistic toggle when the server rejects it', async () => {
    const api = memoryApi()
    await api.todos.create('fragile')
    vi.spyOn(api.todos, 'update').mockRejectedValueOnce(new ApiError('boom', 500))
    render(<Task35 api={api} />)
    const box = await screen.findByRole('checkbox')
    await userEvent.click(box)
    expect(await screen.findByRole('alert')).toHaveTextContent(`Couldn't update "fragile": boom`)
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('reports which backend mode is active', async () => {
    render(<Task35 api={memoryApi()} />)
    expect(screen.getByTestId('t35-mode')).toHaveTextContent(/demo mode/i)
  })
})
