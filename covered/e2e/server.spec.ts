import { expect, test } from '@playwright/test'
import { PNG, addItem, signUp } from './helpers.ts'

test.describe('production server (Express + SQLite)', () => {
  test('items and bills live on the server: a new device sees them, another account does not', async ({ browser }) => {
    const laptop = await browser.newContext()
    const page = await laptop.newPage()
    const address = await signUp(page, 'Piyush', 'password123')
    await addItem(page, { name: 'Server fridge', brand: 'LG', preset: /Compressor · 10 years/, bill: { name: 'fridge.png', mimeType: 'image/png', buffer: PNG } })
    await expect(page.getByRole('button', { name: /fridge\.png/ }).locator('img')).toHaveJSProperty('naturalWidth', 1)

    // Same account on a different device (fresh browser, no local data).
    const phone = await browser.newContext()
    const p2 = await phone.newPage()
    await p2.goto('/#/login')
    await p2.getByLabel('Email').fill(address)
    await p2.getByLabel('Password').fill('password123')
    await p2.getByRole('button', { name: 'Sign in' }).click()
    await p2.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'My things' }).click()
    await p2.getByRole('link', { name: /Server fridge/ }).click()
    await expect(p2.getByRole('button', { name: /fridge\.png/ }).locator('img')).toHaveJSProperty('naturalWidth', 1)

    // A stranger gets nothing — not even a hint the item exists.
    const other = await browser.newContext()
    const p3 = await other.newPage()
    await signUp(p3, 'Stranger')
    const id = page.url().match(/items\/(\d+)/)![1]
    await p3.goto(`/#/items/${id}`)
    await expect(p3.getByRole('heading', { name: "We couldn't find that item" })).toBeVisible()

    await laptop.close()
    await phone.close()
    await other.close()
  })

  test('sends security headers and refuses requests without a session', async ({ request }) => {
    for (const path of ['/api/items', '/api/files/1', '/api/dashboard']) {
      const res = await request.get(path)
      expect(res.status(), path).toBe(401)
      expect(res.headers()['x-content-type-options']).toBe('nosniff')
      expect(res.headers()['x-frame-options']).toBe('DENY')
    }
  })
})
