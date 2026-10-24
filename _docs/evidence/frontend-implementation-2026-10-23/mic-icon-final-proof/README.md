# Microphone playback and icon audit proof

Prepared 2026-10-24 for live issues [#69](https://github.com/dystrophyless/dubbed.ai/issues/69) and [#78](https://github.com/dystrophyless/dubbed.ai/issues/78). This folder contains focused proof for microphone optional-test playback/accessibility, Lucide source inventory and rendered icon states. It does not record acceptance or issue closure.

Current report, source and archived proof hashes are listed in [SHA256SUMS.md](SHA256SUMS.md); that manifest intentionally does not hash itself.

## Microphone playback and accessibility

`frontend/e2e/microphone-lifecycle.spec.ts` adds one native-browser scenario on the current actual App route. It uses the existing Playwright Chromium fake-device/fake-permission configuration and the mock service adapter; the test explicitly mutes the captured local Blob and sets volume to zero. It checks the input-level meter's accessible name, `meter` role and numeric 0–100 ARIA value plus visible meaning text; it tabs from Record test to the native audio controls, presses Space to play, confirms focus, non-paused state and current-time progression, and verifies exit revokes the temporary Blob without IndexedDB writes. It writes the screenshot, structured observation JSON and screenshot SHA-256 when the test passes.

Run from `frontend/`:

```powershell
npm.cmd run test:e2e -- --grep "keyboard can play the local mic test"
```

Evidence outputs, created by that passing run:

- `microphone-listen-keyboard-en-1440.png`
- `microphone-listen-keyboard-proof.json`
- `microphone-listen-keyboard.sha256`
- `microphone-listen-keyboard-test.log` (preserve the focused Playwright command output here)

The test does not request or use physical microphone hardware and does not establish behavior on real devices or other browsers.

## Lucide inventory and source comparison

See [icon-audit.md](icon-audit.md) for all 19 current exports, package version/integrity, per-component treatment, adopted Clean/Light reference pairs, named contour adaptations and the rendered screen map. Existing shell proof includes [Menu/X metrics](../shell-rendered-metrics.json) and the [mobile menu capture](../shell-mobile-menu-en-390.png). The active Record states are preserved as [Play](recording-transport-focused-run-2026-10-24/record-transport-play-en-1440.png), [Pause](recording-transport-focused-run-2026-10-24/record-transport-pause-en-1440.png) and [computed SVG observations](recording-transport-focused-run-2026-10-24/record-transport-svg-observations.json); see the archive [manifest](recording-transport-focused-run-2026-10-24/manifest.md) and [SHA256SUMS](recording-transport-focused-run-2026-10-24/SHA256SUMS).

## Run status

The focused command passed on 2026-10-24: 1 browser test passed (3.9s test time, 8.3s total). The captured environment is Chromium 156.0.8078.4, Node v22.23.1, Windows, mock adapter, fake microphone/permission UI, and muted browser plus muted/zero-volume audio element. The screenshot visibly shows the focused native media controls during local playback. The archived PNG, JSON, screenshot hash, and successful command log are preserved under [focused-run-2026-10-24](focused-run-2026-10-24/).

The first run reached the clean return route, then failed only while the proof script tried to query the old meter locator after navigation. That test-collection-order failure and correction are recorded in [initial-test-collection-timeout.md](focused-run-2026-10-24/initial-test-collection-timeout.md); it was not a microphone product defect. The meter semantics are now snapshotted before exit. The Root integration run may overwrite the test's default output names in this folder; the archived run remains unchanged.

## Record transport icon proof

The existing `frontend/e2e/recording-viewport.spec.ts` scenario now captures the actual enabled Play and Pause states in its synthetic local-recording flow. The focused rerun reported by Root passed 1 test (23.9s); final typecheck also passed. It uses keyboard Space to activate Play and verifies native button name/focus, playback time progression and the SVG's 24×24 viewBox, no fill, currentColor, 1.1 stroke, round caps/joins and 14×14 rendered slot. The archived evidence is bound to test source SHA-256 `FA8F1DFA5A4F2B60AF5854FE6DCF7CBF11E7CE56F72ABEA999B192334125AAE8` in the manifest. The screenshot outputs from a later integration rerun may overwrite the root-level copies; this focused archive is fixed.

The icon map names one screenshot omission: the OTP input's verified-state Check is present in source but that exact OTP state is not shown in the current screenshots. The shared Check is rendered in Account linking. This note does not convert either issue into Root acceptance; mock evidence and production/device limits remain distinct.
