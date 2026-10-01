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
    localStorage.setItem('lti:demo:todos', '{nope')
    expect(await createLocalApi().todos.list()).toEqual([])
  })
})
