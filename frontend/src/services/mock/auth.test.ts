import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockServices } from "./index";
import * as authDb from "./auth-db";
import * as db from "./db";
import { watchAuthSecrets } from "./test-auth";

const password = "private-password-sentinel";
const code = "847291";
let services = createMockServices();
let secrets: ReturnType<typeof watchAuthSecrets>;
let secretValues: string[];

async function signUp(email = "new@example.com") {
  const result = await services.auth.signUp({ email, password });
  secrets.check(result);
  expect(result.ok).toBe(true);
  const live = await services.demo!.lastCode(email, "verify");
  expect(live).toMatch(/^\d{6}$/);
  secretValues.push(live!);
  return live!;
}

async function verify(value: string) {
  secretValues.push(value);
  const result = await services.auth.verifyEmail(value);
  secrets.check(result);
  return result;
}

async function selectAccount(id: string, stage: authDb.AuthAccount["stage"] = "active") {
  await authDb.write(["accounts", "sessions", "kv"], (s) => {
    if (id !== "demo") s.accounts.put({ id, email: `${id}@example.com`, passwordHash: null, google: null,
      stage, createdAt: Date.now(), activatedAt: stage === "active" ? Date.now() : null,
      dataDb: `dubbed-mock-${id}` } satisfies authDb.AuthAccount);
    const session: authDb.AuthSession = { id: crypto.randomUUID(), accountId: id, createdAt: Date.now(), revokedAt: null };
    s.sessions.put(session);
    s.kv.put(session.id, "current");
  });
}

beforeEach(async () => {
  await db.closeDataDb();
  await authDb.deleteAuthDb();
  services = createMockServices();
  secretValues = [password, code];
  secrets = watchAuthSecrets(services, secretValues);
});
afterEach(async () => {
  try { secrets.check(); } finally { secrets.stop(); }
  vi.useRealTimers();
  const accounts = await authDb.read(["accounts"], (s) => authDb.req(s.accounts.getAll())) as authDb.AuthAccount[];
  for (const account of accounts) await db.deleteDataDb(account.dataDb);
  await db.deleteDataDb("dubbed-mock-other");
  await authDb.deleteAuthDb();
});

