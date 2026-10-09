import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Served from GitHub Pages under /Long-Term-Internship/flowboard/ ; when the
// Express server hosts the build itself (npm start) BASE_PATH=/ is used.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/Long-Term-Internship/flowboard/',
  plugins: [react()],
  // `npm run dev:full` sends /api to the local Express server.
  server: { port: 5180, proxy: { '/api': 'http://localhost:4000' } },
  preview: { port: 4180 },
  build: {
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    testTimeout: 20_000,
    setupFiles: './src/test/setup.ts',
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
})
