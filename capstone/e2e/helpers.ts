import { expect, type Page } from '@playwright/test'

export const uniqueEmail = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`

export async function signUp(page: Page, name = 'Piyush Dwivedi') {
  await page.goto('./#/signup')
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Email').fill(uniqueEmail())
  await page.getByLabel(/^Password/).fill('password123')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('button', { name: /Account menu/ })).toBeVisible()
}

export async function exploreDemo(page: Page) {
  await page.goto('./#/login')
  await page.getByRole('button', { name: 'Explore with sample data' }).click()
  await expect(page.getByRole('region', { name: 'Lines' })).toBeVisible()
}

export async function createProject(page: Page, name: string) {
  await page.getByRole('button', { name: 'New project' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'New project' })
  await dialog.getByLabel('Name').fill(name)
  await dialog.getByRole('button', { name: 'Create project' }).click()
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
}

export async function addTask(page: Page, title: string) {
  await page.getByRole('button', { name: 'New task' }).click()
  const dialog = page.getByRole('dialog', { name: 'New task' })
  await dialog.getByLabel('Title').fill(title)
  await dialog.getByRole('button', { name: 'Add task' }).click()
  await expect(dialog).toBeHidden()
}

export const column = (page: Page, name: string) => page.getByRole('region', { name, exact: true })
