import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Task18_FormValidation from './Task18_FormValidation.jsx'

describe('Task18_FormValidation', () => {
  it('shows required-field errors on empty submit', () => {
    render(<Task18_FormValidation />)
    fireEvent.click(screen.getByText('Sign up'))
    expect(screen.getByText('Name is required')).toBeInTheDocument()
    expect(screen.getByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
  })

  it('flags an invalid email format', () => {
    render(<Task18_FormValidation />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } })
    fireEvent.click(screen.getByText('Sign up'))
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
  })

  it('flags mismatched passwords', () => {
    render(<Task18_FormValidation />)
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } })
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'password2' } })
    fireEvent.click(screen.getByText('Sign up'))
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
  })

  it('submits successfully with valid input', () => {
    render(<Task18_FormValidation />)
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Piyush' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'piyush@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } })
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'secret123' } })
    fireEvent.click(screen.getByText('Sign up'))
    expect(screen.getByText('✅ Account created successfully!')).toBeInTheDocument()
  })

  it('shows a live password strength label as you type', () => {
    render(<Task18_FormValidation />)
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Str0ng!Pass99' } })
    expect(screen.getByText(/strong/i)).toBeInTheDocument()
  })
})
