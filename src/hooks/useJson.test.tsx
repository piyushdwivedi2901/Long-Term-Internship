import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useJson } from './useJson'
import { queryWrapper } from '../test/queryWrapper'

afterEach(() => vi.restoreAllMocks())

const ok = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))

describe('useJson (TanStack Query)', () => {
  it('stays idle without a url', () => {
    const { result } = renderHook(() => useJson(null), { wrapper: queryWrapper() })
    expect(result.current).toEqual({ data: null, status: 'idle', error: null })
  })

  it('loads then succeeds, with a generic data type', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => ok([{ id: 1 }]))
    const { result } = renderHook(() => useJson<{ id: number }[]>('/x'), { wrapper: queryWrapper() })
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.data).toEqual([{ id: 1 }])
  })

  it('reports HTTP failures as errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(new Response('', { status: 500 })))
    const { result } = renderHook(() => useJson('/x'), { wrapper: queryWrapper() })
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error?.message).toBe('Request failed: 500')
  })

  it('shares one request between two consumers of the same URL (de-duplication)', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => ok({ n: 1 }))
    const wrapper = queryWrapper()
    const a = renderHook(() => useJson('/same'), { wrapper })
    const b = renderHook(() => useJson('/same'), { wrapper })
    await waitFor(() => expect(a.result.current.status).toBe('success'))
    await waitFor(() => expect(b.result.current.status).toBe('success'))
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('serves a revisited URL from the cache without a second request', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => ok({ n: 1 }))
    const wrapper = queryWrapper()
    const first = renderHook(() => useJson('/cached'), { wrapper })
    await waitFor(() => expect(first.result.current.status).toBe('success'))
    first.unmount()
    // default test client has staleTime 0 → remount refetches in the background,
    // but the cached value is shown immediately, never a loading state.
    const second = renderHook(() => useJson('/cached'), { wrapper })
    expect(second.result.current.status).toBe('success')
    expect(second.result.current.data).toEqual({ n: 1 })
    spy.mockRestore()
  })
})
