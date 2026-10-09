import { expect, type Locator, type Page } from '@playwright/test'

export const email = (name: string) => `${name.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`

export async function signUp(page: Page, name: string, password = 'password123') {
  await page.goto('./#/signup')
  await page.getByLabel(/^Your name/).fill(name)
  const address = email(name)
  await page.getByLabel('Email').fill(address)
  await page.getByLabel(/^Password/).fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('button', { name: /Account menu/ })).toBeVisible()
  return address
}

export async function exploreSample(page: Page) {
  await page.goto('./#/login')
  await page.getByRole('button', { name: 'Explore with a sample crew' }).click()
  await page.getByRole('link', { name: /Hostel Room 12/ }).click()
  await expect(page.getByRole('heading', { name: 'Power rankings' })).toBeVisible()
}

export async function startCrew(page: Page, name: string, people: string[]) {
  await page.getByRole('button', { name: 'Start a crew' }).first().click()
  const d = page.getByRole('dialog', { name: 'Start a crew' })
  await d.getByLabel('Crew name').fill(name)
  for (const p of people) {
    await d.getByLabel('Who plays, besides you?').fill(p)
    await d.getByLabel('Who plays, besides you?').press('Enter')
  }
  await d.getByRole('button', { name: 'Create crew' }).click()
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
}

/** Types a score into the open result dialog and saves. */
export async function saveScore(dialog: Locator, home: number, away: number) {
  const [h, a] = [dialog.getByRole('spinbutton').nth(0), dialog.getByRole('spinbutton').nth(1)]
  await h.fill(String(home))
  await a.fill(String(away))
  await dialog.getByRole('button', { name: 'Save result' }).click()
  await expect(dialog).toBeHidden()
}
