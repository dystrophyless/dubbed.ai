import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: 'auth-state-visual.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: 'list',
  outputDir: './test-results/auth-state-visual',
  use: {
    baseURL: 'http://127.0.0.1:4291',
    browserName: 'chromium',
    headless: true,
    colorScheme: 'light',
    launchOptions: { args: ['--mute-audio'] },
    screenshot: 'off',
    trace: 'off',
    video: 'off',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4291 --strictPort',
    url: 'http://127.0.0.1:4291/e2e/harness/auth-state-visual.html',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
