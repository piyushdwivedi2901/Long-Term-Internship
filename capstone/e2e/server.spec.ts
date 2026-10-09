import { expect, test } from '@playwright/test'
import { addTask, column, createProject, signUp } from './helpers.ts'

test.describe('production server (Express + SQLite serving the app)', () => {
  test('data lives on the server: survives a fresh browser and is private per user', async ({ browser, page }) => {
    const apiCalls: string[] = []
    page.on('request', (r) => r.url().includes('/api/') && apiCalls.push(`${r.method()} ${new URL(r.url()).pathname}`))

    await signUp(page, 'Server User')
    await createProject(page, 'Server project')
    await addTask(page, 'Stored in SQLite')
    expect(apiCalls).toContain('POST /api/tasks')

    // Same account, brand-new browser context (no localStorage): sign in and see the data.
    const token = await page.evaluate(() => localStorage.getItem('flowboard:token'))
    const email = await page.evaluate(async (t) => (await (await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${t}` } })).json()).user.email, token)
    const fresh = await browser.newContext()
    const p2 = await fresh.newPage()
    await p2.goto('/#/login')
    await p2.getByLabel('Email').fill(email)
    await p2.getByLabel('Password').fill('password123')
    await p2.getByRole('button', { name: 'Sign in' }).click()
    await p2.getByRole('link', { name: 'Server project' }).first().click()
    await expect(column(p2, 'To do').getByText('Stored in SQLite')).toBeVisible()

    // A different user sees none of it.
    const other = await browser.newContext()
    const p3 = await other.newPage()
    await signUp(p3, 'Someone Else')
    await expect(p3.getByRole('heading', { name: 'Start your first line' })).toBeVisible()
    await fresh.close()
    await other.close()
  })

  test('sends security headers and rejects requests without a session', async ({ request }) => {
    const res = await request.get('/api/projects')
    expect(res.status()).toBe(401)
    expect(res.headers()['x-content-type-options']).toBe('nosniff')
    expect(res.headers()['x-frame-options']).toBe('DENY')
  })
})
