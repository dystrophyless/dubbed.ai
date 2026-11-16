import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations, trackConsoleErrors } from "./support/a11y";
import { noHorizontalScroll, resetDemo, type Lang } from "./support/flow";
import { seedHistory } from "./support/history";

/*
 * Feature 002, US2 — buy a credit pack: Credits → simulated payment page → back on Credits with a success / declined /
 * cancelled outcome, never charged twice. `?demo=payment:declined` and `paydelay:<ms>` steer the mock provider.
 */
const balance = (page: Page) => page.getByTestId("credits-balance");
const rows = (page: Page) => page.getByTestId("history-row");
const notice = (page: Page) => page.getByTestId("credits-notice");

/** Presses Buy on Credits and waits for the payment page; returns the purchase id from the URL. */
async function buy(page: Page, name = "Buy 1,000 credits · $9") {
  await page.getByRole("button", { name }).click();
  await expect(page).toHaveURL(/\/checkout\/[^/]+$/);
  await expect(page.getByTestId("checkout-page")).toHaveAttribute("data-state", "default");
  return new URL(page.url()).pathname.split("/").pop()!;
}

test.describe("US2 — buy a credit pack", () => {
  test("Best value is preselected; Buy → payment page → Pay → Credits with success, once", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await resetDemo(page, "paydelay:300", "/credits");
    await expect(page.getByRole("button", { name: "Buy 1,000 credits · $9" })).toBeVisible();
    await expect(page.getByRole("radio", { name: /1,000/ })).toBeChecked();
    await expect(notice(page)).toHaveCount(0);

    const id = await buy(page);
    // outside the product shell: brand + language only, no top navigation / balance pill
    await expect(page.getByRole("link", { name: "Projects" })).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1, name: "Confirm your payment" })).toBeVisible();
    await expect(page.getByText("Demo payment — no real money")).toBeVisible();
    await expect(page.getByTestId("checkout-pack")).toContainText("1,000 credits");
    await expect(page.getByRole("button", { name: "Back to Dubbed" })).toBeVisible();
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);

    const pay = page.getByRole("button", { name: "Pay $9" });
    await pay.click();
    await expect(page.getByTestId("checkout-page")).toHaveAttribute("data-state", /paying|returning/);
    await expect(page).toHaveURL(new RegExp(`/credits\\?purchase=${id}$`));
    await expect(notice(page)).toHaveAttribute("data-kind", "success");
    await expect(notice(page)).toContainText("1,000 credits added");
    await expect(notice(page)).toContainText("Your balance is now 1,120.");
    await expect(notice(page)).toContainText("10 project slots");
    await expect(balance(page)).toContainText("1,120");
    await expect(rows(page).first()).toContainText("Pack · 1,000 credits");
    await expect(rows(page).first()).toContainText("+1,000");
    await expect(rows(page)).toHaveCount(2);
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);

    // reload: still one purchase, one row, the same balance
    await page.reload();
    await expect(balance(page)).toContainText("1,120");
    await expect(rows(page)).toHaveCount(2);

    // the payment page was replaced: browser back does not land on it
    await page.goBack();
    await expect(page).not.toHaveURL(/\/checkout\//);
    expect(errors).toEqual([]);
  });

  test("another pack: the Buy label and the payment page follow the choice", async ({ page }) => {
    await resetDemo(page, "paydelay:100", "/credits");
    await page.getByRole("radio", { name: /300/ }).check({ force: true });
    await expect(page.getByTestId("credits-buy")).toContainText("Buy 300 credits · $3");
    await buy(page, "Buy 300 credits · $3");
    await expect(page.getByTestId("checkout-pack")).toContainText("300 credits");
    await page.getByRole("button", { name: "Pay $3" }).click();
    await expect(notice(page)).toContainText("300 credits added");
    await expect(balance(page)).toContainText("420");
    await expect(page.getByRole("radio", { name: /300/ })).toBeChecked();
  });

  test("declined: warning, balance and history unchanged, the same pack stays chosen", async ({ page }) => {
    await resetDemo(page, "payment:declined,paydelay:100", "/credits");
    await page.getByRole("radio", { name: /3,000/ }).check({ force: true });
    await buy(page, "Buy 3,000 credits · $24");
    await page.getByRole("button", { name: "Pay $24" }).click();
    await expect(page).toHaveURL(/\/credits\?purchase=/);
    await expect(notice(page)).toHaveAttribute("data-kind", "declined");
    await expect(notice(page)).toContainText("The payment didn’t go through");
    await expect(balance(page)).toContainText("120");
    await expect(rows(page)).toHaveCount(1);
    await expect(page.getByRole("radio", { name: /3,000/ })).toBeChecked();
    await expectNoA11yViolations(page);

    // an unknown payment link is not found
    await page.goto("/checkout/does-not-exist");
    await expect(page.getByTestId("checkout-page")).toHaveAttribute("data-state", "not-found");
  });

  test("Back to Dubbed and the browser back button cancel: default Credits, no row, finished page is not payable", async ({ page }) => {
    await resetDemo(page, "", "/credits");
    const id = await buy(page);
    await page.getByRole("button", { name: "Back to Dubbed" }).click();
    await expect(page).toHaveURL(/\/credits$/);
    await expect(notice(page)).toHaveCount(0);
    await expect(rows(page)).toHaveCount(1);
    await expect(balance(page)).toContainText("120");

    await page.goto(`/checkout/${id}`);
    await expect(page.getByTestId("checkout-page")).toHaveAttribute("data-state", "cancelled");
    await expect(page.getByText("This payment was cancelled")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Pay/ })).toHaveCount(0);
    await expectNoA11yViolations(page);

    // browser back while awaiting counts as cancel
    await page.goto("/credits");
    const second = await buy(page);
    await page.goBack();
    await expect(page).toHaveURL(/\/credits$/);
    await expect(notice(page)).toHaveCount(0);
    await expect(rows(page)).toHaveCount(1);
    await page.goto(`/checkout/${second}`);
    await expect(page.getByTestId("checkout-page")).toHaveAttribute("data-state", "cancelled");
  });

  test("a completed payment page reopened says so and never charges again", async ({ page }) => {
    await resetDemo(page, "paydelay:100", "/credits");
    const id = await buy(page);
    await page.getByRole("button", { name: "Pay $9" }).click();
    await expect(notice(page)).toHaveAttribute("data-kind", "success");

    await page.goto(`/checkout/${id}`);
    await expect(page.getByTestId("checkout-page")).toHaveAttribute("data-state", "completed");
    await expect(page.getByText("This payment is already complete")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Pay/ })).toHaveCount(0);
    await expectNoA11yViolations(page);
    await page.getByRole("button", { name: "Back to Dubbed" }).click();
    await expect(page).toHaveURL(/\/credits$/);
    await expect(balance(page)).toContainText("1,120");
    await expect(rows(page)).toHaveCount(2);
  });

  test("opening Credits cancels an abandoned checkout in another tab", async ({ page }) => {
    await resetDemo(page, "", "/credits");
    const id = await buy(page);
    const other = await page.context().newPage();
    await other.goto("/credits");
    await expect(other.getByTestId("credits-balance")).toBeVisible();
    await page.reload(); // the abandoned page now finds its purchase cancelled
    await expect(page.getByTestId("checkout-page")).toHaveAttribute("data-state", "cancelled");
    expect(page.url()).toContain(id);
    await other.close();
  });

  test("changing the history page keeps the list on screen (no skeleton flash)", async ({ page }) => {
    await resetDemo(page, "", "/credits");
    await expect(balance(page)).toBeVisible();
    const now = Date.now();
    const history = seedHistory(Array.from({ length: 25 }, (_, i) => ({
      id: `p${i}`, name: `Scene ${i}`, reserved: 0, charged: 10, createdAt: now - (i + 1) * 60_000, changedAt: now - (i + 1) * 60_000,
    })));
    await page.evaluate(async (history) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const r = indexedDB.open("dubbed-mock"); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
      });
      const tx = db.transaction(["history"], "readwrite");
      history.forEach((row) => tx.objectStore("history").put(row));
      await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
      db.close();
    }, history);
    await page.reload();
    await expect(rows(page)).toHaveCount(20);
    await page.evaluate(() => {
      const w = window as unknown as { busySeen: number };
      w.busySeen = 0;
      new MutationObserver(() => { if (document.querySelector('[aria-busy="true"]')) w.busySeen++; })
        .observe(document.body, { subtree: true, attributes: true, childList: true, attributeFilter: ["aria-busy"] });
    });
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(rows(page)).toHaveCount(7); // 25 runs + welcome + adjustment = 27
    expect(await page.evaluate(() => (window as unknown as { busySeen: number }).busySeen)).toBe(0);
  });

  test("RU: payment page and success notice, no horizontal scroll", async ({ page }) => {
    const lang: Lang = "ru";
    await resetDemo(page, "paydelay:100", "/credits", lang);
    await page.getByRole("button", { name: "Купить 1 000 кредитов · $9" }).click();
    await expect(page).toHaveURL(/\/checkout\//);
    await expect(page.getByRole("heading", { level: 1, name: "Подтвердите оплату" })).toBeVisible();
    await expect(page.getByText("Демо-оплата — настоящие деньги не списываются")).toBeVisible();
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);
    await page.getByRole("button", { name: "Оплатить $9" }).click();
    await expect(notice(page)).toContainText("Начислено 1 000 кредитов");
    await expect(notice(page)).toContainText("Теперь на балансе 1 120.");
    await expect(notice(page)).toContainText("10 мест для проектов");
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);
  });
});
