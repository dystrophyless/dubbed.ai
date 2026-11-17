# Design QA — 004-auth-mock

**Date**: 2026-11-17 · **Agent**: design-qa · **Round**: 1

## Verdict: FAIL

The implemented layouts closely match the approved design, and the executed build, lint, browser-flow and mobile
checks pass. However, resend failure feedback is not actually rendered on the implemented auth routes, and S3 restarts
an elapsed resend cooldown on reload. These are user-visible implementation defects, not requests to redesign the
approved screens.

### Top priorities and explicit decisions

1. **Required — render auth toast feedback.** `frontend/src/features/auth/views/AuthFrame.tsx:21–32` renders no
   `Toaster`; the implemented auth pages have no other toast host. `VerifyPage` and `ResetPasswordPage` enqueue resend
   feedback that cannot be seen on those routes. Add one host at the implemented auth-route boundary, without
   duplicating the hosts already mounted by prototypes. Evidence: `design/qa/verify-resend-error.en.mobile.png`.
2. **Required — make failed resend recoverable without a false successful-send cooldown/announcement.**
   `frontend/src/features/auth/pages/VerifyPage.tsx:87–92` and `frontend/src/features/auth/pages/ResetPasswordPage.tsx:110–120`
   only enqueue the service-error title. Meanwhile the OTP port immediately restarts its timer and announces "A new code
   is on its way" before the service result is known. Adapt the feature wrapper at
   `frontend/src/features/auth/views/CodeEntry.tsx:50–64` so failure does not masquerade as a successful send; keep the
   current code and offer a retry of the **resend**, not of verification. Do not edit the affect port. The common
   service-alert treatment is already specified; a resend-specific extension needs the owner's confirmation because no
   resend-error screen was approved.
3. **Required — preserve the real S3 resend deadline across remount/reload.** `VerifyPage.tsx:47,111` stores a deadline
   but passes the constant 60 s to the OTP. Reproduction: after the button becomes "Resend code", reload without sending
   anything; it changes back to "Resend in 1:00". Restore the existing send deadline and initialise the wrapper from its
   remaining time. Evidence: `design/qa/verify-reload-countdown.en.mobile.png`.
4. **Known point — RU password wrapping is not an implementation regression.** The approved desktop screenshot and the
   implementation both wrap `dubbed-demo` at the hyphen. No mandatory fix; an optional non-wrapping credential span at
   `frontend/src/features/auth/views/SignInView.tsx:105` would need owner review.
5. **Known point — email-taken links without prefill are not a spec violation.** S2 requires the entered email to stay
   on S2, not to be carried into the destination forms (`SignUpPage.tsx:11,58`). Prefilling is an optional UX change
   needing owner agreement.

## Checks executed (in `frontend/`, no application code edited)

- `npm run build` — PASS (existing large-chunk warning, main JS ≈ 1,173.90 kB).
- `npm run lint`, `npm run lint:css` — PASS.
- `git diff --stat -- frontend/src/components/ui/affect` — empty; ports untouched.
- `npm run test:e2e -- e2e/flow-auth-` — 28 passed (2.8 min), one worker.
- `npm run test:e2e -- e2e/mobile-layout.spec.ts --grep 'auth|sign|reset|Google|microphone'` — 5 passed (13.3 s).
- Browser capture + axe on the built preview: 14 implemented screen/states × EN/RU × 1440×900 and 390×844, plus the
  reference template at all four combinations — **no axe violations**, including colour contrast.
- Targeted captures: S3 resend failure; elapsed cooldown + reload.

Screenshots: `design/qa/` — 60 baseline captures (incl. 4 reference-template captures) + 2 targeted captures.

## Checklist

| Checklist item | Result | Evidence | Fix |
|---|---|---|---|
| 1. Auth archetype and reference structure | PASS in inspected states | `design/qa/reference-auth.ru.mobile.png`; `design/qa/sign-up-email-taken.ru.mobile.png` | — |
| 2. Kit composition, untouched ports | PASS | empty affect-port diff; wrappers documented in ui-spec §5 | — |
| 3. Tokens / inline raw values | PASS | linters; no raw hex/rgb or inline styles in feature TSX | — |
| 4. EN/RU copy and formatting | PASS with note | `design/qa/sign-in-default.ru.desktop.png` vs approved `design/screens/sign-in_state_default.ru.desktop.png` | wrapping is shared with the approved design |
| 5. Reachable states and feedback | **FAIL** | `design/qa/verify-resend-error.en.mobile.png` | AuthFrame toast host; resend recovery in VerifyPage / ResetPasswordPage / CodeEntry |
| 6. Responsive fit / above fold | PASS for captured states | document width = viewport width; lowest mobile auth-submit at 663.5 / 844 | 1024 set not captured |
| 7. One primary action | PASS | `SignInView.tsx:89–103`; `CodeEntry.tsx:33–44` | — |
| 8. Page quality / state truthfulness | **FAIL** | "Resend code" → reload → "Resend in 1:00"; `design/qa/verify-reload-countdown.en.mobile.png` | `VerifyPage.tsx:47,111` |
| 9. Accessibility incl. text contrast | PASS for audited states, with resend announcement defect | 56 axe runs, 0 violations | fix the false "new code" announcement through `CodeEntry.tsx:50–64` |
| 10. Approved screenshot match | PASS visually in compared pairs | RU sign-in desktop, S2 email-taken mobile, S5 new-password mobile | — |

