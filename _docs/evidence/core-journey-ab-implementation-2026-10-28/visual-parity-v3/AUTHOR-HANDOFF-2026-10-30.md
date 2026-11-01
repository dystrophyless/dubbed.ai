# Ready for integrated frontend review — visual parity v3

**Status: Ready for integrated frontend review — visual parity v3.**  
**Edits: PAUSED.**

## Scope and source boundary

This revision closes the four bounded findings in `integration-review/visual-parity-v2/REVIEW.md`. It keeps the existing native capture, persistence, Result generation, and playback controllers. The frozen prototypes and canonical contracts were not edited.

Base revision: `9096925a4476e84ec9a6e5ef9bff50ae45ac0f67`. The checkout remains very dirty; `frontend/` is the existing untracked implementation tree. Pre-existing unrelated docs and evidence were preserved. No commit or push was made.

The local preview is running at [http://127.0.0.1:5180](http://127.0.0.1:5180) and returned HTTP 200 at handoff. See [SOURCE-MANIFEST-SHA256.txt](SOURCE-MANIFEST-SHA256.txt) for the six implementation and browser-test source hashes.

## Finding dispositions

- **VP01 — short Result fit and cascade:** removed the temporary 548px override. The fit controller now reads `--result-min-width` from the workspace where the approved prototype declares it, uses the prototype's `innerWidth - 64` maximum, and keeps its height-fit calculation. The approved 480px minimum is clamped to the available width. Reset the legacy actions flex, selector border and backdrop, A short text size and bottom padding, and B phone actions gap. Shortening the truthful ready status to “Sample ready” (RU: “Пример готов”) prevents an extra wrapped heading line; the adjacent disclosure still says the fixed example was not rendered from accepted takes.
- **VP02 — volume binding:** fresh Record media elements receive the displayed 0.7 source volume, and Result opens at 0.7. The A/B journey checks the displayed and actual media values, including after source switching.
- **VP03 — ended transport:** the existing primary Result transport becomes Replay on the actual ended event. No second playback control is rendered; the A/B journeys check one Replay control and that it restarts playback.
- **VP04 — A phone Russian controls:** the effective A phone padding is 12px vertical and 8px horizontal under the scoped cascade. The exact approved long-Russian fixture measures both A controls at 72px high.

## Verification

All commands ran on 2026-10-30 in the Windows workspace.

- `npm.cmd run typecheck --prefix frontend` — PASS.
- `npm.cmd run lint --prefix frontend` — PASS.
- `npm.cmd test --prefix frontend` — PASS, 4 files / 17 tests.
- `npm.cmd run build --prefix frontend` — PASS.
- `npm.cmd run test:browser --prefix frontend -- e2e/record-journey.spec.ts --grep 'records real browser fake input' --output <unique-run>/playwright-output` — PASS, both A and B journeys. They captured real browser `getUserMedia`/`MediaRecorder` Blobs using Chrome fake input, saved and accepted all three turns, checked source volume and switching, exercised a controlled current-source error and reload recovery, compared short and phone bounds, and confirmed finite-end Replay.
- `npm.cmd run test:browser --prefix frontend -- e2e/record-journey.spec.ts --grep 'approved long Russian line' --output <unique-run>/playwright-output` — PASS, one isolated A/B stress test. At 390×844, A controls were 72px with 12px/8px padding; no horizontal overflow. Source fixture text was overridden in memory for this test only; seeded project text was unchanged.
- `git rev-parse HEAD` — `9096925a4476e84ec9a6e5ef9bff50ae45ac0f67`.

The focused A/B run is [run-20261030-0012-vp03-5695e1c7](run-20261030-0012-vp03-5695e1c7/); the long-Russian run is [run-20261030-0015-vp04-4900224f](run-20261030-0015-vp04-4900224f/). Playwright stdout, screenshots, JSON measurements, and error-state records are preserved in those folders. Browser temporary files were created on C:.

At 1280×600, fresh A geometry is screen y=88, width=547.546875; fresh B geometry is y=80, width=561.765625. Both documents are exactly 600px high. These match the frozen v2 reference screenshots within 0.01px: `integration-review/visual-parity-v2/run-1793296129331/A-ref-result-1280.png` and `B-ref-result-1280.png`. The frozen prototypes were unchanged after the v2 reviewer verified their 45-entry source manifest.

Fresh A/B 390×844 current-source error screenshots show the error and “Reload sample” recovery control. The error was a synthetic current-media `error` event on the real Blob-backed player; the successful reload used the same sample Blob and retained the presented generation ID. The JSON records `retryPlaying: true` and `videoWidth: 960` for both layouts.

## Preserved limitations and prior failed attempts

Chrome fake input exercises the browser capture APIs; it is not a physical microphone test. The current-source error check injects a controlled DOM media error; it does not establish a network failure. Result output remains the fixed, visibly disclosed example and is not rendered from the captured voice. Backend rendering, physical devices, and hardware interruption were not tested in this parity pass.

Two earlier focused attempts are preserved rather than overwritten. `run-20261029-2353-vp03-f04ad9bb` showed the current error correctly but its new test looked for “Retry playback”; the actual localized button is “Reload sample”. `run-20261029-2353-vp03-7b2ef1ec` passed B and exposed A's deterministic 512px width: the longer truthful ready heading wrapped and increased the measured bottom row by 20px. The source-faithful fit plus concise truthful status resolves that geometry; the final A/B run passes. These were assertion/content mismatches, not intermittent browser passes.

## Review handoff

The source version is stable, the preview is available, evidence and hashes are recorded, and edits are paused pending independent integrated frontend review.
