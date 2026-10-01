import { defineConfig, devices } from '@playwright/test'

const WEB_PORT = 4173
const API_PORT = 3101
const BASE = `http://localhost:${WEB_PORT}/Long-Term-Internship/`

/**
 * E2E (Task 39). Two servers are started automatically:
 *  - the production build, served by `vite preview` (what GitHub Pages serves)
 *  - the real Express + SQLite API on a throw-away database (api.spec.ts)
 *
 * CHROMIUM_PATH lets a sandbox with a pre-installed browser skip
 * `npx playwright install`.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `npm run build && npx vite preview --port ${WEB_PORT} --strictPort`,
      url: BASE,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'node server/index.js',
      url: `http://localhost:${API_PORT}/api/health`,
      reuseExistingServer: !process.env.CI,
      env: {
        PORT: String(API_PORT),
        DB_FILE: ':memory:',
        JWT_SECRET: 'e2e-secret',
      },
    },
  ],
})
