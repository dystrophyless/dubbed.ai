import { expect, test, type Page } from "@playwright/test";
import { noHorizontalScroll, recordCurrentTurn, resetDemo } from "./support/flow";
import { fitsViewport, openScreen } from "./support/screens";
import { sceneVariant } from "./support/media-fixtures";

async function layoutState(page: Page, kind: "last-take" | "pending") {
  await page.evaluate(async (kind) => {
    const db = await new Promise<IDBDatabase>((resolve) => { const r = indexedDB.open("dubbed-mock"); r.onsuccess = () => resolve(r.result); });
    const tx = db.transaction(["projects", "takes", "results"], "readwrite");
    if (kind === "last-take") {
      const r = tx.objectStore("takes").get(["layout", 1]);
      r.onsuccess = () => tx.objectStore("takes").put({ ...r.result, n: 40 });
    } else {
      const r = tx.objectStore("projects").get("layout");
      r.onsuccess = () => tx.objectStore("projects").put({ ...r.result, pendingVersion: 2 });
      tx.objectStore("results").put({ projectId: "layout", number: 2, state: "assembling", progress: 0, takes: {},
        format: null, fileName: null, rerecorded: [40], attempts: 0, startedAt: Date.now(), blob: null, mime: null, failing: true });
    }
    await new Promise<void>((resolve) => { tx.oncomplete = () => resolve(); }); db.close();
  }, kind);
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
        // The 40-turn fixture's real window is 325ms: snapshot layout synchronously on its recording DOM transition.
        const recordingFit = page.evaluate(() => new Promise<boolean>((resolve) => {
          const row = document.querySelector('[data-testid="studio-actions"]')!;
          const observer = new MutationObserver(() => {
            if (row.getAttribute("data-state") !== "recording") return;
            const fits = [...row.querySelectorAll("button")].every((el) => {
              const r = el.getBoundingClientRect();
              return r.x >= 0 && r.y >= 0 && r.right <= innerWidth && r.bottom <= innerHeight && el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight;
            });
            observer.disconnect(); resolve(fits);
          });
          observer.observe(row, { attributes: true, subtree: true });
        }));
        await primary.click();
        expect(await recordingFit).toBe(true);
        await expect(page.getByTestId("studio-actions")).toHaveAttribute("data-state", "saved");
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
