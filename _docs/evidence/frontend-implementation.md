# Frontend implementation checkpoint

Date: 2026-10-20 (Asia/Qyzylorda). Source: SPEC-001/002 revision 0.5, BR-001 revision 0.2, current published issue bodies and discussions read at intake (no comments). Base commit: `2f70ac94d059585f9608df39efbc96be555c3f98`; pre-existing issue-publication documentation changes remain uncommitted and are preserved.

## Authority and delivery

Owner request: implement all frontend-related tasks, centralize every backend call in one services layer, provide an executable mock so the whole app runs without a real backend, and add tests. This authorizes local implementation, appropriate package installation/checks, and the in-scope issue lifecycle under orchestration.md. Local verified delivery is the intended delivery boundary; no commit, push, PR, paid service, merge or deployment is authorized by this request.

Frontend/mock slice: issues #14, #15, #10, #50, #21, #17, #18, #19, #48, #46, #6, #38, #42, #8 and #12 in `dystrophyless/dubbed.ai`. Actual real-backend adapter #13 and real-service gate #34 require backend contracts/services that do not exist. The frontend supplies one substitution boundary and explicit unavailable real mode, as FE-AC-09 permits; those real-integration tasks are not accepted through mocks.

## Routine technical choices

- Application directory: `frontend/`; React, TypeScript and Zustand.
- Vite development/build; Vitest, Testing Library, jsdom and fake IndexedDB for fast tests; Playwright for browser journeys.
- No remote fonts. System fonts and flat neutral white/gray/blue tokens with red recording/error states from SPEC-002. During implementation the owner required **shadcn/ui components only**; this supersedes the initial native-control choice. Official generated shadcn/ui controls/panels/dialogs replace bespoke UI primitives. Native media/file APIs and semantic document structure remain platform elements.
- Service-owned IndexedDB records/blobs and one startup-selected facade. Feature components, Zustand actions and hooks cannot create a transport or persistence bypass. Injectable native picker/capture/playback adapters are the explicit device exception.
- Demo providers/authentication/payments/AI/finished fixture/export/local sharing are labeled simulations. Custom local file preview, microphone capture, persisted takes and local contextual playback must be real browser operations.
- Confirmed product quantities/rules are literal. Only unselected USD offers/cancellation stage weights and remaining technical profiles are explicitly provisional demo data. Still-zero-turn export is unavailable pending product policy.

Vite and Zustand setup/API patterns were checked using Context7 official-source documentation (`/vitejs/vite`, `/pmndrs/zustand`). Node at intake: 22.23.1; npm: 10.9.8. Installed package versions and actual commands will be recorded with executed checks rather than guessed here.

## Independent scoped review

A fresh clean-context GPT-6.1 Sol High reviewed the current frontend specification/task slice before foundation implementation, following spec-task-review and task-package-review-loop. Verdict: no CRITICAL/HIGH contradiction blocks frontend foundation.

- **FSR-001, MEDIUM, confirmed:** unchanged #12/#6/#38 acceptance includes physical phone/desktop microphone/reference/acoustic evidence and human visual inspection. Automated/injected-device proof is separate. Implementation may proceed, but absent physical/manual evidence keeps the applicable acceptance/gate pending; no blanket closure or scope waiver is inferred.
- **FSR-002, LOW, confirmed:** #50 still says “yellow actions” in one verification row despite blue/gray scope/spec. Mechanical correction to “blue primary actions” is authorized as an issue-local consistency fix.

Root operationally accepts the above engineering choices and the existing frontend scope under the user's full implementation request. This is not a claim that the human approved every layout/token, nor acceptance of untested product behavior. Backend/provider/cost/content/retention decisions remain outside this mock milestone.

## Ownership and verification

After the shared foundation passed root checks, ownership was split along the stable facade: one Luna high writer owns services/contracts/mock/service tests/package configuration; another owns screens/store/styles/localization/UI and browser tests; a third owns native device capture/playback/file inspection and device tests. The UI writer explicitly handed off its initial device file before that assignment. The bounded asset writer completed `frontend/public/demo/`, fixture generators and evidence. No concurrent writers share a file; contract changes are coordinated through the service owner. Root directly verifies implementation and Publisher transfers exact lifecycle decisions. Preserve all pre-existing dirty documentation.

