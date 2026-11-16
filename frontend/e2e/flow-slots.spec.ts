import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./support/a11y";
import { noHorizontalScroll, resetDemo, seedProjects, uploadScene, type Lang } from "./support/flow";

/*
 * Feature 003 — every purchase raises the project-slot limit (2 → 10, then +5, up to 50). Mock services (?demo= presets):
 * `slots:<n>` sets the limit, `slots:full` fills every slot, `payment:declined` steers the provider.
 */
const notice = (page: Page) => page.getByTestId("credits-notice");
const noSlot = (page: Page) => page.getByTestId("new-dub-no-slot");

/** One stored project, so My projects shows its "N of M project slots used" header; ends on /credits. */
async function startOnCredits(page: Page, preset: string, lang: Lang = "en") {
  await resetDemo(page, preset, "/projects", lang);
  await expect(page.getByTestId("projects-empty-new")).toBeVisible();
  await seedProjects(page, ["done"]);
  await expect(page.getByTestId("project-card")).toHaveCount(1);
  await page.goto("/credits");
}

/** Credits → Buy (the preselected pack) → Pay → back on Credits with the outcome. */
async function buyAndPay(page: Page) {
  await page.getByTestId("credits-buy").click();
  await expect(page).toHaveURL(/\/checkout\//);
  await page.getByTestId("checkout-pay").click();
  await expect(notice(page)).toBeVisible();
}

test.describe("US1 — a purchase gives me more room", () => {
  test("10 → 15: the success names it and My projects shows the new limit", async ({ page }) => {
    await startOnCredits(page, "slots:10,paydelay:100");
    await buyAndPay(page);
    await expect(notice(page)).toHaveAttribute("data-kind", "success");
    await expect(notice(page)).toContainText("Your account now has 15 project slots.");
    await expect(notice(page)).not.toContainText("the maximum");
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);
    await page.getByRole("link", { name: "My projects" }).first().click();
    await expect(page.getByText(/1 of 15 project slots used/)).toBeVisible();
  });

  test("45 → 50: the maximum", async ({ page }) => {
    await resetDemo(page, "slots:45,paydelay:100", "/credits");
    await buyAndPay(page);
    await expect(notice(page)).toContainText("Your account now has 50 project slots — the maximum.");
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);
  });

  test("already 50: credits only, nothing about slots", async ({ page }) => {
    await startOnCredits(page, "slots:50,paydelay:100");
    await buyAndPay(page);
    await expect(notice(page)).toHaveAttribute("data-kind", "success");
    await expect(notice(page)).not.toContainText("project slot");
    await expectNoA11yViolations(page);
    await page.getByRole("link", { name: "My projects" }).first().click();
    await expect(page.getByText(/1 of 50 project slots used/)).toBeVisible();
  });

  test("a declined payment leaves the limit", async ({ page }) => {
    await startOnCredits(page, "slots:10,payment:declined,paydelay:100");
    await buyAndPay(page);
    await expect(notice(page)).toHaveAttribute("data-kind", "declined");
    await page.getByRole("link", { name: "My projects" }).first().click();
    await expect(page.getByText(/1 of 10 project slots used/)).toBeVisible();
  });

  test("RU: 10 → 15 («15 мест»)", async ({ page }) => {
    const lang: Lang = "ru";
    await resetDemo(page, "slots:10,paydelay:100", "/credits", lang);
    await buyAndPay(page);
    await expect(notice(page)).toContainText("Теперь в вашем аккаунте 15 мест для проектов.");
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);
  });

  test("two tabs: a purchase in one updates the limit in the other without a reload (FR-004)", async ({ page: a }) => {
    await startOnCredits(a, "slots:10,paydelay:100");
    const b = await a.context().newPage();
    await b.goto("/projects");
    await expect(b.getByText(/1 of 10 project slots used/)).toBeVisible();
    const c = await a.context().newPage();
    await c.goto("/credits");
    await expect(c.getByTestId("credits-slots")).toContainText("10 project slots");

    await buyAndPay(a);
    await expect(notice(a)).toContainText("15 project slots");
    await expect(b.getByText(/1 of 15 project slots used/)).toBeVisible();
    await expect(c.getByTestId("credits-slots")).toContainText("15 project slots");
    await b.close();
    await c.close();
  });
});

