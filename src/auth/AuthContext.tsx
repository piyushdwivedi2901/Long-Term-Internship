import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createApi, type Api, type Session, type TokenGetter, type User } from '../api'

const TOKEN_KEY = 'lti:auth:token'

type AuthStatus = 'checking' | 'authenticated' | 'anonymous'

interface AuthValue {
  status: AuthStatus
  user: User | null
  /** API client that sends the current user's token with every request. */
  api: Api
  login(email: string, password: string): Promise<void>
  signup(email: string, password: string): Promise<void>
  logout(): void
}

const AuthContext = createContext<AuthValue | null>(null)

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
function storeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage unavailable: the session just won't survive a reload */
  }
}

interface ProviderProps {
  children: ReactNode
  /** Override in tests to inject a fake / isolated client. */
  createApiFn?: (getToken: TokenGetter) => Api
}

export function AuthProvider({ children, createApiFn = createApi }: ProviderProps) {
  const tokenRef = useRef<string | null>(readStoredToken())
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>(tokenRef.current ? 'checking' : 'anonymous')
  // One client for the provider's lifetime; it reads the live token via the ref.
  const api = useMemo(() => createApiFn(() => tokenRef.current), [createApiFn])

  // Restore a previous session: validate the stored token before trusting it.
  useEffect(() => {
    if (!tokenRef.current) return
    let cancelled = false
    api.auth
      .me()
      .then((u) => {
        if (cancelled) return
        setUser(u)
        setStatus('authenticated')
      })
      .catch(() => {
        if (cancelled) return
        tokenRef.current = null
        storeToken(null)
        setStatus('anonymous')
      })
    return () => {
      cancelled = true
    }
  }, [api])

  const start = useCallback((s: Session) => {
    tokenRef.current = s.token
    storeToken(s.token)
    setUser(s.user)
    setStatus('authenticated')
  }, [])

  const login = useCallback(async (email: string, password: string) => start(await api.auth.login(email, password)), [api, start])
  const signup = useCallback(async (email: string, password: string) => start(await api.auth.signup(email, password)), [api, start])
  const logout = useCallback(() => {
    tokenRef.current = null
    storeToken(null)
    setUser(null)
    setStatus('anonymous')
  }, [])

  const value = useMemo(() => ({ status, user, api, login, signup, logout }), [status, user, api, login, signup, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
