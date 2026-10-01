#!/usr/bin/env node
/**
 * Condenses the raw Lighthouse JSON and rollup-plugin-visualizer stats into the
 * small file the Task 40 / 41 pages render, so the numbers on screen are the
 * measured ones rather than hand-typed.
 *
 *   npm run analyze                      → stats/stats.json (after)
 *   node scripts/chunk-sizes.mjs dist stats/after-chunks.json
 *   (docs/bundle/before-*.json: the same measurements on commit ea1baa5, before the optimisations)
 *   node scripts/summarize-reports.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'))

/** Largest packages per chunk, from the visualizer's raw-data output. */
function packagesFromStats(p) {
  const d = read(p)
  const out = {}
  for (const meta of Object.values(d.nodeMetas)) {
    for (const [chunkId, partId] of Object.entries(meta.moduleParts)) {
      if (!chunkId.endsWith('.js')) continue
      const m = meta.id.split('node_modules/')[1]
      const pkg = m ? (m.startsWith('@') ? m.split('/').slice(0, 2).join('/') : m.split('/')[0]) : '(app code)'
      out[chunkId] ??= {}
      out[chunkId][pkg] = (out[chunkId][pkg] ?? 0) + d.nodeParts[partId].renderedLength
    }
  }
  return out
}

function lighthouse(p) {
  const r = read(p)
  const a = r.audits
  const num = (id) => Math.round(a[id].numericValue)
  return {
    scores: Object.fromEntries(
      ['performance', 'accessibility', 'best-practices', 'seo'].map((c) => [c, Math.round(r.categories[c].score * 100)]),
    ),
    metrics: {
      fcp: num('first-contentful-paint'),
      lcp: num('largest-contentful-paint'),
      tbt: num('total-blocking-time'),
      cls: Number(a['cumulative-layout-shift'].numericValue.toFixed(3)),
      speedIndex: num('speed-index'),
    },
    unusedJsKiB: Math.round((a['unused-javascript'].details?.overallSavingsBytes ?? 0) / 1024),
    totalTransferKiB: Math.round(a['total-byte-weight'].numericValue / 1024),
  }
}

/** Real shipped sizes (minified + gzip) from scripts/chunk-sizes.mjs, with the
 *  largest packages inside each chunk taken from the visualizer stats. */
function bundle(chunksPath, packages) {
  const real = read(chunksPath)
  const packagesByName = Object.fromEntries(
    Object.entries(packages).map(([chunk, pkgs]) => [
      chunk.replace(/^assets\//, '').replace(/-[\w-]{8}\.js$/, '.js'),
      Object.entries(pkgs).sort((a, b) => b[1] - a[1]).slice(0, 4),
    ]),
  )
  const list = real.map((c) => ({ ...c, topPackages: packagesByName[c.name] ?? [] }))
  return {
    chunkCount: list.length,
    totalBytes: list.reduce((n, c) => n + c.bytes, 0),
    totalGzip: list.reduce((n, c) => n + c.gzip, 0),
    top: list.slice(0, 8),
  }
}

const out = {
  lighthouse: { before: lighthouse('docs/lighthouse/before.json'), after: lighthouse('docs/lighthouse/after.json') },
  bundle: {
    before: bundle('docs/bundle/before-chunks.json', read('docs/bundle/before-packages.json')),
    after: bundle('stats/after-chunks.json', packagesFromStats('stats/stats.json')),
  },
}
writeFileSync(new URL('../src/days/day22/reports.json', import.meta.url), JSON.stringify(out, null, 2) + '\n')
console.log('wrote src/days/day22/reports.json')
console.log(JSON.stringify({ lh: out.lighthouse, entryBefore: out.bundle.before.top[0], entryAfter: out.bundle.after.top.slice(0, 3).map((c) => [c.name, c.bytes, c.gzip]) }, null, 1))
