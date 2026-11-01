# Issue 77 QA completion

Date: 2026-10-25

Scope: the three recorded QA-77 findings in the proactive visual QA review.

Revision: `9d286621177200fdb5f61ef963d0b6818ae76774`; changes remain local and uncommitted in a shared dirty worktree.

## Dispositions

| QA finding | Disposition | Evidence |
| --- | --- | --- |
| QA-77-01 — Back disabled with an unaccepted candidate | Fixed and verified. Back opens a three-choice guard. Save persists a recoverable draft before moving; discard removes it only after the service succeeds; Stay leaves the line untouched. The browser flow kept the accepted count at 1 while saving, restoring, and discarding the line-2 candidate. A focused component test confirms a failed save retains the exact candidate object and never accepts it. The mock discard mutation now requires the current live recording grant for this actor, and its idempotency fingerprint is actor-bound. The focused service test confirms another same-account/session actor cannot discard the saved draft, denial preserves the candidate, the owner can discard, and replay of the owner operation ID conflicts. | `evidence/qa77-en-line2-back-guard-1440x900.png`, `evidence/qa77-en-line2-saved-candidate-1440x900.png`, `evidence/qa77-recording-viewport-metrics.json`, `frontend/src/features/recording/RecordingScreen.test.ts`, `frontend/tests/services/recording-results.test.ts` |
| QA-77-02 — Russian spoken target overlaps the pinned panel at 767px | Fixed and verified. At the existing phone breakpoint, the stage width is aspect-fit against the later of the full dialogue header and waveform timeline, leaving an 8px gap below the last required scene content. If keeping the stage at its readable 320px minimum cannot fit, the panel moves into document flow and the page scrolls. The breakpoint is unchanged. | `evidence/qa77-ru-breakpoint-767x900.png`, `evidence/qa77-ru-longline-breakpoint-767x900.png`, `evidence/qa77-ru-short-phone-in-flow-767x600.png`, `evidence/qa77-recording-viewport-metrics.json` |
| QA-77-03 — Compact recording controls | Duplicate of shared issue #78; validated against its shared size classes. Recording Play/Pause and segmented modes now consume the shared medium treatment; local 28px/13px overrides and explicit small Play/Pause sizing were removed. Chromium measured desktop controls at 40px with 14px/20px text, 14px primary-button padding and 8px icon gap; phone controls measured 48px with 16px/24px text. | `evidence/qa77-en-desktop-ready-1440x900.png`, `evidence/qa77-en-phone-ready-390x844.png`, `evidence/qa77-recording-viewport-metrics.json` |

The candidate dialog text and buttons were visually checked in the opened Back-guard screenshot. The Russian 768px screenshot keeps the existing 65px, single-row header and returns to the desktop/in-flow layout at the original breakpoint. All 14 screenshots from the final passing browser run were opened and reviewed; `screenshot-manifest.json` records their paths, viewports, hashes and review status.

## Verification

- `npm.cmd run test -- src/features/recording/RecordingScreen.test.ts` — PASS, 1 file / 6 tests, local frontend Vitest run on 2026-10-25.
- `npm.cmd run test -- tests/services/recording-results.test.ts` — PASS, 1 focused recording-service file / 10 tests, including second actor denial, candidate preservation, owner discard and operation-ID replay fencing.
- `npm.cmd run test:e2e -- --config=playwright.qa77.config.ts --grep "QA-77"` — PASS, 1 focused Chromium test (21.1s), mock services and fake media, local Vite server on `127.0.0.1:4577`. It checks all desktop Record/Back/Next/Microphone buttons at 40px and 14px/20px, 14px button padding and 8px icon gap; phone controls are at least 48px with 16px/24px text. The browser flow covers EN/RU desktop and short desktop, 390px phone, RU 767px/768px, a long Russian target, 767×600 in-flow fallback, candidate Back choices, accepted-count preservation and draft restoration with actor-fenced mock discard. Fresh metrics show dialogue and waveform clearances of 82.62px/22.62px at RU 390px, 68.02px/8.02px at RU 767px, and 68px/8px for the long wrapped line; the short-height in-flow fallback retains 72px/12px. All 14 resulting screenshots were opened after this final run. Metrics and screenshot hashes are in `evidence/qa77-recording-viewport-metrics.json` and `screenshot-manifest.json`.
- `git diff --check` on the assigned source/test files — PASS; Git only reported the repository's existing LF-to-CRLF checkout warnings.
- Full frontend suite and global typecheck — not run as the coordinating agent reserved those checks until concurrent writers freeze. No real microphone, speaker, or production service was exercised.

## Changed paths

- `frontend/src/features/recording/RecordingScreen.tsx`
- `frontend/src/features/recording/RecordingTransport.tsx`
- `frontend/src/features/recording/RecordingScreen.css`
- `frontend/src/features/recording/RecordingScreen.test.ts`
- `frontend/e2e/recording-viewport.spec.ts`
- `frontend/src/services/mock-recording.ts`
- `frontend/tests/services/recording-results.test.ts`
- `_docs/evidence/visual-qa-fixes-2026-10-25/issue-77/`
## Final bookkeeping

After root readback identified FIX-R77-02, the fit now protects the entire dialogue header (including capture window and spoken line) and the waveform timeline. The phone scene remains aspect-fit; controls stay pinned when the readable stage budget fits and move into document flow for the 767×600 short-height fallback.

- npm.cmd run test -- src/features/recording/RecordingScreen.test.ts — PASS, 1 file / 6 tests after the full-scene fit change.
- npm.cmd run test:e2e -- --config=playwright.qa77.config.ts --grep "QA-77" — PASS, 1 focused Chromium test in 21.1s (test body 15.8s), backend-free mock services and fake media on 127.0.0.1:4577. It asserts full dialogue and waveform clearance at RU 390px, RU 767px, and long wrapped text, keeps the short-height fallback in flow, and rechecks all three Back choices with accepted-take preservation.
- Fresh measured clearances (dialogue / waveform): RU 390px 82.62px / 22.62px; RU 767px 68.02px / 8.02px; RU long-line 767px 68px / 8px; 767×600 in-flow fallback 72px / 12px.
- The recording service actor-fence test remains green from the preceding QA77 pass (1 file / 10 tests); this viewport-only follow-up did not change the service fence.
- All 14 current screenshot files match their manifest hashes and byte counts. Every screenshot whose hash changed after the run was opened; unchanged images retain the prior opened review. Fresh RU 390px, RU 767px, long-line and short-height images were opened.
- git diff --check — PASS on the seven owned implementation/test files; only existing LF-to-CRLF checkout warnings.
- Full frontend suite and global typecheck were not run while other owners remain active. No physical microphone, speaker, or production service was exercised.
- The temporary frontend/playwright.qa77.config.ts was confirmed untracked, removed, and verified absent. Changes remain local and uncommitted on the current HEAD.

Current SHA-256 values for the seven owned implementation/test files are recorded in summary.json under final_bookkeeping.owned_file_sha256.
