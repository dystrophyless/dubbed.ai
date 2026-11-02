import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations, trackConsoleErrors } from "./support/a11y";

/* Reference templates (Phase 3): every state renders cleanly on desktop and phone; key interactions work. */
const TEMPLATES: Record<string, readonly string[]> = {
  auth: ["sign-in", "sign-up", "submitting", "error", "verify", "verify-error", "microphone", "microphone-blocked", "reset"],
  projects: ["default", "loading", "empty", "error", "slots-full"],
  settings: ["default", "loading", "saving", "error"],
  credits: ["default", "loading", "empty-history", "error", "purchasing"],
  landing: ["default"],
  status: ["not-found", "error", "offline"],
};

async function expectNoHorizontalScroll(page: Page) {
  const viewport = page.viewportSize()!.width;
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(viewport);
}

for (const [id, states] of Object.entries(TEMPLATES)) {
  for (const state of states) {
    test(`template ${id} · ${state}`, async ({ page }) => {
      const errors = trackConsoleErrors(page);
      await page.goto(`/styleguide/templates/${id}?state=${state}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoHorizontalScroll(page);
      await expectNoA11yViolations(page);
      expect(errors).toEqual([]);
    });
  }
}

test("projects: delete asks first, then removes the card", async ({ page }) => {
  await page.goto("/styleguide/templates/projects");
  const cards = page.getByTestId("project-card");
  await expect(cards).toHaveCount(4);
  await page.getByRole("button", { name: "Actions for Kitchen scene" }).click();
  await page.getByRole("menuitem", { name: "Delete project" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Delete “Kitchen scene”?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Delete project" }).click();
  await expect(cards).toHaveCount(3);
  await expect(page.getByText("Project deleted")).toBeVisible();
});

test("credits: pick a pack, one button names the price, buying adds credits", async ({ page }) => {
  await page.goto("/styleguide/templates/credits");
  await page.getByRole("radio", { name: /300/ }).click();
  await page.getByRole("button", { name: "Buy 300 credits · $3" }).click();
  await expect(page.getByText("300 credits added")).toBeVisible({ timeout: 5_000 });
});

test("auth: the microphone step unlocks Continue once the voice is heard", async ({ page }) => {
  await page.goto("/styleguide/templates/auth?state=microphone");
  const next = page.getByRole("button", { name: "Continue" });
  await expect(next).toBeDisabled();
  await expect(page.getByText("We hear you")).toBeVisible({ timeout: 5_000 });
  await expect(next).toBeEnabled();
});

test("projects: the most recently changed project comes first; sorting by name works", async ({ page }) => {
  await page.goto("/styleguide/templates/projects");
  await expect(page.getByTestId("project-card").first()).toContainText("Rooftop argument");
  await page.getByRole("button", { name: "Recently changed" }).click();
  await page.getByRole("menuitem", { name: "Name A–Z" }).click();
  await expect(page.getByTestId("project-card").first()).toContainText("Kitchen scene");
});

test("settings: the saving state shows the password dialog busy", async ({ page }) => {
  await page.goto("/styleguide/templates/settings?state=saving");
  const dialog = page.getByRole("dialog", { name: "Change password" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Change password" })).toHaveAttribute("aria-busy", "true");
});

test("account menu opens full width with Settings, Credits and Sign out", async ({ page, isMobile }) => {
  test.skip(isMobile, "on phones the account lives in the menu sheet");
  await page.goto("/styleguide/templates/projects");
  await page.getByRole("button", { name: "Account" }).click();
  const panel = page.getByRole("dialog", { name: "Account" });
  for (const item of ["Settings", "Credits", "Sign out"]) await expect(panel.getByRole("menuitem", { name: item })).toBeVisible();
  const box = await panel.boundingBox();
  expect(box!.width).toBeGreaterThan(240);
  await panel.getByRole("menuitem", { name: "Settings" }).click();
  await expect(page).toHaveURL(/templates\/settings/);
});
