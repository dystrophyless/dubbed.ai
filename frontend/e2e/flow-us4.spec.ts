import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations, trackConsoleErrors } from "./support/a11y";
import { noHorizontalScroll, recordCurrentTurn, resetDemo, uploadScene, type Lang } from "./support/flow";
import { openScreen } from "./support/screens";

/*
 * Feature 001, US4 — leave and come back at any point, on mock services. Reload on Processing / in the studio / on the
 * Result; /projects/:id and each page's own guard send the user to where the project is; an unknown id lands on My
 * projects with the D4 toast; a second tab holding the recording lock shows the D2 notice and clears it on release;
 * ReadyWatcher announces a ready project away from its pages. Desktop 1440 x 900 and phone 390 x 844 (EN) + one RU run.
 */
test.describe.configure({ timeout: 240_000 });

const COPY: Record<Lang, { notFound: string }> = {
  en: { notFound: "We couldn’t find that project" },
  ru: { notFound: "Не удалось найти этот проект" },
};

const studio = (page: Page) => page.getByTestId("studio");
const actions = (page: Page) => page.getByTestId("studio-actions");
const projectIdOf = (page: Page) => /\/projects\/([^/]+)\//.exec(page.url())![1]!;
const recordKey = (page: Page) => page.locator('button[aria-keyshortcuts="R"]');

/** Upload, Start; resolves once Processing is open. */
async function startProject(page: Page, preset: string, lang: Lang = "en", shortScene = false) {
  await resetDemo(page, preset, "/new", lang);
  await uploadScene(page);
  await expect(page.getByTestId("new-dub")).toHaveAttribute("data-state", "ready", { timeout: 20_000 });
  if (shortScene) {
    // Keep actual upload/capture/reload-during-render coverage, but render four seconds rather than thirteen.
    await page.getByTestId("range-selector").getByRole("slider").last().focus();
    for (let n = 0; n < 3; n++) await page.keyboard.press("Shift+ArrowLeft"); // clamp to the 1 s minimum
    for (let n = 0; n < 3; n++) await page.keyboard.press("ArrowRight");
    await expect(page.getByTestId("cost-button")).toContainText("4");
  }
  await page.getByTestId("cost-button").click();
  await expect(page).toHaveURL(/\/projects\/[^/]+\/processing$/);
}

async function waitForStudio(page: Page, turn = 1) {
  await expect(page).toHaveURL(new RegExp(`/turns/${turn}$`), { timeout: 40_000 });
  await expect(studio(page)).toBeVisible();
}

async function recordAndNext(page: Page) {
  await recordCurrentTurn(page);
  await page.getByTestId("studio-next").click();
}

