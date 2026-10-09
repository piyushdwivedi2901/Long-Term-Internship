import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import type userEvent from '@testing-library/user-event'
import { CLUBS } from '../shared/clubs.ts'
import { renderApp, loadSamples, signUp } from './test/renderApp.tsx'

type User = ReturnType<typeof userEvent.setup>

async function startCrew(user: User, name: string, people: string[]) {
  await user.click((await screen.findAllByRole('button', { name: 'Start a crew' }))[0])
  const d = await screen.findByRole('dialog', { name: 'Start a crew' })
  await waitFor(() => expect(within(d).getByLabelText('Crew name')).toHaveFocus())
  await user.type(within(d).getByLabelText('Crew name'), name)
  for (const p of people) await user.type(within(d).getByLabelText('Who plays, besides you?'), `${p}{Enter}`)
  await user.click(within(d).getByRole('button', { name: 'Create crew' }))
  await screen.findByRole('heading', { level: 1, name })
}

async function newCompetition(user: User, name: string, format: 'League' | 'Knockout cup', only?: string[]) {
  await user.click(screen.getAllByRole('button', { name: 'New competition' })[0])
  const d = await screen.findByRole('dialog', { name: 'New competition' })
  await waitFor(() => expect(within(d).getByLabelText('Name')).toHaveFocus())
  await user.type(within(d).getByLabelText('Name'), name)
  await user.click(within(d).getByRole('radio', { name: new RegExp(format) }))
  if (only) {
    await user.click(within(d).getByRole('button', { name: 'Nobody' }))
    for (const p of only) await user.click(within(d).getByRole('checkbox', { name: p }))
  }
  return d
}

async function enterScore(user: User, button: HTMLElement, home: number, away: number, configure?: (d: HTMLElement) => Promise<void>) {
  await user.click(button)
  const d = await screen.findByRole('dialog', { name: /Enter result|Edit result/ })
  const [h, a] = within(d).getAllByRole('spinbutton').slice(0, 2)
  await user.clear(h)
  await user.type(h, String(home))
  await user.clear(a)
  await user.type(a, String(away))
  await configure?.(d)
  await user.click(within(d).getByRole('button', { name: 'Save result' }))
  return d
}

