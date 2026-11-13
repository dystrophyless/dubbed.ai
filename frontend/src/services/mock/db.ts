/*
 * IndexedDB for the mock adapter (research R2): database `dubbed-mock`. Blobs (source video, takes, rendered results)
 * live here so they survive reloads. A BroadcastChannel tells other tabs what changed.
 */

import type { ChangeEvent } from "../contracts";

const DB_NAME = "dubbed-mock";
const DB_VERSION = 1;
export const STORES = ["kv", "projects", "turns", "takes", "videos", "results"] as const;
export type StoreName = (typeof STORES)[number];

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
      if (!db.objectStoreNames.contains("projects")) db.createObjectStore("projects", { keyPath: "id" });
      if (!db.objectStoreNames.contains("turns")) db.createObjectStore("turns", { keyPath: ["projectId", "n"] });
      if (!db.objectStoreNames.contains("takes")) db.createObjectStore("takes", { keyPath: ["projectId", "n"] });
      if (!db.objectStoreNames.contains("videos")) db.createObjectStore("videos", { keyPath: "projectId" });
      if (!db.objectStoreNames.contains("results")) db.createObjectStore("results", { keyPath: ["projectId", "number"] });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
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

/** All records of a project in a store keyed by [projectId, n]. */
export const byProject = (projectId: string) => IDBKeyRange.bound([projectId, -Infinity], [projectId, Infinity]);

/**
 * One atomic write across stores. `fn` receives the stores and may read/write; resolves after commit — so a value
 * written here is durable when the promise resolves (takes are "saved" only then, research R5).
 */
export async function write<T>(stores: StoreName[], fn: (s: Record<StoreName, IDBObjectStore>) => Promise<T> | T): Promise<T> {
  const db = await open();
  const tx = db.transaction(stores, "readwrite");
  const map = Object.fromEntries(stores.map((name) => [name, tx.objectStore(name)])) as Record<StoreName, IDBObjectStore>;
  const committed = txDone(tx);
  const result = await fn(map);
  await committed;
  return result;
}

export const req = done;

export async function clearAll(): Promise<void> {
  await write([...STORES], (s) => {
    for (const name of STORES) s[name].clear();
  });
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
