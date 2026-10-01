import { expect, test } from '@playwright/test'

/**
 * Hits the REAL Express + SQLite server (started by playwright.config.ts) —
 * the one thing the static-site tests can't cover.
 */
const API = 'http://localhost:3101'

test.describe('Backend API (Tasks 35 & 36)', () => {
  test('signup → create → list → isolation between two users', async ({ request }) => {
    const unique = Date.now()
    const alice = await (await request.post(`${API}/api/auth/signup`, {
      data: { email: `alice${unique}@example.com`, password: 'password123' },
    })).json()
    const bob = await (await request.post(`${API}/api/auth/signup`, {
      data: { email: `bob${unique}@example.com`, password: 'password123' },
    })).json()

    const auth = (t: string) => ({ Authorization: `Bearer ${t}` })
    const created = await request.post(`${API}/api/todos`, { headers: auth(alice.token), data: { text: 'alice only' } })
    expect(created.status()).toBe(201)

    const aliceList = await (await request.get(`${API}/api/todos`, { headers: auth(alice.token) })).json()
    const bobList = await (await request.get(`${API}/api/todos`, { headers: auth(bob.token) })).json()
    expect(aliceList.map((t: { text: string }) => t.text)).toEqual(['alice only'])
    expect(bobList).toEqual([])
  })

  test('rejects forged and missing tokens', async ({ request }) => {
    expect((await request.get(`${API}/api/auth/me`)).status()).toBe(401)
    expect((await request.get(`${API}/api/auth/me`, { headers: { Authorization: 'Bearer forged' } })).status()).toBe(401)
  })

  test('rejects wrong passwords with the same message as unknown users', async ({ request }) => {
    const unique = Date.now()
    await request.post(`${API}/api/auth/signup`, { data: { email: `c${unique}@example.com`, password: 'password123' } })
    const wrong = await request.post(`${API}/api/auth/login`, { data: { email: `c${unique}@example.com`, password: 'wrong-password' } })
    const unknown = await request.post(`${API}/api/auth/login`, { data: { email: `nobody${unique}@example.com`, password: 'password123' } })
    expect(wrong.status()).toBe(401)
    expect(await wrong.json()).toEqual(await unknown.json())
  })
})
