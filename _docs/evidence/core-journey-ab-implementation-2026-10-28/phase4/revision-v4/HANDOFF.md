# Revision v4 author handoff — Ready for integrated frontend review

**Status:** Ready for integrated frontend review — revision v4  
**Edit state:** EDITS PAUSED  
**Date:** 2026-10-29 (Asia/Qyzylorda)  
**Base revision:** 9096925a4476e84ec9a6e5ef9bff50ae45ac0f67  
**Preview:** http://127.0.0.1:5180/ — HTTP 200; Node listener PID 10132

## IR-13 disposition

Result playback requests now carry the active video element, scope key, selected source key and URL, media load epoch, and playback interaction epoch. The same identity check fences the play/pause/time/error handlers and loadedmetadata continuation. Scope loss, source replacement, reload, user pause/seek, and unmount invalidate older work. A late or current AbortError does not mark a healthy source unavailable. A current non-abort rejection remains visible; the existing **Reload sample** control now reloads the selected media, advances its load epoch, and retries playback in the user gesture.

The shared FoundationResultPage controller serves both A and B. The new race regression ran the connected Layout A browser journey only.

## Source files and hashes

- frontend/src/features/result/FoundationResultPage.tsx — SHA-256 6BC4014E74A241ADEE3172B85B169432436ADFD0F891D5C4A560C51B8F42249F
- frontend/e2e/record-journey.spec.ts — SHA-256 96743B45D928A85AADC8D0FBC5104CA715734E70986CDD0771379466C8F3A527

The repository was already broadly dirty. frontend/ and much of the evidence tree are untracked at the base revision; unrelated existing files were preserved. No prototype, canonical contract, or review source was changed. No commit, push, reset, deployment, or live experiment was performed.

## Verification

All checks below were run after the final v4 code change:

- npm.cmd run typecheck — PASS.
- npm.cmd run lint — PASS.
- npm.cmd test — PASS, 4 files / 17 tests.
- npm.cmd run build — PASS.
- git diff --check — exit 0. Git printed existing LF-to-CRLF working-tree warnings for unrelated dirty files.
- Focused browser check — PASS, 1 connected Layout A journey / 37.5s, Chrome 156.0.8078.49. It used Chrome fake audio input to exercise real getUserMedia/MediaRecorder capture; this is not a physical microphone run.

The browser regression verified:

1. Original playback's delayed AbortError after switching to a playing My dub source leaves the replacement usable.
2. A rapid Original → My dub → Original transition ignores the disconnected Original request even though the source key recurs.
3. A late AbortError after pausing the same active source does not disable it.
4. A current NotSupportedError is visible and recoverable through Reload sample.

## Evidence

Successful run directory:

_docs/evidence/core-journey-ab-implementation-2026-10-28/phase4/revision-v4/run-20261029-123445/

- playwright-console.log — raw focused browser command output.
- layout-a-result-playback-race-evidence.json — per-request source, rejection timing, and whether the originating element was connected at rejection.
- layout-a-result-current-play-failure.png and layout-a-result-playback-recovered.png — inspected failure and recovery states.
- layout-a-browser-evidence.json — actual capture, accepted snapshot, and illustrative fixture provenance.
- command.txt, environment.json, result.json — command and run boundary.

Playwright's per-run artifacts and test temp directory are on C: at:

C:\Users\roman\AppData\Local\Temp\Dubbed-core-playwright-v4-20261029-123445\

The first focused attempt is preserved separately at:

_docs/evidence/core-journey-ab-implementation-2026-10-28/phase4/revision-v4/run-20261029-123209/

It failed only because the test expected the English label “Retry playback” while the existing localized control is “Reload sample.” The error state appeared and the stale/cancellation scenarios had already passed. The attempt's console is in that run directory; its Playwright error context and trace remain at:

C:\Users\roman\AppData\Local\Temp\Dubbed-core-playwright-v4-20261029-123209\record-journey-Layout-A-re-5e26f-letes-the-accepted-snapshot\

The next run corrected the label, made the reload action perform a real selected-source reload, and passed. Each run used a unique evidence path; no earlier output was overwritten.

## Limits

- V4 browser evidence covers the shared player through Layout A; Layout B's new race path was not separately run.
- Delayed promise failures are controlled browser fault injections; the test does not claim a particular physical browser/device will produce the same timing.
- Browser capture used fake input, not a physical microphone.
- Result media remains the explicitly disclosed illustrative local fixture (productRendered=false, assembledFromAcceptedTakes=false); backend rendering is out of scope.
- No full browser suite was rerun.

