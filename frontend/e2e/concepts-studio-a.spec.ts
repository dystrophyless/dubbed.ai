import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations, trackConsoleErrors } from "./support/a11y";

/* Phase 4 — concept A reworked: three placements of Previous × states × first / last turn, desktop and phone. */
const VARIANTS = ["a-back-top", "a-back-row", "a-back-sides"] as const;
const STATES = ["no-take", "recording", "saved"] as const;
const TURNS = [1, 12] as const;

async function expectNoHorizontalScroll(page: Page) {
  const viewport = page.viewportSize()!.width;
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(viewport);
}

for (const id of VARIANTS) {
  for (const state of STATES) {
    for (const turn of TURNS) {
      test(`studio ${id} · ${state} · turn ${turn}`, async ({ page }) => {
        const errors = trackConsoleErrors(page);
        await page.goto(`/prototypes/concepts/studio/${id}?state=${state}&turn=${turn}`);
        await expect(page.getByRole("heading", { level: 1, name: "Kitchen scene" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Exit studio" })).toBeVisible();
        await expect(page.getByText(`Turn ${turn} of 12`)).toBeAttached();
        await expect(page.getByTestId("turn-strip")).toHaveAttribute("aria-hidden", "true");
        await expect(page.getByText("Record a take to continue")).toHaveCount(0);

        const prev = page.getByRole("button", { name: "Previous turn" });
        if (turn === 1 || state === "recording") await expect(prev).toBeHidden(); // absent, or hidden with its slot kept
        else await expect(prev).toBeVisible();

        const next = page.getByRole("button", { name: turn === 12 ? "Build the result" : "Next", exact: true });
        if (state === "no-take") {
          await expect(page.getByRole("button", { name: "Original", exact: true })).toBeVisible();
          await expect(page.getByRole("button", { name: "Record", exact: true })).toBeVisible();
          await expect(page.getByText("Up to 4.4 s")).toBeVisible();
          await expect(next).toBeHidden();
        } else if (state === "recording") {
          await expect(page.getByRole("button", { name: "Stop" })).toBeVisible();
          await expect(page.getByText("1.5 s left")).toBeVisible();
          await expect(page.getByRole("button", { name: "Original", exact: true })).toBeHidden(); // hidden, slot kept
          await expect(next).toBeHidden();
        } else {
          await expect(page.getByRole("button", { name: "Record again" })).toBeVisible();
          await expect(page.getByRole("button", { name: "My take" })).toBeVisible();
          await expect(next).toBeVisible();
          // every action button is fully inside the viewport (the 390px row check for a-back-row)
          const vw = page.viewportSize()!.width;
          for (const b of await page.getByTestId("studio-actions").getByRole("button").all()) {
            const box = (await b.boundingBox())!;
            expect(box.x).toBeGreaterThanOrEqual(0);
            expect(box.x + box.width).toBeLessThanOrEqual(vw);
            expect(await b.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
          }
        }

        if (id === "a-back-sides") {
          const fwd = page.getByRole("button", { name: "Next turn" });
          if (state === "saved" && turn !== 12) await expect(fwd).toBeVisible();
          else await expect(fwd).toBeHidden();
        }

        await expectNoHorizontalScroll(page);
        await expectNoA11yViolations(page);
        expect(errors).toEqual([]);
      });
    }
  }
}

test("studio A: record → stop → saved shows Next in the hint's slot, Record keeps its place", async ({ page }) => {
  // the Record slot is anchored by its right edge (wide) or its grid cell (phone): "Record again" grows to the left only
  await page.goto("/prototypes/concepts/studio/a-back-top?turn=3");
  const record = page.getByRole("button", { name: "Record", exact: true });
  const before = (await record.boundingBox())!;
  await record.click();
  await page.getByRole("button", { name: "Stop" }).click();
  const again = page.getByRole("button", { name: "Record again" });
  await expect(again).toBeVisible({ timeout: 5_000 });
  const after = (await again.boundingBox())!;
  expect(Math.abs(after.x + after.width - (before.x + before.width))).toBeLessThan(2);
  expect(Math.abs(after.y - before.y)).toBeLessThan(2);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Turn 4 of 12")).toBeAttached();
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeHidden();
});

test("studio A: the volume button opens a popover with the slider", async ({ page }) => {
  await page.goto("/prototypes/concepts/studio/a-back-row");
  await page.getByRole("button", { name: "Original voice volume" }).click();
  const dialog = page.getByRole("dialog", { name: "Original voice volume" });
  await expect(dialog.getByRole("slider", { name: "Original voice volume" })).toBeFocused();
  await expectNoA11yViolations(page);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("studio A (RU): the saved row fits at 390px", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("dubbed.language", "ru"));
  await page.goto("/prototypes/concepts/studio/a-back-row?state=saved&turn=3");
  await expect(page.getByRole("button", { name: "Записать заново" })).toBeVisible();
  const vw = page.viewportSize()!.width;
  for (const b of await page.getByTestId("studio-actions").getByRole("button").all()) {
    const box = (await b.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(vw);
    expect(await b.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  }
  await expectNoHorizontalScroll(page);
});

test("studio A: progress dots — the current pill moves with Next and Previous, done dots stay accent", async ({ page }) => {
  await page.goto("/prototypes/concepts/studio/a-back-row?state=saved&turn=3");
  const dots = page.getByTestId("turn-strip").locator("span");
  await expect(dots).toHaveCount(12);
  await expect(dots.nth(2)).toHaveAttribute("data-s", "current");
  await expect(dots.nth(1)).toHaveAttribute("data-s", "done");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(dots.nth(3)).toHaveAttribute("data-s", "current");
  await expect(dots.nth(2)).toHaveAttribute("data-s", "done");
  await expect(dots.nth(4)).toHaveAttribute("data-s", "ahead");
  await page.getByRole("button", { name: "Previous turn" }).click();
  await expect(dots.nth(2)).toHaveAttribute("data-s", "current");
  await expect(page.getByText("Turn 3 of 12")).toBeAttached();
});
