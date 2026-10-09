import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../App.tsx'
import { createDemoClient } from '../api/demo.ts'
import type { TokenGetter } from '../api/types.ts'
import { memoryStorage } from './memoryStorage.ts'

/** Renders the whole app against an isolated, zero-latency demo backend. */
export function renderApp(hash = '#/') {
  localStorage.clear()
  window.location.hash = hash
  const storage = memoryStorage()
  const user = userEvent.setup()
  const utils = render(<App createClient={(t: TokenGetter) => createDemoClient(t, { storage, latencyMs: 0 })} />)
  return { user, storage, ...utils }
}

export async function signUp(user: ReturnType<typeof userEvent.setup>, name = 'Piyush Dwivedi') {
  await user.click(await screen.findByRole('link', { name: 'Create an account' }))
  await user.type(screen.getByLabelText('Name'), name)
  await user.type(screen.getByLabelText('Email'), `p${Math.random().toString(36).slice(2, 8)}@example.com`)
  await user.type(screen.getByLabelText(/^Password/), 'password123')
  await user.click(screen.getByRole('button', { name: 'Create account' }))
  await screen.findByRole('button', { name: /Account menu/ })
}
