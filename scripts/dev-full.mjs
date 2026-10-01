#!/usr/bin/env node
// Starts the Express + SQLite API and the Vite dev server together,
// with the client pointed at the API.
import { spawn } from 'node:child_process'

const API_PORT = process.env.PORT ?? '3001'
const run = (cmd, args, env = {}) =>
  spawn(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } })

const api = run('node', ['server/index.js'], { PORT: API_PORT })
const web = run('npx', ['vite'], { VITE_API_URL: `http://localhost:${API_PORT}` })

const stop = () => { api.kill(); web.kill() }
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
api.on('exit', stop)
web.on('exit', stop)
