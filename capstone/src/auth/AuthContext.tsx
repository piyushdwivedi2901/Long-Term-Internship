import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError, createApiClient, type ApiClient, type TokenGetter } from '../api/index.ts'
import type { LoginInput, SignupInput } from '../../shared/schemas.ts'
import type { Session, User } from '../../shared/types.ts'
import { localToday } from '../lib/dates.ts'

const TOKEN_KEY = 'flowboard:token'
export const DEMO_ACCOUNT = { name: 'Demo user', email: 'demo@flowboard.app', password: 'flowboard-demo' }

type Status = 'checking' | 'signed-in' | 'signed-out'

interface AuthValue {
  status: Status
  user: User | null
  api: ApiClient
  signIn(input: LoginInput): Promise<void>
  signUp(input: SignupInput): Promise<void>
  /** Signs into the shared demo account, creating it with sample data the first time. */
  tryDemo(): Promise<void>
  signOut(): void
  setUser(user: User): void
}

const AuthContext = createContext<AuthValue | null>(null)

export function useAuth(): AuthValue {
  const ctx = use(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
export const useApi = () => useAuth().api

const readToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
const writeToken = (t: string | null) => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* private mode: session lasts for this tab only */
  }
}

export function AuthProvider({
  children,
  createClient = createApiClient,
}: {
  children: ReactNode
  createClient?: (getToken: TokenGetter) => ApiClient
}) {
  const queryClient = useQueryClient()
  const token = useRef<string | null>(readToken())
  const api = useMemo(() => createClient(() => token.current), [createClient])
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<Status>(token.current ? 'checking' : 'signed-out')

  const signOut = useCallback(() => {
    token.current = null
    writeToken(null)
    setUser(null)
    setStatus('signed-out')
    queryClient.clear()
  }, [queryClient])

  // Any request that comes back 401 (expired / revoked session) signs the user out.
  useEffect(
    () =>
      queryClient.getQueryCache().subscribe((event) => {
        if (event.type !== 'updated' || event.action.type !== 'error') return
        const err = event.action.error
        if (err instanceof ApiError && err.status === 401 && token.current) signOut()
      }),
    [queryClient, signOut],
  )

  // Validate a remembered session before trusting it.
  useEffect(() => {
    if (!token.current) return
    let cancelled = false
    api.me().then(
      (u) => {
        if (cancelled) return
        setUser(u)
        setStatus('signed-in')
      },
      () => !cancelled && signOut(),
    )
    return () => {
      cancelled = true
    }
  }, [api, signOut])

  const start = useCallback(
    (s: Session) => {
      queryClient.clear()
      token.current = s.token
      writeToken(s.token)
      setUser(s.user)
      setStatus('signed-in')
    },
    [queryClient],
  )

  const signIn = useCallback(async (i: LoginInput) => start(await api.login(i)), [api, start])
  const signUp = useCallback(async (i: SignupInput) => start(await api.signup(i)), [api, start])
  const tryDemo = useCallback(async () => {
    try {
      start(await api.login(DEMO_ACCOUNT))
    } catch {
      const session = await api.signup(DEMO_ACCOUNT)
      token.current = session.token
      await api.seedSample(localToday())
      start(session)
    }
  }, [api, start])

  const value = useMemo(
    () => ({ status, user, api, signIn, signUp, tryDemo, signOut, setUser }),
    [status, user, api, signIn, signUp, tryDemo, signOut],
  )
  return <AuthContext value={value}>{children}</AuthContext>
}
