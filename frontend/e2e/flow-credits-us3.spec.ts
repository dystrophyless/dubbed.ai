import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./support/a11y";
import { balanceLink, noHorizontalScroll, resetDemo, uploadScene, type Lang } from "./support/flow";

/*
 * Feature 002, US3 — buy credits for the scene that needed them, then come back to it. New dub → Credits (shortfall or
 * slots notice, the smallest covering pack chosen) → payment page → success with "Back to New dub".
 * The scene clip is 13 s = 14 credits; balance:5 → 9 more credits are needed → the 300 pack.
 */
test.describe.configure({ timeout: 120_000 });

const newDub = (page: Page) => page.getByTestId("new-dub");
const notice = (page: Page) => page.getByTestId("credits-notice");
const start = (page: Page) => page.getByTestId("cost-button");

async function uploadAndWaitReady(page: Page) {
  await uploadScene(page);
  await expect(newDub(page)).toHaveAttribute("data-state", "ready", { timeout: 20_000 });
}

test.describe("US3 — buy credits and return to New dub", () => {
  test("short on credits: Buy credits → shortfall notice, 300 pack chosen → Pay → Back to New dub with the video kept", async ({ page }) => {
    await resetDemo(page, "balance:5,paydelay:100");
    await uploadAndWaitReady(page);
    await expect(start(page)).toBeDisabled();
    await expect(page.getByText("9 more credits needed")).toBeVisible();
    await page.getByRole("button", { name: "Buy credits" }).click();

    await expect(page).toHaveURL(/\/credits\?from=new&project=[^&]+&need=9$/);
    await expect(notice(page)).toHaveAttribute("data-kind", "shortfall");
    await expect(notice(page)).toContainText("You need 9 more credits for Scene");
    await expect(page.getByRole("radio", { name: /300/ })).toBeChecked();
    await expect(page.getByRole("button", { name: "Buy 300 credits · $3" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Back to New dub" })).toHaveCount(0);
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);

    await page.getByRole("button", { name: "Buy 300 credits · $3" }).click();
    await expect(page).toHaveURL(/\/checkout\/[^/]+$/);
    await page.getByRole("button", { name: "Pay $3" }).click();
    await expect(page).toHaveURL(/\/credits\?purchase=/);
    await expect(notice(page)).toHaveAttribute("data-kind", "success");
    await expect(notice(page)).toContainText("300 credits added");
    await expect(notice(page)).toContainText("Your balance is now 305.");
    const back = page.getByRole("button", { name: "Back to New dub" });
    await expect(back).toBeVisible();
    // one primary: Buy drops to secondary beside the notice's primary
    await expect(page.getByTestId("credits-buy")).toHaveAttribute("data-variant", /secondary/);
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);

    // the success survives a reload and still knows where to go back to
    await page.reload();
    await expect(page.getByRole("button", { name: "Back to New dub" })).toBeVisible();

    await page.getByRole("button", { name: "Back to New dub" }).click();
    await expect(page).toHaveURL(/\/new\?project=/);
    await expect(newDub(page)).toHaveAttribute("data-state", "ready", { timeout: 15_000 });
    await expect(page.getByTestId("new-dub-card")).toContainText("Scene");
    await expect(start(page)).toBeEnabled();
    await expect(balanceLink(page)).toContainText("305");
  });

  test("leaving Credits without buying (browser back): New dub keeps video, section and the shortfall", async ({ page }) => {
    await resetDemo(page, "balance:5");
    await uploadAndWaitReady(page);
    const range = await page.getByTestId("range-value").innerText();
    await page.getByRole("button", { name: "Buy credits" }).click();
    await expect(notice(page)).toHaveAttribute("data-kind", "shortfall");
    await page.goBack();
    await expect(newDub(page)).toHaveAttribute("data-state", "ready", { timeout: 15_000 });
    await expect(page.getByTestId("range-value")).toHaveText(range);
    await expect(start(page)).toBeDisabled();
    await expect(page.getByText("9 more credits needed")).toBeVisible();
    await expect(balanceLink(page)).toContainText("5");
  });

  test("the need shown is the URL's, and the pack is the smallest one that covers it", async ({ page }) => {
    await resetDemo(page, "balance:5");
    await uploadAndWaitReady(page);
    await page.getByRole("button", { name: "Buy credits" }).click();
    await expect(page).toHaveURL(/\/credits\?from=new/);
    const id = new URL(page.url()).searchParams.get("project");
    await page.goto(`/credits?from=new&project=${id}&need=400`);
    await expect(notice(page)).toContainText("You need 400 more credits for Scene");
    await expect(page.getByRole("radio", { name: /1,000/ })).toBeChecked(); // smallest pack that covers 400
  });

  test("slots full: Buy credits → slots notice → buy → 10 slots → Back to New dub lets the user choose a video", async ({ page }) => {
    await resetDemo(page, "slots:full,paydelay:100");
    await expect(newDub(page)).toHaveAttribute("data-state", "no-slot");
    await page.getByRole("button", { name: "Buy credits" }).click();

    await expect(page).toHaveURL(/\/credits\?from=slots$/);
    await expect(notice(page)).toHaveAttribute("data-kind", "slots");
    await expect(notice(page)).toContainText("Buy your first pack to get 10 project slots");
    await expect(page.getByRole("radio", { name: /1,000/ })).toBeChecked(); // no need: Best value
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);

    await page.getByRole("button", { name: "Buy 1,000 credits · $9" }).click();
    await expect(page).toHaveURL(/\/checkout\//);
    await page.getByRole("button", { name: "Pay $9" }).click();
    await expect(notice(page)).toHaveAttribute("data-kind", "success");
    await expect(notice(page)).toContainText("Your account now has 10 project slots.");
    await page.getByRole("button", { name: "Back to New dub" }).click();
    await expect(page).toHaveURL(/\/new$/);
    await expect(newDub(page)).toHaveAttribute("data-state", "empty");
    await expect(page.locator('input[type="file"]').first()).toBeAttached();
    await uploadAndWaitReady(page);
  });

  test("My projects: slots-full Buy credits opens Credits with the slots notice", async ({ page }) => {
    await resetDemo(page, "slots:full", "/projects");
    await page.getByRole("button", { name: "Buy credits" }).click();
    await expect(page).toHaveURL(/\/credits\?from=slots$/);
    await expect(notice(page)).toHaveAttribute("data-kind", "slots");
  });

  test("RU: shortfall and success-return, no horizontal scroll", async ({ page }) => {
    const lang: Lang = "ru";
    await resetDemo(page, "balance:5,paydelay:100", "/new", lang);
    await uploadAndWaitReady(page);
    await page.getByRole("button", { name: "Купить кредиты" }).click();
    await expect(page).toHaveURL(/\/credits\?from=new/);
    await expect(notice(page)).toHaveAttribute("data-kind", "shortfall");
    await expect(notice(page)).toContainText("Не хватает 9 кредитов");
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);
    await page.getByRole("button", { name: "Купить 300 кредитов · $3" }).click();
    await page.getByRole("button", { name: "Оплатить $3" }).click();
    await expect(notice(page)).toHaveAttribute("data-kind", "success");
    await expect(page.getByRole("button", { name: "Вернуться к новой озвучке" })).toBeVisible();
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);
  });
});
