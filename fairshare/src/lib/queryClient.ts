import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/types.ts'

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10_000,
        retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
      },
      mutations: { retry: false },
    },
  })
