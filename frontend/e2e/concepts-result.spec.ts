import { expect, test, type Locator, type Page } from "@playwright/test";
import { expectNoA11yViolations, trackConsoleErrors } from "./support/a11y";

/*
 * Phase 4 — result concepts (low-fi): every concept × state, desktop and phone; the key action above the fold, axe,
 * no horizontal scroll. Live runs: assembling → ready; back from the studio, the new version never stops playback.
 */
const CONCEPTS = ["script", "strip", "chooser"] as const;
const STATES = [
  "assembling", "ready", "downloading", "failed", "new-version-assembling", "new-version-ready", "new-version-failed",
] as const;
const URL = (id: string, q = "") => `/prototypes/concepts/result/${id}${q}`;

async function expectNoHorizontalScroll(page: Page) {
  const viewport = page.viewportSize()!.width;
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(viewport);
}

/** Fully visible in the first screen (1440 × 900 / 390 × 844), without scrolling. */
async function expectAboveFold(page: Page, el: Locator) {
  await expect(el).toBeVisible();
  const box = (await el.boundingBox())!;
  const vp = page.viewportSize()!;
  expect(box.y + box.height).toBeLessThanOrEqual(vp.height);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
}

/** The way back to a turn, per concept — visible in the first screen whenever the result is ready. */
function fixAction(page: Page, id: (typeof CONCEPTS)[number]) {
  if (id === "script") return page.getByRole("button", { name: "Re-record turn 1" });
  if (id === "strip") return page.getByTestId("result-rerecord");
  return page.getByTestId("result-choose");
}

for (const id of CONCEPTS) {
  for (const state of STATES) {
    test(`result ${id} · ${state}`, async ({ page }) => {
      const errors = trackConsoleErrors(page);
      await page.goto(URL(id, `?state=${state}`));
      await expect(page.getByRole("heading", { level: 1, name: "Kitchen scene" })).toBeVisible();
      await expect(page.getByTestId("concept-note")).toBeVisible();
      const root = page.getByTestId("result");
      const download = page.getByTestId("result-download");
      const notice = page.getByTestId("result-new-version");

      if (state === "assembling") {
        await expect(root).toHaveAttribute("data-phase", "assembling");
        await expectAboveFold(page, page.getByTestId("result-assembling"));
        await expect(page.getByText("Putting your voice into the scene").filter({ visible: true }).first()).toBeVisible();
        await expect(download).toHaveCount(0);
        await page.waitForTimeout(1_500); // a frozen review state does not move on
        await expect(root).toHaveAttribute("data-phase", "assembling");
      } else if (state === "failed") {
        await expect(page.getByRole("heading", { name: "We couldn’t put your video together" })).toBeVisible();
        await expect(page.getByText("Your takes are safe — trying again is free.")).toBeVisible();
        await expectAboveFold(page, page.getByTestId("result-retry"));
        await expect(download).toHaveCount(0);
      } else {
        await expectAboveFold(page, download);
        if (id !== "script" || page.viewportSize()!.width >= 1024) await expectAboveFold(page, fixAction(page, id));
        if (state === "ready" || state === "downloading") await expect(notice).toHaveCount(0);
        if (state === "downloading") await expect(download).toHaveAttribute("aria-busy", "true");
        if (state === "new-version-assembling") {
          await expect(notice).toHaveAttribute("data-status", "assembling");
          await expect(notice).toContainText("Assembling version 2 with turn 3 re-recorded — keep watching this one.");
          await expect(root).toHaveAttribute("data-shown", "1");
        }
        if (state === "new-version-ready") {
          if (id === "strip") {
            const tab = page.getByRole("radio", { name: "Version 2 · new" });
            await expectAboveFold(page, tab);
            await tab.click();
          } else {
            await expectAboveFold(page, page.getByTestId("result-switch"));
            await page.getByTestId("result-switch").click();
          }
          await expect(root).toHaveAttribute("data-shown", "2");
          await expect(page.getByText(/Version 2 · 720p MP4/).filter({ visible: true }).first()).toBeVisible();
        }
        if (state === "new-version-failed") {
          await expect(notice).toHaveAttribute("data-status", "failed");
          await expect(notice).toContainText("Couldn’t assemble version 2. Version 1 stays as it is.");
          await page.getByTestId("result-retry-new").click();
          await expect(root).toHaveAttribute("data-newer", "assembling");
        }
      }

      await expectNoHorizontalScroll(page);
      await expectNoA11yViolations(page);
      expect(errors).toEqual([]);
    });
  }

  test(`result ${id}: a live run assembles, then the result is ready to watch and download`, async ({ page }) => {
    test.setTimeout(40_000);
    const errors = trackConsoleErrors(page);
    await page.goto(URL(id));
    const root = page.getByTestId("result");
    await expect(root).toHaveAttribute("data-phase", "assembling");
    await expect(root).toHaveAttribute("data-phase", "ready", { timeout: 15_000 });
    await expectAboveFold(page, page.getByTestId("result-download"));
    await expectNoHorizontalScroll(page);
    expect(errors).toEqual([]);
  });

  test(`result ${id}: back from the studio — the new version never stops the one playing`, async ({ page }) => {
    test.setTimeout(40_000);
    await page.goto(URL(id, "?state=live-new-version"));
    const root = page.getByTestId("result");
    await expect(root).toHaveAttribute("data-newer", "assembling");
    const video = page.locator("[data-testid=result-stage] video");
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused)).toBe(true);
    await expect(root).toHaveAttribute("data-newer", "ready", { timeout: 15_000 });
    // still the same version, still playing
    await expect(root).toHaveAttribute("data-shown", "1");
    expect(await video.evaluate((v: HTMLVideoElement) => !v.paused || v.ended)).toBe(true);
  });
}

