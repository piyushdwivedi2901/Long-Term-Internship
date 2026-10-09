import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import type userEvent from '@testing-library/user-event'
import { renderApp, signUp } from './test/renderApp.tsx'

type User = ReturnType<typeof userEvent.setup>

async function createGroup(user: User, name: string, people: string[]) {
  await user.click((await screen.findAllByRole('button', { name: /New group|Create a group/ }))[0])
  const d = await screen.findByRole('dialog', { name: 'New group' })
  await waitFor(() => expect(within(d).getByLabelText('Group name')).toHaveFocus())
  await user.type(within(d).getByLabelText('Group name'), name)
  for (const p of people) await user.type(within(d).getByLabelText("Who's in it, besides you?"), `${p}{Enter}`)
  await user.click(within(d).getByRole('button', { name: 'Create group' }))
  await screen.findByRole('heading', { level: 1, name })
}

async function addExpense(user: User, amount: string, description: string, setup?: (d: HTMLElement) => Promise<void>) {
  await user.click((await screen.findAllByRole('button', { name: /Add (the first )?expense/ }))[0])
  const d = await screen.findByRole('dialog', { name: 'Add an expense' })
  await waitFor(() => expect(within(d).getByLabelText(/^Amount/)).toHaveFocus()) // dialog fully mounted
  await user.type(within(d).getByLabelText(/^Amount/), amount)
  await user.type(within(d).getByLabelText('What was it for?'), description)
  await setup?.(d)
  await user.click(within(d).getByRole('button', { name: 'Add expense' }))
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add an expense' })).toBeNull())
}

