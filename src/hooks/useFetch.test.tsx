import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useFetch } from './useFetch'

interface User {
  id: number
  name: string
}

afterEach(() => {
  vi.unstubAllGlobals()
})

function mockFetch(impl: () => Promise<Partial<Response>>) {
  const fn = vi.fn(impl)
  vi.stubGlobal('fetch', fn)
  return fn
}

describe('useFetch<T>', () => {
  it('stays idle and never calls fetch for a null url', () => {
    const fetchMock = mockFetch(async () => ({}))
    const { result } = renderHook(() => useFetch<User[]>(null))
    expect(result.current).toEqual({ data: null, status: 'idle', error: null })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('resolves to typed data on success', async () => {
    mockFetch(async () => ({ ok: true, json: async () => [{ id: 1, name: 'Ada' }] }))
    const { result } = renderHook(() => useFetch<User[]>('/users'))
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.data?.[0].name).toBe('Ada')
  })

  it('reports an Error for non-OK responses', async () => {
    mockFetch(async () => ({ ok: false, status: 500 }))
    const { result } = renderHook(() => useFetch<User[]>('/users'))
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error?.message).toContain('500')
    expect(result.current.data).toBeNull()
  })

  it('ignores a stale response when the url changes mid-flight', async () => {
    let resolveFirst: (value: Partial<Response>) => void = () => {}
    const first = new Promise<Partial<Response>>((resolve) => (resolveFirst = resolve))
    const fn = vi
      .fn()
      .mockImplementationOnce(() => first)
      .mockImplementationOnce(async () => ({ ok: true, json: async () => ['new'] }))
    vi.stubGlobal('fetch', fn)

    const { result, rerender } = renderHook(({ url }) => useFetch<string[]>(url), {
      initialProps: { url: '/old' },
    })
    rerender({ url: '/new' })
    await waitFor(() => expect(result.current.data).toEqual(['new']))

    resolveFirst({ ok: true, json: async () => ['old'] })
    await new Promise((r) => setTimeout(r, 10))
    expect(result.current.data).toEqual(['new'])
  })
})
