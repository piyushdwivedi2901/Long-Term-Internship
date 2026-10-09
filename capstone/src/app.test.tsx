import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { renderApp, signUp } from './test/renderApp.tsx'

describe('authentication', () => {
  it('sends signed-out visitors to sign in, and back to where they were going', async () => {
    const { user } = renderApp('#/tasks')
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    await signUp(user)
    expect(await screen.findByRole('heading', { level: 1, name: 'My tasks' })).toBeInTheDocument()
  })

  it('shows field errors from the shared schema', async () => {
    const { user } = renderApp('#/signup')
    await user.click(await screen.findByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('Enter your name')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  it('reports wrong credentials without revealing which part was wrong', async () => {
    const { user } = renderApp('#/login')
    await user.type(await screen.findByLabelText('Email'), 'nobody@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect')
  })

  it('"Explore with sample data" opens a populated workspace', async () => {
    const { user } = renderApp('#/login')
    await user.click(await screen.findByRole('button', { name: 'Explore with sample data' }))
    const lines = await screen.findByRole('region', { name: 'Lines' }, { timeout: 4000 })
    expect(within(lines).getByRole('link', { name: /Website relaunch/ })).toBeInTheDocument()
    expect(screen.getByText(/8 open tasks/)).toBeInTheDocument()
  })

  it('signs out from the account menu', async () => {
    const { user } = renderApp()
    await signUp(user)
    await user.click(screen.getByRole('button', { name: /Account menu/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }))
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })
})

describe('projects and tasks', () => {
  it('creates a project, adds a task to a column and edits it in the drawer', async () => {
    const { user } = renderApp()
    await signUp(user)
    expect(await screen.findByRole('heading', { name: 'Start your first line' })).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'New project' })[0])
    const dialog = await screen.findByRole('dialog', { name: 'New project' })
    await user.click(within(dialog).getByRole('button', { name: 'Create project' }))
    expect(await within(dialog).findByText('Give the project a name')).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText('Name'), 'Capstone')
    await user.click(within(dialog).getByRole('radio', { name: 'Teal' }))
    await user.click(within(dialog).getByRole('button', { name: 'Create project' }))

    expect(await screen.findByRole('heading', { level: 1, name: /Capstone/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add the first task' }))
    const taskDialog = await screen.findByRole('dialog', { name: 'New task' })
    await user.selectOptions(within(taskDialog).getByLabelText('Status'), 'review')
    await user.type(within(taskDialog).getByLabelText('Title'), 'Write the README')
    await user.type(within(taskDialog).getByLabelText('Labels'), 'Docs, docs, writing')
    await user.click(within(taskDialog).getByRole('button', { name: 'Add task' }))

    const column = await screen.findByRole('region', { name: 'In review' })
    await within(column).findByText('Write the README')
    expect(within(column).getByText('docs')).toBeInTheDocument() // labels de-duplicated and lower-cased

    await user.click(within(column).getByRole('button', { name: 'Write the README' }))
    const drawer = await screen.findByRole('dialog', { name: 'Task details' })
    const title = within(drawer).getByLabelText('Title')
    await user.clear(title)
    await user.type(title, 'Write the capstone README')
    await user.click(within(drawer).getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(within(column).getByText('Write the capstone README')).toBeInTheDocument())

    await user.type(within(drawer).getByLabelText('New checklist item'), 'Screenshots')
    await user.click(within(drawer).getByRole('button', { name: 'Add' }))
    expect(await within(drawer).findByText('0 of 1')).toBeInTheDocument()
    await user.click(within(drawer).getByRole('checkbox', { name: 'Screenshots' }))
    expect(await within(drawer).findByText('1 of 1')).toBeInTheDocument()

    await user.type(within(drawer).getByLabelText('Write a comment'), 'Looks good')
    await user.click(within(drawer).getByRole('button', { name: 'Comment' }))
    expect(await within(drawer).findByText('Looks good')).toBeInTheDocument()

    await user.click(within(drawer).getByRole('button', { name: 'Done' }))
    await waitFor(() => expect(within(screen.getByRole('region', { name: 'Done' })).getByText('Write the capstone README')).toBeInTheDocument())

    await user.click(within(drawer).getByRole('button', { name: 'Delete task' }))
    const confirm = await screen.findByRole('dialog', { name: 'Delete this task?' })
    expect(within(confirm).getByRole('button', { name: 'Cancel' })).toHaveFocus()
    await user.click(within(confirm).getByRole('button', { name: 'Delete task' }))
    await waitFor(() => expect(screen.queryByText('Write the capstone README')).toBeNull())
  })

  it('filters the board and the My tasks list', async () => {
    const { user } = renderApp('#/login')
    await user.click(await screen.findByRole('button', { name: 'Explore with sample data' }))
    await screen.findByRole('region', { name: 'Lines' }, { timeout: 4000 })

    await user.click(within(screen.getByRole('region', { name: 'Lines' })).getByRole('link', { name: /Website relaunch/ }))
    await screen.findByRole('region', { name: 'To do' })
    await user.type(screen.getByLabelText('Filter tasks'), 'nav')
    expect(await screen.findByText(/Showing 1 matching task/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Move “/ })).toBeNull() // reordering disabled while filtered

    await user.click(screen.getByRole('link', { name: 'My tasks' }))
    expect(await screen.findByRole('heading', { name: /^Overdue/ })).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Priority'), 'urgent')
    await waitFor(() => expect(screen.getAllByRole('checkbox', { name: /^Complete/ })).toHaveLength(1))
    await user.click(screen.getByRole('checkbox', { name: 'Complete “Fix mobile nav overlap”' }))
    expect(await screen.findByText('Completed “Fix mobile nav overlap”')).toBeInTheDocument()
  })
})

describe('app-wide features', () => {
  it('opens the command palette with Ctrl+K and jumps to a task', async () => {
    const { user } = renderApp('#/login')
    await user.click(await screen.findByRole('button', { name: 'Explore with sample data' }))
    await screen.findByRole('region', { name: 'Lines' }, { timeout: 4000 })
    await user.keyboard('{Control>}k{/Control}')
    const box = await screen.findByRole('combobox', { name: /Search projects/ })
    await user.type(box, 'passport')
    expect(await screen.findByRole('option', { name: /Renew passport/ })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{Enter}')
    const drawer = await screen.findByRole('dialog', { name: 'Task details' })
    expect(await within(drawer).findByLabelText('Title')).toHaveValue('Renew passport')
  })

  it('switches theme and remembers it', async () => {
    const { user } = renderApp()
    await signUp(user)
    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('flowboard:theme')).toBe('dark')
  })

  it('deletes the account after password confirmation', async () => {
    const { user } = renderApp()
    await signUp(user)
    await user.click(screen.getByRole('link', { name: 'Settings' }))
    await user.click(await screen.findByRole('button', { name: 'Delete my account' }))
    const dialog = await screen.findByRole('dialog', { name: 'Delete your account?' })
    await user.type(within(dialog).getByLabelText(/password/), 'wrong-password')
    await user.click(within(dialog).getByRole('button', { name: 'Delete account' }))
    expect(await within(dialog).findByText('That password is incorrect')).toBeInTheDocument()
    await user.clear(within(dialog).getByLabelText(/password/))
    await user.type(within(dialog).getByLabelText(/password/), 'password123')
    await user.click(within(dialog).getByRole('button', { name: 'Delete account' }))
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('shows a not-found page for unknown routes and projects', async () => {
    const { user } = renderApp()
    await signUp(user)
    window.location.hash = '#/projects/9999'
    expect(await screen.findByRole('heading', { name: "This project doesn't exist" })).toBeInTheDocument()
    window.location.hash = '#/nope'
    expect(await screen.findByRole('heading', { name: "This page doesn't exist" })).toBeInTheDocument()
  })
})
