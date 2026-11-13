import { expect, test, type Page } from "@playwright/test";
import { statSync } from "node:fs";
import { expectNoA11yViolations, trackConsoleErrors } from "./support/a11y";
import { noHorizontalScroll, recordCurrentTurn } from "./support/flow";
import { openScreen } from "./support/screens";

/*
 * Feature 001, US3 — re-record a turn and build a new version, on mock services. A finished project with 6 turns is
 * seeded with playable cached media and valid PCM takes, then: Result → "Re-record a turn" → studio ?mode=rerecord on turn 3 → new take →
 * "Build the new version" → version 1 keeps playing, Re-record disabled with its reason → "Watch version 2" → download.
 * Leaving without building keeps the takes and the result. Desktop 1440 × 900 and phone 390 × 844 (English).
 */
test.describe.configure({ timeout: 240_000 });

const result = (page: Page) => page.getByTestId("result");
const status = (page: Page) => page.getByTestId("result-status");
const build = (page: Page) => page.getByTestId("studio-build");
const actions = (page: Page) => page.getByTestId("studio-actions");

/** "Re-record a turn" → pick `turn` in the chooser → the studio opens in re-record mode on it. */
async function openRerecord(page: Page, turn: number) {
  await page.getByTestId("result-choose").click();
  await expect(page.getByTestId("result-chooser")).toBeVisible();
  await page.getByRole("radio", { name: new RegExp(`^${turn}\\.`) }).check({ force: true });
  await page.getByTestId("result-chooser-go").click();
  await expect(page).toHaveURL(new RegExp(`/turns/${turn}\\?mode=rerecord$`));
  await expect(page.getByTestId("studio")).toBeVisible();
}

