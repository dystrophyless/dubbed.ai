import { type Page } from "@playwright/test";

/** Hold a real IndexedDB writer so the UI's pending/durable-save boundary is observable without product hooks. */
export async function holdStore(page: Page, store: "projects" | "takes") {
  await page.evaluate(async (store) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("dubbed-mock"); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
    });
    const tx = db.transaction(store, "readwrite");
    let held = true;
    (window as Window & { releaseTestWriter?: () => void }).releaseTestWriter = () => { held = false; };
    await new Promise<void>((resolve) => {
      const keepAlive = () => {
        const r = tx.objectStore(store).get("__test_writer__");
        r.onsuccess = () => { resolve(); if (held) keepAlive(); };
      };
      keepAlive();
    });
    tx.oncomplete = () => db.close();
  }, store);
  return () => page.evaluate(() => (window as Window & { releaseTestWriter?: () => void }).releaseTestWriter?.());
}
