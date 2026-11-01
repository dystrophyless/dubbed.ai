# QA82 implementation completion

**Date:** 2026-10-25  
**Checkout revision at verification:** `9d286621177200fdb5f61ef963d0b6818ae76774`  
**Boundary:** shared dirty worktree; no commit, push, or GitHub mutation.

Numeric visual roles in this receipt were Orchestrator-selected under owner-authorized fixes. This receipt does not claim separate human approval of each pixel value.

## QA82 findings

| ID | Result | Implemented behavior and proof |
| --- | --- | --- |
| QA-82-01 | Resolved | The accepted long destination email wraps inside the code-step heading at 320, 390, 767, and 768 CSS px in EN/RU. The browser assertions verify full destination text, visible paragraph height, no clipped paragraph, and no horizontal document overflow. Paired screenshots and DOM metrics are in `evidence/after-long-email-*.png` and `.json`. |
| QA-82-02 | Resolved | Kept one native logical OTP input and six decorative cells. Visible caret, range selection, pointer placement/drag, keyboard selection, and replacement paste follow the native selection. Invalid submissions keep the entered digits, set `aria-invalid`, retain the error description, and return focus with the digits selected. Unit and browser checks cover these states; see the `after-invalid-*` screenshots and metrics. |
| QA-82-03 | Resolved | During a held `registration.start`, the form, email/password values, button geometry, and focus remain in place. The busy action stays focusable and exposes `aria-busy`/`aria-disabled`; click and Enter do not duplicate the request. A failed request restores usable controls and values. See the pending and failure screenshots/metrics. |
| QA-82-04 | Resolved | Registration consumes the shared button roles: primary is 40px with Mabry Medium 14/20 on desktop and 48px with 16/24 on phone; password toggle is 32px desktop and 48px phone. The phone sign-in text link is also a 48px target with 16/24 type. Browser metrics confirm Mabry loaded and heading weight 500 with `font-synthesis: none`. No `App.css` edits were made. |
| QA-82-05 | Resolved | The code step uses “Check your email” / “Проверьте почту” as the current page heading, with destination description under it and no duplicate inner heading. Short-desktop EN/RU DOM assertions verify one copy and 500 weight with synthetic bold disabled. |
| QA-82-06 | Resolved | OTP uses a 48px logical target, 40×44 cells when the container fits, 8px flex gaps, 8px radius, and 15/24 Medium digits. At 320px the cells shrink to 29×44 to fit the available 222px control width; at 390px and above they remain 40×44. Browser DOM metrics verify each dimension. |

## Shared duplicate findings

- **QA-78-03 — shared OTP geometry duplicate, cross-checked by QA-82-06.** This finding concerns OTP cell geometry, grouping, and typography, not button density. QA-82-06 DOM metrics record the 48px logical target, 40×44 cells where they fit, 29×44 cells at 320px, 8px gap, and 15/24 Medium digits. This corrects evidence attribution; it does not report a new source defect.
- **QA-71-04 — shared OTP typography consumption.** The #71 completion and tests verify consumption of the shared OTP typography. QA-82 unit/browser evidence confirms the current shared control uses the single-input contract and 15/24 Medium digits. These findings are cross-task corroboration, not a new source defect.

## Verification

- `npm.cmd test -- src/features/auth/OtpInput.test.tsx --reporter=verbose` — PASS, 5/5, Vitest 5.0.5.
- `npm.cmd run test:e2e -- --config=playwright.qa82.config.ts e2e/registration-qa82.spec.ts` — PASS, 6/6. The scoped suite covers pending state, failure restore, EN/RU button roles, long email at 320/390/767/768, short-desktop headings, and invalid OTP keyboard/pointer/paste behavior.
- `npm.cmd run test:e2e -- --config=playwright.qa82.config.ts e2e/registration-qa82.spec.ts --grep "pastes invalid" --repeat-each=3` — PASS, 3/3 repeated OTP transition runs.
- Focused EN/RU desktop/phone auth action-role browser case — PASS, 1/1.
- Scoped `git diff --check` — PASS; Git emitted only configured LF-to-CRLF notices.
- 24 fresh EN/RU screenshots were opened and inspected after the final browser run. Each screenshot has paired DOM measurement JSON in `evidence/`.

The browser harness runs local Chromium against Vite on `127.0.0.1:4582` with `VITE_SERVICE_ADAPTER=mock`; audio is muted and media devices are faked. No physical microphone, real email delivery, or real identity provider was used. The full application suite was not run.

## Files

Implementation is limited to `frontend/src/features/auth/RegistrationScreen.tsx`, `frontend/src/features/auth/auth.css`, `frontend/src/features/auth/OtpInput.tsx`, and `frontend/src/features/auth/OtpInput.css`. Focused OTP unit coverage is in `frontend/src/features/auth/OtpInput.test.tsx`; the scoped browser suite/config are `frontend/e2e/registration-qa82.spec.ts` and `frontend/playwright.qa82.config.ts`.
