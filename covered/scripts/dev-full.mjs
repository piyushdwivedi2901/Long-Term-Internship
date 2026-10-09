#!/usr/bin/env node
// Runs the Express + SQLite API and the Vite dev server together. Vite proxies
// /api to the API, so the browser talks to one origin (no CORS setup needed).
import { spawn } from 'node:child_process'

const run = (cmd, args, env = {}) => spawn(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } })
const api = run('node', ['--watch', 'server/index.ts'], { PORT: '4200' })
const web = run('npx', ['vite'], { VITE_BACKEND: 'server', VITE_API_URL: '' })
const stop = () => {
  api.kill()
  web.kill()
}
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, stop)
api.on('exit', stop)
web.on('exit', stop)
