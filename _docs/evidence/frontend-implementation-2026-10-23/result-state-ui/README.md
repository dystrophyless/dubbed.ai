# Result state UI evidence

This evidence exercises the real `ResultScreen` React component with the current app CSS, Mabry Pro font assets, and `.app-shell` / `.app-main` layout wrappers. It supplies the missing #79 AC-VIS route states called out in the mock-delivery readiness audit: known/unknown progress, retry, and actual player-delivery failure/retry presentation. It is not full issue acceptance. A typed test fixture starts from `createServices()` and overrides only Result and credit methods. The screen and styles are real; every service result and media asset described below is synthetic.

## Run receipt

- Repository boundary after publisher release: `main` at `7845b84d171858628128d9e60e6d3d560f43055a`; the shared worktree remains dirty with parallel authorized changes.
- Environment: Windows, Playwright `1.64.1`, Chromium, Node `v22.23.1`, npm `10.9.8`.
- Captured: `2026-10-23 23:23 UTC` (local date `2026-10-24`).
- Test URL: local Vite mock adapter on `127.0.0.1:4295`; browser audio muted; light color scheme; reduced motion set to `reduce`; no camera/microphone, credentials, or live provider calls.
- Viewports: English desktop `1440×1000`; Russian phone `390×844`; English breakpoint check `767×844` and `768×844`.
- Result: `npm.cmd run test:e2e -- --config=playwright.result-state.config.ts` — **6 passed**, 0 skipped, 0 failed (13.2s).
- TypeScript: `npm.cmd run typecheck` — pass.
- Lint: `npm.cmd run lint -- e2e/result-delivery-state.spec.ts e2e/harness/result-delivery-state.tsx playwright.result-state.config.ts` — pass.

## Scenario evidence

| Rendered state | Evidence | What the browser check establishes |
|---|---|---|
| Known assembly progress, EN desktop | [Screenshot](result-assembly-progress-known-en-desktop.png), [measured geometry](result-assembly-progress-known-en-desktop.geometry.json) | The actual screen renders the native progressbar with `value=42`, `max=100`, and `42%` from the synthetic service fixture. |
| Untrusted assembly percentage, RU phone | [Screenshot](result-assembly-progress-untrusted-ru-phone.png) | A mock `67` marked untrusted produces no progressbar and no numeric text. |
| Retry submitting, RU phone | [Screenshot](result-assembly-retry-submitting-ru-phone.png), [button geometry and type](result-assembly-retry-submitting-ru-phone.geometry.json) | The pending action is disabled, uses the localized busy label, and measures at least 48px high with 16px/24px label type. |
| Retry outcome unknown, RU phone | [Screenshot](result-assembly-retry-unknown-ru-phone.png) | The unknown result remains visible; keyboard focus has the 2px solid / 2px offset ring; pressing Enter checks the exact same retry input, including operation ID, lineage and project revision. No new assembly, download or credit call occurs. |
| Playback network error, EN desktop | [Failure](result-playback-network-error-en-desktop.png), [recovered](result-playback-network-recovered-en-desktop.png) | A locally aborted video request shows the inline playback alert and preserves displayed generation 7. Enter on Retry playback refreshes that same generation and recovers to the local fixture paused at its start. |
| Expired-style descriptor response, RU phone | [Failure](result-playback-expired-descriptor-ru-phone.png), [recovered](result-playback-expired-recovered-ru-phone.png) | A local synthetic HTTP 403 triggers the same localized playback recovery path; it refreshes the displayed generation and recovers paused. |
| App-main breakpoint | [Measured geometry](result-app-main-767-768-boundary.geometry.json) | At 767px the real `.app-main` left padding is 16px and Result content is 735px wide; at 768px they are 32px and 704px. Both sizes have no horizontal overflow. |

Every scenario asserts that Mabry Pro is selected and actually loaded in Chromium. All tested screens remain free of horizontal overflow. Keyboard assertions target the actual Result actions rather than a recreated button fixture. The harness includes `.app-shell` and `.app-main`, but deliberately omits the app header; this evidence therefore covers Result content and its main gutter, not full navigation-shell behavior.

