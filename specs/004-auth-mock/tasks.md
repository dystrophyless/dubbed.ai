---

description: "Tasks for 004-auth-mock"
---

# Tasks: Sign-up and sign-in on mock services

**Input**: `specs/004-auth-mock/` — spec.md (clarified 2026-11-16, reset revised 2026-11-17), plan.md, research.md
(R1–R12), data-model.md, contracts/auth.md, quickstart.md, **ui-spec.md (Approved 2026-11-17)**, approved screenshots in
`design/screens/`.

**Tests**: requested by the spec (SC-003, SC-006) and the plan — Vitest for the rules, the mic check and the mock
adapter (fake-indexeddb + fake timers); Playwright + axe per user story (desktop 1440×900, EN + one RU run,
`expectNoA11yViolations(page)`, no horizontal scroll), smoke per new route, mobile-layout entries (390×844). Playwright
runs with one worker; never build while it runs.

**Demo failure flags**: every auth method implemented in US1–US5 consumes `fail:auth` (and `google()` consumes
`google:fail`) through the shared helper in `services/mock/auth.ts` — contracts/auth.md, last section.

**Who does what** (`CLAUDE.md`): tasks marked **(ui-builder)** go to the `ui-builder` agent; every other task goes to
the `implementer` agent; tasks marked **(sol)** (welcome credits = money, one-account-per-email and session switching =
locking) go to `implementer-sol`. The main session orchestrates and checks reports against real command output.

**UI rule**: every UI task follows `ui-spec.md` (S1 Sign in, S2 Sign up, S3 Email code, S4 Microphone, S5 Reset
password, S6 Google stand-in, S7 Route guard loading, S8 Shell account menu) and wires the **approved views as-is** from
`src/features/auth/views/` (`SignInView`, `SignUpView`, `VerifyView`, `MicrophoneView`, `ResetPasswordView`,
`GoogleStandInView`, `AuthLoadingView`, shared `AuthFrame`, `CodeEntry`). View props: ui-spec §6; test hooks: ui-spec §4.
Pages own data, validation (`services/rules/auth.ts`), countdowns and navigation; views never fetch or read the URL. No
visual change without owner review.

**Paths**: all under `frontend/` unless stated.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1…US5 from spec.md

---

## Phase 1: Setup

- [X] T001 Read the approved views in `src/features/auth/views/*.tsx`, their mocks `src/features/auth/mocks.ts`, the prototype `src/prototypes/004-auth-mock.tsx` and ui-spec §2–§6; record any mismatch between the view props and `contracts/auth.md` (e.g. `checkResetCode` → ticket, `finishReset({ ticket, password })`) as a note at the end of this file (no code change)

---

## Phase 2: Foundational (blocks every story)

**Purpose**: the auth port, per-account data, guards and demo presets — after this phase the app requires sign-in and
the 001–003 e2e flows run again through the `signin` preset.

