import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { expect, test, type Page } from '@playwright/test'
import { exploreSample } from './helpers.ts'

const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8')

async function audit(page: Page) {
  // Let React commit and any enter animation start before checking that animations are done.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
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
    expect(await audit(page), 'crew overview').toEqual([])
    for (const tab of ['Competitions', 'Results', 'Head-to-head', 'Players']) {
      await page.getByRole('tab', { name: tab }).click()
      await expect(page.getByRole('tabpanel')).toBeVisible()
      await page.waitForTimeout(200)
      expect(await audit(page), tab).toEqual([])
    }
    await page.getByRole('button', { name: 'Play a friendly' }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('radio', { name: 'Penalties' }).click()
    expect(await audit(page), 'result dialog').toEqual([])
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'New competition' }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    expect(await audit(page), 'new competition').toEqual([])
    await page.keyboard.press('Escape')

    await page.getByRole('tab', { name: 'Competitions' }).click()
    await page.getByRole('link', { name: /Diwali Cup/ }).click()
    await expect(page.getByRole('list', { name: 'Bracket' })).toBeVisible()
    expect(await audit(page), 'knockout').toEqual([])
    await page.goBack()
    await page.getByRole('link', { name: /Season 1/ }).click()
    await expect(page.getByRole('region', { name: 'Champion' })).toBeVisible()
    expect(await audit(page), 'league').toEqual([])
    await page.getByRole('table', { name: 'Season 1 table' }).getByRole('link', { name: 'Rohan' }).click()
    await expect(page.getByRole('heading', { name: 'Rating history' })).toBeVisible()
    expect(await audit(page), 'player').toEqual([])

    await page.goto('./#/')
    await expect(page.getByRole('link', { name: /Hostel Room 12/ })).toBeVisible()
    expect(await audit(page), 'home').toEqual([])
    await page.goto('./#/settings')
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible()
    expect(await audit(page), 'settings').toEqual([])
  })
}