describe("email onboarding", () => {
  it("creates one hashed verify account, a session and a random code, without opening data", async () => {
    const random = vi.spyOn(crypto, "getRandomValues");
    try {
      const value = await signUp(" New@Example.com ");
      expect(random).toHaveBeenCalled();
      const account = await authDb.currentAccount();
      expect(account).toMatchObject({ email: "new@example.com", stage: "verify", google: null, activatedAt: null });
      expect(account!.dataDb).toBe(`dubbed-mock-${account!.id}`);
      expect(await authDb.checkPassword(password, account!.passwordHash)).toBe(true);
      expect(JSON.stringify(account)).not.toContain(password);
      expect(await services.auth.session()).toMatchObject({ accountId: account!.id, email: "new@example.com", stage: "verify", hasPassword: true });
      const record = await authDb.read(["codes"], (s) => authDb.req(s.codes.get([account!.id, "verify"]))) as authDb.EmailCode;
      expect(record).toEqual({ accountId: account!.id, purpose: "verify", code: value, sentAt: expect.any(Number), expiresAt: record.sentAt + 600_000, wrongAttempts: 0 });
      expect((await indexedDB.databases()).map((entry) => entry.name)).toEqual(["dubbed-mock-auth"]);
    } finally { random.mockRestore(); }
  });

  it("rejects invalid fields and normalised duplicate emails, including concurrent signups", async () => {
    const invalid = await services.auth.signUp({ email: "bad", password });
    const weak = await services.auth.signUp({ email: "new@example.com", password: "1234567" });
    secrets.check(invalid, weak);
    expect(invalid).toEqual({ ok: false, error: "invalid-email" });
    expect(weak).toEqual({ ok: false, error: "weak-password" });
    expect(await services.auth.session()).toBeNull();
    const results = await Promise.all([
      services.auth.signUp({ email: " NEW@EXAMPLE.COM ", password }),
      services.auth.signUp({ email: "new@example.com", password }),
    ]);
    secrets.check(...results);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results).toContainEqual({ ok: false, error: "email-taken" });
    expect(await authDb.read(["accounts"], (s) => authDb.req(s.accounts.count()))).toBe(2);
  });

  it("resends at 60 seconds, replaces the old code and resets wrong attempts", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const old = await signUp();
    expect(await verify("not-a-code")).toEqual({ ok: false, error: "wrong-code", attemptsLeft: 4 });
    const now = Date.now();
    const early = await services.auth.resendCode("verify");
    secrets.check(early);
    expect(early).toEqual({ ok: false, error: "too-soon", until: now + 60_000 });
    vi.setSystemTime(now + 60_000);
    const result = await services.auth.resendCode("verify");
    secrets.check(result);
    expect(result).toEqual({ ok: true, value: { email: "new@example.com", resendAt: now + 120_000, expiresAt: now + 660_000 } });
    const next = await services.demo!.lastCode("new@example.com", "verify");
    secretValues.push(next!);
    expect(next).not.toBe(old);
    expect(await verify(old)).toEqual({ ok: false, error: "wrong-code", attemptsLeft: 4 });
    expect(await verify(next!)).toMatchObject({ ok: true, value: { stage: "microphone" } });
  });

  it("kills the code at five wrong attempts even if the next code is correct; resend revives it", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const correct = await signUp();
    for (let i = 1; i < 5; i++) expect(await verify("not-a-code")).toEqual({ ok: false, error: "wrong-code", attemptsLeft: 5 - i });
    expect(await verify("not-a-code")).toEqual({ ok: false, error: "attempts" });
    expect(await verify(correct)).toEqual({ ok: false, error: "attempts" });
    expect(await services.demo!.lastCode("new@example.com", "verify")).toBeNull();
    vi.setSystemTime(Date.now() + 60_000);
    const result = await services.auth.resendCode("verify");
    secrets.check(result);
    expect(result.ok).toBe(true);
    const next = await services.demo!.lastCode("new@example.com", "verify");
    expect(await verify(next!)).toMatchObject({ ok: true, value: { stage: "microphone" } });
  });

  it("expires exactly at ten minutes without advancing the account", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const correct = await signUp();
    vi.setSystemTime(Date.now() + 600_000);
    expect(await verify(correct)).toEqual({ ok: false, error: "expired" });
    expect(await services.demo!.lastCode("new@example.com", "verify")).toBeNull();
    expect((await services.auth.session())!.stage).toBe("verify");
  });

  it("changes a verify email to a free normalised email and sends a replacement code", async () => {
    const old = await signUp();
    const invalid = await services.auth.changeEmail("bad");
    const taken = await services.auth.changeEmail(" DEMO@DUBBED.TEST ");
    secrets.check(invalid, taken);
    expect(invalid).toEqual({ ok: false, error: "invalid-email" });
    expect(taken).toEqual({ ok: false, error: "email-taken" });
    expect(await services.demo!.lastCode("new@example.com", "verify")).toBe(old);
    const changed = await services.auth.changeEmail(" Changed@Example.com ");
    secrets.check(changed);
    expect(changed).toMatchObject({ ok: true, value: { email: "changed@example.com" } });
    expect(await services.demo!.lastCode("new@example.com", "verify")).toBeNull();
    const next = await services.demo!.lastCode("changed@example.com", "verify");
    secretValues.push(next!);
    expect(next).not.toBe(old);
    expect((await services.auth.session())!.email).toBe("changed@example.com");
    expect(await verify(old)).toMatchObject({ ok: false, error: "wrong-code" });
    expect(await verify(next!)).toMatchObject({ ok: true, value: { stage: "microphone" } });
    const late = await services.auth.changeEmail("later@example.com");
    secrets.check(late);
    expect(late).toEqual({ ok: false, error: "storage" });
    expect((await services.auth.session())!.email).toBe("changed@example.com");
  });

  it("does not activate verify accounts, and verification consumes the code but creates no data", async () => {
    const events: unknown[] = [];
    const off = services.subscribe((event) => events.push(event));
    try {
      const correct = await signUp();
      const unchanged = await services.auth.completeMicrophone();
      secrets.check(unchanged);
      expect(unchanged).toMatchObject({ ok: true, value: { stage: "verify" } });
      expect(events).toEqual([{ kind: "session" }]);
      expect(await verify(correct)).toMatchObject({ ok: true, value: { stage: "microphone" } });
      expect(await services.demo!.lastCode("new@example.com", "verify")).toBeNull();
      expect(events).toEqual([{ kind: "session" }, { kind: "session" }]);
      await expect(services.account.get()).rejects.toMatchObject({ reason: "inactive" });
      expect((await indexedDB.databases()).map((entry) => entry.name)).toEqual(["dubbed-mock-auth"]);
    } finally { off(); }
  });

  it("activates concurrently with exactly one welcome row, 120 balance, two slots and no projects", async () => {
    await verify(await signUp());
    const events: unknown[] = [];
    const off = services.subscribe((event) => events.push(event));
    try {
      const results = await Promise.all([services.auth.completeMicrophone(), services.auth.completeMicrophone()]);
      secrets.check(...results);
      for (const result of results) expect(result).toMatchObject({ ok: true, value: { stage: "active" } });
      expect(events).toEqual([{ kind: "session" }]);
      const activatedAt = (await authDb.currentAccount())!.activatedAt;
      expect(activatedAt).toEqual(expect.any(Number));
      expect(await services.account.get()).toMatchObject({ balance: 120, slotLimit: 2, slotsUsed: 0 });
      expect(await services.projects.list()).toEqual([]);
      expect(await db.getAll("history")).toEqual([expect.objectContaining({ id: "welcome", amount: 120 })]);
      // Idempotent activation must not reset a subsequently changed balance or activation date.
      await services.demo!.set({ balance: 90 });
      const repeated = await services.auth.completeMicrophone();
      secrets.check(repeated);
      expect(repeated).toMatchObject({ ok: true, value: { stage: "active" } });
      expect((await services.account.get()).balance).toBe(90);
      expect((await authDb.currentAccount())!.activatedAt).toBe(activatedAt);
      expect((await db.getAll<{ id: string }>("history")).filter((row) => row.id === "welcome")).toHaveLength(1);
    } finally { off(); }
  });

  it("consumes fail:auth before every onboarding method, changes nothing and allows retry", async () => {
    await services.demo!.set({ failAuth: true });
    const failed = await services.auth.signUp({ email: "new@example.com", password });
    secrets.check(failed);
    expect(failed).toEqual({ ok: false, error: "storage" });
    expect(await services.auth.session()).toBeNull();
    const correct = await signUp();
    for (const run of [() => services.auth.changeEmail("changed@example.com"), () => services.auth.resendCode("verify"), () => services.auth.verifyEmail(correct), () => services.auth.completeMicrophone()]) {
      await services.demo!.set({ failAuth: true });
      const result = await run();
      secrets.check(result);
      expect(result).toEqual({ ok: false, error: "storage" });
      expect(await services.demo!.lastCode("new@example.com", "verify")).toBe(correct);
      expect((await services.auth.session())!.stage).toBe("verify");
    }
    expect(await verify(correct)).toMatchObject({ ok: true, value: { stage: "microphone" } });
    await services.demo!.set({ failAuth: true });
    const blocked = await services.auth.completeMicrophone();
    secrets.check(blocked);
    expect(blocked).toEqual({ ok: false, error: "storage" });
    expect((await services.auth.session())!.stage).toBe("microphone");
    const retried = await services.auth.completeMicrophone();
    secrets.check(retried);
    expect(retried).toMatchObject({ ok: true, value: { stage: "active" } });
  });
});

