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

beforeAll(async () => {
  server = createApp(openDb(':memory:')).listen(0)
  await new Promise((r) => server.once('listening', r))
  api = createHttpApi(`http://127.0.0.1:${(server.address() as AddressInfo).port}`)
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
})
