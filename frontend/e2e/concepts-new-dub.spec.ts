import { expect, test, type Locator, type Page } from "@playwright/test";
import { expectNoA11yViolations, trackConsoleErrors } from "./support/a11y";

/* Phase 4 — new-dub concepts (low-fi): every concept × state, desktop and phone; key action above the fold, axe, no h-scroll. */
const CONCEPTS = ["one-card", "receipt", "two-steps", "price-on-selection"] as const;
const STATES = ["empty", "uploading", "ready", "limit", "error", "short"] as const;
const START = /^Start dubbing · \d+ credits$/;

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
    test(`new dub ${id} · ${state}`, async ({ page }) => {
      const errors = trackConsoleErrors(page);
      await page.goto(`/prototypes/concepts/new-dub/${id}?state=${state}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByTestId("concept-note")).toBeVisible();
      const start = page.getByRole("button", { name: START });

      if (state === "empty") {
        await expectAboveFold(page, page.getByRole("button", { name: "Choose a video", exact: true }));
        await expect(start).toHaveCount(0);
      } else if (state === "uploading") {
        await expectAboveFold(page, page.getByRole("progressbar", { name: "Uploading" }));
        await expect(start).toHaveCount(0);
      } else if (state === "error") {
        await expect(page.getByText("It's longer than 10 minutes. Choose a shorter video.")).toBeVisible();
        await expectAboveFold(page, page.getByRole("button", { name: "Choose another video" }));
        await expect(start).toHaveCount(0);
      } else if (state === "short") {
        await expect(page.getByText("32 more credits needed").filter({ visible: true })).toBeVisible();
        await expectAboveFold(page, page.getByRole("button", { name: "Buy credits" }));
        if (id === "one-card" || id === "two-steps") await expect(start).toBeDisabled(); // patterns §7
        else await expect(start).toHaveCount(0); // Buy credits replaces Start
      } else {
        await expectAboveFold(page, start);
        await expect(start).toBeEnabled();
        if (state === "ready") await expect(start).toHaveText("Start dubbing · 72 credits");
        if (state === "limit") {
          if (id === "two-steps") await expect(page.getByText("A section can be up to 2:00 — end it by 3:10.")).toBeVisible();
          else await expect(page.getByText("That's the longest section — 2 minutes.")).toBeVisible();
          await expect(start).toHaveText("Start dubbing · 120 credits");
        }
      }

      await expectNoHorizontalScroll(page);
      await expectNoA11yViolations(page);
      expect(errors).toEqual([]);
    });
  }
}

test("new dub A: choose a file → uploading → ready → Start reserves the credits", async ({ page }) => {
  await page.goto("/prototypes/concepts/new-dub/one-card");
  await page.getByTestId("new-dub-file").setInputFiles({ name: "beach.mp4", mimeType: "video/mp4", buffer: Buffer.from("demo") });
  await expect(page.getByRole("progressbar", { name: "Uploading" })).toBeVisible();
  const start = page.getByRole("button", { name: START });
  await expect(start).toHaveText("Start dubbing · 120 credits", { timeout: 5_000 }); // default: the first 120 s
  await expect(page.getByRole("heading", { name: "beach.mp4" })).toBeVisible();
  await start.click();
  await expect(page.getByText("Credits reserved — Processing would open now.")).toBeVisible({ timeout: 5_000 });
});

test("new dub A: a file of the wrong type is refused with the reason", async ({ page }) => {
  await page.goto("/prototypes/concepts/new-dub/one-card");
  await page.getByTestId("new-dub-file").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("x") });
  await expect(page.getByText("This file type isn't supported. Use MP4, MOV or WebM.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Choose another video" })).toBeVisible();
});

test("new dub C: typed times — too long is explained, a valid end moves the section and the price", async ({ page }) => {
  await page.goto("/prototypes/concepts/new-dub/two-steps?state=ready");
  const end = page.getByRole("textbox", { name: "End" });
  await end.fill("3:40");
  await end.press("Enter");
  await expect(page.getByText("A section can be up to 2:00 — end it by 2:30.")).toBeVisible();
  await end.fill("1:00");
  await end.press("Enter");
  await expect(page.getByRole("button", { name: START })).toHaveText("Start dubbing · 30 credits");
  await expect(page.getByRole("slider", { name: "Section end" })).toHaveAttribute("aria-valuenow", "60");
});

test("new dub D: Shorten fits the section to the balance and brings Start back", async ({ page }) => {
  await page.goto("/prototypes/concepts/new-dub/price-on-selection?state=short");
  await page.getByRole("button", { name: "Shorten to 40 s" }).click();
  await expect(page.getByRole("button", { name: START })).toHaveText("Start dubbing · 40 credits");
  await expect(page.getByTestId("new-dub-price")).toHaveText("40 credits");
});

test("new dub B: Buy credits opens Credits", async ({ page }) => {
  await page.goto("/prototypes/concepts/new-dub/receipt?state=short");
  await page.getByRole("button", { name: "Buy credits" }).click();
  await expect(page).toHaveURL(/\/styleguide\/templates\/credits$/);
});

test("new dub (RU): the phone layout fits and names the cost in Russian", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("dubbed.language", "ru"));
  for (const id of CONCEPTS) {
    await page.goto(`/prototypes/concepts/new-dub/${id}?state=ready`);
    await expect(page.getByRole("button", { name: "Начать озвучку · 72 кредита" })).toBeVisible();
    await expectNoHorizontalScroll(page);
  }
});
