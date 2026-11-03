import { expect, test, type Locator, type Page } from "@playwright/test";
import { expectNoA11yViolations, trackConsoleErrors } from "./support/a11y";

/*
 * Phase 4 — Result, high-fi: /prototypes/result/page?state=…
 * Every frozen state on desktop (1440 × 900) and phone (390 × 844): axe, no horizontal scroll, the key action in the
 * viewport. The video takes the full content width on desktop; full screen on the button, on double-click and on F;
 * the download is instant and named after the project; Re-record a turn is disabled (with a written reason) while a
 * version assembles; the chooser → the studio's re-record mode → Build the new version → back here, version 2
 * assembling → Watch version 2 (from 0:00); live, failed and RU.
 */
const PAGE = "/prototypes/result/page";

async function expectNoHorizontalScroll(page: Page) {
  const viewport = page.viewportSize()!.width;
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(viewport);
}

/** Fully visible in the first screen, without scrolling. */
async function expectAboveFold(page: Page, el: Locator) {
  await expect(el).toBeVisible();
  const box = (await el.boundingBox())!;
  const vp = page.viewportSize()!;
  const what = `${el} at ${JSON.stringify(box)}`;
  expect(box.y, what).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height, what).toBeLessThanOrEqual(vp.height);
  expect(box.x, what).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width, what).toBeLessThanOrEqual(vp.width);
}

const btn = (page: Page, name: string | RegExp) => page.getByRole("button", { name, exact: typeof name === "string" });
const download = (page: Page) => page.getByTestId("result-download");
const rerecord = (page: Page) => page.getByTestId("result-choose");
const status = (page: Page) => page.getByTestId("result-status");

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("dubbed.language")) localStorage.setItem("dubbed.language", "en");
  });
});

const STATES: { state: string; check: (page: Page) => Promise<void> }[] = [
  {
    state: "assembling",
    check: async (page) => {
      await expect(page.getByTestId("result-assembling").getByRole("status")).toHaveText("Putting your voice into the scene");
      await expect(page.getByText("About a minute left")).toBeVisible();
      await expect(status(page)).toHaveText("6 turns recorded");
      await expect(download(page)).toHaveCount(0);
      await expect(page.getByTestId("player-controls")).toHaveCount(0);
      // owner answer 5: no re-recording while it assembles — the reason is written next to the button
      await expect(rerecord(page)).toBeDisabled();
      await expect(page.getByTestId("result-rerecord-reason")).toHaveText("You can re-record once this version is ready");
      await expect(rerecord(page)).toHaveAccessibleDescription("You can re-record once this version is ready");
      await expectAboveFold(page, btn(page, "Notify me when it’s ready"));
      await expect(page.getByText("You can leave this page — the video keeps assembling.")).toBeVisible();
    },
  },
  {
    state: "ready",
    check: async (page) => {
      await expectAboveFold(page, download(page));
      await expect(download(page)).toHaveText("Download MP4");
      await expectAboveFold(page, rerecord(page));
      await expect(rerecord(page)).toBeEnabled();
      await expect(page.getByTestId("result-rerecord-reason")).toHaveCount(0);
      await expect(status(page)).toHaveText("6 turns · 720p MP4");
      await expectAboveFold(page, btn(page, "Play"));
      await expectAboveFold(page, btn(page, "Full screen"));
      await expect(btn(page, "Full screen")).toHaveAttribute("aria-keyshortcuts", "F");
      await expect(page.getByRole("slider", { name: "Playback position" })).toBeVisible();
      // the stage spans the card at 2.35:1; on desktop the card is the full content width (1120)
      const card = (await page.getByTestId("result-card").boundingBox())!;
      const stage = (await page.getByTestId("result-stage").locator("figure").boundingBox())!;
      expect(Math.abs(stage.width - card.width)).toBeLessThanOrEqual(2);
      expect(Math.abs(stage.width / stage.height - 960 / 408)).toBeLessThan(0.02);
      if (page.viewportSize()!.width > 1024) expect(card.width).toBeGreaterThanOrEqual(1118);
      else expect(card.width).toBeGreaterThanOrEqual(page.viewportSize()!.width - 2 * 16 - 1); // phones: the usual 16px side margins (owner 2026-11-04)
    },
  },
  {
    state: "chooser",
    check: async (page) => {
      const dialog = page.getByRole("dialog", { name: "Which turn do you want to re-record?" });
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText("Re-recording and the new version are free.");
      await expect(dialog.getByRole("radio", { name: /^3\. Then why are we standing here/ })).toBeChecked();
      await expectAboveFold(page, dialog.getByRole("button", { name: "Re-record turn 3" }));
      await expectAboveFold(page, dialog.getByRole("button", { name: "Cancel" }));
    },
  },
  {
    state: "new-version-assembling",
    check: async (page) => {
      await expect(status(page)).toHaveText("Assembling version 2 with turn 3 re-recorded — keep watching this one.");
      await expectAboveFold(page, download(page));
      await expect(download(page)).toHaveText("Download MP4");
      await expect(rerecord(page)).toBeDisabled();
      await expect(page.getByTestId("result-rerecord-reason")).toHaveText("You can re-record once version 2 is ready");
      await expect(btn(page, "Play")).toBeEnabled(); // the current version keeps playing
      await expect(page.getByTestId("result-switch")).toHaveCount(0);
    },
  },
  {
    state: "new-version-ready",
    check: async (page) => {
      await expect(status(page)).toHaveText("Version 2 is ready — turn 3 re-recorded.");
      await expectAboveFold(page, page.getByTestId("result-switch"));
      await expect(page.getByTestId("result-switch")).toHaveText("Watch version 2");
      await expectAboveFold(page, download(page));
      await expect(download(page)).toHaveText("Download version 1"); // the version on screen
      await expect(rerecord(page)).toBeEnabled();
    },
  },
  {
    state: "new-version-failed",
    check: async (page) => {
      await expect(status(page)).toHaveText("Couldn’t assemble version 2. Version 1 stays as it is.");
      await expectAboveFold(page, page.getByTestId("result-retry-new"));
      await expectAboveFold(page, download(page));
      await expect(rerecord(page)).toBeEnabled();
    },
  },
  {
    state: "failed",
    check: async (page) => {
      await expect(page.getByRole("alert")).toContainText("We couldn’t put your video together");
      await expect(page.getByRole("alert")).toContainText("trying again is free");
      await expectAboveFold(page, page.getByTestId("result-retry"));
      await expect(download(page)).toHaveCount(0);
    },
  },
];