describe('accounts', () => {
  it('sends signed-out visitors to sign in and back to the page they wanted', async () => {
    const { user } = renderApp('#/settings')
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    await signUp(user)
    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
  })

  it('validates sign-up fields with the shared rules', async () => {
    const { user } = renderApp('#/signup')
    await user.click(await screen.findByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('Enter a name')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
    expect(screen.getByText('Use at least 8 characters')).toBeInTheDocument()
  })

  it('"Explore with sample groups" shows balances per currency', async () => {
    const { user } = renderApp('#/login')
    await user.click(await screen.findByRole('button', { name: 'Explore with sample groups' }))
    expect(await screen.findByRole('region', { name: 'INR balance' })).toHaveTextContent('Overall, you are owed')
    expect(screen.getByRole('region', { name: 'EUR balance' })).toHaveTextContent('Overall, you owe€97.95')
    expect(screen.getByRole('link', { name: /Goa trip/ })).toBeInTheDocument()
  })
})

describe('splitting expenses', () => {
  it('creates a group, splits a bill equally and shows who owes what', async () => {
    const { user } = renderApp()
    await signUp(user)
    await createGroup(user, 'Dinner club', ['Aisha', 'Rohan'])
    await addExpense(user, '900', 'Pizza night')

    expect(await screen.findByText('Pizza night')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Pizza night/ })).toHaveTextContent('you lent₹600.00')
    expect(screen.getByText(/You're owed/)).toHaveTextContent("You're owed ₹600.00")

    await user.click(screen.getByRole('tab', { name: /Balances/ }))
    const plan = await screen.findByRole('region', { name: 'Settle-up plan' })
    expect(within(plan).getByRole('listitem', { name: 'Aisha pays you ₹300.00' })).toBeInTheDocument()
    expect(within(plan).getByRole('listitem', { name: 'Rohan pays you ₹300.00' })).toBeInTheDocument()
  })

  it('previews exact splits live and blocks totals that don\'t add up', async () => {
    const { user } = renderApp()
    await signUp(user)
    await createGroup(user, 'Flat', ['Kabir'])
    await user.click((await screen.findAllByRole('button', { name: /Add (the first )?expense/ }))[0])
    const d = await screen.findByRole('dialog', { name: 'Add an expense' })
    await user.type(within(d).getByLabelText(/^Amount/), '1000')
    await user.type(within(d).getByLabelText('What was it for?'), 'Rent deposit')
    await user.click(within(d).getByRole('radio', { name: 'Exact amounts' }))
    await user.type(within(d).getByLabelText('Amount for Piyush'), '600')
    expect(within(d).getByText('₹400.00 left to assign')).toBeInTheDocument()
    await user.click(within(d).getByRole('button', { name: 'Add expense' }))
    expect(await within(d).findByRole('alert')).toHaveTextContent('₹400.00 still to assign')
    await user.type(within(d).getByLabelText('Amount for Kabir'), '400')
    expect(within(d).getByLabelText('Kabir owes ₹400.00')).toBeInTheDocument()
    await user.click(within(d).getByRole('button', { name: 'Add expense' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add an expense' })).toBeNull())
    expect(await screen.findByText('Rent deposit')).toBeInTheDocument()
  })

  it('splits by shares and by percentage', async () => {
    const { user } = renderApp()
    await signUp(user)
    await createGroup(user, 'Trip', ['Aisha'])
    await addExpense(user, '300', 'Hotel', async (d) => {
      await user.click(within(d).getByRole('radio', { name: 'Shares' }))
      await user.click(within(d).getByRole('button', { name: 'More shares for Aisha' }))
      expect(within(d).getByLabelText('Aisha owes ₹200.00')).toBeInTheDocument()
    })
    await addExpense(user, '100', 'Snacks', async (d) => {
      await user.click(within(d).getByRole('radio', { name: 'Percentages' }))
      await user.type(within(d).getByLabelText('Percent for Piyush'), '25')
      await user.type(within(d).getByLabelText('Percent for Aisha'), '75')
      expect(within(d).getByLabelText('Aisha owes ₹75.00')).toBeInTheDocument()
    })
    // Aisha owes 200 + 75 = 275
    expect(await screen.findByText(/You're owed/)).toHaveTextContent('₹275.00')
  })

  it('records a payment from the settle-up plan and the group becomes settled', async () => {
    const { user } = renderApp()
    await signUp(user)
    await createGroup(user, 'Cab share', ['Meera'])
    await addExpense(user, '500', 'Airport cab')
    await user.click(screen.getByRole('tab', { name: /Balances/ }))
    await user.click(await screen.findByRole('button', { name: 'Record payment: Meera pays you ₹250.00' }))
    const d = await screen.findByRole('dialog', { name: 'Record a payment' })
    expect(within(d).getByLabelText('Amount')).toHaveValue('250')
    await user.click(within(d).getByRole('button', { name: 'Record payment' }))
    expect(await screen.findByText('Everyone is settled up.')).toBeInTheDocument()
    expect(screen.getByText("You're settled up")).toBeInTheDocument()
  })

  it('edits and deletes an expense from its detail view', async () => {
    const { user } = renderApp()
    await signUp(user)
    await createGroup(user, 'Edits', ['Sam'])
    await addExpense(user, '200', 'Coffee')
    await user.click(await screen.findByRole('button', { name: /Coffee/ }))
    const detail = await screen.findByRole('dialog', { name: 'Coffee' })
    expect(within(detail).getByRole('list', { name: 'Who owes what' })).toHaveTextContent('Sam₹100.00')
    await user.click(within(detail).getByRole('button', { name: 'Edit' }))
    const edit = await screen.findByRole('dialog', { name: 'Edit expense' })
    const amount = within(edit).getByLabelText(/^Amount/)
    await user.clear(amount)
    await user.type(amount, '260')
    await user.click(within(edit).getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Coffee/ })).toHaveTextContent('you lent₹130.00'))

    await user.click(screen.getByRole('button', { name: /Coffee/ }))
    await user.click(within(await screen.findByRole('dialog', { name: 'Coffee' })).getByRole('button', { name: 'Delete' }))
    await user.click(within(await screen.findByRole('dialog', { name: 'Delete this expense?' })).getByRole('button', { name: 'Delete expense' }))
    expect(await screen.findByText('No expenses yet')).toBeInTheDocument()
  })
})

describe('sharing a group', () => {
  it('a second account joins with the invite code as an existing person', async () => {
    const { user } = renderApp()
    await signUp(user, 'Piyush')
    await createGroup(user, 'Goa', ['Aisha'])
    await addExpense(user, '1000', 'Villa deposit')
    await user.click(screen.getByRole('tab', { name: 'People' }))
    const code = (await screen.findByLabelText(/^Invite code/)).textContent!

    // Sign out, sign up as Aisha (same browser = same demo database)
    await user.click(screen.getByRole('button', { name: /Account menu/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }))
    await signUp(user, 'Aisha')
    await user.click((await screen.findAllByRole('button', { name: 'Join with a code' }))[0])
    const d = await screen.findByRole('dialog', { name: 'Join a group' })
    await user.type(within(d).getByLabelText('Invite code'), code)
    await user.click(within(d).getByRole('button', { name: 'Find group' }))
    await user.click(await within(d).findByRole('radio', { name: "I'm Aisha" }))
    await user.click(within(d).getByRole('button', { name: 'Join group' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Goa' })).toBeInTheDocument()
    expect(screen.getByText(/You owe/)).toHaveTextContent('You owe ₹500.00')
    expect(await screen.findByText('Villa deposit')).toBeInTheDocument()
  })

  it('rejects an unknown invite code', async () => {
    const { user } = renderApp()
    await signUp(user)
    await user.click((await screen.findAllByRole('button', { name: 'Join with a code' }))[0])
    const d = await screen.findByRole('dialog', { name: 'Join a group' })
    await user.type(within(d).getByLabelText('Invite code'), 'ZZZZZZZZ')
    await user.click(within(d).getByRole('button', { name: 'Find group' }))
    expect(await within(d).findByText(/No group uses this invite code/)).toBeInTheDocument()
  })
})