async function signIn(email = "demo@dubbed.test", value = "dubbed-demo") {
  secretValues.push(value);
  const result = await services.auth.signIn({ email, password: value });
  secrets.check(result);
  return result;
}

describe("password sign-in", () => {
  it("normalises email, creates a new current session and emits only session", async () => {
    const events: unknown[] = [];
    const off = services.subscribe((event) => events.push(event));
    try {
      expect(await signIn(" DEMO@DUBBED.TEST ")).toEqual({ ok: true, value: { accountId: "demo", email: "demo@dubbed.test", stage: "active", hasPassword: true, googleName: null } });
      const first = await authDb.read(["kv"], (s) => authDb.req(s.kv.get("current")));
      expect(await services.auth.session()).toMatchObject({ accountId: "demo" });
      expect((await signIn()).ok).toBe(true);
      const second = await authDb.read(["kv"], (s) => authDb.req(s.kv.get("current")));
      expect(second).not.toBe(first);
      expect(events).toEqual([{ kind: "session" }, { kind: "session" }]);
      await services.auth.signOut();
      expect(await services.auth.session()).toBeNull();
      const sessions = await authDb.read(["sessions"], (s) => authDb.req(s.sessions.getAll())) as authDb.AuthSession[];
      expect(sessions.find((session) => session.id === first)?.revokedAt).toBeNull();
      expect(sessions.find((session) => session.id === second)?.revokedAt).toEqual(expect.any(Number));
    } finally { off(); }
  });

  it.each(["demo@dubbed.test", "unknown@example.com"])("locks %s after five wrong attempts for exactly 60 seconds", async (email) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    for (let i = 0; i < 4; i++) expect(await signIn(email, password)).toEqual({ ok: false, error: "wrong-credentials" });
    const until = Date.now() + 60_000;
    expect(await signIn(` ${email.toUpperCase()} `, password)).toEqual({ ok: false, error: "locked", until });
    expect(await signIn(email)).toEqual({ ok: false, error: "locked", until });
    vi.setSystemTime(until - 1);
    expect(await signIn(email)).toEqual({ ok: false, error: "locked", until });
    vi.setSystemTime(until);
    if (email === "demo@dubbed.test") expect((await signIn(email)).ok).toBe(true);
    else expect(await signIn(email)).toEqual({ ok: false, error: "wrong-credentials" });
  });

  it("keeps counters per email and resets the counter after success", async () => {
    for (let i = 0; i < 4; i++) expect(await signIn("demo@dubbed.test", password)).toEqual({ ok: false, error: "wrong-credentials" });
    expect(await signIn("unknown@example.com", password)).toEqual({ ok: false, error: "wrong-credentials" });
    expect((await signIn()).ok).toBe(true);
    expect(await authDb.read(["throttle"], (s) => authDb.req(s.throttle.get("demo@dubbed.test")))).toBeUndefined();
    for (let i = 0; i < 4; i++) expect(await signIn("demo@dubbed.test", password)).toEqual({ ok: false, error: "wrong-credentials" });
  });

  it.each(["verify", "microphone"] as const)("resumes an unfinished %s account without opening data", async (stage) => {
    const correct = await signUp();
    if (stage === "microphone") await verify(correct);
    await services.auth.signOut();
    expect(await signIn(" NEW@EXAMPLE.COM ", password)).toMatchObject({ ok: true, value: { stage, email: "new@example.com" } });
    await expect(services.account.get()).rejects.toMatchObject({ reason: "inactive" });
    expect((await indexedDB.databases()).map((entry) => entry.name)).toEqual(["dubbed-mock-auth"]);
  });

  it("returns google-only for an account without a password", async () => {
    await selectAccount("google");
    await services.auth.signOut();
    expect(await signIn(" GOOGLE@EXAMPLE.COM ", password)).toEqual({ ok: false, error: "google-only" });
    expect(await services.auth.session()).toBeNull();
  });

  it("consumes fail:auth without creating a session or counting a wrong attempt", async () => {
    await services.demo!.set({ failAuth: true });
    expect(await signIn("demo@dubbed.test", password)).toEqual({ ok: false, error: "storage" });
    expect(await services.auth.session()).toBeNull();
    expect(await authDb.read(["throttle", "sessions"], async (s) => [await authDb.req(s.throttle.count()), await authDb.req(s.sessions.count())])).toEqual([0, 0]);
    expect((await signIn()).ok).toBe(true);
  });
});

