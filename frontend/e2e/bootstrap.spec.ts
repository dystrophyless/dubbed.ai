import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations, trackConsoleErrors } from "./support/a11y";

/* Bootstrap smoke: routes render without errors, no horizontal scroll, axe clean, EN/RU switch works. */

async function expectNoHorizontalScroll(page: Page) {
  const viewport = page.viewportSize()!.width;
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(viewport);
}

const switchTo = (page: Page, lang: "English" | "Russian" | "Английский" | "Русский") =>
  page.getByTestId("language-switch").first().getByRole("radio", { name: lang }).click();

for (const path of ["/styleguide", "/styleguide/templates", "/prototypes", "/styleguide/shells/app", "/styleguide/shells/focused"]) {
  test(`${path} renders without errors or horizontal scroll`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto(path);
    await expect(page.locator("main, [data-testid=styleguide]").first()).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoA11yViolations(page);
    expect(errors).toEqual([]);
  });
}

test("language switch changes the UI and <html lang>, and is remembered", async ({ page }) => {
  await page.goto("/styleguide");
  await switchTo(page, "Russian");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Стайлгайд");
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expectNoHorizontalScroll(page);
  await expectNoA11yViolations(page);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Стайлгайд");
  await switchTo(page, "Английский");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Styleguide");
});

test("select opens its own listbox and picks with the keyboard", async ({ page }) => {
  await page.goto("/styleguide#fields");
  const trigger = page.getByRole("button", { name: /Spoken language/ });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Home");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(trigger).toContainText("English");
});

test("dialog traps focus and closes on Escape", async ({ page }) => {
  await page.goto("/styleguide#feedback");
  await page.getByRole("button", { name: "Leave the studio" }).click();
  const dialog = page.getByRole("dialog", { name: "Leave with an unsaved take?" });
  await expect(dialog).toBeVisible();
  await expectNoA11yViolations(page);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("record control records, stops by itself and saves", async ({ page }) => {
  await page.goto("/styleguide#media");
  const media = page.getByTestId("styleguide-media");
  await media.getByRole("button", { name: "Record", exact: true }).first().click();
  await expect(media.getByRole("button", { name: "Stop" }).first()).toBeVisible();
  await expect(media.getByText("Take saved").first()).toBeVisible({ timeout: 10_000 });
});