- [X] T002 [P] Rule module `src/services/rules/auth.ts` per `contracts/auth.md`: `normaliseEmail(s)` "trim, lower case"; `isEmail(s)` "one `@`, a dot in the domain, no spaces"; `isPassword(s)` "length ≥ 8"; constants `CODE_TTL_MS = 600_000`, `RESEND_MS = 60_000`, `MAX_CODE_ATTEMPTS = 5`, `MAX_SIGNIN_WRONG = 5`, `LOCK_MS = 60_000`, `RESET_TICKET_MS = 600_000`; `safeNext(path)` "a same-origin path (`/…`, not `//…`, not an auth route) or null"; `routeForStage(stage)` "`verify` → `/sign-up/verify`, `microphone` → `/sign-up/microphone`, `active` → null"; `AUTH_ROUTES` list (`/sign-in`, `/sign-up`, `/sign-up/verify`, `/sign-up/microphone`, `/reset-password`, `/auth/google`)
- [X] T003 [P] Vitest `src/services/rules/auth.test.ts`: `normaliseEmail(" A@B.Co ")` = `a@b.co`; `isEmail` true for `a@b.co`, false for `a@b`, `a b@c.d`, `a@@b.c`, ``; `isPassword` false at 7, true at 8; `safeNext` accepts `/projects/x?y=1`, rejects `//evil.com`, `https://x`, `/sign-in`, `/sign-up/verify`, `` and `null`; `routeForStage` for all three stages
- [X] T004 Contract types in `src/services/contracts.ts` per `contracts/auth.md`: `AuthStage`, `Session`, `CodePurpose`, `CodeSent`, `CodeError`, `AuthPort` (session, signUp, changeEmail, resendCode, verifyEmail, completeMicrophone, signIn incl. `{ ok: false; error: "locked"; until }`, google, signOut, startReset, `checkResetCode({ email, code }) → { ticket, expiresAt }`, `finishReset({ ticket, password })` with errors `"expired" | "weak-password" | "storage"`); `Services.auth: AuthPort`; `ChangeEvent.kind` documents `"session"`; `demo.lastCode(email, purpose): Promise<string | null>` and demo patch fields for the new presets (T009); fix compile errors without changing behaviour
- [X] T005 (sol) Auth database `src/services/mock/auth-db.ts` (research R1, data-model): IndexedDB `dubbed-mock-auth` v1 with stores `accounts` (key `id`, unique index `email`), `codes` (key `[accountId, purpose]`, purposes `"verify" | "reset" | "reset-ticket"`), `sessions` (key `id`), `throttle` (key = normalised email), `kv` (`current` = this browser's session id); helpers `read` / `write` (one atomic transaction, same pattern as `db.ts`), `deleteAuthDb()`; seed on creation: the demo account `{ id: "demo", email: "demo@dubbed.test", passwordHash: salted SHA-256 of "dubbed-demo", google: null, stage: "active", activatedAt: now, dataDb: "dubbed-mock" }`; password hashing helper `hashPassword(password, salt?)` / `checkPassword` with `crypto.subtle` SHA-256 + 16-byte random salt (R6) — never store or log the password
- [X] T006 (sol) Per-account data database in `src/services/mock/db.ts` (R2): replace the fixed `DB_NAME` with the current session's account `dataDb` (read through `auth-db.ts` when `open()` first runs); a guest or a non-`active` account must never open a data database (`open()` rejects with a typed error); keep the existing upgrade code for every data database (a fresh database gets balance 120, slots 2 and the `"welcome"` row); `deleteDataDb(name)` for demo reset; the BroadcastChannel and `emit` stay shared; export `currentAccountId()` for the mic preference (T026)
- [X] T007 (sol) Mock `AuthPort` core in `src/services/mock/auth.ts`: `session()` (reads `kv.current`, returns null if missing, revoked or its account is gone), `signOut()` (revokes the current session, clears `kv.current`, emits `{ kind: "session" }`), and the session record per data-model (`{ id, accountId, createdAt, revokedAt }`); wire `auth` into `createMockServices()` in `src/services/mock/index.ts`; the other methods return `fail("storage")` until their story implements them; passwords and codes never appear in errors, logs or change events
- [X] T008 (sol) Vitest `src/services/mock/auth.test.ts` (new; fake-indexeddb): no change event and no error ever contains a password or a code (FR-026, checked in every later auth test through a shared spy); fresh install has only the demo account and no session; after `demo.set({ signin: true })` `session()` returns the demo account at stage `active`; `signOut()` → `session()` null and a `session` event is emitted; a revoked session reads as null; data isolation: with two active accounts, a project created in account A is not listed by account B and comes back when A signs in again (FR-003)
- [X] T009 Demo presets (R10) in `src/services/mock/index.ts` and `parseDemo` in `src/services/index.tsx`: `reset` = delete every non-demo account and its data database, reset the demo account's data as before, restore its password, sign out; new `signin` (signs in as the demo account), `signout`, `code:expire` (expire every current code and ticket), `fail:auth` (the next auth call returns `storage`, then clears), `google:fail` (the next `google()` returns `failed`); `demo.lastCode(email, purpose)` returns the current code or null; existing presets keep acting on the signed-in account's data
- [X] T010 Session hook and the account-switch rule in `src/services/index.tsx` (R3, R11): `qk.session = ["session"]`; `useSession()` (refetch on window focus); on a `session` change event re-read the session; if this tab had an account's data open and the account id changed or became null → `window.location.replace(target)` (sign-in with `next` for a signed-out tab, else `/projects`); guest → account needs no reload; `invalidateFor` handles `kind: "session"`; mutations for the port methods as plain `useMutation`s
- [X] T011 (ui-builder) Route guards `src/app/guards.tsx` (R4, ui-spec S7): `RequireAccount` — while the session loads render `AuthLoadingView`; no session → `/sign-in?next=<current path+search>`; stage `verify` → `/sign-up/verify`; `microphone` → `/sign-up/microphone`; `AuthOnly({ stage })` for auth pages — active session → `safeNext(next) ?? "/projects"`, a session in another stage → that stage's route, guest on an onboarding page → `/sign-in`; `RootRedirect` for `/` (FR-027)
- [X] T012 (ui-builder) Router `src/app/router.tsx`: `/` → `RootRedirect`; wrap `ProductShell`, `/checkout/:purchaseId` and `StudioRoot` in `RequireAccount`; add `/sign-in`, `/sign-up`, `/sign-up/verify`, `/sign-up/microphone`, `/reset-password`, `/auth/google` (pages from US1–US5; until a story lands, a route may render its view in the default state); update the header comment
- [X] T013 (ui-builder) Shell account menu `src/app/ProductShell.tsx` (ui-spec S8, R12): user from `useSession()` — the email as the name, or the Google name with the email beneath; Sign out calls `auth.signOut()` then `window.location.replace("/sign-in")`; remove the fixed "Alex Morgan" user and the `signedOut` toast
- [X] T014 (ui-builder) e2e support: `e2e/support/flow.ts` `gotoFlow` uses `demo=reset,signin,<preset>`; every spec that opens a signed-in route without `gotoFlow` (`e2e/smoke.spec.ts`, `e2e/mobile-layout.spec.ts`, the `flow-*` specs with a bare `demo=reset`) adds `signin`; add a helper `gotoGuest(page, route, lang)` (`demo=reset`); run `npm run test:e2e:quick` and report — the 001–003 flows must pass unchanged apart from the preset

**Checkpoint**: signed-in app behind sign-in, demo account works, 001–003 e2e green.

---

## Phase 3: User Story 1 — Create an account with email and password (P1) 🎯 MVP

**Goal**: sign-up → emailed code → microphone check → active account with 120 welcome credits on New dub.

**Independent test**: quickstart 2–4: in a fresh browser sign up, enter the demo-notice code, pass the microphone
check → New dub, balance 120, 0 of 2 slots, no projects.

- [X] T015 [US1] (sol) `src/services/mock/auth.ts` sign-up and codes (R5, data-model): `signUp({ email, password })` → `invalid-email` / `weak-password` by the rules; `email-taken` if the normalised email exists (FR-008); else in one auth transaction create `{ stage: "verify", passwordHash, google: null, dataDb: "dubbed-mock-<id>" }`, a new session as `kv.current`, and a `verify` code; code record "6 random digits (`crypto.getRandomValues`), `sentAt`, `expiresAt` = sent + 10 min, `wrongAttempts` 0–5"; `resendCode(purpose)` → `too-soon` before `sentAt + 60 s`, else replaces the code (attempts 0) and returns `{ email, resendAt, expiresAt }`; `changeEmail(email)` (stage `verify` only) → `email-taken` / `invalid-email`, else moves the account to the new email and sends a new code; `verifyEmail(code)` → `expired` after 10 min, `attempts` once 5 wrong attempts were made (the code is dead), `wrong-code` otherwise counting the attempt, correct → delete the code, stage `microphone`; emit `session` after each stage change; `demo.lastCode` returns the live code
- [X] T016 [US1] (sol) `completeMicrophone()` in `src/services/mock/auth.ts` (R8, FR-007): in one auth transaction move `microphone` → `active` (set `activatedAt`) only if the stage is still `microphone`; then open the account's data database, which seeds balance 120, 2 slots and the history row with fixed id `"welcome"` (`put` — a second write is a no-op); already `active` → return the session without writing; at stage `verify` → change nothing and return the session as it is (the route guard sends the user to the code page)
- [X] T017 [P] [US1] (sol) Vitest in `src/services/mock/auth.test.ts`: sign-up creates a `verify` account and a session; same email again (any case / spaces) → `email-taken`; 7-character password → `weak-password`; resend before 60 s → `too-soon`, after → new code and the old one fails; 5 wrong codes → `attempts` even with the right code; expired after 10 min (fake timers); `changeEmail` to a taken email → `email-taken`, to a free one → new code to it; correct code → stage `microphone`, no data database exists yet and the balance is not readable; two concurrent `completeMicrophone()` → `active`, exactly one `"welcome"` row, balance 120 (SC-003); a new account starts with 0 projects and 2 slots
- [X] T018 [P] [US1] Mic check `src/services/media/mic-check.ts` (R9): `openMicCheck(deviceId?)` → `{ devices, deviceId, onLevel(cb), onVoice(cb), stop() }` on `getUserMedia({ audio: { deviceId: { ideal } } })` + `AnalyserNode`; errors map to `MicrophoneError("mic-blocked" | "mic-missing")` as in `browser-media.ts`; "voice heard" = RMS level (0…1 over the time-domain samples) ≥ `VOICE_RMS = 0.02` (≈ −34 dBFS) for ≥ 300 ms in total, `VOICE_RMS` exported as one constant; check in the report that Playwright's fake microphone (`--use-fake-device-for-media-stream`) exceeds it and a muted track does not; `onSilent` fires after 10 s of permission without voice; `stop()` releases the tracks and the audio context; Vitest `src/services/media/mic-check.test.ts` for the voice/silence detector as a pure function over level samples
- [X] T019 [US1] (ui-builder) Sign-up page `src/features/auth/pages/SignUpPage.tsx` (ui-spec S2, `SignUpView`): validate with `isEmail` / `isPassword` before sending (field errors, nothing sent); submit → `auth.signUp` → `/sign-up/verify`; `email-taken` → the view's email-taken state with Sign in and Reset password links (email carried in router state, not the URL); service error keeps the typed values; one request per double press; `Continue with Google` → `/auth/google?from=sign-up` (US3 wires the stand-in)
- [X] T020 [US1] (ui-builder) Code page `src/features/auth/pages/VerifyPage.tsx` (ui-spec S3, `VerifyView`, `CodeEntry`): names the session email; checks on the 6th digit → `auth.verifyEmail`; states wrong-code (attempts left), attempts (dead code + "Send a new code"), expired, verifying, verified, service-error; resend countdown from `resendAt` (counted by the page); change-email form → `auth.changeEmail`; demo notice from `services.demo?.lastCode(email, "verify")` (no notice when `services.demo` is absent, FR-006); correct code → `/sign-up/microphone`
- [X] T021 [US1] (ui-builder) Microphone page `src/features/auth/pages/MicrophonePage.tsx` (ui-spec S4, `MicrophoneView`) — happy path: `openMicCheck` on mount, phases asking → listening (live level) → heard; "Finish setup" enabled only when heard (FR-010); Finish → `auth.completeMicrophone()` → `/new`; `finishing` and service error with retry; stop the check on unmount (US4 adds the error states and device choice)
- [X] T022 [US1] (ui-builder) Playwright `e2e/flow-auth-signup.spec.ts`: guest at `/` → sign-in → Create account; 7-character password → rule error, no code page; valid sign-up → code page names the email; wrong code → error; demo-notice code → microphone; fake microphone tone → "We hear you", Finish → New dub with balance 120 and 0 of 2 project slots; `demo@dubbed.test` → email-taken with Sign in / Reset password; resend countdown visible and `code:expire` → expired state; service failure: `fail:auth` then submit sign-up → the service-error alert, typed email kept, Try again succeeds and exactly one account exists; one RU run of the happy path; axe + no horizontal scroll on S2, S3, S4

**Checkpoint**: a new user can create an account end to end.

---

## Phase 4: User Story 2 — Sign in and sign out (P1)

**Goal**: returning users sign in to their own data, stay signed in, and sign out everywhere.

**Independent test**: quickstart 1, 5–7.

- [X] T023 [US2] (sol) `signIn({ email, password })` in `src/services/mock/auth.ts` (FR-013): normalise the email; throttle per email (also unknown emails): 5 wrong in a row → `{ ok: false, error: "locked", until: now + 60 s }` and refuse until then; unknown email or wrong password → `wrong-credentials` (same reply); a Google-only account (no password) → `google-only`; success → reset the throttle, new session as `kv.current`, emit `session`; works for any stage (an unfinished account resumes at its stage, US2-7)
- [X] T024 [P] [US2] (sol) Vitest in `src/services/mock/auth.test.ts`: right password → session; wrong password and unknown email give the same `wrong-credentials`; 5 wrong → `locked` with `until`, even with the right password, until 60 s pass (fake timers); a success resets the counter; a `verify`-stage account signs in at stage `verify` and has no data database; sign-out revokes only the current session
- [X] T025 [US2] (ui-builder) Sign-in page `src/features/auth/pages/SignInPage.tsx` (ui-spec S1, `SignInView`): validate the email; submit → `auth.signIn` → `safeNext(next) ?? "/projects"` for an active account, else the stage's route; wrong-credentials keeps the email, clears and focuses the password; locked shows a live countdown from `until`; google-only offers Google and Reset password; service error with retry; the demo-account hint with "Fill in" only when `services.demo` exists (FR-024); notices from router state (e.g. "Google sign-in was cancelled")
- [X] T026 [US2] (ui-builder) Playwright `e2e/flow-auth-signin.spec.ts`: guest opens `/credits` → sign-in → demo account → Credits (`next`); reload → still signed in; open `/sign-in` signed in → My projects; wrong password → one message, email kept; 5 wrong → locked countdown; sign out from the account menu → sign-in; two tabs: sign out in tab A → tab B shows sign-in within 1 s (assert with a 2 s timeout for CI slack) and `/projects` is not reachable (SC-004); unfinished sign-up (stop on the code page, `signout`) → sign in → code page; data isolation: a project created as demo is absent for a new account and present again after signing back in as demo; sign out while the studio is open in tab B with a take being recorded → tab B shows sign-in, and after signing in as another account no take or project of the demo account is visible (FR-016, R3); service failure: `fail:auth` then sign in → the service-error alert, email kept, Try again signs in; the URL never contains the password (FR-026); one RU run; axe + no horizontal scroll on S1

**Checkpoint**: P1 complete — MVP (sign-up, sign-in, sign-out, guards).

---

## Phase 5: User Story 3 — Sign up or sign in with Google (P2)

**Goal**: one-step entry through the mock Google stand-in; one account per email.

**Independent test**: quickstart 8.

- [X] T027 [US3] (sol) `google({ email, name })` in `src/services/mock/auth.ts` (R7, FR-019): `google:fail` preset → `failed`; existing normalised email → sign in to that account and set `google = { name }` (keeps its stage and password); new email → account `{ stage: "microphone", passwordHash: null, google: { name } }` + session; emit `session`; Vitest cases in `src/services/mock/auth.test.ts`: new identity → stage `microphone`; the demo email → the demo account, not a second one; a Google-only account then `signIn` with a password → `google-only`; fail preset creates nothing
- [X] T028 [US3] (ui-builder) Google stand-in `src/features/auth/pages/GoogleStandInPage.tsx` (ui-spec S6, `GoogleStandInView`): two demo identities (`@example.com`) + "Another email" (name from the local part, validated with `isEmail`); Continue → `auth.google` → active: `safeNext(next) ?? "/projects"`, else the stage's route; Cancel → back to `from` (`/sign-in` or `/sign-up`) with a "cancelled" notice in router state; `failed` → the failure panel with Try again; wire "Continue with Google" on S1 and S2 to `/auth/google?from=…&next=…`
- [X] T029 [US3] (ui-builder) Playwright `e2e/flow-auth-google.spec.ts`: sign-up → Google → new identity → microphone step (no code step) → Finish → 120 credits; sign out → Google with the same identity → My projects; Google with "Another email" `demo@dubbed.test` → the demo account's projects; Cancel → back with the notice; `google:fail` → failure panel, nothing created; Google-only account + password sign-in → google-only hint; axe on S6

---

## Phase 6: User Story 4 — Microphone check during onboarding (P2)

**Goal**: every failure of the microphone step explained, no skip; the chosen microphone used by the studio.

**Independent test**: quickstart 9.

- [X] T030 [US4] (ui-builder) Microphone page error states in `src/features/auth/pages/MicrophonePage.tsx` (ui-spec S4): `mic-blocked` → blocked + how to allow + Try again; `mic-missing` → connect one + Try again; silent 10 s → hint, Finish stays disabled; several devices → `Select`, switching restarts the check; one device → the read-only row; headphones recommendation in the footer; no skip anywhere
- [X] T031 [US4] Chosen microphone (R9): save the device id to localStorage `dubbed.mic.<accountId>` on Finish (wrapped in try/catch); `captureFixedWindow` in `src/services/media/browser-media.ts` uses it as `deviceId: { ideal }` and falls back to the default microphone if it is gone; Vitest for the read/write helper
- [X] T032 [US4] (ui-builder) Playwright `e2e/flow-auth-microphone.spec.ts`: a context without the microphone permission → blocked state with Try again and no way forward; with the fake microphone → heard → Finish; Finish is disabled before the voice is heard; axe on blocked and heard states (missing and silent states are covered by the view in the prototype and by the T018 Vitest; say so in the report)

---

## Phase 7: User Story 5 — Reset a forgotten password (P2)

**Goal**: email → code → new password twice (separate steps) → signed in; other sessions ended.

**Independent test**: quickstart 11.

- [X] T033 [US5] (sol) Reset in `src/services/mock/auth.ts` (FR-021, FR-022, data-model ResetTicket): `startReset(email)` → `invalid-email` by the rule; `too-soon` within 60 s of the last reset request for that normalised email — counted for **every** email, existing or not (keep the request time in `throttle` for unknown emails too), so neither the reply nor its timing reveals whether an account exists (FR-021); otherwise the same `{ email, resendAt, expiresAt }` whether or not the account exists (a code is stored only for an existing account); `checkResetCode({ email, code })` with the FR-005 rules (`wrong-code`, `attempts`, `expired`) — a correct code is used up and returns a single-use `ticket` "expires 10 min after the code was confirmed"; `finishReset({ ticket, password })` → `expired` for a used / old ticket, `weak-password` by the rule; else set the password hash, revoke every other session of the account, sign this browser in, stage `verify` → `microphone` (the code proved the email), keep other stages; emit `session`
- [X] T034 [P] [US5] (sol) Vitest in `src/services/mock/auth.test.ts`: unknown and known emails get identical `startReset` replies, including a second request within 60 s (`too-soon` for both) and after 60 s (ok for both); a wrong / dead / expired code never yields a ticket; a ticket works once and expires after 10 min; after `finishReset` the old password fails and the new one works; other sessions of the account read as revoked; a Google-only account can sign in with the new password and keeps Google; a `verify`-stage account continues at `microphone`
- [X] T035 [US5] (ui-builder) Reset page `src/features/auth/pages/ResetPasswordPage.tsx` (ui-spec S5 revision 2, `ResetPasswordView`): step 1 email → `startReset` (too-soon countdown, service error); step 2 code only, checks on the 6th digit → `checkResetCode`, states wrong / attempts / expired / resend countdown / change email, demo notice from `demo.lastCode(email, "reset")`; step 3 only after a correct code: new password + repeat, mismatch → error on the repeat field and nothing sent, weak → error on the first field, `finishReset` → `safeNext(next) ?? "/projects"` or the stage's route; `expired` → "Start again" back to step 1; the ticket and email live in page state only (never the URL)
- [X] T036 [US5] (ui-builder) Playwright `e2e/flow-auth-reset.spec.ts`: sign-in → Forgot password → `demo@dubbed.test` and `nobody@example.com` give the same reply; wrong code → error; demo-notice code → password step; mismatching repeat → error, nothing changed; matching → My projects; sign out → old password fails, new works; `code:expire` on step 3 → Start again; one RU run; axe on each step

---

## Phase 8: Polish & cross-cutting

- [X] T037 [P] Smoke tests in `e2e/smoke.spec.ts`: one per new route (`/sign-in`, `/sign-up`, `/reset-password`, `/auth/google` as guest; `/sign-up/verify`, `/sign-up/microphone` after a sign-up) and `/` for guest and signed-in; mobile layout entries in `e2e/mobile-layout.spec.ts` for S1–S6 at 390×844 (no horizontal scroll, primary action visible) and Sign out through the phone menu sheet → sign-in (FR-015)
- [X] T038 [P] i18n: every new string under `features.auth.*` in `src/i18n/locales/en.ts` and `ru.ts` with Russian plurals for countdowns and attempts; run the `i18n-checker` agent and fix what it finds
- [X] T039 [P] `specs/backend-backlog.md` (repo root): add an "Auth (004)" section from research "Server work recorded for later" — real email delivery and code storage, Google OAuth, password hashing (argon2/bcrypt), server-side rate limiting and lockout, session revocation across devices, one account per email under concurrent sign-ups, welcome credits granted once in the activation transaction
- [X] T040 Remove leftovers of the always-signed-in demo user (fixed user constants used by product routes, the `signedOut` toast key if unused); the styleguide and prototypes keep their own mocks
- [X] T041 Full check: `cd frontend && npm run build && npm run lint && npm run lint:css && npm run test:unit`, then `npm run test:e2e:quick`, then `npm run test:e2e`; `npm run snap` and compare the auth pages with `specs/004-auth-mock/design/screens/` (via the `verifier` agent; real output in the report); say plainly which S1–S6 states had an axe run in e2e and which were checked only in the prototype (SC-006)
- [X] T042 Walk `quickstart.md` 1–13 with the `quickstart-runner` agent; fix or report every difference; time scenario 2 (sign-up to New dub, target < 2 min) and scenario 5's first sign-in (target < 20 s) and report the times (SC-001, SC-002)
- [X] T043 Release prep (after owner OK): `CHANGELOG.md` 0.4.0, `frontend/package.json` version `0.4.0`; `PRODUCT_BRIEF.md` §2 step 2 note "landing `/` is a later feature; `/` redirects by session" (owner, 2026-11-16)

---

## Dependencies & execution order

- **Phase 1 → Phase 2** → stories. Phase 2 is blocking: T004 before T005–T010; T005 before T006–T007; T007 before
  T008–T010; T010 before T011–T013; T014 after T011–T013.
- **US1** (T015–T022) needs Phase 2. T015 → T016 → T021; T018 before T021; T019–T021 before T022.
- **US2** (T023–T026) needs Phase 2; its e2e (T026) reuses the US1 sign-up for the "unfinished sign-up" case → after US1.
- **US3** (T027–T029) needs US1's microphone page (T021) and US2's sign-in page (T025).
- **US4** (T030–T032) needs T021.
- **US5** (T033–T036) needs Phase 2 and T025 (the "Forgot password" link).
- Polish after the stories it covers; T041–T042 last.
- All `src/services/mock/auth.ts` tasks touch one file → sequential (T007, T015, T016, T023, T027, T033). Their Vitest
  tasks share `auth.test.ts` → run after the implementation task of the same story.

## Parallel opportunities

- Phase 2: T002 ∥ T003 ∥ T004 (different files; T003 needs T002's names only).
- US1: T018 (mic check) ∥ T015–T017 (mock) ∥ T019 (sign-up page).
- US2: T024 ∥ T025 once T023 is done.
- US4 T031 ∥ US5 T033 (different files) after their prerequisites.
- Polish: T037 ∥ T038 ∥ T039.

## Implementation strategy

1. **MVP** = Phase 1–2 + US1 + US2 (both P1): the app behind sign-in, email sign-up with code and microphone, sign-in,
   sign-out in every tab, data per account. Stop and let the owner try it on localhost.
2. Then US4 (microphone states — small, completes onboarding), US5 (reset), US3 (Google).
3. Polish, full check, quickstart walk, design QA (`/speckit-design-qa` via the after_implement hook), then PR — one
   user story per PR where possible is not practical here (the guards change every route), so one PR for the feature.

## Notes

- Reset view `onCheckCode(code)` omits the email required by `checkResetCode({ email, code })`; its page must retain the returned ticket and pass it to `finishReset({ ticket, password })`. `onFinish` also supplies `repeat`, which the page validates and does not send to the port.
- Verify and reset views accept `attemptsLeft`, but `CodeError` returns no remaining-attempt count; the page cannot derive an authoritative count from the contract alone, including after reload.
- Countdown props (`lockedSeconds`, `resendIn`, `newCodeIn`, `tooSoonSeconds`) require page-managed timing: sign-in returns `until` and successful sends return `resendAt`, but `too-soon` errors contain no deadline.
- Reset view accepts `demoUnknown`, while `demo.lastCode` returns only a code or null; null alone does not distinguish an unknown email from an absent code.
- Google stand-in passes an empty name for a typed identity, while the contract accepts a name; the approved ui-spec says to derive it from the email's local part.

- T041 (2026-11-17): build, lint, lint:css pass; unit 19 files / 248 tests; e2e quick 131 passed, 1 skipped; full e2e
  195 passed, 1 skipped, 1 failed — `flow-us3.spec.ts:230` (001 assembly retry, expected `assembling`, got `failed`).
  test-triage: 11/11 in isolation and 4/4 in its file, not reproduced; the retry block is unchanged by 004 and resets
  `assemblyFails` atomically; cause of the single failure unknown (no trace kept). Keep the trace on the next failure.
  Screenshots of the guest auth pages (`npm run snap` with paths) in `design/impl/`; verify and microphone need a
  session and are covered by the approved prototype shots and e2e axe runs.
- T042 (2026-11-17, quickstart-runner, real Chrome): 1, 3, 4, 5, 11, 12 passed; 2, 6, 8, 9, 13 passed up to the
  microphone step — no controllable audio input, so Finish, welcome once (10), new-account credits and SC-001 timing
  were not confirmed by hand (covered by e2e with the fake microphone); 7 blocked by the bundled scene.mp4 being
  unreadable in that Chrome (isolation covered by e2e). SC-002: first sign-in 2.6 s. Found and fixed: a nested
  `next` after a multi-tab sign-out — one `signInUrl` builder in rules/auth.ts used by the guards, the account-switch
  reload and the Google stand-in; e2e asserts the un-nested URL and the return.