async function google(email = "google@example.com", name = "Google Person") {
  const result = await services.auth.google({ email, name });
  secrets.check(result);
  return result;
}

async function resetCode(email = "demo@dubbed.test") {
  const result = await services.auth.startReset(email);
  secrets.check(result);
  expect(result.ok).toBe(true);
  const live = await services.demo!.lastCode(email, "reset");
  expect(live).toMatch(/^\d{6}$/);
  secretValues.push(live!);
  return live!;
}

async function checkReset(value: string, email = "demo@dubbed.test") {
  secretValues.push(value);
  const result = await services.auth.checkResetCode({ email, code: value });
  secrets.check(result);
  return result;
}

async function resetTicket(email = "demo@dubbed.test") {
  const result = await checkReset(await resetCode(email), email);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Expected reset ticket");
  return result.value;
}

async function finish(ticket: string, value = password) {
  secretValues.push(value);
  const result = await services.auth.finishReset({ ticket, password: value });
  secrets.check(result);
  return result;
}

describe("Google sign-in", () => {
  it("creates a normalised Google-only microphone account, no code or data, then resumes it", async () => {
    const events: unknown[] = [];
    const off = services.subscribe((event) => events.push(event));
    try {
      expect(await google(" GOOGLE@EXAMPLE.COM ")).toMatchObject({ ok: true, value: { email: "google@example.com", stage: "microphone", hasPassword: false, googleName: "Google Person" } });
      const account = (await authDb.currentAccount())!;
      expect(account).toMatchObject({ passwordHash: null, activatedAt: null });
      expect(await authDb.read(["codes"], (s) => authDb.req(s.codes.count()))).toBe(0);
      expect((await indexedDB.databases()).map((entry) => entry.name)).toEqual(["dubbed-mock-auth"]);
      await services.auth.signOut();
      expect(await signIn("google@example.com", password)).toEqual({ ok: false, error: "google-only" });
      expect(await google()).toMatchObject({ ok: true, value: { accountId: account.id, stage: "microphone" } });
      expect(events).toEqual([{ kind: "session" }, { kind: "session" }, { kind: "session" }]);
    } finally { off(); }
  });

  it("links the demo account without replacing its password or stage or creating a second account", async () => {
    expect(await google(" DEMO@DUBBED.TEST ", "Demo Name")).toEqual({ ok: true, value: { accountId: "demo", email: "demo@dubbed.test", stage: "active", hasPassword: true, googleName: "Demo Name" } });
    expect(await authDb.read(["accounts"], (s) => authDb.req(s.accounts.count()))).toBe(1);
    expect((await signIn()).ok).toBe(true);
  });

  it.each(["verify", "microphone", "active"] as const)("links an existing %s account, proving the email without resetting onboarding or data", async (stage) => {
    const correct = await signUp();
    if (stage !== "verify") await verify(correct);
    if (stage === "active") {
      const activated = await services.auth.completeMicrophone();
      secrets.check(activated);
      expect(activated.ok).toBe(true);
      await services.demo!.set({ balance: 90 });
    }
    const before = (await authDb.currentAccount())!;
    const dataBefore = stage === "active" ? {
      account: await services.account.get(), projects: await services.projects.list(), history: await db.getAll("history"),
    } : null;
    await services.auth.signOut();
    const events: unknown[] = [];
    const off = services.subscribe((event) => events.push(event));
    const nextStage = stage === "verify" ? "microphone" : stage;
    try {
      expect(await google(" NEW@EXAMPLE.COM ")).toEqual({ ok: true, value: {
        accountId: before.id, email: before.email, stage: nextStage, hasPassword: true, googleName: "Google Person",
      } });
      expect(events).toEqual([{ kind: "session" }]);
      expect(await authDb.currentAccount()).toEqual({ ...before, google: { name: "Google Person" }, stage: nextStage });
      expect(await authDb.read(["accounts"], (s) => authDb.req(s.accounts.count()))).toBe(2);
      expect(await authDb.read(["codes"], (s) => authDb.req(s.codes.get([before.id, "verify"])))).toBeUndefined();
      if (dataBefore) {
        expect({ account: await services.account.get(), projects: await services.projects.list(), history: await db.getAll("history") }).toEqual(dataBefore);
      } else {
        await expect(services.account.get()).rejects.toMatchObject({ reason: "inactive" });
        expect((await indexedDB.databases()).map((entry) => entry.name)).toEqual(["dubbed-mock-auth"]);
      }
      await services.auth.signOut();
      expect(await signIn("new@example.com", password)).toMatchObject({ ok: true, value: { accountId: before.id, stage: nextStage, hasPassword: true } });
    } finally { off(); }
  });

  it("consumes each failure flag without creating anything, then succeeds", async () => {
    await services.demo!.set({ failAuth: true, googleFail: true });
    expect(await google()).toEqual({ ok: false, error: "storage" });
    expect(await google()).toEqual({ ok: false, error: "failed" });
    expect(await services.auth.session()).toBeNull();
    expect(await authDb.read(["accounts", "sessions"], async (s) => [await authDb.req(s.accounts.count()), await authDb.req(s.sessions.count())])).toEqual([1, 0]);
    expect((await google()).ok).toBe(true);
  });
});

