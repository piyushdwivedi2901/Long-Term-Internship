import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// GitHub Pages serves this under /Long-Term-Internship/couchcup/; the Express
// server (npm start) serves the build from / (BASE_PATH=/).
export default defineConfig({
  base: process.env.BASE_PATH ?? '/Long-Term-Internship/couchcup/',
  plugins: [react()],
  server: { port: 5210, proxy: { '/api': 'http://localhost:4300' } },
  preview: { port: 4490 },
  build: { sourcemap: true },
  test: {
    environment: 'jsdom',
    globals: true,
    testTimeout: 20_000,
    // Full-app UI tests on shared CI runners: one retry absorbs scheduler hiccups;
    // a real bug still fails twice.
    retry: process.env.CI ? 1 : 0,
    setupFiles: './src/test/setup.ts',
    exclude: ['e2e/**', 'node_modules/**', 'dist/**', 'dist-server/**'],
  },
})
