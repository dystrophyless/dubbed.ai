# Phase 2 — Shared Record journey for layouts A and B

## Boundary and run identity

- Run date: 2026-10-28, Asia/Qyzylorda (UTC+05:00); browser evidence was captured between 18:46 and 18:49 local time.
- Base `HEAD`: `9096925a4476e84ec9a6e5ef9bff50ae45ac0f67`.
- Checkout was already very dirty. All phase 2 application source is new under `frontend/`; phase 2 evidence is under this directory. No pre-existing source, prototype, or canonical contract was edited. The only phase 1 path edited is its results summary, for the provenance note below.
- The complete in-scope frontend file hash list is `source-hashes.json` (SHA-256 `41a3e6c4f2caf80532cfca50dbf94481e243840424c23df9e1005f44854970cc`), generated at 2026-10-28 13:55:38 UTC against that base `HEAD`.
- Runtime used for checks: Node.js 22.23.1, npm 10.9.8, Chromium 156.0.8078.49. Commands ran from PowerShell with `npm.cmd`.
- The local dev server is not left running. Start it with `npm.cmd run dev -- --host 127.0.0.1 --port 5180 --strictPort`. Review entry points are `http://127.0.0.1:5180/`, `/projects/sintel-prepared/record?layout=A&locale=en`, and `/projects/sintel-prepared/record?layout=B&locale=en`. Layout choice is a local explicit override. The root page labels the seeded identity as a preview, not authentication.

## Delivered

Both layouts use the same `useRecordController` and `FoundationRecordPage` behavior. Layout A centers the video independently of its right panel; layout B keeps the controls on its centered canvas. The focused Record page uses a centered project title and turn dots, external transcript captions, source/capture waveform provenance, English and Russian copy, and accessible phone-sized controls. A/B views do not carry separate save, transport, acceptance, or recovery logic.

Recording calls the owned `BrowserMediaPort` only after explicit user action. Native `getUserMedia`/`MediaRecorder` produces actual candidate Blob bytes; the fixed window stops automatically. The moving source video and reference audio start with capture. Playback, source selection, seek, Exit, and turn changes are guarded during capture. Candidate preview uses the captured Blob. Real capture peaks are shown for the take; the prepared source waveform is explicitly illustrative.

The typed service boundary remains central: `Services` exposes the mock `ProjectPort`, `CaptureGrantPort`, and `BrowserMediaPort`. `CaptureGrantPort.acquire(scope)` returns an acquired grant, a held result, or an unavailable result; this implementation uses a bounded browser-local, same-project tab grant and makes no cross-device lease claim. `BrowserMediaPort.captureFixedWindow` accepts duration, purpose, abort signal, start and progress callbacks and returns a `NativeCapture`; object URL creation and revocation remain behind the port. `ProjectPort` owns prepared-project load, grant acquire/release, candidate save/accept/discard, snapshot authorization and read, operation lookup, recovery/navigation intents, candidate lookup, and tombstoning. UI code does not access IndexedDB or call raw media APIs.

Candidate bytes are journaled before a recoverable save acknowledgement. Confirmed known failure retains the exact candidate and prior accepted take; an unknown outcome only checks the original operation ID. Accepting a take is a separate durable action from saving a draft. Reload restores the current project/turn and compatible candidate. Project/account/revision/tombstone fences and the local tab grant reject stale or cross-scope work. Initial completion authorizes an immutable snapshot through the final accepted turn. Replacing an accepted take on an already completed revision remains in Record and does not automatically authorize a new result.

The guarded Settings/auth/neighboring routes remain explicit boundaries. The Result page remains a stub consumer boundary for phase 3. Seeded output files are mock fixtures and carry `productRendered: false` and `assembledFromAcceptedTakes: false`; no backend, render, or generated product result is claimed.

## Verification

