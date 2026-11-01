# Independent integrated review — visual parity v2

**Verdict: NOT READY.** Four material findings remain in the paused source-port version. This is a bounded review of literal prototype presentation and nearby runtime regressions, not a restart of the earlier full integration audit. Product and prototype files were read-only throughout.

Reviewed on 2026-10-29 against the explicit `Ready for integrated frontend review — visual parity v2 / EDITS PAUSED` handoff. Preview: implementation 5180, frozen A 5178, frozen B 5179. The author's `handoff-2026-10-29/source-manifest-sha256.txt` contains 45 entries; **45/45 matched before and after this review**, with no mismatch. See `source-hashes-start.json` and `source-hashes-end.json`. Reviewer edits are confined to this directory.

## Confirmed findings

### VP-01 — MEDIUM — Result retains competing presentation that breaks short-screen parity

**Class: visual/code; confirmed in both layouts and a separate direct A journey.** At 1280×600 the implementation's actions remain a 358.14×40 horizontal row; the frozen prototypes allow the actions to shrink and wrap into a 92 px tall group. The implementation squeezes its status into a narrow column and three lines, and its disclosure extends below the viewport. Direct A reproduction has document height 734 px, main bottom 734, stage width 480. Frozen A's main bottom is 583.98 and stage width 547.55. B likewise has a 520 px stage versus 561.77, with its status/disclosure extending below the viewport. These are visible composition differences, not waveform differences.

The React footer retains both `.result-workspace__actions` and `.result-actions`. `frontend/src/styles/app.css:180` supplies `flex: none`; copied `prototype-result.css:113` does not reset it. The old source selector rule at `app.css:154` also leaves a 1 px border and backdrop treatment on `.result-sources`, making the phone selector 168.31×54 rather than the source 166.31×52. Separately, `prototype-result.css:145` gives B phone actions a 16 px top gap, versus the frozen B's 20 px, shifting actions upward 4 px. The short A source also uses 14/20 body text and 8 px bottom padding; those source refinements have not all survived the port (`prototype-result.css:115–120`, legacy `app.css:177,184`).

Reproduce: capture/accept three usable takes, open Result, resize to 1280×600 and scroll to top. Compare each frozen Result at the same viewport, with only its lab/fixture footer hidden. Preserve the truthful illustrative-sample disclosure; its wording can differ. The finding concerns the surviving competing flex/border/spacing rules and resulting cramped composition, not a request to claim a rendered user dub or to force identical text-dependent height.

Evidence: `run-1793296129331/{A,B}-{app,ref}-result-1280.png`, the corresponding entries in `browser.json`, and `runtime-1793296564003/A-short-result.png` plus `fresh-direct-short-result`. Scope of fix: remove/reset the legacy presentation on the copied Result hierarchy and carry over the source's short/phone refinements.

### VP-02 — MEDIUM — Record volume value is not bound initially; Result default differs from the source

**Class: behavior/code/visual; confirmed in A and B.** On a fresh Record route, click Original without touching the volume slider. It displays 0.7 while `#scene.volume` is 1. The user therefore hears a different volume from the displayed setting. `FoundationRecordPage.tsx:532` initializes React state to 0.7, but only the change handler at lines 660–664 writes to the media element. The frozen audition applies the current slider value when starting playback.

Result initializes both its displayed slider and media to 1 (`FoundationResultPage.tsx:58`); the frozen Result initializes to 0.7. This is visible in every Result pair and audible in the binding. Scope of fix: initialize/apply the displayed source volume to the current media element and carry the approved Result default into the controller binding.

Evidence: `run-1793296129331/browser.json`, behavior entries `A-reference-volume-binding` and `B-reference-volume-binding`, both `{input:0.7,media:1}`; Result capture values 1 versus reference 0.7; independent direct Result check in `runtime-1793296564003/browser.json`.

### VP-03 — MEDIUM — Ended Result adds a second playback control

**Class: visual/behavior/code; confirmed after actual playback ends.** The frozen Result morphs the one primary transport slot to Replay. The React page keeps a Play button and inserts a separate Replay button (`FoundationResultPage.tsx:810–816`). The extra slot changes the transport composition, especially on phone, and exposes two actions for the same ended state.

Reproduce: open the ready Result, seek to its final fraction of a second, play to the actual ended event. Scope of fix: bind Replay to the existing primary slot when ended, preserving the established playback epoch/error fences.

Evidence: `runtime-1793296564003/ended-phone-result.png` and `ended-transport` raw buttons `[Play,Replay,Full screen]`; `run-1793296129331/{A,B}-{app,ref}-result-ended-phone.png` and recorded transport lists.

