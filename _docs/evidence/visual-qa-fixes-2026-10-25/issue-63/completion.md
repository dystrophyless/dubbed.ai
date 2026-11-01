# Issue #63 focused integration evidence

**Status:** The focused current-mock browser run passed 2/2 tests, and Root's post-fix TypeScript/Vite build recheck passed. Root's full E2E/real-mode gate and consolidated acceptance remain pending; this record does not claim full Issue #63 acceptance.

Canonical findings covered: **QA-63-01, QA-63-02, QA-63-03**.

## Run and source boundary

Run from `frontend` on 2026-10-25 with the dedicated Chromium mock config, fake media device/UI flags, muted audio, and artifact root set to `../_docs/evidence/visual-qa-fixes-2026-10-25/issue-63/fresh-e2e-final-2`:

```powershell
$env:DUBBED_E2E_ARTIFACT_ROOT='../_docs/evidence/visual-qa-fixes-2026-10-25/issue-63/fresh-e2e-final-2'
npm.cmd exec -- playwright test --config=playwright.issue63.config.ts --reporter=line
```

Result: **2 passed (1.9m)**. Raw output is in [focused-playwright-attempt-4.log](focused-playwright-attempt-4.log). The browser server used port 4563 and was closed after the run.

The 40-file focused E2E/config boundary recorded before the browser run is [e2e-test-source-freeze.json](e2e-test-source-freeze.json). After the run, Root's build reported TS6133 for an unused `page` parameter. The only subsequent test-source edit renamed it to `_page`; assertions, call sites, config, and browser behavior were untouched. Root recaptured the current test boundary in [root-test-source-freeze.json](../root-test-source-freeze.json); the current focused spec SHA-256 is `59843f10385ef36752e0e32853fc82d060bf1af1cc3b89053f4dc5fc482b877b`. The pre-edit focused run remains the behavioral evidence. After the binding fix, Root reran `tsc -b --pretty false` and `vite build --mode mock`; both passed. The raw build log is [build-recheck.log](../root-integration/build-recheck.log). Vite emitted its bundle-size advisory for a chunk above 500 kB.

The browser run used product source freeze [root-product-source-freeze.json](../root-product-source-freeze.json), SHA-256 `9a0a9837c4efdf822b71a6a8651a392ded9a1277cd56e7f8f978491b8f518640` (125 files). Root's independent unchanged-source verification is [root-product-source-freeze-verification.json](../root-product-source-freeze-verification.json). No product source was changed for this gate.

## Current browser observations

The new portrait fixture was opened in New Dub and carried through the local mock flow:

- Source: `frontend/public/media/portrait-long-source.mp4`, 540×960, 35.9591 seconds, SHA-256 `4ebe060311dfa4411f474ad45c8b2bfab3c9718e5813eea3db9c0dc6bf68d626`.
- Full source selected; quote displayed as **36 credits**.
- Preparation exposed four annotated lines. The tested long line is line 3: “The reading on the left is steady, so keep that side in view while I move the case away from the doorway. Please do not touch the switches yet.”
- The Result screen displayed generation 1 with its synthetic-fixture disclosure. The visible Download MP4 action downloaded bytes matching the generation-1 fixture: SHA-256 `dcc9218f3fee9a54c18fa10a97413453d6f7411e527cf8920119f4a8382c9f1d`, 868886 bytes. Return to recording was exercised.

The sampled long-line matrix is recorded in the per-capture JSON next to each screenshot under [fresh-e2e-final-2/issue63-integration](fresh-e2e-final-2/issue63-integration):

| Route/state | Locale and viewport | Observed result |
|---|---|---|
| New Dub, loaded portrait source and quote | EN, 1440×900 at 100% | Source dimensions, duration, selection, and 36-credit quote visible; no horizontal overflow. |
| Record, line 3 at first view | EN and RU, 390×844 | Panel is in normal document flow; dialogue and waveform clear it; no horizontal overflow. |
| Record, line 3 after scroll | EN and RU, 390×844 | A real wheel scroll reaches the recording controls; the panel becomes fixed and remains usable. Scroll offsets were 517px EN and 521px RU. |
| Record, line 3 at first view | EN and RU, 767×900 | Panel is fixed; dialogue and waveform clearance is true; no horizontal overflow. |
| Record, line 3 at first view | EN and RU, 768×900 | Panel is in document flow; clearance is true; no horizontal overflow. |
| Record and actions | EN, 1440×900 and 1440×700 | Long caption, waveform, controls, and short-height layout captured. The short desktop view requires ordinary vertical scrolling for lower content. |
| Leave recording dialog | EN, 1440×900 and native 200% | Dialog focus captured; opening focus is safe and a real Tab moves to “Save and leave.” This is a sampled focus sequence, not a complete keyboard audit. |
| Result and actions | EN, 1440×900 and 1440×700; native 200% | Generation-1 disclosure, Download MP4 and Return to recording hierarchy captured; downloaded bytes match the displayed fixture. |

