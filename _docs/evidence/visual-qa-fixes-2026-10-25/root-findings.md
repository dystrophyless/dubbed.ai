# Root verification findings

## FIX-R79-01 — MEDIUM — Initial assembly footprint was also applied above a retained result

Confirmed by source diff and fresh `issue-79/evidence/replacement-en-short.png`, opened by Root. ResultScreen unconditionally adds `result-screen__stage` to assembling and failure regions. With an old displayed video this creates a second stage-sized blank area above that preserved player; at1440x700 Previous version starts nearY587 and the video/download are pushed below the first viewport. QA-79-07 applies to first assembly footprint when no result exists. This is a correction regression, not accepted visual behavior.

Required owner79 follow-up: use stage sizing only when there is no displayed playable generation; keep replacement status/failure compact alongside retained playable result. Add a focused conditional-render regression and recapture short desktop/phone replacement and initial assembly to prove both contracts. All generation identity/recovery fixes must remain. Original owner will be resumed when a slot is free; no competing source writer. Until fixed,79 remains in_progress and current source is not accepted.

Owner79 follow-up added conditional no-displayed-player stage rendering, a third focused test, and fresh37-path captures. Root reopened the updated replacement-en-short.png: the blank duplicate stage is gone, assembly is compact above the retained player. FIX-R79-01 is resolved for this bounded correction; final integrated/source-freeze verification remains pending. 3 focused Result tests passed, no new global typecheck claim.

## FIX-R61-01 — LOW — Newly added historical date typo

Root inspected the scoped active-doc diff: shared-contract.md's new paragraph says `Historical 2022 answer` beneath the2026-10-22 heading. Owner61 must change this to `Historical 2026-10-22 answer` and refresh affected afterhash/scopeddiff before documentation acceptance. Preserve the actual original answer and all source provenance. Small owner follow-up is queued; no competing document writer.

Owner61 corrected the date and density provenance, propagated the approved private/source/notice/capability seams, and refreshed scoped diffs. Root inspected the follow-up diff/stat (16 files,81 additions/59 deletions; long existing paragraphs account for file size), saw the exact date/provenance correction, and independently matched18 current document hashes plus18 unchanged frozen originals. See root-docs-verification.json PASS. FIX-R61-01 is resolved within documentation; product verification is separate.

## FIX-R82-01 — LOW — Correction receipt canonical ID and duplicate-evidence attribution

Root read issue82 completion: rows use `QA82-01` rather than stable `QA-82-01`, and the shared QA-78-03 paragraph incorrectly describes button-density evidence instead of the OTP geometry finding. The actual OTP screenshots/metrics and QA82-06 support the intended shared OTP correction. Owner82 must normalize evidence IDs and fix that attribution without product-code changes; refresh only affected evidence metadata. Do not claim a source defect from this documentation mistake. Queued for a small same-owner follow-up when a slot is free.

Owner82 completed the receipt-only follow-up: all six IDs and duplicate references are canonical; QA-78-03 now names OTP geometry/grouping/type and QA-71-04 links the verified reset consumer. Only completion.md and summary.json changed; all52 screenshot/metrics artifacts remain untouched. FIX-R82-01 resolved as documentation, with no new product defect or test rerun claimed.

## FIX-R77-01 — MEDIUM — Newly used discard endpoint needs the existing private recording actor fence

Root followed the new Back discard caller (RecordingScreen.tsx around1758) into mock-recording.ts around782. The previously unused discardDraft method authenticates account/project/revision but lacks recording actor/live-grant authorization and its idempotency fingerprint lacks the actor. Earlier milestone evidence explicitly left this unrelated endpoint unchanged because no UI caller existed; that boundary has changed. A same-profile view-only actor must not discard another active actor's protected saved candidate or replay its successful command. This is a private mock concurrency contract finding, not a production cross-account/security exploit claim.

Owner77 is explicitly authorized only the discardDraft service hunk and focused service tests in addition to its UI ownership: reuse existing private live-grant/actor helpers, include actor in fingerprint, preserve same owner replay behavior and public facade signature. Verify owner success, other actor denial/candidate preservation and owner-operation replay rejection. No new lease timing or production fencing policy. Final recording UI proof must still pass. Owner acknowledged; unresolved until tests/current proof arrive.

Owner77 implemented private requireCurrentGrant reuse and actorfingerprint;10service tests passed, thenactualBack browserpath passed again afterfence. Root inspected the exactservicehunk and final14screenshotmanifest bookkeeping. FIX-R77-01 resolved withinprivate mockcontract; no production/physicaldevice claim.

