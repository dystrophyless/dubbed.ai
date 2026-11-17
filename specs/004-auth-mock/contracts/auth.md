# Contract: AuthPort and auth routes

Added to `frontend/src/services/contracts.ts`; implemented by the mock in `services/mock/auth.ts`. Screens use it
only through hooks in `services/index.tsx`. All methods return `Outcome<T, E>` for expected failures; `storage`
means the service could not be reached (retryable, nothing changed).

## Types

```ts
export type AuthStage = "verify" | "microphone" | "active";
export type Session = {
  accountId: string;
  email: string;
  stage: AuthStage;
  hasPassword: boolean;
  googleName: string | null;
};
export type CodePurpose = "verify" | "reset";
export type CodeSent = { email: string; resendAt: number; expiresAt: number };
export type CodeError = "wrong-code" | "expired" | "attempts" | "storage";

export interface AuthPort {
  /** the current session or null (guest); a revoked session = null */
  session(): Promise<Session | null>;

  /** new account at stage "verify" + a verify code sent; signs the browser in to it */
  signUp(input: { email: string; password: string }): Promise<Outcome<CodeSent, "email-taken" | "invalid-email" | "weak-password" | "storage">>;
  /** stage "verify" only: move the pending account to another (free) email and send a new code */
  changeEmail(email: string): Promise<Outcome<CodeSent, "email-taken" | "invalid-email" | "storage">>;
  /** a new code for the current verify-stage account, or for a reset in progress */
  resendCode(purpose: CodePurpose, email?: string): Promise<Outcome<CodeSent, "too-soon" | "storage">>;
  verifyEmail(code: string): Promise<Outcome<Session, CodeError>>;
  /** stage "microphone" → "active", welcome credits once; idempotent when already active (R8) */
  completeMicrophone(): Promise<Outcome<Session, "storage">>;

  signIn(input: { email: string; password: string }): Promise<Outcome<Session, "wrong-credentials" | "google-only" | "storage"> | { ok: false; error: "locked"; until: number }>;
  /** the Google stand-in (mock) / OAuth return (real): existing email → that account, new → stage "microphone" */
  google(identity: { email: string; name: string }): Promise<Outcome<Session, "failed" | "storage">>;
  signOut(): Promise<void>;

  /** always ok for a well-formed email, whether or not an account exists (FR-021) */
  startReset(email: string): Promise<Outcome<CodeSent, "invalid-email" | "too-soon" | "storage">>;
  /** step 2: checks the code (FR-005 rules); a correct code is used up and gives a reset ticket valid 10 min */
  checkResetCode(input: { email: string; code: string }): Promise<Outcome<{ ticket: string; expiresAt: number }, CodeError>>;
  /** step 3: ticket + new password (entered twice, compared on the page) → password set, other sessions revoked,
   *  signed in (stage kept; verify → microphone). "expired" = the ticket ran out → start the reset again */
  finishReset(input: { ticket: string; password: string }): Promise<Outcome<Session, "expired" | "weak-password" | "storage">>;
}
```

`Services` gains `auth: AuthPort`. `ChangeEvent.kind` gains `"session"`. `demo` gains
`lastCode(email: string, purpose: CodePurpose): Promise<string | null>`.

## Rules (shared, `services/rules/auth.ts`, unit-tested)

- `normaliseEmail(s)` — trim, lower case. `isEmail(s)` — one `@`, a dot in the domain, no spaces.
- `isPassword(s)` — length ≥ 8 (FR-004).
- `CODE_TTL_MS = 600_000`, `RESEND_MS = 60_000`, `MAX_CODE_ATTEMPTS = 5`, `MAX_SIGNIN_WRONG = 5`, `LOCK_MS = 60_000`.
- `safeNext(path)` — a same-origin path (`/…`, not `//…`, not an auth route) or null (R4).
- `routeForStage(stage)` — `verify` → `/sign-up/verify`, `microphone` → `/sign-up/microphone`, `active` → null.

## Hooks (`services/index.tsx`)

`useSession()` — query key `["session"]`, refetch on window focus; invalidated by `session` change events, after which
the R3 reload rule applies. Mutations are plain `useMutation`s over the port methods.

## Routes

| Route | Who | Page |
|---|---|---|
| `/` | everyone | redirect: guest → `/sign-in`, unfinished → its stage page, active → `/projects` (FR-027) |
| `/sign-in?next=` | guest | email + password, Google, "Forgot password", link to sign-up; demo account hint (demo mode) |
| `/sign-up` | guest | email + password, Google, link to sign-in |
| `/sign-up/verify` | stage `verify` | 6-digit code, resend countdown, change email, demo code notice |
| `/sign-up/microphone` | stage `microphone` | level, device choice, blocked / missing / silent states, Finish → `/new` |
| `/reset-password` | guest | three steps: email → code (demo notice) → new password twice → signed in (owner, 2026-11-17) |
| `/auth/google?from=&next=` | guest | mock-only Google stand-in (R7) |

Signed-in routes (ProductShell pages, `/checkout/:id`, the studio) require stage `active` (R4).

## Demo presets (`?demo=`)

`reset` (all accounts reset, demo account restored, signed out) · `signin` · `signout` · `code:expire` ·
`fail:auth` (next auth call → `storage`) · `google:fail`. Existing presets keep working on the demo account's data.
Demo account: `demo@dubbed.test` / `dubbed-demo` (shown on sign-in in demo mode only).

## Additions after T001 (2026-11-17)

- A wrong code returns its remaining attempts: `{ ok: false, error: "wrong-code", attemptsLeft: number }` (from
  `verifyEmail` and `checkResetCode`), so the page shows an authoritative count.
- `too-soon` carries its deadline: `{ ok: false, error: "too-soon", until: number }` (from `resendCode` and
  `startReset`), so the page can count down.
- `demo.lastCode(email, "reset")` = null on the reset code step means "no code was sent for this email" — the demo-only
  `code-unknown` notice (ui-spec S5). Demo mode only; the real adapter has no `demo`.
- The Google stand-in page derives the name of a typed email from its local part; the views pass the email, the page
  builds `{ email, name }`. The reset page keeps the email and the ticket in page state; `repeat` is checked on the page.
- `fail:auth` fails the next **Outcome-returning** auth call (sign-up, change email, resend, verify, complete
  microphone, sign-in, Google, start reset, check reset code, finish reset) with `storage`, then clears. `session()` and
  `signOut()` are exempt — they have no error channel, and the spec's failure cases are the forms (FR-025, edge cases).
  `google:fail` is read and cleared by `google()`. Every later implementation of these methods must consume the flags
  through the shared helper in `services/mock/auth.ts`.
