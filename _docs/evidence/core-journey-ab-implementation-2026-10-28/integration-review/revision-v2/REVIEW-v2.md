# Independent integrated review — revision v2

**Integrated review complete — core-journey-ab-integration-review-v2. Verdict: NOT READY.** Both original HIGH findings are resolved by fresh checks. IR-06, IR-08 and IR-09 remain partially open; new IR-11 and IR-12 require bounded corrections. This is an independent review of the named paused v2 handoff, not acceptance of the author report or a publication decision.

## Frozen boundary and evidence

Date2026-10-28; Windows, actual installed headless Chrome156, isolated browser contexts against5180. Base HEAD remains9096925a4476e84ec9a6e5ef9bff50ae45ac0f67; frontend remains dirty/uncommitted. Root confirmed the explicit v2 ready-for-integrated-review handoff, paused edits, current report/manifest/raw evidence and HTTP200 before redispatch. All39 entries in the author's `phase4/revision-v2/final-v4/source-manifest.json` match at start and end (`source-hashes-start.json`, `source-hashes-end.json`). No author file changed during this review.

Both frozen prototype manifest hashes remain exact: A969061d34e48ffb2be3884fda3bc1bda3fb6a609dcf66526c7829949a70510fe; B04991d3a4c991829ef6d58f46ccb57cc876fff14cfcf7e801ae41fd09b150c98. Prototype files were read only. Their isolated browser localStorage was seeded to show existing Result/Record states solely for screenshots, without changing either file or the user's browser profile.

Own executed scripts: `probe.cjs`, `reference.cjs`, `recovery.cjs`, `long.cjs`. Own raw outputs: `browser.json`, `reference-browser.json`, `recovery-browser.json`, `long-browser.json` and named PNGs. Probe and recovery used real getUserMedia/MediaRecorder with Chrome fake audio input. Faults/delays were injected into the active typed Services instance or the real video's playback startup; they did not replace native recording with a fake Recorder. The first long-copy probe's provider lookup missed the root fiber alternate; its lookup was corrected and the complete six-case run then exited0. That harness error is not a product failure.

## Stable finding dispositions

| ID | v2 disposition | Independent evidence |
|---|---|---|
| IR-01 HIGH | **RESOLVED** for delayed-source readiness/start seam | At250ms into1200ms delayed play: Preparing recording, source paused0,1getUserMedia request, **zero** recorder starts. Actual source play t1724.2ms, recorder start t1725ms; saved window finishes with source5.152804s. `browser.json`: delayed-source-preparing/finished. Native port now starts via actual playing callback and tracks source-window progress; controller no longer claims capture during readiness. This does not certify hardware latency/trimming or background interruption, separately IR-11. |
| IR-02 HIGH | **RESOLVED** for tombstone-before-delivery | Actual typed tombstone after generation bytes were read now gives0download events, no player and the deleted-project boundary. An ordinary valid Original-selected download still delivers the dub fixture hashfe7cb91ebdd2a2e208de6935942d585fced88b734726d19e565958ad3b1bacc9. `browser.json`: delete-before-delivery/valid-pinned-download. Source now rechecks active request/scope/project after read and clears null/deleted workspace. Route/actor/request fences are present; every possible account race was not independently executed. |
| IR-03 MEDIUM | **RESOLVED** | Actual A/B desktop20/28 centered titles and three dots visible; A/B phone title/dots occupy a second row after Exit. See header-A/B and phone Record screenshots. A media remains centered and gutter/panel-width axes survive. Separate panel vertical regression is IR-12. |
| IR-04 MEDIUM | **RESOLVED** for desktop fit | A/B normal Result stage920px at y108/104; short1280×600 A547.546875px at y88, B561.765625px at y80; actions bottom575.984375, document height600. Frozen screenshots were rendered independently and visually compared. Actual long Russian text now fits Record at1280×600 and1366×650; phone scrolls normally. See long-copy verification below. |
| IR-05 MEDIUM | **RESOLVED** | Actual accepted last line contains one primary To result and no Next/duplicate To result; activating it opens authorized Result. Source only enables this mapping for candidate-free compatible accepted last line; replacements still use explicit acceptance/stay before the separate later authorization. `browser.json`: completed-last-primary. |
| IR-06 MEDIUM | **PARTIAL / OPEN** | Result paused seek release now plays; finite-end/cancel/held-key handling was improved. Record cancellation/blur still resumes, detailed below. |
| IR-07 MEDIUM | **RESOLVED** | Actual Record/Result Exit uses LogOut; Return uses Undo2; Previous remains ChevronLeft,1.1 outlined treatment. New normal/short/phone screenshots and current source confirm it. |
| IR-08 MEDIUM | **PARTIAL / OPEN** | Required inverse visual structure/colors/radius/placement/icon/title/body now present; desktop expiry preserves Retry focus/scroll. Phone expiry still clamps scroll when temporary floor is removed, detailed below. |
| IR-09 MEDIUM | **PARTIAL / OPEN** | Actual Result phone seek/volume/source controls now have48px targets. Native pressed buttons fix the former invalid incomplete tab roles, but the approved directional keyboard operation remains absent, detailed below. |
| IR-10 MEDIUM | **RESOLVED** by scoped boundary equivalent | Real known failed acceptance from Exit and from Settings retains an ordinary visibly focused Retry accept and leave; successful retry reaches honest boundary; Return restores original logical Exit/Settings respectively. URLs carry allowlisted logical focus, no DOM reference. `browser.json`: failed-guard-focus/logical-exit-return; `recovery-browser.json`: settings-failure-focus/logical-settings-return. Full Projects/Settings UI remains excluded. |

