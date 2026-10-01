import { expect, test } from '@playwright/test'

test.describe('Navigation', () => {
  test('opens task 1 by default with progress shown', async ({ page }) => {
    await page.goto('./')
    await expect(page.getByRole('button', { name: /^01 · / })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('progressbar', { name: 'Internship progress' })).toBeVisible()
  })

  test('sidebar navigation updates the page, breadcrumb and URL', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: /^23 · / }).click()
    await expect(page).toHaveURL(/#\/d12-t23$/)
    await expect(page.locator('.crumb-current')).toContainText('Task 23')
    await expect(page.getByRole('heading', { name: 'Kanban / Task Board' })).toBeVisible()
  })

  test('deep links open the right task and browser Back works', async ({ page }) => {
    await page.goto('#/d17-t33')
    await expect(page.locator('.crumb-current')).toContainText('Task 33')

    await page.getByRole('button', { name: /^08 · / }).click()
    await expect(page.locator('.crumb-current')).toContainText('Task 08')

    await page.goBack()
    await expect(page.locator('.crumb-current')).toContainText('Task 33')
  })

  test('the sidebar is operable by keyboard (arrow keys move focus, Enter selects)', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: /^01 · / }).focus()
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('button', { name: /^02 · / })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('button', { name: /^02 · / })).toHaveAttribute('aria-current', 'page')
  })

  test('an unknown route falls back to task 1', async ({ page }) => {
    await page.goto('#/does-not-exist')
    await expect(page.getByRole('button', { name: /^01 · / })).toHaveAttribute('aria-current', 'page')
  })
})
