import { expect, test, type Page } from "@playwright/test";
import { readDemoCode, submitSignUp, typeCode } from "./support/auth";
import { gotoGuest, noHorizontalScroll, recordCurrentTurn, resetDemo } from "./support/flow";
import { fitsViewport, openScreen } from "./support/screens";
import { sceneVariant } from "./support/media-fixtures";

async function layoutState(page: Page, kind: "last-take" | "pending") {
  await page.evaluate(async (kind) => {
    const db = await new Promise<IDBDatabase>((resolve) => { const r = indexedDB.open("dubbed-mock"); r.onsuccess = () => resolve(r.result); });
    const tx = db.transaction(["projects", "takes", "results"], "readwrite");
    if (kind === "last-take") {
      // every turn recorded (a first recording can only reach turn 40 that way): copy the turn-1 take to 2…40
      const r = tx.objectStore("takes").get(["layout", 1]);
      r.onsuccess = () => { for (let n = 2; n <= 40; n++) tx.objectStore("takes").put({ ...r.result, n }); };
    } else {
      const r = tx.objectStore("projects").get("layout");
      r.onsuccess = () => tx.objectStore("projects").put({ ...r.result, pendingVersion: 2 });
      tx.objectStore("results").put({ projectId: "layout", number: 2, state: "assembling", progress: 0, takes: {},
        format: null, fileName: null, rerecorded: [40], attempts: 0, startedAt: Date.now(), blob: null, mime: null, failing: true });
    }
    await new Promise<void>((resolve) => { tx.oncomplete = () => resolve(); }); db.close();
  }, kind);
}

for (const lang of ["en", "ru"] as const) {
  test(`credits · ${lang} · balance and Buy fit 390×844`, async ({ page }) => {
    await resetDemo(page, "", "/credits", lang);
    await expect(page.locator("html")).toHaveAttribute("lang", lang);
    await fitsViewport(page, page.getByTestId("credits-balance"));
    await fitsViewport(page, page.getByTestId("credits-buy"));
    await noHorizontalScroll(page);
  });
}

for (const lang of ["en", "ru"] as const) {
  test(`checkout · ${lang} · the whole panel and Pay fit 390×844`, async ({ page }) => {
    await resetDemo(page, "", "/credits", lang);
    await page.getByTestId("credits-buy").click();
    await expect(page).toHaveURL(/\/checkout\/[^/]+$/);
    await expect(page.getByTestId("checkout-page")).toHaveAttribute("data-state", "default");
    await fitsViewport(page, page.locator("main > div").first());
    await fitsViewport(page, page.getByTestId("checkout-pay"));
    await fitsViewport(page, page.getByRole("button", { name: lang === "en" ? "Back to Dubbed" : "Назад в Dubbed" }));
    await noHorizontalScroll(page);
  });
}

// Mobile checks reachable long-label substates, not a second desktop upload→record→render chain.
for (const lang of ["en", "ru"] as const) {
  for (const screen of ["projects", "new", "processing", "studio", "result"] as const) {
    test(`${screen} · ${lang} · primary action and long copy fit 390×844`, async ({ page }) => {
      test.setTimeout(60_000);
      if (screen === "new") {
        await resetDemo(page, "", "/new", lang);
        await fitsViewport(page, page.getByRole("button", { name: lang === "en" ? "Choose a video" : "Выбрать видео", exact: true }));
      }
      await openScreen(page, screen, lang);
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
      await noHorizontalScroll(page);
      const primary = screen === "projects" ? page.locator('main a[href="/projects/layout/result"]')
        : screen === "new" ? page.getByTestId("cost-button")
        : screen === "processing" ? page.getByTestId("processing-cancel")
        : screen === "studio" ? page.locator('button[aria-keyshortcuts="R"]')
        : page.getByTestId("result-download");
      await fitsViewport(page, primary.first());

      if (screen === "new") {
        await resetDemo(page, "", "/new", lang);
        await page.locator('input[type="file"]').first().setInputFiles(sceneVariant("portrait"));
        await expect(page.getByTestId("new-dub")).toHaveAttribute("data-state", "ready", { timeout: 20_000 });
        const stage = page.getByTestId("new-dub-stage").locator("figure");
        const box = (await stage.boundingBox())!;
        expect(Math.abs(box.width / box.height - 960 / 408)).toBeLessThan(0.02);
        const video = stage.locator("video");
        // Upload/probe readiness does not mean the newly mounted preview has loaded its own metadata yet.
        await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.videoWidth > 0 && v.videoWidth < v.videoHeight)).toBe(true);
        expect(await video.evaluate((v) => getComputedStyle(v).objectFit)).toBe("contain");
        expect(await video.evaluate((v) => getComputedStyle(v).objectPosition)).toBe("50% 50%");
        await page.goto("/new?demo=balance:0");
        await expect(primary).toBeDisabled();
        await fitsViewport(page, primary);
        await fitsViewport(page, page.getByRole("button", { name: lang === "en" ? "Buy credits" : "Купить кредиты", exact: true }));
      }

      if (screen === "processing") {
        await page.clock.setFixedTime(Date.now() + 150_000); // actual timestamp run: step 2, finished-step refund quote
        await expect(page.getByTestId("processing")).toHaveAttribute("data-phase", "running");
        await fitsViewport(page, primary);
        await primary.click();
        await fitsViewport(page, page.getByTestId("processing-cancel-dialog"));
        await noHorizontalScroll(page);
      }

      if (screen === "studio") {
        await expect(page.getByTestId("turn-dots").locator("[data-s]")).toHaveCount(40);
        await fitsViewport(page, page.getByTestId("turn-dots"));
        // The 40-turn fixture's real window is 325ms; the helper snapshots the recording layout on transition.
        expect(await recordCurrentTurn(page)).toBe(true);
        await fitsViewport(page, primary);
        await fitsViewport(page, page.getByTestId("studio-next"));
        await layoutState(page, "last-take");
        await page.goto("/projects/layout/turns/40");
        await fitsViewport(page, page.getByTestId("studio-next")); // longest normal Build result label

        await page.evaluate(() => { navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("Denied", "NotAllowedError")); });
        await primary.click();
        const notice = page.getByTestId("mic-blocked");
        await expect(notice).toBeVisible();
        const actions = (await page.getByTestId("studio-actions").boundingBox())!;
        const warning = (await notice.boundingBox())!;
        expect(warning.y >= actions.y + actions.height || warning.y + warning.height <= actions.y).toBe(true);
        await fitsViewport(page, notice.getByRole("button"));
        await fitsViewport(page, page.locator('button[aria-describedby="studio-mic-reason"]'));

        await openScreen(page, "result", lang); // coherent saved takes + cached playable v1, no render setup
        await page.goto("/projects/layout/turns/40?mode=rerecord");
        await recordCurrentTurn(page);
        await fitsViewport(page, page.getByTestId("studio-build")); // long RU Build new version
        await expect(page.getByTestId("studio-forward")).toHaveCount(0);
      }

      if (screen === "result") {
        await page.getByTestId("result-choose").click();
        await fitsViewport(page, page.getByTestId("result-chooser"));
        await page.keyboard.press("Escape");
        await layoutState(page, "pending");
        await page.reload();
        await expect(page.getByTestId("result")).toHaveAttribute("data-newer", "assembling");
        await fitsViewport(page, page.getByTestId("result-rerecord-reason"));
        await fitsViewport(page, page.getByTestId("result-download"));
      }
      await noHorizontalScroll(page);
    });
  }
}

