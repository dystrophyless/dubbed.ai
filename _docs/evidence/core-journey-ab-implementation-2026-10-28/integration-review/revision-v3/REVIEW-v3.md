# Independent integrated frontend review — revision v3

**Integrated review complete — core-journey-ab-integration-review-v3. Verdict: NOT READY.** Original findings IR-01–IR-12 are resolved or retained resolved after scoped checks. New **IR-13 MEDIUM** is a confirmed asynchronous Result playback error-state defect. The previous full-suite failures are explicitly accounted for below; green focused reruns are not treated as an explanation.

## Frozen inputs and environment

Reviewed2026-10-29 on Windows with installed Chrome156 and the local5180 preview. Root confirmed the author's explicit **Ready for integrated frontend review — revision v3 / EDITS PAUSED** handoff before dispatch. Base HEAD9096925a4476e84ec9a6e5ef9bff50ae45ac0f67; dirty, uncommitted frontend. All37 entries in the v3 manifest were verified at start and end (`source-hashes-start.json`, `source-hashes-end.json`). The manifest now wraps entries in `sourceFiles`; an initial reviewer command assumed the old array schema, then was corrected before any source comparison was claimed.

Browser processes used the normal **C:\Users\roman\AppData\Local\Temp** for TEMP/TMP, recorded in `browser.json`; no browser temp override to D:. Reviewer scripts/screens/raw JSON are confined to this new `integration-review/revision-v3/` directory. No frontend/prototype/canonical files, GitHub, Git commits/pushes or deployment were changed. Existing policy/skills/review contracts remain as in v1/v2. Semble located the Result/reflow seams; direct source reads and actual browser probes established the dispositions.

Executed own probes: `probe.cjs`, `recovery.cjs`, `resize.cjs`, `play-race.cjs`. They completed successfully as evidence collectors; successful script execution is not a product PASS. `play-race.cjs` intentionally injects one delayed rejected playback promise to test stale error fencing. `resize.cjs` supplies the exact approved long Russian stress sentence through an isolated active typed read port. Other captures use actual getUserMedia/MediaRecorder with Chrome fake input, never a fake Recorder. No physical microphone/background/screen-lock claim follows.

## Stable finding dispositions

