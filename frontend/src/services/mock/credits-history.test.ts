import { signInTestDemo } from "./test-auth";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { projectId, type HistoryRow } from "../contracts";
import { balanceFromHistory } from "../rules/credits";
import { createMockServices } from "./index";
import * as db from "./db";

const T0 = new Date("2026-11-15T10:00:00Z").getTime();
const id = projectId("scene");
const draft = {
  id, name: "Scene at Start", video: { durationMs: 73_000, width: 1280, height: 720, fileName: "scene.mp4", mime: "video/mp4" },
  section: { startMs: 0, endMs: 73_000 }, state: "draft", run: null, runId: null, failedAtStep: null,
  charged: 0, reserved: 0, notify: false, currentVersion: null, pendingVersion: null, turnsTotal: 0, createdAt: T0, changedAt: T0,
};
const at = (ms: number) => vi.setSystemTime(T0 + ms);
const rows = () => db.getAll<HistoryRow>("history");
const runs = async () => (await rows()).filter((r) => r.kind === "run");

async function invariant(services: ReturnType<typeof createMockServices>) {
  const account = await services.account.get();
  const history = await rows();
  expect(account.balance).toBe(balanceFromHistory(history));
  const additions = history.filter((r) => r.kind !== "run").reduce((sum, r) => sum + r.amount, 0);
  const charges = history.reduce((sum, r) => sum + (r.kind === "run" ? r.charged : 0), 0);
  expect(account.balance + account.reserved).toBe(additions - charges);
}

describe("atomic per-run credits history", () => {
  let services = createMockServices();
  beforeEach(async () => {
    await signInTestDemo();
    vi.useFakeTimers({ toFake: ["Date"] });
    at(0);
    services = createMockServices();
    await services.demo!.reset();
    await signInTestDemo();
    await db.write(["projects"], (s) => { s.projects.put(draft); });
  });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it.each(["ready", "no-dialogue"] as const)("updates the same row on %s, keeping Start's name after rename and deletion", async (outcome) => {
    await services.demo!.set({ outcome });
    await invariant(services);
    await services.projects.start(id);
    await invariant(services);
    const [started] = await runs();
    expect(started).toMatchObject({ state: "reserved", reserved: 73, amount: -73, at: T0, projectName: draft.name });
    expect(await db.get("projects", id)).toMatchObject({ runId: started.id });
    await services.projects.rename(id, "New name");
    at(20_000);
    await services.projects.get(id);
    await invariant(services);
    expect(await runs()).toEqual([{ ...started, state: "charged", reserved: 0, charged: 73, updatedAt: T0 + 20_000 }]);
    await services.projects.remove(id);
    expect(await runs()).toHaveLength(1);
    expect((await runs())[0].projectName).toBe(draft.name);
    await invariant(services);
  });

  it.each([[500, 0, "returned"], [8000, 19, "partly_charged"]] as const)("cancel at %s updates one retained row", async (time, charge, state) => {
    await services.projects.start(id);
    await invariant(services);
    const [started] = await runs();
    at(time);
    await services.projects.cancel(id);
    expect(await services.projects.get(id)).toBeNull();
    expect(await runs()).toEqual([{ ...started, state, reserved: 0, charged: charge, returned: 73 - charge, amount: 0 - charge, updatedAt: T0 + time }]);
    await invariant(services);
  });

  it("failure refunds one row; Try again creates a distinct row and settles it", async () => {
    await services.demo!.set({ outcome: "failed@2" });
    await services.projects.start(id);
    await invariant(services);
    const [started] = await runs();
    at(9000);
    await services.projects.get(id);
    await invariant(services);
    const [failed] = await runs();
    expect(failed).toEqual({ ...started, state: "failed_returned", reserved: 0, returned: 73, amount: 0, updatedAt: T0 + 9000 });
    await services.projects.retry(id);
    await invariant(services);
    expect(await runs()).toHaveLength(2);
    expect((await runs()).find((r) => r.id === failed.id)).toEqual(failed);
    at(20_000);
    await services.projects.get(id);
    await invariant(services);
    expect((await runs()).map((r) => r.state).sort()).toEqual(["charged", "failed_returned"]);
  });

  it("demo balance presets record only the difference, and reset clears purchases and history atomically", async () => {
    await services.projects.start(id);
    await services.demo!.set({ balance: 5 });
    expect((await rows()).filter((r) => r.kind === "adjustment")).toMatchObject([{ amount: -42 }]);
    await invariant(services);
    await services.demo!.set({ balance: 5 });
    expect((await rows()).filter((r) => r.kind === "adjustment")).toHaveLength(1);
    await services.demo!.set({ balance: 100 });
    await invariant(services);
    await db.write(["purchases"], (s) => { s.purchases.put({ id: "pending" }); });
    await services.demo!.reset();
    await signInTestDemo();
    expect(await rows()).toEqual([db.welcomeRow(T0)]);
    expect(await db.getAll("purchases")).toEqual([]);
    await invariant(services);
  });

  it.each(["ready", "failed@2", "cancel"] as const)("two adapters racing %s move money and history only once", async (outcome) => {
    const other = createMockServices();
    await services.demo!.set({ outcome: outcome === "cancel" ? "ready" : outcome });
    const starts = await Promise.all([services.projects.start(id), other.projects.start(id)]);
    expect(starts.filter((r) => r.ok)).toHaveLength(1);
    expect(await runs()).toHaveLength(1);
    await invariant(services);
    at(outcome === "cancel" ? 8000 : 20_000);
    if (outcome === "cancel") await Promise.all([services.projects.cancel(id), other.projects.cancel(id)]);
    else await Promise.all([services.projects.get(id), other.projects.get(id)]);
    expect(await runs()).toHaveLength(1);
    await invariant(services);
    if (outcome === "failed@2") {
      const retries = await Promise.all([services.projects.retry(id), other.projects.retry(id)]);
      expect(retries.filter((r) => r.ok)).toHaveLength(1);
      expect(await runs()).toHaveLength(2);
      await invariant(services);
    }
  });

  it.each(["start", "ready", "failure", "cancel", "retry", "preset", "reset"] as const)("aborting %s rolls back the row and all money", async (action) => {
    if (["ready", "failure", "cancel", "retry"].includes(action)) {
      await services.demo!.set({ outcome: action === "failure" || action === "retry" ? "failed@2" : "ready" });
      await services.projects.start(id);
      at(action === "cancel" ? 8000 : 20_000);
      if (action === "retry") await services.projects.get(id);
    }
    const previousRows = await rows();
    const previousAccount = await db.get("kv", "account");
    const previousProject = await db.get("projects", id);
    const write = db.write;
    vi.spyOn(db, "write").mockImplementationOnce((stores, fn) => write(stores, async (s) => {
      expect(stores).toContain("history");
      const result = await fn(s);
      s.history.transaction.abort();
      return result;
    }));
    const operation = action === "start" ? services.projects.start(id)
      : action === "retry" ? services.projects.retry(id)
      : action === "cancel" ? services.projects.cancel(id)
      : action === "preset" ? services.demo!.set({ balance: 5 })
      : action === "reset" ? services.demo!.reset() : services.projects.get(id);
    await operation.catch(() => undefined);
    expect(await rows()).toEqual(previousRows);
    expect(await db.get("kv", "account")).toEqual(previousAccount);
    expect(await db.get("projects", id)).toEqual(previousProject);
  });

  it("emits credits alongside project events for each money transition", async () => {
    const events: string[] = [];
    const off = services.subscribe((e) => events.push(e.kind));
    try {
      await services.projects.start(id);
      expect(events).toContain("credits");
      events.length = 0;
      at(20_000);
      await services.projects.get(id);
      expect(events).toContain("credits");
      expect(events).toContain("project");
    } finally { off(); }
  });
});