| Command | Result |
| --- | --- |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd test` | PASS — 3 files, 14 tests |
| `npm.cmd run build` | PASS — Vite 8.3.5 production build |
| `npm.cmd run test:browser` | PASS — 11 Chromium tests, one worker |
| Targeted A/B browser rerun after adding initial-header evidence | PASS — 2 tests |

Browser coverage includes both connected three-turn journeys, captured Blob preview, route/layout screenshots, English/Russian content, 390×667 phone views, reload recovery, other-tab exclusion, interrupted usable partial capture, permission-denied handling, known save failure preserving the prior accepted take, and lost acknowledgement reconciliation without duplicate save. The additional A/B rerun checked the final initial header/screen evidence hook; product behavior did not change after the full browser run. No standalone phase 2 console-log files were written; JSON and screenshots below are the retained browser artifacts.

Actual fake-input proof from Chromium has variable output, not a fixed byte/frame target: the recorded verification sample was 21,660 bytes, `audio/webm;codecs=opus`, 1.8 decoded seconds / 86,400 frames, 1,818ms elapsed, SHA-256 `764187bf514d0eed4b1b3eea1c21d47134e07aad9ac652ea356c1a398a88f94d`. Reload recovered the same operation and SHA without reacquiring media. The interrupted partial sample was 2,992 bytes, 0.66 decoded seconds / 31,680 frames, with `endReason: interrupted` and SHA-256 `66d25bdbde17bc59685fb25badd82a1733a9b860fb6dfafb57eebafaf299e83c`. The harness dispatched the ended event at about 700ms.

The permission-denied E2E injects `NotAllowedError` through the test harness; it does not exercise a native browser permission prompt. Neither media sample used a physical microphone.

## Raw evidence

All paths below are relative to `_docs/evidence/core-journey-ab-implementation-2026-10-28/phase2/`.

- `layout-a-1440x900-ready.png`, `layout-b-1440x900-ready.png`, and corresponding `*-russian.png` files capture the ready state at desktop size. `layout-a-390x667-ready.png`, `layout-b-390x667-ready.png`, and corresponding Russian files capture phone layouts.
- `layout-a-1440x900-candidate.png`, `layout-b-1440x900-candidate.png`, `layout-a-1440x900-candidate-guard.png`, `layout-a-1440x900-reloaded-candidate.png`, and the A/B `*-final-candidate.png` screenshots capture candidate, guarded Exit, reload, and final-take states.
- `layout-a-turn-2-russian.png`, `layout-a-turn-3-russian.png`, `layout-b-turn-2-russian.png`, `layout-b-turn-3-russian.png` show later transcript turns.
- `layout-a-browser-evidence.json` — SHA-256 `064866093bd8f37ade6c95f17c73c857f5a1954313789abe11306f2643985d4c`.
- `layout-b-browser-evidence.json` — SHA-256 `5729f23d7083ef201915530dcb57f9c7faddef82dc0df538637ec00a3542c1bc`.
- `native-media-proof.json` / `.png` record native API capture and reload; JSON SHA-256 `fc57a2cba2083157ad0f5de4c02e6813f0047bbc0048689ed2dede3eb64da545e`.
- `interrupted-partial-browser-evidence.json` — SHA-256 `23bdbA85a9a93319b14d0ae9fcd65dcaf08c203250fd557b0c5e0655ee5a7685`.
- `lost-save-ack-browser-evidence.json` — SHA-256 `4980c00d89420e247be682a06ce8d6bb5e79909d5ab34a1f2d4bb6e6b972005b`.
- `known-save-failure-browser-evidence.json` — SHA-256 `bd92d08a702b700568c981e96bb73227bdb2d2ae849350d110ccb537389e35b9`.
- `permission-denied-browser-evidence.json` — SHA-256 `679349c95a7f8a45a9f8aaf455bb7f872d83bd1f8780dcaa3401d837222da782`.
- `media-fixtures-proof.json`, `layout-a-seeded-route.png`, and `layout-b-seeded-route.png` capture fixture source identity and initial route screens.

## Phase 1 raw artifact provenance

An early phase 2 browser run regenerated and overwrote these raw files under `../phase1/` on 2026-10-28 around 18:30 local time (the timestamps below are UTC):

| Path | Current regenerated SHA-256 | Current bytes | Current UTC timestamp |
| --- | --- | ---: | --- |
| `../phase1/layout-a-seeded-route.png` | `5afeac4d9ea4429df8a03e9c243be369430ba3bc273aed7035885c3dec5243bb` | 239,835 | 13:29:58 |
| `../phase1/layout-b-seeded-route.png` | `6edd0ada3fcf570638a3c09065da3708c384787b0da17e6119505a7e3a7e5b8f` | 360,548 | 13:29:59 |
| `../phase1/media-fixtures-proof.json` | `b62aeb66906849bc6c5411462ca922df6c8f96a3b742eb5c4cf93c0682de10f5` | 1,222 | 13:30:04 |
| `../phase1/native-media-proof.png` | `bb17a3ae7186c0b0fcb0ccca885e37371aa18921f50893e263353f6ebd1097e9` | 87,009 | 13:30:07 |
| `../phase1/native-media-proof.json` | `002e1cefaae53a0bf1b13cf2e423699c55a76f2c2a8837f6d673815cd864f856c` | 930 | 13:30:08 |

The hashes in this table identify the current regenerated bytes only; original phase 1 raw-file hashes are unavailable and those bytes were not reconstructed. `_docs/evidence/core-journey-ab-implementation-2026-10-28/phase1/phase1-results.md` now states that its phase 1 summary/logs are historical and that those five current raw files must not be represented as phase 1 outputs. E2E output paths now target this phase 2 directory; `rg -n 'phase1' frontend/e2e` returned no matches.

## Limits and phase 3 prerequisites

- Browser fake input proves real browser media APIs and decoded bytes in Chromium only. Physical microphones/devices, device changes, and native browser permission UI were not tested.
- This grant is same-browser/local-tab exclusion, not a cross-device lease or production concurrency service.
- Prepared source waveform values are illustrative; captured-take waveform peaks come from actual captured media.
- Browser tests use a seeded local mock identity. Real auth, backend persistence, cross-device durability, upload, billing, transcription, backend rendering, and production result generation are outside this implementation.
- Phase 3 should consume the authorized `ImmutableResultSnapshot` by snapshot ID and verify scope, project/preparation revision, source hash, and each accepted take's ID/hash/operation/revision before presenting the stub Result flow. Keep `authorization` (`initial-completion` vs `explicit-completed-revision`) and never infer new render eligibility from counts or page navigation.
- `Services` currently exposes immutable snapshot reads and fixture metadata but no dedicated result-generation operation port. Phase 3 needs a narrow typed mock generation/status port through the existing factory, with same-operation reconciliation; its fixed fixtures must remain labeled `productRendered: false` and `assembledFromAcceptedTakes: false`. Do not call this a rendered dub.
- Preserve the rule that replacing a take on an already completed project revision stays in Record. Only an explicit completed-revision authorization may produce a new immutable snapshot. Complete and verify the real mock-generation-to-Result consumer, later-turn focus/scroll behavior, Result Exit behavior, and any explicit last-turn Result navigation in phase 3.

**Phase 2 implementation is paused for independent verification.**
