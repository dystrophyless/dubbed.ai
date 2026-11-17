import type { AuthPort, CodeSent, Session } from "../contracts";
import { CODE_TTL_MS, RESEND_MS, MAX_CODE_ATTEMPTS, MAX_SIGNIN_WRONG, LOCK_MS, RESET_TICKET_MS, isEmail, isPassword, normaliseEmail } from "../rules/auth";
import { currentAccount, hashPassword, checkPassword, read, req, write, type AuthAccount, type AuthSession, type EmailCode, type ResetTicket, type SignInThrottle } from "./auth-db";
import { emit, get } from "./db";

const storage = async () => ({ ok: false as const, error: "storage" as const });
const toSession = (account: AuthAccount): Session => ({ accountId: account.id, email: account.email, stage: account.stage,
  hasPassword: account.passwordHash !== null, googleName: account.google?.name ?? null });

async function pendingAccount(s: Record<string, IDBObjectStore>): Promise<AuthAccount | null> {
  const id = await req(s.kv!.get("current")) as string | undefined;
  if (!id) return null;
  const session = await req(s.sessions!.get(id)) as AuthSession | undefined;
  if (!session || session.revokedAt !== null) return null;
  return (await req(s.accounts!.get(session.accountId)) as AuthAccount | undefined) ?? null;
}

function newCode(accountId: string, previous?: string): EmailCode {
  let code: string;
  do {
    // Rejection sampling avoids modulo bias while keeping leading zeroes.
    let digits = "";
    while (digits.length < 6) {
      for (const byte of crypto.getRandomValues(new Uint8Array(12))) {
        if (byte < 250 && digits.length < 6) digits += String(byte % 10);
      }
    }
    code = digits;
  } while (code === previous);
  const sentAt = Date.now();
  return { accountId, purpose: "verify", code, sentAt, expiresAt: sentAt + CODE_TTL_MS, wrongAttempts: 0 };
}
const sent = (email: string, code: EmailCode): CodeSent => ({ email, resendAt: code.sentAt + RESEND_MS, expiresAt: code.expiresAt });

