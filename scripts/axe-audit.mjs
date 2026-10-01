#!/usr/bin/env node
/**
 * Runs axe-core (incl. colour contrast) against every task page in a real
 * Chromium and prints any violations. Used for Task 33 and as a regression
 * check after UI changes.
 *
 *   npm run build && npx vite preview --port 4173 &
 *   node scripts/axe-audit.mjs
 *
 * Env: BASE_URL (default http://localhost:4173/Long-Term-Internship/),
 *      CHROMIUM_PATH (optional — defaults to Playwright's own browser).
 */
import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const BASE = process.env.BASE_URL ?? 'http://localhost:4173/Long-Term-Internship/'
const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8')
const registry = readFileSync(new URL('../src/registry.ts', import.meta.url), 'utf8')
const ids = [...registry.matchAll(/id: '(d\d+-t\d+)'/g)].map((m) => m[1])

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
)
const page = await browser.newPage()
let failures = 0

for (const id of ids) {
  await page.goto(`${BASE}#/${id}`)
  // Tasks are lazy-loaded: wait for the page's <h2>, then for entrance animations
  // to settle (axe would otherwise measure mid-fade colours).
  await page.waitForSelector('main h2')
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState === 'finished'))
  await page.evaluate(axeSource)
  const { violations } = await page.evaluate(() => globalThis.axe.run(document.querySelector('main')))
  console.log(`${violations.length === 0 ? '✓' : '✗'} ${id}`)
  for (const v of violations) {
    failures++
    console.log(`    ${v.id} (${v.impact}): ${v.help}`)
    for (const n of v.nodes.slice(0, 3)) console.log(`      ${n.target.join(' ')}`)
  }
}

await browser.close()
console.log(failures === 0 ? `\nAll ${ids.length} pages: 0 violations` : `\n${failures} violation(s)`)
process.exit(failures === 0 ? 0 : 1)