test.describe("US2 — all slots used: buy to get more", () => {
  test("New dub (10 of 10): Buy credits → notice → pay → Back to New dub → a video can be chosen", async ({ page }) => {
    await resetDemo(page, "slots:10,slots:full,paydelay:100");
    await expect(noSlot(page)).toHaveAttribute("data-offer", "more");
    await expect(noSlot(page)).toContainText("All 10 project slots are used. Any credit pack adds 5 more");
    await expect(page.getByRole("button", { name: "Open My projects" })).toBeVisible();
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);

    await page.getByRole("button", { name: "Buy credits" }).click();
    await expect(page).toHaveURL(/\/credits\?from=slots&back=new$/);
    await expect(notice(page)).toHaveAttribute("data-kind", "slots");
    await expect(notice(page)).toContainText("Buy a pack to get 15 project slots");
    await expect(page.getByTestId("credits-slots")).toHaveCount(0); // the notice already says it
    await expect(page.getByRole("radio", { name: /1,000/ })).toBeChecked(); // Best value
    await expectNoA11yViolations(page);

    await page.getByRole("button", { name: /^Buy 1,000 credits/ }).click();
    await page.getByTestId("checkout-pay").click();
    await expect(notice(page)).toContainText("15 project slots");
    await page.getByRole("button", { name: "Back to New dub" }).click();
    await expect(page).toHaveURL(/\/new$/);
    await expect(page.getByTestId("new-dub")).toHaveAttribute("data-state", "empty");
    await uploadScene(page);
    await expect(page.getByTestId("new-dub")).toHaveAttribute("data-state", "ready", { timeout: 20_000 });
  });

  test("My projects (10 of 10): the same path ends on My projects with no alert", async ({ page }) => {
    await resetDemo(page, "slots:10,slots:full,paydelay:100", "/projects");
    await expect(page.getByTestId("projects-slots-full")).toHaveAttribute("data-offer", "more");
    await expectNoA11yViolations(page);
    await page.getByRole("button", { name: "Buy credits" }).click();
    await expect(page).toHaveURL(/\/credits\?from=slots&back=projects$/);
    await expect(notice(page)).toHaveAttribute("data-kind", "slots");
    await page.getByRole("button", { name: /^Buy 1,000 credits/ }).click();
    await page.getByTestId("checkout-pay").click();
    await expect(notice(page)).toContainText("15 project slots");
    await page.getByRole("button", { name: "Back to My projects" }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByText(/10 of 15 project slots used/)).toBeVisible();
    await expect(page.getByTestId("projects-slots-full")).toHaveCount(0);
  });

  test("at 50: delete only, no Buy credits, and from=slots shows no slots notice", async ({ page }) => {
    await resetDemo(page, "slots:50,slots:full");
    await expect(noSlot(page)).toHaveAttribute("data-offer", "max");
    await expect(noSlot(page)).toContainText("the maximum");
    await expect(page.getByRole("button", { name: "Buy credits" })).toHaveCount(0);
    await expectNoA11yViolations(page);
    await page.goto("/projects");
    await expect(page.getByTestId("projects-slots-full")).toHaveAttribute("data-offer", "max");
    await expect(page.getByRole("button", { name: "Buy credits" })).toHaveCount(0);
    await expectNoA11yViolations(page);
    await page.goto("/credits?from=slots&back=new");
    await expect(page.getByTestId("credits-buy")).toBeVisible();
    await expect(notice(page)).toHaveCount(0);
  });

  test("free account: the first-purchase notice is unchanged", async ({ page }) => {
    await resetDemo(page, "slots:full");
    await expect(noSlot(page)).toHaveAttribute("data-offer", "first");
    await expect(noSlot(page)).toContainText("after your first purchase you get 10 slots");
    await page.getByRole("button", { name: "Buy credits" }).click();
    await expect(notice(page)).toContainText("Buy your first pack to get 10 project slots");
    await expectNoA11yViolations(page);
  });
});

test.describe("US3 — know what a purchase adds", () => {
  test("slots line: free, 20, hidden at 50 and while the slots notice shows", async ({ page }) => {
    await resetDemo(page, "", "/credits");
    await expect(page.getByTestId("credits-slots")).toHaveText("Free account: 2 project slots. Your first purchase gives 10.");
    await expectNoA11yViolations(page);
    await resetDemo(page, "slots:20", "/credits");
    await expect(page.getByTestId("credits-slots")).toContainText("20 project slots · the next purchase adds 5, up to 50");
    await expectNoA11yViolations(page);
    await resetDemo(page, "slots:50", "/credits");
    await expect(page.getByTestId("credits-buy")).toBeVisible();
    await expect(page.getByTestId("credits-slots")).toHaveCount(0);
    await resetDemo(page, "slots:20", "/credits?from=slots&back=new");
    await expect(notice(page)).toHaveAttribute("data-kind", "slots");
    await expect(page.getByTestId("credits-slots")).toHaveCount(0);
  });

  test("RU: «20 мест для проектов»", async ({ page }) => {
    await resetDemo(page, "slots:20", "/credits", "ru");
    await expect(page.getByTestId("credits-slots")).toContainText("20 мест для проектов");
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);
  });
});
