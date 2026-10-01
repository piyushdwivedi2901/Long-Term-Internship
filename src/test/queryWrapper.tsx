import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/** A fresh, retry-free QueryClient per test so cache never leaks between tests. */
export function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

export function queryWrapper(client = createTestQueryClient()) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}
