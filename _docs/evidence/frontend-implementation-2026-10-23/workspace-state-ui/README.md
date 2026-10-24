# Account, Credits, Projects, and New Dub state evidence

Captured 2026-10-24 from a shared dirty worktree based on delivered foundation commit `7845b84d171858628128d9e60e6d3d560f43055a`. This pass changed the Account, Credits, Projects, and New Dub UI and added focused tests/evidence. This worker did not stage, commit, or run Git/GitHub operations.

## Browser fixture and run

The fixture mounts the actual `App` and the actual Account, Credits, Projects, and New Dub screens at their product routes. It uses the real shared shell, `index.css`, Mabry font assets, screen components, and `createServices` with typed synthetic service overrides. The HTML page is only a mount point; it does not recreate product screens or generic button fixtures.

Full isolated workspace suite before the locale-copy follow-up:

```text
npm.cmd run test:e2e -- --config=playwright.workspace-visual.config.ts
PASS 17/17, 39.4s
```

The latest locale-specific browser follow-up passed after the copy assertion was added:

```text
npm.cmd run test:e2e -- --config=playwright.workspace-visual.config.ts --grep "locale failure keeps both sign-in methods visible and restores the selected value"
PASS 1/1, 5.4s
```

The config runs headless Chromium against Vite at `127.0.0.1:4293`, one worker, light color scheme. Runtime versions were Node `v22.23.1`, npm `10.9.8`, Playwright `1.64.1`, and Vite `8.3.5`.

The 17 browser tests produced 32 named screenshots and 32 records in `visual-checks.json`. Capture distribution: 22 at 1440px, six at 390px, three at 767px, and one at 768px; 22 English and ten Russian captures. All 32 records passed `document.fonts.check('16px "Mabry Pro"')`; all document widths matched their viewport widths. The Projects lifecycle pair uses the same Russian full-capacity page in one browser context, resizing from 767px to 768px.

The screenshot helper disables finite animations only while capturing, after waiting for loaded fonts; interaction checks run with normal motion. The earlier Account known-failure capture made during the dialog fade is retained under `historical/` and excluded from the current 32-capture manifest. The refreshed `account-delete-known-failure-en-desktop.png` was visually checked and shows the settled opaque dialog surface.

The prior root-integrated 117-case browser run had 116 passes and one Account route startup timeout (`main.app-main` was not found); its cause remains unresolved. The workspace helper now checks the harness HTML response, waits up to 15 seconds for harness registration and the visible route heading, and includes page errors and failed/non-OK script requests in startup diagnostics. It does not sleep, reload, or retry. The isolated suite passed 17/17 before the locale-copy assertion; the locale-specific follow-up then passed 1/1. A new root-integrated 117-case browser run is in progress, and its result is not included here.

Focused validation on this source boundary:

```text
npm.cmd run test -- src/features/credits/CreditsScreen.test.tsx tests/services/credits-activity.test.ts src/features/projects/ProjectsScreen.test.tsx tests/account/AccountScreen.test.tsx
PASS 4 files, 23 tests
npm.cmd run typecheck
PASS
npm.cmd run lint
exit 0; repository warnings remain
npm.cmd run build
PASS; Vite reported its existing large-chunk warning
```

The separately authorized account late-work privacy test passed 1/1 in its focused run and was independently rerun by the root. These service tests are not part of the 17 browser tests.

## Account composition and locale rollback follow-up

The Account and Account Linking route branches now use neutral containers beneath the App shell's single `<main>`. Their headings align with the App content gutter at each tested width; the Account screen retains its 1200px maximum width and Account Linking retains its centered 840px maximum width. The captured DOM metrics are in [account-app-layout.json](../account-shell-layout/account-app-layout.json).

All EN and RU observations at 390, 767, 768, and 1440px have one main landmark, matching heading/content left edges, loaded Mabry, and no horizontal document overflow. Heading x-coordinates at those widths are 16, 16, 32, and 120px for Account, and 16, 16, 32, and 300px for Account Linking. Corresponding content widths are 358, 735, 704, and 1200px for Account, and 358, 735, 704, and 840px for Account Linking. The 300px wide-screen Linking offset reflects its centered 840px cap. Existing vertical screen padding was preserved.

Representative corrected captures: [Account EN desktop](../account-shell-layout/account-screen-en-1440.png), [Account RU phone](../account-shell-layout/account-screen-ru-390.png), [Account Linking EN desktop](../account-shell-layout/account-linking-screen-en-1440.png), and [Account Linking RU phone](../account-shell-layout/account-linking-screen-ru-390.png).

The locale failure state is stored semantically and rendered in the current visible locale. When an EN account requests RU and the mock preference write fails, the authoritative rollback leaves the page, `html lang`, stored locale, failure message, and retry action in EN; a successful retry switches them to RU and clears the error. Focused verification after this correction:

```text
npm.cmd test -- tests/app/locale.test.tsx
PASS 1 file, 5 tests
npm.cmd run typecheck
PASS
npm.cmd run test:e2e -- --config=playwright.workspace-visual.config.ts --grep "locale failure keeps both sign-in methods visible and restores the selected value"
PASS 1 test
```

Root reported the latest integration checks as 217 unit tests passed, isolated build/typecheck passed, lint with zero warnings, three media tests passed, and one real-unavailable test passed. The new 117-case browser run was still in progress when this note was written.

## Screen states and captures