test.describe("US4 - reload and come back", () => {
  for (const lang of ["en", "ru"] as const) {
    test(`reload on Processing, in the studio and on the Result keeps the place and the takes (${lang.toUpperCase()})`, async ({ page }, info) => {
      test.skip(lang === "ru" && info.project.name !== "desktop", "one RU run, on desktop");
      const errors = trackConsoleErrors(page);
      await startProject(page, "speed:3,turns:2,turnms:700", lang, true);

      /* Processing: a reload shows the same run, which then opens the studio */
      await page.reload();
      await expect(page).toHaveURL(/\/processing$/);
      await expect(page.getByTestId("processing")).toBeVisible();
      await noHorizontalScroll(page);
      await expectNoA11yViolations(page);
      await waitForStudio(page, 1);

      /* studio turn 2 with a take on turn 1: reload stays on turn 2, turn 1 keeps its take */
      await recordAndNext(page);
      await expect(page).toHaveURL(/\/turns\/2$/);
      await page.reload();
      await expect(page).toHaveURL(/\/turns\/2$/);
      await expect(studio(page)).toBeVisible();
      await expect(actions(page)).toHaveAttribute("data-state", "idle");
      await page.waitForTimeout(800); // the turn dots finish their entrance; axe measures the settled colours
      await expectNoA11yViolations(page);
      await page.getByTestId("studio-prev").click();
      await expect(page).toHaveURL(/\/turns\/1$/);
      await expect(actions(page)).toHaveAttribute("data-state", "saved");
      await page.getByTestId("studio-next").click();
      await expect(page).toHaveURL(/\/turns\/2$/);
      await recordAndNext(page); // turn 2 saved; last turn: "Build the result"

      /* Result: reload keeps the place; the takes are still there */
      await expect(page).toHaveURL(/\/result$/);
      await expect(page.getByTestId("result")).toHaveAttribute("data-phase", /assembling|ready/);
      await page.reload();
      await expect(page).toHaveURL(/\/result$/);
      await expect(page.getByTestId("result")).toHaveAttribute("data-phase", "ready", { timeout: 60_000 });
      await noHorizontalScroll(page);
      await expectNoA11yViolations(page);
      const id = projectIdOf(page);
      await page.goto(`/projects/${id}/turns/2?mode=rerecord`);
      await expect(actions(page)).toHaveAttribute("data-state", "saved");
      await page.goto(`/projects/${id}/turns/1?mode=rerecord`);
      await expect(actions(page)).toHaveAttribute("data-state", "saved");
      expect(errors).toEqual([]);
    });
  }

  test("/projects/:id and each page's guard send the user to where the project is", async ({ page }) => {
    await startProject(page, "speed:3,turns:2,turnms:700", "en", true);
    const id = projectIdOf(page);
    const goes = async (from: string, to: RegExp) => {
      await page.goto(from);
      await expect(page).toHaveURL(to, { timeout: 40_000 });
    };

    /* preparing: Processing, from the redirect and from the studio / result routes */
    await goes(`/projects/${id}`, /\/processing$/);
    await goes(`/projects/${id}/turns/1`, /\/processing$/);
    await goes(`/projects/${id}/result`, /\/processing$/);

    /* recording: the first turn without a take */
    await waitForStudio(page, 1);
    await goes(`/projects/${id}/processing`, /\/turns\/1$/);
    await goes(`/projects/${id}/result`, /\/turns\/1$/);
    await goes(`/projects/${id}`, /\/turns\/1$/);
    await expect(studio(page)).toBeVisible();
    await recordCurrentTurn(page);
    await goes(`/projects/${id}`, /\/turns\/2$/);
    await goes(`/projects/${id}/result`, /\/turns\/2$/);
    await goes(`/projects/${id}/processing`, /\/turns\/2$/);

    /* done: the Result */
    await expect(studio(page)).toBeVisible();
    await recordCurrentTurn(page);
    await page.getByTestId("studio-next").click();
    await expect(page).toHaveURL(/\/result$/);
    await expect(page.getByTestId("result")).toHaveAttribute("data-phase", "ready", { timeout: 60_000 });
    await goes(`/projects/${id}`, /\/result$/);
    await goes(`/projects/${id}/turns/1`, /\/result$/);
    await goes(`/projects/${id}/processing`, /\/result$/);
  });

  test("Leave without saving discards a running take on return", async ({ page }) => {
    await openScreen(page, "studio");
    await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve) => { const r = indexedDB.open("dubbed-mock"); r.onsuccess = () => resolve(r.result); });
      const tx = db.transaction(["projects", "turns"], "readwrite");
      const p = tx.objectStore("projects").get("layout");
      p.onsuccess = () => tx.objectStore("projects").put({ ...p.result, turnsTotal: 1 });
      const turn = tx.objectStore("turns").get(["layout", 1]);
      turn.onsuccess = () => { tx.objectStore("turns").clear(); tx.objectStore("turns").put({ ...turn.result, windowMs: 10_000 }); };
      await new Promise<void>((resolve) => { tx.oncomplete = () => resolve(); }); db.close();
    });
    await page.reload();
    await recordKey(page).click();
    await expect(actions(page)).toHaveAttribute("data-state", "recording");
    await page.getByTestId("studio-exit").click();
    await page.getByTestId("leave-dialog").getByRole("button", { name: "Leave without saving" }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await page.goto("/projects/layout/turns/1");
    await expect(actions(page)).toHaveAttribute("data-state", "idle");
    await expect(page.getByTestId("studio-next")).toHaveCount(0);
  });

  test("language switch updates the real shell and survives reload", async ({ page }) => {
    await resetDemo(page, "", "/projects");
    await page.getByRole("radio", { name: "Russian", exact: true }).check();
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Мои проекты");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Мои проекты");
    await page.getByRole("radio", { name: /English|Английский/, exact: true }).check();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("My projects");
  });

  test("an unknown project opens My projects with the D4 toast, once", async ({ page }) => {
    await resetDemo(page, "", "/projects/no-such-project");
    await expect(page).toHaveURL(/\/projects$/);
    const toaster = page.getByTestId("toaster");
    await expect(toaster).toContainText(COPY.en.notFound);
    await expect(toaster).toContainText("It may have been deleted. Here are your projects.");
    await page.waitForTimeout(600); // the toast fades in; axe measures the settled colours
    await expectNoA11yViolations(page);
    await page.reload();
    await expect(page.getByRole("heading", { name: "My projects" })).toBeVisible();
    await expect(page.getByText(COPY.en.notFound)).toHaveCount(0);
    for (const route of ["processing", "result", "turns/1"]) {
      await page.goto(`/projects/no-such-project/${route}`);
      await expect(page).toHaveURL(/\/projects$/);
      await expect(page.getByTestId("toaster")).toContainText(COPY.en.notFound);
    }
  });

  test("the RU toast", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "one RU run, on desktop");
    await resetDemo(page, "", "/projects/no-such-project", "ru");
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByTestId("toaster")).toContainText(COPY.ru.notFound);
  });
});

