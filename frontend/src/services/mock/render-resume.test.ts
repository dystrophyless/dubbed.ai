import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { projectId } from "../contracts";
import { renderMix } from "../media/mixer";
import { createMockServices } from "./index";
import * as db from "./db";

vi.mock("../media/mixer", () => ({ renderMix: vi.fn(), recordableFormat: () => ({ format: "webm" }) }));

const id = projectId("resume");
const output = () => ({ blob: new Blob(["rendered"]), mime: "video/webm", format: "webm" as const });

async function seed(pending: boolean) {
  await db.write(["projects", "results", "videos"], (s) => {
    s.projects.put({
      id, name: "Scene", video: {}, section: { startMs: 0, endMs: 3000 },
      state: pending ? "done" : "assembling", run: null, failedAtStep: null,
      charged: 3, reserved: 0, notify: true, currentVersion: pending ? 1 : null,
      pendingVersion: pending ? 2 : null, turnsTotal: 1, createdAt: 0, changedAt: 0,
    });
    s.videos.put({ projectId: id, blob: new Blob(["source"]) });
    if (pending) s.results.put({ projectId: id, number: 1, state: "ready", blob: new Blob(["old"]) });
    s.results.put({ projectId: id, number: pending ? 2 : 1, state: "assembling", progress: 0, takes: {}, rerecorded: [], attempts: 0, startedAt: 0, blob: null, mime: null, failing: false });
  });
}

describe("list resumes persisted assemblies", () => {
  beforeEach(async () => {
    vi.mocked(renderMix).mockReset();
    vi.stubGlobal("navigator", {});
    await createMockServices().demo!.reset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each([false, true])("resumes a persisted assembly (pending new version: %s) only once and emits readiness", async (pending) => {
    await seed(pending);
    let finish!: (value: ReturnType<typeof output>) => void;
    vi.mocked(renderMix).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const services = createMockServices();
    const events: string[] = [];
    const unsubscribe = services.subscribe((event) => events.push(event.kind));
    try {
      await services.projects.list();
      await vi.waitFor(() => expect(renderMix).toHaveBeenCalledTimes(1));
      await Promise.all([services.projects.list(), services.projects.list()]);
      expect(renderMix).toHaveBeenCalledTimes(1);
      finish(output());
      await vi.waitFor(async () => expect(await db.get("results", [id, pending ? 2 : 1])).toMatchObject({ state: "ready" }));
      expect(events).toContain("result");
      expect(await services.projects.list()).toMatchObject([{ state: "done", pendingAssembling: false, currentVersion: 1, pendingVersion: pending ? 2 : null }]);
      expect(renderMix).toHaveBeenCalledTimes(1);
      if (pending) expect(await db.get("results", [id, 1])).toMatchObject({ state: "ready", blob: new Blob(["old"]) });
    } finally {
      unsubscribe();
    }
  });

  it("retry rebuilds a failed pending version from current takes and updates its metadata before rendering", async () => {
    await seed(true);
    await db.write(["results", "turns", "takes"], async (s) => {
      const v = (await db.req(s.results.get([id, 2]))) as Record<string, unknown>;
      s.results.put({ ...v, state: "failed", takes: { 1: 10, 2: 20, 3: 30 }, rerecorded: [2] });
      for (let n = 1; n <= 3; n++) {
        s.turns.put({ projectId: id, n, startMs: (n - 1) * 1000, windowMs: 1000 });
        s.takes.put({ projectId: id, n, audio: new Blob([`take-${n}`]), savedAt: n === 3 ? 31 : n * 10, inVersion: n === 3 ? null : n === 2 ? 2 : 1 });
      }
    });
    let finish!: (value: ReturnType<typeof output>) => void;
    vi.mocked(renderMix).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const services = createMockServices();
    await services.result.retry(id, 2);
    try {
      await vi.waitFor(() => expect(renderMix).toHaveBeenCalledTimes(1));
      expect(await db.get("results", [id, 2])).toMatchObject({ state: "assembling", takes: { 1: 10, 2: 20, 3: 31 }, rerecorded: [2, 3] });
      expect(await services.studio.take(id, 3)).toMatchObject({ savedAt: 31, inVersion: 2 });
      expect(await services.studio.take(id, 1)).toMatchObject({ inVersion: 1 });
      const inputs = vi.mocked(renderMix).mock.calls[0]![0].turns;
      expect(await Promise.all(inputs.map((turn) => turn.take!.text()))).toEqual(["take-1", "take-2", "take-3"]);
    } finally {
      finish(output());
      await vi.waitFor(async () => expect(await db.get("results", [id, 2])).toMatchObject({ state: "ready" }));
    }
    expect(await db.get("results", [id, 1])).toMatchObject({ state: "ready", blob: new Blob(["old"]) });
    expect(await services.studio.buildNewVersion(id)).toEqual({ ok: false, error: "nothing-new" });
  });

  it("leaves a render locked by another tab alone and resumes once the lock is available", async () => {
    await seed(false);
    let available = false;
    const request = vi.fn(async (_name, _options, callback) => callback(available ? {} : null));
    vi.stubGlobal("navigator", { locks: { request } });
    vi.mocked(renderMix).mockResolvedValue(output());
    const services = createMockServices();
    await services.projects.list();
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    expect(renderMix).not.toHaveBeenCalled();
    expect(await db.get("results", [id, 1])).toMatchObject({ state: "assembling" });
    available = true;
    await services.projects.list();
    await vi.waitFor(async () => expect(await db.get("results", [id, 1])).toMatchObject({ state: "ready" }));
    expect(request).toHaveBeenLastCalledWith(`dubbed:render:${id}:1`, { ifAvailable: true }, expect.any(Function));
    expect(renderMix).toHaveBeenCalledTimes(1);
  });
});
