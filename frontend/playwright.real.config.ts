import { defineConfig } from '@playwright/test'

const baseURL = 'http://127.0.0.1:4174'

export default defineConfig({
  testDir: './e2e-real',
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
    command: 'npm.cmd run dev -- --mode mock --host 127.0.0.1 --port 4174 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    env: { ...process.env, VITE_SERVICE_ADAPTER: 'real' },
  },
})
