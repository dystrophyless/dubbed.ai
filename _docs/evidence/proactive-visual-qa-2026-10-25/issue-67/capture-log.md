# Capture and bounded check log

2026-10-25, Windows, checkout9d286621177200fdb5f61ef963d0b6818ae76774. Node22.23.1/npm10.9.8, Vite8.3.5, installed Playwright Chromium. Frontend unchanged. Existing documentation/evidence dirty boundary preserved. Exact source hashes and browser version are in adjacent JSON artifacts.

Commands were run through escalated bounded shell calls because the review dispatch identified the Windows sandbox setup-refresh failure. No dependencies installed.

1. Frontend cwd: `npm.cmd run dev -- --host 127.0.0.1 --port 4367 --strictPort`. Ready381ms, explicit script `vite --mode mock`. Owned session89951.
2. Repo cwd: `node .\_docs\evidence\proactive-visual-qa-2026-10-25\issue-67\capture.cjs mock`. Exit0,10 screenshots, telemetry in `metrics.json`. Each case had a new browser context, fonts-ready wait and bounded settle. Missing IndexedDB, getter-denial and localStorage-denial were explicit `addInitScript` injections in the script.
3. Stop only session89951 using Ctrl+C; listener4367 no longer present. Vite logged `[Unhandled error] SecurityError: Storage access denied` for the controlled getter fault.
4. Frontend cwd: `$env:VITE_SERVICE_ADAPTER = 'real'; npm.cmd run dev -- --host 127.0.0.1 --port 4367 --strictPort`. Ready323ms. Environment applied only to this child shell. Owned session96165.
5. Repo cwd: `node .\_docs\evidence\proactive-visual-qa-2026-10-25\issue-67\capture.cjs real`. Exit0,2 screenshots, both show localized unavailable state; no page errors/external HTTP/overflow. Telemetry `metrics-real.json`.
6. Stop only session96165 using Ctrl+C.
7. Frontend cwd: ordinary mock command from step1. Ready279ms. Owned session5237.
8. Repo cwd: `node .\_docs\evidence\proactive-visual-qa-2026-10-25\issue-67\capture.cjs extra`. Exit0,3 screenshots: RUdesktop/ENphone and controlled IndexedDB.open denial. `metrics-extra.json` records the open fault's page error despite visible landing.
9. Frontend cwd: `node .\node_modules\@playwright\test\cli.js test --config ..\_docs\evidence\proactive-visual-qa-2026-10-25\issue-67\smoke.config.cjs`. Exit0,1/1 existing runtime smoke passed in2.7s. JSON stats: expected1/unexpected0/skipped0/flaky0. Full raw result `smoke-result.json`. Config changes port/output only and selects the existing runtime-smoke suite; no source/test/config product changes.
10. Stop only session5237 using Ctrl+C. Vite logged `[Unhandled rejection] SecurityError: Storage access denied` for the controlled `open()` fault.
11. Generated SHA-256 screenshot/source manifest, verified `git status --porcelain -- frontend` empty. All15 screenshots plus the source Button LightPNG opened visually with `view_image`.

All browser launches: `--mute-audio`, `--use-fake-device-for-media-stream`, `--use-fake-ui-for-media-stream`. Physical devices were not used. No backend was launched by this reviewer, no production credentials supplied, zero external HTTP requests observed in inspected captures and existing focused smoke. This does not claim that all external services or backend processes on the machine were inventoried.
