import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Task8_TodoList from './Task8_TodoList.jsx'

describe('Task8_TodoList', () => {
  it('renders the seeded tasks', () => {
    render(<Task8_TodoList />)
    expect(screen.getByText('Finish React basics')).toBeInTheDocument()
    expect(screen.getByText('Practice hooks')).toBeInTheDocument()
  })

  it('adds a new task', () => {
    render(<Task8_TodoList />)
    const input = screen.getByPlaceholderText('Add a task...')
    fireEvent.change(input, { target: { value: 'Write tests' } })
    fireEvent.click(screen.getByText('Add'))
    expect(screen.getByText('Write tests')).toBeInTheDocument()
  })

  it('toggles a task as done', () => {
    render(<Task8_TodoList />)
    const checkbox = screen.getAllByRole('checkbox')[1] // "Practice hooks"
    expect(checkbox).not.toBeChecked()
    fireEvent.click(checkbox)
    expect(checkbox).toBeChecked()
  })

  it('deletes a task', () => {
    render(<Task8_TodoList />)
    expect(screen.getByText('Practice hooks')).toBeInTheDocument()
    const deleteButtons = screen.getAllByLabelText('Delete task')
    fireEvent.click(deleteButtons[1])
    expect(screen.queryByText('Practice hooks')).not.toBeInTheDocument()
  })

  it('filters to only active tasks', () => {
    render(<Task8_TodoList />)
    fireEvent.click(screen.getByText('Active'))
    expect(screen.queryByText('Finish React basics')).not.toBeInTheDocument()
    expect(screen.getByText('Practice hooks')).toBeInTheDocument()
  })

  it('filters to only done tasks', () => {
    render(<Task8_TodoList />)
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getByText('Finish React basics')).toBeInTheDocument()
    expect(screen.queryByText('Practice hooks')).not.toBeInTheDocument()
  })
})
