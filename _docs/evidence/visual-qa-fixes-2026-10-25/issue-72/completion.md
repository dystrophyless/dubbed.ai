# Issue 72 — proactive visual QA corrections

**Implementation status:** source, registry, assets, service mapping, and focused verification complete. Native product UI capture for NewDub → Record → Result belongs to the coordinated #63 journey; the media probe screenshots below are not presented as product screens.

**Worktree boundary:** shared dirty worktree at `9d2866211772`, inspected 2026-10-25. No commit, push, GitHub mutation, or full-suite run was made. The #74 preparation reservation projection and #77 recording actor fence remain in their shared files and were preserved.

## Finding dispositions

### QA-72-01 — portrait scene and longer reading selection

**Addressed in the local mock fixture corpus and service path.** Added an original Canvas-vector observatory scene with two recognizable illustrated speakers, portrait containment at 540×960, and a 35,956.553 ms selection. The same annotation data supplies four dialogue turns with 23, 23, 29, and 27 words and a 2,955.692 ms overlap. The selection exercises a longer reading load than the existing 8.65-second fixture.

The NewDub preview recognizes the new source by its stored source ID/revision and exact SHA-256 plus byte length. Preparation selects the matching annotated timeline. At assembly acknowledgement, the mock stores the exact source identity internally; Result chooses the portrait generation from that immutable acknowledged fingerprint. A repeated acknowledgement preserves its original snapshot after source replacement; a missing source row or wrong digest falls back to the existing landscape synthetic result. Public `AssemblyAuthorization` remains unchanged, and the service regression proves the new portrait result URL and these fallback/replay paths.

The authored speech was synthesized locally with installed Windows SAPI voices. This is synthetic fixture material, not a natural performance. `productRendered:false` and `assembledFromAcceptedTakes:false` remain explicit for both new result files. The service test accepts synthetic byte blobs only to exercise the mock service lifecycle; it does not claim real captured or accepted performances.

### QA-72-02 — timing and overlap visual oracle

**Addressed with a diagnostic-only portrait oracle.** It draws the visible fixture clock, active turn IDs, and an overlap marker from the same PCM sample-frame annotations used by the timeline. The probe separately records the nominal Canvas draw clock and decoded `requestVideoFrameCallback.mediaTime` from the actual encoded oracle MP4.

| Sample | Requested annotation time | Actual encoded frame time | Active IDs | Result |
| --- | ---: | ---: | --- | --- |
| Before overlap | 5,672.358 ms | 5,672.367 ms | Mara | PASS |
| Inside overlap | 6,372.358 ms | 6,373.267 ms | Mara, Eli | PASS; 2,331 red overlap-marker pixels |
| After overlap | 9,328.050 ms | 9,372.000 ms | Eli | PASS |

The oracle is not a product subtitle track. Frame-marker checks do not measure inter-track audio/video synchronization quality and are not sync certification.

## Files and assets

- Registry: `frontend/src/media/portrait-fixtures.ts`
- Published manifest: `frontend/public/media/portrait-fixture-manifest.json`
- Additive generator: `frontend/tests/media/generate-portrait-fixtures.mjs`
- Local speech synthesis helper: `frontend/tests/media/generate-portrait-speech.ps1`
- Muted Chromium playback/timing probe: `frontend/tests/media/probe-portrait-fixtures.mjs`
- Media corpus assertions: `frontend/tests/media/fixtures.test.mjs`
- Service lifecycle regression: `frontend/tests/services/portrait-media-fixtures.test.ts`
- Preview mapping: `frontend/src/services/mock-previews.ts`
- Preparation timeline mapping: `frontend/src/services/mock-preparation.ts`
- Internal ACK source fingerprint: `frontend/src/services/mock-store.ts` and `frontend/src/services/mock-recording.ts`
- Result generation and playback mapping: `frontend/src/services/mock-results.ts`

Additive media identities:

