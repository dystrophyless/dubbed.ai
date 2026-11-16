import { fail, ok, purchaseId, type CreditsPort, type DemoSettings, type HistoryRow, type Purchase, type PurchaseId } from "../contracts";
import { PACKS } from "../rules/credits";
import * as db from "./db";

type AccountRecord = { balance: number; slotLimit: 2 | 10 };
const DEFAULT_ACCOUNT: AccountRecord = { balance: 120, slotLimit: 2 };

function emitPurchase(id: PurchaseId): void {
  db.emit({ kind: "purchase", purchaseId: id });
  db.emit({ kind: "credits" });
}

export const credits: CreditsPort = {
  async packs() { return PACKS; },
  async history(page) {
    const rows = (await db.getAll<HistoryRow>("history")).sort((a, b) => b.at - a.at);
    const pages = Math.max(1, Math.ceil(rows.length / 20));
    return { rows: rows.slice((page - 1) * 20, page * 20), page, pages };
  },
  async startPurchase(packId, returnTo) {
    const pack = PACKS.find((p) => p.id === packId);
    if (!pack) return fail("pack");
    const cfg = await db.get<Partial<DemoSettings>>("kv", "settings");
    if (cfg?.failStart) return fail("storage");
    const delay = cfg?.startDelayMs ?? 0;
    if (delay > 0) await new Promise<void>((resolve) => setTimeout(resolve, delay));
    const id = purchaseId(crypto.randomUUID());
    const purchase: Purchase = { id, pack: structuredClone(pack), returnTo: structuredClone(returnTo),
      state: "awaiting", checkoutUrl: `/checkout/${id}`, firstPurchase: false, createdAt: Date.now(), finishedAt: null };
    try {
      await db.write(["purchases"], (s) => { s.purchases.put(purchase); });
    } catch { return fail("storage"); }
    emitPurchase(id);
    return ok(purchase);
  },
  async getPurchase(id) {
    const purchase = await db.get<Purchase>("purchases", id);
    return purchase ? ok(purchase) : fail("not-found");
  },
  async pay(id) {
    try {
      const initial = await db.get<Purchase>("purchases", id);
      if (!initial) return fail("not-found");
      if (initial.state !== "awaiting") return ok(initial);
      const cfg = await db.get<Partial<DemoSettings>>("kv", "settings");
      if (cfg?.failPay) return fail("storage");
      // Never keep a transaction open over the simulated provider delay.
      await new Promise<void>((resolve) => setTimeout(resolve, cfg?.paymentDelayMs ?? 1200));
      const result = await db.write(["purchases", "kv", "history"], async (s) => {
        // Another tab may have paid, cancelled or swept this purchase during the delay.
        const purchase = (await db.req(s.purchases.get(id))) as Purchase | undefined;
        if (!purchase || purchase.state !== "awaiting") return { purchase, changed: false };
        purchase.finishedAt = Date.now();
        if (cfg?.payment === "declined") {
          purchase.state = "declined";
        } else {
          const account = ((await db.req(s.kv.get("account"))) as AccountRecord | undefined) ?? { ...DEFAULT_ACCOUNT };
          purchase.state = "completed";
          purchase.firstPurchase = account.slotLimit === 2;
          if (purchase.firstPurchase) account.slotLimit = 10;
          account.balance += purchase.pack.credits;
          const row: HistoryRow = { id: crypto.randomUUID(), kind: "purchase", at: purchase.finishedAt,
            amount: purchase.pack.credits, pack: purchase.pack };
          s.kv.put(account, "account");
          s.history.put(row);
        }
        s.purchases.put(purchase);
        return { purchase, changed: true };
      });
      if (result.changed) emitPurchase(id);
      return result.purchase ? ok(result.purchase) : fail("not-found");
    } catch { return fail("storage"); }
  },
  async cancelPurchase(id) {
    const result = await db.write(["purchases"], async (s) => {
      const purchase = (await db.req(s.purchases.get(id))) as Purchase | undefined;
      if (!purchase || purchase.state !== "awaiting") return { purchase, changed: false };
      purchase.state = "cancelled";
      purchase.finishedAt = Date.now();
      s.purchases.put(purchase);
      return { purchase, changed: true };
    });
    if (result.changed) emitPurchase(id);
    return result.purchase ? ok(result.purchase) : fail("not-found");
  },
  async sweep(keep) {
    const cancelled = await db.write(["purchases"], async (s) => {
      const purchases = (await db.req(s.purchases.getAll())) as Purchase[];
      const ids: PurchaseId[] = [];
      for (const purchase of purchases) {
        if (purchase.state !== "awaiting" || purchase.id === keep) continue;
        purchase.state = "cancelled";
        purchase.finishedAt = Date.now();
        s.purchases.put(purchase);
        ids.push(purchase.id);
      }
      return ids;
    });
    for (const id of cancelled) emitPurchase(id);
  },
};
