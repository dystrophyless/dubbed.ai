import { defineConfig } from '@playwright/test'

const baseURL = 'http://127.0.0.1:4173'

export default defineConfig({
  testDir: './e2e',
  workers: 1,
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
    command: 'npm.cmd run dev -- --host 127.0.0.1 --port 4173 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    env: { VITE_SERVICE_ADAPTER: 'mock' },
  },
})
