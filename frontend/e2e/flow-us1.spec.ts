import { expect, test, type Page } from "@playwright/test";
import { statSync } from "node:fs";
import { holdStore } from "./support/persistence";
import { openScreen } from "./support/screens";
import { expectNoA11yViolations, trackConsoleErrors } from "./support/a11y";
import { balanceLink, blockMicrophone, noHorizontalScroll, resetDemo, uploadScene, type Lang } from "./support/flow";

/*
 * Feature 001, US1 — dub a scene from start to finish on the real routes, on mock services:
 * /new → upload scene.mp4 → Processing → studio turn 1…3 → Build the
 * result → Result → Download (Scene.webm). Desktop business flow in EN and RU; mobile has a separate layout suite.
 * `?demo=reset,speed:2` retains an observable preparation window for the accessibility check.
 */
const COPY: Record<Lang, { start: RegExp; startName: string }> = {
  en: { start: /Start dubbing · 14 credits/, startName: "Start dubbing · 14 credits" },
  ru: { start: /Начать озвучку · 14 кредитов/, startName: "Начать озвучку · 14 кредитов" },
};

const recordButton = (page: Page) => page.locator('button[aria-keyshortcuts="R"]');
const originalButton = (page: Page) => page.locator('button[aria-keyshortcuts="Space"]');
const next = (page: Page) => page.getByTestId("studio-next");

/** Presses Record and waits until the take is saved (window ends by itself, or Stop early). */
async function recordTurn(page: Page, how: "window" | "stop" | "key") {
  const rec = recordButton(page);
  if (how === "key") await page.keyboard.press("r");
  else await rec.click();
  // while recording / saving every other button stays in place, disabled
  await expect(page.getByTestId("studio-actions")).toHaveAttribute("data-state", /recording|saving/);
  await expect(originalButton(page)).toBeDisabled();
  await expect(next(page)).toHaveCount(0);
  await expect(page.getByTestId("stage-muted")).toBeVisible();
  await expect(page.getByTestId("audio-track")).toHaveAttribute("data-mode", "recording");
  await expect(page.getByTestId("record-hint")).not.toBeEmpty();
  expect(await page.locator("video").first().evaluate((v: HTMLVideoElement) => v.muted)).toBe(true);
  const turnUrl = page.url();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(turnUrl);
  if (await page.getByTestId("studio-prev").count()) await expect(page.getByTestId("studio-prev")).toBeDisabled();
  if (how !== "window") {
    const release = await holdStore(page, "takes");
    try {
      if (how === "key") await page.keyboard.press("r");
      else await rec.click(); // Stop
      await expect(page.getByTestId("studio-actions")).toHaveAttribute("data-state", "saving");
      await expect(rec).toBeDisabled();
      await expect(next(page)).toHaveCount(0); // not before the real durable write resolves
    } finally { await release(); }
  }
  await expect(page.getByTestId("studio-actions")).toHaveAttribute("data-state", "saved", { timeout: 15_000 });
}

