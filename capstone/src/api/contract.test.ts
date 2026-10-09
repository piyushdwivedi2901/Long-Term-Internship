// @vitest-environment node
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../../server/app.ts'
import { createSqliteRepository } from '../../server/sqliteRepository.ts'
import { jwtSigner, scryptHasher } from '../../server/security.ts'
import { createServices } from '../../shared/services.ts'
import { createDemoClient } from './demo.ts'
import { createHttpClient } from './http.ts'
import { ApiError, type ApiClient } from './types.ts'
import { memoryStorage } from '../test/memoryStorage.ts'

/**
 * One contract, two implementations: the browser demo backend must behave
 * exactly like the real Express + SQLite API, so the UI can't tell them apart.
 */
let server: Server
let baseUrl = ''
beforeAll(async () => {
  const repo = createSqliteRepository(':memory:')
  const app = createApp(createServices({ repo, passwords: scryptHasher, tokens: jwtSigner('contract') }), {
    authRateLimit: { max: 1000, windowMs: 60_000 },
  })
  server = app.listen(0)
  await new Promise((r) => server.once('listening', r))
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})
afterAll(() => new Promise<void>((r) => server.close(() => r())))

const implementations: [string, (getToken: () => string | null) => ApiClient][] = [
  ['http (Express + SQLite)', (t) => createHttpClient(baseUrl, t)],
  ['demo (in-browser)', (t) => createDemoClient(t, { storage: memoryStorage(), latencyMs: 0 })],
]

describe.each(implementations)('%s', (_name, make) => {
  let n = 0
  const fresh = () => {
    let token: string | null = null
    const api = make(() => token)
    return { api, setToken: (t: string | null) => (token = t) }
  }
  const email = () => `user${++n}-${Math.random().toString(36).slice(2, 7)}@example.com`

  it('signs up, signs in and rejects bad credentials with the same messages', async () => {
    const { api, setToken } = fresh()
    const e = email()
    const s = await api.signup({ name: 'Piyush', email: e, password: 'password123' })
    setToken(s.token)
    expect(await api.me()).toEqual(s.user)
    await expect(api.signup({ name: 'Again', email: e, password: 'password123' })).rejects.toMatchObject({ status: 409 })
    await expect(api.login({ email: e, password: 'wrong-password' })).rejects.toMatchObject({
      status: 401,
      message: 'Email or password is incorrect',
    })
    await expect(api.signup({ name: '', email: 'bad', password: 'x' })).rejects.toMatchObject({
      status: 400,
      fields: { name: 'Enter your name', email: 'Enter a valid email address', password: 'Use at least 8 characters' },
    })
  })

  it('rejects calls without a session', async () => {
    const { api } = fresh()
    const err = await api.listProjects().catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(401)
  })

  it('runs the full project → task → move → comment → stats flow', async () => {
    const { api, setToken } = fresh()
    setToken((await api.signup({ name: 'P', email: email(), password: 'password123' })).token)
    const project = await api.createProject({ name: 'Launch', color: 'green' })
    const a = await api.createTask({ projectId: project.id, title: 'A', labels: ['x'], dueDate: '2026-10-10' })
    const b = await api.createTask({ projectId: project.id, title: 'B' })
    await api.moveTask(b.id, { status: 'todo', index: 0 })
    expect((await api.listTasks({ projectId: project.id })).map((t) => t.title)).toEqual(['B', 'A'])
    await api.moveTask(a.id, { status: 'done', index: 0 })
    await api.addComment(a.id, { body: 'Shipped' })
    const listed = await api.getTask(a.id)
    expect(listed).toMatchObject({ status: 'done', commentCount: 1, labels: ['x'] })
    expect(listed.completedAt).not.toBeNull()
    const stats = await api.stats('2026-10-09')
    expect(stats).toMatchObject({ total: 2, counts: { todo: 1, done: 1 } })
    expect((await api.activity(1))[0].summary).toBe('Commented on “A”')
    await api.deleteProject(project.id)
    await expect(api.getTask(a.id)).rejects.toMatchObject({ status: 404 })
  })

  it('seeds the same sample workspace and deletes accounts', async () => {
    const { api, setToken } = fresh()
    setToken((await api.signup({ name: 'P', email: email(), password: 'password123' })).token)
    const projects = await api.seedSample('2026-10-09')
    expect(projects.map((p) => p.name)).toEqual(['Website relaunch', 'Internship report', 'Home'])
    expect((await api.stats('2026-10-09')).total).toBe(13)
    await expect(api.deleteAccount({ password: 'nope-nope' })).rejects.toMatchObject({ status: 400 })
    await api.deleteAccount({ password: 'password123' })
    await expect(api.me()).rejects.toMatchObject({ status: 401 })
  })
})

describe('demo backend persistence', () => {
  it('survives a page reload (new client, same storage) and hashes passwords', async () => {
    const storage = memoryStorage()
    let token: string | null = null
    const first = createDemoClient(() => token, { storage, latencyMs: 0 })
    token = (await first.signup({ name: 'P', email: 'p@example.com', password: 'password123' })).token
    await first.createProject({ name: 'Persisted' })
    const second = createDemoClient(() => token, { storage, latencyMs: 0 })
    expect((await second.listProjects()).map((p) => p.name)).toEqual(['Persisted'])
    expect(JSON.stringify([...Array(storage.length)].map((_, i) => storage.getItem(storage.key(i)!)))).not.toContain('password123')
  })

  it('starts fresh from unreadable storage', async () => {
    const storage = memoryStorage()
    storage.setItem('flowboard:demo-db:v1', '{broken')
    const api = createDemoClient(() => null, { storage, latencyMs: 0 })
    await expect(api.login({ email: 'p@example.com', password: 'password123' })).rejects.toMatchObject({ status: 401 })
  })
})
