# Dark editing-suite design refresh

Date: 2026-10-21, Asia/Qyzylorda. Local uncommitted worktree based on `2f70ac94d059585f9608df39efbc96be555c3f98`. No commit, push or deployment. Sources: SPEC-001 0.6, SPEC-002 0.7 and brainstorm §18. Existing issues #50 and #12 retain the visual/manual acceptance gates.

## Owner direction and scope

The owner rejected the light implementation and selected **“Dark editing suite: charcoal surfaces, prominent video and restrained blue accents.”** This supersedes the old white/gray palette and top-navigation composition. Exact rendered design acceptance remains with the owner.

The refresh uses official shadcn controls, a charcoal canvas and layered panels, off-white text, blue actions, high-contrast red recording/destructive text and visible focus. Private desktop pages have a navigation rail and context bar; public pages use a centered shell. Phones expose labeled two-by-two navigation. Prepare corrections sit beneath the player; recording review actions precede a bounded dialogue queue. Long Russian button labels wrap. Projects, credits, authentication, result and public-viewer surfaces inherit the same visual system. No gradients, decorative fake activity, new fonts/dependencies or theme switcher were added.

Presentation files: `frontend/src/app/App.tsx`, `frontend/src/features/Screens.tsx`, `frontend/src/styles.css`, `frontend/src/shadcn.css`. Backend-service, mock, device and recording/billing handlers retain their contracts. Existing tests remain the regression suite.

## Rendered evidence

- Before: [New dub](before-new.png), [Prepare](before-prepare.png).
- After desktop: [Landing](landing-desktop.png), [Sign-in](signin-desktop.png), [New dub](new-desktop.png), [Prepare](prepare-desktop.png), [Record](record-desktop.png), [Active recording](record-active.png).
- After phone/tablet: [Russian Prepare](prepare-mobile-ru.png), [Russian Record](record-mobile-ru.png), [Russian Credits](credits-mobile-ru.png), [Russian Projects](projects-mobile-ru.png), [phone sign-in](signin-mobile.png), [Russian tablet Record](record-tablet-ru.png).
- [Rendered checks](rendered-checks.json): ten desktop/phone views, no horizontal overflow, no sub-4.5:1 sampled enabled text/control contrast pairs, zero browser page errors. Colors are read from computed foreground and composited ancestor backgrounds. This is a focused check, not an exhaustive accessibility audit.
- [Final public/tablet geometry](public-tablet-checks.json): centered desktop public shell at x=72, width=1296 within 1440px; sign-in panel centered at x=450, width=540; phone sign-in document=viewport=390; tablet Record document=viewport=768, with no horizontally unreachable interactive controls.

Root inspected the screenshots directly. Active recording hides video and retains target text/reference controls. Native Chromium synthetic capture saved successfully through the redesigned screen. The landing screenshot was captured after decoded media became available. These observations do not replace owner visual acceptance or physical microphone/acoustic measurements.

## Verification

| Command / observation | Result |
|---|---|
| Root `npm.cmd test` | PASS: 56 tests across nine files, 9.17s. |
| Final production build / TypeScript | PASS as the browser server prerequisite; the >500 kB JavaScript chunk advisory remains. |
| Root `npm.cmd run e2e -- --workers=1 --output=test-results-design-refresh-final` | PASS: 74 passed / 6 explicit skips, 4.1 minutes, five browser/device profiles. |
| Initial `--workers=3` design run | 58 PASS / 16 FAIL / 6 SKIP. The tablet context bar extended 7px past the viewport; some WebKit pages crashed or stalled. Those results were not accepted as a final matrix. |
| Corrections | Tablet context margins now match the actual 24px shell gutter; public pages no longer reserve the private sidebar's width. Final visual geometry above was rechecked after those corrections. The complete suite reruns serially with its original assertions. |

Playwright result folders are ignored local artifacts. Reproducible test source and commands are in `frontend/`; the final result folder is `frontend/test-results-design-refresh-final/`. The earlier light-design verification remains historical evidence and cannot approve this visual baseline.

## Acceptance limits

The dark direction is owner-selected; the rendered implementation has not been accepted by the owner. Physical desktop/Android/iPhone microphone behavior, acoustic timing/leakage, screen-reader/manual keyboard and actual host-zoom checks remain pending. Mock AI/auth/payment/export/share limitations remain visible. No real provider, production security or rendered-user-video claim follows from these checks.

The six skips are the two Chromium-only synthetic-capture cases in Firefox desktop, WebKit desktop and WebKit mobile. Both Chromium profiles pass the full eight-take/save/reload/playback/export/download/share/deletion journey and the capture Back guard. The final serial run includes the public-shell and tablet-gutter corrections. All original assertions are retained.

Publisher synchronized #50 and #12 to the selected dark direction and recorded one design-refresh evidence comment each. Both issues remain open/blocked for owner rendered-baseline acceptance and their existing manual/physical gates. No acceptance, issue closure, commit, push or deployment is claimed.