for (const { state, check } of STATES) {
  test(`result · ${state}`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto(`${PAGE}?state=${state}`);
    await expect(page.getByRole("heading", { level: 1, name: "Kitchen scene" })).toBeVisible();
    await check(page);
    await expectNoHorizontalScroll(page);
    await expectNoA11yViolations(page);
    expect(errors).toEqual([]);
  });
}

test("result · portrait clip: black bars in the 2.35:1 stage, Download above the fold", async ({ page }) => {
  await page.goto(`${PAGE}?state=ready&ratio=portrait`);
  const frame = (await page.getByTestId("result-stage").locator("figure").boundingBox())!;
  expect(Math.abs(frame.width / frame.height - 960 / 408)).toBeLessThan(0.03);
  const clip = (await page.getByTestId("result-stage").locator("video").boundingBox())!;
  expect(Math.abs(clip.width / clip.height - 9 / 16)).toBeLessThan(0.03);
  await expectAboveFold(page, download(page));
  await expectNoHorizontalScroll(page);
});

const fullscreenId = (page: Page) =>
  page.evaluate(() => (document.fullscreenElement as HTMLElement | null)?.dataset.testid ?? null);

test("result · full screen: the button, double-click on the picture, Esc / the button leaves", async ({ page }) => {
  await page.goto(`${PAGE}?state=ready`);
  await btn(page, "Full screen").click();
  await expect.poll(() => fullscreenId(page)).toBe("result-screen");
  // the controls go full screen too; the button now leaves
  await expect(btn(page, "Exit full screen")).toBeVisible();
  await btn(page, "Exit full screen").click();
  await expect.poll(() => fullscreenId(page)).toBeNull();
  await expect(btn(page, "Full screen")).toBeVisible();

  await page.getByTestId("player-picture").dblclick();
  await expect.poll(() => fullscreenId(page)).toBe("result-screen");
  await page.evaluate(() => document.exitFullscreen()); // what Esc does (the browser's own key)
  await expect.poll(() => fullscreenId(page)).toBeNull();
});

test("result · keyboard: F toggles full screen, Space plays / pauses; tooltips name the keys", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard shortcuts are a desktop feature");
  await page.goto(`${PAGE}?state=ready`);
  await page.locator("body").click({ position: { x: 5, y: 300 } });
  await page.keyboard.press("f");
  await expect.poll(() => fullscreenId(page)).toBe("result-screen");
  await page.keyboard.press("f");
  await expect.poll(() => fullscreenId(page)).toBeNull();
  await page.keyboard.press("Space");
  await expect(btn(page, "Pause")).toBeVisible();
  await page.keyboard.press("Space");
  await expect(btn(page, "Play")).toBeVisible();
  await btn(page, "Full screen").focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("tooltip")).toHaveText("Full screen · F");
});

test("result · Download is instant and named after the project", async ({ page }) => {
  await page.goto(`${PAGE}?state=ready`);
  const [file] = await Promise.all([page.waitForEvent("download"), download(page).click()]);
  expect(file.suggestedFilename()).toBe("Kitchen scene.mp4");
  await expect(download(page)).toBeEnabled(); // no "preparing the file" state
});

