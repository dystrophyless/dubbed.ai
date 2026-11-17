import { expect, type Page } from "@playwright/test";
import type { Lang } from "./flow";

/* Helpers for the sign-up / sign-in e2e (feature 004). The auth services run in the browser on mocks (?demo= presets). */

export const DEMO_EMAIL = "demo@dubbed.test";
export const DEMO_PASSWORD = "dubbed-demo";
export const GOOD_PASSWORD = "correct-horse-1";

export const LABEL: Record<Lang, { email: string; password: string; code: RegExp; account: string; signOut: string }> = {
  en: { email: "Email", password: "Password", code: /Verification code/, account: "Account", signOut: "Sign out" },
  ru: { email: "Почта", password: "Пароль", code: /Код подтверждения/, account: "Аккаунт", signOut: "Выйти" },
};

export const emailField = (page: Page, lang: Lang = "en") => page.getByLabel(LABEL[lang].email, { exact: true });
export const passwordField = (page: Page, lang: Lang = "en") => page.getByLabel(LABEL[lang].password, { exact: true });
export const submit = (page: Page) => page.getByTestId("auth-submit");

/** Fills the sign-up form and submits (page: /sign-up). */
export async function submitSignUp(page: Page, email: string, password = GOOD_PASSWORD, lang: Lang = "en") {
  await emailField(page, lang).fill(email);
  await passwordField(page, lang).fill(password);
  await submit(page).click();
}

/** The six digits in the demo notice on a code page. */
export async function readDemoCode(page: Page) {
  const notice = page.getByTestId("auth-demo-code");
  await expect(notice).toBeVisible();
  const code = ((await notice.textContent()) ?? "").replace(/\D/g, "");
  expect(code).toMatch(/^\d{6}$/);
  return code;
}

export async function typeCode(page: Page, code: string, lang: Lang = "en") {
  const field = page.getByLabel(LABEL[lang].code);
  await field.click();
  await field.pressSequentially(code);
}

/** Sign-up form → code page → code from the demo notice → microphone page. */
export async function signUpToMicrophone(page: Page, email: string, password = GOOD_PASSWORD, lang: Lang = "en") {
  await submitSignUp(page, email, password, lang);
  await expect(page).toHaveURL(/\/sign-up\/verify$/);
  await typeCode(page, await readDemoCode(page), lang);
  await expect(page).toHaveURL(/\/sign-up\/microphone$/);
}

/** A whole new account: sign-up → code → microphone (fake tone) → Finish → New dub. Starts from a guest page. */
export async function createAccount(page: Page, email: string, password = GOOD_PASSWORD) {
  await page.goto("/sign-up");
  await signUpToMicrophone(page, email, password);
  await expect(page.getByTestId("mic-heard")).toBeVisible({ timeout: 25_000 });
  await page.getByTestId("mic-finish").click();
  await expect(page).toHaveURL(/\/new$/);
}

export async function signInWith(page: Page, email: string, password: string, lang: Lang = "en") {
  await emailField(page, lang).fill(email);
  await passwordField(page, lang).fill(password);
  await submit(page).click();
}

/** Account menu → Sign out (the shell then loads /sign-in). */
export async function signOutFromMenu(page: Page, lang: Lang = "en") {
  await page.getByRole("button", { name: LABEL[lang].account }).click();
  await page.getByText(LABEL[lang].signOut, { exact: true }).click();
  // the tab navigates once, to plain /sign-in; wait for it to settle so the next step cannot race a reload
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.waitForLoadState("networkidle");
}

/** How many accounts the mock auth database holds. */
export function accountCount(page: Page) {
  return page.evaluate(() => new Promise<number>((resolve, reject) => {
    const open = indexedDB.open("dubbed-mock-auth");
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const count = db.transaction("accounts").objectStore("accounts").count();
      count.onsuccess = () => { db.close(); resolve(count.result); };
      count.onerror = () => reject(count.error);
    };
  }));
}

/**
 * Runs the page clock through the 60 s resend cooldown (install it with `page.clock.install()` before the page loads).
 * The code field counts down with chained one-second timers, so the clock is advanced a second at a time and React gets
 * a moment to schedule the next tick; `Date.now` (the mock service's "now") moves with it.
 */
export async function passCooldown(page: Page, seconds = 61) {
  for (let i = 0; i < seconds; i++) {
    await page.clock.runFor(1_000);
    await page.waitForTimeout(15);
  }
}

/**
 * The first read-write transaction of the mock auth database over exactly `stores` throws, once: the mock service then
 * answers "storage", the same "could not reach the service" the user sees. Every other transaction (a session refetch on
 * focus, a demo-code lookup) goes through. Resend uses [accounts, sessions, kv, codes] on the verify page and
 * [accounts, codes, throttle] on reset. Returns `fired()`, which the test asserts. (`?demo=fail:auth` is read at load
 * only, and a reset page cannot reload.)
 */
export async function failNextServiceCall(page: Page, stores: string[]) {
  await page.evaluate((wanted) => {
    const w = window as unknown as { __failFired?: boolean };
    w.__failFired = false;
    const original = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (this: IDBDatabase, names: string | string[], mode?: IDBTransactionMode, options?: IDBTransactionOptions) {
      const list = (Array.isArray(names) ? names : [names]).slice().sort().join(",");
      if (this.name === "dubbed-mock-auth" && mode === "readwrite" && list === wanted.slice().sort().join(",")) {
        IDBDatabase.prototype.transaction = original;
        w.__failFired = true;
        throw new DOMException("simulated failure", "UnknownError");
      }
      return original.call(this, names, mode, options);
    } as typeof original;
  }, stores);
  return { fired: () => page.evaluate(() => (window as unknown as { __failFired?: boolean }).__failFired === true) };
}

/**
 * Holds a read-write transaction open over `stores` of the mock auth database, so a service call that needs any of them
 * stays pending (IndexedDB queues overlapping read-write transactions) until `release()`. This is how a "slow resend" is made
 * without touching the service. Call after the page has loaded; the hold starts before the click that must wait.
 */
export async function holdServiceStores(page: Page, stores: string[]) {
  await page.evaluate((names) => new Promise<void>((resolve, reject) => {
    const w = window as unknown as { __release?: () => void };
    const open = indexedDB.open("dubbed-mock-auth");
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction(names, "readwrite");
      let released = false;
      w.__release = () => { released = true; };
      const store = tx.objectStore(names[0]);
      const pump = () => { if (released) return; const r = store.get("__hold__"); r.onsuccess = pump; };
      tx.oncomplete = () => db.close();
      pump();
      resolve();
    };
  }), stores);
  return { release: () => page.evaluate(() => (window as unknown as { __release?: () => void }).__release?.()) };
}

export const VERIFY_RESEND_STORES = ["accounts", "sessions", "kv", "codes"];
export const RESET_RESEND_STORES = ["accounts", "codes", "throttle"];
