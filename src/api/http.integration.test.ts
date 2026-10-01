// @vitest-environment node
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../../server/app.js'
import { openDb } from '../../server/db.js'
import { createHttpApi } from './http'
import { ApiError } from './types'

let server: Server
let api: ReturnType<typeof createHttpApi>
let token: string | null = null

beforeAll(async () => {
  server = createApp(openDb(':memory:'), { jwtSecret: 'test' }).listen(0)
  await new Promise((r) => server.once('listening', r))
  api = createHttpApi(`http://127.0.0.1:${(server.address() as AddressInfo).port}`, () => token)
})
afterAll(() => new Promise<void>((r) => server.close(() => r())))

describe('HTTP client against the real Express + SQLite server', () => {
  it('round-trips create / list / update / remove', async () => {
    const created = await api.todos.create('write tests')
    expect(created).toMatchObject({ text: 'write tests', done: false })
    expect(await api.todos.list()).toEqual([created])
    expect(await api.todos.update(created.id, { done: true })).toMatchObject({ done: true })
    await api.todos.remove(created.id)
    expect(await api.todos.list()).toEqual([])
  })

  it('surfaces server errors as ApiError with the server message', async () => {
    await expect(api.todos.create('   ')).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'text is required',
    })
    await expect(api.todos.remove(999)).rejects.toBeInstanceOf(ApiError)
  })

  it('signs up, sends the bearer token, and sees only that user\'s todos', async () => {
    const anon = await api.todos.create('anonymous')
    const session = await api.auth.signup('http@example.com', 'password123')
    token = session.token
    expect(await api.auth.me()).toEqual(session.user)
    expect(await api.todos.list()).toEqual([])
    await api.todos.create('private')
    expect((await api.todos.list()).map((t) => t.text)).toEqual(['private'])
    token = null
    expect((await api.todos.list()).map((t) => t.id)).toEqual([anon.id])
  })

  it('rejects bad credentials with a 401 ApiError', async () => {
    await expect(api.auth.login('http@example.com', 'wrong-password')).rejects.toMatchObject({ status: 401 })
  })
})
