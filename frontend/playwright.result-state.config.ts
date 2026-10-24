import { defineConfig } from '@playwright/test'

const baseURL = 'http://127.0.0.1:4295'

export default defineConfig({
  testDir: './e2e',
  testMatch: 'result-delivery-state.spec.ts',
  outputDir: 'test-results/result-state-ui',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL,
    browserName: 'chromium',
    colorScheme: 'light',
    reducedMotion: 'reduce',
    viewport: { width: 1440, height: 1000 },
    screenshot: 'off',
    video: 'off',
    trace: 'off',
    launchOptions: { args: ['--mute-audio'] },
  },
  webServer: {
    command: 'npm.cmd run dev -- --host 127.0.0.1 --port 4295 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    env: { VITE_SERVICE_ADAPTER: 'mock' },
  },
})
