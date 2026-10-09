import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../App.tsx'
import { createDemoClient } from '../api/demo.ts'
import type { TokenGetter } from '../api/types.ts'
import { memoryStorage } from './memoryStorage.ts'

/** Renders the whole app against an isolated, zero-latency in-browser backend. */
export function renderApp(hash = '#/', storage = memoryStorage()) {
  localStorage.clear()
  window.location.hash = hash
  const user = userEvent.setup()
  const utils = render(<App createClient={(t: TokenGetter) => createDemoClient(t, { storage, latencyMs: 0 })} />)
  return { user, storage, ...utils }
}

export async function signUp(user: ReturnType<typeof userEvent.setup>, name = 'Piyush') {
  await user.click(await screen.findByRole('link', { name: 'Create an account' }))
  await user.type(screen.getByLabelText(/^Your name/), name)
  await user.type(screen.getByLabelText('Email'), `${name.toLowerCase().replace(/\s+/g, '')}-${Math.random().toString(36).slice(2, 7)}@example.com`)
  await user.type(screen.getByLabelText(/^Password/), 'password123')
  await user.click(screen.getByRole('button', { name: 'Create account' }))
  await screen.findByRole('button', { name: /Account menu/ })
}

export async function loadSamples(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Explore with a sample crew' }))
  await user.click(await screen.findByRole('link', { name: /Hostel Room 12/ }))
  await screen.findByRole('heading', { name: 'Power rankings' })
}