describe("password reset", () => {
  it("returns identical send and throttle metadata for known and unknown normalised emails, including resend", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const now = Date.now();
    const emails = ["demo@dubbed.test", "unknown@example.com"];
    for (const email of emails) {
      const result = await services.auth.startReset(` ${email.toUpperCase()} `);
      secrets.check(result);
      expect(result).toEqual({ ok: true, value: { email, resendAt: now + 60_000, expiresAt: now + 600_000 } });
    }
    expect(await services.demo!.lastCode(emails[1]!, "reset")).toBeNull();
    const old = await services.demo!.lastCode(emails[0]!, "reset");
    secretValues.push(old!);
    for (const email of emails) {
      for (const run of [() => services.auth.startReset(email), () => services.auth.resendCode("reset", ` ${email.toUpperCase()} `)]) {
        const result = await run();
        secrets.check(result);
        expect(result).toEqual({ ok: false, error: "too-soon", until: now + 60_000 });
      }
    }
    vi.setSystemTime(now + 60_000);
    for (const email of emails) {
      const result = await services.auth.resendCode("reset", email);
      secrets.check(result);
      expect(result).toEqual({ ok: true, value: { email, resendAt: now + 120_000, expiresAt: now + 660_000 } });
    }
    const next = await services.demo!.lastCode(emails[0]!, "reset");
    secretValues.push(next!);
    expect(next).not.toBe(old);
    expect(await checkReset(old!)).toEqual({ ok: false, error: "wrong-code", attemptsLeft: 4 });
    vi.setSystemTime(now + 120_000);
    for (const email of emails) {
      const result = await services.auth.startReset(email);
      secrets.check(result);
      expect(result).toEqual({ ok: true, value: { email, resendAt: now + 180_000, expiresAt: now + 720_000 } });
    }
    const invalid = await services.auth.startReset("bad");
    secrets.check(invalid);
    expect(invalid).toEqual({ ok: false, error: "invalid-email" });
  });

  it("retains reset cooldown across a successful password sign-in without losing sign-in lockout", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const now = Date.now();
    await resetCode();
    expect((await signIn()).ok).toBe(true);
    const early = await services.auth.startReset("demo@dubbed.test");
    secrets.check(early);
    expect(early).toEqual({ ok: false, error: "too-soon", until: now + 60_000 });
    for (let i = 0; i < 5; i++) await signIn("demo@dubbed.test", password);
    vi.setSystemTime(now + 60_000);
    await resetCode();
    expect((await signIn()).ok).toBe(true);
  });

  it("never issues a ticket for wrong, dead, expired or missing codes; resend resets attempts", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const live = await resetCode();
    for (let i = 1; i < 5; i++) expect(await checkReset("not-a-code")).toEqual({ ok: false, error: "wrong-code", attemptsLeft: 5 - i });
    expect(await checkReset("not-a-code")).toEqual({ ok: false, error: "attempts" });
    expect(await checkReset(live)).toEqual({ ok: false, error: "attempts" });
    expect(await services.demo!.lastCode("demo@dubbed.test", "reset")).toBeNull();
    expect((await authDb.read(["codes"], (s) => authDb.req(s.codes.getAll())) as { purpose: string }[]).some((entry) => entry.purpose === "reset-ticket")).toBe(false);
    vi.setSystemTime(Date.now() + 60_000);
    const next = await resetCode();
    vi.setSystemTime(Date.now() + 600_000);
    expect(await checkReset(next)).toEqual({ ok: false, error: "expired" });
    expect(await services.demo!.lastCode("demo@dubbed.test", "reset")).toBeNull();
    expect(await checkReset(next, "unknown@example.com")).toEqual({ ok: false, error: "expired" });
  });

  it("uses a correct code once and a ticket once, with expiry measured from confirmation", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const live = await resetCode();
    vi.setSystemTime(Date.now() + 599_999);
    const confirmedAt = Date.now();
    const result = await checkReset(live, " DEMO@DUBBED.TEST ");
    expect(result).toMatchObject({ ok: true, value: { ticket: expect.any(String), expiresAt: confirmedAt + 600_000 } });
    if (!result.ok) throw new Error("Expected ticket");
    expect(await checkReset(live)).toEqual({ ok: false, error: "expired" });
    expect(await services.demo!.lastCode("demo@dubbed.test", "reset")).toBeNull();
    expect(await finish(result.value.ticket, "1234567")).toEqual({ ok: false, error: "weak-password" });
    vi.setSystemTime(confirmedAt + 599_999);
    expect(await finish(result.value.ticket)).toMatchObject({ ok: true, value: { stage: "active" } });
    expect(await finish(result.value.ticket)).toEqual({ ok: false, error: "expired" });
    const expired = await resetTicket();
    vi.setSystemTime(expired.expiresAt);
    expect(await finish(expired.ticket)).toEqual({ ok: false, error: "expired" });
  });

  it("changes the password, revokes every prior account session but not another account, and emits session", async () => {
    await signIn();
    await signIn();
    await authDb.write(["sessions"], (s) => s.sessions.put({ id: "unrelated", accountId: "another", createdAt: 1, revokedAt: null } satisfies authDb.AuthSession));
    const ticket = await resetTicket();
    const events: unknown[] = [];
    const off = services.subscribe((event) => events.push(event));
    try {
      expect(await finish(ticket.ticket)).toMatchObject({ ok: true, value: { accountId: "demo", hasPassword: true, stage: "active" } });
      expect(events).toEqual([{ kind: "session" }]);
      const current = await authDb.read(["kv"], (s) => authDb.req(s.kv.get("current")));
      const sessions = await authDb.read(["sessions"], (s) => authDb.req(s.sessions.getAll())) as authDb.AuthSession[];
      expect(sessions.filter((entry) => entry.accountId === "demo" && entry.revokedAt === null).map((entry) => entry.id)).toEqual([current]);
      expect(sessions.find((entry) => entry.id === "unrelated")!.revokedAt).toBeNull();
      for (const session of sessions.filter((entry) => entry.accountId === "demo" && entry.id !== current)) {
        expect(session.revokedAt).toEqual(expect.any(Number));
        await authDb.write(["kv"], (s) => s.kv.put(session.id, "current"));
        expect(await services.auth.session()).toBeNull();
      }
      await authDb.write(["kv"], (s) => s.kv.put(current, "current"));
      await services.auth.signOut();
      expect(await signIn()).toEqual({ ok: false, error: "wrong-credentials" });
      expect((await signIn("demo@dubbed.test", password)).ok).toBe(true);
    } finally { off(); }
  });

  it.each(["verify", "microphone", "google"] as const)("resets a %s account without activating it or losing Google", async (kind) => {
    const email = kind === "google" ? "google@example.com" : "new@example.com";
    if (kind === "google") await google();
    else {
      const live = await signUp();
      if (kind === "microphone") await verify(live);
    }
    const ticket = await resetTicket(email);
    expect(await finish(ticket.ticket)).toMatchObject({ ok: true, value: { email, stage: "microphone", hasPassword: true, googleName: kind === "google" ? "Google Person" : null } });
    expect((await signIn(email, password)).ok).toBe(true);
    expect((await authDb.currentAccount())!.google).toEqual(kind === "google" ? { name: "Google Person" } : null);
    expect((await indexedDB.databases()).map((entry) => entry.name)).toEqual(["dubbed-mock-auth"]);
  });

  it("code:expire expires an issued ticket too", async () => {
    const ticket = await resetTicket();
    await services.demo!.set({ codeExpire: true });
    expect(await finish(ticket.ticket)).toEqual({ ok: false, error: "expired" });
    expect(await services.auth.session()).toBeNull();
    expect((await signIn()).ok).toBe(true);
  });

  it("consumes fail:auth at every reset method without using up the code or ticket", async () => {
    for (const run of [() => services.auth.startReset("demo@dubbed.test"), () => services.auth.resendCode("reset", "demo@dubbed.test")]) {
      await services.demo!.set({ failAuth: true });
      const result = await run();
      secrets.check(result);
      expect(result).toEqual({ ok: false, error: "storage" });
      expect(await authDb.read(["throttle", "codes"], async (s) => [await authDb.req(s.throttle.count()), await authDb.req(s.codes.count())])).toEqual([0, 0]);
    }
    const live = await resetCode();
    await services.demo!.set({ failAuth: true });
    expect(await checkReset(live)).toEqual({ ok: false, error: "storage" });
    expect(await services.demo!.lastCode("demo@dubbed.test", "reset")).toBe(live);
    const result = await checkReset(live);
    if (!result.ok) throw new Error("Expected ticket");
    await services.demo!.set({ failAuth: true });
    expect(await finish(result.value.ticket)).toEqual({ ok: false, error: "storage" });
    expect(await services.auth.session()).toBeNull();
    expect(await finish(result.value.ticket)).toMatchObject({ ok: true, value: { hasPassword: true } });
  });
});