## FIX-R77-02 — MEDIUM — Scene-fit calculation clears only the target, leaving caption and waveform underneath panel

Root opened final `qa77-ru-breakpoint-767x900.png` and read its paired metrics: spokenTarget.bottom682.98 and panel.top691 (8.02px clear) but full dialogue.bottom738.98 and timeline.bottom798.98. Capture-window/supporting line and waveform are covered by the panel at initial scroll0. Source effect measures only `targetRect`. ActiveFlow09 Interaction/responsive checks require video, dialogue and waveform above the pinned panel; only the originally obscured spoken sentence has been cleared. Root does not accept a narrower dimension assertion as the full viewport contract.

Sameowner77 follow-up: calculate against the last required content (whole dialogue/caption plus waveform), preserve aspectfit and fixed panel if it fits, use documented in-flow fallback if no readable scene budget remains. Assert whole dialogue and waveform bottoms <=panel.top-8 at767/390/longtext normal heights; verify short-heightinflow remains. Preserve all protected Back/actor fences. No competing writer; follow-up queued for next slot.

## FIX-R68-01 — MEDIUM — Shared recovery-helper structured typing rejects valid UI identity error codes

Root inspected the helper/caller seam and ran one midpoint `npm.cmd run typecheck`: exit1 with only TS2345 at FeatureRoute.tsx114. IdentityState.code also permits unknown-operation/unexpected, but ServiceRecoveryProblem's object branch is Pick<ServiceError,code|retry>, excluding those UI codes. Focused UI tests transpile without a full typecheck, so theirPASS does not cover this composition. No final source-freeze typecheck has been claimed.

Owner68 follow-up: widen only the UI helper's structured code field to ServiceProblemCode while retaining RetryDirective. Preserve unknown outcome reconciliation semantics and no new mutation; add a typed alias-metadata case. No public Services contract change or casts at consumers. Queued for next free slot; compile gate remains unresolved until scoped fix and actual TypeScript check.

## FIX-R77-02 RESOLVED — Full dialogue and waveform fit

Owner77 resolved FIX-R77-02 in the final focused follow-up. calculatePhoneSceneWidth now budgets against the later bottom of the full dialogue header and waveform timeline; the resize observer tracks both regions. The pinned-panel fit retains the 8px safety gap, aspect-fit video and 320px readable-stage fallback. Fresh browser metrics show dialogue/waveform clearances of 82.62px/22.62px at RU 390px, 68.02px/8.02px at RU 767px, 68px/8px for long RU text at 767px, and 72px/12px with the panel in flow at 767×600. All changed screenshots were opened, and all 14 manifest entries validate against current files. Focused helper tests passed (6); the focused QA77 Chromium test passed (1, 21.1s). Back choices, candidate semantics and the accepted-take count remain covered by the same browser run; the existing private actor-fence service proof was unchanged. FIX-R77-02 resolved for the local viewport contract; full frontend/typecheck and physical-device behavior remain outside this follow-up.

Root subsequently reopened the current767 screenshot and confirmed the complete caption/interval and waveform above the panel. This is Root's bounded visual readback, distinct from the owner's preceding self-verification.

## FIX-R68-01 RESOLVED — Structured UI codes and truthful language rollback

Same owner68 widened only the structured helper code to ServiceProblemCode, retained retry directives and unknown reconciliation, and passed the actual global typecheck plus nine focused tests. Shared EN/RU preference failure text was corrected to match the provider's saved-language rollback.62 then asserted the fresh rendered Account failure copy has no obsolete claim that the new language remains applied. These are current local seam checks; final frozen integrated verification remains pending.

## FIX-R81-01 — MEDIUM — Current quote conflicts with stale instruction

Root opened `issue-81/evidence/03-en-short-desktop-1440x700-current-quote.png`. The current6-credit quote and enabled processing button coexist with `Section saved. Request a fresh quote before processing.` The obsolete instruction contradicts the current action. Hide/clear it only once the quote is authoritatively current; retain correct stale/unavailable guidance. Same owner81 follow-up is queued with a meaningful regression and fresh media-ready current-quote captures. The opened screenshot also shows a loading spinner, so the evidence script must wait for actual media data/frame readiness. No acceptance until repaired.

Same owner81 added the current-quote conditional and a regression covering retained stale/failure guidance, disappearance for a matching quote and zero processing starts. Ten NewDub tests passed; all14 captures were refreshed with decoded video-frame readiness. Root reopened the current short-desktop image: obsolete instruction and loading spinner are gone, with preview/selector/quote/action visible. FIX-R81-01 resolved for this bounded correction; final frozen integration remains pending.

