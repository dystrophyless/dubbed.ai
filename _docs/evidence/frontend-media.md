# Frontend browser media evidence

Date: 2026-10-21 (Asia/Qyzylorda)  
Base revision: `2f70ac94d059585f9608df39efbc96be555c3f98`; implementation worktree is dirty and shared with the frontend executor.  
Environment: Node 22.23.1, Vitest 5.0.5, Playwright 1.64.1, Chromium 156.0.8078.4.  
Scope: local browser file inspection, native microphone capture with Chromium's deterministic fake device, local video/audio preview, and deterministic adapter tests.

## Checks

| Command or exercise | Result |
|---|---|
| `npm.cmd test -- src/device/device.test.ts` (historical) | PASS, 1 file / 9 tests. Superseded by the 10-device-test run below. |
| `npm.cmd exec vitest -- run src/device/device.test.ts src/features/Recording.test.tsx` | PASS, 2 files / 14 tests: 10 device adapter and 4 recording-screen behavior tests. Covers delayed audio/video metadata seeks and playback synchronization, capture lifecycle, blocked playback, saved-take identity through replacement failure/retry, hidden source video while recording, and explicit acceptance of an interrupted take. |
| `npm.cmd test` | PASS, 9 files / 48 tests. |
| `npm.cmd run typecheck` | PASS, full frontend TypeScript project build (`tsc -b --pretty false`). |
| Playwright Chromium on `http://127.0.0.1:5173/demo/poster.png`, importing `/src/device/browserDevice.ts`; args `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream`, context permission `microphone`; local `scene-silent.mp4` bytes supplied as a browser `File` | File inspection returned `video/mp4`, 105,277 bytes, 54 seconds, 640×360. Capture auto-stopped at 0.500 seconds with `complete`, WebM/Opus, 319 bytes. An AbortSignal interruption after 300 ms returned `interrupted`, WebM/Opus, 261 bytes, 0.304 seconds. |
| Playwright Chromium preview with service-resolved `/demo/scene-silent.mp4` and `/demo/background.wav`, selected source interval 10–12 seconds; seek to 10.8 (historical) | PASS: video was muted, one background audio element was created, and both video and background audio reached 10.8 seconds with no playback errors. |
| Playwright Chromium reference-only playback with `/demo/original.wav` and a background track also present in the plan | PASS: only the reference asset was loaded; initial volume 0.35 changed to 0.7 independently. Video stayed muted. |
| Root-run Chromium production-preview full journey after metadata-readiness fix | PASS: saved-take playback completed in the browser journey. Exact invocation was not captured by this executor. |

The browser runs exercise native Chromium `MediaRecorder`, media decoding, and HTML media elements on a deterministic fake input and local fixtures. They do not establish physical microphone behavior, acoustic quality, measured source-to-microphone synchronization tolerance, or support on other desktop/phone browsers. No D10 timing SLA is claimed.

The delayed-metadata regression is covered by the current device suite using injected media elements that throw on `currentTime` before `readyState` reaches `HAVE_METADATA`; the test confirms pending video and audio offsets apply after `loadedmetadata`. The earlier generic preview sample predates that fix. The later root-run Chromium production-preview journey passed saved-take playback after the fix. Physical microphone behavior, acoustic quality, measured source-to-microphone synchronization tolerance, and support on other desktop/phone browsers remain unverified.

## Final root integrated result

The final five-project production-preview matrix passes 74 cases with six explicit non-Chromium synthetic-capture skips; 56 fast tests and the TypeScript/production build pass. Android Chromium and iPhone WebKit are now separate explicit profiles. Both Chromium complete journeys and capture Back guards pass using nonempty encoded synthetic input. See [final gate](frontend-gate.md) for exact commands, requirement accounting and remaining physical/manual blockers. Earlier pending or mislabeled mobile observations above are historical, not the final verdict.
