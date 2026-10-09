import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// GitHub Pages serves this under /Long-Term-Internship/fairshare/; the Express
// server (npm start) serves the build from / (BASE_PATH=/).
export default defineConfig({
  base: process.env.BASE_PATH ?? '/Long-Term-Internship/fairshare/',
  plugins: [react()],
  server: { port: 5190, proxy: { '/api': 'http://localhost:4100' } },
  preview: { port: 4190 },
  build: { sourcemap: true },
  test: {
    environment: 'jsdom',
    globals: true,
    testTimeout: 20_000,
    setupFiles: './src/test/setup.ts',
    exclude: ['e2e/**', 'node_modules/**', 'dist/**', 'dist-server/**'],
  },
})
