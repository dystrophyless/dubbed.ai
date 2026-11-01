import { defineConfig } from '@playwright/test';

const chromePath = process.env.CHROME_EXECUTABLE
  ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: 'http://127.0.0.1:5180',
    browserName: 'chromium',
    acceptDownloads: true,
    headless: true,
    launchOptions: {
      executablePath: chromePath,
      args: [
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream',
      ],
    },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm.cmd run dev',
    url: 'http://127.0.0.1:5180',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
