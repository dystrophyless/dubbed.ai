import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { projectId, purchaseId, type ChangeEvent, type HistoryRow, type Outcome, type Purchase, type ReturnTo } from "../contracts";
import { balanceFromHistory, PACKS } from "../rules/credits";
import * as db from "./db";
import { createMockServices } from "./index";

function value<T>(result: Outcome<T, string>): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

const rows = () => db.getAll<HistoryRow>("history");
const purchases = async () => (await rows()).filter((r) => r.kind === "purchase");

async function invariant(services: ReturnType<typeof createMockServices>) {
  const account = await services.account.get();
  expect(account.balance).toBe(balanceFromHistory(await rows()));
}

async function finish<T>(pending: Promise<T>, timers = 1): Promise<T> {
  await vi.waitFor(() => expect(vi.getTimerCount()).toBe(timers));
  await vi.advanceTimersByTimeAsync(1200);
  return pending;
}

describe("mock purchases", () => {
  let services = createMockServices();
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    services = createMockServices();
    await services.demo!.reset();
  });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  async function start(pack = "m", returnTo: ReturnTo = null): Promise<Purchase> {
    const purchase = value(await services.credits.startPurchase(pack, returnTo));
    await invariant(services);
    return purchase;
  }

  it.each(PACKS)("completes $id with exactly its snapshot credits and one row, durably", async (pack) => {
    const returnTo: ReturnTo = { kind: "new", projectId: projectId("draft"), need: 32 };
    const purchase = await start(pack.id, returnTo);
    expect(purchase).toMatchObject({ pack, returnTo, state: "awaiting", firstPurchase: false, finishedAt: null,
      checkoutUrl: `/checkout/${purchase.id}` });
    // The returned object is not the durable snapshot.
    purchase.pack.credits = 1;
    returnTo.need = 99;
    expect(value(await services.credits.getPurchase(purchase.id))).toMatchObject({ pack, returnTo: { need: 32 } });
    const completed = value(await finish(services.credits.pay(purchase.id)));
    expect(completed).toMatchObject({ state: "completed", firstPurchase: true, pack });
    expect(completed.finishedAt).not.toBeNull();
    expect(await services.account.get()).toMatchObject({ balance: 120 + pack.credits, slotLimit: 10 });
    expect(await purchases()).toEqual([expect.objectContaining({ pack, amount: pack.credits, at: completed.finishedAt })]);
    await invariant(services);
    const reloaded = createMockServices();
    expect(await reloaded.credits.getPurchase(purchase.id)).toEqual({ ok: true, value: completed });
    expect(await reloaded.credits.pay(purchase.id)).toEqual({ ok: true, value: completed });
    expect(await reloaded.credits.cancelPurchase(purchase.id)).toEqual({ ok: true, value: completed });
    await reloaded.credits.sweep();
    expect(await purchases()).toHaveLength(1);
    await invariant(reloaded);
  });

  it("uses the configured delay and reloads an awaiting purchase before payment", async () => {
    await services.demo!.set({ paymentDelayMs: 2400 });
    const purchase = await start();
    const reloaded = createMockServices();
    expect(await reloaded.credits.getPurchase(purchase.id)).toEqual({ ok: true, value: purchase });
    const pending = reloaded.credits.pay(purchase.id);
    await vi.waitFor(() => expect(vi.getTimerCount()).toBe(1));
    await vi.advanceTimersByTimeAsync(1200);
    expect(value(await services.credits.getPurchase(purchase.id)).state).toBe("awaiting");
    expect(await services.account.get()).toMatchObject({ balance: 120, slotLimit: 2 });
    await invariant(services);
    await vi.advanceTimersByTimeAsync(1200);
    expect(value(await pending).state).toBe("completed");
    await invariant(services);
  });

  it("the second completed purchase keeps ten slots and firstPurchase false", async () => {
    const first = await start("s");
    expect(value(await finish(services.credits.pay(first.id))).firstPurchase).toBe(true);
    await invariant(services);
    const second = await start("m");
    expect(value(await finish(services.credits.pay(second.id))).firstPurchase).toBe(false);
    expect(await services.account.get()).toMatchObject({ balance: 1420, slotLimit: 10 });
    expect(await purchases()).toHaveLength(2);
    await invariant(services);
  });

  it("only the first completed purchase raises the slot limit", async () => {
    const first = await start("s");
    const second = await start("l", { kind: "slots" });
    const results = await finish(Promise.all([services.credits.pay(first.id), services.credits.pay(second.id)]), 2);
    expect(results.map((r) => value(r).firstPurchase).sort()).toEqual([false, true]);
    expect(await services.account.get()).toMatchObject({ balance: 3420, slotLimit: 10 });
    expect(await purchases()).toHaveLength(2);
    await invariant(services);
  });

  it.each([false, true])("parallel Pay completes once (second adapter: %s)", async (twoTabs) => {
    const purchase = await start();
    const other = twoTabs ? createMockServices() : services;
    const results = await finish(Promise.all([services.credits.pay(purchase.id), other.credits.pay(purchase.id)]), 2);
    expect(results[0]).toEqual(results[1]);
    expect(value(results[0]).state).toBe("completed");
    expect(await services.account.get()).toMatchObject({ balance: 1120, slotLimit: 10 });
    expect(await purchases()).toHaveLength(1);
    await invariant(services);
  });

  it("declines without changing money or slots, and cannot later complete", async () => {
    await services.demo!.set({ payment: "declined" });
    const purchase = await start();
    const declined = value(await finish(services.credits.pay(purchase.id)));
    expect(declined).toMatchObject({ state: "declined", firstPurchase: false });
    expect(declined.finishedAt).not.toBeNull();
    await services.demo!.set({ payment: "success" });
    expect(await services.credits.pay(purchase.id)).toEqual({ ok: true, value: declined });
    expect(await services.credits.cancelPurchase(purchase.id)).toEqual({ ok: true, value: declined });
    expect(await services.account.get()).toMatchObject({ balance: 120, slotLimit: 2 });
    expect(await purchases()).toHaveLength(0);
    await invariant(services);
  });

  it.each(["cancel", "sweep"] as const)("%s before or during the delay never charges", async (method) => {
    const before = await start();
    if (method === "cancel") await services.credits.cancelPurchase(before.id);
    else await services.credits.sweep();
    expect(value(await services.credits.pay(before.id)).state).toBe("cancelled");
    await invariant(services);
    const during = await start();
    const pending = services.credits.pay(during.id);
    await vi.waitFor(() => expect(vi.getTimerCount()).toBe(1));
    if (method === "cancel") await services.credits.cancelPurchase(during.id);
    else await createMockServices().credits.sweep();
    await invariant(services);
    await vi.advanceTimersByTimeAsync(1200);
    const cancelled = value(await pending);
    expect(cancelled).toMatchObject({ state: "cancelled", firstPurchase: false });
    expect(cancelled.finishedAt).not.toBeNull();
    expect(await services.credits.cancelPurchase(during.id)).toEqual({ ok: true, value: cancelled });
    expect(await services.account.get()).toMatchObject({ balance: 120, slotLimit: 2 });
    expect(await purchases()).toHaveLength(0);
    await invariant(services);
  });

  it("sweeps every awaiting purchase except keep, leaving terminal purchases alone", async () => {
    const completed = await start();
    await finish(services.credits.pay(completed.id));
    const keep = await start();
    const abandoned = await start();
    const another = await start();
    await services.credits.sweep(keep.id);
    expect(value(await services.credits.getPurchase(keep.id)).state).toBe("awaiting");
    for (const p of [abandoned, another]) expect(value(await services.credits.getPurchase(p.id)).state).toBe("cancelled");
    expect(value(await services.credits.getPurchase(completed.id)).state).toBe("completed");
    await services.credits.sweep();
    expect(value(await services.credits.getPurchase(keep.id)).state).toBe("cancelled");
    await invariant(services);
  });

  it("returns typed errors for unknown packs and purchases", async () => {
    expect(await services.credits.startPurchase("unknown", null)).toEqual({ ok: false, error: "pack" });
    const missing = purchaseId("missing");
    for (const call of [services.credits.getPurchase(missing), services.credits.pay(missing), services.credits.cancelPurchase(missing)]) {
      expect(await call).toEqual({ ok: false, error: "not-found" });
    }
    expect(await db.getAll("purchases")).toHaveLength(0);
    await invariant(services);
  });

  it("returns storage errors and rolls back the entire completion on a failed history write", async () => {
    const purchase = await start();
    const put = IDBObjectStore.prototype.put;
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (this: IDBObjectStore, ...args: Parameters<typeof put>) {
      if (this.name === "history") throw new DOMException("Full", "QuotaExceededError");
      return put.apply(this, args);
    });
    expect(await finish(services.credits.pay(purchase.id))).toEqual({ ok: false, error: "storage" });
    expect(value(await services.credits.getPurchase(purchase.id)).state).toBe("awaiting");
    expect(await services.account.get()).toMatchObject({ balance: 120, slotLimit: 2 });
    expect(await purchases()).toHaveLength(0);
    await invariant(services);
    vi.spyOn(db, "write").mockRejectedValueOnce(new Error("Storage unavailable"));
    expect(await services.credits.startPurchase("s", null)).toEqual({ ok: false, error: "storage" });
    await invariant(services);
  });

  it("emits purchase and credits only after durable transitions, not repeated Pay", async () => {
    const events: ChangeEvent[] = [];
    const snapshots: Promise<Purchase | undefined>[] = [];
    const unsubscribe = db.subscribe((event) => {
      events.push(event);
      if (event.kind === "purchase" && event.purchaseId) snapshots.push(db.get<Purchase>("purchases", event.purchaseId));
    });
    try {
      const purchase = await start();
      await finish(services.credits.pay(purchase.id));
      await services.credits.pay(purchase.id);
      expect(events).toEqual([
        { kind: "purchase", purchaseId: purchase.id }, { kind: "credits" },
        { kind: "purchase", purchaseId: purchase.id }, { kind: "credits" },
      ]);
      expect((await Promise.all(snapshots)).map((p) => p?.state)).toEqual(["awaiting", "completed"]);
      await invariant(services);
    } finally { unsubscribe(); }
  });
});
