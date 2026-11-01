# Phase 1 Foundation Results

Date: 2026-10-28 (Asia/Qyzylorda)  
Base revision: `9096925a4476e84ec9a6e5ef9bff50ae45ac0f67`  
Environment: Windows PowerShell, Node `v22.23.1`, npm `10.9.8`, Chrome `156.0.8078.49`  
Boundary: the checkout was already dirty at dispatch. This phase added only `frontend/**` and this authorized evidence folder. No files were staged or committed.

## Delivered

- New React, TypeScript, Zustand and Vite foundation on `127.0.0.1:5180`. Explicit local `layout=A|B` routes use the seeded prepared project. The phase-1 Record shell does not request microphone access; Result and neighboring out-of-scope routes state their boundary.
- Typed central service factory and interfaces. The seeded mock uses IndexedDB for account/project state, capture Blobs and an operation journal. Blob persistence completes before success is acknowledged; an uncertain write can be reconciled by its original operation ID. Account, revision, turn and tombstone fences reject stale or cross-scope writes. The unavailable real adapter and invalid configuration fail closed.
- Owned browser-media port using `getUserMedia` and `MediaRecorder`, with an explicit-action-only development proof route, fixed auto-stop, Blob metadata/decode inspection, cleanup and verification-only persistence.
- Source and illustrative result media with fixture provenance, hashes and orientation metadata. The source credit remains Sintel · Blender Foundation · CC BY 3.0. All illustrative generations are marked `productRendered: false` and `assembledFromAcceptedTakes: false`.

| Asset | Bytes | SHA-256 | Decoded dimensions | Duration |
|---|---:|---|---:|---:|
| `scene.mp4` | 886,403 | `c99eada0a03cb9f4a2ab41641a81ce6b74f628bc15ded4b3319a43c3fc9d766c` | 960 × 408 | 13.416667 s |
| `example-dub.mp4` | 749,601 | `fe7cb91ebdd2a2e208de6935942d585fced88b734726d19e565958ad3b1bacc9` | 960 × 408 | 13.416667 s |
| `result-generation-002.webm` | 2,514,724 | `f3802515a6738409226b8c9c705d31671e7768f81043ada452302240bb146d93` | 960 × 408 | 13.398 s observed at full playback end; manifest rounds to 13.4 s |

The alternate WebM was generated in Chrome from the approved Sintel source and the three supplied synthetic WAV takes. Chrome reports unknown duration from this MediaRecorder WebM container until playback ends; the media proof records the measured end time. It remains a synthetic fixture, not a user result.

## Verification

| Command | Result | Raw output |
|---|---|---|
| `npm.cmd run typecheck` | PASS | `typecheck.log` |
| `npm.cmd run lint` | PASS | `lint.log` |
| `npm.cmd test` | PASS · 3 files, 11 tests | `unit.log` |
| `npm.cmd run build` | PASS · Vite 8.3.5 | `build.log` |
| `npm.cmd run test:browser` | PASS · 4 browser tests, Chrome 156 | `browser.log` |

Playwright started the Vite development server on port 5180 and opened both seeded layouts, Result, the source dialog and the guarded project boundary. Chrome ran headless with `--use-fake-device-for-media-stream` and `--use-fake-ui-for-media-stream`. The suite decoded the source and both illustrative videos and matched the stored byte counts and SHA-256 hashes. The build output contains matching copies under `frontend/dist/media/`.

The native-media proof showed no capture before the explicit button click, then one `getUserMedia` call, one recorder start/stop and one stopped audio track. Chrome's fake input produced an `audio/webm;codecs=opus` Blob of 20,380 bytes; it decoded to 83,520 frames, one channel at 48 kHz, and 1.74 seconds. IndexedDB readback and reload recovery returned the same operation ID and SHA-256 without starting another capture. This was browser-supplied fake input, not a physical microphone.

The 11 unit tests cover factory selection/fail-closed configuration, import boundaries, IndexedDB write ordering and idempotency, uncertain-write lookup, account/revision/tombstone fences, quota and open failures, and zero-byte rejection. `git diff --check` completed with only LF-to-CRLF warnings from unrelated dirty repository files.

## Evidence Files

- `layout-a-seeded-route.png`, `layout-b-seeded-route.png` — seeded Record shell after a decoded source frame.
- `media-fixtures-proof.json` — browser-decoded media size, hash, dimensions and duration measurements.
- `native-media-proof.png`, `native-media-proof.json` — explicit fake-input capture, Blob decode, persistence and reload-recovery proof.
- `typecheck.log`, `lint.log`, `unit.log`, `build.log`, `browser.log` — final phase-1 command output.

## Limits

Physical microphone/device behavior, real backend integration, production result rendering, authentication, billing and full A/B visual implementation were not tested or implemented in this phase. The A/B screenshots show the foundation shell only; the frozen prototypes remain unchanged.

## Raw-artifact provenance

On 2026-10-28, an initial phase 2 browser-suite rerun regenerated and overwrote these raw files: `layout-a-seeded-route.png`, `layout-b-seeded-route.png`, `media-fixtures-proof.json`, `native-media-proof.json` and `native-media-proof.png`. The phase 1 summary above and its command logs remain historical records; do not treat the current bytes of those five files as phase 1 run outputs. Phase 2 run-specific evidence is recorded under `../phase2/`.