describe("history database upgrade", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

  it.each([false, true])("seeds a consistent history (existing v1: %s)", async (existing) => {
    const factory = new IDBFactory();
    vi.stubGlobal("indexedDB", factory);
    if (existing) {
      const old = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = factory.open("dubbed-mock", 1);
        request.onupgradeneeded = () => {
          request.result.createObjectStore("kv").put({ balance: 88, slotLimit: 2 }, "account");
          const projects = request.result.createObjectStore("projects", { keyPath: "id" });
          projects.put({ ...draft, id: "ready", state: "recording", charged: 73, createdAt: T0 - 1000 });
          projects.put({ ...draft, id: "failed", state: "failed" });
          projects.put({ ...draft, id: "active", state: "preparing", reserved: 13 });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      old.close();
    }
    vi.resetModules();
    await signInTestDemo();
    const upgraded = await import("./db");
    const history = await upgraded.getAll<HistoryRow>("history");
    expect(balanceFromHistory(history)).toBe(existing ? 88 : 120);
    expect(history.filter((r) => r.kind === "welcome")).toHaveLength(1);
    expect(history.filter((r) => r.kind === "run")).toHaveLength(existing ? 2 : 0);
    expect(history.filter((r) => r.kind === "adjustment")).toHaveLength(existing ? 1 : 0);
    expect(await upgraded.getAll("purchases")).toEqual([]);
    if (existing) {
      expect(history.find((r) => r.kind === "welcome")?.at).toBe(T0 - 1000);
      expect(history).toContainEqual(expect.objectContaining({ kind: "run", projectId: "ready", projectName: draft.name, state: "charged", charged: 73 }));
      expect(history).toContainEqual(expect.objectContaining({ kind: "run", projectId: "active", state: "reserved", reserved: 13 }));
      for (const row of history) if (row.kind === "run") expect(await upgraded.get("projects", row.projectId)).toMatchObject({ runId: row.id });
      expect(88 + 13).toBe(history.filter((r) => r.kind !== "run").reduce((sum, r) => sum + r.amount, 0) - 73);
    } else expect(history).toEqual([expect.objectContaining({ kind: "welcome", amount: 120 })]);
  });
});