test.describe("US4 - one recording tab at a time (D2)", () => {
  test("a second tab sees the notice and a disabled Record; it clears when the first tab stops", async ({ page, context }) => {
    await startProject(page, "speed:8,turns:1,turnms:30000"); // the window is clamped to the clip length
    await waitForStudio(page, 1);
    const url = page.url();

    const second = await context.newPage();
    await second.goto(url);
    await expect(studio(second)).toBeVisible();

    await recordKey(page).click();
    await expect(actions(page)).toHaveAttribute("data-state", "recording");

    // tab 2: Record shows the notice and stays in its place, disabled
    await recordKey(second).click();
    const notice = second.getByTestId("lock-elsewhere");
    await expect(notice).toBeVisible();
    await expect(second.locator('button[aria-describedby="studio-lock-reason"]')).toBeDisabled();
    await second.keyboard.press("r");
    await expect(actions(second)).toHaveAttribute("data-state", "idle");

    // tab 1 stops: the notice clears by itself and Record is enabled again in tab 2
    await expect(actions(page)).toHaveAttribute("data-state", "recording");
    await recordKey(page).click();
    await expect(actions(page)).toHaveAttribute("data-state", "saved", { timeout: 15_000 });
    await expect(notice).toHaveCount(0, { timeout: 10_000 });
    await expect(recordKey(second)).toBeEnabled();
    await second.close();
  });

  test("the D2 notice has no accessibility violations", async ({ page, context }) => {
    await startProject(page, "speed:8,turns:1,turnms:30000");
    await waitForStudio(page, 1);
    const id = projectIdOf(page);
    const url = page.url();
    await page.evaluate((projectId) => new Promise<void>((resolve) => {
      void navigator.locks.request(`dubbed:record:${projectId}`, { mode: "exclusive" }, () => {
        resolve();
        return new Promise<void>(() => {});
      });
    }), id);

    const second = await context.newPage();
    await second.goto(url);
    await expect(studio(second)).toBeVisible();
    await recordKey(second).click();
    const notice = second.getByTestId("lock-elsewhere");
    await expect(notice).toBeVisible();
    await expect(second.getByTestId("mic-blocked")).toHaveCount(0);
    await notice.getByRole("button", { name: "Try again" }).click();
    await expect(notice).toBeVisible();
    await noHorizontalScroll(second);
    await expectNoA11yViolations(second);
    await second.close();
  });

  test("closing the recording tab frees the lock and clears the notice", async ({ page, context }) => {
    await startProject(page, "speed:8,turns:1,turnms:30000"); // the window is clamped to the clip length
    await waitForStudio(page, 1);
    const url = page.url();
    await recordKey(page).click();
    await expect(actions(page)).toHaveAttribute("data-state", "recording");
    const second = await context.newPage();
    await second.goto(url);
    await recordKey(second).click();
    await expect(second.getByTestId("lock-elsewhere")).toBeVisible();
    await expect(actions(page)).toHaveAttribute("data-state", "recording");
    await page.close();
    await expect(second.getByTestId("lock-elsewhere")).toHaveCount(0, { timeout: 10_000 });
  });
});

