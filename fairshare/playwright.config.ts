import { defineConfig, devices } from '@playwright/test'

/**
 * Two deployments, tested end to end:
 *  - "demo":   the static GitHub Pages build (backend runs in the browser)
 *  - "server": production Express + SQLite serving the built app
 * CHROMIUM_PATH lets environments with a pre-installed Chrome skip the download.
 */
const launchOptions = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { trace: 'on-first-retry', screenshot: 'only-on-failure', launchOptions },
  projects: [
    { name: 'demo', testIgnore: /server\.spec\.ts/, use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:4290/Long-Term-Internship/fairshare/' } },
    { name: 'server', testMatch: /server\.spec\.ts/, use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:4292/' } },
  ],
  webServer: [
    {
      command: 'npx vite build && npx vite preview --port 4290 --strictPort',
      url: 'http://localhost:4290/Long-Term-Internship/fairshare/',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      command: 'npm run build:server && node server/index.ts',
      url: 'http://localhost:4292/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: { NODE_ENV: 'production', PORT: '4292', JWT_SECRET: 'e2e-secret', DB_FILE: ':memory:', STATIC_DIR: 'dist-server' },
    },
  ],
})
