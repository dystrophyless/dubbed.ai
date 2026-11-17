# Quickstart: Sign-up and sign-in on mock services

Validates spec US1–US5 on the mock services. Interface: [contracts/auth.md](./contracts/auth.md); rules and invariants:
[data-model.md](./data-model.md).

## Prerequisites

```sh
cd frontend
npm run dev          # http://localhost:5174
```

Each scenario starts at `/?demo=reset` (signed out, only the demo account exists). Demo account:
`demo@dubbed.test` / `dubbed-demo`. The emailed code is shown in the demo notice on the code page.

## Scenarios

1. **Guards (FR-001, FR-027).** `/` → sign-in. Open `/projects`, `/credits`, a project link → sign-in each time.
2. **Sign up with email (US1-1…6).** Sign-in → "Create account" → `new@example.com` + a 7-character password → the
   rule shows, nothing sent; 8+ characters → code page names the email. Enter a wrong code → "wrong code"; enter the
   demo-notice code → microphone step. Allow the microphone, speak (or the fake tone in tests) → Finish enabled →
   New dub with 120 credits, 0 of 2 project slots, no projects.
3. **Code rules (US1-3…5, edge cases).** On the code page: Resend is disabled with a countdown for 60 s; after it the
   notice shows a new code and the old one fails. 5 wrong codes → "request a new code". `?demo=code:expire` → the code
   is expired. "Change email" → back to the form, a new address gets a new code.
4. **Email taken (US1-7, FR-008).** Sign up with `demo@dubbed.test` → "account exists" with Sign in and Reset password.
5. **Sign in / sign out (US2-1…6).** Sign in as the demo account → My projects with its data; reload → still signed in.
   Wrong password → one message, email kept; 5 wrong in a row → locked for 1 min. Open `/credits` signed out → sign in
   → Credits opens (`next`). Signed in, open `/sign-in` → My projects. Open two tabs, sign out in one → both show
   sign-in.
6. **Resume unfinished sign-up (US2-7).** Sign up, stop on the code page, sign out (`?demo=signout`) → sign in with the
   same email and password → the code page. Same on the microphone step → the microphone page; balance stays 0 until
   Finish.
7. **Data per account (FR-003).** Create a project as the demo account; sign out; sign up a new account → no projects,
   120 credits. Sign back in as demo → its project is there.
8. **Google (US3).** Sign-up → Continue with Google → pick the new demo identity → microphone step (no code) → 120
   credits. Sign out → Google again → My projects. Google with `demo@dubbed.test` → the demo account. Cancel on the
   stand-in → back with a notice; `?demo=google:fail` → error, nothing created. Google-only account + password sign-in
   → "uses Google" hint.
9. **Microphone states (US4).** Run the browser with the microphone blocked → blocked explanation + Try again, no
   skip. No microphone → "connect one". Silent for 10 s → hint, Finish stays disabled. Two microphones → choose one,
   then record a take in the studio with it.
10. **Welcome once (SC-003).** On the microphone step open a second tab on the same page; Finish in both → balance 120,
    one welcome row in Credits history.
11. **Reset password (US5).** Sign-in → Forgot password → `demo@dubbed.test` → "If an account exists…" (same text for
    `nobody@example.com`) → demo code → (a separate step) new password twice; a mismatch is refused → My projects. Sign out; the old password fails, the new one works.
12. **Failures (edge cases).** `?demo=fail:auth` then submit any auth form → retryable error, typed values kept,
    nothing created.
13. **Both languages and phone.** Repeat 2, 5 and 11 in Russian and at 390 × 844: no horizontal scroll, the code field
    accepts paste.

## Checks

```sh
npm run build && npm run lint && npm run lint:css && npm run test:unit
npm run test:e2e:quick      # then the full npm run test:e2e before commit
npm run snap                # 1440 × 900 and 390 × 844
```
