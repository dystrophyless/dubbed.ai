# Issue 80 QA completion

Date: 2026-10-25  
Baseline revision: `9d286621177200fdb5f61ef963d0b6818ae76774`  
Worktree: shared and dirty; this record covers only the Issue 80 files listed below. No commit or GitHub action was performed.

## QA-80-01 — Expired protected session

An expired identity now displays the localized session-ended message and a primary Sign in action. Account recovery preserves the existing safe route intent: the native Account route went through `/sign-in` and landed on `/new` after reauthentication. The synthetic 30-day session ID and expiry timestamp stayed unchanged through reload; only the active session was expired for the scenario. EN and RU screenshots cover desktop (1440×900), short desktop (1440×700), and phone (390×844).

Evidence: `evidence/en-desktop-account-expired.png`, `evidence/en-short-account-expired.png`, `evidence/en-phone-account-expired.png`, `evidence/ru-desktop-account-expired.png`, `evidence/ru-short-account-expired.png`, `evidence/ru-phone-account-expired.png`, and `evidence/en-desktop-account-reauth-new-dub.png`. Browser assertions are in `qa80-browser-results.json`.

## QA-80-02 — Google account conflict

The sign-in screen now explains that accounts remain separate, offers the other sign-in method or password recovery, and contains no account identifier. The reset link uses the existing safe intent. The synthetic provider was called once and no stale-data message was rendered. EN and RU screenshots cover the same three viewport sizes.

Evidence: `evidence/{en,ru}-{desktop,short,phone}-provider-conflict.png`; browser assertions are in `qa80-browser-results.json`.

## QA-80-03 — Action target size

This duplicate finding was addressed by shared work for Issue 78. I made no local auth CSS changes. Browser measurements confirm the shared task buttons are 40 px tall at desktop and short-desktop sizes and 48 px on phone across both locales. This is validation of the shared change, not a separate Issue 80 style implementation.

## Issue 68 read-recovery consumer

Protected-route identity refresh is a read operation. `FeatureRoute` now consumes `serviceRecoveryAction(problem, 'read')` and renders `ServiceNotice` with `context="read"`; it exposes refresh only when the helper allows a read retry. A typed retry directive is passed through when present. Legacy code-only errors use the helper’s honest fallback. Expired/unauthenticated states go to sign-in, and missing/`none` retry directives do not invent a retry action. No mutation replay behavior was changed.

## Verification

- `npm.cmd run test -- src/app/FeatureRoute.test.tsx` — PASS, 1 file / 5 tests.
- `node _docs/evidence/visual-qa-fixes-2026-10-25/issue-80/qa80-browser.cjs` — PASS, 13 screenshots / 13 assertions / 0 page errors, Chromium at `127.0.0.1:4580`.
- `git diff --check -- frontend/src/app/FeatureRoute.tsx frontend/src/app/screen-contract.ts frontend/src/features/auth/SignInScreen.tsx frontend/src/app/FeatureRoute.test.tsx` — PASS (Git reported its normal LF-to-CRLF working-copy notices).

The browser evidence uses synthetic mock identity/provider state and no real credentials or backend. The full application suite was not run while parallel implementation work was active. Visual captures were opened and reviewed in both locales across desktop, short desktop, and 390 px phone widths.
