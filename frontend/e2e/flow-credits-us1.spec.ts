import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations, trackConsoleErrors } from "./support/a11y";
import { balanceLink, noHorizontalScroll, resetDemo, uploadScene } from "./support/flow";
import { openScreen } from "./support/screens";

/*
 * Feature 002, US1 — see my balance and where my credits went, on the real /credits route over mock services.
 * `?demo=reset` gives balance 120 and one welcome row; the mock writes a run row for every 001 money transition.
 */
const balance = (page: Page) => page.getByTestId("credits-balance");
const rows = (page: Page) => page.getByTestId("history-row");

async function startScene(page: Page) {
  await uploadScene(page);
  await expect(page.getByTestId("new-dub")).toHaveAttribute("data-state", "ready", { timeout: 20_000 });
  await page.getByTestId("cost-button").click();
  await expect(page).toHaveURL(/\/projects\/[^/]+\/processing$/);
  await expect(page.getByTestId("processing")).toBeVisible();
}

test.describe("US1 — Credits shows balance and history", () => {
  test("fresh account: 120 credits, one welcome row, pill hidden only on Credits", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await resetDemo(page, "", "/credits");
    await expect(page.getByRole("heading", { level: 1, name: "Credits" })).toBeVisible();
    await expect(balance(page)).toContainText("120");
    await expect(balance(page)).toContainText("About 2 min of dubbing");
    await expect(page.getByTestId("credits-reserved")).toHaveCount(0);
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText("Welcome credits");
    await expect(rows(page).first()).toContainText("+120");
    await expect(page.getByRole("group", { name: "Buy credits" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Buy 1,000 credits · $9" })).toBeVisible();
    await expect(balanceLink(page)).toHaveCount(0); // the top-bar pill is hidden on Credits (FR-002)
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);

    await page.goto("/projects");
    await expect(balanceLink(page)).toContainText("120");
    expect(errors).toEqual([]);
  });

  test("a started run: 106 left, reserve line, row turns from in reserve to charged without a reload", async ({ page }) => {
    await resetDemo(page, "speed:2", "/new");
    await startScene(page);
    await balanceLink(page).click();
    await expect(page).toHaveURL(/\/credits$/);
    await expect(balance(page)).toContainText("106");
    await expect(page.getByTestId("credits-reserved")).toContainText("14 credits in reserve for Scene");
    await expect(rows(page)).toHaveCount(2);
    await expect(rows(page).first()).toContainText("Scene");
    await expect(rows(page).first()).toContainText("14 in reserve");
    await expect(rows(page).first()).toContainText("−14");
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);

    await expect(rows(page).first()).toContainText("14 charged", { timeout: 30_000 });
    await expect(page.getByTestId("credits-reserved")).toHaveCount(0);
    await expect(balance(page)).toContainText("106");
    await expect(rows(page)).toHaveCount(2);
  });

  test("the reserve link and the run row open Processing", async ({ page }) => {
    await openScreen(page, "processing");
    await balanceLink(page).click();
    await expect(page).toHaveURL(/\/credits$/);
    const reserved = page.getByTestId("credits-reserved");
    await expect(reserved).toContainText("in reserve for");
    await reserved.getByRole("link").click();
    await expect(page).toHaveURL(/\/projects\/layout\/processing$/);
  });

  test("failed run: returned, nothing charged; Try again adds a new row", async ({ page }) => {
    await resetDemo(page, "speed:3,outcome:failed@2", "/new");
    await startScene(page);
    await expect(page.getByTestId("processing")).toHaveAttribute("data-phase", "failed", { timeout: 40_000 });
    await balanceLink(page).click();
    await expect(balance(page)).toContainText("120");
    await expect(rows(page)).toHaveCount(2);
    await expect(rows(page).first()).toContainText("Returned — service failure, nothing charged");
    await expectNoA11yViolations(page);

    await page.goBack();
    await page.getByRole("button", { name: "Try again" }).click();
    await balanceLink(page).click();
    await expect(balance(page)).toContainText("106");
    await expect(rows(page)).toHaveCount(3);
    await expect(rows(page).first()).toContainText("14 in reserve");
    await expect(rows(page).nth(1)).toContainText("Returned — service failure, nothing charged");
  });

  test("zero balance is a hint, not an error", async ({ page }) => {
    await resetDemo(page, "balance:0", "/credits");
    await expect(balance(page)).toContainText("Buy a pack to dub your next scene");
    await expect(page.getByTestId("credits-error")).toHaveCount(0);
    await expect(rows(page).first()).toContainText("Demo adjustment");
    await expectNoA11yViolations(page);
  });

  test("load error offers Try again", async ({ page }) => {
    await resetDemo(page, "", "/projects");
    await expect(balanceLink(page)).toContainText("120");
    // the mock's store stops answering (as a failing server would), then comes back
    await page.evaluate(() => {
      const original = IDBDatabase.prototype.transaction;
      (window as unknown as { restoreStore: () => void }).restoreStore = () => { IDBDatabase.prototype.transaction = original; };
      IDBDatabase.prototype.transaction = function () { throw new Error("storage unavailable"); };
    });
    await balanceLink(page).click();
    const error = page.getByTestId("credits-error");
    await expect(error).toBeVisible({ timeout: 15_000 });
    await expect(error).toContainText("Couldn’t load your credits");
    await expectNoA11yViolations(page);

    await page.evaluate(() => (window as unknown as { restoreStore: () => void }).restoreStore());
    await error.getByRole("button", { name: "Try again" }).click();
    await expect(balance(page)).toContainText("120");
    await expect(page.getByTestId("credits-error")).toHaveCount(0);
  });

  test("RU: Russian plurals and copy, no horizontal scroll", async ({ page }) => {
    await resetDemo(page, "balance:22", "/credits", "ru");
    await expect(page.getByRole("heading", { level: 1, name: "Кредиты" })).toBeVisible();
    await expect(balance(page)).toContainText("22");
    await expect(balance(page)).toContainText("кредита");
    await expect(balance(page)).toContainText("Меньше минуты озвучки");
    await expect(page.getByRole("button", { name: "Купить 1 000 кредитов · $9" })).toBeVisible();
    await expect(rows(page).first()).toContainText("Демо-корректировка");
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);

    await resetDemo(page, "balance:120", "/credits", "ru");
    await expect(balance(page)).toContainText("кредитов");
    await expect(balance(page)).toContainText("Около 2 мин озвучки");
  });
});
