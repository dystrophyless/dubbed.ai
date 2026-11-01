# Phase 3 verification

Date: 2026-10-28 (Asia/Qyzylorda). Browser run recorded at 2026-10-28 14:53 UTC.

Base revision: `9096925a4476e84ec9a6e5ef9bff50ae45ac0f67`. The worktree was already very dirty. Phase 3 edits are limited to `frontend/**` and this evidence directory; unrelated dirty files were preserved. No commit, push, deployment, or prototype/canonical contract edit was made.

## Delivered

- Added a typed `ResultPort` backed by the existing shared IndexedDB service facade. It persists immutable authorization snapshots, idempotent generation jobs, operation receipts, and exact fixture Blobs. Result UI uses the port; it does not call IndexedDB, `fetch`, or device APIs directly.
- The mock validates account, project, tombstone, latest snapshot, source/selection/background metadata, exact accepted windows, accepted take hashes, and snapshot content hash before starting. Lost start/retry acknowledgements reconcile against the original operation. It preserves the previous ready generation while a new authorized revision is assembling.
- Initial completion and explicit completed-revision acceptance create their snapshot atomically with the acceptance. The Result route only exposes the fixed sample after an authorized snapshot exists; an empty route now shows a guarded path back to the first recording window.
- Added one shared A/B Result player with original/sample comparison, source-switch playhead and play-intent restoration, generation pinning for downloads, retry/status recovery, entry focus/scroll, and exit/return handling. The UI discloses that the fixed sample was not rendered or assembled from accepted takes.
- Added ResultPort conformance tests and connected the real-recording browser journey through Result for both layouts. The browser verifies the actual downloaded bytes against the persisted fixture SHA-256, including download while Original is selected.

## Verification

Environment: Windows, Node `v22.23.1`, npm `10.9.8`, Chrome `156.0.8078.49`.

- `npm.cmd run typecheck` — passed.
- `npm.cmd run lint` — passed with zero warnings.
- `npm.cmd test` — passed, 4 test files / 17 tests.
- `npm.cmd run build` — passed with Vite `8.3.5`.
- `$env:DUBBED_CORE_EVIDENCE_RUN='phase3/verification-2026-10-28-run3'; npm.cmd run test:browser` — passed, 11 Chrome tests in 1.5 minutes. The suite included seeded-route guards, fixture decoding, real browser fake-input capture, interrupted partial recovery, lost/known save failures, A/B complete capture journeys, result playback, download bytes, and capture-tab exclusion.
- `git diff --check` — exit 0. Git emitted line-ending notices for existing unrelated dirty files; no whitespace errors were reported.

## Evidence

- `layout-a-browser-evidence.json` and `layout-b-browser-evidence.json` contain the authorized snapshot, capture, generation, fixture, and download records. Both downloads matched the persisted `example-dub.mp4` bytes: 749,601 bytes, SHA-256 `fe7cb91ebdd2a2e208de6935942d585fced88b734726d19e565958ad3b1bacc9`.
- `layout-a-1440x900-result-ready.png` and `layout-b-1440x900-result-ready.png` show the final desktop Result state.
- `layout-a-result-fixture-unavailable.png` shows the retryable fixture failure state; the suite then retried successfully.
- `layout-a-390x844-result-ready.png` and `layout-b-390x844-result-ready.png` show the phone layout. The tests assert no horizontal overflow and a download target at least 48 px high.
- `frontend-source-sha256.json` records hashes for the frontend source, browser tests, package manifests, and build/test configuration at this handoff.

The earlier phase 2 browser run overwrote/regenerated raw browser artifacts under `_docs/evidence/core-journey-ab-implementation-2026-10-28/phase1/`. Their original byte contents are not available here and were not reconstructed; current phase 1 files must not be used as historical raw evidence. Phase 3 checks use fresh, phase-specific `verification-2026-10-28-run3/` outputs.

## Limits and next gate

Chrome fake audio input exercised the browser's real `getUserMedia` and `MediaRecorder` APIs; no physical microphone was used. The Result output is an illustrative local fixture, not a backend job or rendered dub. No production backend, real render pipeline, cross-device capture lease, or deployed environment was exercised. The shared Result player still needs the required phase 4 comparison against the approved prototype screens, connected journey review, and independent integration review before the full frontend task can be accepted.
