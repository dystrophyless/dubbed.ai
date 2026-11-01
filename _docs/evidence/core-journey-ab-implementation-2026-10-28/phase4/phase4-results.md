# Phase 4 integrated frontend evidence

**Handoff:** Ready for integrated frontend review. Edits are paused at this named handoff; independent fresh review and owner acceptance are still pending.

## Environment and boundary

- Date/time: 2026-10-28, Asia/Qyzylorda (UTC+05:00).
- Base revision: `9096925a4476e84ec9a6e5ef9bff50ae45ac0f67`.
- Runtime: Windows PowerShell, Node.js `v22.23.1`, npm `10.9.8`, Chrome `156.0.8078.49`.
- The worktree was already dirty. The frontend and phase4 evidence are the only paths owned by this implementation slice; unrelated local changes and frozen prototypes/canonical specs were preserved. Nothing was committed, pushed, published, deployed, or used for a live experiment.
- Source hashes for the frontend source, tests, media fixtures, and build configuration are in `verification-2026-10-28-final5/source-sha256.txt`.

## Implemented

- One shared Record controller and service path drives both A and B. A keeps the video centered with its 272px action panel 24px from the video; B keeps the actions centered beneath the media. The app now waits for the project/view/snapshot matching the current route before mounting Record or Result. This prevents a stale Record mount during Result-to-Record return from racing the exclusive browser lock; regression evidence records two successful acquisitions and no failed duplicate.
- Record waveform peaks are decoded from the hash-verified prepared source through `BrowserMediaPort`. Captured take bytes still come from the explicit browser `getUserMedia`/`MediaRecorder` path; no timer-only capture was substituted. The Result player reads its selected generation through the result service and reports the fixed illustrative sample honestly.
- Visual corrections align the title and position dots, centered dialogue, source waveform envelope, seek playhead, outlined Exit, Next states, phone header, Result width, and Result entry scroll/focus with the approved A/B targets. B’s desktop line count remains visible while its title and dots stay hidden; its phone header shows the approved title, dots, and count.
- The E2E evidence counter survives same-tab reloads and Result navigation, so the final A/B JSON records actual native API calls rather than resetting at a full document navigation.

## Verification

All commands ran in `frontend/` after the final source changes:

- `npm.cmd run typecheck` — PASS.
- `npm.cmd run lint` — PASS.
- `npm.cmd test` — PASS, 17 tests across 4 files.
- `npm.cmd run build` — PASS, Vite 8.3.5 production build.
- `$env:DUBBED_CORE_EVIDENCE_RUN='phase4/verification-2026-10-28-final5'; npm.cmd run test:browser` — PASS, 14 browser tests in Chrome 156.

The browser run covers both A/B capture-to-Result journeys, the explicit completed-revision route, candidate/save recovery, an unknown write acknowledgement, interrupted usable capture, local second-tab exclusion, denied microphone behavior, phone touch seek, desktop keyboard seek, Result source switching/download bytes, and 15 visual viewport cases including long Russian copy, 1247/1248 and 1023/1024 boundaries, reduced motion and forced colors.

For each A/B journey, Chrome’s fake audio input produced three distinct stored `audio/webm;codecs=opus` Blobs. The evidence records 3 `getUserMedia` calls and 3 `MediaRecorder.start` calls per layout, fixed-window completion, operation receipts, and capture SHA-256 values. This proves the real browser capture APIs against Chrome fake input; it does not prove a physical microphone or hardware behavior.

The final source asset is `/media/scene.mp4`, 886,403 bytes, SHA-256 `c99eada0a03cb9f4a2ab41641a81ce6b74f628bc15ded4b3319a43c3fc9d766c`, measured at 13.416667 seconds and 960×408. Attribution is Sintel / Blender Foundation / CC BY 3.0. The source waveform is decoded from this asset. The result sample is a fixed illustrative fixture; its manifest records `productRendered: false` and `assembledFromAcceptedTakes: false`. The revised snapshot is durably marked `explicit-completed-revision`; the presented WebM reports duration unknown until end, so the UI does not invent a finite duration.

## Evidence files

Authoritative raw output is under `verification-2026-10-28-final5/`:

- `phase4-visual-browser-evidence.json` and A/B viewport screenshots (`A-1440x900-en.png`, `B-1440x900-en.png`, `A-1366x650-ru-long.png`, `B-390x667-ru-long.png`, and boundary/phone captures).
- `layout-a-browser-evidence.json` and `layout-b-browser-evidence.json` contain native API counts, Blob metadata, operation lineage, and immutable initial snapshots.
- `phase4-explicit-revision-browser-evidence.json` records the completed-revision snapshot, successful capture-grant reacquisition, and presented My dub media metadata.
- `layout-a-1440x900-result-ready.png`, `layout-b-390x844-result-ready.png`, and `phase4-explicit-revision-result.png` show the Result surfaces.
- `media-fixtures-proof.json`, `native-media-proof.json`, and `source-sha256.txt` record fixture provenance, native fake-input recovery, and source hashes.
- `preview.stdout.log` and `preview.stderr.log` are the logs for the reviewer preview.

The local preview is running at `http://127.0.0.1:5180/` (HTTP 200; PID 9280). Ports 5178 and 5179 were not touched.

## Limits before acceptance

- The result backend is the interchangeable local mock. No real backend render or user-produced dubbed output exists in this slice; the sample is not made from the captured takes.
- Fake browser input is not a physical microphone test. Local Web Locks evidence covers tabs in this browser, not a cross-device lease.
- The 14-test browser suite and screenshots are implementation evidence, not independent product acceptance. Fresh Sol review and any review fixes remain for the parent orchestration phase.
