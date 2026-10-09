import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { expect, test, type Page } from '@playwright/test'
import { exploreDemo } from './helpers.ts'

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
  test(`no axe violations on any screen (${theme} theme, colour contrast included)`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme })
    await page.goto('./#/login')
    expect(await audit(page), 'sign-in').toEqual([])
    await exploreDemo(page)
    expect(await audit(page), 'dashboard').toEqual([])
    for (const [link, heading] of [['My tasks', 'My tasks'], ['Projects', 'Projects'], ['Settings', 'Settings']]) {
      await page.getByRole('link', { name: link, exact: true }).click()
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
      expect(await audit(page), link).toEqual([])
    }
    await page.getByRole('link', { name: /Website relaunch/ }).first().click()
    await expect(page.getByRole('region', { name: 'To do' })).toBeVisible()
    expect(await audit(page), 'board').toEqual([])
    await page.getByRole('button', { name: 'Write homepage copy', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Task details' })).toBeVisible()
    expect(await audit(page), 'task drawer').toEqual([])
  })
}
