module.exports = {
  testDir: "D:/Program/python/Dubbed/frontend/e2e",
  testMatch: "shared-controls.spec.ts",
  outputDir: "D:/Program/python/Dubbed/_docs/evidence/visual-qa-fixes-2026-10-25/issue-78/playwright-results",
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4578",
    browserName: "chromium",
    launchOptions: {
      args: [
        "--mute-audio",
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
      ],
    },
  },
};