## Clean / Light mapping and measured source gap

- **Progress (PGR):** inspected [Clean Markdown](../../affect-ui-clean-light/source/components/progress-tracker/Clean/progress-tracker-clean.md.txt), [Light initial state](../../affect-ui-clean-light/source/components/progress-tracker/Clean/Light/01-initial.png), and [Light updated progress state](../../affect-ui-clean-light/source/components/progress-tracker/Clean/Light/03-progress-updated.png). The adopted [token contract](../../../frontend-flows/design-tokens.md) maps the truthful Result progress bar to 4px height, 2px radius, `rgba(0, 0, 0, 0.06)` track, and opaque accessible-accent fill `#0060E2`; it forbids invented progress and an extra outer card. The actual component retains a native `<progress>` element and service-trusted value semantics.
- **Button/loading action:** inspected [Button Clean Markdown](../../affect-ui-clean-light/source/components/button/Clean/button-clean.md.txt), [Light default](../../affect-ui-clean-light/source/components/button/Clean/Light/01-initial.png), and [Light loading](../../affect-ui-clean-light/source/components/button/Clean/Light/03-loading.png). Existing Result actions remain native product buttons. Phone targets retain the contract's 48px minimum and 16px/24px label type; keyboard focus uses the app's visible ring.
- **Inline notice:** inspected [Notification Clean Markdown](../../affect-ui-clean-light/source/components/notification-stack/Clean/notification-stack-clean.md.txt) and [Light initial state](../../affect-ui-clean-light/source/components/notification-stack/Clean/Light/01-initial.png). Playback failure stays in the existing Result screen as an inline `role="alert"` adjacent to the player/recovery action; no stacked toast or notification card is introduced.
- **Progress source correction and rendered check:** after the foundation release, [ResultScreen.css](../../../../frontend/src/features/result/ResultScreen.css) now sets the adopted 4px height, 2px radius, `rgba(0, 0, 0, 0.06)` track and opaque `#0060E2` accessible-accent fill. Native `<progress>` semantics, `value=42` / `max=100`, the localized percentage and the service-trust gate remain unchanged. Chromium measures the bar at `420×4px` at `(120,178)`; the computed host background/radius/accent match the token. The final PNG was inspected at original resolution; within the 420×4px bar crop, 692 pixels are exact `#0060E2` fill and 970 are exact `#F0F0F0` track (the 6% black track composited once over white); the remainder are antialiased edge pixels. The WebKit track pseudo is transparent over the host track, avoiding double application; a Firefox fill selector is present, but this receipt validates Chromium only. No smoothing animation is added, so the configured reduced-motion state remains immediate and no fabricated progress can appear.

## Limits

The fixture values, retry outcomes, project/generation IDs and playback descriptors are invented test data. The network failure is a local request abort; “expired” is a local 403 response; recovery uses `MEDIA_FIXTURES.resultGeneration1`, a synthetic eight-second video. These checks establish only UI wiring for the stated service outcomes. They do not prove a live assembly worker, authoritative production progress, real descriptor expiry/authorization, accepted-take rendering, storage/retention, cross-device delivery, download saving, billing/credits, or OAuth/email behavior. No download request is used to simulate a playback failure.

The owned test source is [result-delivery-state.spec.ts](../../../../frontend/e2e/result-delivery-state.spec.ts), with the actual-screen harness in [result-delivery-state.tsx](../../../../frontend/e2e/harness/result-delivery-state.tsx) and [result-delivery-state.html](../../../../frontend/e2e/harness/result-delivery-state.html); its dedicated [Playwright config](../../../../frontend/playwright.result-state.config.ts) uses port 4295.

`SHA256SUMS.txt` lists the final screenshot, geometry, report, authorized Result CSS, and owned test/config file hashes. It excludes itself.