Required proof includes static/type/build, AST/module services-boundary checks, service state/replay/failure/revision tests, durable blob reload, actual/injected capture distinctions, browser journeys with outbound APIs denied, bilingual/responsive/accessibility/visual checks and real fixture/download bytes. Missing physical devices and manual human acceptance remain explicit limits. Actual commands/results and issue dispositions are recorded after execution, not prefilled as PASS.

### Foundation verification

Root independently executed `npm.cmd run typecheck`, `npm.cmd test` and `npm.cmd run build` in `frontend/`: PASS, 3 test files / 5 tests, production build successful. This is foundation proof only. Installed runtime includes React 19.3.1, Zustand 5.0.15, Vite 8.3.4, Vitest 5.0.5, TypeScript 5.9.3 and Playwright 1.64.1; the lockfile owns exact dependency resolution. Issue #14 is verified/open pending integrated delivery. Issue #15 is in progress; the AST check was sent back to enforce network/persistence restrictions inside device adapters and reject adapter-internal/dynamic/alias bypasses. That correction and domain-service checks require fresh executed evidence.

Root inspected the authored fixture poster and independently checked all WAVs share a 54-second timeline, every recording window is bounded and the longest continuous speech exceeds 30 seconds. See [fixture evidence](demo-fixtures.md) for generator/codec checks. Browser playback and microphone/acoustic results remain separate.

### Integration correction checkpoint

Root exercised the real Chromium app through the protected route, demo identity, sample quote and fully loaded prepared-turn list. The mixed-language fixture and all seven turns load, including the continuous speech. The initial prepared-screen screenshot is diagnostic, not an accepted baseline. Root found and returned concrete integration defects to the owning executors before accepting the milestone:

- Authentication destination/verification, session read ordering and canceled Back/Forward navigation.
- Actual original/background audition, long-dialogue layout, speaker option identity and upgraded slot display.
- Included retry availability, permanent saved-take lock, reset consent, required-background failure and deletion during work.
- Recoverable short-take acceptance, timing-compatible replacement, overlapping missed turns and contextual A/B playback.

The earlier green foundation/device checks do not prove these corrected domain/UI behaviors. Fresh regression and browser evidence are required after the corrections. Physical microphone/reference-acoustic measurements and owner acceptance of visual baselines remain pending.

The subsequent owner instruction, “I want to use shadcn components only,” adds a UI migration before final verification. A bounded Luna assignment owns official CLI setup/generated primitives/Tailwind configuration; the UI owner migrates screens and tests while the service owner continues domain fixes. Earlier screenshots and browser runs are historical diagnostics, not proof of the migrated interface. No new product behavior or backend transport is authorized by the component change.

### Migrated frontend verification

Root executed the following after the shadcn migration and credit-return implementation (local dirty worktree, 2026-10-20 Asia/Qyzylorda):

| Command / observation | Actual result |
|---|---|
| `npm.cmd run typecheck` | PASS. |
| `npm.cmd test` | PASS: 47 tests across nine files, including AST service/shadcn boundaries, persistent mock transactions and domain behavior, native media, app session ordering, deferred recording replacement/interruption and slider naming. |
| `npm.cmd run build` | PASS: Vite 8.3.4; CSS 63.18 kB, JS 506.21 kB / gzip 153.89 kB. Vite emits a >500 kB chunk advisory; no warning threshold was raised to hide it. |
| `git diff --check` | PASS; Git prints line-ending conversion notices, which are not test failures. |
| Actual Chromium primary control | White `rgb(255,255,255)` on blue `rgb(29,78,216)`, 44px height, official `data-slot=button`. |
| Actual prepared row after correction | Graphite `rgb(32,33,36)` on light blue `rgb(239,246,255)`; wrapping row content fits its bounds. Russian mobile action labels wrap without clipping. |
| Chromium desktop browser journeys, six tests | Five PASS: locale/protected routes, verification reload, full slots/purchase upgrade, preserved source/quote purchase return with no auto-preparation, capture Back guard. The complete recording/export/share test initially stopped at a strict locator matching both an added line and its textarea; corrected rerun pending. |

