import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { balanceLink, resetDemo } from "./support/flow";

/*
 * Feature 002 — document semantics guard (design QA): heading order and landmarks on /credits (default + error) and the
 * payment page. These are best-practice rules, so the shared WCAG-tag run does not cover them.
 */
async function expectSemantics(page: Page) {
  const results = await new AxeBuilder({ page })
    .withRules(["heading-order", "region"])
    .exclude("[data-testid=state-switcher]")
    .analyze();
  const summary = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
  expect(summary, summary.join("\n")).toEqual([]);
}

test.describe("Credits and checkout semantics", () => {
  test("/credits default: heading order and landmarks", async ({ page }) => {
    await resetDemo(page, "", "/credits");
    await expect(page.getByTestId("credits-balance")).toContainText("120");
    await expect(page.getByRole("heading", { level: 2, name: "Buy credits" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "History" })).toBeVisible();
    await expectSemantics(page);
  });

  test("/credits error: heading order and landmarks", async ({ page }) => {
    await resetDemo(page, "", "/projects");
    await expect(balanceLink(page)).toContainText("120");
    await page.evaluate(() => {
      IDBDatabase.prototype.transaction = function () { throw new Error("storage unavailable"); };
    });
    await balanceLink(page).click();
    await expect(page.getByTestId("credits-error")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 2, name: "Couldn’t load your credits" })).toBeVisible();
    await expectSemantics(page);
  });

  test("/checkout/<id> default: heading order and landmarks", async ({ page }) => {
    await resetDemo(page, "", "/credits");
    await page.getByRole("button", { name: "Buy 1,000 credits · $9" }).click();
    await expect(page.getByTestId("checkout-page")).toHaveAttribute("data-state", "default");
    await expect(page.locator("header")).toBeVisible();
    await expectSemantics(page);
  });
});
