import { expect, test } from '@playwright/test'

test.describe('Todo flow', () => {
  test('add, complete, filter and delete a task (Task 8)', async ({ page }) => {
    await page.goto('#/d4-t8')
    await expect(page.getByRole('heading', { name: 'To-Do List' })).toBeVisible()

    await page.getByPlaceholder('Add a task...').fill('Write E2E tests')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    const item = page.getByRole('listitem').filter({ hasText: 'Write E2E tests' })
    await expect(item).toBeVisible()

    await item.getByRole('checkbox').check()
    await expect(item).toHaveClass(/done/)

    await page.getByRole('button', { name: 'Active', exact: true }).click()
    await expect(item).toHaveCount(0)
    await page.getByRole('button', { name: 'Done', exact: true }).click()
    await expect(item).toBeVisible()

    await item.getByRole('button', { name: 'Delete task' }).click()
    await expect(item).toHaveCount(0)
  })

  test('todos persist across a full page reload (Task 35, demo-mode storage)', async ({ page }) => {
    await page.goto('#/d19-t35')
    await expect(page.getByTestId('t35-mode')).toContainText('Demo mode')

    await page.getByLabel('New todo').fill('Survive a reload')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(page.getByText('Survive a reload')).toBeVisible()

    await page.reload()
    await expect(page.getByText('Survive a reload')).toBeVisible()
  })
})
