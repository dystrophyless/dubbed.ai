import { expect, type Page, type Locator } from "@playwright/test";
import { resetDemo, type Lang } from "./flow";

export type Screen = "projects" | "new" | "processing" | "studio" | "result";
export const screenPaths: Record<Screen, string> = {
  projects: "/projects", new: "/new", processing: "/projects/layout/processing",
  studio: "/projects/layout/turns/1", result: "/projects/layout/result",
};

/** Coherent cached media fixture; no repeated upload/capture/render setup for route/layout checks. */
export async function openScreen(page: Page, screen: Screen, lang: Lang = "en", options: { turns?: number; windowMs?: number; name?: string } = {}) {
  const turns = options.turns ?? 40;
  const windowMs = options.windowMs ?? Math.floor(13000 / turns);
  await resetDemo(page, `speed:0.05,turns:${turns}`, "/projects", lang);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.evaluate(async ({ screen, turns, windowMs, name }) => {
    const blob = await (await fetch("/media/scene.mp4")).blob();
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("dubbed-mock"); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
    });
    const now = Date.now();
    const state = screen === "new" ? "draft" : screen === "processing" ? "preparing" : screen === "studio" ? "recording" : "done";
    // A valid mono PCM take per turn keeps the ready fixture internally consistent, including re-record entry.
    const pcm = new ArrayBuffer(44 + Math.round(windowMs * 16) * 2);
    const wav = new DataView(pcm);
    const ascii = (offset: number, text: string) => { for (let i = 0; i < text.length; i++) wav.setUint8(offset + i, text.charCodeAt(i)); };
    ascii(0, "RIFF"); wav.setUint32(4, pcm.byteLength - 8, true); ascii(8, "WAVE"); ascii(12, "fmt ");
    wav.setUint32(16, 16, true); wav.setUint16(20, 1, true); wav.setUint16(22, 1, true);
    wav.setUint32(24, 16000, true); wav.setUint32(28, 32000, true); wav.setUint16(32, 2, true); wav.setUint16(34, 16, true);
    ascii(36, "data"); wav.setUint32(40, pcm.byteLength - 44, true);
    const audio = new Blob([pcm], { type: "audio/wav" });
    const tx = db.transaction(["projects", "videos", "turns", "takes", "results"], "readwrite");
    tx.objectStore("projects").put({
      id: "layout", name, state,
      video: { durationMs: 13000, width: 1280, height: 544, fileName: "scene.mp4", mime: "video/mp4" },
      section: { startMs: 0, endMs: 13000 },
      run: state === "preparing" ? { startedAt: now, fromStep: 1, queued: true, outcome: "ready", speed: 0.05 } : null,
      failedAtStep: null, charged: state === "draft" || state === "preparing" ? 0 : 13,
      reserved: state === "preparing" ? 13 : 0, notify: false,
      currentVersion: state === "done" ? 1 : null, pendingVersion: null,
      turnsTotal: turns, createdAt: now, changedAt: now,
    });
    tx.objectStore("videos").put({ projectId: "layout", blob });
    for (let n = 1; n <= turns; n++) {
      if (state === "done" || state === "recording") tx.objectStore("turns").put({
        projectId: "layout", n, startMs: Math.floor((n - 1) * 13000 / turns), windowMs,
        text: { en: "A short line.", ru: "Короткая реплика." }, originalPeaks: Array(64).fill(0.1),
      });
      if (state === "done") tx.objectStore("takes").put({
        projectId: "layout", n, audio, mime: "audio/wav", peaks: Array(64).fill(0),
        durationMs: windowMs, savedAt: now, inVersion: 1,
      });
    }
    if (state === "done") tx.objectStore("results").put({
      projectId: "layout", number: 1, state: "ready", progress: 1, takes: Object.fromEntries(Array.from({ length: turns }, (_, i) => [i + 1, now])),
      format: "mp4", fileName: "Scene.mp4", rerecorded: [], attempts: 1,
      startedAt: now, blob, mime: "video/mp4", failing: false,
    });
    await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
    db.close();
  }, { screen, turns, windowMs, name: options.name ?? "A scene with a deliberately long project name" });
  await page.goto(screenPaths[screen]);
  await expect(screenRoot(page, screen)).toBeVisible();
}

export function screenRoot(page: Page, screen: Screen) {
  return screen === "projects" ? page.getByRole("heading", { level: 1 }) : page.getByTestId(screen === "new" ? "new-dub" : screen === "studio" ? "studio-actions" : screen);
}

/** Visibility alone is insufficient: the entire control and its text must fit without clipping. */
export async function fitsViewport(page: Page, control: Locator) {
  await expect(control).toBeVisible();
  const box = await control.boundingBox();
  expect(box).not.toBeNull();
  const viewport = page.viewportSize()!;
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
  expect(await control.evaluate((el) => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight)).toBe(true);
}
