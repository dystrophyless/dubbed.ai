import { expect, test, type Locator, type Page } from "@playwright/test";
import { expectNoA11yViolations, trackConsoleErrors } from "./support/a11y";
import { noHorizontalScroll, resetDemo, seedProjects, type Lang, type SeedKind } from "./support/flow";

/*
 * Feature 001, US5 — My projects: every lifecycle state shows its tag and opens the right page (ui-spec S5 table),
 * Rename / Delete (a Queued / Preparing row opens the cancel dialog with the live charge), a freed slot shows in the header,
 * empty / slots-full states, sort. Mock services; rows are seeded straight into the mock database (support/flow.ts).
 * Desktop 1440 x 900 and phone 390 x 844 (EN) + one RU run on desktop. The load-error state has no trigger on the mock
 * services (the list cannot fail there); it is covered by the prototype state `error` of the approved view.
 */
test.describe.configure({ timeout: 120_000 });

const ALL: SeedKind[] = ["draft", "queued", "preparing", "recording", "assembling", "done", "done-new-version", "no-dialogue", "failed"];

const COPY: Record<Lang, { tag: Record<SeedKind, string>; newVersion: string; slots: (used: number, total: number) => string; step: string }> = {
  en: {
    tag: {
      draft: "Not started", queued: "Waiting to start", preparing: "Preparing", recording: "Recording", assembling: "Assembling your video", done: "Ready",
      "done-new-version": "Ready", "no-dialogue": "No dialogue found", failed: "Something went wrong",
    },
    newVersion: "Assembling a new version",
    slots: (used, total) => `${used} of ${total} project slots used`,
    step: "step 2 of 3",
  },
  ru: {
    tag: {
      draft: "Не начат", queued: "Ждёт запуска", preparing: "Подготовка", recording: "Запись", assembling: "Собираем ваше видео", done: "Готово",
      "done-new-version": "Готово", "no-dialogue": "Диалог не найден", failed: "Что-то пошло не так",
    },
    newVersion: "Собираем новую версию",
    slots: (used, total) => `Занято мест для проектов: ${used} из ${total}`,
    step: "этап 2 из 3",
  },
};

/** Where each row opens (the S5 table). The seeded recording project has no takes, so its first turn without one is 1. */
const HREF: Record<SeedKind, string> = {
  draft: "/new",
  queued: "/projects/seed-queued/processing",
  preparing: "/projects/seed-preparing/processing",
  recording: "/projects/seed-recording/turns/1",
  assembling: "/projects/seed-assembling/result",
  done: "/projects/seed-done/result",
  "done-new-version": "/projects/seed-done-new-version/result",
  "no-dialogue": "/projects/seed-no-dialogue/processing",
  failed: "/projects/seed-failed/processing",
};

const card = (page: Page, kind: SeedKind) => page.getByTestId("project-card").filter({ hasText: `${kind} seed` });
const linkOf = (row: Locator) => row.locator("xpath=self::a | .//a[@href]").first();

async function openSeeded(page: Page, kinds: SeedKind[], lang: Lang = "en", preset = "slots:10") {
  await resetDemo(page, preset, "/projects", lang);
  await expect(page.getByTestId("projects-empty-new")).toBeVisible(); // empty first: the database exists and the page is ready
  await seedProjects(page, kinds);
  await expect(page.getByTestId("project-card")).toHaveCount(kinds.length);
}

