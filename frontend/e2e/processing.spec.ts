import { expect, test, type Locator, type Page } from "@playwright/test";
import { expectNoA11yViolations, trackConsoleErrors } from "./support/a11y";

/*
 * Phase 4 — Processing, high-fi: /prototypes/processing/page?state=…
 * Every frozen state on desktop (1440 × 900) and phone (390 × 844): axe, no horizontal scroll, the key action in the
 * viewport. Flows: a live run reaches the studio on turn 1; a background tab waits instead; cancel (with the amount
 * updating live); no dialogue → New dub; failed → Try again resumes and reaches the studio; notify opt-in; ready while
 * elsewhere → toast; Russian. The slow live flows run on desktop only.
 */
const PAGE = "/prototypes/processing/page";
const STUDIO = /\/prototypes\/studio\/turn\?turn=1$/;

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

const pill = (page: Page) => page.getByTestId("processing-progress").getByRole("status");
const cancelButton = (page: Page) => page.getByTestId("processing-cancel");

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("dubbed.language")) localStorage.setItem("dubbed.language", "en");
  });
});

const STATES: { state: string; check: (page: Page) => Promise<void> }[] = [
  {
    state: "queued",
    check: async (page) => {
      await expect(pill(page)).toHaveText("Waiting for our turn");
      await expect(page.getByText(/left|Almost done/)).toHaveCount(0); // no time while waiting in the queue
      await expect(page.getByRole("progressbar", { name: "Preparing" })).toHaveAttribute("aria-valuenow", "0");
      await expectAboveFold(page, cancelButton(page));
      await expect(page.getByText("72 credits in reserve — charged when it’s ready")).toBeVisible();
    },
  },
  {
    state: "running",
    check: async (page) => {
      await expect(pill(page)).toHaveText("Finding the lines");
      await expect(page.getByText("Step 2 of 3 · About a minute left")).toBeVisible();
      await expect(page.getByTestId("processing-found")).toHaveText("5 turns found so far");
      await expect(page.getByRole("progressbar", { name: "Preparing" })).toHaveAttribute("aria-valuetext", "Step 2 of 3: Finding the lines");
      await expectAboveFold(page, cancelButton(page));
      await expect(page.getByText(/72 credits/)).toHaveCount(1); // the reserve is stated once
      // the stage spans the card's full width at 2.35:1
      const card = (await page.getByTestId("processing-card").boundingBox())!;
      const stage = (await page.getByTestId("processing-stage").locator("figure").boundingBox())!;
      expect(Math.abs(stage.width - card.width)).toBeLessThanOrEqual(2);
      expect(Math.abs(stage.width / stage.height - 960 / 408)).toBeLessThan(0.02);
    },
  },
  {
    state: "cancel-confirm",
    check: async (page) => {
      const dialog = page.getByTestId("processing-cancel-dialog");
      await expect(dialog).toContainText("1 of 3 steps is done — 18 credits will be charged.");
      await expect(dialog).toContainText("The other 54 credits go back to your balance.");
      await expectAboveFold(page, dialog.getByRole("button", { name: "Keep preparing" }));
      await expectAboveFold(page, dialog.getByRole("button", { name: "Cancel preparing" }));
    },
  },
  {
    state: "cancel-queued",
    check: async (page) => {
      const dialog = page.getByTestId("processing-cancel-dialog");
      await expect(dialog).toContainText("Preparing hasn’t started yet, so nothing is charged.");
      await expect(dialog).toContainText("All 72 credits go back to your balance.");
      await expectAboveFold(page, dialog.getByRole("button", { name: "Cancel preparing" }));
    },
  },
  {
    state: "no-dialogue",
    check: async (page) => {
      await expect(page.getByRole("heading", { name: "No dialogue found" })).toBeVisible();
      await expect(page.getByTestId("processing-no-dialogue")).toContainText("72 credits are charged");
      await expectAboveFold(page, page.getByRole("button", { name: "Try another video" }));
      await expect(page.getByTestId("processing-progress")).toHaveCount(0);
    },
  },
  {
    state: "failed",
    check: async (page) => {
      await expect(page.getByRole("heading", { name: "Something went wrong" })).toBeVisible();
      await expect(page.getByTestId("processing-failed")).toContainText("72 credits are back on your balance");
      await expectAboveFold(page, page.getByRole("button", { name: "Try again", exact: true }));
      await expect(page.getByTestId("processing-leave")).toBeEmpty();
    },
  },
  {
    state: "ready",
    check: async (page) => {
      await expect(pill(page)).toHaveText("Your scene is ready");
      await expect(page.getByTestId("processing-found")).toHaveText("12 turns ready to record");
      await expect(page.getByText("72 credits charged")).toBeVisible();
      await expectAboveFold(page, page.getByRole("button", { name: "Open the studio" }));
      await expect(cancelButton(page)).toHaveCount(0);
    },
  },
];

