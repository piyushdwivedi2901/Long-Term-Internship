import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup, configure } from '@testing-library/react'

// Pages are lazy-loaded chunks; on a cold, busy CI runner the first import can
// take longer than Testing Library's 1s default.
configure({ asyncUtilTimeout: 4000 })

afterEach(() => cleanup())

// jsdom lacks these browser APIs used by the app / libraries.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}
if (typeof window !== 'undefined' && !window.HTMLElement.prototype.scrollIntoView) window.HTMLElement.prototype.scrollIntoView = () => {}
