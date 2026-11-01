# Issue #74 completion

**Status:** Processing corrections, focused verification, and shared-worktree typecheck complete; root integrated acceptance is pending.

**Worktree boundary:** Shared, dirty worktree at `9d28662` on 2026-10-25. No commit or GitHub mutation was made. This record covers the #74-owned screen, mock snapshot projection, processing tests, and visual harness files listed in `summary.json`.

## QA findings

| Finding | Disposition | Evidence |
| --- | --- | --- |
| QA-74-01 — queued work displayed a 0% progress bar | Fixed/tested. Queued state omits progress even when a trusted service snapshot contains 0%; the real local mock queue journey asserts there is no progressbar and no `0%`. | `integrated-queue-test.log`; `evidence/after/integrated-queued-en-desktop.png`; `evidence/after/queued-ru-phone.png`; `evidence/metrics-after.jsonl` |
| QA-74-02 — zero-turn replacement obscured a still-usable prior preparation | Fixed/tested. The prior preparation and saved draft remain available, with a direct recording continuation that does not activate the empty candidate. | `processing-focused-vitest.log`; `evidence/after/zero-turn-prior-ru-phone.png` |
| QA-74-03 — processing did not show a trustworthy run and account summary | Fixed/tested. The screen labels attempt class, this run’s reservation/settlement state, account balance and in-processing total, and retry availability. The per-run amount comes only from the matching stored reservation allocation. Legacy missing amounts remain unavailable rather than being reconstructed or inferred. | `processing-focused-vitest.log`; `evidence/after/integrated-queued-en-desktop.png`; `evidence/metrics-after.jsonl` |
| QA-74-04 — an unknown cancellation result trapped the user and could lose operation identity | Fixed/tested. An account/project-bound durable marker stores the exact cancellation ID and target preparation identity before dispatch; it has no TTL or ID rotation. The user can close the dialog, leave the screen, remount, and reconcile that same operation without submitting another cancel. The marker clears only after an authoritative terminal/rejected/not-started result. | `processing-focused-vitest.log`; `processing-visual-final.log`; `evidence/after/cancellation-unknown-reloaded-ru-phone.png`; `evidence/after/cancellation-unknown-closed-ru-belowBreakpoint.png` |
| QA-74-05 — processing controls used weak sizing and a full-width desktop destructive action | Fixed/tested. Processing uses the shared medium control role (40 px desktop, 48 px phone); the desktop destructive action is content-sized and phone actions fill the available width. Keyboard focus and dialog containment/return are covered. | `processing-visual-final.log`; `evidence/after/cancellation-quote-en-desktop.png`; `evidence/after/cancellation-unknown-reloaded-ru-phone.png`; `evidence/metrics-after.jsonl` |
| QA-74-06 — progress and dialog typography/surfaces diverged from the adopted Clean/Light reference | Fixed/tested against the opened Clean/Light reference. Captures report a 4 px progress track, 2 px radius, `rgba(0, 0, 0, 0.06)` track, and a 400 px desktop dialog with 10 px radius, 24 px desktop/16 px phone padding, and 16 px/24 px title typography. | `processing-visual-final.log`; `evidence/after/running-known-en-atBreakpoint.png`; `evidence/after/cancellation-quote-en-desktop.png`; `evidence/metrics-after.jsonl` |

## Verification

- After the cancellation reconciliation fix, the same focused tests passed again: **2 files, 21 tests passed**. Raw output: `processing-followup-vitest.log`.
- `npm.cmd run typecheck` from `frontend/` after the cancellation reconciliation fix: **passed**. Raw output: `typecheck-followup.log`.

- `npx.cmd vitest run tests/processing/ProcessingScreen.test.tsx tests/services/preparation-recovery.test.ts --reporter=verbose` from `frontend/`: **2 files, 21 tests passed**. Raw output: `processing-focused-vitest.log`.
- Focused Chromium Processing visual suite using `frontend/playwright.processing.config.ts` (port 4574, muted audio and fake media devices): **79 tests passed**. Raw output: `processing-visual-final.log`.
- Real local mock registration/upload/quote/start journey: **1 test passed**; it froze the synthetic clock after quoting and verified the actual queued service state has no progressbar or 0%. Raw output: `integrated-queue-test.log`.
- Reviewed representative screenshots after capture: integrated queued desktop, queued Russian phone, zero-turn prior Russian phone, cancellation quote desktop, unknown cancellation Russian phone before/after component remount, and running state at the 768 px breakpoint. The suite also captured English and Russian desktop, 1440×640 short, 390 px phone, 767 px below-breakpoint, and 768 px at-breakpoint states. Font checks confirmed Mabry Pro regular and medium were loaded; captured pages reported no horizontal overflow.
- `git diff --check` on the nine owned source/test/config paths passed. Git printed only line-ending normalization warnings.
- The earlier shared-worktree typecheck failed in concurrent #66 `AccountLinkingScreen.tsx` and `AccountLinkingScreen.test.tsx`; its raw diagnostics remain in `shared-typecheck-diagnostics.log`. After #66 resolved those errors, the authorized follow-up global typecheck passed. Both outputs are preserved.

## Environment and limits

Captured on Windows with Node `v22.23.1`, npm `10.9.8`, and Chromium through Playwright. The evidence uses local mock services, a synthetic frozen clock for the queued journey, and fake media devices; it does not establish backend, production, or physical microphone behavior. The cancellation remount regression verifies the durable marker and exact-ID reconciliation in the controlled Processing screen harness. The full application suite was not run. Human visual acceptance and root’s integrated acceptance remain pending.

The #74 pre-#72 `frontend/src/services/mock-preparation.ts` snapshot is SHA-256 `B7758125B17CF00DA4D37B38E2ABBA2BF07D045C46853AF2631FD29004F0843F`. This is a historical handoff boundary before the root-authorized additive #72 fixture projection; it does not describe the current post-#72 file.

The follow-up removed an unnecessary assignment of the committed cancellation-operation envelope into the preparation snapshot before navigating to New Dub. That envelope belongs to the cancellation operation, not the target preparation operation. The cancellation ID, authoritative terminal clearing, and route transition remain intact.
