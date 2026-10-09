/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_BACKEND?: 'server' | 'demo'
  readonly VITE_API_URL?: string
}
