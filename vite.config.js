import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/Long-Term-Internship/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    // Playwright specs (e2e/) are run by `npm run test:e2e`, not Vitest.
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
})
