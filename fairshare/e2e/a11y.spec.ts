import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { expect, test, type Page } from '@playwright/test'
import { exploreSample } from './helpers.ts'

const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8')

async function audit(page: Page) {
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'))
  await page.evaluate(axeSource)
  const { violations } = await page.evaluate(() =>
    (globalThis as unknown as { axe: { run: (n: Element) => Promise<{ violations: { id: string; help: string; nodes: { target: string[] }[] }[] }> } }).axe.run(document.body),
  )
  return violations.map((v) => `${v.id}: ${v.help} — ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`)
}

for (const theme of ['light', 'dark'] as const) {
  test(`no axe violations anywhere (${theme}, colour contrast included)`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme })
    await page.goto('./#/login')
    expect(await audit(page), 'sign-in').toEqual([])
    await exploreSample(page)
    expect(await audit(page), 'home').toEqual([])
    await page.getByRole('link', { name: /Goa trip/ }).click()
    for (const tab of ['Expenses', 'Balances', 'Insights', 'People']) {
      await page.getByRole('tab', { name: new RegExp(`^${tab}`) }).click()
      await expect(page.getByRole('tabpanel')).toBeVisible()
      await page.waitForTimeout(150)
      expect(await audit(page), tab).toEqual([])
    }
    await page.getByRole('button', { name: 'Add expense' }).first().click()
    await page.getByRole('radio', { name: 'Shares' }).click()
    expect(await audit(page), 'add expense dialog').toEqual([])
    await page.keyboard.press('Escape')
    await page.getByRole('link', { name: 'Settings', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible()
    expect(await audit(page), 'settings').toEqual([])
  })
}
