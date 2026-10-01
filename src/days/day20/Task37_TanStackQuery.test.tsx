import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Task37 from './Task37_TanStackQuery'
import { formatViolations, runAxe } from '../../test/axe'

const legacyCalls = () => screen.getByTestId('t37-legacy-calls')
const queryCalls = () => screen.getByTestId('t37-query-calls')

async function loaded() {
  await screen.findByTestId('t37-legacy-data')
  await screen.findByTestId('t37-query-data')
}

describe('Task 37 – TanStack Query vs hand-rolled fetching', () => {
  it('both approaches make one request on first load', async () => {
    render(<Task37 latencyMs={1} />)
    await loaded()
    expect(legacyCalls()).toHaveTextContent('1')
    expect(queryCalls()).toHaveTextContent('1')
  })

  it('re-showing a panel refetches with the old hook but hits the cache with Query', async () => {
    render(<Task37 latencyMs={1} />)
    await loaded()
    const [hideLegacy, hideQuery] = screen.getAllByRole('button', { name: 'Hide panel' })
    await userEvent.click(hideLegacy)
    await userEvent.click(hideQuery)
    await userEvent.click(screen.getAllByRole('button', { name: 'Show panel' })[0])
    await userEvent.click(screen.getAllByRole('button', { name: 'Show panel' })[0])
    await loaded()
    expect(legacyCalls()).toHaveTextContent('2')
    expect(queryCalls()).toHaveTextContent('1') // fresh for 10s → no new request
  })

  it('with staleTime 0, returning to the tab revalidates only the Query panel', async () => {
    render(<Task37 latencyMs={1} />)
    await userEvent.click(screen.getByRole('button', { name: 'staleTime 0s' }))
    await loaded()
    await userEvent.click(screen.getByRole('button', { name: /simulate returning/i }))
    await waitFor(() => expect(queryCalls()).toHaveTextContent('2'))
    expect(legacyCalls()).toHaveTextContent('1')
  })

  it('has no axe violations', async () => {
    const { container } = render(<Task37 latencyMs={1} />)
    await loaded()
    const violations = await runAxe(container)
    expect(violations, formatViolations(violations)).toEqual([])
  })
})