| ID | v3 disposition and evidence |
|---|---|
| IR-01 HIGH | **RESOLVED, retained.**1200ms delayed source still shows Preparing recording and0recorder starts until real playback. Native source-clock trace observes first advancement18.6–93.3ms after recorder start across five actual starts. Full windows stop with source5.114807/8.505661/13.411496s. See browser.json delayed-source-preparing/complete and native-clock-trace. No invented hard latency tolerance is inferred from these measurements. |
| IR-02 HIGH | **RESOLVED, retained.** Real typed tombstone after reading generation bytes yields0download events, removes the player and presents the deleted boundary. `browser.json`: tombstone-delivery. Prior valid activation-pinned dub download remains v2 evidence; request identity/project/actor fences are retained in current source. |
| IR-03 MEDIUM | **RESOLVED, retained.** Current normal/phone headers retain title/dots and focused Exit hierarchy. Long-copy resize screenshots keep current dots/status intact. |
| IR-04 MEDIUM | **RESOLVED for settled composition.** Normal/short/phone Result and exact long-RU Record resize cohorts fit after layout settles. A/B axes and external dialogue remain. A transient resize overflow is separately characterized below rather than silently called a PASS. |
| IR-05 MEDIUM | **RESOLVED, retained.** Primary completed-last-line To result mapping and replacement-acceptance/stay branch are unchanged by the scoped v3 fixes. The v2 independent primary-action check and current author completed-revision evidence remain explicitly distinct; no whole revision journey was rerun independently in v3. |
| IR-06 MEDIUM | **RESOLVED.** The exact former Record actual mouse-down → pointercancel → focus-away → release reproduction now stays paused at2.049999s. Current handlers clear seek/capture state for cancellation/blur and distinguish successful release. `recovery-browser.json`: record-cancel-then-blur. Result cancellation/release handling is retained; fresh normal playback/cancel cohorts remained healthy. |
| IR-07 MEDIUM | **RESOLVED, retained.** Actual A screenshot/source retain LogOut Exit, Undo2 Return and ChevronLeft Previous with outlined1.1 geometry. |
| IR-08 MEDIUM | **RESOLVED.** Exact former390×667 expiry reproduction: before/after scrollY237→237 and maxScroll373→373; transient popup expires while its document floor is retained. `recovery-browser.json`: phone-popup-expiry-scroll. Correct inverse visual recipe/title/body/icon and durable guidance remain. |
| IR-09 MEDIUM | **RESOLVED.** ArrowRight/Home/End/ArrowLeft now move selected source and focus through the real controls. E.g. Original→ArrowRight selects/focuses My dub; Home selects Original; End selects My dub. Current code handles wrapping/disabled buttons. Phone48px seek/volume/source controls are retained. `browser.json`: source-directional-keys. |
| IR-10 MEDIUM | **RESOLVED, retained.** Fresh failed Settings acceptance Retry → boundary → Return restores logical Settings. Current common boundary logic retains Exit identity too; its v2 independent proof remains. `recovery-browser.json`: settings-failure-focus/logical-settings-return. |
| IR-11 HIGH | **RESOLVED.** Modeled visibility/pagehide during actual native recording pauses source at0.756661s and saves an interrupted4924-byte Blob,0.78s/37440decoded frames. Visible return does not resume capture/playback. A pending getUserMedia result delivered after interruption is stopped; all acquired tracks end; no new candidate replaces the prior partial. An actual interrupted capture with deliberately invalid/unavailable decoded/timed probe also preserves the exact prior candidate and project revision. See usable-interruption, no-auto-resume, pending-interruption-preservation and unusable-interruption-preservation in browser.json. Candidate safety is independently checked, not inferred from the notice text. |
| IR-12 MEDIUM | **RESOLVED.** A normal1440×900 media/panel both start y96; panel272px remains24px to media right and inside32px gutter. Current top0 corrects the obsolete38px offset. `A-panel-1440x900.png` and A-panel-alignment bounds; exact frozen A7 comparison was established in v2 and its target files remain read-only. |

## IR-13 — MEDIUM / new / confirmed failure-path behavior: a stale play rejection poisons the healthy selected Result source

`frontend/src/features/result/FoundationResultPage.tsx:342`, `:403` and `:510` attach `.catch(() => setSourceError(true))` to playback requests without checking the original media element, current source/interaction epoch or route/scope. Event handlers have source-key checks, but these asynchronous promise continuations bypass them.

Independent focused reproduction (`play-race.cjs`):

1. Complete three real native usable partial captures through the actual Record lifecycle/acceptance path to create an authorized illustrative Result.
2. Select Original and Play. Model one still-pending old-source play promise rejecting with `AbortError`400ms later, after a source switch. The real video does play; this is a playback-promise fault injection, not a fabricated capture or a corrupted current asset.
3. After80ms select My dub. Its actual current video becomes ready and plays normally.
4. Deliver the old Original request's rejection after that old video is disconnected.

Observed at delivery: **currentSource=dub, readyState4, media.error=null, paused=false, currentTime0.442896**, yet the UI displays **“Video is not available in this browser.”** and disables the selected video's Play/Pause control. See `play-race-browser.json` and visually inspected `late-old-source-abort.png`. The raw trace proves the rejected request belongs to a disconnected Original element while the healthy current request belongs to the dub Blob URL.

This confirms a stale-continuation bug under a legal delayed failure ordering. It does **not** prove that this exact ordering caused the author's overwritten c2 restart failure. Five ordinary Original→Play→My dub restart cohorts and a native immediate play/cancel sequence produced no error in this independent run; those narrower positive observations are also retained in browser.json.

