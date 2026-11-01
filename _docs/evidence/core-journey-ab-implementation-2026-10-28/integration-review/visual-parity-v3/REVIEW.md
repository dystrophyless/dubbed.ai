# Independent integrated review — visual parity v3

**Verdict: NOT READY for literal parity, solely pending VP-05 (LOW).** VP-01–04's material defects are resolved. The owner requires the confirmed remaining selector difference to be corrected, so it is not recorded as an accepted visual adaptation. Root confirmed this disposition before this completed handoff. The next review can be confined to the selector; the 36 successful runtime checks do not need reopening without a relevant change.

Review date: 2026-10-30 Asia/Qyzylorda. Author handoff: `visual-parity-v3/AUTHOR-HANDOFF-2026-10-30.md`, explicit Ready / EDITS PAUSED. Implementation 5180; frozen A 5178, B 5179. No product, prototype, canonical, Git, or GitHub writes by the reviewer. Evidence writes are confined to this directory.

## Remaining required correction

### VP-05 — LOW — Old desktop source-tab minimum width remains

**Class: visual/code; confirmed in A and B.** The desktop Original/My dub selector is **162.609375 px wide**, while the frozen selector is **160.28125 px**. Its height, position, border and backdrop now match. The discrepancy persists at 1280×600, 1024×600, and 800×500 in both layouts. Phone selector geometry matches.

`frontend/src/styles/app.css:155` still gives `.result-player__source-tabs button` a `min-width: 78px`. The React buttons retain that legacy class ancestry. The copied `.result-sources button` recipe in `frontend/src/styles/prototype-result.css:60` does not remove the old floor, so the desktop My dub button is wider than its source content/padding recipe. This is a small, deterministic remaining cascade difference, rather than a font-loading or frame-readiness issue.

Reproduce: open a ready A or B Result at 1280×600 and compare `.result-sources` against the frozen Result at the same viewport. Required correction: remove/reset the competing legacy minimum width for the copied source-selector buttons. Preserve the current phone 48 px targets and keyboard/player bindings. A narrow fresh handoff and desktop/phone selector comparison are sufficient.

Evidence: `probe-1793301022647/browser.json`, all six desktop `pairs[].diff` records; matching `A/B-{app,ref}-result-1280x600.png` and the narrower paired screenshots. No arbitrary content normalization was applied to the selector.

## Disposition of the previous findings

| ID | Disposition | Independent evidence |
| --- | --- | --- |
| VP-01 | Material defect resolved; VP-05 tracks the remaining tiny selector width | At 1280×600 A stage y=88, width=547.546875; B y=80, width=561.765625, matching frozen references. Both implementation documents are exactly 600 px high. Actions wrap into the source's 92 px group; short A body text/padding and B phone 20 px actions gap now match. Selector border/backdrop are corrected. |
| VP-02 | Resolved | Fresh Record slider and actual video both 0.7 in A/B; Original audition uses 0.7. Result slider/media initialize to 0.7 and retain it after comparison switching, current-source recovery, and page reload. |
| VP-03 | Resolved | After the real ended event, the existing `#result-play` becomes Replay. There are only Replay and Full screen transport buttons. Replay restarts below 1 second and actually plays in A/B. |
| VP-04 | Resolved | At 390×844 with Russian UI and the exact approved long Russian sentence, A Re-record and Your take are 72 px with `12px 8px` padding, matching the frozen source. B's corresponding control dimensions/padding also match. No horizontal overflow. |

The Record ref callback applies the initialized volume to each current video element (`FoundationRecordPage.tsx:532–536`). Result uses 0.7, its existing source/volume effect, and a single ended transport slot. The Result fit reads the workspace's source-defined minimum, clamps it to the source maximum, and uses the same iterative height-fit approach (`FoundationResultPage.tsx:120–168`). The A scoped phone override now restores the effective source padding.

## Browser and nearby regression verification

`node .../integration-review/visual-parity-v3/probe-v2.cjs` completed **36/36 checks, zero browser errors**, using two independent contexts and Chrome fake media input. Each A/B journey captured a full native first-window Blob, auditioned it, reloaded it and auditioned successfully, accepted it and two usable interrupted native captures, and reached the ready illustrative Result. Checks covered capture locks; explicitly selected paused Record audition seeking/release; blur cancellation; source keyboard Home/End; current non-abort playback rejection, visible error and Reload sample recovery; and IR13's delayed old non-abort rejection across Original → My dub → Original. The stale failure did not poison the current source. Successful current failure recovery retained the same Blob URL, played at 0.7, and decoded a 960 px video frame. A fresh Result page reload was ready, paused and error-free.

Eight Result pairs were captured at 1280×600, 1024×600, 800×500 and 390×844 for both layouts. Stage/picture/transport geometry matches each frozen reference at every measured viewport. The only measured component difference in that set is VP-05's desktop selector width. At 800×500 the source's minimum-width fit intentionally requires vertical scrolling; the implementation follows it (A stage width 480, B 520), with no new horizontal overflow. The frozen B's hidden live region adds reference-only document height, as already diagnosed in the preceding handoff; visible stage geometry matches. Phone footer/actions geometry now matches in A/B.

Screenshots were visually inspected, including short A/B Result, narrower short fit, Russian phone Record and ended controls. The concise truthful “Sample ready” and fixed-example disclosure differ from the prototype's user-dub claim by design. Real decoded source/take waveform samples also differ legitimately. Reference normalization hides only `.lab` and `.fixture-credit`; source files were untouched. Both pages receive the exact long Russian sentence in the Record DOM for stress measurement, followed by resize; fixture content changes stay inside the isolated browser context. Font readiness, media decoded readiness, scroll-to-top and pointer position were controlled.

The first `probe.cjs` run is preserved in `probe-1793300897243/`, including trace and failed result. Its seek assertion ran immediately after a fresh route load with no audition selected and then expected a Pause control. The controller explicitly resumes seek only when an audition was selected (`useRecordController.ts:311–341`); this deterministic setup did not exercise the intended selected-paused audition case. `probe-v2.cjs` explicitly selects Original, pauses it, and then tests release/cancel. The original failure is not counted as a pass or attributed to timing; the corrected scenario and source explanation are recorded separately. The v2 probe also reads the selector's actual `aria-pressed` state.

## Stable source boundary and limits

The preceding v2 manifest covered 45 entries. Of those, four changed exactly as declared and **41 are retained byte-for-byte**. This revision's six-entry manifest additionally lists `frontend/src/shared/i18n.ts` and `frontend/e2e/record-journey.spec.ts`, which were not part of that older 45-entry manifest. Their declared hashes also match. The combined **47-entry boundary matches at start and end and remains unchanged throughout review**: `source-hashes-start.json`, `source-hashes-end.json`. This is the exact verified boundary; it is not a claim to have hashed every dirty file in the checkout.

Browser temporary files used `C:\Users\roman\AppData\Local\Temp`. Successful evidence: `probe-1793301022647/`, raw JSON, paired PNGs, and unique A/B traces. The failed initial probe and trace remain preserved separately. No failed evidence was overwritten.

The author static/unit runs were read but not repeated. This review did not reopen the whole integration matrix or test physical microphones, network failures, hardware interruption, or backend rendering. The current-error probe injects a controlled non-abort `play()` rejection on the real Blob-backed player and verifies recovery through actual decode/playback; it is not a network outage test. Result remains a disclosed fixed sample, not an assembly rendered from accepted takes. Author edits stayed paused until this completed review.