### VP-04 — MEDIUM — A's scoped phone cascade changes multiline control height

**Class: visual/code; confirmed in the matched healthy candidate state.** At 390×844 with Russian UI and the approved long Russian sentence, A's Re-record and Your take controls are 64 px high rather than the frozen 72 px. The helper and Next move upward 8 px. English outer geometry conceals the issue because the minimum target height wins there.

The computed padding is `8px` in the implementation versus `12px 8px` in the frozen source. Copying the rule inside `@scope` changes its precedence against the global component recipe: the scoped `.performance-actions button` phone rule in `prototype-record.css:3` wins over the global `.hf-button` phone padding in `prototype-components.css:47`. The source rule recipes are present, but their effective cascade differs. Scope of fix: retain the frozen effective padding/height when scoping the source; no layout redesign is required.

Evidence: `record-confirm-1793296719213/A-{app,ref}-390-ru.png` and its `browser.json` ten deltas; English phone records the two padding deltas with equal outer boxes. `style-diagnostic.json` records matched CSS rules and actual platform fonts. B Russian phone has only the existing label-width difference (`Exit` translation), not this control-height regression.

## What passed and what the evidence establishes

- `node source-audit.cjs`: 426/426 frozen selector/declaration recipes found in the ported CSS after normalizing scope/layer wrappers. The Record hierarchy, IDs and visual section order correspond to the mapped A/B prototype hierarchy. This is substantive literal source reuse; the findings concern effective cascade and retained JSX/bindings, rather than an absence of copied source. Recipe presence alone does not prove rendered equivalence.
- Independent healthy matched-state Record pairs: A and B at 1280×600 with long Russian dialogue have zero measured component differences; B phone English has zero; B phone Russian differs only in the width of its existing Exit translation. A normal desktop initial state also has zero measured geometry/style differences. Header/title/dots, video, caption outside video, waveform footprint, timeline and controls were visually inspected. Real waveform samples are intentionally different.
- `node record-confirm.cjs`: fresh direct routes, actual native fake-device first-window captures, explicit Your take, audio readiness, pause, exact dialogue stress and phone localization. Zero browser errors. Both A/B source and actual take remain playable. No horizontal overflow in those matched phone scenes. Actual font inspection resolves Mabry Pro Regular for dialogue and Medium for controls, including the implementation's Russian text.
- `node runtime.cjs`: independent direct A full first-window candidate, healthy audition, reload and healthy audition; acceptance through three actual MediaRecorder captures (two usable interrupted partials) reaches the ready mock Result. Source selector ArrowRight selects My dub. Injecting a delayed Abort rejection from the old Original play request while switching to My dub leaves the current media enabled and error-free: prior IR13 protection remains effective.
- `node parity.cjs`: both A/B capture locks keep Record, seek, Exit and Next disabled during capture; volume remains available. Seek cancellation remains paused on the selected source at the held time. Browser errors array empty. The first broad A candidate visual setup encountered an unavailable-take state and the initial B desktop setup had an unsettled width. Neither was accepted as matched-state parity evidence or dismissed as a proven transient. Separate fresh direct candidate/reload checks are healthy, and `diagnostic.json` establishes B's settled direct desktop dimensions match. The report's positive Record comparisons use the healthy direct confirmation packet.

## Evidence and limits

Commands ran from `D:\Program\python\Dubbed`, using installed frontend Playwright and Chrome 156 on Windows. `TEMP` was `C:\Users\roman\AppData\Local\Temp`. Every browser context was isolated from other contexts. Trace files are unique and preserved in `run-1793296129331/`, `runtime-1793296564003/`, and `record-confirm-1793296719213/`; no failed trace was overwritten. Scripts and raw JSON are alongside this report.

Reference normalization hid only the prototype lab strip/fixture credit. The first broad parity harness normalized title capitalization via the active read port; the healthy direct Record confirmation used direct routes and set equal approved stress text for presentation measurement. It waited for fonts and the candidate audio readiness before audition. Snapshots were scrolled to top and source frame readiness checked. No production stylesheet or prototype file was edited for comparison.

This targeted review did not rerun the full author unit/e2e/static suites, the earlier entire integration failure matrix, or every desktop size. Fake Chrome media input produces actual captured Blobs but proves no physical microphone/device behavior. Result remains the disclosed fixed illustrative sample, not a backend render assembled from accepted user takes. The source manifest was unchanged throughout; the executor must receive this completed handoff before making fixes and provide a new explicit ready handoff for re-review.
