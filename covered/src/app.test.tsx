import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { renderApp, loadSamples, signUp } from './test/renderApp.tsx'
import { addDays, addMonths, formatDate } from '../shared/dates.ts'
import { localToday } from './lib/dates.ts'

const PNG = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='), (c) => c.charCodeAt(0))

describe('accounts', () => {
  it('sends signed-out visitors to sign in and back to the page they wanted', async () => {
    const { user } = renderApp('#/settings')
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    await signUp(user)
    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
  })

  it('welcomes a new account with a way to start', async () => {
    const { user } = renderApp()
    await signUp(user)
    expect(await screen.findByRole('heading', { name: 'Start with the things that would hurt to repair' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Load sample items' }))
    expect(await screen.findByRole('heading', { name: 'Is it covered?' })).toBeInTheDocument()
    expect(screen.getByText('Things tracked').parentElement).toHaveTextContent('10')
  })
})

describe('adding an item', () => {
  it('adds an item with a part warranty and shows the verdict and timeline', async () => {
    const { user } = renderApp()
    await signUp(user)
    await user.click((await screen.findAllByRole('link', { name: /Add (your first )?item/ }))[0])
    await screen.findByRole('heading', { name: 'Add an item' })

    await user.type(screen.getByLabelText('Name'), 'Kitchen fridge')
    await user.click(screen.getByRole('radio', { name: 'Kitchen' }))
    await user.type(screen.getByLabelText('Brand'), 'LG')
    await user.type(screen.getByLabelText('Price paid (₹)'), '38,490')
    await user.type(screen.getByLabelText(/^Serial number/), 'LG-123')
    await user.click(screen.getByRole('button', { name: /Compressor · 10 years/ }))

    // The live preview answers before saving.
    const today = localToday()
    const end = formatDate(addDays(addMonths(today, 12), -1))
    expect(await screen.findByText(`Yes — covered until ${end}`)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save item' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Kitchen fridge' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: `Yes — covered until ${end}` })).toBeInTheDocument()
    const timeline = screen.getByRole('figure', { name: 'Warranty timeline' })
    expect(timeline).toHaveTextContent(`Compressor from LG: ${formatDate(today)} to ${formatDate(addDays(addMonths(today, 120), -1))}`)
    expect(screen.getByRole('region', { name: 'Claim kit' })).toHaveTextContent('LG-123')
  })

  it('validates with the shared rules and keeps the form', async () => {
    const { user } = renderApp()
    await signUp(user)
    await user.click((await screen.findAllByRole('link', { name: /Add (your first )?item/ }))[0])
    await screen.findByRole('heading', { name: 'Add an item' })
    await user.type(screen.getByLabelText('Price paid (₹)'), '12.345')
    const length = screen.getByLabelText('Length')
    await user.clear(length)
    await user.click(screen.getByRole('button', { name: 'Save item' }))
    expect(await screen.findByText('What is it? e.g. “Living room AC”')).toBeInTheDocument()
    expect(screen.getByText('Enter an amount like 54,990 or 54990.50')).toBeInTheDocument()
    expect(screen.getByText('How long?')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true')
  })

  it('asks before throwing away unsaved changes', async () => {
    const { user } = renderApp()
    await signUp(user)
    await user.click((await screen.findAllByRole('link', { name: /Add (your first )?item/ }))[0])
    await user.type(await screen.findByLabelText('Name'), 'Half-typed')
    const nav = screen.getByRole('navigation', { name: 'Main' })
    await user.click(within(nav).getByRole('link', { name: 'My things' }))
    const dialog = await screen.findByRole('dialog', { name: 'Leave without saving?' })
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.getByLabelText('Name')).toHaveValue('Half-typed')
    await user.click(within(nav).getByRole('link', { name: 'My things' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Discard changes' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'My things' })).toBeInTheDocument()
  })
})

describe('is it covered?', () => {
  it('answers in plain words, understanding "fridge"', async () => {
    const { user } = renderApp('#/login')
    await loadSamples(user)
    await user.type(screen.getByRole('searchbox', { name: 'Search your things' }), 'fridge')
    const answer = await screen.findByRole('link', { name: /Refrigerator/ })
    expect(answer).toHaveTextContent('Only some parts')
    expect(answer).toHaveTextContent(/Compressor until/)
    await user.clear(screen.getByRole('searchbox', { name: 'Search your things' }))
    await user.type(screen.getByRole('searchbox', { name: 'Search your things' }), 'toaster')
    expect(await screen.findByText(/Nothing matches “toaster”/)).toBeInTheDocument()
  })

  it('lists what ends soon and flags missing bills', async () => {
    const { user } = renderApp('#/login')
    await loadSamples(user)
    const upcoming = screen.getByRole('region', { name: 'Cover ending in the next 6 months' })
    expect(within(upcoming).getAllByRole('link')[0]).toHaveTextContent(/24\s*days\s*Living room AC/)
    await user.click(screen.getByRole('link', { name: /2 items have no bill saved/ }))
    await screen.findByRole('heading', { level: 1, name: 'My things' })
    await waitFor(() => expect(screen.getAllByRole('listitem').filter((li) => li.classList.contains('item-card'))).toHaveLength(2))
    expect(screen.getByRole('button', { name: /No bill saved/ })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('my things', () => {
  it('filters by status from the URL and sorts by soonest end', async () => {
    const { user } = renderApp('#/login')
    await loadSamples(user)
    await user.click(screen.getByRole('link', { name: 'My things' }))
    await screen.findByRole('heading', { level: 1, name: 'My things' })
    const names = () => screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(names().slice(0, 3)).toEqual(['Living room AC', 'Living room TV', 'Washing machine'])
    expect(names().at(-1)).toBe('Water purifier')
    await user.click(screen.getByRole('button', { name: /Parts covered/ }))
    expect(names().sort()).toEqual(['Living room TV', 'Refrigerator'])
    expect(window.location.hash).toContain('status=partial')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'kitchen')
    expect(names()).toEqual(['Refrigerator'])
  })
})

describe('item page', () => {
  it('uploads a bill photo, logs a repair under warranty, and deletes the item', async () => {
    const { user } = renderApp('#/login')
    await loadSamples(user)
    await user.click(screen.getByRole('link', { name: 'My things' }))
    await user.click(await screen.findByRole('link', { name: /Bedroom fan/ }))
    await screen.findByRole('heading', { level: 1, name: 'Bedroom fan' })
    const files = screen.getByRole('region', { name: 'Bill & photos' })
    expect(files).toHaveTextContent('No bill saved yet')

    await user.upload(within(files).getByLabelText('Add bill or photo'), new File([PNG], 'fan-bill.png', { type: 'image/png' }))
    expect(await within(files).findByRole('button', { name: /fan-bill\.png/ })).toBeInTheDocument()
    await user.click(within(files).getByRole('button', { name: /fan-bill\.png/ }))
    const viewer = await screen.findByRole('dialog', { name: 'fan-bill.png' })
    expect(within(viewer).getByRole('img', { name: 'fan-bill.png' })).toBeInTheDocument()
    await user.click(within(viewer).getByRole('button', { name: 'Done' }))

    await user.click(screen.getByRole('button', { name: 'Log a repair' }))
    const d = await screen.findByRole('dialog', { name: 'Log a repair or claim' })
    await waitFor(() => expect(within(d).getByLabelText('What went wrong?')).toHaveFocus())
    expect(within(d).getByRole('checkbox', { name: /Claimed under warranty/ })).toBeChecked() // the fan is covered today
    await user.type(within(d).getByLabelText('What went wrong?'), 'Wobbles at high speed')
    await user.type(within(d).getByLabelText('Complaint / ticket number'), 'HV-77')
    await user.click(within(d).getByRole('button', { name: 'Log repair' }))
    const history = await screen.findByRole('region', { name: 'Repairs & claims' })
    expect(await within(history).findByText('Wobbles at high speed')).toBeInTheDocument()
    expect(history).toHaveTextContent('Under warranty')
    expect(history).toHaveTextContent('HV-77')

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(within(await screen.findByRole('dialog', { name: 'Delete Bedroom fan?' })).getByRole('button', { name: 'Delete item' }))
    await screen.findByRole('heading', { level: 1, name: 'My things' })
    await waitFor(() => expect(screen.queryByRole('heading', { level: 2, name: 'Bedroom fan' })).toBeNull())
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(9)
  })

  it('builds a claim message with everything the service centre asks for', async () => {
    const { user } = renderApp('#/login')
    await loadSamples(user)
    await user.click(screen.getByRole('link', { name: 'My things' }))
    await user.click(await screen.findByRole('link', { name: /Living room AC/ }))
    const kit = await screen.findByRole('region', { name: 'Claim kit' })
    await user.click(within(kit).getByText('Message for the service centre'))
    const msg = kit.querySelector('pre')!.textContent!
    expect(msg).toContain('Product: Voltas 1.5 T 5-star inverter split (Living room AC)')
    expect(msg).toContain('Serial number: VTS185VX5521')
    expect(msg).toContain('invoice BLE-24-118375')
    expect(msg).toMatch(/Warranty: Standard warranty valid until .*; Compressor cover valid until/)
    expect(msg.trim().endsWith('Demo')).toBe(true)
    await user.click(within(kit).getByRole('button', { name: 'Copy message' }))
    expect(await navigator.clipboard.readText()).toBe(msg)
  })
})

describe('settings', () => {
  it('changing the reminder window changes what counts as "ending soon"', async () => {
    const { user } = renderApp('#/login')
    await loadSamples(user)
    expect(screen.getByText('Ending soon').closest('a')).toHaveTextContent(/Ending soon\s*1/)
    await user.click(screen.getByRole('link', { name: 'Settings' }))
    await user.click(await screen.findByRole('radio', { name: '60 days' }))
    expect(await screen.findByText("You'll be warned 60 days before cover ends")).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Home' }))
    await waitFor(() => expect(screen.getByText('Ending soon').closest('a')).toHaveTextContent(/Ending soon\s*2/))
  })
})
