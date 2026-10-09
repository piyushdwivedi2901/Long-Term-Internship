import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { PDF, PNG, addItem, exploreSample, mainNav, signUp } from './helpers.ts'

test.describe('Covered (static demo build)', () => {
  test('add an item with its bill, then claim against it', async ({ page }) => {
    await signUp(page, 'Piyush')
    await addItem(page, { name: 'Bedroom AC', brand: 'Daikin', preset: /Compressor · 10 years/, bill: { name: 'daikin-invoice.pdf', mimeType: 'application/pdf', buffer: PDF } })

    await expect(page.getByRole('heading', { level: 2, name: /^Yes — covered until/ })).toBeVisible()
    await expect(page.getByText('Covered', { exact: true }).first()).toBeVisible() // the stamp
    const files = page.getByRole('region', { name: 'Bill & photos' })
    await files.getByRole('button', { name: /daikin-invoice\.pdf/ }).click()
    const viewer = page.getByRole('dialog', { name: 'daikin-invoice.pdf' })
    await expect(viewer.getByRole('link', { name: 'Download', exact: true })).toBeVisible() // browsers without a PDF viewer also get a "Download it" fallback
    await viewer.getByRole('button', { name: 'Done' }).click()

    await page.getByRole('button', { name: 'Log a repair' }).click()
    const d = page.getByRole('dialog', { name: 'Log a repair or claim' })
    await d.getByLabel('What went wrong?').fill('Water dripping indoors')
    await d.getByLabel('Status').selectOption('in_progress')
    await d.getByRole('button', { name: 'Log repair' }).click()
    await expect(page.getByRole('region', { name: 'Repairs & claims' })).toContainText('Being repaired')

    await mainNav(page).getByRole('link', { name: 'Home' }).click()
    await page.getByRole('searchbox', { name: 'Search your things' }).fill('daikin')
    await expect(page.getByRole('region', { name: 'Is it covered?' }).getByRole('link', { name: /Bedroom AC/ })).toContainText('Yes — until')
    await expect(page.getByRole('region', { name: 'Open repairs' })).toContainText('Water dripping indoors')
  })

  test('photos are stored and shown back', async ({ page }) => {
    await signUp(page, 'Aisha')
    await addItem(page, { name: 'Phone' })
    await page.getByRole('region', { name: 'Bill & photos' }).getByLabel('Add bill or photo').setInputFiles({ name: 'box.png', mimeType: 'image/png', buffer: PNG })
    await expect(page.getByRole('status').filter({ hasText: 'box.png saved' })).toBeVisible()
    const thumb = page.getByRole('button', { name: /box\.png/ }).locator('img')
    await expect(thumb).toHaveJSProperty('naturalWidth', 1)
  })

  test('calendar reminders and spreadsheet export download real files', async ({ page }) => {
    await exploreSample(page)
    const [ics] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Add reminders to calendar' }).click()])
    expect(ics.suggestedFilename()).toBe('warranty-reminders.ics')
    const cal = readFileSync((await ics.path())!, 'utf8')
    expect(cal.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(cal.match(/BEGIN:VEVENT/g)!.length).toBeGreaterThanOrEqual(9)
    expect(cal).toContain('TRIGGER:-P30D')

    await mainNav(page).getByRole('link', { name: 'My things' }).click()
    const [csv] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export spreadsheet' }).click()])
    const rows = readFileSync((await csv.path())!, 'utf8').replace(/^﻿/, '').trim().split('\r\n')
    expect(rows[0]).toMatch(/^Item,Brand,Model,Category/)
    expect(rows).toHaveLength(11)
  })

  test('keyboard: N opens the form, and leaving with changes asks first', async ({ page }) => {
    await exploreSample(page)
    await page.keyboard.press('n')
    await expect(page.getByRole('heading', { level: 1, name: 'Add an item' })).toBeVisible()
    await expect(page.getByLabel('Name')).toBeFocused()
    await page.keyboard.type('Microwave')
    await page.goBack()
    await expect(page.getByRole('dialog', { name: 'Leave without saving?' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByLabel('Name')).toHaveValue('Microwave')
  })

  test('deep links survive a reload', async ({ page }) => {
    await exploreSample(page)
    await mainNav(page).getByRole('link', { name: 'My things' }).click()
    await page.getByRole('link', { name: /Electric scooter/ }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Electric scooter' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Electric scooter' })).toBeVisible()
    await expect(page.getByRole('figure', { name: 'Warranty timeline' })).toContainText('Battery')
  })

  test('works one-handed on a phone, with no sideways scrolling', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 740 }, hasTouch: true, isMobile: true })
    const page = await ctx.newPage()
    await exploreSample(page)
    const noOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    expect(await noOverflow()).toBe(true)
    await expect(mainNav(page)).toBeVisible()
    await page.getByRole('link', { name: 'Add item' }).click() // the floating button
    await expect(page.getByRole('heading', { level: 1, name: 'Add an item' })).toBeVisible()
    await page.getByRole('button', { name: /Compressor · 5 years/ }).click()
    expect(await noOverflow()).toBe(true)
    await page.goto('./#/items')
    await page.getByRole('link', { name: /Living room AC/ }).click()
    await expect(page.getByRole('button', { name: 'Take photo' })).toBeVisible() // camera capture on touch devices
    expect(await noOverflow()).toBe(true)
    await ctx.close()
  })
})
