# Screen cohort acceptance — 2026-10-24

> Renewed acceptance after the composition hold: Root verified the corrected Account/Linking gutters and landmarks, plus locale failure feedback, against the exact frozen source below. The full browser run passed 117/117 without retries. The earlier staged candidate is superseded and must be refreshed from the reviewed new manifest before commit. Git publication still requires Root's separate manifest approval; closure requires successful push and independent remote verification.

## Decision and authority

Root records delegated rule-based acceptance of the mock-backed frontend scope of issues #62, #65, #66, #69, #71, #74, #75, #78, #79, #80 and #82. Authority is the owner's full-cycle frontend implementation/closure request and the repository verification/acceptance policy. All implementation was performed by GPT-6 Luna Max executors; Root independently inspected source changes, raw check results and rendered evidence. This decision precedes commit and push. Delivery and closure still require the exact manifest, successful push, independent remote verification and a subsequent explicit closure decision.

This is not acceptance of #63, #76, #77 or #81, a real backend/provider, physical-device behavior, production security/retention/accounting, media quality or deployment. New dub's delivered phone-control corrections do not settle its shorter-than-one-second source policy. The previously authorized account-deletion-late-work test is already delivered in the foundation commit and passed again in the final full unit suite.

## Exact verified boundary

Base commit: main `7845b84d171858628128d9e60e6d3d560f43055a`, with the authorized screen/test delta. `root-final-composition-freeze-before.json` and `root-final-composition-freeze-after.json` enumerate all 197 frontend source/test/configuration/fixture files. Both have SHA256 `9E24557F663F1E74568AAC8F47053E2A11DEAB06DB4D880DDA8D26B4EC4F8310`: zero files changed during final verification. The index contains 284 paths staged before the hold; those older bytes are not the renewed delivery boundary. Restage only the reviewed new whitelist. Unrelated initial documentation/skill edits are excluded from delivery.

The final dependency manifest and lockfile passed npm ci in a previously nonexistent temporary directory, followed by a build of this exact copied source. See [clean-install receipt](final-lock-install-2026-10-24/receipt.md). Lockfile SHA256 remains `11DFB89CED5C2F80F56CAF47FEDA10AE7B453FAF23601D071FA5E29B5DA21971`.

## Executed final checks

Environment: Windows, Node v22.23.1, npm 10.9.8, Vite 8.3.5, Playwright 1.64.1, Chromium 156.0.8078.4. Browser audio was muted; capture used fake media devices/permission UI only. No physical microphone or real provider was used.

| Check | Observed result | Raw evidence |
|---|---|---|
| npm.cmd run test | 44 files, 217 tests passed; 42.29s | [Unit log](root-final-composition-unit.log) |
| npm.cmd run build in isolated clean installation | TypeScript and production mock build passed; 946.84 kB JS / 55.71 kB CSS | [Build log](root-final-composition-isolated-build.log) |
| npm.cmd run lint | Exit 0, warnings remain | [Lint log](root-final-composition-lint.log) |
| Full default browser test directory, CAPTURE_SHELL_EVIDENCE=1, isolated config on 127.0.0.1:4284, workers=1, reporter=line | 117 passed, no skipped/failed; 3.9m | [Browser log](root-final-composition-browser.log) |
| npm.cmd run test:media | 3 passed, 0 failed | [Corpus log](root-final-composition-media.log) |
| npm.cmd run test:e2e:real | 1 passed in 5.6s; explicit real mode unavailable and no external-service requests | [Real-mode log](root-final-composition-real-unavailable.log) |

The final full-browser invocation was `npm.cmd run test:e2e -- --config=C:\Users\roman\AppData\Local\Temp\dubbed-frontend-verify-7f3a51c232dd4446aee91955e1fb6f5b\root-media.config.ts --workers=1 --reporter=line` with CAPTURE_SHELL_EVIDENCE=1. That disposable config imports the committed default config, sets an absolute test directory/output directory, frontend server cwd and isolated port 4284; it preserves the mock adapter, muted audio and fake-device flags.

The two jsdom HTMLMediaElement.pause notices are retained; native browser media checks supply the actual playback/capture evidence. Vite's chunk-size advisory and lint warnings are disclosed, not represented as warning-free results.

## Accepted mock criteria and evidence

The [criterion map](acceptance-evidence-map.md) retains each live AC. The [readiness assessment and dated follow-up](next-cohort-acceptance-readiness.md) map the eight auth/processing/result/shell slices. The actual screen/flow evidence below supplements the integrated native journeys and service tests; synthetic fixture states do not replace those journeys.

