/*
 * IndexedDB for the mock adapter (research R2): database `dubbed-mock`. Blobs (source video, takes, rendered results)
 * live here so they survive reloads. A BroadcastChannel tells other tabs what changed.
 */

import type { ChangeEvent, HistoryRow, ProjectId } from "../contracts";
import { balanceFromHistory, runAmount } from "../rules/credits";
import { currentAccount } from "./auth-db";

export const welcomeRow = (at: number): HistoryRow => ({ id: "welcome", kind: "welcome", at, amount: 120 });

const DB_VERSION = 2;
export const STORES = ["kv", "projects", "turns", "takes", "videos", "results", "history", "purchases"] as const;
export type StoreName = (typeof STORES)[number];

let dbPromise: Promise<IDBDatabase> | null = null;
let openedAccountId: string | null = null;

export class DataAccessError extends Error {
  readonly reason: "guest" | "inactive" | "account-changed";
  constructor(reason: "guest" | "inactive" | "account-changed") {
    super("Active account required; reload after an account change.");
    this.name = "DataAccessError";
    this.reason = reason;
  }
}

/** The account whose data this tab has opened (R3); null until its first data access. */
export function currentAccountId(): string | null { return openedAccountId; }

async function open(): Promise<IDBDatabase> {
  const account = await currentAccount();
  if (!account) throw new DataAccessError("guest");
  if (account.stage !== "active") throw new DataAccessError("inactive");
  // Never retarget an in-flight adapter to another account: R3 requires a full page reload.
  if (openedAccountId !== null && openedAccountId !== account.id) throw new DataAccessError("account-changed");
  if (dbPromise) return dbPromise;
  openedAccountId = account.id;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(account.dataDb, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
      if (!db.objectStoreNames.contains("projects")) db.createObjectStore("projects", { keyPath: "id" });
      if (!db.objectStoreNames.contains("turns")) db.createObjectStore("turns", { keyPath: ["projectId", "n"] });
      if (!db.objectStoreNames.contains("takes")) db.createObjectStore("takes", { keyPath: ["projectId", "n"] });
      if (!db.objectStoreNames.contains("videos")) db.createObjectStore("videos", { keyPath: "projectId" });
      if (!db.objectStoreNames.contains("results")) db.createObjectStore("results", { keyPath: ["projectId", "number"] });
      db.createObjectStore("purchases", { keyPath: "id" });
      const history = db.createObjectStore("history", { keyPath: "id" });
      history.createIndex("at", "at");
      const tx = req.transaction!;
      if (event.oldVersion === 0) tx.objectStore("kv").put({ balance: 120, slotLimit: 2 }, "account");
      const projects = tx.objectStore("projects");
      // Both reads and all seeds belong to the version-change transaction: an upgrade is all or nothing.
      const all = projects.getAll();
      all.onsuccess = () => {
        const records = all.result as { id: ProjectId; name: string; createdAt: number; changedAt: number; reserved: number; charged: number }[];
        const at = records.length ? Math.min(...records.map((p) => p.createdAt)) : Date.now();
        const rows: HistoryRow[] = [welcomeRow(at)];
        for (const p of records) {
          if (p.reserved <= 0 && p.charged <= 0) continue;
          const runId = crypto.randomUUID();
          rows.push({ id: runId, kind: "run", at: p.createdAt, updatedAt: p.changedAt,
            projectId: p.id, projectName: p.name, reserved: p.reserved, charged: p.charged, returned: 0,
            state: p.reserved > 0 ? "reserved" : "charged", amount: runAmount(p) });
          projects.put({ ...p, runId });
        }
        const account = tx.objectStore("kv").get("account");
        account.onsuccess = () => {
          const difference = (account.result?.balance ?? 120) - balanceFromHistory(rows);
          if (difference !== 0) rows.push({ id: crypto.randomUUID(), kind: "adjustment", at: Date.now(), amount: difference });
          for (const row of rows) history.put(row);
        };
      };
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).catch((error: unknown) => {
    dbPromise = null;
    openedAccountId = null;
    throw error;
  });
  return dbPromise;
}

const done = <T>(req: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const txDone = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

export async function get<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  const db = await open();
  return done(db.transaction(store).objectStore(store).get(key)) as Promise<T | undefined>;
}

export async function getAll<T>(store: StoreName, range?: IDBKeyRange): Promise<T[]> {
  const db = await open();
  return done(db.transaction(store).objectStore(store).getAll(range)) as Promise<T[]>;
}

/** Read related records from a single consistent IndexedDB snapshot. */
export async function read<T>(stores: StoreName[], fn: (s: Record<StoreName, IDBObjectStore>) => Promise<T> | T): Promise<T> {
  const db = await open();
  const tx = db.transaction(stores, "readonly");
  const map = Object.fromEntries(stores.map((name) => [name, tx.objectStore(name)])) as Record<StoreName, IDBObjectStore>;
  return fn(map);
}

/** All records of a project in a store keyed by [projectId, n]. */
export const byProject = (projectId: string) => IDBKeyRange.bound([projectId, -Infinity], [projectId, Infinity]);

/**
 * One atomic write across stores. `fn` receives the stores and may read/write; resolves after commit — so a value
 * written here is durable when the promise resolves (takes are "saved" only then, research R5).
 */
export async function write<T>(stores: StoreName[], fn: (s: Record<StoreName, IDBObjectStore>) => Promise<T> | T, signal?: AbortSignal): Promise<T> {
  const db = await open();
  const tx = db.transaction(stores, "readwrite");
  const map = Object.fromEntries(stores.map((name) => [name, tx.objectStore(name)])) as Record<StoreName, IDBObjectStore>;
  const committed = txDone(tx);
  // Observe commit failures immediately, including when a request/callback fails before we await the commit.
  void committed.catch(() => undefined);
  const onAbort = () => {
    try { tx.abort(); } catch { /* already completed or aborted */ }
  };
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    if (signal?.aborted) throw new DOMException("Write cancelled.", "AbortError");
    const result = await fn(map);
    await committed;
    return result;
  } catch (error) {
    // A synchronous put failure must roll back earlier puts in this transaction too.
    try { tx.abort(); } catch { /* already completed or aborted */ }
    await committed.catch(() => undefined);
    throw error;
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }
}

export const req = done;

export async function clearAll(): Promise<void> {
  await write([...STORES], (s) => {
    for (const name of STORES) s[name].clear();
  });
}

/** Release this tab's connection, e.g. when simulating a full reload in unit tests. */
export async function closeDataDb(): Promise<void> {
  const pending = dbPromise;
  if (pending) (await pending).close();
  dbPromise = null;
  openedAccountId = null;
}

/** Delete an account's data without opening it (demo reset). */
export async function deleteDataDb(name: string): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    if (db.name === name) {
      db.close();
      dbPromise = null;
      openedAccountId = null;
    }
  }
  await done(indexedDB.deleteDatabase(name));
}

/* ---------- change feed ---------- */

const listeners = new Set<(e: ChangeEvent) => void>();
const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("dubbed-mock-changes") : null;
channel?.addEventListener("message", (e: MessageEvent<ChangeEvent>) => listeners.forEach((l) => l(e.data)));

export function emit(e: ChangeEvent): void {
  listeners.forEach((l) => l(e));
  channel?.postMessage(e);
}

export function subscribe(listener: (e: ChangeEvent) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
