# Independent review: studio low-fi v3

2026-10-27, Asia/Qyzylorda. Target `core-journey-studio-lowfi-v3`, explicit ready-for-review handoff with edits paused. Preview5179; amended original comparison5178 is `core-journey-highfi-v3-owner-amendment-1`. Review-only; no author/runtime/canonical/GitHub/Git changes. Only this review directory was written.

**Disposition: one P2 removal-completeness finding requires correction. The revised studio composition is suitable for the owner's low-fi structure checkpoint after that correction receives a fresh bounded handoff. No studio approval, high-fi approval, integration or remote synchronization is inferred.**

## Finding

**P2 REMOVE-01 — Current EN/RU feature copy survives in both prototype dictionaries.**

- Locations: `prototypes/core-journey-studio/locale.js:57` and `prototypes/core-journey-lowfi/locale.js:57`.
- Reproduce: inspect each current dictionary entry beginning `Reprocessing replaces the prepared scene and unsaved takes only after confirmation. That neighboring workflow is outside this prototype.` Its Russian translation remains alongside it.
- Impact: this is unused current copy, not a visible runtime action or an observed route to rerun processing. It nevertheless retains the expressly removed workflow in active source and contradicts BRIEF/AUDIT's claim that feature-specific EN/RU copy is removed. This violates the direct removal-everywhere instruction; the author's104 checks did not catch it.
- Recommendation: remove that obsolete pair from both current dictionaries, then update source fingerprints and the removal check. Preserve historical screenshots, reviews, source snapshots and other provenance. No broader redesign or deletion is needed.
- Independent evidence: `v3-removal-audit.json` records both exact hits. The current rendered product has no removed action before or after first acceptance in either preview.

## Prior findings and actual composition

**STUDIO-01 resolved.** At1280x600 long RU the complete frame is608x342 and its contained source picture is608x258.4, with608px waveform. The source is large enough to follow performance; the wave no longer stretches into disproportionately wide empty wings. The faint single outer boundary unites Exit/title/count, scene, external spoken line, wave and centered controls. Controls fit at page top; their bottom is569px. The dialogue is24/30 and outside all video pixels and black bars. This judgment includes visual inspection of before/during/after viewport screenshots, not only bounds.

**STUDIO-02 resolved.** At1280x699/700/701 long RU the scene widths are704.95/706.41/707.88px. The former abrupt scene-size reversal is gone, and the dialogue remains a sibling below the complete frame. Capture and candidate completion retain the same608px short-screen frame and script position.

At1440x900 the scene/wave share a899.55px width within the same bounded studio. Title and dots belong to that frame; Exit and line count remain legible corner anchors. Normal desktop has more reserved script space, but it does not break the task grouping or justify another layout revision. At390x667, ordinary scrolling reaches the controls; starting capture and Next-to-capture reorient to scene, long dialogue, wave and timer. During that work the app header can scroll away. No text is relocated into media, cropped, or made smaller to force fit. Long-phone performance context remains useful with reduced motion.

Visual evidence inspected:

- `studio-v3-review-desktop.png`
- `studio-v3-review-short-long-before.png`, `studio-v3-review-short-long-recording.png`, `studio-v3-review-short-long-candidate.png`
- `studio-v3-review-phone-long-before.png`, `studio-v3-review-phone-long-recording.png`, `studio-v3-review-phone-line2-recording.png`
- `studio-v3-review-result.png`

## Bounded runtime checks

Actual Chrome156.0.8078.48 on Windows, headless Chrome channel, DPR1,100% CSS viewport. Desktop1440x900; short1366x650 and1280x600 long RU; continuous heights699/700/701; phone390x667 long RU with reduced motion. Script `v3-browser-review.py`; results `v3-browser-results.json`:49/49 independent assertions passed.

Checked external dialogue, full16:9 contained frame, matching scene/wave edges, desktop scene usefulness and control reachability; listening Pause time preservation and Resume continuation; held seek pauses and release starts playback; Record supersedes listening, disables scrub and exposes no capture Pause; progressively growing take overlay with unchanged original envelope, retained after completion; stable capture/candidate frame. Sequential acceptance still reaches Result and Return restores Record.

After an accepted take, recorded a replacement, chose Exit/Save and deliberately failed save. Exact candidate, previous accepted take and My projects destination survived failure and browser reload. Candidate audition started actual video/synthetic-audio playback; Retry opened the retained My projects destination. No removed action/handler nodes were present before or after acceptance in either live preview. This is a bounded regression pass, separate from the author's broader scenario reports.

## Documentation/removal boundary

Reviewed the scoped dirty-baseline patch and current affected contracts, not only the104-check summary: shared contract;06/07/09/10/11/12; BR/SPEC; implementation contract; flow/source indexes; task-link stub; HANDOFF/brainstorm precedence. Removed project allowance, paid rerun, first-take reset lock, consent/reset branches and zero-turn replacement permissions are absent from the current normative paths. Explicit withdrawn markers and historical provenance remain appropriately labeled.

Surviving requirements retain initial-processing technical failure recovery; unknown-operation same-identity reconciliation; cancellation/reservation/settlement/release protections; successful initial zero-turn charge plus another-video recovery without Record/Result; pre-first-launch source replacement; protected drafts/accepted revisions and explicit acceptance; rerecording; immutable Result assembly identity, authorization and retry. This review establishes the contract text boundary, not backend implementation proof.

Independent `v3-removal-audit.py` compared all88 baseline documents:17 scoped changed paths match author after-hashes,71 other baseline files are unchanged, and there are no unexpected changes. Original54-file comparison shows exactly8 amended sources/brief and46 preserved files, including historical evidence. Current studio71 and original54 manifest entries all match. Final manifest SHA256:

- Studio: `13596d00abfd89fb48098b55549ddbfbf0e5ad39e42be49aae3c770ef5bd8939`
- Amended original: `ff67e3c4dd369a3fba0303d93ecc2ef10872241a5aa73412b3b2eab484e8f976`

See `v3-final-target-hashes.json`. The original amendment is the explicit feature-removal exception; historical high-fi approval is not a new approval of this studio.

Published issue bodies remain stale under the owner's GitHub hold. AUDIT's pending alignment map names74,77,79,75,81,63,69; accounting/demo/payment assumptions7/17/8; older18/27/36/25. Duplicate historical publications33/43/45/53 and old research are retained. Stub74 keeps its stable path, current local label and explicit remote-stale note without copying a replacement issue body. I reviewed the supplied read-only issue evidence; I made no fresh remote mutation or claim that the published package is aligned.

## Limits and next disposition

Capture, envelope reveal, save and assembly are simulated. The source video and synthetic audition samples use real browser media; the Result is a fixed illustration. Playback state was observed, not a real microphone or human listening-quality test. Browser-local reload retention is not account durability. No backend, hardware, lease/concurrency, unknown-commit, real render, screen-reader speech, background-tab lifetime or portable font proof is supplied. The author builds and broader checks remain separate evidence; this review did not rerun all of them. No unrelated production/package review was performed.

Review finished on the stable v3 target. Author may now correct REMOVE-01 and hand off a named version with refreshed fingerprints for a narrow absence/preservation recheck. No other material visual or interaction finding was identified in this bounded review; no new owner decision is needed to delete the stale current copy.
