import { expect, type Page } from "@playwright/test";
import path from "node:path";

/* Helpers for the recording-flow e2e (feature 001). The services run in the browser on mocks (?demo= presets). */

export type Lang = "en" | "ru";

const SCENE = path.join(process.cwd(), "public", "media", "scene.mp4");

/**
 * Opens `route` with `?demo=reset,<preset>` — a clean mock backend (balance 120, 2 slots, no projects) — in `lang`.
 * `preset` is any other demo parameters, e.g. "speed:4", "balance:40", "outcome:failed@2".
 */
export async function resetDemo(page: Page, preset = "", route = "/new", lang: Lang = "en") {
  await page.addInitScript((l) => {
    if (!localStorage.getItem("dubbed.language")) localStorage.setItem("dubbed.language", l);
  }, lang);
  const demo = ["reset", ...preset.split(",").filter(Boolean)].join(",");
  await page.goto(`${route}${route.includes("?") ? "&" : "?"}demo=${demo}`);
}

/** Chooses the 13 s demo clip in the New dub dropzone (the real file input, as a user's picker would). */
export async function uploadScene(page: Page) {
  await page.locator('input[type="file"]').first().setInputFiles(SCENE);
}

/** Call before the first navigation: the browser refuses the microphone, as when the user clicked "Block". */
export async function blockMicrophone(page: Page) {
  await page.context().clearPermissions();
  await page.addInitScript(() => {
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("Permission denied", "NotAllowedError"));
    }
  });
}

/** No horizontal scroll, measured against the viewport (never the document width). */
export async function noHorizontalScroll(page: Page) {
  const viewport = page.viewportSize()!.width;
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(viewport);
}

/** The balance shown in the top bar (the credits link). */
export const balanceLink = (page: Page) => page.locator('a[href="/credits"]').first();

/** Presses Record in the studio and waits until the take is saved (the window ends by itself). */
export async function recordCurrentTurn(page: Page) {
  await page.locator('button[aria-keyshortcuts="R"]').click();
  await expect(page.getByTestId("studio-actions")).toHaveAttribute("data-state", /recording|saving/);
  await expect(page.getByTestId("studio-actions")).toHaveAttribute("data-state", "saved", { timeout: 15_000 });
}

/* ---------- seeding My projects (feature 001, US5) ---------- */

export type SeedKind = "draft" | "queued" | "preparing" | "recording" | "assembling" | "done" | "done-new-version" | "no-dialogue" | "failed";

const SEED_STATE: Record<SeedKind, { state: string; run?: "queued" | "preparing"; turnsTotal?: number; pendingVersion?: number; currentVersion?: number }> = {
  draft: { state: "draft" },
  queued: { state: "preparing", run: "queued" },
  preparing: { state: "preparing", run: "preparing" },
  recording: { state: "recording", turnsTotal: 12 },
  assembling: { state: "assembling", turnsTotal: 6 },
  done: { state: "done", turnsTotal: 6, currentVersion: 1 },
  "done-new-version": { state: "done", turnsTotal: 6, currentVersion: 1, pendingVersion: 2 },
  "no-dialogue": { state: "no_dialogue" },
  failed: { state: "failed" },
};

/**
 * Puts one project per entry straight into the mock's IndexedDB (database `dubbed-mock`, opened by the app first), then
 * reloads. Ids are `seed-<kind>`, names `<kind> seed`. A running run is very slow (speed 0.05) so the state holds: "preparing"
 * is inside step 2 (1 of 3 steps done), "queued" is still in the queue. Call after `resetDemo(page, "slots:10", "/projects")`.
 */
export async function seedProjects(page: Page, kinds: SeedKind[]) {
  await page.evaluate(
    async ({ kinds, table }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open("dubbed-mock");
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const now = Date.now();
      const blob = await (await fetch("/media/scene.mp4")).blob(); // Processing needs the source video to render
      const tx = db.transaction(["projects", "results", "videos"], "readwrite");
      kinds.forEach((kind, i) => {
        const def = table[kind]!;
        const changedAt = now - (i + 1) * 120_000;
        const running = def.run !== undefined;
        tx.objectStore("projects").put({
          id: `seed-${kind}`,
          name: `${kind} seed`,
          video: { durationMs: 13_000, width: 1280, height: 544, fileName: "scene.mp4", mime: "video/mp4" },
          section: { startMs: 0, endMs: 13_000 },
          state: def.state,
          run: running
            ? { startedAt: def.run === "queued" ? now : now - 90_000, fromStep: 1, queued: def.run === "queued", outcome: "ready", speed: 0.05 }
            : null,
          failedAtStep: kind === "failed" ? 2 : null,
          charged: running ? 0 : 13,
          reserved: running ? 13 : 0,
          notify: false,
          currentVersion: def.currentVersion ?? null,
          pendingVersion: def.pendingVersion ?? null,
          turnsTotal: def.turnsTotal ?? 0,
          createdAt: changedAt,
          changedAt,
        });
        tx.objectStore("videos").put({ projectId: `seed-${kind}`, blob });
        if (def.pendingVersion || kind === "assembling") {
          tx.objectStore("results").put({
            projectId: `seed-${kind}`, number: def.pendingVersion ?? 1, state: "assembling", progress: 0.3, takes: {}, format: null,
            fileName: null, rerecorded: [], attempts: 0, startedAt: now, blob: null, mime: null, failing: false,
          });
        }
      });
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    },
    { kinds, table: SEED_STATE },
  );
  await page.reload();
}
