import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./support/a11y";
import { balanceLink, noHorizontalScroll, resetDemo, uploadScene } from "./support/flow";
import { holdStore } from "./support/persistence";
import { sceneVariant } from "./support/media-fixtures";
import { openScreen } from "./support/screens";

/*
 * Feature 001, US2 — honest states around money and slots, on mock services (?demo= presets):
 * no free slot, refused files, too few credits, cancelling (free while queued, a quoted charge during step 2), a failed
 * preparation (refunded, Try again resumes), no dialogue (charged, Try another video in the same slot).
 */
test.describe.configure({ timeout: 120_000 });

const newDub = (page: Page) => page.getByTestId("new-dub");
const processing = (page: Page) => page.getByTestId("processing");
const start = (page: Page) => page.getByTestId("cost-button");
const CHARGE = /(\d+) credits? will be charged/;

async function uploadAndWaitReady(page: Page) {
  await uploadScene(page);
  await expect(newDub(page)).toHaveAttribute("data-state", "ready", { timeout: 20_000 });
}

async function startDubbing(page: Page) {
  await start(page).click();
  await expect(page).toHaveURL(/\/projects\/[^/]+\/processing$/);
  await expect(processing(page)).toBeVisible();
}

test.describe("US2 — New dub tells the truth", () => {
  test("fractional video end keeps a one-second section and reserves exactly its displayed price", async ({ page }) => {
    await openScreen(page, "new");
    await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve) => {
        const request = indexedDB.open("dubbed-mock"); request.onsuccess = () => resolve(request.result);
      });
      const tx = db.transaction("projects", "readwrite");
      const store = tx.objectStore("projects");
      const request = store.get("layout");
      request.onsuccess = () => store.put({ ...request.result, video: { ...request.result.video, durationMs: 13060 }, section: { startMs: 0, endMs: 13060 } });
      await new Promise<void>((resolve) => { tx.oncomplete = () => resolve(); });
      db.close();
    });
    await page.reload();
    await expect(newDub(page)).toHaveAttribute("data-state", "ready");
    // The end handle must not round 13.060 up past the source's end either.
    await page.getByRole("slider", { name: /end/i }).focus();
    await page.keyboard.press("ArrowRight");
    const handle = page.getByRole("slider", { name: /start/i });
    await handle.focus();
    for (let i = 0; i < 15; i++) await page.keyboard.press("ArrowRight");
    await expect(start(page)).toHaveText("Start dubbing · 1 credit");
    await startDubbing(page); // flush before the debounce, then reserve that exact section
    await expect(balanceLink(page)).toContainText("119");
    await expect(processing(page)).toContainText("1 credit in reserve");
  });

  test("Start does not reserve an old section when saving the selected section is rejected", async ({ page }) => {
    await resetDemo(page, "speed:0.1");
    await uploadAndWaitReady(page);
    // Simulate a changed server-side range constraint, without changing the cached view.
    await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve) => {
        const request = indexedDB.open("dubbed-mock"); request.onsuccess = () => resolve(request.result);
      });
      const tx = db.transaction("projects", "readwrite");
      const store = tx.objectStore("projects");
      const request = store.getAll();
      request.onsuccess = () => {
        const draft = request.result[0];
        store.put({ ...draft, video: { ...draft.video, durationMs: 1000 } });
      };
      await new Promise<void>((resolve) => { tx.oncomplete = () => resolve(); });
      db.close();
    });
    await start(page).click();
    await expect(page).toHaveURL(/\/new(?:\?|$)/);
    await expect(start(page)).toBeEnabled();
    await expect(balanceLink(page)).toContainText("120");
  });

  test("no free slot: told before choosing a file", async ({ page }) => {
    await resetDemo(page, "slots:full");
    await expect(newDub(page)).toHaveAttribute("data-state", "no-slot");
    await expect(page.getByTestId("new-dub-no-slot")).toContainText("No free project slot");
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);

    await page.getByRole("button", { name: "Buy credits" }).click();
    await expect(page).toHaveURL(/\/credits$/);
    await page.goBack();
    await expect(newDub(page)).toHaveAttribute("data-state", "no-slot");
    await page.getByRole("button", { name: "Open My projects" }).click();
    await expect(page).toHaveURL(/\/projects$/);
  });

  test("a .txt file is refused before upload and takes no slot", async ({ page }) => {
    await resetDemo(page, "");
    await expect(page.getByText("MP4, MOV or WebM · up to 10 minutes and 250 MB")).toBeVisible();
    await page.locator('input[type="file"]').first().setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
    await expect(newDub(page)).toHaveAttribute("data-state", "error");
    await expect(newDub(page)).toContainText("This file type isn't supported. Use MP4, MOV or WebM.");
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);
    // no slot was taken: a real video still goes through
    await uploadAndWaitReady(page);
    await expect(start(page)).toBeEnabled();
  });

  test("upload cancel returns to empty without a late draft or slot", async ({ page }) => {
    await resetDemo(page, "");
    const now = Date.now();
    await page.clock.setFixedTime(now); // hold a real upload in progress until Cancel
    await uploadScene(page);
    await expect(newDub(page)).toHaveAttribute("data-state", "uploading");
    await expect(page.getByRole("progressbar", { name: "Uploading", exact: true })).toBeVisible();
    await expect(page.getByTestId("new-dub-stage")).toHaveCount(0);
    await page.getByRole("button", { name: "Cancel upload", exact: true }).click();
    await expect(newDub(page)).toHaveAttribute("data-state", "empty");
    await page.clock.setFixedTime(now + 5_000);
    await page.waitForTimeout(200); // the aborted adapter loop wakes every 100 ms
    await page.goto("/projects");
    await expect(page.getByTestId("project-card")).toHaveCount(0);
    await expect(page.getByTestId("projects-empty-new")).toBeVisible();
    await expect(balanceLink(page)).toContainText("120");
  });

  test("a genuinely silent video is refused after upload/check and consumes no slot", async ({ page }) => {
    await page.addInitScript(() => {
      const native = HTMLMediaElement.prototype.addEventListener;
      HTMLMediaElement.prototype.addEventListener = function (type: string, callback: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
        if (type === "loadeddata") {
          native.call(this, type, (event) => window.setTimeout(() => {
            if (typeof callback === "function") callback.call(this, event);
            else callback?.handleEvent(event);
          }, 750), options); // hold the real probe callback long enough to inspect Checking, not a fake outcome
        } else native.call(this, type, callback, options);
      };
    });
    await resetDemo(page, "");
    await page.locator('input[type="file"]').first().setInputFiles(sceneVariant("silent"));
    await expect(newDub(page)).toHaveAttribute("data-state", "checking");
    await expect(page.getByRole("progressbar", { name: "Checking the video", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel upload", exact: true })).toBeEnabled();
    await expect(page.getByTestId("range-selector")).toHaveCount(0);
    await expect(newDub(page)).toHaveAttribute("data-state", "error");
    await expect(newDub(page)).toContainText(/no audio|no sound|sound track/i);
    await page.goto("/projects");
    await expect(page.getByTestId("project-card")).toHaveCount(0);
    await expect(balanceLink(page)).toContainText("120");
  });

  test("same-sized portrait replacement refreshes the checked draft preview", async ({ page }) => {
    await openScreen(page, "new");
    await page.getByTestId("new-dub-replace-input").setInputFiles(sceneVariant("portrait"));
    await expect(newDub(page)).toHaveAttribute("data-state", "ready", { timeout: 20_000 });
    await expect.poll(() => page.getByTestId("new-dub-stage").locator("video").evaluate((v: HTMLVideoElement) => v.videoWidth > 0 && v.videoWidth < v.videoHeight)).toBe(true);
  });

  test("a checked long clip defaults to the real 120 second selector limit", async ({ page }) => {
    await resetDemo(page, "");
    await page.locator('input[type="file"]').first().setInputFiles(sceneVariant("long"));
    await expect(newDub(page)).toHaveAttribute("data-state", "ready", { timeout: 20_000 });
    await expect(page.getByTestId("range-limit")).toHaveText("That's the limit — 120 s");
    await expect(start(page)).toHaveText("Start dubbing · 120 credits");
    expect(await page.locator("video").first().evaluate((v: HTMLVideoElement) => v.duration)).toBeGreaterThan(120);
  });

  test("too few credits: Start disabled with the shortfall; coming back from Buy credits restores video and section", async ({ page }) => {
    await resetDemo(page, "balance:10");
    await uploadAndWaitReady(page);
    await expect(start(page)).toBeDisabled();
    await expect(start(page)).toHaveText("Start dubbing · 14 credits");
    await expect(page.getByText("4 more credits needed")).toBeVisible();
    await expect(balanceLink(page)).toContainText("10");
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);

    // change the section (still too long for 10 credits), then leave and come back
    const before = await page.getByTestId("range-value").innerText();
    await page.getByRole("slider", { name: /end/i }).focus();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    const changed = await page.getByTestId("range-value").innerText();
    expect(changed).not.toBe(before);
    await page.waitForTimeout(600); // the section is saved shortly after the change

    await page.getByRole("button", { name: "Buy credits" }).click();
    await expect(page).toHaveURL(/\/credits$/);
    await page.goBack();
    await expect(newDub(page)).toHaveAttribute("data-state", "ready", { timeout: 15_000 });
    await expect(page.getByTestId("new-dub-card")).toContainText("Scene");
    await expect(page.getByTestId("range-value")).toHaveText(changed);
    await expect(start(page)).toBeDisabled();
  });

  test("Replace video reuses the draft; a refused replacement keeps nothing half-done", async ({ page }) => {
    await resetDemo(page, "");
    await uploadAndWaitReady(page);
    await page.getByTestId("new-dub-replace-input").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("x") });
    await expect(newDub(page)).toHaveAttribute("data-state", "error");
    await uploadAndWaitReady(page);
    await page.getByTestId("new-dub-replace-input").setInputFiles(`${process.cwd()}/public/media/scene.mp4`);
    await expect(newDub(page)).toHaveAttribute("data-state", /uploading|checking|ready/);
    await expect(newDub(page)).toHaveAttribute("data-state", "ready", { timeout: 20_000 });
    await page.goto("/projects");
    await expect(page.getByText("Scene")).toHaveCount(1); // one draft, one slot
  });
});

