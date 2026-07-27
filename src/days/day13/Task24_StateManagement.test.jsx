import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Task24_StateManagement from './Task24_StateManagement.jsx'
import { useTodoStore } from '../../store/todoStore.js'

describe('Task24_StateManagement (Zustand)', () => {
  beforeEach(() => {
    // Reset the store between tests since Zustand state persists across renders
    useTodoStore.setState({
      todos: [
        { id: 1, text: 'Learn Zustand basics', done: true },
        { id: 2, text: 'Rebuild the to-do app with it', done: false },
      ],
    })
  })

  it('renders todos from the store', () => {
    render(<Task24_StateManagement />)
    expect(screen.getByText('Learn Zustand basics')).toBeInTheDocument()
  })

  it('adds a todo via the store action', () => {
    render(<Task24_StateManagement />)
    fireEvent.change(screen.getByPlaceholderText('Add a task…'), {
      target: { value: 'Ship the feature' },
    })
    fireEvent.click(screen.getByText('Add'))
    expect(screen.getByText('Ship the feature')).toBeInTheDocument()
  })

  it('removes a todo via the store action', () => {
    render(<Task24_StateManagement />)
    fireEvent.click(screen.getAllByLabelText('Delete task')[0])
    expect(screen.queryByText('Learn Zustand basics')).not.toBeInTheDocument()
  })
})