describe('accounts', () => {
  it('sends signed-out visitors to sign in, then back to where they were going', async () => {
    const { user } = renderApp('#/settings')
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    await signUp(user)
    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
  })

  it('welcomes a new player with ways to start', async () => {
    const { user } = renderApp()
    await signUp(user)
    expect(await screen.findByRole('heading', { name: "Settle who's actually the best on the sticks" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Join with a code' })).toBeInTheDocument()
  })
})

describe('running a league', () => {
  it('starts a crew, draws a league, enters a score and moves the table', async () => {
    const { user } = renderApp()
    await signUp(user)
    await startCrew(user, 'Friday FIFA', ['Rohan', 'Aisha'])
    const d = await newCompetition(user, 'Season 1', 'League')
    expect(within(d).getByText('3 matches over 3 matchdays — one player rests each matchday.')).toBeInTheDocument()
    await user.click(within(d).getByRole('radio', { name: 'Home & away' }))
    expect(within(d).getByText('6 matches over 6 matchdays — one player rests each matchday.')).toBeInTheDocument()
    await user.click(within(d).getByRole('button', { name: 'Create & draw fixtures' }))
    await screen.findByRole('heading', { level: 1, name: 'Season 1' })

    const table = screen.getByRole('table', { name: 'Season 1 table' })
    expect(within(table).getAllByRole('row')).toHaveLength(4)
    const first = screen.getAllByRole('button', { name: /vs .*Enter result/ })[0]
    const home = first.querySelector('.scoreline__name')!.textContent!
    await enterScore(user, first, 3, 1)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    const leader = within(screen.getByRole('table', { name: 'Season 1 table' })).getAllByRole('row')[1]
    expect(leader).toHaveTextContent(home)
    expect(leader).toHaveTextContent(/1\s*1\s*0\s*0\s*3\s*1\s*\+2\s*3/)
    expect(screen.getByText(/1 of 6 played/)).toBeInTheDocument()
  })
})

describe('knockout cups', () => {
  it('needs a shoot-out for a level final, then crowns the champion', async () => {
    const { user } = renderApp()
    await signUp(user)
    await startCrew(user, 'Cup crew', ['Rohan'])
    const d = await newCompetition(user, 'Final night', 'Knockout cup')
    expect(within(d).getByText('A 2-player bracket: 1 matches.')).toBeInTheDocument()
    await user.click(within(d).getByRole('button', { name: 'Create & draw fixtures' }))
    await screen.findByRole('heading', { level: 1, name: 'Final night' })
    const bracket = screen.getByRole('list', { name: 'Bracket' })
    const dialog = await enterScore(user, within(bracket).getByRole('button', { name: /Final: .*Enter result/ }), 2, 2)
    expect(within(dialog).getByText('Knockout matches need a winner — add the penalty shoot-out')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('radio', { name: 'Penalties' }))
    await user.click(within(dialog).getByRole('button', { name: /Piyush penalties: one more/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Save result' }))
    const banner = await screen.findByRole('region', { name: 'Champion' })
    expect(banner).toHaveTextContent('Piyush')
  })
})

describe('the sample crew', () => {
  it('shows rankings, records and a full head-to-head grid', async () => {
    const { user } = renderApp('#/login')
    await loadSamples(user)
    const ranks = screen.getByRole('region', { name: 'Power rankings' })
    expect(within(ranks).getAllByRole('listitem')).toHaveLength(6)
    expect(screen.getByRole('region', { name: 'Crew records' })).toHaveTextContent('Biggest win')
    await user.click(screen.getByRole('tab', { name: 'Head-to-head' }))
    const grid = await screen.findByRole('table', { name: 'Head-to-head record of every pair of players' })
    expect(within(grid).getAllByRole('row')).toHaveLength(7)
    expect(screen.getByRole('combobox', { name: 'First player' })).toHaveDisplayValue('Demo')
  })

  it('tabs follow the keyboard pattern and the URL', async () => {
    const { user } = renderApp('#/login')
    await loadSamples(user)
    screen.getByRole('tab', { name: 'Overview' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Competitions' })).toHaveAttribute('aria-selected', 'true')
    expect(window.location.hash).toContain('tab=competitions')
    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Players' })).toHaveFocus()
  })

  it('plays a friendly with a fair club spin and counts it', async () => {
    const { user } = renderApp('#/login')
    await loadSamples(user)
    await user.click(screen.getAllByRole('button', { name: 'Play a friendly' })[0])
    const d = await screen.findByRole('dialog', { name: 'Play a friendly' })
    await user.selectOptions(within(d).getByRole('combobox', { name: 'Away player' }), 'Arjun')
    await user.click(within(d).getByRole('radio', { name: '4★' }))
    await user.click(within(d).getByRole('button', { name: 'Spin clubs' }))
    const homeClub = within(d).getByLabelText('Demo played as') as HTMLInputElement
    const awayClub = within(d).getByLabelText('Arjun played as') as HTMLInputElement
    await waitFor(() => expect(within(d).getByRole('button', { name: 'Spin clubs' })).not.toHaveAttribute('aria-busy'))
    const fours = CLUBS.filter((c) => c.stars === 4).map((c) => c.name)
    expect(fours).toContain(homeClub.value)
    expect(fours).toContain(awayClub.value)
    expect(homeClub.value).not.toBe(awayClub.value)
    const [h] = within(d).getAllByRole('spinbutton')
    await user.clear(h)
    await user.type(h, '5')
    await user.click(within(d).getByRole('button', { name: 'Save result' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    const latest = screen.getByRole('region', { name: 'Latest results' })
    expect(within(latest).getAllByRole('button')[0]).toHaveAccessibleName(/^Demo 5–0 Arjun, friendly/)
  })

  it('manages the squad: add, recolour and remove a player', async () => {
    const { user } = renderApp('#/login')
    await loadSamples(user)
    await user.click(screen.getByRole('tab', { name: 'Players' }))
    await user.type(await screen.findByLabelText("New player's name"), 'Vikram')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    const squad = await screen.findByRole('region', { name: 'Squad · 7' })
    await user.click(within(squad).getByRole('button', { name: 'Edit Vikram' }))
    const d = await screen.findByRole('dialog', { name: 'Edit player' })
    await user.click(within(d).getByRole('radio', { name: 'Colour 9' }))
    await user.click(within(d).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await user.click(within(squad).getByRole('button', { name: 'Remove Vikram' }))
    await user.click(within(await screen.findByRole('dialog', { name: 'Remove Vikram?' })).getByRole('button', { name: 'Remove' }))
    expect(await screen.findByRole('region', { name: 'Squad · 6' })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Squad · 6' })).queryByRole('button', { name: 'Remove Rohan' })).toBeInTheDocument()
  })
})
