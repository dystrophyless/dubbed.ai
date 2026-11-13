import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { projectId, type ProjectId } from "../contracts";
import { createMockServices } from "./index";
import * as db from "./db";

/* The mock adapter's money and lifecycle rules over fake IndexedDB (SC-003, SC-004). Media paths need a browser: e2e. */

const T0 = new Date("2026-11-04T10:00:00Z").getTime();

async function seedDraft(id: string, seconds: number) {
  await db.write(["projects", "videos"], (s) => {
    s.projects.put({
      id,
      name: "Scene",
      video: { durationMs: seconds * 1000, width: 1280, height: 544, fileName: "scene.mp4", mime: "video/mp4" },
      section: { startMs: 0, endMs: seconds * 1000 },
      state: "draft",
      run: null,
      failedAtStep: null,
      charged: 0,
      reserved: 0,
      notify: false,
      currentVersion: null,
      pendingVersion: null,
      turnsTotal: 0,
      createdAt: T0,
      changedAt: T0,
    });
    s.videos.put({ projectId: id, blob: new Blob(["x"], { type: "video/mp4" }) });
  });
  return projectId(id);
}

const at = (ms: number) => vi.setSystemTime(T0 + ms);

describe("mock adapter", () => {
  let services = createMockServices();
  let id: ProjectId;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    at(0);
    services = createMockServices();
    await services.demo!.reset();
    id = await seedDraft("p1", 13);
  });
  afterEach(() => vi.useRealTimers());

  it.each(["notify", "rename"] as const)("%s merges with a polling failure without restoring refundable credits", async (field) => {
    await services.demo!.set({ outcome: "failed@2" });
    await services.projects.start(id);
    at(9_000);
    const write = db.write;
    const spy = vi.spyOn(db, "write");
    let intercepted = false;
    spy.mockImplementation(async (stores, fn) => {
      if (!intercepted && stores.length === 1 && stores[0] === "projects") {
        intercepted = true;
        await services.projects.get(id); // poll wins between the old read and the write transaction
      }
      return write(stores, fn);
    });
    try {
      if (field === "notify") await services.projects.setNotify(id, true);
      else await services.projects.rename(id, "Renamed");
    } finally {
      spy.mockRestore();
    }
    expect(await services.projects.get(id)).toMatchObject({ state: "failed", reserved: 0, ...(field === "notify" ? { notify: true } : { name: "Renamed" }) });
    expect(await services.account.get()).toMatchObject({ balance: 120, reserved: 0 });
  });

  it("setSection checks the latest state inside its write transaction", async () => {
    const write = db.write;
    const spy = vi.spyOn(db, "write");
    let intercepted = false;
    spy.mockImplementation(async (stores, fn) => {
      if (!intercepted && stores.length === 1 && stores[0] === "projects") {
        intercepted = true;
        await services.projects.start(id);
      }
      return write(stores, fn);
    });
    try {
      expect(await services.projects.setSection(id, { startMs: 0, endMs: 1000 })).toEqual({ ok: false, error: "state" });
    } finally {
      spy.mockRestore();
    }
    expect(await services.account.get()).toMatchObject({ balance: 107, reserved: 13 });
  });

  it("reserves on start, prepares through steps 1–3 and settles on ready", async () => {
    const started = await services.projects.start(id);
    expect(started.ok).toBe(true);
    expect(await services.account.get()).toMatchObject({ balance: 107, reserved: 13, slotsUsed: 1 });
    expect((await services.projects.get(id))?.state).toBe("queued");
    at(3_000);
    expect(await services.projects.get(id)).toMatchObject({ state: "preparing", step: 1 });
    at(9_000);
    const step2 = await services.projects.get(id);
    expect(step2).toMatchObject({ state: "preparing", step: 2 });
    expect(step2!.turnsFound).toBeGreaterThan(0);
    at(16_000);
    expect(await services.projects.get(id)).toMatchObject({ state: "recording", charged: 13, turnsTotal: 3 });
    expect(await services.account.get()).toMatchObject({ balance: 107, reserved: 0 });
    expect(await services.studio.turns(id)).toHaveLength(3);
  });

  it("applies the demo turn window when preparation completes", async () => {
    await services.demo!.set({ turns: 1, turnMs: 30_000 });
    await services.projects.start(id);
    at(16_000);
    await services.projects.get(id);
    expect(await services.studio.turns(id)).toMatchObject([{ startMs: 0, windowMs: 13_000 }]);
  });

  it("refuses to start without enough credits", async () => {
    await services.demo!.set({ balance: 5 });
    expect(await services.projects.start(id)).toEqual({ ok: false, error: "credits" });
  });

  it("refunds a failure at once and resumes from the failed step", async () => {
    await services.demo!.set({ outcome: "failed@2" });
    await services.projects.start(id);
    at(9_000);
    expect(await services.projects.get(id)).toMatchObject({ state: "failed", failedAtStep: 2, reserved: 0, charged: 0 });
    expect(await services.account.get()).toMatchObject({ balance: 120, reserved: 0 });
    at(10_000);
    expect((await services.projects.retry(id)).ok).toBe(true);
    expect(await services.account.get()).toMatchObject({ balance: 107, reserved: 13 });
    at(10_100);
    expect(await services.projects.get(id)).toMatchObject({ state: "preparing", step: 2 });
    at(20_000);
    expect((await services.projects.get(id))?.state).toBe("recording");
  });

  it("cancels for free while queued and charges the quote during step 2", async () => {
    await services.projects.start(id);
    at(500);
    expect(await services.projects.cancelQuote(id)).toMatchObject({ stepsDone: 0, charge: 0 });
    await services.projects.cancel(id);
    expect(await services.account.get()).toMatchObject({ balance: 120, reserved: 0, slotsUsed: 0 });

    const id2 = await seedDraft("p2", 94);
    await services.projects.start(id2);
    at(8_000); // step 2 → 1 step done
    const quote = await services.projects.cancelQuote(id2);
    expect(quote).toMatchObject({ stepsDone: 1, charge: 24, refund: 70 });
    await services.projects.cancel(id2);
    expect(await services.account.get()).toMatchObject({ balance: 96, reserved: 0, slotsUsed: 0 });
    expect(await services.projects.get(id2)).toBeNull();
  });

  it("settles the charge when no dialogue is found", async () => {
    await services.demo!.set({ outcome: "no-dialogue" });
    await services.projects.start(id);
    at(20_000);
    expect(await services.projects.get(id)).toMatchObject({ state: "no_dialogue", charged: 13 });
    expect(await services.account.get()).toMatchObject({ balance: 107, reserved: 0 });
  });

  it.each([1000, 1500, 1999, 2000])("settles a %i ms section according to its actual turn count", async (durationMs) => {
    await services.projects.setSection(id, { startMs: 1000, endMs: 1000 + durationMs });
    await services.projects.start(id);
    at(20_000);
    const short = durationMs < 2000;
    expect(await services.projects.get(id)).toMatchObject({ state: short ? "no_dialogue" : "recording", turnsTotal: short ? 0 : 1, charged: Math.ceil(durationMs / 1000), reserved: 0 });
    expect(await services.studio.turns(id)).toHaveLength(short ? 0 : 1);
    expect(await services.account.get()).toMatchObject({ balance: 120 - Math.ceil(durationMs / 1000), reserved: 0 });
  });

  it("finishes a short section as no dialogue after retrying a failure", async () => {
    await services.projects.setSection(id, { startMs: 0, endMs: 1500 });
    await services.demo!.set({ outcome: "failed@2" });
    await services.projects.start(id);
    at(9000);
    expect((await services.projects.get(id))?.state).toBe("failed");
    await services.projects.retry(id);
    at(20_000);
    expect(await services.projects.get(id)).toMatchObject({ state: "no_dialogue", charged: 2, reserved: 0, turnsTotal: 0 });
    expect(await services.account.get()).toMatchObject({ balance: 118, reserved: 0 });
  });

  describe("new versions (US3)", () => {
    const lease = (pid: ProjectId) => ({ projectId: pid, release: async () => undefined });

    /** A finished project: version 1 ready and current, three turns each with a take already in version 1. */
    async function seedDone() {
      await db.write(["projects", "turns", "takes", "results"], async (s) => {
        const p = (await db.req(s.projects.get("p1"))) as Record<string, unknown>;
        s.projects.put({ ...p, state: "done", currentVersion: 1, pendingVersion: null, turnsTotal: 3 });
        for (let n = 1; n <= 3; n += 1) {
          s.turns.put({ projectId: "p1", n, startMs: (n - 1) * 4000, windowMs: 3000, text: { en: `Line ${n}`, ru: `Реплика ${n}` }, originalPeaks: [] });
          s.takes.put({ projectId: "p1", n, mime: "audio/webm", peaks: [0.1], durationMs: 2000, savedAt: T0, inVersion: 1, audio: new Blob(["a"]) });
        }
        s.results.put({
          projectId: "p1", number: 1, state: "ready", progress: 1, takes: { 1: T0, 2: T0, 3: T0 }, format: "webm", fileName: "Scene.webm", rerecorded: [],
          attempts: 0, startedAt: T0, blob: new Blob(["v1"]), mime: "video/webm", failing: false,
        });
      });
    }
    /** A new take on turn n made after version 1 was built: "not built yet". */
    const newTake = (n: number) =>
      db.write(["takes"], (s) => s.takes.put({ projectId: "p1", n, mime: "audio/webm", peaks: [0.2], durationMs: 2000, savedAt: T0 + 1, inVersion: null, audio: new Blob(["b"]) }));

    beforeEach(seedDone);

    it.each(["buildResult", "buildNewVersion", "switchTo", "retry"] as const)("%s preserves a concurrent project edit", async (action) => {
      const request = vi.fn(async (_name: string, _opts: unknown, callback: (lock: null) => Promise<void>) => callback(null));
      vi.stubGlobal("navigator", { locks: { request } });
      await newTake(3);
      await db.write(["projects", "results"], async (s) => {
        const p = (await db.req(s.projects.get(id))) as Record<string, unknown>;
        if (action === "buildResult" || action === "retry") s.projects.put({ ...p, state: action === "retry" ? "assembly_failed" : "recording", currentVersion: null });
        if (action === "retry") {
          const v = (await db.req(s.results.get([id, 1]))) as Record<string, unknown>;
          s.results.put({ ...v, state: "failed" });
        }
        if (action === "switchTo") {
          s.projects.put({ ...p, pendingVersion: 2 });
          s.results.put({ projectId: id, number: 2, state: "ready" });
        }
      });
      const write = db.write;
      const spy = vi.spyOn(db, "write");
      let intercepted = false;
      spy.mockImplementation(async (stores, fn) => {
        if (!intercepted && stores.includes("projects")) {
          intercepted = true;
          await write(["projects"], async (s) => {
            const p = (await db.req(s.projects.get(id))) as Record<string, unknown>;
            s.projects.put({ ...p, notify: true, name: "Concurrent name" });
          });
        }
        return write(stores, fn);
      });
      try {
        if (action === "buildResult") expect((await services.studio.buildResult(id)).ok).toBe(true);
        if (action === "buildNewVersion") expect((await services.studio.buildNewVersion(id)).ok).toBe(true);
        if (action === "switchTo") await services.result.switchTo(id, 2);
        if (action === "retry") await services.result.retry(id, 1);
        expect(await db.get("projects", id)).toMatchObject({ notify: true, name: "Concurrent name" });
        if (action !== "switchTo") await vi.waitFor(() => expect(request).toHaveBeenCalled());
      } finally {
        spy.mockRestore();
        vi.unstubAllGlobals();
      }
    });

    it("refuses a new version without a new take", async () => {
      expect(await services.studio.buildNewVersion(id)).toEqual({ ok: false, error: "nothing-new" });
    });

    it("builds version 2 from the new takes only: current stays, one pending, takes marked, no money moves", async () => {
      await newTake(3);
      const before = await services.account.get();
      const built = await services.studio.buildNewVersion(id);
      expect(built.ok && built.value).toMatchObject({ number: 2, state: "assembling", rerecorded: [3] });
      expect(await services.projects.get(id)).toMatchObject({ state: "done", currentVersion: 1, pendingVersion: 2 });
      const takes = await services.studio.takes(id);
      expect(takes.find((t) => t.n === 3)?.inVersion).toBe(2);
      expect(takes.filter((t) => t.n !== 3).every((t) => t.inVersion === 1)).toBe(true);
      expect(await services.account.get()).toMatchObject({ balance: before.balance, reserved: before.reserved });
    });

    it("blocks a second build and every recording while a version assembles", async () => {
      await newTake(2);
      await db.write(["results", "projects"], async (s) => {
        const p = (await db.req(s.projects.get("p1"))) as Record<string, unknown>;
        s.projects.put({ ...p, pendingVersion: 2 });
        s.results.put({ projectId: "p1", number: 2, state: "assembling", progress: 0.3, takes: {}, format: "webm", fileName: null, rerecorded: [3], attempts: 0, startedAt: T0, blob: null, mime: null, failing: false });
      });
      expect(await services.studio.buildNewVersion(id)).toEqual({ ok: false, error: "assembling" });
      const outcome = await services.studio.record(lease(id), 3, { windowMs: 1000, signal: new AbortController().signal, onStarted: () => undefined, onProgress: () => undefined });
      expect(outcome).toEqual({ ok: false, error: "assembling" });
    });

    it("a failed new version keeps the current one, and a later build replaces the failed pending one", async () => {
      await services.demo!.set({ assemblyFails: true, speed: 1000 });
      await newTake(3);
      await services.studio.buildNewVersion(id);
      await vi.waitFor(async () => expect((await services.result.get(id)).pending?.state).toBe("failed"), { timeout: 3000 });
      expect(await services.projects.get(id)).toMatchObject({ state: "done", currentVersion: 1, pendingVersion: 2 });
      expect((await services.result.get(id)).current).toMatchObject({ number: 1, state: "ready" });
      await services.result.switchTo(id, 2); // not ready: nothing changes
      expect(await services.projects.get(id)).toMatchObject({ currentVersion: 1, pendingVersion: 2 });

      await newTake(1);
      const again = await services.studio.buildNewVersion(id);
      expect(again.ok && again.value).toMatchObject({ number: 3, rerecorded: [1, 3] });
      expect(await services.projects.get(id)).toMatchObject({ currentVersion: 1, pendingVersion: 3 });
      await vi.waitFor(async () => expect((await services.result.get(id)).pending?.state).toBe("failed"), { timeout: 3000 });
    });

    it("switching makes the pending version current and deletes the old one", async () => {
      await db.write(["results", "projects"], async (s) => {
        const p = (await db.req(s.projects.get("p1"))) as Record<string, unknown>;
        s.projects.put({ ...p, pendingVersion: 2 });
        s.results.put({ projectId: "p1", number: 2, state: "ready", progress: 1, takes: {}, format: "webm", fileName: "Scene.webm", rerecorded: [3], attempts: 0, startedAt: T0, blob: new Blob(["v2"]), mime: "video/webm", failing: false });
      });
      await services.result.switchTo(id, 2);
      expect(await services.projects.get(id)).toMatchObject({ currentVersion: 2, pendingVersion: null });
      const { current, pending } = await services.result.get(id);
      expect(current?.number).toBe(2);
      expect(pending).toBeNull();
      expect(await db.get("results", ["p1", 1])).toBeUndefined();
    });
  });

  it("frees the slot on delete and keeps state across a new adapter (reload)", async () => {
    await services.projects.start(id);
    at(16_000);
    const reloaded = createMockServices();
    expect((await reloaded.projects.get(id))?.state).toBe("recording");
    await reloaded.projects.remove(id);
    expect(await reloaded.account.get()).toMatchObject({ slotsUsed: 0 });
  });
});
