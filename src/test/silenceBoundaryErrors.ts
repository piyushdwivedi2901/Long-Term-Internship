import { afterEach, beforeEach, vi } from 'vitest'

/**
 * For tests that deliberately make a component throw inside an error
 * boundary. React re-throws caught render errors to `window` in dev and
 * logs them via console.error; jsdom then prints "Error: Uncaught …".
 * Registering this in a test file keeps the output readable while the
 * assertions still run against the real boundary behaviour.
 */
export function silenceBoundaryErrors() {
  const swallow = (event: ErrorEvent) => event.preventDefault()
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    window.addEventListener('error', swallow)
  })
  afterEach(() => {
    window.removeEventListener('error', swallow)
    vi.restoreAllMocks()
  })
}