for (const { state, check } of STATES) {
  test(`processing · ${state}`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto(`${PAGE}?state=${state}`);
    await expect(page.getByRole("heading", { level: 1, name: "Kitchen scene" })).toBeVisible();
    await expect(page.getByText("Section 0:30 – 1:42 · 72 s")).toBeVisible();
    await check(page);
    await expectNoHorizontalScroll(page);
    await expectNoA11yViolations(page);
    expect(errors).toEqual([]);
  });
}

test("processing · a frozen ready (= the tab was in the background) waits for Open the studio", async ({ page }) => {
  await page.goto(`${PAGE}?state=ready`);
  await page.waitForTimeout(2500);
  await expect(page).toHaveURL(/state=ready/);
  await page.getByRole("button", { name: "Open the studio" }).click();
  await expect(page).toHaveURL(STUDIO);
});

test("processing · a narrower clip sits in the 2.35:1 stage with black bars", async ({ page }) => {
  await page.goto(`${PAGE}?state=running&ratio=portrait`);
  const stage = (await page.getByTestId("processing-stage").locator("figure").boundingBox())!;
  const video = (await page.getByTestId("processing-stage").locator("video").boundingBox())!;
  expect(Math.abs(stage.width / stage.height - 960 / 408)).toBeLessThan(0.02);
  expect(video.width).toBeLessThan(stage.width / 2);
  await expectNoHorizontalScroll(page);
});

test("processing · live run: waiting → steps → ready → opens the studio on turn 1", async ({ page }) => {
  test.setTimeout(60_000);
  const errors = trackConsoleErrors(page);
  await page.goto(PAGE);
  await expect(pill(page)).toHaveText("Waiting for our turn");
  await expect(pill(page)).toHaveText("Separating the voices", { timeout: 10_000 });
  await expect(page.getByText(/^Step 1 of 3 · /)).toBeVisible();
  await expect(pill(page)).toHaveText("Finding the lines", { timeout: 10_000 });
  await expect(page.getByTestId("processing-found")).toHaveText(/turns? found so far/, { timeout: 5_000 });
  await expect(pill(page)).toHaveText("Getting the turns ready", { timeout: 10_000 });
  await expect(pill(page)).toHaveText("Ready — opening the studio", { timeout: 10_000 });
  await expect(page).toHaveURL(STUDIO, { timeout: 5_000 });
  expect(errors).toEqual([]);
});

test.describe("slow live flows", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1024, "desktop only — the same logic as on the phone");
  test.describe.configure({ timeout: 60_000 });

  test("processing · a background tab does not open the studio by itself", async ({ page }) => {
    await page.goto(`${PAGE}?tab=background`);
    await expect(pill(page)).toHaveText("Your scene is ready", { timeout: 25_000 });
    await page.waitForTimeout(2500);
    await expect(page).toHaveURL(/tab=background/);
    await expectAboveFold(page, page.getByRole("button", { name: "Open the studio" }));
  });

  test("processing · cancel: the amount updates live, then My projects + toast", async ({ page }) => {
    await page.goto(PAGE);
    await cancelButton(page).click();
    const dialog = page.getByTestId("processing-cancel-dialog");
    await expect(dialog).toContainText("Preparing hasn’t started yet, so nothing is charged.");
    // the job keeps running behind the dialog; the amount follows it
    await expect(dialog).toContainText("No step is finished yet, so nothing is charged.", { timeout: 10_000 });
    await expect(dialog).toContainText("18 credits will be charged.", { timeout: 10_000 });
    await dialog.getByRole("button", { name: "Cancel preparing" }).click();
    await expect(page).toHaveURL(/\/styleguide\/templates\/projects$/);
    await expect(page.getByTestId("toaster")).toContainText("Preparing cancelled");
    await expect(page.getByTestId("toaster")).toContainText("18 credits charged, the rest is back.");
  });

  test("processing · failed → Try again resumes from the failed step and reaches the studio", async ({ page }) => {
    await page.goto(`${PAGE}?end=failed`);
    await expect(page.getByRole("heading", { name: "Something went wrong" })).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(pill(page)).toHaveText("Finding the lines"); // step 1 stays done
    await expect(page).toHaveURL(STUDIO, { timeout: 20_000 }); // the demo failure does not repeat
  });

  test("processing · leaving during a live run → a ready toast elsewhere opens the studio", async ({ page }) => {
    await page.goto(PAGE);
    await page.getByTestId("processing-leave").getByRole("link", { name: "My projects" }).click();
    await expect(page).toHaveURL(/\/styleguide\/templates\/projects$/);
    const toaster = page.getByTestId("toaster");
    await expect(toaster).toContainText("“Kitchen scene” is ready", { timeout: 25_000 });
    await toaster.getByRole("button", { name: "Open the studio" }).click();
    await expect(page).toHaveURL(STUDIO);
  });
});