test.describe("US2 — Processing money states", () => {
  test("cancel while queued is free", async ({ page }) => {
    await resetDemo(page, "speed:0.1");
    await uploadAndWaitReady(page);
    // Hold the queue while the dialog's accessibility check runs, even on a loaded machine.
    await page.clock.setFixedTime(Date.now());
    await startDubbing(page);
    await expect(balanceLink(page)).toContainText("106");
    await expect(processing(page)).toContainText("14 credits in reserve — charged when it’s ready");
    await expect(processing(page)).not.toContainText(/\d+ (seconds?|minutes?) left/);
    await page.getByTestId("processing-cancel").click();
    const dialog = page.getByTestId("processing-cancel-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("nothing is charged");
    await expect(dialog).toContainText("All 14 credits go back to your balance.");
    await expectNoA11yViolations(page);
    await expect(processing(page)).toHaveAttribute("data-phase", "queued");
    await expect(dialog).toContainText("nothing is charged");
    await dialog.getByRole("button", { name: "Cancel preparing" }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByText("Preparing cancelled")).toBeVisible();
    await expect(balanceLink(page)).toContainText("120");
    await page.goto("/new");
    await expect(newDub(page)).toHaveAttribute("data-state", "empty"); // the project is gone, the slot is free
  });

  test("cancel dialog says it is calculating until this opening's quote is here, and Cancel preparing waits for it", async ({ page }) => {
    await resetDemo(page, "speed:0.1");
    await uploadAndWaitReady(page);
    await page.clock.setFixedTime(Date.now());
    await startDubbing(page);
    const dialog = page.getByTestId("processing-cancel-dialog");
    const confirm = dialog.getByRole("button", { name: "Cancel preparing" });

    // the quote cannot be read yet: no invented "all credits go back", and nothing to confirm
    let release = await holdStore(page, "projects");
    await page.getByTestId("processing-cancel").click();
    await expect(dialog).toContainText("Calculating the cost…");
    await expect(dialog).not.toContainText("go back");
    await expect(confirm).toBeDisabled();
    await release();
    await expect(dialog).toContainText("All 14 credits go back to your balance.");
    await expect(confirm).toBeEnabled();

    // a quote cached from this opening is not fresh for the next one
    await dialog.getByRole("button", { name: "Keep preparing" }).click();
    await expect(dialog).toBeHidden();
    release = await holdStore(page, "projects");
    await page.getByTestId("processing-cancel").click();
    await expect(dialog).toContainText("Calculating the cost…");
    await expect(confirm).toBeDisabled();
    await release();
    await expect(confirm).toBeEnabled();
  });

  test("preparation finishing behind the open cancel dialog closes it with a notice; the project stays and nothing is refunded", async ({ page }) => {
    await resetDemo(page, "");
    await uploadAndWaitReady(page);
    const startedAt = Date.now();
    await page.clock.setFixedTime(startedAt);
    await startDubbing(page);
    await page.clock.setFixedTime(startedAt + 7_000);
    await expect(processing(page)).toHaveAttribute("data-phase", "running", { timeout: 20_000 });
    await page.getByTestId("processing-cancel").click();
    const dialog = page.getByTestId("processing-cancel-dialog");
    await expect(dialog).toContainText(/\d of 3 steps? (is|are) done/);

    await page.clock.setFixedTime(startedAt + 600_000); // preparation finishes while the dialog is open
    await expect(page.getByText("Preparation has already finished — the project is ready.")).toBeVisible();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Preparing cancelled")).toHaveCount(0);
    await page.goto("/projects");
    await expect(page.getByTestId("project-card")).toHaveCount(1);
    await expect(page.getByTestId("project-state")).not.toHaveText("Preparing");
    await expect(balanceLink(page)).toContainText("106"); // the 14 credits stay charged
  });

  test("cancel during step 2 charges the quoted amount", async ({ page }) => {
    await resetDemo(page, "");
    await uploadAndWaitReady(page);
    // Freeze only Date, not timers: query polling stays live, but a click cannot race a later billing step.
    const startedAt = Date.now();
    await page.clock.setFixedTime(startedAt);
    await startDubbing(page);
    await page.clock.setFixedTime(startedAt + 7_000); // queue + step 1 complete; step 2 running
    await expect(processing(page)).toHaveAttribute("data-phase", "running", { timeout: 20_000 });
    await expect(page.getByTestId("processing-found")).not.toBeEmpty({ timeout: 20_000 }); // step 2 has begun
    await page.getByTestId("processing-cancel").click();
    const dialog = page.getByTestId("processing-cancel-dialog");
    await expect(dialog).toContainText(/\d of 3 steps? (is|are) done/);
    expect(Number(CHARGE.exec(await dialog.innerText())?.[1])).toBeGreaterThan(0);
    await expectNoA11yViolations(page);
    const firstQuote = Number(CHARGE.exec(await dialog.innerText())?.[1]);
    await expect(dialog).toContainText("1 of 3 steps is done");
    await expect(dialog).toContainText(`${14 - firstQuote} credits go back`);

    // Keep this exact dialog open while the next step completes behind it.
    await page.clock.setFixedTime(startedAt + 12_000);
    await expect(dialog).toContainText("2 of 3 steps are done");
    await expect.poll(async () => Number(CHARGE.exec(await dialog.innerText())?.[1])).toBeGreaterThan(firstQuote);
    const shown = Number(CHARGE.exec(await dialog.innerText())?.[1]);
    await expect(dialog).toContainText(`${14 - shown} credits go back`);
    await dialog.getByRole("button", { name: "Cancel preparing" }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByText("Preparing cancelled")).toBeVisible();
    const balance = Number((await balanceLink(page).innerText()).match(/\d+/)![0]);
    expect(120 - balance).toBe(shown);
    await page.goto("/new");
    await expect(newDub(page)).toHaveAttribute("data-state", "empty");
  });

  test("failed at step 2: nothing charged, Try again resumes at step 2", async ({ page }) => {
    await resetDemo(page, "speed:3,outcome:failed@2");
    await uploadAndWaitReady(page);
    await startDubbing(page);
    await expect(processing(page)).toHaveAttribute("data-phase", "failed", { timeout: 40_000 });
    await expect(page.getByTestId("processing-failed")).toContainText("Nothing was charged");
    await expect(page.getByTestId("processing-failed")).toContainText("14 credits are back on your balance");
    await expect(balanceLink(page)).toContainText("120");
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);

    await page.getByRole("button", { name: "Try again" }).click();
    await expect(balanceLink(page)).toContainText("106"); // reserved again
    await expect(processing(page)).toHaveAttribute("data-phase", /queued|running/);
    await expect(processing(page)).toContainText("Finding the lines"); // resumes at step 2, not step 1
    await expect(processing(page)).toHaveAttribute("data-phase", "ready", { timeout: 40_000 });
  });

  test("no dialogue: charged; Try another video reuses the same slot", async ({ page }) => {
    await resetDemo(page, "speed:4,outcome:no-dialogue");
    await uploadAndWaitReady(page);
    await startDubbing(page);
    const id = /\/projects\/([^/]+)\/processing/.exec(page.url())![1];
    await expect(processing(page)).toHaveAttribute("data-phase", "no-dialogue", { timeout: 30_000 });
    await expect(page.getByTestId("processing-no-dialogue")).toContainText("No dialogue found");
    await expect(page.getByTestId("processing-no-dialogue")).toContainText("14 credits are charged");
    await expect(balanceLink(page)).toContainText("106");
    await noHorizontalScroll(page);
    await expectNoA11yViolations(page);

    await page.getByRole("button", { name: "Try another video" }).click();
    await expect(page).toHaveURL(/\/new$/);
    await expect(newDub(page)).toHaveAttribute("data-state", "empty");
    await expect(balanceLink(page)).toContainText("106");
    await uploadAndWaitReady(page);
    await startDubbing(page);
    expect(page.url()).toContain(`/projects/${id}/processing`); // the same project, so the same slot
    await expect(balanceLink(page)).toContainText("92");
  });

  test("no dialogue: Delete project frees the slot", async ({ page }) => {
    await resetDemo(page, "speed:4,outcome:no-dialogue");
    await uploadAndWaitReady(page);
    await startDubbing(page);
    await expect(processing(page)).toHaveAttribute("data-phase", "no-dialogue", { timeout: 30_000 });
    await page.getByRole("button", { name: "Delete project" }).click();
    const dialog = page.getByTestId("processing-delete-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("The credits for preparing are not returned.");
    await expectNoA11yViolations(page);
    await dialog.getByRole("button", { name: "Delete project" }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByText("Project deleted")).toBeVisible();
    await expect(balanceLink(page)).toContainText("106"); // charged credits are not returned
  });
});
