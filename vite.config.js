import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  base: '/Long-Term-Internship/',
  build: {
    sourcemap: true, // lets Lighthouse/DevTools map production stack traces to source
    // axe-core (~580 kB) is the one intentionally-large chunk: it is only
    // fetched when the visitor presses "Run axe audit" in Task 33.
    chunkSizeWarningLimit: 650,
  },
  plugins: [
    react(),
    // `npm run analyze` writes an interactive treemap to dist/stats.html
    // (and stats.json for scripts) — see docs/bundle-analysis.md.
    process.env.ANALYZE &&
      visualizer({ filename: 'stats/treemap.html', template: 'treemap', gzipSize: true, brotliSize: true }),
    process.env.ANALYZE &&
      visualizer({ filename: 'stats/stats.json', template: 'raw-data', gzipSize: true }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    // Playwright specs (e2e/) are run by `npm run test:e2e`, not Vitest.
    exclude: ['e2e/**', 'node_modules/**', 'dist/**', 'capstone/**', 'fairshare/**', 'covered/**', 'couchcup/**'],
  },
})