async function dubTheScene(page: Page, lang: Lang) {
  const errors = trackConsoleErrors(page);
  const t = COPY[lang];
  await resetDemo(page, "speed:2", "/new", lang);

  /* ---- New dub ---- */
  await expect(page.getByTestId("new-dub")).toHaveAttribute("data-state", "empty");
  await expect(balanceLink(page)).toContainText("120");
  await noHorizontalScroll(page);
  await expectNoA11yViolations(page);

  await uploadScene(page);
  await expect(page.getByTestId("new-dub")).toHaveAttribute("data-state", /uploading|checking/);
  await expect(page.getByTestId("new-dub")).toHaveAttribute("data-state", "ready", { timeout: 20_000 });
  await expect(page.getByTestId("new-dub-card")).toContainText("Scene");
  const start = page.getByTestId("cost-button");
  await expect(start).toBeEnabled();
  await expect(start).toHaveText(t.start);
  await expect(page.getByText(lang === "en" ? /14 credits/ : /14 кредитов/)).toHaveCount(1);
  await expect(page.getByTestId("range-value")).toContainText(lang === "en" ? /s$/ : /с$/);
  if (lang === "en") {
    const end = page.getByRole("slider", { name: /end/i });
    await end.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(start).toHaveText("Start dubbing · 13 credits");
    await page.keyboard.press("ArrowRight");
    await expect(start).toHaveText(t.start);
    const play = page.getByRole("button", { name: "Play section", exact: true });
    const video = page.locator("video").first();
    await play.click();
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused && v.currentTime > 0)).toBe(true);
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  }
  await noHorizontalScroll(page);
  await expectNoA11yViolations(page);

  /* ---- Start → Processing, the credits are reserved at once ---- */
  const releaseStart = await holdStore(page, "projects");
  try {
    await start.click();
    await expect(page.getByTestId("new-dub-card")).toHaveAttribute("aria-busy", "true");
    await expect(page.getByTestId("cost-button")).toBeDisabled();
    for (const slider of await page.getByTestId("range-selector").getByRole("slider").all()) await expect(slider).toBeDisabled();
    await expect(page.getByRole("button", { name: lang === "en" ? "Play section" : "Смотреть отрезок", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: lang === "en" ? "Replace video" : "Заменить видео", exact: true })).toBeDisabled();
  } finally { await releaseStart(); }
  await expect(page).toHaveURL(/\/projects\/[^/]+\/processing$/);
  await expect(page.getByTestId("processing")).toBeVisible();
  await expect(balanceLink(page)).toContainText("106");
  await expect(page.getByTestId("processing-progress")).toBeVisible();
  await expect(page.getByTestId("processing")).toHaveAttribute("data-phase", /queued|running/);
  await noHorizontalScroll(page);
  await expectNoA11yViolations(page);
  await expect(page.getByTestId("processing")).toHaveAttribute("data-phase", "running", { timeout: 15_000 });
  await expect(page.getByTestId("processing-found")).not.toBeEmpty({ timeout: 15_000 });
  await expect(page.getByTestId("processing-progress").getByRole("progressbar")).toHaveAccessibleName(lang === "en" ? /Preparing/ : /Подготовка/);
  await expect(page.getByTestId("processing-progress").getByRole("progressbar")).toHaveAttribute("aria-valuetext", lang === "en" ? /Finding the lines|Getting the turns ready/ : /.+/);
  await expect(page.getByText(lang === "en" ? "14 credits in reserve — charged when it’s ready" : /14 кредитов в резерве/)).toHaveCount(1);

  /* ---- ready → the studio opens on turn 1 by itself ---- */
  await expect(page.getByTestId("processing")).toHaveAttribute("data-phase", "ready", { timeout: 20_000 });
  await expect(page.getByTestId("processing-found")).toContainText("3");
  await expect(page.getByTestId("processing")).toContainText(lang === "en" ? "14 credits charged" : /Списано 14 кредитов/);
  await expect(page.getByTestId("processing-cancel")).toHaveCount(0);
  await expect(page).toHaveURL(/\/projects\/[^/]+\/turns\/1$/, { timeout: 15_000 });

  /* ---- Studio: three turns ---- */
  await expect(page.getByTestId("studio")).toBeVisible();
  await expect(page.getByTestId("studio-stage")).toHaveAttribute("data-playing", "original");
  await expect.poll(() => page.locator("video").first().evaluate((v: HTMLVideoElement) => !v.paused && v.currentTime > 0)).toBe(true);
  await expect(page.getByTestId("studio-stage")).toHaveAttribute("data-playing", "none");
  await expect(page.getByTestId("turn-line")).not.toBeEmpty();
  if (lang === "en") {
    await page.locator("body").click({ position: { x: 1, y: 1 } });
    await page.keyboard.press("Space");
    await expect(originalButton(page)).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Space");
    await expect(originalButton(page)).toHaveAttribute("aria-pressed", "false");
    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL(/\/turns\/1$/); // no take, no forward navigation
    const volume = page.getByTestId("volume-button");
    await volume.click();
    const slider = page.getByRole("dialog").getByRole("slider");
    await expect(slider).toBeFocused();
    const before = Number(await slider.getAttribute("aria-valuenow"));
    await page.keyboard.press("ArrowLeft");
    await expect(slider).toHaveAttribute("aria-valuenow", String(before - 5));
    await expect(page).toHaveURL(/\/turns\/1$/);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(volume).toBeFocused();
    await expect(page.getByTestId("studio-stage")).toHaveAttribute("data-playing", "none"); // arrival did not restart
  }
  await expect(next(page)).toHaveCount(0); // no take yet → no Next
  await expect(recordButton(page)).toBeEnabled();
  await noHorizontalScroll(page);
  await expectNoA11yViolations(page);

  await recordTurn(page, "window");
  await expect(next(page)).toBeEnabled();
  const myTake = page.getByRole("button", { name: lang === "en" ? "My take" : "Мой дубль", exact: true });
  await expect(myTake).toBeVisible();
  await myTake.click();
  await expect(page.getByTestId("studio-stage")).toHaveAttribute("data-playing", "take");
  await expect(page.getByTestId("stage-take")).toBeVisible();
  await expect.poll(() => page.locator("video").first().evaluate((v: HTMLVideoElement) => !v.paused && v.currentTime > 0)).toBe(true);
  await myTake.click();
  if (lang === "en") {
    await recordButton(page).focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("tooltip")).toHaveText("Record again · R");
    expect(await recordButton(page).evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("solid");
  }
  await expectNoA11yViolations(page);
  await next(page).click();
  await expect(page).toHaveURL(/\/turns\/2$/);
  const dots = page.getByTestId("turn-dots").locator("[data-s]");
  await expect(dots.nth(0)).toHaveAttribute("data-s", "done");
  await expect(dots.nth(1)).toHaveAttribute("data-s", "current");

  await recordTurn(page, "key"); // R starts, R stops early
  await page.keyboard.press("ArrowLeft"); // turn 1 keeps its take
  await expect(page).toHaveURL(/\/turns\/1$/);
  await expect(dots.nth(0)).toHaveAttribute("data-s", "current");
  await expect(dots.nth(1)).toHaveAttribute("data-s", "done");
  await expect(page.getByTestId("studio-actions")).toHaveAttribute("data-state", "saved");
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/\/turns\/2$/);
  await expect(page.getByTestId("studio-actions")).toHaveAttribute("data-state", "saved");
  await next(page).click();
  await expect(page).toHaveURL(/\/turns\/3$/);

  await recordTurn(page, "stop");
  await noHorizontalScroll(page);
  await expect(next(page)).toHaveText(lang === "en" ? "Build the result" : /Собрать результат/);
  await next(page).click();

  /* ---- Result: assembling (real time, ~13 s) → player → download ---- */
  await expect(page).toHaveURL(/\/projects\/[^/]+\/result$/);
  await expect(page.getByTestId("result")).toBeVisible();
  await expect(page.getByTestId("result")).toHaveAttribute("data-phase", "assembling");
  await expect(page.getByTestId("result-choose")).toBeDisabled();
  await expect(page.getByTestId("result-rerecord-reason")).toBeVisible();
  await expect(page.getByTestId("result-choose")).toHaveAccessibleDescription(lang === "en" ? /ready/ : /готов/);
  await expect(page.getByTestId("result-download")).toHaveCount(0);
  await noHorizontalScroll(page);
  await expectNoA11yViolations(page);
  await expect(page.getByTestId("result")).toHaveAttribute("data-phase", "ready", { timeout: 60_000 });
  await expect(page.locator("#result-format")).toHaveText("WebM");
  await expect(page.getByTestId("result-download")).toHaveAccessibleDescription("WebM");
  // the player plays the rendered file itself: it has a real duration
  // (the browser learns a recorded file's duration asynchronously, by seeking to its end: poll, do not read once)
  await expect
    .poll(() => page.locator("video").first().evaluate((v: HTMLVideoElement) => (Number.isFinite(v.duration) ? v.duration : 0)), { timeout: 15_000 })
    .toBeGreaterThan(10);
  await expect(page.getByTestId("player-controls")).not.toContainText("0:00 / 0:00");
  await noHorizontalScroll(page);
  await expectNoA11yViolations(page);

  await expect(page.getByTestId("result-download")).toHaveText(lang === "en" ? "Download" : "Скачать");
  if (lang === "en") await exercisePlayer(page);
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("result-download").click()]);
  expect(download.suggestedFilename()).toBe("Scene.webm");
  expect(statSync((await download.path())!).size).toBeGreaterThan(0);

  // Credits: 120 − 14 = 106, nothing reserved any more
  await expect(balanceLink(page)).toContainText("106");
  expect(errors).toEqual([]);
}

