import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./support/a11y";
import { resetDemo } from "./support/flow";

/*
 * Feature 002 robustness — a slow Buy never drags the user back to a payment page they left, and a failed read of the
 * returning ?purchase=<id> is a page error (Buy unavailable until it is read), not a silent plain page.
 */
async function purchaseStates(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("dubbed-mock");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const all = await new Promise<{ state: string }[]>((resolve, reject) => {
      const req = db.transaction("purchases").objectStore("purchases").getAll();
      req.onsuccess = () => resolve(req.result as { state: string }[]);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return all.map((p) => p.state);
  });
}

test.describe("credits robustness", () => {
  test("A — leaving while Buy is still creating the purchase: no jump to the payment page, the purchase is cancelled", async ({ page }) => {
    await resetDemo(page, "startdelay:1500", "/credits");
    await page.getByRole("button", { name: "Buy 1,000 credits · $9" }).click();
    await page.getByRole("link", { name: "Projects" }).first().click();
    await expect(page).toHaveURL(/\/projects$/);

    await expect.poll(() => purchaseStates(page), { timeout: 10_000 }).toEqual(["cancelled"]);
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/projects$/);
  });

  test("B — a failed read of ?purchase=<id> shows the error state with Try again; Buy is unavailable; retry recovers with Back to New dub", async ({ page }) => {
    await page.addInitScript(() => {
      const get = IDBObjectStore.prototype.get;
      IDBObjectStore.prototype.get = function (this: IDBObjectStore, ...args: Parameters<IDBObjectStore["get"]>) {
        if (this.name === "purchases" && sessionStorage.getItem("failPurchaseReads")) throw new Error("read failed");
        return get.apply(this, args);
      };
    });
    await resetDemo(page, "paydelay:100", "/credits?from=slots");
    await page.getByRole("button", { name: "Buy 1,000 credits · $9" }).click();
    await expect(page).toHaveURL(/\/checkout\/[^/]+$/);
    await page.getByRole("button", { name: "Pay $9" }).click();
    await expect(page).toHaveURL(/\/credits\?purchase=/);
    await expect(page.getByTestId("credits-notice")).toHaveAttribute("data-kind", "success");

    await page.evaluate(() => sessionStorage.setItem("failPurchaseReads", "1"));
    await page.reload();
    await expect(page.getByTestId("credits-error")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Buy / })).toHaveCount(0);
    await expect(page.getByTestId("credits-notice")).toHaveCount(0);

    await page.evaluate(() => sessionStorage.removeItem("failPurchaseReads"));
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByTestId("credits-error")).toHaveCount(0);
    await expect(page.getByTestId("credits-notice")).toHaveAttribute("data-kind", "success");
    await expect(page.getByRole("button", { name: "Back to New dub" })).toBeVisible();
  });

  /** Sets the mock failure switches in place (no reload: the chosen pack and the page state stay). */
  async function setFailures(page: Page, patch: { failStart?: boolean; failPay?: boolean }) {
    await page.evaluate(async (p) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open("dubbed-mock");
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("kv", "readwrite");
        const store = tx.objectStore("kv");
        const get = store.get("settings");
        get.onsuccess = () => store.put({ ...(get.result as object), ...p }, "settings");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    }, patch);
  }
  const clearFailures = (page: Page) => setFailures(page, { failStart: false, failPay: false });

  test("C — a failed Buy shows the inline alert, keeps the pack; Buy is the retry and charges once", async ({ page }) => {
    await resetDemo(page, "paydelay:200,fail:start", "/credits");
    await page.getByRole("radio", { name: /300/ }).check();
    await page.getByRole("button", { name: "Buy 300 credits · $3" }).click();
    const alert = page.getByTestId("credits-notice");
    await expect(alert).toHaveAttribute("data-kind", "buy-error");
    await expect(page.getByRole("alert")).toHaveCount(1);
    await expect(page.getByRole("alert")).toContainText("Couldn’t start the payment. Nothing was charged — try again.");
    await expect(page).toHaveURL(/\/credits$/);
    await expect(page.getByRole("radio", { name: /300/ })).toBeChecked();
    expect(await purchaseStates(page)).toEqual([]);
    await expectNoA11yViolations(page);

    await clearFailures(page);
    await page.getByRole("button", { name: "Buy 300 credits · $3" }).click();
    await expect(page).toHaveURL(/\/checkout\/[^/]+$/);
    await page.getByRole("button", { name: "Pay $3" }).click();
    await expect(page).toHaveURL(/\/credits\?purchase=/);
    await expect(page.getByTestId("credits-notice")).toHaveAttribute("data-kind", "success");
    await expect(page.getByTestId("credits-balance")).toContainText("420");
    expect(await purchaseStates(page)).toEqual(["completed"]);
  });

  test("D — a failed Pay shows the inline alert above Pay; Pay is the retry and credits once", async ({ page }) => {
    await resetDemo(page, "paydelay:200", "/credits");
    await page.getByRole("button", { name: "Buy 1,000 credits · $9" }).click();
    await expect(page).toHaveURL(/\/checkout\/[^/]+$/);
    await setFailures(page, { failPay: true });
    await page.getByRole("button", { name: "Pay $9" }).click();
    await expect(page.getByTestId("checkout-pay-error")).toContainText("The payment didn’t go through. Nothing was charged — try again.");
    await expect(page.getByRole("alert")).toHaveCount(1);
    await expect(page.getByTestId("checkout-pack")).toContainText("1,000 credits");
    await expect(page.getByTestId("checkout-page")).toHaveAttribute("data-state", "default");
    expect(await purchaseStates(page)).toEqual(["awaiting"]);
    await expectNoA11yViolations(page);

    await clearFailures(page);
    await page.getByRole("button", { name: "Pay $9" }).click();
    await expect(page).toHaveURL(/\/credits\?purchase=/);
    await expect(page.getByTestId("credits-notice")).toHaveAttribute("data-kind", "success");
    await expect(page.getByTestId("credits-balance")).toContainText("1,120");
    expect(await purchaseStates(page)).toEqual(["completed"]);
  });

  test("E — RU: the Buy and Pay errors are in Russian", async ({ page }) => {
    await resetDemo(page, "paydelay:200,fail:start", "/credits", "ru");
    await page.getByRole("button", { name: /^Купить/ }).click();
    await expect(page.getByTestId("credits-notice")).toContainText("Не удалось начать оплату. Ничего не списано — попробуйте ещё раз.");
    await clearFailures(page);
    await page.getByRole("button", { name: /^Купить/ }).click();
    await expect(page).toHaveURL(/\/checkout\/[^/]+$/);
    await setFailures(page, { failPay: true });
    await page.getByRole("button", { name: /^Оплатить/ }).click();
    await expect(page.getByTestId("checkout-pay-error")).toContainText("Платёж не прошёл. Ничего не списано — попробуйте ещё раз.");
  });

  test("F — leaving /credits?from=slots to plain /credits while Buy is in flight: the old purchase is cancelled, the new URL is not stuck", async ({ page }) => {
    await resetDemo(page, "startdelay:1500", "/credits?from=slots");
    await page.getByRole("button", { name: "Buy 1,000 credits · $9" }).click();
    await page.getByRole("button", { name: "Account" }).click();
    await page.getByRole("menuitem", { name: "Credits" }).click();
    await expect(page).toHaveURL(/\/credits$/);

    await expect.poll(() => purchaseStates(page), { timeout: 10_000 }).toEqual(["cancelled"]);
    await expect(page).toHaveURL(/\/credits$/);
    await expect(page.getByRole("button", { name: "Buy 1,000 credits · $9" })).toBeEnabled();
    await expect(page.getByRole("radio", { name: /300/ })).toBeEnabled();
    await page.getByRole("radio", { name: /300/ }).check();

    await page.getByRole("button", { name: /^Buy / }).click();
    await expect(page).toHaveURL(/\/checkout\/[^/]+$/, { timeout: 10_000 });
    expect((await purchaseStates(page)).sort()).toEqual(["awaiting", "cancelled"]);
  });

  test("G — the success notice and the balance are never shown with the pre-purchase balance", async ({ page }) => {
    await page.addInitScript(() => {
      const seen: string[] = [];
      (window as unknown as { __seen: string[] }).__seen = seen;
      const scan = () => {
        const n = document.querySelector('[data-testid="credits-notice"]');
        const b = document.querySelector('[data-testid="credits-balance"]');
        if (n?.getAttribute("data-kind") === "success") seen.push(`${n.textContent} | ${b?.textContent ?? ""}`);
      };
      new MutationObserver(scan).observe(document, { subtree: true, childList: true, characterData: true, attributes: true });
    });
    await resetDemo(page, "paydelay:100", "/credits");
    await page.getByRole("radio", { name: /300/ }).check({ force: true });
    await page.getByRole("button", { name: "Buy 300 credits · $3" }).click();
    await expect(page).toHaveURL(/\/checkout\/[^/]+$/);
    await page.getByRole("button", { name: "Pay $3" }).click();
    await expect(page.getByTestId("credits-notice")).toHaveAttribute("data-kind", "success");
    await expect(page.getByTestId("credits-notice")).toContainText("Your balance is now 420.");
    await page.waitForTimeout(300);
    const seen = await page.evaluate(() => (window as unknown as { __seen: string[] }).__seen);
    expect(seen.length).toBeGreaterThan(0);
    for (const s of seen) {
      expect(s).toContain("Your balance is now 420.");
      expect(s).not.toContain("balance is now 120");
    }
  });

  test("H — Back from a new payment page lands on a clean Credits, after a declined and after a success", async ({ page }) => {
    await resetDemo(page, "payment:declined,paydelay:100", "/credits");
    await page.getByRole("button", { name: "Buy 1,000 credits · $9" }).click();
    await expect(page).toHaveURL(/\/checkout\/[^/]+$/);
    await page.getByRole("button", { name: "Pay $9" }).click();
    await expect(page).toHaveURL(/\/credits\?purchase=/);
    await expect(page.getByTestId("credits-notice")).toHaveAttribute("data-kind", "declined");

    await page.getByRole("button", { name: "Buy 1,000 credits · $9" }).click();
    await expect(page).toHaveURL(/\/checkout\/[^/]+$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/credits$/);
    await expect(page.getByTestId("credits-buy")).toBeVisible();
    await expect(page.getByTestId("credits-notice")).toHaveCount(0);
    await expect.poll(async () => (await purchaseStates(page)).sort()).toEqual(["cancelled", "declined"]);
  });

  test("I — Back from a new payment page after a success: no old 'credits added' notice", async ({ page }) => {
    await resetDemo(page, "paydelay:100", "/credits");
    await page.getByRole("button", { name: /^Buy / }).click();
    await expect(page).toHaveURL(/\/checkout\/[^/]+$/);
    await page.getByRole("button", { name: /^Pay / }).click();
    await expect(page.getByTestId("credits-notice")).toHaveAttribute("data-kind", "success");
    await page.getByRole("button", { name: /^Buy / }).click();
    await expect(page).toHaveURL(/\/checkout\/[^/]+$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/credits$/);
    await expect(page.getByTestId("credits-buy")).toBeVisible();
    await expect(page.getByTestId("credits-notice")).toHaveCount(0);
  });
});