test.describe("US5 - My projects", () => {
  for (const lang of ["en", "ru"] as const) {
    test(`every state shows its tag and opens the right page (${lang.toUpperCase()})`, async ({ page }, info) => {
      test.skip(lang === "ru" && info.project.name !== "desktop", "one RU run, on desktop");
      const errors = trackConsoleErrors(page);
      const c = COPY[lang];
      await openSeeded(page, ALL, lang);
      await expect(page.getByText(c.slots(ALL.length, 10))).toBeVisible();

      for (const kind of ALL) {
        const row = card(page, kind);
        await expect(row.getByTestId("project-state")).toHaveText(c.tag[kind]);
        if (kind === "done-new-version") await expect(row.getByTestId("project-new-version")).toHaveText(c.newVersion);
        else await expect(row.getByTestId("project-new-version")).toHaveCount(0);
        await expect(linkOf(row)).toHaveAttribute("href", HREF[kind]);
      }
      await expect(card(page, "preparing")).toContainText(c.step);

      await noHorizontalScroll(page);
      await expectNoA11yViolations(page);

      /* thumbnails: the project's own video (a blob URL from the services) at its section start; failed rows show the icon */
      const thumb = card(page, "done").locator("video");
      await expect(thumb).toHaveAttribute("src", /^blob:.*#t=0\.00$/);
      await expect(card(page, "failed").locator("video")).toHaveCount(0);

      /* rows really open: the draft continues on New dub, a queued project opens Processing, a failed one too */
      await card(page, "draft").click();
      await expect(page).toHaveURL(/\/new$/);
      await page.goBack();
      await expect(page.getByTestId("project-card")).toHaveCount(ALL.length);
      await card(page, "queued").click();
      await expect(page).toHaveURL(/\/projects\/seed-queued\/processing$/);
      await expect(page.getByTestId("processing")).toBeVisible();
      await page.goBack();
      await card(page, "failed").click();
      await expect(page).toHaveURL(/\/projects\/seed-failed\/processing$/);
      await expect(page.getByTestId("processing")).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test("sort menu orders by recency and by name", async ({ page }) => {
    await openSeeded(page, ["draft", "failed", "done"]);
    const names = () => page.getByTestId("project-card").evaluateAll((els) => els.map((e) => e.textContent?.split(" seed")[0]));
    expect(await names()).toEqual(["draft", "failed", "done"]); // recently changed first (seeded newest = first)
    await page.getByRole("button", { name: "Recently changed" }).click();
    await page.getByRole("menuitem", { name: "Name A–Z" }).click();
    expect(await names()).toEqual(["done", "draft", "failed"]);
  });

  test("rename keeps the row and shows a toast; delete frees a slot", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await openSeeded(page, ["done", "failed"], "en", "slots:2");
    await expect(page.getByText("2 of 2 project slots used")).toBeVisible();
    await expect(page.getByText("All project slots are used")).toBeVisible(); // slots-full alert

    await page.getByRole("button", { name: "Actions for failed seed" }).click();
    await page.getByRole("menuitem", { name: "Rename" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Project name").fill("Harbour take");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Project renamed")).toBeVisible();
    await expect(page.getByTestId("project-card").filter({ hasText: "Harbour take" })).toHaveCount(1);

    await expectNoA11yViolations(page);
    await page.getByRole("button", { name: "Actions for Harbour take" }).click();
    await page.getByRole("menuitem", { name: "Delete project" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete project" }).click();
    await expect(page.getByText("Project deleted")).toBeVisible();
    await expect(page.getByTestId("project-card")).toHaveCount(1);
    await expect(page.getByText("1 of 2 project slots used")).toBeVisible();
    await expect(page.getByText("All project slots are used")).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("deleting a preparing project opens the cancel dialog with the charge; a queued one is free", async ({ page }) => {
    await openSeeded(page, ["queued", "preparing"]);

    /* queued: nothing charged */
    await page.getByRole("button", { name: "Actions for queued seed" }).click();
    await page.getByRole("menuitem", { name: "Delete project" }).click();
    const dialog = page.getByTestId("projects-cancel-dialog");
    await expect(dialog).toContainText(/hasn.t started yet, so nothing is charged/);
    await dialog.getByRole("button", { name: "Keep preparing" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId("project-card")).toHaveCount(2);

    /* preparing, 1 of 3 steps done: the live quote charges the step-1 share */
    await page.getByRole("button", { name: "Actions for preparing seed" }).click();
    await page.getByRole("menuitem", { name: "Delete project" }).click();
    await expect(dialog).toContainText(/1 of 3 steps? is done/);
    await expect(dialog).toContainText(/credits? will be charged/);
    await expectNoA11yViolations(page);
    await dialog.getByRole("button", { name: "Cancel preparing" }).click();
    await expect(page.getByText("Preparing cancelled")).toBeVisible();
    await expect(page.getByTestId("project-card")).toHaveCount(1);
    await expect(page.getByText("1 of 10 project slots used")).toBeVisible();
  });

  test("empty state offers New dub; slots-full offers Buy credits", async ({ page }) => {
    await resetDemo(page, "slots:10", "/projects");
    await expect(page.getByText("No projects yet")).toBeVisible();
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);
    await page.getByTestId("projects-empty-new").click();
    await expect(page).toHaveURL(/\/new$/);

    await resetDemo(page, "slots:full", "/projects");
    await expect(page.getByText("All project slots are used")).toBeVisible();
    await page.getByRole("button", { name: "Buy credits" }).click();
    await expect(page).toHaveURL(/\/credits$/);
  });
});
