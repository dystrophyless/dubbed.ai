# Auth state visual evidence

This evidence covers the actual sign-in, registration, password-reset, and account-linking screens for issues #66, #71, #80, and #82. The local harness mounts the real `App`, uses its current shell and `index.css`, and routes to the real screen components. It uses `createServices()` with narrow synthetic service overrides; it does not recreate the screens in fixture HTML.

The browser run used Chromium headless on `127.0.0.1:4291`, one worker, light color scheme, and muted audio. It loaded the actual Mabry Pro font. Scenarios use `.invalid` email addresses and local fixture codes (`246810` and `135790`). No OAuth provider, email delivery, live identity backend, hardware, or secrets were used.

## Screen and screenshot map

| Screen | Rendered states | Evidence files |
| --- | --- | --- |
| Sign in | Invalid filled credentials; password visibility and keyboard focus; provider conflict; service error; unavailable session confirmation; submitting; EN↔RU language metadata; 390px phone and 767/768px breakpoint checks. | `signin-invalid-en-desktop.png`, `signin-password-visible-ru-phone.png`, `signin-provider-conflict-en-desktop.png`, `signin-service-error-en-desktop.png`, `signin-session-unavailable-en-desktop.png`, `signin-submitting-en-desktop.png`, `signin-locale-en-ru-en-document-language.png`, `signin-responsive-390-en.png`, `signin-responsive-767-en.png`, `signin-responsive-768-en.png` |
| Registration | OTP paste into pending state; known invalid code retained; unknown verification; known account collision; submitting. | `registration-code-pending-en-desktop.png`, `registration-invalid-code-retained-en-desktop.png`, `registration-unknown-verification-ru-phone.png`, `registration-collision-en-desktop.png`, `registration-submitting-en-desktop.png` |
| Password reset | Neutral request and code-pending state with resend unavailable; invalid code retained; unknown verification; field and service errors; password-submit loading. | `reset-request-neutral-code-pending-en-desktop.png`, `reset-invalid-code-retained-en-desktop.png`, `reset-unknown-verification-ru-phone.png`, `reset-service-error-en-desktop.png`, `reset-password-submit-loading-en-desktop.png` |
| Account linking | Current-password rejection with retained value and correction; candidate pending with final action unavailable; final-action loading; conflict; unknown outcome; cancellation and candidate correction. | `link-invalid-current-proof-ru-phone.png`, `link-candidate-pending-final-action-unavailable-en-desktop.png`, `link-final-action-loading-en-desktop.png`, `link-commit-conflict-en-desktop.png`, `link-commit-unknown-ru-phone.png`, `link-cancel-candidate-correction-en-desktop.png` |

The tests check document language, horizontal overflow at the listed widths, keyboard tab focus, actual font loading, and a minimum 48px phone target. OTP paste uses the browser clipboard. The current-password correction state is visible below the actual field and preserves the typed value. Before capturing that screenshot, the test checks that the error box sits between the password field and submit button, then waits for two paint frames. The locale fix updates `document.documentElement.lang` with the resolved EN/RU locale while preserving existing browser/account/manual precedence.

## Executed checks

Run from `frontend` on 2026-10-24, at base revision `35d122949ad0e07a7e365bcbd4c1ec69202796c3` in the shared dirty worktree:

| Command | Result |
| --- | --- |
| `npm.cmd exec playwright test -- --config=playwright.auth-visual.config.ts` | Final isolated run: 20 passed in 30.7s. One earlier full attempt had 19 passed and one reset-scene app-root wait failure. That case passed alone (1/1) and in the repeated full run (20/20); no product or harness change was needed for it. |
| `npm.cmd exec playwright test -- --config=playwright.auth-visual.config.ts --grep="current proof rejection is shown"` | After the Root92 run, the inline-proof screenshot was recaptured with the placement and paint-readiness assertion: 1 passed. The Root92 functional result remains 92/92; its earlier transient PNG did not establish the inline error visually. |
| `npm.cmd exec vitest -- run tests/account-linking/AccountLinkingScreen.test.tsx tests/app/locale.test.tsx` | 10 passed in the focused run. After adding enabled-state readiness and authoritative-recheck assertions, `AccountLinkingScreen.test.tsx` passed 6/6; the root full-suite run passed 210/210 across 44 files. |
| `npm.cmd run typecheck` | Passed. The root delivery run also passed; see `../root-delivery-typecheck.log`. |
| `npm.cmd run lint` | Exit 0. Repository warnings remain; the owned visual harness warnings were removed. |
| Root combined browser cohort | 92/92 passed in 3.3 minutes, including all 20 auth-state cases; see `../root-delivery-browser.log`. |

The root full-suite result is recorded in `../root-delivery-unit.log`. The aggregate cohort also includes the Processing and actual-App evidence suites; this document maps the 20 auth cases only.

## Evidence limits

These screenshots establish rendered frontend state and placement with synthetic service responses. They do not establish backend identity, session-security, OAuth, email delivery, real OTP, or provider behavior. The tests do not reimplement domain acceptance policies. Issue #80 return/replay/expiry preservation was already separately confirmed by the owner; this evidence covers the actual sign-in screen and its user-visible failure states.

All 26 PNGs in this directory are the captured representative states. `SHA256SUMS.txt` records their digests plus the owned source, test, and harness files.
