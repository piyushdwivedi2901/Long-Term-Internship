import { expect, test } from '@playwright/test'
import { addTask, column, createProject, exploreDemo, signUp } from './helpers.ts'

test.describe('Flowboard user journey (static demo build)', () => {
  test('sign up → project → tasks → keyboard drag → persists after reload', async ({ page }) => {
    await signUp(page)
    await expect(page.getByRole('heading', { name: 'Start your first line' })).toBeVisible()
    await createProject(page, 'Capstone launch')

    await addTask(page, 'Record demo video')
    await addTask(page, 'Write release notes')
    await expect(column(page, 'To do').getByRole('listitem')).toHaveCount(2)

    // Keyboard drag with dnd-kit: focus the grip, Space to lift, → to the next column, Space to drop.
    await page.getByRole('button', { name: 'Move “Record demo video”' }).focus()
    const live = page.locator('[id^="DndLiveRegion"]').first()
    await page.keyboard.press('Space')
    await expect(live).toContainText('Picked up “Record demo video”')
    await page.keyboard.press('ArrowRight')
    await expect(live).toContainText('is over In progress')
    await page.keyboard.press('Space')
    await expect(live).toContainText('Dropped “Record demo video” in In progress')
    await expect(column(page, 'In progress').getByText('Record demo video')).toBeVisible()

    // The board updates optimistically; wait until the move is saved before reloading.
    await page.waitForFunction(() =>
      JSON.parse(localStorage.getItem('flowboard:demo-db:v1') ?? '{}').db?.tasks?.some(
        (t: { title: string; status: string }) => t.title === 'Record demo video' && t.status === 'in_progress',
      ),
    )
    await page.reload()
    await expect(column(page, 'In progress').getByText('Record demo video')).toBeVisible()
    await expect(column(page, 'To do').getByText('Write release notes')).toBeVisible()
  })

  test('drag a card with the mouse into Done', async ({ page }) => {
    await exploreDemo(page)
    await page.getByRole('region', { name: 'Lines' }).getByRole('link', { name: /Website relaunch/ }).click()
    const card = column(page, 'To do').getByRole('listitem').filter({ hasText: 'Set up analytics' })
    const target = column(page, 'Done').locator('ul')
    const from = (await card.getByRole('button', { name: /^Move/ }).boundingBox())!
    const to = (await target.boundingBox())!
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
    await page.mouse.down()
    await page.mouse.move(from.x + 40, from.y + 10, { steps: 5 })
    await page.mouse.move(to.x + to.width / 2, to.y + to.height - 20, { steps: 15 })
    await page.mouse.up()
    await expect(column(page, 'Done').getByText('Set up analytics')).toBeVisible()
    await page.getByRole('link', { name: 'Dashboard' }).click()
    await expect(page.getByRole('region', { name: 'Recent activity' })).toContainText('Completed “Set up analytics”')
  })

  test('task drawer: edit, checklist, comment, delete', async ({ page }) => {
    await exploreDemo(page)
    await page.getByRole('region', { name: 'Needs attention' }).getByRole('button', { name: /Write homepage copy/ }).click()
    const drawer = page.getByRole('dialog', { name: 'Task details' })
    await expect(drawer.getByLabel('Title')).toHaveValue('Write homepage copy')
    await drawer.getByLabel('Due date').fill('2030-01-15')
    await drawer.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('region', { name: 'Notifications' })).toContainText('Changes saved')

    await drawer.getByLabel('New checklist item').fill('Proofread')
    await drawer.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(drawer.getByText('1 of 4')).toBeVisible()

    await drawer.getByLabel('Write a comment').fill('Draft is in the doc')
    await drawer.getByLabel('Write a comment').press('Control+Enter')
    await expect(drawer.getByText('Draft is in the doc')).toBeVisible()

    await drawer.getByRole('button', { name: 'Delete task' }).click()
    await page.getByRole('dialog', { name: 'Delete this task?' }).getByRole('button', { name: 'Delete task' }).click()
    await expect(drawer).toBeHidden()
    await expect(page.getByRole('region', { name: 'Notifications' })).toContainText('Deleted “Write homepage copy”')
  })

  test('command palette, keyboard shortcuts and theme', async ({ page }) => {
    await exploreDemo(page)
    await page.keyboard.press('Control+k')
    await page.getByRole('combobox').fill('internship')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { level: 1, name: 'Internship report' })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await page.keyboard.press('c')
    await expect(page.getByRole('dialog', { name: 'New task' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await page.getByRole('button', { name: 'Switch to dark theme' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })

  test('deep links keep working after sign-in', async ({ page }) => {
    await page.goto('./#/tasks?due=overdue')
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    await page.getByRole('button', { name: 'Explore with sample data' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'My tasks' })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Due' })).toHaveValue('overdue')
  })

  test('works on a phone-sized screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await exploreDemo(page)
    await expect(page.getByRole('navigation', { name: 'Main' })).not.toBeInViewport()
    await page.getByRole('button', { name: 'Open navigation' }).click()
    await page.getByRole('link', { name: 'My tasks' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'My tasks' })).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
