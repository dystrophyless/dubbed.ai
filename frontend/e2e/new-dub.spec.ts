import { expect, test, type Locator, type Page } from "@playwright/test";
import { expectNoA11yViolations, trackConsoleErrors } from "./support/a11y";

/*
 * Phase 4 — New dub, high-fi (concept A "one card"): /prototypes/new-dub/page?state=…
 * Every state on desktop (1440 × 900) and phone (390 × 844): axe, no horizontal scroll, the key action in the viewport.
 * Flows: upload → checking → ready → Start; a wrong type is refused in the browser (never uploads); short → Buy credits;
 * cancel upload; Russian copy.
 */
const PAGE = "/prototypes/new-dub/page";
const START = /^Start dubbing · \d+ credits?$/;

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
  expect(box.y + box.height).toBeLessThanOrEqual(vp.height);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("dubbed.language")) localStorage.setItem("dubbed.language", "en");
  });
});

const STATES: { state: string; check: (page: Page) => Promise<void> }[] = [
  {
    state: "empty",
    check: async (page) => {
      await expectAboveFold(page, page.getByRole("button", { name: "Choose a video", exact: true }));
      await expect(page.getByText("MP4, MOV or WebM · up to 10 minutes and 250 MB")).toBeVisible();
      // drag and drop only where it exists: touch / narrow screens say "Choose a video to dub"
      const wide = page.viewportSize()!.width >= 1024;
      await expect(page.getByRole("heading", { name: wide ? "Drop a video here" : "Choose a video to dub" })).toBeVisible();
    },
  },
  {
    state: "no-slot",
    check: async (page) => {
      await expect(page.getByRole("heading", { name: "No free project slot" })).toBeVisible();
      await expectAboveFold(page, page.getByRole("button", { name: "Open My projects" }));
      await expect(page.getByTestId("upload-dropzone")).toHaveCount(0);
    },
  },
  {
    state: "uploading",
    check: async (page) => {
      await expect(page.getByRole("progressbar", { name: "Uploading" })).toBeVisible();
      await expectAboveFold(page, page.getByRole("button", { name: "Cancel upload" }));
      await expect(page.getByTestId("new-dub-stage")).toHaveCount(0); // preview only after the check
    },
  },
  {
    state: "checking",
    check: async (page) => {
      await expect(page.getByRole("progressbar", { name: "Checking the video" })).toBeVisible();
      await expectAboveFold(page, page.getByRole("button", { name: "Cancel upload" }));
      await expect(page.getByTestId("range-selector")).toHaveCount(0);
    },
  },
  {
    state: "ready",
    check: async (page) => {
      const start = page.getByRole("button", { name: START });
      await expectAboveFold(page, start);
      await expect(start).toHaveText("Start dubbing · 72 credits");
      await expect(start).toBeEnabled();
      await expectAboveFold(page, page.getByRole("button", { name: "Play section" }));
      await expect(page.getByTestId("range-value")).toHaveText("0:30 – 1:42 · 72 s"); // seconds, not credits
      await expect(page.getByRole("heading", { name: "Kitchen scene" })).toBeVisible(); // from the file name
      // the price appears exactly once, and the balance is not repeated
      await expect(page.getByText(/72 credits/)).toHaveCount(1);
      await expect(page.getByText(/You have/)).toHaveCount(0);
      // the stage spans the card's full width at 2.35:1
      const card = (await page.getByTestId("new-dub-card").boundingBox())!;
      const stage = (await page.getByTestId("new-dub-stage").locator("figure").boundingBox())!;
      expect(Math.abs(stage.width - card.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(stage.width / stage.height - 960 / 408)).toBeLessThan(0.02);
    },
  },
  {
    state: "limit",
    check: async (page) => {
      await expect(page.getByTestId("range-limit")).toHaveText("That's the limit — 120 s");
      await expect(page.getByRole("button", { name: START })).toHaveText("Start dubbing · 120 credits");
      await expectAboveFold(page, page.getByRole("button", { name: START }));
    },
  },
  {
    state: "error",
    check: async (page) => {
      await expect(page.getByRole("alert")).toHaveText("It's longer than 10 minutes. Choose a shorter video.");
      await expectAboveFold(page, page.getByRole("button", { name: "Choose another video" }));
    },
  },
  {
    state: "short",
    check: async (page) => {
      const start = page.getByRole("button", { name: START });
      await expect(start).toBeDisabled(); // patterns §7
      await expect(page.getByText("32 more credits needed")).toBeVisible();
      await expectAboveFold(page, page.getByRole("button", { name: "Buy credits" }));
      await expectAboveFold(page, start);
    },
  },
  {
    state: "starting",
    check: async (page) => {
      await expect(page.getByTestId("new-dub-card")).toHaveAttribute("aria-busy", "true");
      await expect(page.getByRole("button", { name: "Play section" })).toBeDisabled();
      await expect(page.getByRole("button", { name: "Replace video" })).toBeDisabled();
      await expectAboveFold(page, page.getByTestId("cost-button"));
    },
  },
];

for (const { state, check } of STATES) {
  test(`new dub · ${state}`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto(`${PAGE}?state=${state}`);
    await expect(page.getByRole("heading", { level: 1, name: "New dub" })).toBeVisible();
    await check(page);
    await expectNoHorizontalScroll(page);
    await expectNoA11yViolations(page);
    expect(errors).toEqual([]);
  });
}

for (const reason of ["type", "size", "no-audio", "broken"] as const) {
  test(`new dub · error ${reason}`, async ({ page }) => {
    await page.goto(`${PAGE}?state=error&reason=${reason}`);
    await expect(page.getByRole("alert")).toBeVisible();
    await expectAboveFold(page, page.getByRole("button", { name: "Choose another video" }));
    await expectNoA11yViolations(page);
  });
}