async function exercisePlayer(page: Page) {
  const video = page.locator("video").first();
  const fullscreen = page.getByTestId("player-fullscreen");
  await expect(fullscreen).toHaveAttribute("aria-keyshortcuts", "F");
  const seek = page.getByTestId("player-controls").getByRole("slider");
  await seek.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0);
  await page.locator("body").click({ position: { x: 1, y: 1 } });
  await video.evaluate((v: HTMLVideoElement) => v.pause());
  await page.keyboard.press("Space");
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);
  await page.keyboard.press("Space");
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await fullscreen.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("tooltip")).toContainText("F");
  const isFullscreen = () => page.evaluate(() => document.fullscreenElement?.getAttribute("data-testid") ?? null);
  await fullscreen.click();
  await expect.poll(isFullscreen).toBe("result-screen");
  await expect(page.getByTestId("result-screen").getByTestId("player-controls")).toBeVisible();
  await fullscreen.click();
  await expect.poll(isFullscreen).toBeNull();
  await page.getByTestId("player-picture").dblclick();
  await expect.poll(isFullscreen).toBe("result-screen");
  await fullscreen.click();
  await expect.poll(isFullscreen).toBeNull();
  await page.keyboard.press("f");
  await expect.poll(isFullscreen).toBe("result-screen");
  await page.keyboard.press("f");
  await expect.poll(isFullscreen).toBeNull();
}

