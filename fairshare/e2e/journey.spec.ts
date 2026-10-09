import { expect, test } from '@playwright/test'
import { addExpense, createGroup, exploreSample, signOut, signUp } from './helpers.ts'

test('a weekend trip: split, check balances, settle up, and it all survives a reload', async ({ page }) => {
  await signUp(page, 'Piyush')
  await createGroup(page, 'Weekend in Lonavala', ['Aisha', 'Rohan'])

  await addExpense(page, '3,000', 'Cottage') // equal three ways → each ₹1,000
  await addExpense(page, '900', 'Fuel', async (d) => {
    await d.getByRole('radio', { name: 'Exact amounts' }).click()
    await d.getByLabel('Amount for Piyush').fill('0')
    await d.getByLabel('Amount for Aisha').fill('300')
    await expect(d.getByText('₹600.00 left to assign')).toBeVisible()
    await d.getByLabel('Amount for Rohan').fill('600')
  })
  await expect(page.getByText("You're owed ₹2,900.00")).toBeVisible()

  await page.getByRole('tab', { name: /Balances/ }).click()
  await expect(page.getByRole('listitem', { name: 'Rohan pays you ₹1,600.00' })).toBeVisible()
  await expect(page.getByRole('listitem', { name: 'Aisha pays you ₹1,300.00' })).toBeVisible()
  await page.getByRole('button', { name: 'Record payment: Rohan pays you ₹1,600.00' }).click()
  await page.getByRole('dialog', { name: 'Record a payment' }).getByRole('button', { name: 'Record payment' }).click()
  await expect(page.getByRole('listitem', { name: 'Rohan pays you ₹1,600.00' })).toHaveCount(0)

  await page.reload()
  await expect(page.getByText("You're owed ₹1,300.00")).toBeVisible()
  await expect(page.getByRole('listitem', { name: 'Aisha pays you ₹1,300.00' })).toBeVisible()
})

test('a friend joins from an invite link as themselves and sees their share', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await signUp(page, 'Piyush')
  await createGroup(page, 'Flat 2C', ['Kabir'])
  await addExpense(page, '1,200', 'Internet bill')
  await page.getByRole('tab', { name: 'People' }).click()
  await page.getByRole('button', { name: 'Copy invite link' }).click()
  const link = await page.evaluate(() => navigator.clipboard.readText())
  expect(link).toMatch(/#\/join\/[A-HJ-NP-Z2-9]{8}$/)

  await signOut(page)
  await signUp(page, 'Kabir')
  await page.goto(link)
  await page.getByRole('radio', { name: "I'm Kabir" }).check()
  await page.getByRole('button', { name: 'Join group' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Flat 2C' })).toBeVisible()
  await expect(page.getByText('You owe ₹600.00')).toBeVisible()
  await expect(page.getByRole('button', { name: /Internet bill/ })).toContainText('you borrowed₹600.00')
})

test('exports a group as a CSV file', async ({ page }) => {
  await exploreSample(page)
  await page.getByRole('region', { name: 'Groups' }).getByRole('link', { name: /Flat 4B/ }).click()
  await page.getByRole('tab', { name: 'People' }).click()
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export as CSV' }).click()])
  expect(download.suggestedFilename()).toBe('flat-4b-expenses.csv')
  const text = (await (await download.createReadStream()).toArray()).join('')
  expect(text).toContain('Date,Description,Category,Amount (INR),Paid by')
  expect(text).toContain('Electricity bill,Utilities,3124.00,Kabir')
})

test('keyboard: tabs move with arrow keys and dialogs trap focus', async ({ page }) => {
  await exploreSample(page)
  await page.getByRole('link', { name: /Goa trip/ }).click()
  await page.getByRole('tab', { name: 'Expenses' }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: /Balances/ })).toBeFocused()
  await expect(page.getByRole('tab', { name: /Balances/ })).toHaveAttribute('aria-selected', 'true')

  await page.getByRole('button', { name: 'Add expense' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Add an expense' })
  await expect(dialog.getByLabel(/^Amount/)).toBeFocused()
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})

test('works one-handed on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await exploreSample(page)
  await page.locator('main').getByRole('link', { name: /Goa trip/ }).click()
  await page.getByRole('button', { name: 'Add expense' }).last().click() // the floating button
  await expect(page.getByRole('dialog', { name: 'Add an expense' })).toBeInViewport()
  await page.keyboard.press('Escape')
  const nav = page.getByRole('navigation', { name: 'Main' })
  const box = (await nav.boundingBox())!
  expect(box.y + box.height).toBeGreaterThan(800) // bottom tab bar
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
})
