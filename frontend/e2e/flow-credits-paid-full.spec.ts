import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./support/a11y";
import { noHorizontalScroll, resetDemo } from "./support/flow";

/*
 * Feature 002 — a paid account (10 slots) with every slot used is not offered a purchase (it adds no slots; more slots is
 * feature 003): no "Buy credits", the line says to delete a project. Free accounts keep today's behaviour (flow-credits-us3).
 */
test.describe("paid account, all 10 slots used", () => {
  test("New dub: no Buy credits, Open My projects stays, the delete line shows", async ({ page }) => {
    await resetDemo(page, "slots:10,slots:full");
    const box = page.getByTestId("new-dub-no-slot");
    await expect(page.getByTestId("new-dub")).toHaveAttribute("data-state", "no-slot");
    await expect(box).toContainText("Delete a project to free a slot");
    await expect(page.getByRole("button", { name: "Open My projects" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Buy credits" })).toHaveCount(0);
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);
  });

  test("My projects: slots-full alert has the line and no Buy credits", async ({ page }) => {
    await resetDemo(page, "slots:10,slots:full", "/projects");
    await expect(page.getByText("All project slots are used")).toBeVisible();
    await expect(page.getByText("Delete a project to free a slot")).toBeVisible();
    await expect(page.getByRole("button", { name: "Buy credits" })).toHaveCount(0);
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);
  });

  test("Credits ?from=slots on a paid account: no slots notice", async ({ page }) => {
    await resetDemo(page, "slots:10", "/credits?from=slots");
    await expect(page.getByRole("button", { name: /^Buy / })).toBeVisible();
    await expect(page.getByTestId("credits-notice")).toHaveCount(0);
  });

  test("RU: New dub and My projects", async ({ page }) => {
    await resetDemo(page, "slots:10,slots:full", "/new", "ru");
    await expect(page.getByTestId("new-dub-no-slot")).toContainText("Удалите проект, чтобы освободить место");
    await expect(page.getByRole("button", { name: "Купить кредиты" })).toHaveCount(0);
    await page.goto("/projects");
    await expect(page.getByText("Удалите проект, чтобы освободить место")).toBeVisible();
    await expect(page.getByRole("button", { name: "Купить кредиты" })).toHaveCount(0);
    await expectNoA11yViolations(page);
  });
});
