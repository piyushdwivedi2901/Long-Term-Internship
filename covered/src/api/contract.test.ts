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

const TODAY = new Date().toISOString().slice(0, 10)
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

/** One contract, two implementations: the browser demo must behave exactly like the real API. */
let server: Server
let base = ''
beforeAll(async () => {
  const repo = createSqliteRepository(':memory:')
  server = createApp(createServices({ repo, passwords: scryptHasher, tokens: jwtSigner('contract') }), {
    sensitiveRateLimit: { max: 1000, windowMs: 60_000 },
  }).listen(0)
  await new Promise((r) => server.once('listening', r))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})
afterAll(() => new Promise<void>((r) => server.close(() => r())))

describe.each<[string, (t: () => string | null, storage: Storage) => ApiClient]>([
  ['http (Express + SQLite)', (t) => createHttpClient(base, t)],
  ['demo (in-browser)', (t, storage) => createDemoClient(t, { storage, latencyMs: 0 })],
])('%s', (_name, make) => {
  const storage = memoryStorage() // shared per implementation, like one server / one browser
  const person = async (name: string) => {
    let token: string | null = null
    const api = make(() => token, storage)
    token = (await api.signup({ name, email: `${name}-${Math.random().toString(36).slice(2, 8)}@example.com`, password: 'password123' })).token
    return api
  }

  it('rejects calls without a session', async () => {
    const e = await make(() => null, storage).listItems(TODAY).catch((x) => x)
    expect(e).toBeInstanceOf(ApiError)
    expect(e.status).toBe(401)
  })

  it('runs the item, bill and repair lifecycle identically', async () => {
    const me = await person('Piyush')
    const other = await person('Aisha')
    const item = await me.createItem(
      {
        name: 'Kitchen fridge',
        brand: 'LG',
        category: 'kitchen',
        purchaseDate: '2025-01-15',
        price: 3_849_000,
        coverages: [
          { kind: 'standard', label: 'Standard', months: 12, provider: 'LG' },
          { kind: 'component', label: 'Compressor', months: 120, provider: 'LG' },
        ],
      },
      TODAY,
    )
    expect(item.coverages.map((c) => c.end)).toEqual(['2026-01-14', '2035-01-14'])
    await expect(me.createItem({ name: '', purchaseDate: '2025-01-01' }, TODAY)).rejects.toMatchObject({ status: 400, fields: { name: expect.any(String) } })

    const file = await me.uploadFile(item.id, { name: 'bill.png', mime: 'image/png', data: PNG })
    const blob = await me.fileBlob(file.id)
    expect(blob.type).toBe('image/png')
    expect(Buffer.from(await blob.arrayBuffer()).toString('base64')).toBe(PNG)
    await expect(other.fileBlob(file.id)).rejects.toMatchObject({ status: 404 })
    await expect(other.getItem(item.id, TODAY)).rejects.toMatchObject({ status: 404 })

    const claim = await me.createClaim(item.id, { date: '2025-06-01', issue: 'Not cooling', status: 'in_progress' }, TODAY)
    expect((await me.getItem(item.id, TODAY)).openClaims).toBe(1)
    await me.updateClaim(claim.id, { date: '2025-06-01', issue: 'Not cooling', status: 'resolved' }, TODAY)
    await expect(me.createClaim(item.id, { date: '2024-01-01', issue: 'x' }, TODAY)).rejects.toMatchObject({ status: 400 })

    const dash = await me.dashboard(TODAY)
    expect(dash).toMatchObject({ itemCount: 1, repairs: { count: 1, underWarranty: 1 }, missingBills: 0 })

    await me.deleteFile(file.id)
    await me.deleteItem(item.id)
    expect(await me.listItems(TODAY)).toEqual([])
  })

  it('seeds the same sample data and backup', async () => {
    const demo = await person('Demo')
    await demo.seedSample(TODAY)
    const backup = await demo.exportAll(TODAY)
    expect(backup.items.map((i) => i.name).sort()).toContain('Living room AC')
    expect((await demo.dashboard(TODAY)).counts).toEqual({ covered: 6, expiring: 1, partial: 2, expired: 1, none: 0 })
  })
})

describe('demo storage limits', () => {
  it("rolls back and says so when the browser's storage is full", async () => {
    const backing = memoryStorage()
    let full = false
    const storage: Storage = { ...backing, getItem: (k) => backing.getItem(k), setItem: (k, v) => { if (full) throw new DOMException('quota', 'QuotaExceededError'); backing.setItem(k, v) }, removeItem: (k) => backing.removeItem(k), clear: () => backing.clear(), key: (i) => backing.key(i), length: 0 }
    let token: string | null = null
    const api = createDemoClient(() => token, { storage, latencyMs: 0 })
    token = (await api.signup({ name: 'P', email: 'p@example.com', password: 'password123' })).token
    full = true
    await expect(api.createItem({ name: 'TV', purchaseDate: '2025-01-01' }, TODAY)).rejects.toMatchObject({ status: 507, code: 'storage_full' })
    expect(await api.listItems(TODAY)).toEqual([])
  })
})
