#!/usr/bin/env node
/**
 * Runs Lighthouse (mobile defaults) against a URL and writes a JSON report plus
 * a short summary.   node scripts/lighthouse.mjs <url> <out.json>
 * Env: CHROMIUM_PATH to use a pre-installed Chrome.
 */
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'

const [url = 'http://localhost:4173/Long-Term-Internship/', out = 'docs/lighthouse/report.json'] = process.argv.slice(2)
const args = [
  'lighthouse', url,
  '--output=json', `--output-path=${out}`,
  '--only-categories=performance,accessibility,best-practices,seo',
  '--chrome-flags=--headless=new --no-sandbox',
  '--quiet',
]
const env = { ...process.env }
if (process.env.CHROMIUM_PATH) env.CHROME_PATH = process.env.CHROMIUM_PATH

const code = await new Promise((resolve) => spawn('npx', args, { stdio: 'inherit', env }).on('exit', resolve))
if (code !== 0) process.exit(code)

const r = JSON.parse(readFileSync(out, 'utf8'))
const pct = (c) => Math.round(r.categories[c].score * 100)
console.log(`\nScores  perf ${pct('performance')}  a11y ${pct('accessibility')}  best-practices ${pct('best-practices')}  seo ${pct('seo')}`)
const a = r.audits
for (const id of ['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index']) {
  console.log(`  ${a[id].title}: ${a[id].displayValue}`)
}
console.log('\nOpportunities / failed audits:')
for (const audit of Object.values(a)) {
  if (audit.score !== null && audit.score < 0.9 && audit.scoreDisplayMode !== 'informative' && audit.scoreDisplayMode !== 'notApplicable') {
    console.log(`  - ${audit.id} (${Math.round(audit.score * 100)}): ${audit.title}${audit.displayValue ? ' — ' + audit.displayValue : ''}`)
  }
}