| Issue | Verified mock contract and concrete evidence |
|---|---|
| #62 Account | Authorized facts/methods/locale/password behavior; guarded sign-out; localized deletion tokens, unknown/failure/success and focus recovery; late-write denial and clean explicit re-registration. [Workspace states](workspace-state-ui/README.md), account/identity/native journeys and final service/unit suite. |
| #65 Credits | Shared available/reserved truth, conspicuous simulated packs/checkout, same-intent recovery, stable 20-record history pagination, verified-only fulfillment/capacity and preserved-video return. Pack-specific retry preserves loaded regions and focused busy control. [Workspace states](workspace-state-ui/README.md), accounting/purchase tests and full journey. |
| #66 Linking | Explicit current/candidate dual proof before deliberate commit; canonical association and unchanged credits/projects/grant. Completion now uses authoritative same-account account updates without protected-route remount; lost/deleted/mismatched snapshots still revalidate identity. Nine focused unit cases and native identity journey are included in final logs. [Auth states](auth-state-ui/README.md). |
| #69 Microphone | Explicit permission, device/readiness/recovery; local optional recording and keyboard Listen with advancing playback; numeric/color-independent meter semantics, cleanup and no persisted test audio. [Mic proof](mic-icon-final-proof/README.md), lifecycle tests and integrated cold entry. |
| #71 Reset | Purpose-specific code/password flow, unknown-write reconciliation, fixed-session effects, field preservation and approved return. [Auth states](auth-state-ui/README.md), service tests and native reset journey. |
| #74 Processing | Attempt/revision reconciliation, truthful progress, cancellation/failure/retry accounting, zero-turn preservation and one included retry; keyboard/focus/quote recovery. [52-scenario Processing proof](processing-ui/README.md), ledger/concurrency and native journey. |
| #75 Projects | Owner library/capacity, safe resume/activity ordering, grapheme-counted rename, deletion/late-event fencing; one-item accessible row menu and focus restoration. [Workspace states](workspace-state-ui/README.md), domain tests and native journeys. |
| #78 Shell | EN/RU locale, responsive navigation, minimal landing/support address, source-mapped shared controls, loaded Mabry, keyboard/focus/forced-colors/reduced-motion evidence. [Shell proof](shell-final-proof/run-4298/README.md), [icon inventory/render mapping](mic-icon-final-proof/icon-audit.md), final opt-in shell run. |
| #79 Result | Exact displayed/downloaded generation, old playback protection, Watch new paused, idempotent assembly/retry and generation-bound delivery recovery; actual distinct fixture download bytes. [Result states](result-state-ui/README.md), generation/service/native journeys. |
| #80 Sign-in | Neutral errors, protected return, fixed non-sliding session, unknown/reconcile behavior and Account-expiry reauthentication to New dub. [Auth states](auth-state-ui/README.md), current native identity/account journeys and recorded owner decision. |
| #82 Registration | Verified email/synthetic Google registration, challenge/client binding, resend/replay/reload reconciliation and exactly one welcome grant, including no repeat grant after deletion. [Auth states](auth-state-ui/README.md), identity/grant service tests and native journey. |

## Rendered verification and corrections

After the earlier linking-fix pass, Root found duplicated page gutters and nested main landmarks in Account and Linking. Delivery authority was suspended before any commit or push, and #62/#66 were returned to in-progress/open. Both screens now use neutral roots and the App-owned gutters; their existing 1200px/840px maximum widths remain. The [actual-App geometry observations](account-shell-layout/account-app-layout.json) cover EN/RU at 390/767/768/1440: one main landmark, loaded Mabry and no horizontal overflow in all 16 observations. Account heading x coordinates are 16/16/32/120; Linking coordinates are 16/16/32/300 because its 840px block stays centered. Root opened all four representative captures linked in the workspace README and independently inspected the corrected English locale-failure capture.

That failure capture exposed a real language mismatch: a failed RU preference save rolled the page back to authoritative EN but retained a pretranslated RU error. LocaleProvider now stores a failure flag and translates it using the visible locale; pending RU remains available to retry. The new unit regression checks thrown failure, English page/document/storage/error after rollback and successful RU retry. The actual-App browser case checks the returned non-OK service result, English heading/document/error/retry and retained methods. A separate read-only review found no behavior defect. Focused checks passed, followed by the exact-boundary 217-unit/117-browser gate above. This paragraph records resolution of the hold, not acceptance of production integrations.

The current Affect UI Clean/Light adoption, reference catalog and token contract remain visual authority; Mabry Pro and Lucide 1.1 outlined treatment are retained. Executor reports identify actual Clean Markdown/Light PNG pairs, measured values, source gaps and accessibility adaptations. Root inspected actual current Record Play/Pause, Result known progress/player failure, Credits unavailable packs, Projects menu and Account failure-dialog captures, in addition to the previously inspected shared/auth/Processing/Record surfaces. EN/RU desktop, phone and 767/768 boundary cases have actual Chromium captures and loaded-font/overflow/control checks. The 19-export icon audit maps representative screen captures and intentional Lucide contour differences; OTP's transient verified Check lacks its own captured state, while that same export is rendered in linking. No per-platform or pixel-identical universal claim is made.

Two earlier full runs remain preserved: `root-final-screen-browser.log` was 116/117 with an unexplained workspace-harness initial-mount timeout; observable bounded readiness/script diagnostics were added without sleep/reload/retry. `root-final-screen-browser-after.log` was 116/117 and exposed a real linking completion-feedback remount defect. [Initial failure](root-final-screen-initial-failure/) and [second failure](root-final-screen-second-failure/) contexts are retained. The latter defect was fixed in the component and proved by success/lost-account unit regressions plus exact-method/balance/grant/library native checks. Earlier mid-animation Account capture is explicitly historical; stable finite-animation capture now shows the opaque final dialog. The final 117-case run passed without retries; earlier failures are not erased or relabeled.

## Remaining boundaries and delivery instruction

#77 remains open pending the same-profile-tab ownership decision: a native default-mock audit observed shared auth/grant identity and a stale revision in the first tab after the second acquired. This is a confirmed mock behavior and an unresolved device/session contract, not production lease proof. #81 remains open pending short-source policy. #76 requires real services/API/prerequisites or explicit owner cancellation; unavailable mode is not that adapter. #63 remains open for final package disposition and the remaining flows/decisions. Physical devices, other-browser conformance, real OAuth/email/payment, private durable storage/rendering/retention and production policy remain separately unverified.

Publisher may prepare and transfer these eleven accepted mock tasks using only the reviewed exact file manifest. Root must review that manifest before Git mutation. Do not stage unrelated docs/skills, use automatic-closing keywords, or close #63/#76/#77/#81. Keep accepted issues open/verified until commit and push succeed and Root independently verifies the intended remote commit, then follow the explicit closure decision. No PR, merge, deployment or paid service is authorized.
