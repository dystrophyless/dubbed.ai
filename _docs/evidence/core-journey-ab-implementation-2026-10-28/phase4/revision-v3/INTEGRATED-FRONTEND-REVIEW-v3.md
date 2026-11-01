# Integrated frontend review handoff — revision v3

State: **Ready for integrated frontend review — revision v3**  
Author edits: **PAUSED**  
Captured: 2026-10-29 02:02 UTC (Asia/Qyzylorda local time 08:02).

## Scope and boundary

This is the authorized frontend slice: prepared project → native Record → shared Result for layouts A and B. Base HEAD is 9096925a4476e84ec9a6e5ef9bff50ae45ac0f67. At task start frontend/ was absent; frontend/ and this phase4/revision-v3 evidence are new and uncommitted. Pre-existing dirty docs/evidence were preserved. No prototype, canonical contract, Git history, remote branch, or deployment was changed.

Source hashes for 37 implementation, test, asset, and build-input files are in source-manifest.json.

## Preview

The local Vite preview is running hidden on http://127.0.0.1:5180/ and returned HTTP 200. Start either journey at:

- http://127.0.0.1:5180/projects/sintel-prepared/record?layout=A&locale=en
- http://127.0.0.1:5180/projects/sintel-prepared/record?layout=B&locale=en

Chrome 156.0.8078.49 on Windows 11 Pro, Node v22.23.1, npm 10.9.8. Playwright used its standard C: user-temp location; browser tests were not redirected to D:. npm caches were placed under this revision’s evidence folder.

## Verification

Static checks:

- npm.cmd run typecheck — PASS after the final test-helper adjustment.
- npm.cmd run lint — PASS after the final test-helper adjustment.
- npm.cmd test — 17/17 passed immediately before the final test-only helper adjustment; no product source changed afterward.
- npm.cmd run build — PASS immediately before the final test-only helper adjustment; no product source changed afterward.

Browser checks and preserved run history:

- full-final-c: 21/21 passed in 3.7 minutes, with C: browser temp. This run preceded two later test-only screenshot/timing waits.
- download-check-c: A connected journey passed 1/1, including saveAs and exact downloaded-byte comparison. Download event failure was null.
- long-ru-frame-c: exact approved Russian stress sentence passed 1/1 after the screenshot test began waiting for a decoded first frame.
- full-final-c2: 19/21. The A journey’s later player restart surfaced “Video is not available in this browser”; the B phone-width overflow assertion observed horizontalOverflow=true. The focused A/B rerun in journey-rerun-c passed 2/2. Successful-run screenshots and evidence JSON are retained; Playwright’s error-context and trace files were in frontend/test-results and were replaced by later runs. The failure details above were captured from their test output.
- full-final-c3: 20/21. The completed-revision journey saw no source-clock movement during a fixed 400 ms immediately after recorder start, while the page remained in the recording state. The helper now polls for actual video.currentTime movement for up to 5 seconds and still fails if the source clock never advances. completed-revision-clock-c passed 1/1 after that test-only change. The full suite was not rerun after the final helper adjustment per the root instruction.
- Final v3 Playwright checks used C: temp. A prior D:-temp attempt cancelled browser downloads; with the required C: temp location, the focused A journey and full-final-c both downloaded the file successfully.

The c2/c3 browser observations remain visible in their evidence folders; focused passes do not erase those failures. No product-source change was made in response to them. The latest source-clock assertion change only replaces a fixed test delay with a bounded poll for the same real-clock condition.

## Connected media evidence

In full-final-c3, both layouts completed native Chrome fake-input capture, reload/recovery, acceptance of all three prepared windows, authorized mock generation, and an Original-selected My dub download.

- A: 3 getUserMedia calls and 3 MediaRecorder starts; captured WebM sizes were 47,428, 71,578, and 74,476 bytes.
- B: 3 getUserMedia calls and 3 MediaRecorder starts; captured WebM sizes were 74,476, 47,428, and 76,408 bytes.
- Each accepted snapshot contains the three exact captured candidate IDs/hashes at project revision 7.
- The downloaded example-dub.mp4 was 749,601 bytes with SHA-256 fe7cb91ebdd2a2e208de6935942d585fced88b734726d19e565958ad3b1bacc9; browser download failure was null in both layouts.

These sizes are observed fake-input results and vary by capture; they are not fixed-count expectations.

## Review findings dispositions

- IR01 — capture starts from the source video’s playing event and the fixed window follows source-clock progress; the delayed-source test and both connected journeys cover it. The source-clock wait finding above is retained for review.
- IR02 — late media/download continuations are fenced by actor, scope, request, and project availability; tombstoned-before-delivery evidence is in full-final-c3.
- IR03 — B desktop header title/dots are restored; A phone Exit/title row is aligned with the approved target.
- IR04 — geometry and reflow are checked at desktop, short viewport, width breakpoints, phone, and the exact long Russian sentence. The re-captured A 1280×600 stress screenshot now includes the decoded source frame.
- IR05 — completed revisions stay in Record after acceptance; explicit To result authorizes the replacement snapshot. The focused completed-revision journey passed after the test-helper adjustment.
- IR06 — pointer cancel and blur keep Record and Result playback paused; only actual release resumes.
- IR07 — LogOut is used for Exit and Undo2 for Return; button/icon screenshots are in the A/B journey evidence.
- IR08 — the charcoal recovery toast follows the approved timing and geometry; durable guidance remains after toast expiry and phone scroll position is preserved.
- IR09 — Result source controls support ArrowLeft/ArrowRight/Home/End; phone seek and volume inputs meet 48 px targets.
- IR10 — guarded boundary return restores logical Exit/Settings focus; failure/retry and expiry evidence is preserved.
- IR11 — modeled visibility/pagehide interruption stops media and saves only a usable partial as an unaccepted candidate; pending/unusable interruption preserves the prior candidate. This used fake browser input, not an OS-background or physical-device run.
- IR12 — A panel top aligns with the media at supported side-panel widths; normal, saved, and capturing screenshots plus geometry checks are preserved.

## Limits

Chrome used fake audio input, not a physical microphone. Visibility/pagehide were modeled in-browser; physical backgrounding, real microphone hardware, and cross-browser/device behavior were not tested. Result uses fixed illustrative mock media with productRendered=false and assembledFromAcceptedTakes=false; no backend renderer or real dubbing output was exercised. No full Playwright run after the last test-only clock-poll change is claimed.

Evidence root: _docs/evidence/core-journey-ab-implementation-2026-10-28/phase4/revision-v3/  
Source manifest: source-manifest.json  
Final screenshot set: full-final-c3/, with the post-adjustment Russian first-frame screenshots in long-ru-frame-c/.