// Feature 004: S1–S6 at 390×844 — no horizontal scroll, the primary action visible; Sign out through the phone menu sheet.
for (const lang of ["en", "ru"] as const) {
  test(`auth · ${lang} · S1, S2, S5, S6 fit 390×844 with the primary action visible`, async ({ page }) => {
    for (const [route, id, primary] of [
      ["/sign-in", "signin-page", "auth-submit"],
      ["/sign-up", "signup-page", "auth-submit"],
      ["/reset-password", "reset-page", "auth-submit"],
      ["/auth/google", "google-page", "auth-submit"],
    ] as const) {
      await gotoGuest(page, route, lang);
      await expect(page.getByTestId(id)).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
      await fitsViewport(page, page.getByTestId(primary));
      await noHorizontalScroll(page);
    }
  });

  test(`auth · ${lang} · S3 code page and S4 microphone page fit 390×844`, async ({ page }) => {
    await gotoGuest(page, "/sign-up", lang);
    await submitSignUp(page, `mobile-${lang}@dubbed.test`, undefined, lang);
    await expect(page).toHaveURL(/\/sign-up\/verify$/);
    await expect(page.getByTestId("verify-page")).toBeVisible();
    await fitsViewport(page, page.getByTestId("auth-code"));
    await noHorizontalScroll(page);
    await typeCode(page, await readDemoCode(page), lang);
    await expect(page).toHaveURL(/\/sign-up\/microphone$/);
    await expect(page.getByTestId("microphone-page")).toBeVisible();
    await fitsViewport(page, page.getByTestId("mic-finish"));
    await noHorizontalScroll(page);
  });
}

test("auth · Sign out through the phone menu sheet → sign-in (FR-015)", async ({ page }) => {
  await resetDemo(page, "", "/projects");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.getByTestId("signin-page")).toBeVisible();
  await noHorizontalScroll(page);
});

// Feature 003: the slots notices and the Credits slots line at 390×844.
for (const lang of ["en", "ru"] as const) {
  test(`slots · ${lang} · New dub notices (more, max) keep the primary above the fold`, async ({ page }) => {
    await resetDemo(page, "slots:10,slots:full", "/new", lang);
    await expect(page.getByTestId("new-dub-no-slot")).toHaveAttribute("data-offer", "more");
    await fitsViewport(page, page.getByTestId("new-dub-no-slot").getByRole("button").first());
    await noHorizontalScroll(page);
    await resetDemo(page, "slots:50,slots:full", "/new", lang);
    await expect(page.getByTestId("new-dub-no-slot")).toHaveAttribute("data-offer", "max");
    await fitsViewport(page, page.getByTestId("new-dub-no-slot").getByRole("button").first());
    await noHorizontalScroll(page);
  });

  test(`slots · ${lang} · My projects alert (more) and Credits line / success at 50`, async ({ page }) => {
    await resetDemo(page, "slots:10,slots:full", "/projects", lang);
    await expect(page.getByTestId("projects-slots-full")).toHaveAttribute("data-offer", "more");
    await fitsViewport(page, page.getByTestId("projects-slots-full"));
    await noHorizontalScroll(page);
    await resetDemo(page, "slots:20,paydelay:100", "/credits", lang);
    await expect(page.getByTestId("credits-slots")).toBeVisible();
    await fitsViewport(page, page.getByTestId("credits-buy"));
    await noHorizontalScroll(page);
    await resetDemo(page, "slots:45,paydelay:100", "/credits", lang);
    await page.getByTestId("credits-buy").click();
    await page.getByTestId("checkout-pay").click();
    await expect(page.getByTestId("credits-notice")).toHaveAttribute("data-kind", "success");
    await fitsViewport(page, page.getByTestId("credits-notice"));
    await noHorizontalScroll(page);
  });
}
