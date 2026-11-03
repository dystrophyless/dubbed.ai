import { expect, test, type Locator, type Page } from "@playwright/test";
import { expectNoA11yViolations, trackConsoleErrors } from "./support/a11y";

/*
 * Phase 4 — processing concepts (low-fi): every concept × state, desktop and phone; the key action above the fold, axe,
 * no horizontal scroll; one live run per concept that reaches the studio on turn 1.
 */
const CONCEPTS = ["checklist", "stage", "tips"] as const;
const STATES = ["queued", "running", "cancel-confirm", "cancel-queued", "no-dialogue", "failed", "ready"] as const;

async function expectNoHorizontalScroll(page: Page) {
  const viewport = page.viewportSize()!.width;
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(viewport);
}

/** The key action is fully visible in the first screen (1440 × 900 / 390 × 844), without scrolling. */
async function expectAboveFold(page: Page, el: Locator) {
  await expect(el).toBeVisible();
  const box = (await el.boundingBox())!;
  const vp = page.viewportSize()!;
  expect(box.y + box.height).toBeLessThanOrEqual(vp.height);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
}

for (const id of CONCEPTS) {
  for (const state of STATES) {
    test(`processing ${id} · ${state}`, async ({ page }) => {
      const errors = trackConsoleErrors(page);
      await page.goto(`/prototypes/concepts/processing/${id}?state=${state}`);
      await expect(page.getByRole("heading", { level: 1, name: "Kitchen scene" })).toBeVisible();
      await expect(page.getByTestId("concept-note")).toBeVisible();
      const cancel = page.getByTestId("processing-cancel");
      const dialog = page.getByRole("alertdialog");

      if (state === "queued") {
        await expect(page.getByText("Waiting to start").filter({ visible: true }).first()).toBeVisible();
        await expectAboveFold(page, cancel);
      } else if (state === "running") {
        await expect(page.getByText("Finding the lines").filter({ visible: true }).first()).toBeVisible();
        await expectAboveFold(page, cancel);
      } else if (state === "cancel-confirm") {
        await expect(dialog).toContainText("1 of 3 steps is done — 24 credits will be charged.");
        await expect(dialog).toContainText("The other 48 credits go back to your balance.");
        await expectAboveFold(page, dialog.getByRole("button", { name: "Cancel preparing" }));
        await expectAboveFold(page, dialog.getByRole("button", { name: "Keep preparing" }));
      } else if (state === "cancel-queued") {
        await expect(dialog).toContainText("Preparing hasn’t started yet, so nothing is charged.");
        await expect(dialog).toContainText("All 72 credits go back to your balance.");
        await expectAboveFold(page, dialog.getByRole("button", { name: "Cancel preparing" }));
      } else if (state === "no-dialogue") {
        await expect(page.getByRole("heading", { name: "No dialogue found" })).toBeVisible();
        await expect(page.getByText(/72 credits are charged/)).toBeVisible();
        await expectAboveFold(page, page.getByRole("button", { name: "Try another video" }));
        await expect(cancel).toHaveCount(0);
      } else if (state === "failed") {
        await expect(page.getByRole("heading", { name: "Something went wrong" })).toBeVisible();
        await expectAboveFold(page, page.getByRole("button", { name: "Try again" }));
        await expect(cancel).toHaveCount(0);
      } else {
        await expectAboveFold(page, page.getByRole("button", { name: "Open the studio" }));
        await expect(cancel).toHaveCount(0);
        await page.waitForTimeout(2_000); // a frozen review state never navigates by itself
        await expect(page).toHaveURL(/\/prototypes\/concepts\/processing\//);
      }

      await expectNoHorizontalScroll(page);
      await expectNoA11yViolations(page);
      expect(errors).toEqual([]);
    });
  }

  test(`processing ${id}: a live run goes queued → steps → ready and opens the studio on turn 1`, async ({ page }) => {
    test.setTimeout(60_000);
    const errors = trackConsoleErrors(page);
    await page.goto(`/prototypes/concepts/processing/${id}`);
    await expect(page.getByText("Waiting to start").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("Getting the turns ready").filter({ visible: true }).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Ready — opening the studio").filter({ visible: true }).first()).toBeVisible({ timeout: 20_000 });
    await expect(page).toHaveURL(/\/prototypes\/studio\/turn\?turn=1$/, { timeout: 10_000 });
    expect(errors).toEqual([]);
  });
}

test("processing: cancelling while preparing charges the finished step and returns to My projects", async ({ page }) => {
  await page.goto("/prototypes/concepts/processing/checklist?state=running");
  await expect(page.getByText("Cancel now and 24 credits are charged for the finished steps.")).toBeVisible();
  await page.getByTestId("processing-cancel").click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("24 credits will be charged.");
  await dialog.getByRole("button", { name: "Keep preparing" }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByTestId("processing-cancel").click();
  await dialog.getByRole("button", { name: "Cancel preparing" }).click();
  await expect(page).toHaveURL(/\/styleguide\/templates\/projects$/);
  await expect(page.getByText("Preparing cancelled")).toBeVisible();
});

test("processing: a live run can end in “No dialogue found” and offers another video", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/prototypes/concepts/processing/stage?end=no-dialogue");
  await expect(page.getByRole("heading", { name: "No dialogue found" })).toBeVisible({ timeout: 25_000 });
  await page.getByRole("button", { name: "Try another video" }).click();
  await expect(page).toHaveURL(/\/prototypes\/new-dub\/page$/);
});

test("processing: Try again after a failure resumes preparing", async ({ page }) => {
  await page.goto("/prototypes/concepts/processing/tips?state=failed");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByTestId("processing-cancel")).toBeVisible();
  await expect(page.getByTestId("processing")).toHaveAttribute("data-phase", "running");
});

test("processing (RU): every concept fits and names the charge in Russian", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("dubbed.language", "ru"));
  for (const id of CONCEPTS) {
    await page.goto(`/prototypes/concepts/processing/${id}?state=running`);
    await expect(page.getByText("Находим реплики").filter({ visible: true }).first()).toBeVisible();
    await expectAboveFold(page, page.getByRole("button", { name: "Отменить подготовку" }));
    await expectNoHorizontalScroll(page);
    await page.goto(`/prototypes/concepts/processing/${id}?state=cancel-confirm`);
    await expect(page.getByRole("alertdialog")).toContainText("Готов 1 шаг из 3 — спишутся 24 кредита.");
    await expectNoHorizontalScroll(page);
  }
});