test("result A: Re-record on a line opens the studio on exactly that turn", async ({ page }) => {
  await page.goto(URL("script", "?state=ready"));
  await page.getByRole("button", { name: "Re-record turn 3" }).click();
  await expect(page).toHaveURL(/\/prototypes\/studio\/turn\?turn=3&turns=6&state=saved$/);
});

test("result B: a block on the strip chooses its turn; Re-record follows it", async ({ page }) => {
  await page.goto(URL("strip", "?state=ready"));
  await page.locator("[data-testid=result-strip] [data-turn='4']").click();
  await expect(page.getByTestId("result-turn")).toContainText("Turn 4 of 6");
  await page.getByRole("slider", { name: "Turns in the scene" }).press("ArrowRight");
  await expect(page.getByTestId("result-turn")).toContainText("Turn 5 of 6");
  await page.getByRole("button", { name: "Previous turn" }).click();
  await page.getByTestId("result-rerecord").click();
  await expect(page).toHaveURL(/\/prototypes\/studio\/turn\?turn=4&turns=6&state=saved$/);
});

test("result C: the chooser preselects the turn and opens the studio on the one picked", async ({ page }) => {
  await page.goto(URL("chooser", "?state=ready"));
  await page.getByTestId("result-choose").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("radio").first()).toBeChecked();
  await dialog.getByRole("radio", { name: /^5\. Fine/ }).check();
  await dialog.getByRole("button", { name: "Re-record turn 5" }).click();
  await expect(page).toHaveURL(/\/prototypes\/studio\/turn\?turn=5&turns=6&state=saved$/);
});

test("result: Download saves the version on screen as an MP4", async ({ page }) => {
  await page.goto(URL("script", "?state=new-version-ready"));
  await page.getByTestId("result-switch").click();
  const [file] = await Promise.all([page.waitForEvent("download"), page.getByTestId("result-download").click()]);
  expect(file.suggestedFilename()).toBe("Kitchen scene · v2.mp4");
  await expect(page.getByText("Download started")).toBeVisible();
});

test("result: Try again after a failed assembly assembles again", async ({ page }) => {
  await page.goto(URL("chooser", "?state=failed"));
  await page.getByTestId("result-retry").click();
  await expect(page.getByTestId("result")).toHaveAttribute("data-phase", "assembling");
});

test("result (RU): every concept fits and names the version in Russian", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("dubbed.language", "ru"));
  for (const id of CONCEPTS) {
    await page.goto(URL(id, "?state=ready"));
    await expect(page.getByRole("heading", { level: 1, name: "Сцена на кухне" })).toBeVisible();
    await expectAboveFold(page, page.getByRole("button", { name: "Скачать MP4" }));
    await expectNoHorizontalScroll(page);
    await page.goto(URL(id, "?state=new-version-assembling"));
    await expect(page.getByTestId("result-new-version")).toContainText("Собираем версию 2 с перезаписанной репликой 3");
    await expectAboveFold(page, page.getByRole("button", { name: "Скачать MP4" }));
    await expectNoHorizontalScroll(page);
    await expectNoA11yViolations(page);
  }
});
