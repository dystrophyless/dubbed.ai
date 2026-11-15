import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { projectId } from "../contracts";
import { captureFixedWindow } from "../media/browser-media";
import { createMockServices } from "./index";
import * as db from "./db";

vi.mock("../media/browser-media", async (original) => ({
  ...(await original<typeof import("../media/browser-media")>()),
  captureFixedWindow: vi.fn(),
}));

describe("recording commit races", () => {
  const id = projectId("record-race");
  const services = createMockServices();
  const capture = { blob: new Blob(["new"]), mimeType: "audio/webm", peaks: [0.5], elapsedMs: 1000, endReason: "fixed-window" as const };
  beforeEach(async () => {
    await services.demo!.reset();
    await db.write(["projects", "takes", "turns"], (s) => {
      s.projects.put({ id, name: "Scene", state: "recording", run: null, currentVersion: null, pendingVersion: null, section: { startMs: 0, endMs: 1000 }, turnsTotal: 1, charged: 1, reserved: 0 });
      s.turns.put({ projectId: id, n: 1, startMs: 0, windowMs: 1000 });
      s.takes.put({ projectId: id, n: 1, savedAt: 1, inVersion: 0, audio: new Blob(["old"]) });
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it.each(["assemble", "remove"] as const)("does not save captured audio after another tab performs %s", async (action) => {
    vi.mocked(captureFixedWindow).mockImplementationOnce(async () => {
      const otherTab = createMockServices();
      if (action === "assemble") {
        // Avoid invoking the renderer: model the atomic build's stored state directly.
        await db.write(["projects", "results"], async (s) => {
          const p = await db.req(s.projects.get(id));
          s.projects.put({ ...p, state: "assembling" });
          s.results.put({ projectId: id, number: 1, state: "assembling" });
        });
      } else await otherTab.projects.remove(id);
      return capture;
    });
    expect(await services.studio.record({ projectId: id, async release() {} }, 1, {
      windowMs: 1000, signal: new AbortController().signal, onStarted() {}, onProgress() {},
    })).toEqual({ ok: false, error: action === "assemble" ? "assembling" : "interrupted" });
    expect(await db.getAll("takes")).toMatchObject(action === "assemble" ? [{ savedAt: 1 }] : []);
  });

  it.each(["captured", "transaction"] as const)("discards a stopped take aborted at %s instead of replacing the old take", async (stage) => {
    const controller = new AbortController();
    vi.mocked(captureFixedWindow).mockImplementationOnce(async () => {
      if (stage === "captured") controller.abort();
      return { ...capture, endReason: "stopped" };
    });
    if (stage === "transaction") {
      const req = db.req;
      let reads = 0;
      vi.spyOn(db, "req").mockImplementation(async (request) => {
        const result = await req(request);
        if (++reads === 2) controller.abort(); // after the transaction's project and version reads
        return result;
      });
    }
    expect(await services.studio.record({ projectId: id, async release() {} }, 1, {
      windowMs: 1000, signal: controller.signal, onStarted() {}, onProgress() {},
    })).toEqual({ ok: false, error: "interrupted" });
    expect(await db.getAll("takes")).toMatchObject([{ savedAt: 1 }]);
  });

  it("discards an abort after the take put succeeds but before commit", async () => {
    vi.mocked(captureFixedWindow).mockResolvedValueOnce(capture);
    const controller = new AbortController();
    const put = IDBObjectStore.prototype.put;
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (this: IDBObjectStore, ...args) {
      const request = put.apply(this, args);
      if (this.name === "takes") request.addEventListener("success", () => controller.abort(), { once: true });
      return request;
    });
    expect(await services.studio.record({ projectId: id, async release() {} }, 1, {
      windowMs: 1000, signal: controller.signal, onStarted() {}, onProgress() {},
    })).toEqual({ ok: false, error: "interrupted" });
    expect(await db.getAll("takes")).toMatchObject([{ savedAt: 1 }]);
  });

  it.each(["getAll", "get"] as const)("returns interrupted when preflight %s rejects", async (method) => {
    const spy = vi.spyOn(db, method).mockRejectedValueOnce(new DOMException("read failed", "UnknownError"));
    try {
      expect(await services.studio.record({ projectId: id, async release() {} }, 1, {
        windowMs: 1000, signal: new AbortController().signal, onStarted() {}, onProgress() {},
      })).toEqual({ ok: false, error: "interrupted" });
    } finally { spy.mockRestore(); }
    expect(await db.getAll("takes")).toMatchObject([{ savedAt: 1 }]);
  });

  it("derives the saved take's version marker inside its write transaction", async () => {
    vi.mocked(captureFixedWindow).mockResolvedValueOnce(capture);
    const write = db.write;
    const spy = vi.spyOn(db, "write");
    let intercepted = false;
    spy.mockImplementation(async (stores, fn) => {
      if (!intercepted) {
        intercepted = true;
        await write(["projects"], async (s) => {
          const p = await db.req(s.projects.get(id));
          s.projects.put({ ...p, state: "done", currentVersion: 1 });
        });
      }
      return write(stores, fn);
    });
    const result = await services.studio.record({ projectId: id, async release() {} }, 1, {
      windowMs: 1000, signal: new AbortController().signal, onStarted() {}, onProgress() {},
    });
    expect(result).toMatchObject({ ok: true, value: { inVersion: null } });
  });
});