## Remaining and new material findings

### IR-11 — HIGH / new / code confirmed, modeled browser-event behavior confirmed: phone backgrounding does not interrupt capture

The required contract says browser backgrounding/screen lock stops capture and synchronized source, preserves a usable partial as an unaccepted candidate and never auto-resumes. There are **no visibilitychange, pagehide or document.hidden handlers anywhere in frontend/src**. `useRecordController.ts:410-497` registers source errors/capture callbacks; its only AbortController callers are source error and component unmount. Native media listens to track ending/abort, which does not establish browser background handling.

In a fresh390×844 browser context, begin actual Record, wait900ms, then model document.hidden/visibilityState=hidden and dispatch visibilitychange/pagehide. After another600ms the UI still says Recording, source is still playing at1.44562s. It later saves the full-window candidate instead of interrupting. `browser.json`: modeled-phone-background/modeled-background-final. This establishes the missing lifecycle path and modeled local behavior; it is explicitly **not a physical phone or screen-lock test**.

Scope: handle the relevant browser lifecycle transition through the common controller/media port, stop reference and native capture, finalize compatible partial bytes, preserve prior candidate/accepted media when unusable, and require explicit user action on return. Preparing-state cancellation must stop acquired input too. Do not simply route an in-progress capture through the current generic native abort path: `NativeBrowserMedia.ts:176-181` rejects immediately after requesting stop, so it does not wait for a usable partial finalization. Keep expected interruption distinct from hard media failure. Test actual native partial bytes with modeled lifecycle events; retain the physical-device limitation.

### IR-06 — MEDIUM / still open / Record cancellation and blur restart playback

`FoundationRecordPage.tsx:497-498` uses the same `actions.endSeek` on pointer-up and blur, with no pointer-cancel handler. `useRecordController.ts:310-332` resumes whenever an audition was selected. Therefore a cancelled gesture followed by focus moving away restarts audio/video, violating the required cancellation-paused behavior and the shared transport semantics.

Fresh browser steps: actual candidate → Original → Pause → actual mouse-down on seek → pointercancel → move keyboard focus to Exit → release mouse. Video becomes **paused:false** at2.197018s. `recovery-browser.json`: record-cancel-then-blur. This does not refute the repaired Result release-to-play behavior; it shows the shared Record side is unfinished. Scope: distinguish successful release from cancel/blur, clear held interaction state and keep cancellation paused. Exercise source/take paused audition and finite-window end; do not make a blur invoke play.

### IR-08 — MEDIUM / still open / phone popup expiry moves scroll

The revised popup's temporary clearance is removed in `FoundationRecordPage.tsx:195-197` by restoring the prior body custom property/class. `app.css:107` consequently removes document height. When the page was scrolled by the recovery-clearance logic, the browser clamps its scroll as the popup expires.

