import { expect, type Page } from '@playwright/test'

export const email = (name: string) => `${name.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`

/** A tiny but real PDF, like a downloaded e-bill. */
export const PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n',
)
export const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')

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
  await page.getByRole('button', { name: 'Explore with sample items' }).click()
  await expect(page.getByRole('heading', { name: 'Is it covered?' })).toBeVisible()
}

export const mainNav = (page: Page) => page.getByRole('navigation', { name: 'Main' })

/** Adds an item through the real form. */
export async function addItem(page: Page, { name, brand = '', preset, bill }: { name: string; brand?: string; preset?: RegExp; bill?: { name: string; mimeType: string; buffer: Buffer } }) {
  await page.goto('./#/items/new')
  await page.getByLabel('Name').fill(name)
  if (brand) await page.getByLabel('Brand').fill(brand)
  if (preset) await page.getByRole('button', { name: preset }).click()
  if (bill) await page.getByLabel('Choose bill files').setInputFiles(bill)
  await page.getByRole('button', { name: /^Save/ }).click()
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
}
