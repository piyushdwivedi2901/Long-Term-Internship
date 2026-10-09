import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup, configure } from '@testing-library/react'

// Pages are lazy chunks; give cold CI runners time for the first import.
configure({ asyncUtilTimeout: 4000 })
afterEach(() => cleanup())

if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    window.matchMedia = (query: string) =>
      ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }) as MediaQueryList
  }
  if (!window.HTMLElement.prototype.scrollIntoView) window.HTMLElement.prototype.scrollIntoView = () => {}
  // jsdom has no object URLs; thumbnails and the file viewer only need a string.
  let n = 0
  if (!URL.createObjectURL) URL.createObjectURL = () => `blob:test/${++n}`
  if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {}
}

// Global UI state (Zustand) is module-level: start every test from a clean slate.
import { useUi } from '../lib/uiStore.ts'
afterEach(() => useUi.setState({ toasts: [] }))