test.describe("US4 - ready while away (R8)", () => {
  test("denied notification explains recovery; hidden-page readiness waits for manual studio entry", async ({ page }) => {
    test.setTimeout(45_000);
    await page.addInitScript(() => Object.defineProperty(Notification, "permission", { get: () => "denied" }));
    await openScreen(page, "processing");
    const now = Date.now();
    await page.clock.setFixedTime(now);
    await expect(page.getByTestId("processing-notify")).toHaveAttribute("data-state", "denied");
    await expect(page.getByTestId("processing-notify")).toContainText(/allow.*notifications|notifications.*browser/i);
    // Control the browser Page Visibility API, not a prototype query parameter or a frozen ready screen.
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.clock.setFixedTime(now + 400_000);
    // A second real client reads the finished server-timestamp run and broadcasts the persisted transition.
    // TanStack intentionally suspends this hidden client's interval; do not fake a service response.
    const observer = await page.context().newPage();
    await observer.clock.setFixedTime(now + 400_000);
    await observer.goto("/projects");
    await expect(observer.getByTestId("project-state")).toHaveText("Recording");
    await expect(page.getByTestId("processing")).toHaveAttribute("data-phase", "ready");
    await observer.close();
    await expect(page.getByTestId("processing-primary")).toHaveText("Open the studio");
    await page.waitForTimeout(1200); // exceed the visible-tab automatic-navigation grace period
    await expect(page).toHaveURL(/\/processing$/);
    await page.evaluate(() => { Reflect.deleteProperty(document, "visibilityState"); document.dispatchEvent(new Event("visibilitychange")); });
    await page.getByTestId("processing-primary").click();
    await expect(page).toHaveURL(/\/turns\/1$/);
  });

  test("Notify me, leave, then a toast offers the studio when preparing is done", async ({ page }) => {
    await page.addInitScript(() => {
      let permission: NotificationPermission = "default";
      (window as Window & { permissionRequests?: number }).permissionRequests = 0;
      Object.defineProperty(Notification, "permission", { get: () => permission });
      Notification.requestPermission = async () => {
        const w = window as Window & { permissionRequests?: number };
        w.permissionRequests = (w.permissionRequests ?? 0) + 1;
        permission = "granted";
        return permission;
      };
    });
    await startProject(page, "speed:4");
    const now = Date.now();
    await page.clock.setFixedTime(now);
    expect(await page.evaluate(() => (window as Window & { permissionRequests?: number }).permissionRequests)).toBe(0);
    await page.getByRole("button", { name: "Notify me when it’s ready" }).click();
    expect(await page.evaluate(() => (window as Window & { permissionRequests?: number }).permissionRequests)).toBe(1);
    await expect(page.getByText("We’ll notify you when it’s ready.")).toBeVisible();
    await page.getByRole("button", { name: "Turn off", exact: true }).click();
    await expect(page.getByTestId("processing-notify")).toHaveAttribute("data-state", "off");
    await page.getByRole("button", { name: "Notify me when it’s ready" }).click();
    await expect(page.getByTestId("processing-notify")).toHaveAttribute("data-state", "on");
    expect(await page.evaluate(() => (window as Window & { permissionRequests?: number }).permissionRequests)).toBe(1);
    await page.goto("/projects");
    // A full navigation resets ReadyWatcher's baseline. Let it observe this still-running project before advancing Date.
    await expect(page.getByTestId("project-state")).toHaveText(/Waiting to start|Preparing/);
    await page.clock.setFixedTime(now + 10_000);
    await expect(page).toHaveURL(/\/projects$/);
    const toaster = page.getByTestId("toaster");
    await expect(toaster).toContainText("is ready", { timeout: 30_000 });
    await page.waitForTimeout(600); // the toast fades in; axe measures the settled colours
    await expectNoA11yViolations(page);
    await toaster.getByRole("button", { name: "Open the studio" }).click();
    await expect(page).toHaveURL(/\/turns\/1$/);
  });
});
