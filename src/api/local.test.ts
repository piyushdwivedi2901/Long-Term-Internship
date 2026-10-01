import { beforeEach, describe, expect, it } from 'vitest'
import { createLocalApi } from './local'

beforeEach(() => localStorage.clear())

describe('demo-mode (localStorage) API', () => {
  it('has the same behaviour as the server API', async () => {
    const api = createLocalApi()
    const a = await api.todos.create('first')
    const b = await api.todos.create('second')
    expect([a.id, b.id]).toEqual([1, 2])
    await api.todos.update(a.id, { done: true })
    await api.todos.remove(b.id)
    expect(await api.todos.list()).toEqual([{ id: 1, text: 'first', done: true }])
  })

  it('persists across instances (i.e. page reloads)', async () => {
    await createLocalApi().todos.create('keep me')
    expect((await createLocalApi().todos.list()).map((t) => t.text)).toEqual(['keep me'])
  })

  it('rejects empty text and unknown ids', async () => {
    const api = createLocalApi()
    await expect(api.todos.create(' ')).rejects.toMatchObject({ status: 400 })
    await expect(api.todos.update(5, { done: true })).rejects.toMatchObject({ status: 404 })
  })

  it('recovers from corrupt storage', async () => {
    localStorage.setItem('lti:demo:db', '{nope')
    expect(await createLocalApi().todos.list()).toEqual([])
  })
})

describe('demo-mode accounts', () => {
  const withToken = () => {
    let token: string | null = null
    return { api: createLocalApi(() => token), set: (t: string | null) => (token = t) }
  }

  it('signs up, logs in, and rejects bad credentials / duplicates', async () => {
    const { api } = withToken()
    const s = await api.auth.signup('Me@Example.com', 'password123')
    expect(s.user.email).toBe('me@example.com')
    await expect(api.auth.signup('me@example.com', 'password123')).rejects.toMatchObject({ status: 409 })
    await expect(api.auth.signup('bad', 'password123')).rejects.toMatchObject({ status: 400 })
    await expect(api.auth.signup('x@example.com', 'short')).rejects.toMatchObject({ status: 400 })
    await expect(api.auth.login('me@example.com', 'nope-nope')).rejects.toMatchObject({ status: 401 })
    expect((await api.auth.login('me@example.com', 'password123')).user.id).toBe(s.user.id)
  })

  it('does not store the plaintext password', async () => {
    await withToken().api.auth.signup('me@example.com', 'password123')
    expect(localStorage.getItem('lti:demo:db')).not.toContain('password123')
  })

  it('keeps each user\'s todos separate from each other and from anonymous', async () => {
    const { api, set } = withToken()
    await api.todos.create('anon')
    const a = await api.auth.signup('a@example.com', 'password123')
    set(a.token)
    await api.todos.create('a-only')
    const b = await api.auth.signup('b@example.com', 'password123')
    set(b.token)
    expect(await api.todos.list()).toEqual([])
    set(a.token)
    expect((await api.todos.list()).map((t) => t.text)).toEqual(['a-only'])
    set(null)
    expect((await api.todos.list()).map((t) => t.text)).toEqual(['anon'])
  })

  it('me() resolves the user and rejects stale tokens', async () => {
    const { api, set } = withToken()
    set((await api.auth.signup('a@example.com', 'password123')).token)
    expect((await api.auth.me()).email).toBe('a@example.com')
    set('demo.999')
    await expect(api.auth.me()).rejects.toMatchObject({ status: 401 })
    set(null)
    await expect(api.auth.me()).rejects.toMatchObject({ status: 401 })
  })
})