test("processing · cancel from the frozen running state → My projects + toast", async ({ page }) => {
  await page.goto(`${PAGE}?state=running`);
  await cancelButton(page).click();
  const dialog = page.getByTestId("processing-cancel-dialog");
  await expect(dialog).toContainText("18 credits will be charged.");
  await dialog.getByRole("button", { name: "Keep preparing" }).click();
  await expect(dialog).toHaveCount(0);
  await cancelButton(page).click();
  await page.getByTestId("processing-cancel-dialog").getByRole("button", { name: "Cancel preparing" }).click();
  await expect(page).toHaveURL(/\/styleguide\/templates\/projects$/);
  await expect(page.getByTestId("toaster")).toContainText("Preparing cancelled");
});

test("processing · no dialogue → Try another video opens New dub", async ({ page }) => {
  await page.goto(`${PAGE}?state=no-dialogue`);
  await page.getByRole("button", { name: "Try another video" }).click();
  await expect(page).toHaveURL(/\/prototypes\/new-dub\/page$/);
});

test("processing · no dialogue → Delete project asks first", async ({ page }) => {
  await page.goto(`${PAGE}?state=no-dialogue`);
  await page.getByRole("button", { name: "Delete project" }).click();
  const dialog = page.getByTestId("processing-delete-dialog");
  await expect(dialog).toContainText("The credits for preparing are not returned.");
  await dialog.getByRole("button", { name: "Delete project" }).click();
  await expect(page).toHaveURL(/\/styleguide\/templates\/projects$/);
});

test("processing · failed → Try again starts preparing again", async ({ page }) => {
  await page.goto(`${PAGE}?state=failed`);
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(pill(page)).toHaveText("Finding the lines");
  await expect(cancelButton(page)).toBeVisible();
  await expect(page.getByText("72 credits in reserve — charged when it’s ready")).toBeVisible();
});

test("processing · notify me: asks the browser only on press; granted → on, Turn off → off", async ({ page, context }) => {
  await context.grantPermissions(["notifications"]);
  await page.goto(`${PAGE}?state=running`);
  const notify = page.getByTestId("processing-notify");
  await expect(notify).toHaveAttribute("data-state", "off");
  await notify.getByRole("button", { name: "Notify me when it’s ready" }).click();
  await expect(notify).toHaveAttribute("data-state", "on");
  await expect(notify).toContainText("We’ll notify you when it’s ready.");
  await expectNoA11yViolations(page);
  await notify.getByRole("button", { name: "Turn off" }).click();
  await expect(notify.getByRole("button", { name: "Notify me when it’s ready" })).toBeVisible();
});

test("processing · notify me: blocked by the browser says how to allow it", async ({ page }) => {
  await page.goto(`${PAGE}?state=running&notify=denied`);
  await expect(page.getByTestId("processing-notify")).toContainText("Notifications are blocked for this site.");
  await expectNoHorizontalScroll(page);
  await expectNoA11yViolations(page);
});

test("processing · ready while elsewhere — preview toast on My projects", async ({ page }) => {
  await page.goto("/prototypes/processing/ready-elsewhere");
  const toaster = page.getByTestId("toaster");
  await expect(toaster).toContainText("“Kitchen scene” is ready");
  await expect(toaster).toContainText("12 turns ready to record");
  await expectAboveFold(page, toaster.getByRole("button", { name: "Open the studio" }));
  await expectNoHorizontalScroll(page);
  await expectNoA11yViolations(page);
});

test("processing · Russian", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("dubbed.language", "ru"));
  await page.goto(`${PAGE}?state=running`);
  await expect(page.getByRole("heading", { level: 1, name: "Сцена на кухне" })).toBeVisible();
  await expect(page.getByText("Отрезок 0:30 – 1:42 · 72 с")).toBeVisible();
  await expect(pill(page)).toHaveText("Находим реплики");
  await expect(page.getByText("Шаг 2 из 3 · Осталось около минуты")).toBeVisible();
  await expect(page.getByTestId("processing-found")).toHaveText("Уже найдено 5 реплик");
  await expect(page.getByText("72 кредита в резерве — спишутся, когда всё будет готово")).toBeVisible();
  await expectAboveFold(page, page.getByRole("button", { name: "Отменить подготовку" }));
  await expectNoHorizontalScroll(page);
  await expectNoA11yViolations(page);

  await page.goto(`${PAGE}?state=queued`);
  await expect(pill(page)).toHaveText("Ждём своей очереди");
  await page.goto(`${PAGE}?state=failed`);
  await expect(page.getByTestId("processing-failed")).toContainText("72 кредита вернулись на баланс");
  await expectAboveFold(page, page.getByRole("button", { name: "Попробовать снова" }));
  await expectNoA11yViolations(page);
});
