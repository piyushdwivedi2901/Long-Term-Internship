import { expect, test } from '@playwright/test'
import { addExpense, createGroup, signUp } from './helpers.ts'

test.describe('production server (Express + SQLite)', () => {
  test('two people on two devices share one group in real time', async ({ browser }) => {
    const piyushCtx = await browser.newContext()
    const aishaCtx = await browser.newContext()
    const piyush = await piyushCtx.newPage()
    const aisha = await aishaCtx.newPage()

    await signUp(piyush, 'Piyush')
    await createGroup(piyush, 'Goa', ['Aisha'])
    await addExpense(piyush, '2,000', 'Villa deposit')
    await piyush.getByRole('tab', { name: 'People' }).click()
    const code = (await piyush.getByLabel(/^Invite code/).textContent())!

    await signUp(aisha, 'Aisha')
    await aisha.goto(`/#/join/${code}`)
    await aisha.getByRole('radio', { name: "I'm Aisha" }).check()
    await aisha.getByRole('button', { name: 'Join group' }).click()
    await expect(aisha.getByText('You owe ₹1,000.00')).toBeVisible()

    // Aisha records paying Piyush back; Piyush sees it after a refresh on his device.
    await aisha.getByRole('tab', { name: /Balances/ }).click()
    await aisha.getByRole('button', { name: 'Record payment: You pay Piyush ₹1,000.00' }).click()
    await aisha.getByRole('dialog', { name: 'Record a payment' }).getByRole('button', { name: 'Record payment' }).click()
    await expect(aisha.getByText('Everyone is settled up.')).toBeVisible()

    await piyush.reload()
    await expect(piyush.getByText("You're settled up")).toBeVisible()
    await piyushCtx.close()
    await aishaCtx.close()
  })

  test('sends security headers and refuses requests without a session', async ({ request }) => {
    const res = await request.get('/api/overview')
    expect(res.status()).toBe(401)
    expect(res.headers()['x-content-type-options']).toBe('nosniff')
    expect(res.headers()['x-frame-options']).toBe('DENY')
  })
})
