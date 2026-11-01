# Issue 66 visual QA correction receipt

Date: 2026-10-25. Executor: GPT-6 Luna, Max. Baseline revision: `9d286621177200fdb5f61ef963d0b6818ae76774`. Changes remain local in the shared dirty worktree; this task did not stage, commit, push, or update GitHub.

## Dispositions

| Finding | Disposition | Evidence |
| --- | --- | --- |
| QA-66-01 — Google proof CTA overflows phone layouts | **Fixed.** The action now has concise wording, the explanation sits separately, and the button stays within its form. | [EN phone, 390 px](pending-en-phone-390.png), [RU phone, 390 px](pending-ru-phone-390.png), [767 px](pending-en-breakpoint-767.png), [768 px](pending-en-breakpoint-768.png), [measurements](browser-layout-measurements.json) |
| QA-66-02 — Rejected candidate code is disconnected from its field | **Fixed.** `invalid-code` now marks the OTP invalid, associates its inline error, retains entered digits, and focuses/selects the native logical input. | Focused test: `candidate code rejection stays associated with the field and preserves selectable digits`; 12/12 screen tests pass. Shared OTP behavior is consumed through its existing `invalid`, `errorMessageId`, and `inputRef` props. |
| QA-66-03 — Conflict leaves stale review/commit visible | **Fixed.** Conflict suppresses proof/review/cancel actions and blocks commit. Restart first resolves the old intent and checks the current identity/account snapshot; unknown status stays on reconciliation. A real-mock stale-revision test requires a fresh start and fresh proofs before a later commit. | [EN conflict fixture](conflict-en-desktop-1440.png), [RU conflict fixture](conflict-ru-phone-390.png); focused integration test confirms no stale commit, no foreign identity disclosure, and unchanged credit snapshot. |
| QA-66-04 — Protected identity and retained resources are unclear | **Fixed.** The current account email and one-account/projects/credit-balance consequence appear before proof. Success lists both method identities. | [EN review](review-en-desktop-1440.png), [RU review](review-ru-desktop-1440.png), [success fixture](success-en-desktop-1440.png); the real-mock integration test verifies both linked addresses and unchanged credits. |
| QA-66-05 — Compact desktop sizing weakens the final security decision | **Addressed with the selected action roles.** Proof actions use the 40 px task role; the final link action uses the 44 px prominent role; phone actions retain 48 px targets. Confirmed proof panels are compact status rows, keeping the review decision visually distinct. The original critique did not establish an accessibility violation. | [EN desktop review](review-en-desktop-1440.png), [RU desktop review](review-ru-desktop-1440.png), [RU phone review](review-ru-phone-390.png), [measurements](browser-layout-measurements.json) |

## Verification

- `npm.cmd --prefix frontend test -- tests/account-linking/AccountLinkingScreen.test.tsx` — PASS, 1 file / 12 tests, Windows, 2026-10-25.
- `npm.cmd --prefix frontend run lint -- src/features/account-linking/AccountLinkingScreen.tsx tests/account-linking/AccountLinkingScreen.test.tsx` — exit 0. Oxlint reports existing React hook/compiler warnings in the screen; it reported no errors.
- `node --check capture-browser.mjs` — PASS.
- `node capture-browser.mjs` — PASS, 14/14 Playwright Chromium captures. Fresh contexts, light theme, reduced motion, muted audio, fake media flags. All cases report no page errors, loaded Mabry Pro, and document width equal to viewport width. Screenshots and detailed dimensions are in this directory.
- `git diff --check -- frontend/src/features/account-linking/AccountLinkingScreen.tsx frontend/src/features/account-linking/AccountLinkingScreen.css frontend/tests/account-linking/AccountLinkingScreen.test.tsx` — PASS; only CRLF conversion notices.
- Integrated TypeScript typecheck follow-up: `npm.cmd run typecheck --prefix frontend` — exit 1, with **no #66 diagnostics**. One error remains at `frontend/src/features/processing/ProcessingScreen.tsx(864,19)`, outside this issue's ownership; its `PreparationSnapshot.operation` mismatch is recorded in [typecheck-followup.log](typecheck-followup.log). The shared diagnostic list for this screen/test is cleared.
- Final SHA-256 hashes for the three owned product/test source files are in [source-hashes.json](source-hashes.json).

## Evidence limits

The browser harness uses deterministic synthetic service responses. Conflict and unknown screenshots demonstrate screen handling, not real service concurrency or lost-response recovery. The synthetic success fixture returns a completed acknowledgment without refreshing its account-method snapshot, so the screenshot includes the “account settings could not be refreshed” notice. Successful reconciliation, method identities, and unchanged credits are covered separately by the focused real-mock integration test. No external provider, mailbox, real account service, or production resource state was used or claimed.

## Changed paths

- `frontend/src/features/account-linking/AccountLinkingScreen.tsx`
- `frontend/src/features/account-linking/AccountLinkingScreen.css`
- `frontend/tests/account-linking/AccountLinkingScreen.test.tsx`
- This receipt, `summary.json`, `source-hashes.json`, `typecheck-followup.log`, `capture-browser.mjs`, `browser-capture.log`, `browser-layout-measurements.json`, and the PNGs in this issue-66 evidence directory.
