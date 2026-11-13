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