## Differences from approved screenshots, most visible first

1. Resend error feedback is absent on the implemented route (no toast host); the failure screen looks like an ordinary
   countdown and offers no immediate retry. S5 has the same problem.
2. S3 shows a fresh minute after reload although no new code was sent (constant `resendIn`).
3. Expected non-defects: no prototype state switcher; live email / code / password / device values differ from mocks.
4. No other material layout drift in the inspected pairs (e.g. `design/qa/reset-password.ru.mobile.png` vs
   `design/screens/reset_state_password.ru.mobile.png`).
5. RU demo password wrapping is already in the approved screenshot — not drift.

## Coverage and limitations

Captured in both languages and both viewports: sign-in default / field-errors / wrong credentials; sign-up default /
email-taken; Google default / other-email; reset email / code / new-password; verify default / change-email;
microphone heard; shell menu (desktop) and sheet (mobile). Not captured: every approved state, the transient S7 loading
state, the S8 Google-name variant, a 1024 px set. Full unit tests, the full e2e suite and a manual keyboard tour were
not run by this QA. Visual comparison only (no pixel diff tool).

---

# Design QA — round 2 (2026-11-17)

## Verdict: FAIL

Fixed since round 1: the auth toast host (`app/guards.tsx:37–43`); the failed-resend treatment (owner decision, ui-spec
revision 3) — common danger service alert above the OTP, Try again repeats the resend, typed code kept, no false
countdown / announcement / toast; verified for S3 and S5 in EN/RU at 1440 and 390; the reload case of the countdown.

Remaining:
1. **Required — build broken.** `frontend/e2e/support/auth.ts:104` unused `args` parameter: `npm run build` fails with
   TS6133 and oxlint warns. (Main session confirmed: `error TS6133: 'args' is declared but its value is never read.`)
2. **Required — countdown after returning from "Use a different email".** After the cooldown elapsed, opening the
   change-email form and pressing "Back to the code" shows "Resend in 1:00" again. Cause: the code field remounts from
   the stale `remaining` at `VerifyPage.tsx:51–53,121` (`VerifyView.tsx:52–87` unmounts the code branch). Initialise
   every new code-field instance from the absolute deadline. Evidence: `design/qa/round2/verify-change-email-return.en.mobile.png`.
3. **Required validation — standard auth suite on the production build** once the build is fixed. Against the dev
   source server (scratch config) 30 passed, 1 failed: `flow-auth-signin.spec.ts:184` (studio sign-out across tabs),
   during `createAccount` — first verification did not reach the microphone in 5 s, in isolation the fake microphone
   was not heard within 25 s. Not diagnosed.
4. **Recommended (a11y)** — `CodeEntry.tsx:81–102` sets `resendIn` to 0 before the port announces availability, so
   "You can resend the code now" is never announced. Add one wrapper-owned, localised polite announcement when
   resend becomes available (not every tick; do not edit the port). Not an axe violation.
5. Coverage still partial: not every approved state, S7 loading, S8 Google name, 1024 px.

Checks: build FAIL (above); lint 1 warning (above); lint:css PASS; affect-port diff empty; no raw values in
`features/auth`; auth flows on the source server 30/31; mobile auth 5/5; axe on 64 implemented states — 0 violations.
Evidence: `design/qa/round2/` (60 baseline + 8 resend-error + 1 change-email-return captures).

---

# Design QA — round 3 (2026-11-17)

## Verdict: PASS

All round-2 required fixes verified on the production build (preview on 4175):
1. Build ✓ (2,388 modules, existing >500 kB chunk warning only), oxlint 0 warnings, lint:css clean.
2. Countdown on remount: after the cooldown, "Use a different email" → "Back to the code" keeps "Resend code"
   (`CodeEntry.tsx:84–85`, absolute `resendAt`). Evidence: `design/qa/round3/verify-change-email-return.en.mobile.png`.
3. Readiness announcement: one polite status message ("You can resend the code now" / «Можно отправить код снова»)
   when the cooldown ends (`CodeEntry.tsx:87–92,111`), observed in S3/S5 × EN/RU × desktop/mobile.
4. Failed resend: injected failure fired in all 8 combinations; typed code kept; no countdown or success announcement
   on failure; Try again succeeds, removes the alert, shows the toast and starts the cooldown.

Checks: `flow-auth-*` 31/31; mobile auth 5/5 (incl. the cross-tab studio sign-out flow); 64 implemented-state axe
audits — 0 violations incl. contrast; affect ports untouched; no raw values in `features/auth`.
Non-blocking notes unchanged: RU demo-password wrap is in the approved screenshot; email-taken links need no prefill.
Not covered: every approved state, S7 loading, S8 Google name, 1024 px, a manual screen-reader tour.
Evidence: `design/qa/round3/`.
