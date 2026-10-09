import { useState, type ComponentProps } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext.tsx'
import { ThemeProvider } from './lib/theme.tsx'
import { createQueryClient } from './lib/queryClient.ts'
import { createRouter } from './router.tsx'

type ClientFactory = ComponentProps<typeof AuthProvider>['createClient']

export function App({ createClient }: { createClient?: ClientFactory }) {
  const [queryClient] = useState(createQueryClient)
  const [router] = useState(createRouter)
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider createClient={createClient}>
          <RouterProvider router={router} />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
