import { expect, test } from '@playwright/test'
import { saveScore, signUp, startCrew } from './helpers.ts'

test.describe('production server (Express + SQLite)', () => {
  test('two friends on two phones share one league in real time', async ({ browser }) => {
    const aCtx = await browser.newContext()
    const bCtx = await browser.newContext()
    const piyush = await aCtx.newPage()
    const rohan = await bCtx.newPage()

    await signUp(piyush, 'Piyush')
    await startCrew(piyush, 'Two Phones FC', ['Rohan'])
    await piyush.getByRole('button', { name: 'New competition' }).first().click()
    const d = piyush.getByRole('dialog', { name: 'New competition' })
    await d.getByLabel('Name').fill('Derby')
    await d.getByRole('button', { name: 'Create & draw fixtures' }).click()
    await expect(piyush.getByRole('heading', { level: 1, name: 'Derby' })).toBeVisible()
    await piyush.getByRole('link', { name: 'Two Phones FC' }).click()
    await piyush.getByRole('tab', { name: 'Players' }).click()
    const code = (await piyush.getByLabel(/^Invite code/).textContent())!.trim()

    await signUp(rohan, 'Rohan')
    await rohan.goto(`/#/join/${code}`)
    await rohan.getByRole('radio', { name: "I'm Rohan" }).check()
    await rohan.getByRole('button', { name: 'Join crew' }).click()
    await rohan.getByRole('region', { name: 'Up next' }).getByRole('button', { name: /Enter result/ }).click()
    const dialog = rohan.getByRole('dialog', { name: 'Enter result' })
    await dialog.getByLabel('Rohan played as').fill('Manchester City')
    await saveScore(dialog, 0, 0)

    // Piyush sees Rohan's result after a refresh on his own device.
    await piyush.reload()
    await piyush.getByRole('tab', { name: 'Overview' }).click()
    await expect(piyush.getByRole('region', { name: 'Latest results' })).toContainText(/0\s*–\s*0/)
    await piyush.getByRole('tab', { name: 'Competitions' }).click()
    await expect(piyush.getByRole('link', { name: /Derby/ })).toContainText('Champion')

    await aCtx.close()
    await bCtx.close()
  })

  test('sends security headers and refuses requests without a session', async ({ request }) => {
    for (const path of ['/api/overview', '/api/crews', '/api/competitions/1']) {
      const res = await request.get(path)
      expect(res.status(), path).toBe(401)
      expect(res.headers()['x-content-type-options']).toBe('nosniff')
      expect(res.headers()['x-frame-options']).toBe('DENY')
    }
  })
})
