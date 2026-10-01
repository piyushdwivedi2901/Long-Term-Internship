import { expect, test } from '@playwright/test'

test.describe('Cart & checkout flow (Task 32 modal)', () => {
  test('add items, review in the modal, check out', async ({ page }) => {
    await page.goto('#/d17-t32')

    await page.getByRole('button', { name: 'Add Backpack to cart' }).click()
    await page.getByRole('button', { name: 'Add Water Bottle to cart' }).click()
    await page.getByRole('button', { name: 'Add Water Bottle to cart' }).click()

    const viewCart = page.getByRole('button', { name: /view cart, 3 items/i })
    await viewCart.click()

    const dialog = page.getByRole('dialog', { name: 'Your cart' })
    await expect(dialog).toBeVisible()
    // The dialog is portalled out of the (overflow:hidden) shop box.
    await expect(page.locator('body > .modal-backdrop')).toHaveCount(1)
    // 1899 + 2*499 = 2897, +8% tax (232) = 3129
    await expect(dialog.getByRole('button', { name: /checkout · ₹3129/i })).toBeVisible()

    await dialog.getByRole('button', { name: 'Increase Backpack' }).click()
    await expect(dialog.getByRole('button', { name: /checkout · ₹5180/i })).toBeVisible() // 4796 + 384 (8% tax, rounded)

    await dialog.getByRole('button', { name: /checkout/i }).click()
    const done = page.getByRole('dialog', { name: 'Order placed' })
    await expect(done.getByRole('status')).toContainText(/ORD-\d{4}/)

    await done.getByRole('button', { name: 'Continue shopping' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /view cart, 0 items/i })).toBeVisible()
  })

  test('the modal traps focus, closes on Escape and returns focus to its trigger', async ({ page }) => {
    await page.goto('#/d17-t32')
    await page.getByRole('button', { name: 'Add Desk Lamp to cart' }).click()
    const trigger = page.getByRole('button', { name: /view cart/i })
    await trigger.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    }

    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(trigger).toBeFocused()
  })
})
