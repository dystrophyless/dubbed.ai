import type { AuthStage, CodePurpose } from "../contracts";

export type PasswordHash = { salt: string; hash: string };
export type AuthAccount = {
  id: string; email: string; passwordHash: PasswordHash | null; google: { name: string } | null;
  stage: AuthStage; createdAt: number; activatedAt: number | null; dataDb: string;
};
export type AuthSession = { id: string; accountId: string; createdAt: number; revokedAt: number | null };
export type EmailCode = { accountId: string; purpose: CodePurpose; code: string; sentAt: number; expiresAt: number; wrongAttempts: number };
export type ResetTicket = { accountId: string; purpose: "reset-ticket"; ticket: string; expiresAt: number };
export type SignInThrottle = { wrong: number; lockedUntil: number | null; resetSentAt?: number };

const DB_NAME = "dubbed-mock-auth";
export const STORES = ["accounts", "codes", "sessions", "throttle", "kv"] as const;
export type StoreName = (typeof STORES)[number];
type Stores = Record<StoreName, IDBObjectStore>;
let dbPromise: Promise<IDBDatabase> | null = null;
const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

export async function hashPassword(password: string, salt = hex(crypto.getRandomValues(new Uint8Array(16)))): Promise<PasswordHash> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + password));
  return { salt, hash: hex(new Uint8Array(digest)) };
}
export async function checkPassword(password: string, stored: PasswordHash | null): Promise<boolean> {
  return stored !== null && (await hashPassword(password, stored.salt)).hash === stored.hash;
}

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  // Hash before starting IndexedDB: awaiting Web Crypto inside a transaction would let it auto-commit.
  dbPromise = hashPassword("dubbed-demo").then((passwordHash) => new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore("accounts", { keyPath: "id" }).createIndex("email", "email", { unique: true });
      db.createObjectStore("codes", { keyPath: ["accountId", "purpose"] });
      db.createObjectStore("sessions", { keyPath: "id" });
      db.createObjectStore("throttle");
      db.createObjectStore("kv");
      const now = Date.now();
      request.transaction!.objectStore("accounts").put({ id: "demo", email: "demo@dubbed.test", passwordHash,
        google: null, stage: "active", createdAt: now, activatedAt: now, dataDb: "dubbed-mock" } satisfies AuthAccount);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Auth storage unavailable."));
  })).catch(() => { dbPromise = null; throw new Error("Auth storage unavailable."); });
  return dbPromise;
}
export const req = <T>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(new Error("Auth storage unavailable."));
});
async function transaction<T>(stores: StoreName[], mode: IDBTransactionMode, fn: (s: Stores) => Promise<T> | T): Promise<T> {
  const db = await open();
  const tx = db.transaction(stores, mode);
  const committed = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => reject(new Error("Auth storage unavailable."));
  });
  void committed.catch(() => undefined);
  try {
    const result = await fn(Object.fromEntries(stores.map((name) => [name, tx.objectStore(name)])) as Stores);
    await committed;
    return result;
  } catch {
    try { tx.abort(); } catch { /* already completed */ }
    await committed.catch(() => undefined);
    throw new Error("Auth storage unavailable.");
  }
}
export const read = <T>(stores: StoreName[], fn: (s: Stores) => Promise<T> | T) => transaction(stores, "readonly", fn);
export const write = <T>(stores: StoreName[], fn: (s: Stores) => Promise<T> | T) => transaction(stores, "readwrite", fn);

export async function currentAccount(): Promise<AuthAccount | null> {
  return read(["kv", "sessions", "accounts"], async (s) => {
    const id = await req(s.kv.get("current")) as string | undefined;
    if (!id) return null;
    const session = await req(s.sessions.get(id)) as AuthSession | undefined;
    if (!session || session.revokedAt !== null) return null;
    return (await req(s.accounts.get(session.accountId)) as AuthAccount | undefined) ?? null;
  });
}
export async function deleteAuthDb(): Promise<void> {
  const pending = dbPromise;
  dbPromise = null;
  if (pending) (await pending).close();
  await req(indexedDB.deleteDatabase(DB_NAME));
}

/** Explicit demo preset only; a fresh browser remains a guest. */
export async function signInDemo(): Promise<void> {
  await write(["sessions", "kv"], (s) => {
    const session: AuthSession = { id: crypto.randomUUID(), accountId: "demo", createdAt: Date.now(), revokedAt: null };
    s.sessions.put(session);
    s.kv.put(session.id, "current");
  });
}