export function createMockAuth(flags: { failAuth: boolean; googleFail: boolean } = { failAuth: false, googleFail: false }): AuthPort {
  const consumeFailure = () => { const fail = flags.failAuth; flags.failAuth = false; return fail; };
  const sendReset = async (email: string) => {
    try {
      return await write(["accounts", "codes", "throttle"], async (s) => {
        const now = Date.now();
        const throttle = await req(s.throttle.get(email)) as SignInThrottle | undefined;
        if (throttle?.resetSentAt !== undefined && now < throttle.resetSentAt + RESEND_MS) {
          return { ok: false as const, error: "too-soon" as const, until: throttle.resetSentAt + RESEND_MS };
        }
        s.throttle.put({ wrong: 0, lockedUntil: null, ...throttle, resetSentAt: now } satisfies SignInThrottle, email);
        const account = await req(s.accounts.index("email").get(email)) as AuthAccount | undefined;
        if (account) {
          const old = await req(s.codes.get([account.id, "reset"])) as EmailCode | undefined;
          s.codes.put({ ...newCode(account.id, old?.code), purpose: "reset", sentAt: now, expiresAt: now + CODE_TTL_MS });
        }
        return { ok: true as const, value: { email, resendAt: now + RESEND_MS, expiresAt: now + CODE_TTL_MS } };
      });
    } catch { return storage(); }
  };
  return {
    async session(): Promise<Session | null> {
      const account = await currentAccount();
      return account ? toSession(account) : null;
    },
    async signOut() {
      await write(["kv", "sessions"], async (s) => {
        const id = await req(s.kv.get("current")) as string | undefined;
        if (id) {
          const session = await req(s.sessions.get(id)) as AuthSession | undefined;
          if (session && session.revokedAt === null) s.sessions.put({ ...session, revokedAt: Date.now() });
        }
        s.kv.delete("current");
      });
      emit({ kind: "session" });
    },
    async signUp({ email, password }) {
      if (consumeFailure()) return storage();
      email = normaliseEmail(email);
      if (!isEmail(email)) return { ok: false, error: "invalid-email" };
      if (!isPassword(password)) return { ok: false, error: "weak-password" };
      try {
        const passwordHash = await hashPassword(password);
        const result = await write(["accounts", "sessions", "kv", "codes"], async (s) => {
          if (await req(s.accounts.index("email").get(email))) return { ok: false as const, error: "email-taken" as const };
          const id = crypto.randomUUID();
          const account: AuthAccount = { id, email, passwordHash, google: null, stage: "verify", createdAt: Date.now(), activatedAt: null, dataDb: `dubbed-mock-${id}` };
          const session: AuthSession = { id: crypto.randomUUID(), accountId: id, createdAt: Date.now(), revokedAt: null };
          const code = newCode(id);
          s.accounts.put(account);
          s.sessions.put(session);
          s.kv.put(session.id, "current");
          s.codes.put(code);
          return { ok: true as const, value: sent(email, code) };
        });
        if (result.ok) emit({ kind: "session" });
        return result;
      } catch { return storage(); }
    },
    async changeEmail(email) {
      if (consumeFailure()) return storage();
      email = normaliseEmail(email);
      if (!isEmail(email)) return { ok: false, error: "invalid-email" };
      try {
        const result = await write(["accounts", "sessions", "kv", "codes"], async (s) => {
          const account = await pendingAccount(s);
          if (!account || account.stage !== "verify") return { ok: false as const, error: "storage" as const };
          if (await req(s.accounts.index("email").get(email))) return { ok: false as const, error: "email-taken" as const };
          const old = await req(s.codes.get([account.id, "verify"])) as EmailCode | undefined;
          const code = newCode(account.id, old?.code);
          s.accounts.put({ ...account, email });
          s.codes.put(code);
          return { ok: true as const, value: sent(email, code) };
        });
        if (result.ok) emit({ kind: "session" });
        return result;
      } catch { return storage(); }
    },
    async resendCode(purpose, email) {
      if (consumeFailure()) return storage();
      if (purpose === "reset") {
        if (!email || !isEmail(normaliseEmail(email))) return storage();
        return sendReset(normaliseEmail(email));
      }
      try {
        return await write(["accounts", "sessions", "kv", "codes"], async (s) => {
          const account = await pendingAccount(s);
          if (!account || account.stage !== "verify") return { ok: false as const, error: "storage" as const };
          const old = await req(s.codes.get([account.id, purpose])) as EmailCode | undefined;
          if (old && Date.now() < old.sentAt + RESEND_MS) return { ok: false as const, error: "too-soon" as const, until: old.sentAt + RESEND_MS };
          const code = newCode(account.id, old?.code);
          s.codes.put(code);
          return { ok: true as const, value: sent(account.email, code) };
        });
      } catch { return storage(); }
    },
    async verifyEmail(code) {
      if (consumeFailure()) return storage();
      try {
        const result = await write(["accounts", "sessions", "kv", "codes"], async (s) => {
          const account = await pendingAccount(s);
          if (!account || account.stage !== "verify") return { ok: false as const, error: "storage" as const };
          const record = await req(s.codes.get([account.id, "verify"])) as EmailCode | undefined;
          if (!record) return { ok: false as const, error: "expired" as const };
          if (record.wrongAttempts >= MAX_CODE_ATTEMPTS) return { ok: false as const, error: "attempts" as const };
          if (Date.now() >= record.expiresAt) return { ok: false as const, error: "expired" as const };
          if (code !== record.code) {
            const wrongAttempts = record.wrongAttempts + 1;
            s.codes.put({ ...record, wrongAttempts });
            return wrongAttempts >= MAX_CODE_ATTEMPTS
              ? { ok: false as const, error: "attempts" as const }
              : { ok: false as const, error: "wrong-code" as const, attemptsLeft: MAX_CODE_ATTEMPTS - wrongAttempts };
          }
          const next: AuthAccount = { ...account, stage: "microphone" };
          s.accounts.put(next);
          s.codes.delete([account.id, "verify"]);
          return { ok: true as const, value: toSession(next) };
        });
        if (result.ok) emit({ kind: "session" });
        return result;
      } catch { return storage(); }
    },
    async completeMicrophone() {
      if (consumeFailure()) return storage();
      try {
        const result = await write(["accounts", "sessions", "kv"], async (s) => {
          const account = await pendingAccount(s);
          if (!account) return null;
          if (account.stage !== "microphone") return { account, activated: false };
          const next: AuthAccount = { ...account, stage: "active", activatedAt: Date.now() };
          s.accounts.put(next);
          return { account: next, activated: true };
        });
        if (!result) return storage();
        if (result.activated) {
          // Opening the fresh data DB atomically seeds the account and fixed-id welcome row.
          await get("kv", "account");
          emit({ kind: "session" });
        }
        return { ok: true, value: toSession(result.account) };
      } catch { return storage(); }
    },
    async signIn({ email, password }) {
      if (consumeFailure()) return storage();
      email = normaliseEmail(email);
      try {
        const candidate = await read(["accounts"], (s) => req(s.accounts.index("email").get(email))) as AuthAccount | undefined;
        // Web Crypto must finish outside the IndexedDB write transaction.
        const matches = candidate ? await checkPassword(password, candidate.passwordHash) : false;
        const result = await write(["accounts", "throttle", "sessions", "kv"], async (s) => {
          const now = Date.now();
          const throttle = await req(s.throttle.get(email)) as SignInThrottle | undefined;
          if (throttle?.lockedUntil && now < throttle.lockedUntil) return { ok: false as const, error: "locked" as const, until: throttle.lockedUntil };
          const account = await req(s.accounts.index("email").get(email)) as AuthAccount | undefined;
          if (account && !account.passwordHash) return { ok: false as const, error: "google-only" as const };
          if (!account || !matches || account.id !== candidate?.id || account.passwordHash?.hash !== candidate.passwordHash?.hash || account.passwordHash?.salt !== candidate.passwordHash?.salt) {
            const wrong = (throttle?.lockedUntil ? 0 : throttle?.wrong ?? 0) + 1;
            const lockedUntil = wrong >= MAX_SIGNIN_WRONG ? now + LOCK_MS : null;
            s.throttle.put({ ...throttle, wrong, lockedUntil } satisfies SignInThrottle, email);
            return lockedUntil === null
              ? { ok: false as const, error: "wrong-credentials" as const }
              : { ok: false as const, error: "locked" as const, until: lockedUntil };
          }
          const session: AuthSession = { id: crypto.randomUUID(), accountId: account.id, createdAt: now, revokedAt: null };
          if (throttle?.resetSentAt !== undefined) s.throttle.put({ wrong: 0, lockedUntil: null, resetSentAt: throttle.resetSentAt } satisfies SignInThrottle, email);
          else s.throttle.delete(email);
          s.sessions.put(session);
          s.kv.put(session.id, "current");
          return { ok: true as const, value: toSession(account) };
        });
        if (result.ok) emit({ kind: "session" });
        return result;
      } catch { return storage(); }
    },
    async google({ email, name }) {
      if (consumeFailure()) return storage();
      if (flags.googleFail) { flags.googleFail = false; return { ok: false, error: "failed" }; }
      email = normaliseEmail(email);
      try {
        const result = await write(["accounts", "sessions", "kv", "codes"], async (s) => {
          const existing = await req(s.accounts.index("email").get(email)) as AuthAccount | undefined;
          const id = existing?.id ?? crypto.randomUUID();
          const account: AuthAccount = existing ? { ...existing, google: { name }, stage: existing.stage === "verify" ? "microphone" : existing.stage } : {
            id, email, passwordHash: null, google: { name }, stage: "microphone", createdAt: Date.now(), activatedAt: null, dataDb: `dubbed-mock-${id}`,
          };
          const session: AuthSession = { id: crypto.randomUUID(), accountId: id, createdAt: Date.now(), revokedAt: null };
          s.accounts.put(account);
          if (existing?.stage === "verify") s.codes.delete([id, "verify"]);
          s.sessions.put(session);
          s.kv.put(session.id, "current");
          return { ok: true as const, value: toSession(account) };
        });
        emit({ kind: "session" });
        return result;
      } catch { return storage(); }
    },
    async startReset(email) {
      if (consumeFailure()) return storage();
      email = normaliseEmail(email);
      if (!isEmail(email)) return { ok: false, error: "invalid-email" };
      return sendReset(email);
    },
    async checkResetCode({ email, code }) {
      if (consumeFailure()) return storage();
      email = normaliseEmail(email);
      try {
        return await write(["accounts", "codes"], async (s) => {
          const account = await req(s.accounts.index("email").get(email)) as AuthAccount | undefined;
          const record = account ? await req(s.codes.get([account.id, "reset"])) as EmailCode | undefined : undefined;
          if (!record) return { ok: false as const, error: "expired" as const };
          if (record.wrongAttempts >= MAX_CODE_ATTEMPTS) return { ok: false as const, error: "attempts" as const };
          if (Date.now() >= record.expiresAt) return { ok: false as const, error: "expired" as const };
          if (record.code !== code) {
            const wrongAttempts = record.wrongAttempts + 1;
            s.codes.put({ ...record, wrongAttempts });
            return wrongAttempts >= MAX_CODE_ATTEMPTS
              ? { ok: false as const, error: "attempts" as const }
              : { ok: false as const, error: "wrong-code" as const, attemptsLeft: MAX_CODE_ATTEMPTS - wrongAttempts };
          }
          const ticket = crypto.randomUUID();
          const expiresAt = Date.now() + RESET_TICKET_MS;
          s.codes.delete([record.accountId, "reset"]);
          s.codes.put({ accountId: record.accountId, purpose: "reset-ticket", ticket, expiresAt } satisfies ResetTicket);
          return { ok: true as const, value: { ticket, expiresAt } };
        });
      } catch { return storage(); }
    },
    async finishReset({ ticket, password }) {
      if (consumeFailure()) return storage();
      try {
        // Hash outside the transaction; ticket validity is checked atomically before changing anything.
        const passwordHash = isPassword(password) ? await hashPassword(password) : null;
        const result = await write(["accounts", "codes", "sessions", "kv"], async (s) => {
          const records = await req(s.codes.getAll()) as (EmailCode | ResetTicket)[];
          const record = records.find((entry): entry is ResetTicket => entry.purpose === "reset-ticket" && entry.ticket === ticket);
          if (!record || Date.now() >= record.expiresAt) return { ok: false as const, error: "expired" as const };
          const account = await req(s.accounts.get(record.accountId)) as AuthAccount | undefined;
          if (!account) return { ok: false as const, error: "expired" as const };
          if (!passwordHash) return { ok: false as const, error: "weak-password" as const };
          const now = Date.now();
          const next: AuthAccount = { ...account, passwordHash, stage: account.stage === "verify" ? "microphone" : account.stage };
          const sessions = await req(s.sessions.getAll()) as AuthSession[];
          for (const session of sessions) {
            if (session.accountId === account.id && session.revokedAt === null) s.sessions.put({ ...session, revokedAt: now });
          }
          const session: AuthSession = { id: crypto.randomUUID(), accountId: account.id, createdAt: now, revokedAt: null };
          s.accounts.put(next);
          s.codes.delete([account.id, "reset-ticket"]);
          s.sessions.put(session);
          s.kv.put(session.id, "current");
          return { ok: true as const, value: toSession(next) };
        });
        if (result.ok) emit({ kind: "session" });
        return result;
      } catch { return storage(); }
    },
  };
}