Desktop action metrics in the captured UI: small shell actions 32px high, medium recording/dialog/return actions 40px, and large primary quote/download actions 44px. The primary/secondary distinction is visible in the screenshots. Phone actions measured at 48px or larger in the tested states. No 36px navigation action appeared in these captures. These are rendered measurements, not a user study or universal usability finding.

### Native Chromium 200% proof

The run created a new disposable profile under Temp and set `Default/Preferences` to `partition.default_zoom_level.x = 3.8017840169239308`. Chromium ran headless with a 1440×960 window and `viewport: null`; fake media and mute flags were enabled. CDP reported `cssVisualViewport.zoom = 2`; `devicePixelRatio = 2`; computed body zoom `1`; outer width `1440`; and CSS `innerWidth = 711`. The proof records the expected half-width of 720 and the 9px delta as within the native scrollbar allowance; it does not persist a separate scrollbar-gutter width measurement. It does not use a narrow viewport, `PageScaleFactor`, or pinch simulation as a zoom substitute.

Current native screenshots cover New Dub, Record line 1 and the long line, the leave dialog, Result, and return to Record. The recorded proof is [native200-profile-proof.json](fresh-e2e-final-2/issue63-integration/native200-profile-proof.json); route metrics and CDP viewports are in [native-chromium-cdp-journey.json](fresh-e2e-final-2/issue63-integration/native-chromium-cdp-journey.json). The 200% run is an actual Chromium profile-zoom capture, but it samples these routes and does not prove every state at 200%.

## Finding dispositions

| Finding | Current evidence and bounded disposition |
|---|---|
| **QA-63-01** — Broad visual PASS lacked a route/state/viewport/input evidence ledger and current native zoom proof. | Added this explicit matrix and actual profile-based 200% Chromium captures. Missing cells below remain not run; no blanket visual PASS is inferred from this sample. |
| **QA-63-02** — The 767px Record state could place the dialogue under the fixed transport. | On the current long line, first-view EN/RU captures at 767×900 both report dialogue/waveform clearance and no horizontal overflow. At 390×844 the current long-content fallback is in-flow, with separate scroll-reachability evidence; at 768×900 the panel is in-flow. No overlap was observed in these sampled current states. |
| **QA-63-03** — Compact desktop actions weakened primary task hierarchy. | The sampled current UI renders the selected 32/40/44px desktop role heights and 48px phone targets, with primary/secondary styling visible. This verifies the captured role treatment; comfort across users or repeated tasks was not studied. |

Representative opened screenshots include New Dub portrait preview; EN/RU 390px top and scrolled Record states; EN/RU 767px and 768px Record states; desktop leave dialog and keyboard focus; Result at desktop heights and its actions; and native 200% caption, dialog, Result, and return states. There are 29 PNG screenshots and 38 companion JSON files in the final artifact directory. Earlier attempts and their logs/screenshots remain preserved.

## Not run / limits

- Unknown-outcome and recovery branches, expired-session behavior, draft recovery, account return, retry/generation-2 UI, and all preparation/recording failure combinations were not exercised by this focused browser run.
- Physical microphone/camera, production backend or storage, real billing, cross-device/session durability, and other browser engines were not tested. Browser media was faked and muted.
- Full keyboard traversal, screen-reader output, reduced motion, forced colors, and every native-zoom route/state were not audited here.
- Arbitrary viewport sizes, all locales, every clip boundary, exhaustive timing/interruption cases, and a human usability study remain outside the captured sample.
- Root's full E2E/real-mode gate and consolidated acceptance were pending when this receipt was written. This record does not substitute for that gate or for product acceptance.

Stage A artifact-root preservation evidence remains in [historical-artifacts-preservation.json](historical-artifacts-preservation.json); root findings also record 517 preserved historical artifacts and six frozen packet/review files. No commit, push, or issue update was made by this worker.