| Screen | States and tested interactions | Screenshot evidence |
|---|---|---|
| Account | Locale save pending/failure; linked sign-in methods; invalid-password response retains entered values; delete confirmation; Cancel and Escape close without calling delete and return focus; unknown result returns focus to the available status-check action; definite failure returns focus to the current delete control even when the failed request remounted that control. | [locale pending](account-locale-save-pending-en-desktop.png), [locale failure](account-locale-save-failure-en-desktop.png), [invalid password](account-invalid-password-en-desktop.png), [soft-red confirmation](account-delete-soft-red-confirmation-en-desktop.png), [unknown result on RU phone](account-delete-unknown-ru-phone.png), [known failure](account-delete-known-failure-en-desktop.png) |
| Credits | Balance failure with other regions intact; pack-specific unavailable explanation and retry; pending checkout and posted/pending history; unknown checkout without granting credits; Show more loading and older-page failure with loaded rows retained. A component test holds pack retry pending and checks that the same Retry control stays mounted and focused with busy/disabled semantics; after failure it remains enabled and focused for another retry. | [balance unavailable](credits-balance-unavailable-en-desktop.png), [packs unavailable](credits-packs-unavailable-ru-phone.png), [pending checkout and history](credits-pending-checkout-posted-and-pending-history-en-desktop.png), [unknown checkout on RU phone](credits-unknown-checkout-ru-phone.png), [Show more loading](credits-history-show-more-loading-en-desktop.png), [older-page failure on RU phone](credits-history-older-failure-ru-phone.png) |
| Projects | Empty list; six-slot capacity and lifecycle states across the 767/768 boundary; list loading/error and retry; rename validation and save failure with value retained; delete known/unknown result; Continue opens the selected project. The compact project-specific menu contains only Delete project; Escape dismisses it and returns focus, and canceling its confirmation returns focus without mutation. | [empty at 767](projects-empty-en-767.png), [full capacity at 767](projects-capacity-lifecycle-ru-767.png), [same full-capacity page at 768](projects-capacity-lifecycle-ru-768.png), [row menu on RU 767](projects-row-menu-ru-767.png), [list loading](projects-list-loading-en-desktop.png), [list failure](projects-list-failure-en-desktop.png), [rename validation](projects-rename-validation-en-desktop.png), [rename save failure](projects-rename-save-error-en-desktop.png), [delete unknown on RU phone](projects-delete-unknown-ru-phone.png), [delete known failure](projects-delete-known-failure-en-desktop.png) |
| New Dub | RU phone invalid interval with boundaries retained; insufficient balance; quote failure and expired quote; compatible-preview error/retry/ready; full capacity; missing-audio validation; pending upload; failed replacement preserves the saved source. At 390px, both independent native ranges measure 358×48px with a 14px gap. Playwright touch-enabled `tap()` checks change Start and End independently, the selected interval stays within 1–120 seconds, and ArrowRight changes only Start. The project-navigation text action also measures 48px high. | [invalid interval on RU phone](newdub-invalid-interval-ru-phone.png), [insufficient balance](newdub-capacity-insufficient-balance-en-desktop.png), [quote failure](newdub-quote-service-failure-en-desktop.png), [stale quote](newdub-stale-quote-en-desktop.png), [preview retryable error](newdub-compatible-preview-retryable-error-en-desktop.png), [preview ready](newdub-compatible-preview-ready-en-desktop.png), [upload capacity full](newdub-upload-capacity-full-en-desktop.png), [local missing-audio error](newdub-upload-local-validation-error-en-desktop.png), [upload pending](newdub-upload-pending-en-desktop.png), [replacement failure preserves source](newdub-replacement-failure-original-source-preserved-en-desktop.png) |

The following current screenshots were opened and visually inspected: `account-invalid-password-en-desktop.png`, `account-delete-unknown-ru-phone.png`, `credits-packs-unavailable-ru-phone.png`, `credits-history-older-failure-ru-phone.png`, `projects-row-menu-ru-767.png`, `projects-capacity-lifecycle-ru-768.png`, `newdub-invalid-interval-ru-phone.png`, and `newdub-upload-local-validation-error-en-desktop.png`. The supplied BTN Clean/Light `01-initial.png`, FIL Clean/Light `01-initial.png`, and PRO Clean/Light `01-initial.png` references were also inspected. See `_docs/frontend-flows/affect-ui-workflow.md`, `_docs/frontend-flows/design-tokens.md`, `_docs/frontend-flows/affect-ui-clean-light-reference.md`, and `_docs/evidence/affect-ui-clean-light/README.md` for source mappings and geometry.

## Provenance and limits

All account, project, credit, quote, checkout, upload, and preview facts in this fixture are synthetic; the email uses the reserved `.invalid` domain. The checked-in video is used only as local media fixture evidence. No backend, payment provider, real purchase, microphone capture, secret, or actual account deletion is exercised. The account late-work regression is a test-only public-facade simulation; it is not an external destructive action.

The browser suite proves the listed rendered states and interactions in this isolated `App` harness. It does not prove the global microphone gate, production service behavior, physical-device touch response, screen-reader behavior, 200% zoom, short-viewport layout, or pixel-diff acceptance for every capture. `Locator.tap()` in Chromium with a touch-enabled context verifies browser pointer/touch behavior; it does not emulate a physical touchscreen. Phone screenshots were sampled at 390px; header geometry is covered by separate shared-shell evidence.

See [`visual-checks.json`](visual-checks.json), [`newdub-range-phone-probe.json`](newdub-range-phone-probe.json), and [`SHA256SUMS.txt`](SHA256SUMS.txt). The manifest covers the final workspace harness/screens/tests, service privacy regression, package files, metrics, range probe, and all 32 PNGs.
