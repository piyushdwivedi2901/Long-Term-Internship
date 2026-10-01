#!/usr/bin/env node
/** node scripts/chunk-sizes.mjs <distDir> <out.json> — real minified + gzip size of every JS chunk. */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const [dist = 'dist', out = 'stats/chunks.json'] = process.argv.slice(2)
const dir = `${dist}/assets`
const chunks = readdirSync(dir)
  .filter((f) => f.endsWith('.js'))
  .map((f) => {
    const buf = readFileSync(`${dir}/${f}`)
    return { name: f.replace(/-[\w-]{8}\.js$/, '.js'), bytes: buf.length, gzip: gzipSync(buf).length }
  })
  .sort((a, b) => b.bytes - a.bytes)
writeFileSync(out, JSON.stringify(chunks, null, 2))
console.log(`${chunks.length} chunks, ${chunks.reduce((n, c) => n + c.bytes, 0)} bytes → ${out}`)
