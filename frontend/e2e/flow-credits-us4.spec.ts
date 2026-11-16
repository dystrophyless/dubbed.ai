import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./support/a11y";
import { balanceLink, resetDemo } from "./support/flow";

/*
 * Feature 002, US4 — the balance stays truthful everywhere: a purchase in one tab updates the balance, the history and the
 * top-bar pill in the other open tabs without a reload; a zero balance is a hint, never an error.
 */
test.describe("US4 — know where I stand", () => {
  test("a purchase in one tab updates the other tabs without a reload", async ({ page: a }) => {
    await resetDemo(a, "paydelay:100", "/credits");
    await expect(a.getByTestId("credits-balance")).toContainText("120");

    const b = await a.context().newPage();
    await b.goto("/credits");
    await expect(b.getByTestId("credits-balance")).toContainText("120");
    await expect(b.getByTestId("history-row")).toHaveCount(1);
    const c = await a.context().newPage();
    await c.goto("/projects");
    await expect(balanceLink(c)).toContainText("120");

    await a.getByRole("button", { name: "Buy 1,000 credits · $9" }).click();
    await expect(a).toHaveURL(/\/checkout\//);
    await a.getByRole("button", { name: "Pay $9" }).click();
    await expect(a.getByTestId("credits-notice")).toHaveAttribute("data-kind", "success");

    await expect(b.getByTestId("credits-balance")).toContainText("1,120");
    await expect(b.getByTestId("history-row").first()).toContainText("Pack · 1,000 credits");
    await expect(b.getByTestId("history-row")).toHaveCount(2);
    await expect(balanceLink(c)).toContainText("1,120");
    await expectNoA11yViolations(b);
    await b.close();
    await c.close();
  });

  test("zero balance is a hint, not an error", async ({ page }) => {
    await resetDemo(page, "balance:0", "/credits");
    await expect(page.getByTestId("credits-balance")).toContainText("Buy a pack to dub your next scene");
    await expect(page.getByTestId("credits-error")).toHaveCount(0);
    await expect(page.getByTestId("credits-notice")).toHaveCount(0);
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Buy .* credits/ })).toBeEnabled();
    await expectNoA11yViolations(page);
  });
});
