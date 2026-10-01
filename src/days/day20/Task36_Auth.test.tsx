import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Task36 from './Task36_Auth'
import { createLocalApi, type TokenGetter } from '../../api'
import { formatViolations, runAxe } from '../../test/axe'

const createApiFn = (getToken: TokenGetter) => createLocalApi(getToken)

beforeEach(() => localStorage.clear())

async function signUp(email: string, password = 'password123') {
  await userEvent.click(screen.getByRole('link', { name: 'Sign up' }))
  await userEvent.type(screen.getByLabelText('Email'), email)
  await userEvent.type(screen.getByLabelText(/^Password/), password)
  await userEvent.click(screen.getByRole('button', { name: 'Sign up' }))
}

describe('Task 36 – auth', () => {
  it('redirects a signed-out visitor from the protected route to the login form', async () => {
    render(<Task36 createApiFn={createApiFn} />)
    await userEvent.click(screen.getByRole('link', { name: /account \(protected\)/i }))
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByText(/continue to/i)).toHaveTextContent('/account')
  })

  it('signs up, lands on the account page, and shows the user\'s email', async () => {
    render(<Task36 createApiFn={createApiFn} />)
    await signUp('piyush@example.com')
    expect(await screen.findByTestId('t36-email')).toHaveTextContent('piyush@example.com')
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })

  it('shows server-side validation and duplicate errors', async () => {
    render(<Task36 createApiFn={createApiFn} />)
    await signUp('a@example.com', 'short')
    expect(await screen.findByRole('alert')).toHaveTextContent('at least 8 characters')

    await userEvent.clear(screen.getByLabelText(/^Password/))
    await userEvent.type(screen.getByLabelText(/^Password/), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }))
    await userEvent.click(await screen.findByRole('button', { name: /sign out/i }))

    await signUp('a@example.com')
    expect(await screen.findByRole('alert')).toHaveTextContent('email already registered')
  })

  it('rejects a wrong password on sign in', async () => {
    render(<Task36 createApiFn={createApiFn} />)
    await signUp('a@example.com')
    await userEvent.click(await screen.findByRole('button', { name: /sign out/i }))
    await userEvent.click(screen.getByRole('link', { name: 'Sign in' }))
    await userEvent.type(screen.getByLabelText('Email'), 'a@example.com')
    await userEvent.type(screen.getByLabelText(/^Password/), 'wrong-password')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('invalid email or password')
  })

  it('keeps each user\'s data private across sign out / sign in', async () => {
    const { unmount } = render(<Task36 createApiFn={createApiFn} />)
    await signUp('alice@example.com')
    await userEvent.type(await screen.findByLabelText('New todo'), "Alice's secret{Enter}")
    expect(await screen.findByText("Alice's secret")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }))
    unmount()

    render(<Task36 createApiFn={createApiFn} />)
    await signUp('bob@example.com')
    expect(await screen.findByText(/add your first todo/i)).toBeInTheDocument()
    expect(screen.queryByText("Alice's secret")).toBeNull()
  })

  it('restores the session after a reload using the stored token', async () => {
    const first = render(<Task36 createApiFn={createApiFn} />)
    await signUp('a@example.com')
    await screen.findByTestId('t36-email')
    first.unmount()

    render(<Task36 createApiFn={createApiFn} />)
    expect(await screen.findByRole('button', { name: /sign out \(a@example.com\)/i })).toBeInTheDocument()
  })

  it('discards a stale stored token instead of trusting it', async () => {
    localStorage.setItem('lti:auth:token', 'demo.999')
    render(<Task36 createApiFn={createApiFn} />)
    expect(await screen.findByRole('link', { name: 'Sign in' })).toBeInTheDocument()
    expect(localStorage.getItem('lti:auth:token')).toBeNull()
  })

  it('signing out locks the protected route again', async () => {
    render(<Task36 createApiFn={createApiFn} />)
    await signUp('a@example.com')
    await userEvent.click(await screen.findByRole('button', { name: /sign out/i }))
    await userEvent.click(screen.getByRole('link', { name: /account \(protected\)/i }))
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('has no axe violations on the login form', async () => {
    const { container } = render(<Task36 createApiFn={createApiFn} />)
    await userEvent.click(screen.getByRole('link', { name: 'Sign in' }))
    const violations = await runAxe(container)
    expect(violations, formatViolations(violations)).toEqual([])
  })
})