test("new dub · a narrower clip sits in the 2.35:1 stage with black bars", async ({ page }) => {
  await page.goto(`${PAGE}?state=ready&ratio=portrait`);
  const stage = (await page.getByTestId("new-dub-stage").locator("figure").boundingBox())!;
  const video = (await page.getByTestId("new-dub-stage").locator("video").boundingBox())!;
  expect(Math.abs(stage.width / stage.height - 960 / 408)).toBeLessThan(0.02);
  expect(video.width).toBeLessThan(stage.width / 2);
  await expectNoHorizontalScroll(page);
});

test("new dub · choose a file → uploading → checking → ready → Start → Processing", async ({ page }) => {
  test.setTimeout(45_000);
  const errors = trackConsoleErrors(page);
  await page.goto(PAGE);
  await page.getByTestId("upload-input").setInputFiles({ name: "beach-party.mp4", mimeType: "video/mp4", buffer: Buffer.from("demo") });
  await expect(page.getByRole("progressbar", { name: "Uploading" })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Checking the video" })).toBeVisible({ timeout: 10_000 });
  const start = page.getByRole("button", { name: START });
  await expect(start).toHaveText("Start dubbing · 120 credits", { timeout: 10_000 }); // default: the first 120 s
  await expect(page.getByRole("heading", { name: "Beach party" })).toBeVisible();
  // the section selector moves by keyboard and the price follows (1 credit per started second)
  await page.getByRole("slider", { name: "Section end" }).press("Shift+ArrowLeft");
  await expect(start).toHaveText("Start dubbing · 115 credits");
  await expect(page.getByTestId("range-limit")).toHaveText("up to 120 s");
  // Play section plays only the section; the playhead appears
  await page.getByRole("button", { name: "Play section" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await page.getByRole("button", { name: "Pause" }).click();
  await start.click();
  await expect(page).toHaveURL(/\/prototypes\/processing\/page\?name=Beach\+party&credits=115&from=0&to=115/, { timeout: 10_000 });
  // Processing picks up the project, the section and the reserve (the balance in the top bar is after the reserve)
  await expect(page.getByRole("heading", { level: 1, name: "Beach party" })).toBeVisible();
  await expect(page.getByText("Section 0:00 – 1:55 · 115 s")).toBeVisible();
  await expect(page.getByText("115 credits in reserve — charged when it’s ready")).toBeVisible();
  await expect(page.getByTestId("processing-progress").getByRole("status")).toHaveText("Waiting for our turn");
  expect(errors).toEqual([]);
});

test("new dub · a wrong file type is refused in the browser and never uploads", async ({ page }) => {
  await page.goto(PAGE);
  let uploads = 0;
  page.on("request", (r) => r.method() !== "GET" && uploads++);
  await page.getByTestId("upload-input").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("x") });
  await expect(page.getByRole("alert")).toHaveText("This file type isn't supported. Use MP4, MOV or WebM.");
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await expect(page.getByTestId("upload-dropzone")).toHaveAttribute("data-state", "error");
  expect(uploads).toBe(0);
  // choosing a good file from the error state starts over
  await page.getByTestId("upload-input").setInputFiles({ name: "scene.mov", mimeType: "video/quicktime", buffer: Buffer.from("x") });
  await expect(page.getByRole("progressbar", { name: "Uploading" })).toBeVisible();
});

test("new dub · the server check refuses a video without sound after the upload", async ({ page }) => {
  await page.goto(PAGE);
  await page.getByTestId("upload-input").setInputFiles({ name: "silent-film.mp4", mimeType: "video/mp4", buffer: Buffer.from("x") });
  await expect(page.getByRole("progressbar", { name: "Uploading" })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveText(/no sound/, { timeout: 10_000 });
});

test("new dub · cancel upload returns to the empty state", async ({ page }) => {
  await page.goto(`${PAGE}?state=uploading`);
  await page.getByRole("button", { name: "Cancel upload" }).click();
  await expect(page.getByRole("button", { name: "Choose a video", exact: true })).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveCount(0);
});

test("new dub · short of credits → Buy credits opens Credits", async ({ page }) => {
  await page.goto(`${PAGE}?state=short`);
  await page.getByRole("button", { name: "Buy credits" }).click();
  await expect(page).toHaveURL(/\/styleguide\/templates\/credits$/);
});

test("new dub · no free slot → My projects", async ({ page }) => {
  await page.goto(`${PAGE}?state=no-slot`);
  await page.getByRole("button", { name: "Open My projects" }).click();
  await expect(page).toHaveURL(/\/styleguide\/templates\/projects$/);
});

test("new dub · Russian", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("dubbed.language", "ru"));
  await page.goto(`${PAGE}?state=ready`);
  await expect(page.getByRole("heading", { level: 1, name: "Новая озвучка" })).toBeVisible();
  const start = page.getByRole("button", { name: /^Начать озвучку · / });
  await expect(start).toHaveText("Начать озвучку · 72 кредита");
  await expectAboveFold(page, start);
  await expect(page.getByTestId("range-value")).toHaveText("0:30 – 1:42 · 72 с");
  await expectNoHorizontalScroll(page);
  await expectNoA11yViolations(page);

  await page.goto(`${PAGE}?state=short`);
  await expect(page.getByText("Не хватает 32 кредитов")).toBeVisible();
  await expectAboveFold(page, page.getByRole("button", { name: "Купить кредиты" }));
  await expectNoHorizontalScroll(page);
  await expectNoA11yViolations(page);
});