| Asset | Bytes | SHA-256 |
| --- | ---: | --- |
| `frontend/public/media/portrait-long-source.mp4` | 857,809 | `4ebe060311dfa4411f474ad45c8b2bfab3c9718e5813eea3db9c0dc6bf68d626` |
| `frontend/public/media/portrait-long-source-master.wav` | 3,171,412 | `08ecb7a47f33b2d78685756a4fd9b4934b78f8357fe9ec61d028a73daff1e9b5` |
| `frontend/public/media/portrait-timing-oracle.mp4` | 1,175,759 | `f1b727e040dc0f27c887e08f370c9ee1b4abbce694d1f19f0fdfde6fc969f6f2` |
| `frontend/public/media/portrait-result-generation-001.mp4` | 868,886 | `dcc9218f3fee9a54c18fa10a97413453d6f7411e527cf8920119f4a8382c9f1d` |
| `frontend/public/media/portrait-result-generation-002.mp4` | 843,181 | `ac3cd36234efcdb4da245157293be0fe81f5bb27929308be380b28dd7d550ee0` |

All four MP4s reached `ended` in muted Chromium 156.0.8078.4 at 540×960 with one AVC video track and one AAC audio track. The source has 792,842 stereo PCM frames at 22,050 Hz. Generation 001 and 002 have distinct media hashes and fixture identities.

The original 13-asset hash and legacy generation identity readback is in `legacy-asset-hash-verification.json`. All 13 match their recorded pre-generation SHA-256 values. The original `resultGeneration1` and `resultGeneration2` keys, `generation-001`/`generation-002` IDs, and `GENERATION 001`/`GENERATION 002` title cards are unchanged.

## Verification

All commands were run locally on 2026-10-25 at HEAD `9d2866211772` in the shared dirty worktree. Logs are in `evidence/`.

| Command | Result |
| --- | --- |
| From `frontend`: `npm.cmd exec -- vitest run tests/services/portrait-media-fixtures.test.ts tests/services/compatible-previews.test.ts tests/services/recording-results.test.ts` | PASS — 3 files, 17 tests |
| From `frontend`: `npm.cmd run test:media` | PASS — 4 tests, including all original 13 asset hashes and the portrait timeline/oracle assertions |
| From `frontend`: `node tests/media/probe-portrait-fixtures.mjs` | PASS — 4/4 MP4 playback, encoded track checks, and all three timing samples; server port 4572 is closed |
| Bounded `git diff --check` on changed service and media-test files | PASS |
| From `frontend`: `npm.cmd run typecheck` | BLOCKED by unrelated shared-tree errors in `src/features/account-linking/AccountLinkingScreen.tsx` at lines 598, 604, 652, 658 and `src/features/processing/ProcessingScreen.tsx` at line 864. No #72-owned source, registry, or test file is named in the diagnostics. Exact output: `evidence/typecheck.log`. Global typecheck was not rerun. |

Logs and structured evidence:

- `evidence/focused-service-tests.log`
- `evidence/media-corpus-test.log`
- `evidence/portrait-playback-probe.log`
- `evidence/typecheck.log`
- `portrait-media-playback-probe.json`
- `legacy-asset-hash-verification.json`

Fresh media screenshots:

- `evidence/portrait-source-playback.png`
- `evidence/portrait-oracle-before-overlap.png`
- `evidence/portrait-oracle-inside-overlap.png`
- `evidence/portrait-oracle-after-overlap.png`
- `evidence/portrait-result-generation-001.png`
- `evidence/portrait-result-generation-002.png`

## Limits

- The native probe is a headless Chromium media-element playback check with `--mute-audio`, fake-device flags, and muted media elements; it used no physical microphone or speakers.
- The scene is original vector artwork and the speech is local Windows SAPI synthesis. No human performance, external artwork, or redistribution permission for installed voice packs is claimed.
- Pixel/clock observations distinguish requested annotation time, nominal draw time, and actual encoded video-frame time. They do not certify audio/video synchronization or lip sync.
- The result assets are static synthetic mock generations, not renders from accepted takes or custom uploads. This probe does not capture NewDub, Record, or Result product UI; the coordinated #63 native journey owns those product screenshots.
- No Safari/iOS, physical-device, production-render, or full-suite result is claimed.