test.describe("US3 — re-record a turn", () => {
  test("re-record turn 3, build version 2, keep watching version 1, switch and download", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await openScreen(page, "result", "en", { turns: 6, windowMs: 700, name: "Scene" });

    /* ---- the chooser: the turn under the playhead (the first one at 0:00) is preselected ---- */
    await expect(result(page)).toHaveAttribute("data-shown", "1");
    await expect(result(page)).toHaveAttribute("data-newer", "none");
    const initialVideo = page.locator("video").first();
    await initialVideo.evaluate((v: HTMLVideoElement) => { v.pause(); v.currentTime = 5; });
    await expect.poll(() => initialVideo.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(4.9);
    await page.getByTestId("result-choose").click();
    await expect(page.getByTestId("result-chooser")).toBeVisible();
    await expect(page.getByTestId("result-chooser")).toContainText("Re-recording and the new version are free.");
    await expect(page.getByRole("radio", { name: /^3\./ })).toBeChecked();
    await expectNoA11yViolations(page);
    await page.getByRole("radio", { name: /^3\./ }).check({ force: true });
    await page.getByTestId("result-chooser-go").click();
    await expect(page).toHaveURL(/\/turns\/3\?mode=rerecord$/);

    /* ---- the studio in re-record mode: every turn has a take, no Build until a new take ---- */
    await expect(page.getByTestId("studio")).toBeVisible();
    await expect(actions(page)).toHaveAttribute("data-state", "saved");
    await expect(page.getByTestId("studio-next")).toHaveCount(0); // › replaces Next
    await expect(page.getByTestId("studio-forward")).toBeVisible();
    await expect(page.getByTestId("studio-prev")).toBeVisible();
    await expect(build(page)).toHaveCount(0);
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);

    await recordCurrentTurn(page);
    await expect(build(page)).toBeVisible();
    await expect(build(page)).toHaveText("Build the new version");
    await expectNoA11yViolations(page);

    // ‹ › move freely and keep the mode; Build stays on every turn from now on
    // the header's turn dots are the same element across turns, so their slide animation can play
    await page.getByTestId("turn-dots").evaluate((el) => ((el as HTMLElement & { __kept?: boolean }).__kept = true));
    await page.getByTestId("studio-forward").click();
    await expect(page).toHaveURL(/\/turns\/4\?mode=rerecord$/);
    expect(await page.getByTestId("turn-dots").evaluate((el) => (el as HTMLElement & { __kept?: boolean }).__kept === true)).toBe(true);
    await expect(actions(page)).toHaveAttribute("data-state", "saved");
    await expect(build(page)).toBeVisible();
    await page.getByTestId("studio-prev").click();
    await expect(page).toHaveURL(/\/turns\/3\?mode=rerecord$/);
    await expect(build(page)).toBeVisible();

    /* ---- Build → Result: version 1 keeps playing while version 2 assembles ---- */
    await build(page).click();
    await expect(page).toHaveURL(/\/result$/);
    await expect(result(page)).toHaveAttribute("data-phase", "ready");
    await expect(result(page)).toHaveAttribute("data-shown", "1");
    await expect(result(page)).toHaveAttribute("data-newer", "assembling");
    await expect(status(page)).toContainText("Assembling version 2 with turn 3 re-recorded");
    await expect(page.getByTestId("result-choose")).toBeDisabled();
    await expect(page.getByTestId("result-rerecord-reason")).toHaveText("You can re-record once version 2 is ready");
    await expect(page.getByTestId("result-choose")).toHaveAccessibleDescription("You can re-record once version 2 is ready");
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);

    const video = page.locator("video").first();
    await video.evaluate(async (v: HTMLVideoElement) => {
      v.muted = true;
      v.playbackRate = 0.5; // keep this short clip from naturally ending before the real-time render finishes
      await v.play();
    });
    const source = await video.getAttribute("src");
    const before = await video.evaluate((v: HTMLVideoElement) => v.currentTime);
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(before + 0.1);

    /* ---- version 2 ready, not switched to: Download still names version 1 ---- */
    await expect(result(page)).toHaveAttribute("data-newer", "ready", { timeout: 60_000 });
    await expect(video).toHaveAttribute("src", source!);
    expect(await video.evaluate((v: HTMLVideoElement) => !v.paused && v.currentTime > 1)).toBe(true);
    await expect(result(page)).toHaveAttribute("data-shown", "1");
    await expect(status(page)).toContainText("Version 2 is ready — turn 3 re-recorded.");
    await expect(page.getByTestId("result-download")).toHaveText("Download version 1");
    await expect(page.getByTestId("result-choose")).toBeEnabled();
    // the player keeps a real length (never 0:00 / 0:00) and a usable scrubber while version 2 is ready
    await expect(page.getByTestId("player-controls")).not.toContainText("0:00 / 0:00");
    await expect(page.getByTestId("player-controls")).toContainText(/\/ 0:(0[1-9]|[1-5]\d)/);
    await expect(page.getByTestId("player-controls").getByRole("slider")).toBeEnabled();
    await expectNoA11yViolations(page);

    /* ---- Watch version 2: plays from 0:00, version 1 is gone ---- */
    await video.evaluate((v: HTMLVideoElement) => { v.pause(); v.currentTime = 8; v.playbackRate = 1; });
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(7.9);
    await page.getByTestId("result-switch").click();
    await expect(page.getByTestId("player-controls").getByRole("button").first()).toBeFocused();
    await expect(result(page)).toHaveAttribute("data-shown", "2");
    await expect(result(page)).toHaveAttribute("data-newer", "none");
    await expect(page.getByTestId("result-switch")).toHaveCount(0);
    await expect(page.getByTestId("result-download")).toHaveText(/^Download/);
    await expect(page.getByTestId("result-download")).not.toHaveText("Download version 1");
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => Number.isFinite(v.duration) && v.currentTime < 2), { timeout: 15_000 }).toBe(true);
    await expect(status(page)).toContainText("Version 2");
    await expect(page.getByTestId("player-controls")).not.toContainText("0:00 / 0:00");
    await expect(page.getByTestId("player-controls")).toContainText(/\/ 0:(0[1-9]|[1-5]\d)/);
    await expect(page.getByTestId("player-controls").getByRole("slider")).toBeEnabled();
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);

    const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("result-download").click()]);
    expect(download.suggestedFilename()).toBe("Scene.webm");
    expect(statSync((await download.path())!).size).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });

  test("leaving without building keeps the new take and the result unchanged", async ({ page }) => {
    await openScreen(page, "result", "en", { turns: 6, windowMs: 700, name: "Scene" });
    await openRerecord(page, 2);
    await expect(build(page)).toHaveCount(0);

    // nothing new yet: Exit goes straight back to the Result
    await page.getByTestId("studio-exit").click();
    await expect(page).toHaveURL(/\/result$/);
    await expect(result(page)).toHaveAttribute("data-newer", "none");

    await openRerecord(page, 2);
    await recordCurrentTurn(page);
    await page.getByTestId("studio-exit").click();
    const dialog = page.getByTestId("leave-build-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Build a new version before you leave?");
    await expect(dialog).toContainText("You re-recorded 1 turn.");
    await expectNoA11yViolations(page);

    await dialog.getByRole("button", { name: "Stay" }).click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/turns\/2\?mode=rerecord$/);

    await page.getByTestId("studio-exit").click();
    await dialog.getByRole("button", { name: "Leave without building" }).click();
    await expect(page).toHaveURL(/\/result$/);
    await expect(result(page)).toHaveAttribute("data-phase", "ready");
    await expect(result(page)).toHaveAttribute("data-shown", "1");
    await expect(result(page)).toHaveAttribute("data-newer", "none"); // the result is unchanged
    await noHorizontalScroll(page);

    // the take was kept: re-record mode offers Build at once
    await openRerecord(page, 6);
    await expect(page.getByTestId("studio-forward")).toHaveCount(0);
    await expect(build(page)).toBeVisible();
    await page.getByTestId("studio-exit").click();
    await page.getByTestId("leave-build-dialog").getByRole("button", { name: "Build the new version" }).click();
    await expect(page).toHaveURL(/\/result$/);
    await expect(result(page)).toHaveAttribute("data-newer", /assembling|ready/);
    await expect(status(page)).toContainText("version 2");
    await expect(result(page)).toHaveAttribute("data-newer", "ready", { timeout: 60_000 });
  });

  test("a failed new version keeps version 1 playable/downloadable through free retry", async ({ page }) => {
    await openScreen(page, "result");
    await openRerecord(page, 3);
    await page.goto(`${page.url()}&demo=assembly-failed,speed:4`);
    await recordCurrentTurn(page);
    await build(page).click();
    await expect(result(page)).toHaveAttribute("data-newer", "failed", { timeout: 20_000 });
    await expect(result(page)).toHaveAttribute("data-shown", "1");
    await expect(page.getByTestId("result-download")).toHaveText("Download");
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("result-download").click()]);
    expect(statSync((await download.path())!).size).toBeGreaterThan(0);
    const video = page.locator("video").first();
    await video.evaluate(async (v: HTMLVideoElement) => { v.muted = true; v.playbackRate = 0.25; await v.play(); });
    const source = await video.getAttribute("src");
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(result(page)).toHaveAttribute("data-newer", "assembling");
    await expect(result(page)).toHaveAttribute("data-newer", "ready", { timeout: 60_000 });
    await expect(result(page)).toHaveAttribute("data-shown", "1");
    await expect(video).toHaveAttribute("src", source!);
    expect(await video.evaluate((v: HTMLVideoElement) => !v.paused && v.currentTime > 0)).toBe(true);
    await expect(page.getByTestId("result-switch")).toBeEnabled();
  });

  test("re-record mode is closed while a version assembles", async ({ page }) => {
    await openScreen(page, "result", "en", { turns: 6, windowMs: 700, name: "Scene" });
    await openRerecord(page, 3);
    await recordCurrentTurn(page);
    await build(page).click();
    await expect(page).toHaveURL(/\/result$/);
    await expect(result(page)).toHaveAttribute("data-newer", "assembling");
    // the studio URL sends the user back to the Result, which says why
    await page.goBack();
    await expect(page).toHaveURL(/\/result$/);
    await expect(page.getByTestId("result-choose")).toBeDisabled();
  });
});
