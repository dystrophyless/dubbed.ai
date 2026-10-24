# Shell browser evidence: isolated run on port 4298

Run date: 2026-10-24 (Asia/Qyzylorda)  
Repository revision at run: `7845b84d171858628128d9e60e6d3d560f43055a`  
Test source: [`frontend/e2e/shell-evidence.spec.ts`](../../../../../frontend/e2e/shell-evidence.spec.ts)  
Test source SHA-256: `28856E9C5415795D4F4CB537AA57071BCB972B7DEF912920EE039D0CD9757FAB`

## Result

The reviewed run passed: **1 passed (7.6s)**, one worker, Chromium, isolated Vite server at `http://127.0.0.1:4298`. The Playwright command was run from `frontend` with `CAPTURE_SHELL_EVIDENCE=1`:

```powershell
$env:CAPTURE_SHELL_EVIDENCE='1'
npm.cmd exec -- playwright test --config $config e2e/shell-evidence.spec.ts
```

`$config` was a temporary config outside the repository, derived from `frontend/playwright.config.ts`, with an absolute test directory, this run's unique output directory, `webServer.cwd` set to `frontend`, `baseURL` set to port 4298, and strict Vite binding to `127.0.0.1:4298`. The server used the local mock adapter (`VITE_SERVICE_ADAPTER=mock`), one worker, Chromium `--mute-audio`, `--use-fake-device-for-media-stream`, and `--use-fake-ui-for-media-stream`. The temporary config and isolated server were removed after the run; port 4298 was confirmed released.

The run covered the English desktop shell at 1440px, 768px and 767px, Russian phone shell at 390px, an effective 720px viewport for zoom/reduced-motion checks, Russian sign-in and password-reset code at 768px, 767px and 390px, signed-in header navigation at 768px and 767px, the opened English mobile menu at 390px, keyboard focus, Escape dismissal/focus return, and forced-colors mode. The rendered metrics recorded `scrollWidth === viewportWidth` at each viewport. At the signed-in header boundary, desktop navigation was visible and the mobile trigger hidden at 768px; at 767px desktop navigation was hidden and the mobile trigger visible. Visible mobile controls met the 48px check; the native locale select was opened and explicitly checked in the mobile sheet. Reduced-motion metrics recorded near-zero transition and animation durations. All 16 final screenshots were visually inspected alongside the relevant Affect UI Clean/Light source Markdown and matching Light PNGs for the button and profile-menu references.

The test uses only local mocks. The synthetic reset email and code shown in captures are fixture values for an `@example.test` address, not credentials. This is browser evidence for the mounted local app, not production-service or screen-reader acceptance. The 720px viewport is an effective-width proxy for the specified zoom check, not a browser zoom operation.

## First-run fixture correction

The first run failed because the generic phone-control audit counted the closed mobile-sheet locale `<select>` while it had a zero-size rendered rectangle, then treated that hidden control as an undersized visible target. This was a stale test assumption. The test now excludes only zero-rendered controls from that generic audit, separately requires the locale select to be visible after opening the sheet, and checks its target size with the other visible menu controls. Required controls still have independent visibility assertions. No product source was changed to pass the fixture. The first-failure log and Playwright error context are preserved in [`first-run-failure/`](first-run-failure/).

## Captured artifacts

`shell-rendered-metrics.json` contains the measured viewport, shell, control and accessibility-mode metrics. Final screenshots are in `screenshots/`:

- `shell-authenticated-header-en-767.png`
- `shell-authenticated-header-en-768.png`
- `shell-forced-colors-keyboard-en-desktop.png`
- `shell-keyboard-focus-en-desktop.png`
- `shell-landing-en-767.png`
- `shell-landing-en-768.png`
- `shell-landing-en-desktop.png`
- `shell-landing-ru-phone.png`
- `shell-mobile-menu-en-390.png`
- `shell-password-reset-code-ru-390.png`
- `shell-password-reset-code-ru-767.png`
- `shell-password-reset-code-ru-768.png`
- `shell-reduced-motion-ru-720.png`
- `shell-sign-in-ru-390.png`
- `shell-sign-in-ru-767.png`
- `shell-sign-in-ru-768.png`

The successful run log is [`playwright-shell-evidence-reviewed.log`](playwright-shell-evidence-reviewed.log). `SHA256SUMS.txt` records hashes for the test source, copied metrics, logs, and screenshots. The repository-level output directory may be refreshed by the root agent's later integration run; this `run-4298/` directory is the preserved evidence boundary for this isolated run.