**Scoped correction:** fence success/failure continuations for direct Play, Replay and loaded-metadata resume to the active element/source/load/interaction epoch and active scope. Expected cancellation or obsolete rejection cannot mark a healthy replacement unavailable. Do not only compare a reusable `original` string if A→B→A can return to that same key while an earlier request is still pending. A genuine error belonging to the current request must remain visible with usable recovery. Add a focused stale-rejection regression plus healthy rapid source-change/cancel and current-source failure checks; no backend/media-generation redesign is needed.

## Disposition of the author's non-green runs

### A Result media-unavailable restart

The full-final-c2 failure remains a real supplied failure observation. The original failure trace/error-context was overwritten by later runs, so its exact browser media error/rejected promise/timing cannot be reconstructed. It is not dismissed as transient. The independent source review and negative ordering probe found IR-13, which can produce the same unavailable message while the current media is healthy. That is a credible concrete seam to fix, not a proven retrospective causal identification. The passing ordinary cohorts do not close IR-13.

### B long-Russian phone horizontal overflow

The actual failing assertion is in the long-Russian Record resize cohort, not evidence of a persisted Result width defect. Independent repeated A/B resize samples identify a specific temporary layout path: `FoundationRecordPage` keeps the previous desktop inline `--record-media-width` until a resize requestAnimationFrame clears it. The higher-specificity Record header width still consumes that desktop value briefly on a phone viewport.

In one B1366→390 transition, the **390px viewport had documentWidth648px and headerWidth631.75px** at the immediate sample; the offscreen elements were the header/title/dots/counter. A showed analogous immediate widths726px. Across18 measured long-copy transitions, **all170ms and520ms samples settled without horizontal overflow**. See `resize-browser.json` including the actual offender bounds, plus the decoded long-copy screenshots. Twelve additional settled B Result resize samples showed no horizontal overflow.

This is evidence of a scheduling-dependent resize window and explains why an assertion at a fixed150ms is not a robust readiness condition. It does not establish that the lost c2 trace had precisely the same duration. Optional narrow hardening: constrain the phone header in CSS independently of the temporary desktop custom property; tests should wait for the actual settled geometry with a bound, while still failing persistent overflow. This transient observation is **LOW/nonblocking** for the scoped settled composition and is not the reason for the NOT READY verdict.

### Source clock did not move in the author's fixed400ms sample

The c3 observation remains recorded; no direct failure trace survives and its root cause is unconfirmed. The current helper's bounded polling checks the same actual clock advancement rather than replacing it with a timer-only success. In fresh actual captures here, initial media-clock movement occurred18.6–93.3ms after recorder start; full windows ended at the expected supplied boundaries. There is no independent evidence of a presently stuck source clock. This is a bounded unconfirmed historical observation, not a reason to invent a new production latency limit or claim hardware timing certification. Keep the observation and future failure traces; do not treat a helper timeout alone as a product diagnosis.

## Limits and next gate

No repeated complete test suite was launched. Author type/lint/build/17unit and the21/21,19/21,20/21 browser history remain supplied evidence with their actual boundaries; the last green focused reruns do not erase earlier failures. Independent checks cover the named fixes, native lifecycle data preservation, delayed readiness, actual source-clock movement, selector/cancellation/focus/expiry, source-error ordering and repeat resize geometry. Physical microphones/devices/screen lock, cross-device leases, all account/reverse-generation races, screen-reader speech and real backend rendering remain unproved/excluded. Output stays explicitly illustrative and not rendered from captured speech.

Return IR-13 to the owning Luna executor, preserve the resolved fixes, and require another explicit paused handoff with current hashes. Re-review the playback continuations and their nearby failure/cancel/source-switch regression evidence, then Root can perform its final connected proof. Current v3 is **NOT READY** because IR-13 remains material.
