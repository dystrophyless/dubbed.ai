# Research: Sign-up and sign-in on mock services

Phase 0 decisions for `plan.md`. Each: decision · rationale · alternatives considered.

## R1 — Where accounts live in the mock: a separate auth database

**Decision**: A new IndexedDB database `dubbed-mock-auth` holds the account registry, email codes, sessions, sign-in
attempt counters and the browser's current session (`kv.current`). The services layer gets a new `AuthPort`
(`contracts/auth.md`); the mock implementation lives in `services/mock/auth.ts`.

**Rationale**: Auth must work before any account's data exists (guest, unfinished sign-up), and must outlive switching
between accounts. A separate database keeps the existing `dubbed-mock` schema and its upgrade code untouched.

**Alternatives**: new stores inside `dubbed-mock` (a schema upgrade of the database that also holds the demo
account's projects, and every account's data in one place — R2 rejects that); localStorage (no transactions — welcome
credits and "one account per email" need atomic check-and-write).

## R2 — Per-account data: one data database per account

**Decision**: Each account has its own data database. The demo account keeps the existing `dubbed-mock` (so its
current projects, credits and slots *are* the demo account's data — FR-024 for free); other accounts use
`dubbed-mock-<accountId>`. `services/mock/db.ts` resolves the database name from the current session when it opens,
instead of the fixed `DB_NAME`. A guest or a not-yet-active account never opens a data database.

**Rationale**: FR-003 (no data seen across accounts) holds by construction — no query in the 800-line mock needs an
account filter, so none can forget one. The existing upgrade path and all 001–003 mock code stay as they are.

**Alternatives**: an `accountId` field on every record with indexes (touches every query and store; a missed filter is a
data leak — exactly the class of bug the spec forbids); one database and wipe on sign-out (loses the user's work).

## R3 — Switching accounts reloads the tab

**Decision**: Whenever a tab's signed-in account changes away from an account whose data it had open (sign-out,
sign-in as another account, a remote sign-out, a password reset ending this session), the tab does a full navigation
(`location.replace`) to the target page. Guest → account (sign-up, sign-in from a guest page) needs no reload, since no
data database was open. Every session change is announced on the existing BroadcastChannel (`kind: "session"`); each
tab re-reads the session and applies the same rule.

**Rationale**: The mock keeps module-level state per data database (the open `IDBDatabase`, object URLs, simulated
preparation timers, the capture lock). A full navigation drops all of it and every in-flight operation at once, so no
write of account A can land in account B's database — the safest answer to the edge case "sign-out while another tab
uploads or records". It also clears the TanStack Query cache, so no previous account's data flashes on screen.

**Alternatives**: close and reopen the database in place plus `queryClient.clear()` (every in-flight async chain in
the mock would need an account check between awaits; easy to get subtly wrong).

## R4 — Account stages and route guards

**Decision**: An account is in one stage: `verify` (email not verified) → `microphone` (verified, check not done) →
`active`. Google sign-up starts at `microphone`. Two route wrappers:
- `RequireAccount` around `ProductShell`, `/checkout/:id` and `StudioRoot`: no session → `/sign-in?next=<path>`;
  stage `verify` → `/sign-up/verify`; stage `microphone` → `/sign-up/microphone`.
- `AuthOnly` around the auth pages: active session → `next` or `/projects`; each onboarding page sends a user in
  another stage to that stage's page.
`/` becomes a redirect by session (guest → `/sign-in`, active → `/projects`; FR-027). `next` is accepted only as a
same-origin path (starts with `/`, not `//`, not an auth route).

**Rationale**: FR-001, FR-009, FR-017, US2-3 and US2-7 are one rule: the session's stage decides where the user may be.

**Alternatives**: checks inside each page (repeated, easy to miss one route — Checkout and the studio are outside
`ProductShell`).

## R5 — Codes, attempts, lockout and the demo notice

**Decision**: A code record per (account, purpose `verify` | `reset`): 6 random digits, `sentAt`, `expiresAt` =
sent + 10 min, `wrongAttempts` (5 → the code is dead), replaced on resend; resend allowed when `now ≥ sentAt + 60 s`
(the response returns `resendAt` so the page can count down). A reset request is limited the same way per email
whether or not the account exists, so the reply never reveals it. Sign-in counts wrong passwords per email; at 5 in a row
sign-in for that email is refused until `lockedUntil` = +1 min; a success resets the counter. The demo notice reads the
current code through `services.demo.lastCode(email, purpose)` — absent on the real adapter, so the notice cannot exist
there (FR-006).

**Rationale**: Simple, testable numbers from the spec; the demo shows a real random code so wrong / expired / resend
behave as they will with real email (owner, 2026-11-16).

**Alternatives**: a fixed code (owner chose the notice); an inbox panel (more work for the same check).

## R6 — Passwords in the mock

**Decision**: The mock stores a salted SHA-256 (`crypto.subtle`) of the password, never the password. Email is
normalised (trim + lower case) before every lookup. Wrong credentials, unknown email and lockout never say whether the
email exists — except sign-up (FR-008, the owner-facing product choice) and the Google-only hint (FR-020).

**Rationale**: Keeps passwords out of IndexedDB dumps, logs and errors (FR-026) at no cost. Real password hashing
(argon2 / bcrypt) and rate limiting are server work — recorded in `specs/backend-backlog.md`.

**Alternatives**: plain text in the mock (would leak into screenshots of devtools and habits).

## R7 — The Google stand-in

**Decision**: "Continue with Google" opens `/auth/google?from=sign-in|sign-up&next=…`, a mock-only page in the style
of the Checkout stand-in (brand + language only, clearly a simulation): pick a demo Google identity (two fixed ones,
`@example.com`) or type an email, or Cancel. Continue calls `auth.google({ email, name })`; Cancel returns to `from`
with a short notice. Demo preset `google:fail` makes the next call fail. Existing email → signs in to that account and
links Google (FR-019); new email → account at stage `microphone`.

**Rationale**: Same pattern the owner already approved for payments; the real adapter will redirect to Google instead,
with the same return handling.

**Alternatives**: a modal pretending to be Google (no route to return to; unlike the real redirect).

## R8 — Activation and the welcome credits exactly once

**Decision**: `auth.completeMicrophone({ deviceId })` in one auth transaction moves `microphone` → `active` only if the
stage is still `microphone`; then the account's data database is opened (created) and the welcome row is written with
its fixed id `"welcome"` (`put` — a second write is a no-op) together with the account record (balance 120, 2 slots).
A second call (two tabs, reload while finishing) finds the account active and returns the session without writing.
The demo account is created already active with its existing data.

**Rationale**: FR-007 / SC-003: two guards — the stage check in the auth transaction and the idempotent fixed-id row —
so a crash between the two transactions is repaired by the next open (the data database seed also writes the same
row id).

**Alternatives**: grant credits at sign-up (spec: only at activation).

## R9 — The microphone check

**Decision**: A new `services/media/mic-check.ts`: `openMicCheck(deviceId?)` → `{ devices, deviceId, onLevel(cb),
stop() }` built on `getUserMedia` + an `AnalyserNode`; errors map to the existing `MicrophoneError` kinds
(`mic-blocked`, `mic-missing`). "Voice heard" = the RMS level ≥ 0.02 (≈ −34 dBFS) for ≥ 300 ms in total; until then
"Finish" is disabled; after 10 s of permission without voice the hint shows (FR-011). The chosen device id is saved
per account per browser (localStorage `dubbed.mic.<accountId>`, device ids are browser-specific so they never go to
the server), and `captureFixedWindow` uses it as `deviceId: { ideal }` (falls back to the default microphone if it
is gone). Playwright's fake microphone produces a tone, so the happy path is testable; a context without the
microphone permission tests `mic-blocked`.

**Rationale**: Owner chose "permission + voice heard on a live level, no test recording". The kit already has
`LevelMeter` and the Auth template already designs the microphone step.

**Alternatives**: storing the device on the account record (device ids mean nothing on another browser).

## R10 — Demo presets and the existing tests

**Decision**: `?demo=reset` now resets everything: deletes non-demo accounts and their data databases, restores the
demo account (`demo@dubbed.test`, password shown on the sign-in page in demo mode only) with the 001–003 reset data,
and signs out. New presets: `signin` (sign in as the demo account), `signout`, `code:expire` (expire the current
codes), `fail:auth` (the next auth call fails with `storage`), `google:fail`. The e2e helper `gotoFlow` adds `signin`
after `reset`, so the 001–003 flows keep working unchanged; smoke tests of signed-in routes do the same, plus new
smoke tests for the auth routes.

**Rationale**: FR-024 / FR-025; existing tests remain business flows of the signed-in app.

**Alternatives**: the app signed in by default in demo mode (would hide the guards from the owner's localhost review).

## R11 — Sessions and "end other sessions"

**Decision**: A session record `{ id, accountId, createdAt, revokedAt }`; the browser's current session id is in
`kv.current`. Every auth read (`auth.session()`) checks the record is not revoked. A password reset revokes every other
session of the account (FR-022) and the old password stops working; sign-out revokes the current one. The session
query refetches on window focus and on `session` change events, so a revoked session signs a tab out within a second.

**Rationale**: In one browser all tabs share one session, so "other sessions" can only be exercised by unit tests on
the mock; the guarantee itself is server work (`specs/backend-backlog.md`).

## R12 — Shell and studio

**Decision**: `ProductShell` takes the user's email (and the Google name, if any) from the session instead of the
fixed "Alex Morgan"; its Sign out calls `auth.signOut()` and follows R3. The studio's focused shell gets no sign-out
(spec FR-016); a remote sign-out reaches it through R3 like any tab.

## Server work recorded for later (`specs/backend-backlog.md`)

Real email delivery and code storage, Google OAuth, password hashing, rate limiting and lockout on the server, session
revocation across devices, one account per email under concurrent sign-ups, welcome credits granted once in the same
transaction as activation.
