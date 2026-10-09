import { expect, type Page } from '@playwright/test'

export const email = (name: string) => `${name.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`

export async function signUp(page: Page, name: string) {
  await page.goto('./#/signup')
  await page.getByLabel(/^Your name/).fill(name)
  const address = email(name)
  await page.getByLabel('Email').fill(address)
  await page.getByLabel(/^Password/).fill('password123')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('button', { name: /Account menu/ })).toBeVisible()
  return address
}

export async function signOut(page: Page) {
  await page.getByRole('button', { name: /Account menu/ }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
}

export async function createGroup(page: Page, name: string, people: string[]) {
  await page.getByRole('button', { name: /New group|Create a group/ }).first().click()
  const d = page.getByRole('dialog', { name: 'New group' })
  await d.getByLabel('Group name').fill(name)
  for (const p of people) {
    await d.getByLabel("Who's in it, besides you?").fill(p)
    await d.getByLabel("Who's in it, besides you?").press('Enter')
  }
  await d.getByRole('button', { name: 'Create group' }).click()
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
}

export async function addExpense(page: Page, amount: string, description: string, configure?: (d: ReturnType<Page['getByRole']>) => Promise<void>) {
  await page.getByRole('button', { name: /^Add (the first )?expense$/ }).first().click()
  const d = page.getByRole('dialog', { name: 'Add an expense' })
  await d.getByLabel(/^Amount/).fill(amount)
  await d.getByLabel('What was it for?').fill(description)
  await configure?.(d)
  await d.getByRole('button', { name: 'Add expense' }).click()
  await expect(d).toBeHidden()
}

export async function exploreSample(page: Page) {
  await page.goto('./#/login')
  await page.getByRole('button', { name: 'Explore with sample groups' }).click()
  await expect(page.getByRole('heading', { name: 'Your balances' })).toBeVisible()
}