// Native fullscreen Escape is handled by Chrome, not the app; headless CDP key dispatch does not leave fullscreen.
// Retain the real keyboard assertion (not document.exitFullscreen) until the headed browser path can be verified.
test.fixme("US1 — native Escape leaves fullscreen", async ({ page }) => {
  await openScreen(page, "result");
  await page.getByTestId("player-fullscreen").click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement !== null)).toBe(true);
  await page.keyboard.press("Escape");
  await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBeNull();
});

test.describe("US1 — dub a scene from start to finish", () => {
  test.setTimeout(180_000);

  test("EN", async ({ page }) => {
    await dubTheScene(page, "en");
  });

  test("RU (long copy)", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "one RU run, on desktop");
    await dubTheScene(page, "ru");
  });
});

async function openRecordedBeforeBuild(page: Page) {
  await openScreen(page, "result");
  // Reuse coherent source/PCM takes, but before its first build: no current/cached result.
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("dubbed-mock"); r.onsuccess = () => resolve(r.result);
    });
    const tx = db.transaction(["projects", "results"], "readwrite");
    const r = tx.objectStore("projects").get("layout");
    r.onsuccess = () => tx.objectStore("projects").put({ ...r.result, state: "recording", currentVersion: null });
    tx.objectStore("results").clear();
    await new Promise<void>((resolve) => { tx.oncomplete = () => resolve(); });
    db.close();
  });
  await page.goto("/projects/layout/turns/39?demo=assembly-failed,speed:1");
  await expect(page.getByTestId("studio-actions")).toHaveAttribute("data-state", "saved");
}

test("US1 — reduced motion removes studio slide/dot and result undim transitions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openRecordedBeforeBuild(page);
  await page.getByTestId("studio-next").click();
  await expect(page).toHaveURL(/\/turns\/40$/);
  expect(await page.locator("main [data-dir=next]").first().evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  expect(await page.getByTestId("turn-dots").locator("[data-s=current]").evaluate((el) => getComputedStyle(el).transitionDuration)).toBe("0s");
  await page.getByTestId("studio-next").click();
  await expect(page.getByTestId("result")).toHaveAttribute("data-phase", "assembling");
  expect(await page.getByTestId("result-stage").locator("video").evaluate((el) => getComputedStyle(el).transitionDuration)).toBe("0s");
});