An independent read-only service audit reproduced three defects and verified their corrections; the related stale rollback-response revision was also fixed with response/read equality assertions. See [audit record](frontend-service-audit.md). A later actual browser test exposed a zero-turn/new-speaker manual-line restriction; it was fixed and covered by a no-dialogue preparation → manual line → capture/commit → export regression. No fixture pass is described as real AI or rendering proof.

At the 2026-10-21 checkpoint, the native-media metadata/readiness regression increases the fast suite to 48 tests. Owner executed focused device/recording tests 14/14 and full fast suite 48/48; root's first focused rerun exposed an outdated jsdom metadata fixture, which was corrected without removing saved-asset identity assertions. Actual Chromium built-preview then confirmed blob-backed saved-take playback after reload. That browser run next exposed a stale turn/plan transition when moving to another line; its atomic state correction and final integrated rerun remain part of the gate, rather than being hidden by the earlier fast PASS.

The first migrated accessibility run exposed unnamed Radix slider thumbs, then narrow navigation and a locale-reset test-helper issue. Named thumb props, visible wrapping navigation and locale-aware helpers now exist; the final browser matrix remains required. See [gate accounting](frontend-gate.md) for the complete criterion disposition and outstanding physical/human evidence.

## Final root verification, 2026-10-21

This section supersedes the pending migrated-regression statements above. On the final uncommitted worktree based on `2f70ac94d059585f9608df39efbc96be555c3f98`, root executed:

- `npm.cmd test`: 56/56 PASS across nine files, 6.62s at 00:48 Asia/Qyzylorda.
- `npm.cmd run e2e -- --workers=3 --output=test-results-complete-final`: 74 PASS / 6 explicit SKIP, 3.2 minutes, across five explicit desktop/phone engine profiles. The build prerequisite runs TypeScript and Vite successfully; the >500 kB chunk advisory remains.
- Both Chromium desktop and Android emulation completed all eight recorded turns, played a persisted captured Blob after reload, downloaded exact expected MP4 fixture bytes/hash, disabled/re-enabled the same link, accessed it after sign-out/reload, and invalidated it by deletion, with no external requests or browser errors.
- Root visually inspected active Record, Result, Credits, Projects and prepared desktop/mobile EN/RU screenshots. Rendered geometry, focus/contrast, reduced-motion and zoom-equivalent assertions passed in 50 accessibility cases.

The six skips are the two synthetic-capture cases outside Chromium (Firefox desktop, WebKit desktop, WebKit mobile), not physical microphone passes. The old project called Chromium mobile used iPhone/WebKit; the final config corrects this and separately exercises Pixel 7 Chromium and iPhone 13 WebKit.

Additional regression closes actual completed-stage cancellation settlement, exact EN/RU charge/refund confirmation, running retry consumption with no completed stage, required-background/system-failure refund, same-project quoted recovery after failure/cancellation and canonical localized Processing states. Demo cancellation allocations are explicit provisional policy, not approved production costs.

See [final gate accounting](frontend-gate.md) for FE-AC-01–10, T01–T10 and E01–E07 evidence. Physical devices/acoustic measurements and human visual/manual accessibility acceptance remain BLOCKED. Real AI/auth/payment/rendering/global sharing remain simulated; the fixed prepared MP4 is not rendered from user takes. No commit, push or deployment was performed.

## Owner-selected dark refresh, 2026-10-21

The owner rejected the light implementation and selected charcoal surfaces, prominent video and restrained blue accents. This supersedes the light-palette statements and visual baselines earlier in this historical implementation report. The current [design-refresh report](design-refresh/README.md) records the presentation changes, final screenshots and direct checks against SPEC-001 0.6 / SPEC-002 0.7.

Root final regression: `npm.cmd test` 56/56 PASS across nine files (9.17s); `npm.cmd run e2e -- --workers=1 --output=test-results-design-refresh-final` 74 PASS / 6 explicit SKIP (4.1 minutes); production TypeScript/Vite build PASS with its >500 kB chunk advisory. Both Chromium profiles complete actual synthetic recording and durable playback/export/share/deletion checks. Owner visual acceptance and physical/manual gates remain pending. No commit, push or deployment.
