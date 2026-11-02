import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, trackConsoleErrors } from "./support/a11y";

/* Phase 0 smoke: the bootstrap routes render, switch language and have no horizontal scroll. */
for (const path of ["/styleguide", "/styleguide/templates", "/prototypes"]) {
  test(`${path} renders without errors or horizontal scroll`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const viewport = page.viewportSize()!.width;
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(viewport);
    await expectNoA11yViolations(page);
    expect(errors).toEqual([]);
  });
}

test("language switch changes the UI and <html lang>", async ({ page }) => {
  await page.goto("/styleguide");
  await page.getByRole("button", { name: "RU" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Стайлгайд");
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Стайлгайд");
  await page.getByRole("button", { name: "EN" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Styleguide");
});
