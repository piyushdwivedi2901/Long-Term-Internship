import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Task38, { RhfSignupForm } from './Task38_FormsAtScale'
import { signupSchema } from './signupSchema'
import { formatViolations, runAxe } from '../../test/axe'

describe('signupSchema (Zod)', () => {
  const valid = { name: 'Piyush', email: 'p@example.com', password: 'secret123', confirmPassword: 'secret123' }

  it('accepts valid input and trims strings', () => {
    const r = signupSchema.safeParse({ ...valid, name: '  Piyush ' })
    expect(r.success).toBe(true)
    expect(r.success && r.data.name).toBe('Piyush')
  })

  it.each([
    [{ name: '' }, 'Name is required'],
    [{ email: '' }, 'Email is required'],
    [{ email: 'nope' }, 'Enter a valid email address'],
    [{ password: '', confirmPassword: '' }, 'Password is required'],
    [{ password: 'abc', confirmPassword: 'abc' }, 'Password must be at least 6 characters'],
    [{ confirmPassword: 'different' }, 'Passwords do not match'],
  ])('rejects %j with "%s"', (override, message) => {
    const r = signupSchema.safeParse({ ...valid, ...override })
    expect(r.success).toBe(false)
    expect(r.success ? [] : r.error.issues.map((i) => i.message)).toContain(message)
  })
})

describe('RhfSignupForm', () => {
  it('shows the same errors as the manual form on an empty submit', async () => {
    render(<RhfSignupForm />)
    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }))
    expect(await screen.findByText('Name is required')).toBeInTheDocument()
    expect(screen.getByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
  })

  it('flags an invalid email and mismatched passwords, with aria wiring', async () => {
    render(<RhfSignupForm />)
    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email')
    await userEvent.type(screen.getByLabelText('Password'), 'password1')
    await userEvent.type(screen.getByLabelText('Confirm Password'), 'password2')
    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }))
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Enter a valid email address')
  })

  it('submits successfully with valid input', async () => {
    render(<RhfSignupForm />)
    await userEvent.type(screen.getByLabelText('Name'), 'Piyush')
    await userEvent.type(screen.getByLabelText('Email'), 'piyush@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'secret123')
    await userEvent.type(screen.getByLabelText('Confirm Password'), 'secret123')
    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }))
    expect(await screen.findByText('✅ Account created successfully!')).toBeInTheDocument()
  })
})

describe('Task 38 – comparison page', () => {
  it('re-renders the manual form per keystroke but not the RHF form', async () => {
    render(<Task38 />)
    const rhfSection = screen.getByRole('heading', { name: /react hook form/i }).closest('section')!
    const manualSection = screen.getByRole('heading', { name: /manual \(task 18\)/i }).closest('section')!
    await userEvent.type(within(manualSection).getByLabelText('Name'), 'abcde')
    await userEvent.type(within(rhfSection).getByLabelText('Name'), 'abcde')
    const manualRenders = Number(screen.getByTestId('t38-manual-renders').textContent)
    const rhfRenders = Number(screen.getByTestId('t38-rhf-renders').textContent)
    expect(manualRenders).toBeGreaterThanOrEqual(5)
    expect(rhfRenders).toBeLessThan(manualRenders)
  })

  it('has no axe violations', async () => {
    const { container } = render(<Task38 />)
    const violations = await runAxe(container)
    expect(violations, formatViolations(violations)).toEqual([])
  })
})
