# Issue 67 completion evidence

Date: 2026-10-25
Scope: runtime startup recovery and sign-in form control validation for issue 67.
Status: implementation and focused browser verification complete; awaiting the parent task's integrated review.

Source revision: `9d286621177200fdb5f61ef963d0b6818ae76774`. Verification ran in the shared dirty worktree; the listed issue 67 paths were changed locally, with other parallel task edits outside this ownership scope.

## Findings

### QA-67-01 — startup storage failures

Startup now shows a localized checking state while session readiness is being read. A missing IndexedDB API, a denied IndexedDB getter, or a workspace-open failure produces the localized read-context storage message and a Retry action. Retry reuses the existing service instance when it was constructed, so the service's resettable lazy-open path can retry without clearing the database or replacing the session. If service construction itself failed before an instance existed, Retry reconstructs the configured services. Authentication expiry and other identity results continue into the normal app/auth flow instead of being mislabeled as storage errors. Explicit real-adapter unavailability and invalid configuration remain distinct, non-retryable runtime states.

The one-shot open-failure browser scenarios create an account and signed-in session, trigger one failed open, then Retry. They verify the same account ID, session ID, and persisted mock client ID after recovery. They also capture the checking state before the injected open error is released.

### QA-67-02 — dense sign-in controls

No duplicate CSS was added. The sign-in primary and password-toggle controls were measured at the shared component's breakpoint in English and Russian: desktop widths (1440 and 768 px) meet the 40 px primary / 32 px secondary minimums; phone widths (390 and 767 px) meet the 48 px minimum for both. Captures report no horizontal overflow and loaded Mabry Pro faces.

## Shared service-error integration

Startup uses `serviceRecoveryAction(problem, 'read')` to decide whether a Retry action is appropriate and `serviceProblemMessage(problem, locale, 'read')` for localized storage-read copy. The startup renderer uses the shared `Notice` primitive with the read-context message because `ServiceNotice` requires the app's `LocaleProvider`, which is not mounted when startup itself fails. No shared service-error copy or message catalog was changed.

`App.refreshIdentity` forwards the exact `result.error.retry` value to the identity error state and omits the field when no retry directive exists. This keeps the feature route's retry guidance connected to the backend directive.

## Verification

Environment: local Windows workspace, Vite development server on `127.0.0.1:4567`, Playwright Chromium, mock adapter unless stated otherwise. Evidence was captured on 2026-10-25.

| Command | Result |
| --- | --- |
| Default mock: `npm.cmd run test:e2e -- --config=playwright.runtime-recovery.config.ts` | PASS, 11 tests. Includes normal runtime smoke, absent/denied storage recovery in English and Russian across desktop/phone widths, one-shot open failure and signed-in-session preservation in English desktop and Russian phone, and shared sign-in control measurements. |
| Explicit real adapter: `$env:RUNTIME_SERVICE_MODE='real'; npm.cmd run test:e2e -- --config=playwright.runtime-recovery.config.ts` | PASS, 4 tests. English and Russian at desktop and phone sizes showed the explicit unavailable state, no app landing heading, no page errors, no external HTTP requests, and no horizontal overflow. |
| `git diff --check` for the issue 67 source/test paths | PASS. Git emitted only its normal LF-to-CRLF working-copy notices. |

The focused mock run completed before the final test-only expansion of the real-adapter smoke; the real-adapter four-case run completed after that edit. The full frontend suite and typecheck were not run while other agents were changing shared frontend/service contracts.

## Evidence files

`evidence/` contains 22 Chromium screenshots and matching `.metrics.json` captures:

- `storage-absent-*`, `storage-denied-*`, and `storage-open-retry-*`: startup failure, checking, retry, and recovery states.
- `real-unavailable-*`: explicit real-adapter unavailable state in both locales at desktop and phone sizes.
- `form-roles-*`: sign-in control measurements across the shared 768 px desktop/phone breakpoint.

The screenshot review confirmed localized storage recovery copy with a visible Retry action, the pending checking message before the open failure settles, the preserved signed-in Account screen after retry, and the explicit real-adapter explanation without a blank landing.

## Limits and handoff

Verification is local Chromium browser evidence. It does not establish cross-browser, physical-device, production backend, or full-suite acceptance. QA-67-02 remains a consumer validation of the shared control treatment owned by issue 78; this issue adds no button styles. No commit, push, issue mutation, or destructive storage operation was performed.