test("US1 — first assembly fails and retry is free", async ({ page }) => {
  test.setTimeout(90_000);
  await openRecordedBeforeBuild(page);
  await page.getByTestId("studio-next").click();
  await page.getByTestId("studio-next").click();
  await expect(page.getByTestId("result")).toHaveAttribute("data-phase", "assembling");
  await expect(page.getByTestId("result")).toHaveAttribute("data-phase", "failed", { timeout: 20_000 });
  await expect(page.getByTestId("result")).toContainText(/trying again is free/i);
  await expect(page.getByTestId("result-download")).toHaveCount(0);
  const before = await balanceLink(page).innerText();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByTestId("result")).toHaveAttribute("data-phase", "assembling");
  await expect(page.getByTestId("result")).toHaveAttribute("data-phase", "ready", { timeout: 60_000 });
  await expect(page.getByTestId("result-download")).toHaveText("Download");
  await expect(balanceLink(page)).toHaveText(before);
});

test.describe("US1 — studio states", () => {
  test.setTimeout(120_000);

  /** A project that is ready to record, opened on its studio turn. */
  async function openStudio(page: Page, windowMs = 1000) {
    await openScreen(page, "studio", "en", { turns: 1, windowMs });
    await expect(page.getByTestId("studio")).toBeVisible();
  }

  test("blocked microphone: the notice, Record disabled in place, no take saved", async ({ page }) => {
    await page.addInitScript(() => {
      const native = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      (window as Window & { restoreTestMic?: () => void }).restoreTestMic = () => { navigator.mediaDevices.getUserMedia = native; };
    });
    await blockMicrophone(page);
    // recordTurn checks the recording-only UI one by one: a 1 s window can end before it gets there on a busy machine
    await openStudio(page, 4000);
    await recordButton(page).click();
    await expect(page.getByTestId("mic-blocked")).toBeVisible();
    // Record stays in its slot, disabled; the notice is its description
    const blocked = page.locator('button[aria-describedby="studio-mic-reason"]');
    await expect(blocked).toBeDisabled();
    await expect(blocked).toHaveAccessibleDescription(/microphone/i);
    await expect(page.getByTestId("mic-blocked").getByRole("link", { name: /settings/i })).toHaveAttribute("href", "/settings");
    await expect(next(page)).toHaveCount(0);
    await page.keyboard.press("r");
    await expect(page.getByTestId("studio-actions")).toHaveAttribute("data-state", "idle");
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);
    await page.evaluate(() => (window as Window & { restoreTestMic?: () => void }).restoreTestMic?.());
    await page.getByTestId("mic-blocked").getByRole("button", { name: "Try again" }).click();
    await expect(page.getByTestId("mic-blocked")).toHaveCount(0);
    await expect(recordButton(page)).toBeEnabled();
    await recordTurn(page, "window");
  });

  test("unsaved-take dialog wraps Tab/Shift+Tab and restores its opener", async ({ page }) => {
    await openStudio(page, 10000);
    await recordButton(page).click();
    await page.getByTestId("studio-exit").click();
    const dialog = page.getByTestId("leave-dialog");
    const buttons = dialog.getByRole("button");
    await expect(dialog).toBeVisible();
    await buttons.first().focus();
    await page.keyboard.press("Shift+Tab");
    await expect(buttons.last()).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(buttons.first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId("studio-exit")).toBeFocused();
  });

  test("leaving a running take asks first; Stay keeps what was recorded", async ({ page }) => {
    await openStudio(page, 10000);
    await recordButton(page).click();
    await expect(page.getByTestId("studio-actions")).toHaveAttribute("data-state", "recording");
    await page.getByTestId("studio-exit").click();
    const dialog = page.getByTestId("leave-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Stay" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Leave without saving" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Save and leave" })).toBeVisible();
    await page.keyboard.press("Escape"); // Escape means Stay, including saving the running take
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId("studio-actions")).toHaveAttribute("data-state", "saved", { timeout: 15_000 });
    await recordButton(page).click();
    await expect(page.getByTestId("studio-actions")).toHaveAttribute("data-state", "recording");
    await page.getByTestId("studio-exit").click();
    await dialog.getByRole("button", { name: "Stay", exact: true }).click();
    await expect(page.getByTestId("studio-actions")).toHaveAttribute("data-state", "saved", { timeout: 15_000 });
    // nothing unsaved → Exit leaves at once
    await page.getByTestId("studio-exit").click();
    await expect(page).toHaveURL(/\/projects$/);
  });

  /** savedAt of the saved take of turn 1 of the demo project, straight from the mock database */
  const takeSavedAt = (page: Page) =>
    page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve) => { const r = indexedDB.open("dubbed-mock"); r.onsuccess = () => resolve(r.result); });
      const take = await new Promise<{ savedAt: number } | undefined>((resolve) => {
        const r = db.transaction("takes").objectStore("takes").get(["layout", 1]); r.onsuccess = () => resolve(r.result);
      });
      db.close();
      return take?.savedAt ?? 0;
    });

  test("Stop, then Leave without saving while it is saving keeps the earlier take", async ({ page }) => {
    await openStudio(page, 10000);
    await recordButton(page).click();
    await expect(page.getByTestId("studio-actions")).toHaveAttribute("data-state", "recording");
    await recordButton(page).click(); // Stop
    await expect(page.getByTestId("studio-actions")).toHaveAttribute("data-state", "saved", { timeout: 15_000 });
    const before = await takeSavedAt(page);
    expect(before).toBeGreaterThan(0);

    await recordButton(page).click();
    await expect(page.getByTestId("studio-actions")).toHaveAttribute("data-state", "recording");
    const release = await holdStore(page, "takes");
    try {
      await recordButton(page).click(); // Stop: the write waits on the held store
      await expect(page.getByTestId("studio-actions")).toHaveAttribute("data-state", "saving");
      await page.getByTestId("studio-exit").click();
      await page.getByTestId("leave-dialog").getByRole("button", { name: "Leave without saving" }).click();
      await expect(page).toHaveURL(/\/projects$/);
    } finally { await release(); }
    await page.waitForTimeout(750); // a late write would land right after the release
    expect(await takeSavedAt(page)).toBe(before);
  });

  test("Save and leave stays in the studio when the take cannot be saved; a later take does not navigate", async ({ page }) => {
    await page.addInitScript(() => {
      const put = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
        if (this.name === "takes" && (window as Window & { failTakes?: boolean }).failTakes) throw new DOMException("full", "QuotaExceededError");
        return put.call(this, value, key);
      };
    });
    await openStudio(page, 10000);
    const turnUrl = page.url();
    await recordButton(page).click();
    await expect(page.getByTestId("studio-actions")).toHaveAttribute("data-state", "recording");
    await page.getByTestId("studio-exit").click();
    await page.evaluate(() => { (window as Window & { failTakes?: boolean }).failTakes = true; });
    await page.getByTestId("leave-dialog").getByRole("button", { name: "Save and leave" }).click();
    await expect(page.getByText("The recording was interrupted and not kept.")).toBeVisible();
    await expect(page).toHaveURL(turnUrl);
    await expect(page.getByTestId("leave-dialog")).toBeHidden();
    await expect(page.getByTestId("studio-actions")).toHaveAttribute("data-state", "idle");

    await page.evaluate(() => { (window as Window & { failTakes?: boolean }).failTakes = false; });
    await recordButton(page).click();
    await expect(page.getByTestId("studio-actions")).toHaveAttribute("data-state", "recording");
    await recordButton(page).click(); // Stop
    await expect(page.getByTestId("studio-actions")).toHaveAttribute("data-state", "saved", { timeout: 15_000 });
    await expect(page).toHaveURL(turnUrl); // the old leave request is gone
  });

  test("Save and leave leaves at once when the take finished while the dialog was open", async ({ page }) => {
    await openStudio(page, 2500);
    await recordButton(page).click();
    await expect(page.getByTestId("studio-actions")).toHaveAttribute("data-state", "recording");
    await page.getByTestId("studio-exit").click();
    const dialog = page.getByTestId("leave-dialog");
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId("studio-actions")).toHaveAttribute("data-state", "saved", { timeout: 15_000 });
    await dialog.getByRole("button", { name: "Save and leave" }).click();
    await expect(page).toHaveURL(/\/projects$/);
  });
});