## Additional Root visual readbacks

Root opened62 Account desktop1440x900 and RU390 long-identity deletion dialog: the desktop44px deletion action is usable at the bottom, the phone identity wraps and disclosure is readable. At1440x700 it requires ordinary vertical scrolling; no above-fold claim. Root opened75 RU390 six-state project list: main actions and badges are contained, with truthful unavailable-preview slots. Root opened65 RU390 pending purchase/history: current observational status is separate from immutable ledger values with explicit labels. Root inspected71 DestinationNotice source and opened its RU390 native success destination: localized confirmation fits above New dub, dismiss target is48px and no extra mandatory continuation step was added. These named observations are not universal screenshot or product acceptance.

Root also opened74 fresh running-known RU phone and zero-turn-prior EN short screenshots. Attempt type, original authorized amount, current settlement state and clearly account-wide totals are distinguished; prior-preparation continuation is visible. The short capture is full-page and does not prove every action fits the initial viewport.

## FIX-R63-01 — MEDIUM — Default E2E artifact writers target dated historical evidence

Root enumerated every `_docs/evidence` and `process.env` occurrence in frontend/e2e and e2e-real. Many ordinary spec files unconditionally target dated2026-10-23 historical evidence or current owner67/74/77/78/82 receipt folders. Only shell-evidence has an explicit capture flag; Processing merely switches an `after` phase by environment. Running the required full suite as-is can overwrite preserved accepted/review evidence or invalidate current owner manifests. No full suite has been run during this correction wave, so these older files remain preserved.

Assign63 a narrow test-infrastructure repair: common configurable fresh visual-artifact root (safe default test-results output, explicitly separate current integration directory), redirect ordinary writers without changing product behavior/assertions or frozen reports. Keep source-reference paths as source provenance. No global deletion, snapshot update or overwrite of old evidence. Verify preservation by before/after hashes and record exact environment with the full run.63 may perform this independent setup before72 source completion, but final browser/source-freeze acceptance must wait for all product writers.

63 Stage A implemented DUBBED_E2E_ARTIFACT_ROOT with ignored test-results/e2e-artifacts default and redirected14 writer specs, retaining source-reference paths and the shell capture flag. Four helper tests passed. Its preservation audit matched517 targeted historical files and6 frozen packet/review files. FIX-R63-01 setup is resolved; Root must recheck preservation after the full suite before final acceptance.

## Follow-up composition checks

72's current typecheck exposed four AccountLinking display-union errors and one Processing cancellation reconciliation error.66 normalized UI unknown/conflict display types locally and reran12 tests; its authorized typecheck showed only the Processing error.74 then removed the erroneous assignment of a cancellation-operation envelope into a preparation-operation snapshot before navigation. Twenty-one focused tests passed and the actual global typecheck passed. Historical failed logs remain; no casts or public API widening were used to hide the mismatch. The product-source freeze was recorded afterward (125 files).

## FIX-R81-02 — MEDIUM — Phone slider's48px box has only a small active thumb

Root inspected NewDub CSS: overlaid native ranges use pointer-events:none, with16px thumbs restoring pointer events; the phone rule only raises the input box to48px. Original owner81 performed a separate read-only390×844 Chrome/CDP touch probe. Both thumb-center drags change values, while a drag20px below the thumb inside the48px box and a selected-track drag change neither boundary. Hit-grid samples identify only the small glyph region as the native input. See issue-81/phone-hit-probe/phone-hit-probe.json. The first instrumentation attempt was invalid and is preserved separately; the corrected result supports this finding. Numeric/keyboard exact1000ms validation remains intact.

Root authorized ONLY original81 to provide a real48px interaction area while retaining the16px visible glyph, two native keyboard/ARIA ranges, shared source domain,1ms precision, source/selection bounds and no automatic processing. Verify both boundary touch/drag controls at normal and close/minimum intervals, plus off-center input inside the actual target. A bounding-box-only check or removing pointer assertions does not resolve the issue. Native range and exact numeric field behavior must remain. No other product writer is active;63 holds its next focused test run pending this repair.

The previous125-file product snapshot is preserved byte-for-byte in root-product-source-freeze-before-phone-hit-fix.json. Its earlier307-unit/build/media/real-mode results describe that boundary. Root must freeze and verify the repaired product again and rerun appropriate checks before acceptance. No product acceptance, commit, push or issue closure has occurred.