Fresh390×667 denied-input recovery: before expiry scrollY237/maxScroll373; after the untouched8-second lifetime scrollY230/maxScroll230. Desktop guard Retry focus/scroll remains stable, but this phone case violates the explicit expiry invariance. `recovery-browser.json`: phone-popup-expiry-scroll; `phone-denied-popup.png`. Scope: preserve the useful document floor/context through expiry, releasing it only at a safe explicit transition or another mechanism that demonstrably leaves focus/scroll unchanged. Keep the corrected exact visual recipe and durable recovery.

### IR-09 — MEDIUM / still open / source-selector directional keyboard behavior omitted

`FoundationResultPage.tsx:549-556` now renders a group of ordinary aria-pressed buttons. That is a valid basic semantic choice and each button works via normal Tab/Space. It still omits the accepted **ArrowLeft/ArrowRight/Home/End** source selection/focus behavior present in the frozen `prototypes/core-journey-studio/result-player.js:48` and the accepted player brief.

Fresh Original-selected result → focus Original → ArrowRight leaves selection and focus on Original. `browser.json`: result-source-arrow. Source has no key handler for this group. Scope: implement the approved directional operation with truthful selected state and useful focus; use the native group or another sound semantic pattern rather than merely relabeling incomplete tab roles. Phone target correction is independently resolved.

### IR-12 — MEDIUM / new / confirmed visual regression: A action panel is38px below its reference alignment

The restored header moved the Record workspace's origin, but `frontend/src/styles/app.css:72` retains `top:38px` on the absolute A panel. Fresh normal1440×900: media y96, panel y134. Fresh frozen A7 screenshot: media and panel both begin at96. At1280×600, current media y56/panel y94, preserving the same wrong38px offset.

Evidence: current `A-record-1440x900.png` versus independently rendered `reference-A-record-1440x900.png`; exact current bounds in browser.json. This is a visible literal-reference mismatch, not a new composition proposal. Scope: align panel top with the approved media top in side-panel mode; preserve272px width,24px horizontal gap, viewport-centered video,≥32px gutter and stacked behavior below1248. Add the vertical alignment assertion that the current geometry tests omit.

## Actual visual and long-copy verification

Result captures now visually follow the frozen A7/B1 player composition: shared stage axes, seek rail above controls, short-height stacked actions, correctly placed source selection, contained full image and required icons. Differences in the explicit illustrative-output heading/body are truthful mock disclosure, not a demand for a real render. Compared actual reference/current PNGs at1440×900,1280×600,390×844. The A panel offset above is an actual remaining mismatch; numerical Result fit alone is not treated as overall visual acceptance.

The author's filenames containing `ru-long` select sintel-turn-3, whose translated sentence is short. They do not activate the frozen prototype's long-line stress copy. Independent `long.cjs` supplied the **exact frozen Russian stress sentence** through the active typed read port, without mutating persisted source/media/contracts: “Я ищу того, кто мне очень дорог. Мы прошли такой долгий путь, и теперь я не могу повернуть назад.” This changes only test presentation data and performs no captures/acceptances with that override.

At1280×600 both variants render60px-high dialogue with4px actual text-bottom→wave-top gap;1366×650 renders61.34375px dialogue and7.984375px gap. A media widths624/710px; B576/631.75px. Both desktop document heights remain600/650 and ordinary actions stay reachable. At390×667 the same copy wraps to128px and14px true gap; ordinary scroll is retained (A1028px document, B869px). See `long-browser.json` and `long-*.png`. The author should name future stress evidence accurately instead of relying on filename labels.

## Verification limits and next step

Fresh checks covered the two HIGH seams, native three-take connected path with draft acceptance/reload via boundary return, both layouts' Result, valid Original-selected dub download, primary completion, actual visual comparison, guard/Settings focus recovery, popup lifecycle, phone control bounds and real long copy. The author17unit/17browser/type/lint/build PASS remains supplied evidence; it was not rerun wholesale. Physical microphones/devices, hardware backgrounding/screen lock, exhaustive account-switch races, every generation/retry race, full screen-reader speech and backend rendering remain unproved here. No deployment/live A/B/telemetry, GitHub or Git delivery was performed. All reviewer changes are confined to this new revision-v2 evidence folder.

Return the bounded open findings to the owning Luna executor. Require a new explicit stable handoff and hashes before re-review. Both previous HIGH fixes are preserved; the new background lifecycle gap and remaining bounded defects prevent acceptance of v2.
