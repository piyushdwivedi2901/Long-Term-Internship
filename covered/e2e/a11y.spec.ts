import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { expect, test, type Page } from '@playwright/test'
import { exploreSample, mainNav } from './helpers.ts'

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
    await page.getByRole('searchbox', { name: 'Search your things' }).fill('a')
    expect(await audit(page), 'home + answers').toEqual([])

    await mainNav(page).getByRole('link', { name: 'My things' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'My things' })).toBeVisible()
    expect(await audit(page), 'my things').toEqual([])

    for (const name of ['Living room AC', 'Phone', 'Water purifier']) {
      await page.goto('./#/items')
      await page.getByRole('link', { name: new RegExp(name) }).first().click()
      await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
      await page.getByText('Message for the service centre').click()
      expect(await audit(page), name).toEqual([])
    }
    await page.getByRole('button', { name: /Invoice/ }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    expect(await audit(page), 'file viewer').toEqual([])
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Log a repair' }).click()
    await expect(page.getByRole('dialog', { name: 'Log a repair or claim' })).toBeVisible()
    expect(await audit(page), 'repair dialog').toEqual([])
    await page.keyboard.press('Escape')

    await page.goto('./#/items/new')
    await page.getByRole('button', { name: /Compressor · 10 years/ }).click()
    await page.getByRole('button', { name: /Extended warranty/ }).click()
    await page.getByRole('button', { name: 'Save item' }).click() // show errors too
    expect(await audit(page), 'add item form').toEqual([])

    await page.goto('./#/settings')
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible()
    expect(await audit(page), 'settings').toEqual([])
  })
}