test("result · live: assembling → ready", async ({ page }) => {
  await page.goto(PAGE);
  await expect(page.getByTestId("result")).toHaveAttribute("data-phase", "assembling");
  await expect(rerecord(page)).toBeDisabled();
  await expect(download(page)).toBeVisible({ timeout: 12_000 });
  await expect(page.getByTestId("result")).toHaveAttribute("data-phase", "ready");
  await expect(rerecord(page)).toBeEnabled();
  await expect(page.getByRole("status").filter({ hasText: "Your video is ready" })).toBeAttached();
});

test("result · failed → Try again assembles again", async ({ page }) => {
  await page.goto(`${PAGE}?state=failed`);
  await page.getByTestId("result-retry").click();
  await expect(page.getByTestId("result")).toHaveAttribute("data-phase", "assembling");
  await expect(download(page)).toBeVisible({ timeout: 12_000 });
});

test("result · a failed new version: Try again leaves version 1 playing", async ({ page }) => {
  await page.goto(`${PAGE}?state=new-version-failed`);
  await page.getByTestId("result-retry-new").click();
  await expect(status(page)).toHaveText(/^Assembling version 2/);
  await expect(rerecord(page)).toBeDisabled();
  await expect(page.getByTestId("result-switch")).toBeVisible({ timeout: 12_000 });
});

test("result · Re-record a turn → studio re-record mode → Build the new version → Watch version 2 from 0:00", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto(`${PAGE}?state=ready`);
  await rerecord(page).click();
  const dialog = page.getByRole("dialog", { name: "Which turn do you want to re-record?" });
  await expect(dialog.getByRole("radio", { name: /^1\./ })).toBeChecked(); // the playhead is at the start
  await dialog.getByRole("radio", { name: /^3\./ }).check();
  await dialog.getByRole("button", { name: "Re-record turn 3" }).click();

  // the studio in re-record mode: every turn has a take; no Next, no Build until a turn is re-recorded
  await expect(page).toHaveURL(/\/prototypes\/studio\/turn\?mode=rerecord&turn=3&turns=6$/);
  await expect(page.getByText("Turn 3 of 6")).toBeAttached();
  await expect(btn(page, "Next")).toHaveCount(0);
  await expect(page.getByTestId("studio-build")).toHaveCount(0);
  await btn(page, "Record again").click();
  await btn(page, "Stop").click();
  const build = btn(page, "Build the new version");
  await expect(build).toBeVisible({ timeout: 5_000 });
  await expect(build).toBeEnabled();
  await build.click();

  // back on the result: version 1 plays while version 2 assembles; re-recording waits
  await expect(page).toHaveURL(/\/prototypes\/result\/page\?rerecorded=3&turns=6$/);
  await expect(status(page)).toHaveText("Assembling version 2 with turn 3 re-recorded — keep watching this one.");
  await expect(rerecord(page)).toBeDisabled();
  await expect(download(page)).toBeVisible();
  const watch = page.getByTestId("result-switch");
  await expect(watch).toBeVisible({ timeout: 12_000 });
  await expect(download(page)).toHaveText("Download version 1");

  // play version 1 a little, then switch: version 2 plays from the start (owner answer 4)
  const video = page.getByTestId("result-stage").locator("video");
  await video.evaluate((v: HTMLVideoElement) => { v.muted = true; v.currentTime = 8; });
  await watch.click();
  await expect(page.getByTestId("result")).toHaveAttribute("data-shown", "2");
  expect(await video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeLessThan(2);
  await expect(status(page)).toHaveText("Version 2 · turn 3 re-recorded · 720p MP4");
  await expect(download(page)).toHaveText("Download MP4");
  await expect(page.getByTestId("result-switch")).toHaveCount(0);
  await expect(page.getByTestId("player-controls").getByRole("button").first()).toBeFocused();
});

test("result (RU) · ready, assembling and the chooser in Russian", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("dubbed.language", "ru"));
  await page.goto(`${PAGE}?state=ready`);
  await expect(page.getByRole("heading", { level: 1, name: "Сцена на кухне" })).toBeVisible();
  await expectAboveFold(page, btn(page, "Скачать MP4"));
  await expectAboveFold(page, btn(page, "Во весь экран"));
  await expect(status(page)).toHaveText("6 реплик · 720p MP4");
  await expectNoHorizontalScroll(page);
  await expectNoA11yViolations(page);
  const [file] = await Promise.all([page.waitForEvent("download"), download(page).click()]);
  expect(file.suggestedFilename()).toBe("Сцена на кухне.mp4");
  await rerecord(page).click();
  await expect(page.getByRole("dialog", { name: "Какую реплику перезаписать?" })).toBeVisible();
  await page.goto(`${PAGE}?state=new-version-assembling`);
  await expect(page.getByTestId("result-rerecord-reason")).toHaveText("Перезаписать можно, когда версия 2 будет готова");
  await expectNoHorizontalScroll(page);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("result · no undim or progress transitions", async ({ page }) => {
    await page.goto(`${PAGE}?state=assembling`);
    const video = page.getByTestId("result-stage").locator("video");
    expect(await video.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe("0s");
  });
});