describe("mock auth foundation", () => {
  it("seeds only the hashed demo account and no session on a fresh install", async () => {
    expect(await services.auth.session()).toBeNull();
    const accounts = await authDb.read(["accounts"], (s) => authDb.req(s.accounts.getAll())) as authDb.AuthAccount[];
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({ id: "demo", email: "demo@dubbed.test", stage: "active", dataDb: "dubbed-mock", google: null });
    expect(await authDb.checkPassword("dubbed-demo", accounts[0]!.passwordHash)).toBe(true);
    expect(JSON.stringify(accounts)).not.toContain("dubbed-demo");
    expect(await authDb.read(["sessions", "kv"], async (s) => [await authDb.req(s.sessions.count()), await authDb.req(s.kv.get("current"))])).toEqual([0, undefined]);
  });

  it("resets all accounts and data and signs out", async () => {
    await selectAccount("other");
    await services.demo!.set({ balance: 40 });
    const changedHash = await authDb.hashPassword("changed-demo-password");
    await authDb.write(["accounts"], async (s) => {
      const demo = await authDb.req(s.accounts.get("demo")) as authDb.AuthAccount;
      s.accounts.put({ ...demo, passwordHash: changedHash });
    });
    await services.demo!.reset();
    expect(await services.auth.session()).toBeNull();
    const accounts = await authDb.read(["accounts"], (s) => authDb.req(s.accounts.getAll())) as authDb.AuthAccount[];
    expect(accounts.map((a) => a.id)).toEqual(["demo"]);
    expect(await authDb.checkPassword("dubbed-demo", accounts[0]!.passwordHash)).toBe(true);
    expect((await indexedDB.databases()).map((entry) => entry.name)).not.toContain("dubbed-mock-other");
    await services.demo!.set({ signin: true });
    expect((await services.account.get()).balance).toBe(120);
  });

  it("looks up live codes and expires codes and tickets", async () => {
    await authDb.write(["codes"], (s) => {
      s.codes.put({ accountId: "demo", purpose: "verify", code, sentAt: Date.now(), expiresAt: Date.now() + 10000, wrongAttempts: 0 });
      s.codes.put({ accountId: "demo", purpose: "reset-ticket", ticket: "ticket", expiresAt: Date.now() + 10000 });
    });
    expect(await services.demo!.lastCode(" DEMO@DUBBED.TEST ", "verify")).toBe(code);
    await services.demo!.set({ codeExpire: true });
    expect(await services.demo!.lastCode("demo@dubbed.test", "verify")).toBeNull();
    const records = await authDb.read(["codes"], (s) => authDb.req(s.codes.getAll())) as { expiresAt: number }[];
    expect(records.every((record) => record.expiresAt === 0)).toBe(true);
  });

  it("fails one auth mutation before allowing the configured Google failure", async () => {
    await services.demo!.set({ failAuth: true, googleFail: true });
    expect(await services.auth.google({ email: "test@example.com", name: "Test" })).toEqual({ ok: false, error: "storage" });
    expect(await services.auth.google({ email: "test@example.com", name: "Test" })).toEqual({ ok: false, error: "failed" });
    expect(await services.auth.google({ email: "test@example.com", name: "Test" })).toMatchObject({ ok: true, value: { stage: "microphone" } });
  });

  it("hashes with a random 16-byte salt and verifies only the correct password", async () => {
    const first = await authDb.hashPassword(password);
    const second = await authDb.hashPassword(password);
    expect(first.salt).toHaveLength(32);
    expect(first.hash).toHaveLength(64);
    expect(first).not.toEqual(second);
    expect(await authDb.hashPassword(password, first.salt)).toEqual(first);
    expect(await authDb.checkPassword(password, first)).toBe(true);
    expect(await authDb.checkPassword("wrong", first)).toBe(false);
    expect(await authDb.checkPassword(password, null)).toBe(false);
  });

  it("supports explicit demo signin, then revokes only that session and emits session", async () => {
    const events: unknown[] = [];
    const off = services.subscribe((event) => events.push(event));
    try {
      await services.demo!.set({ signin: true });
      expect(await services.auth.session()).toEqual({ accountId: "demo", email: "demo@dubbed.test", stage: "active", hasPassword: true, googleName: null });
      await authDb.write(["sessions"], (s) => s.sessions.put({ id: "other-session", accountId: "demo", createdAt: 1, revokedAt: null }));
      await services.auth.signOut();
      expect(await services.auth.session()).toBeNull();
      expect(events).toContainEqual({ kind: "session" });
      const sessions = await authDb.read(["sessions"], (s) => authDb.req(s.sessions.getAll())) as authDb.AuthSession[];
      expect(sessions.find((s) => s.id !== "other-session")?.revokedAt).toEqual(expect.any(Number));
      expect(sessions.find((s) => s.id === "other-session")?.revokedAt).toBeNull();
    } finally { off(); }
  });

  it("treats revoked, missing and orphaned sessions as guests", async () => {
    await services.demo!.set({ signin: true });
    await authDb.write(["sessions", "kv"], async (s) => {
      const id = await authDb.req(s.kv.get("current"));
      const session = await authDb.req(s.sessions.get(id));
      s.sessions.put({ ...session, revokedAt: Date.now() });
    });
    expect(await services.auth.session()).toBeNull();
    await authDb.write(["kv"], (s) => s.kv.put("missing", "current"));
    expect(await services.auth.session()).toBeNull();
    await services.demo!.set({ signin: true });
    await authDb.write(["accounts"], (s) => s.accounts.delete("demo"));
    expect(await services.auth.session()).toBeNull();
  });

  it("ignores data presets for guests and unfinished accounts", async () => {
    await services.demo!.set({ balance: 40 });
    await selectAccount("other", "verify");
    await services.demo!.set({ fillSlots: true });
    expect(db.currentAccountId()).toBeNull();
    expect((await indexedDB.databases()).map((entry) => entry.name)).toEqual(["dubbed-mock-auth"]);
  });

  it("never creates a data database for guests or unfinished accounts", async () => {
    await expect(db.getAll("projects")).rejects.toMatchObject({ name: "DataAccessError", reason: "guest" });
    for (const stage of ["verify", "microphone"] as const) {
      await selectAccount("other", stage);
      await expect(db.getAll("projects")).rejects.toMatchObject({ name: "DataAccessError", reason: "inactive" });
    }
    expect(db.currentAccountId()).toBeNull();
    expect((await indexedDB.databases()).map((entry) => entry.name)).toEqual(["dubbed-mock-auth"]);
  });

  it("isolates account data across full reloads and blocks in-place account retargeting", async () => {
    await services.demo!.set({ signin: true });
    await services.demo!.set({ fillSlots: true });
    const projectsA = await services.projects.list();
    expect(projectsA).toHaveLength(2);
    expect(db.currentAccountId()).toBe("demo");
    await selectAccount("other");
    await expect(services.projects.list()).rejects.toMatchObject({ name: "DataAccessError", reason: "account-changed" });
    // R3: simulate disposing the old tab's adapter on a full navigation, not switching it in place.
    await db.closeDataDb();
    services = createMockServices();
    expect(await services.projects.list()).toEqual([]);
    expect(await services.account.get()).toMatchObject({ balance: 120, slotLimit: 2, slotsUsed: 0 });
    expect(await db.getAll("history")).toEqual([expect.objectContaining({ id: "welcome", amount: 120 })]);
    expect(db.currentAccountId()).toBe("other");
    await db.closeDataDb();
    await services.demo!.set({ signin: true });
    services = createMockServices();
    expect(await services.projects.list()).toEqual(projectsA);
    await services.auth.signOut();
    await expect(db.getAll("projects")).rejects.toMatchObject({ reason: "guest" });
  });

  it("keeps auth storage errors free of passwords and codes", async () => {
    const failure = await authDb.write(["kv"], () => { throw new Error(password + code); }).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(Error);
    secrets.check(failure);
  });

  it("rolls back an auth write and enforces the unique email index", async () => {
    await expect(authDb.write(["kv"], (s) => { s.kv.put("value", "rollback"); throw new Error("stop"); })).rejects.toThrow("Auth storage unavailable.");
    expect(await authDb.read(["kv"], (s) => authDb.req(s.kv.get("rollback")))).toBeUndefined();
    const demo = await authDb.currentAccount();
    expect(demo).toBeNull();
    const account = await authDb.read(["accounts"], (s) => authDb.req(s.accounts.get("demo")));
    await expect(authDb.write(["accounts"], (s) => { s.accounts.put({ ...account, id: "duplicate" }); })).rejects.toThrow("Auth storage unavailable.");
    expect(await authDb.read(["accounts"], (s) => authDb.req(s.accounts.count()))).toBe(1);
  });
});
