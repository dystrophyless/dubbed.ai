import { defineConfig } from '@playwright/test'

const baseURL = 'http://127.0.0.1:4289'

export default defineConfig({
  testDir: './e2e',
  testMatch: 'processing-visual.spec.ts',
  workers: 1,
  retries: 0,
  timeout: 20_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL,
    browserName: 'chromium',
    launchOptions: {
      args: [
        '--mute-audio',
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream',
      ],
    },
  },
  webServer: {
    command: 'npm.cmd run dev -- --host 127.0.0.1 --port 4289 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    env: { VITE_SERVICE_ADAPTER: 'mock' },
  },
})
