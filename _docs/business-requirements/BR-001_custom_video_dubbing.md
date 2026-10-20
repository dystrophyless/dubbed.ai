# BR-001: Turn a custom video into a self-performed dub

Status: draft
Revision: 0.2
Created: 2026-10-20 (Asia/Qyzylorda)
Owner: project owner (the requesting user)
Sources: [project brainstorm](../../brainstorm.md) and the owner's decisions in the originating chat
Approval: not approved; writing this draft does not constitute owner approval, implementation authorization, or product acceptance

## 1. Problem and job to be done

Casual users want to perform scenes from their favorite movies, shows, games, or other videos using their own voices. Preparing a custom video for dubbing can require finding dialogue, transcribing words, setting boundaries, identifying speakers, and assembling the final audio. That preparation gets in the way of the enjoyable activity: listening, performing, retrying, and sharing.

**Job to be done:** When I have a short video I want to dub for fun, help me prepare its performances automatically, record every character in manageable turns, and get a full video with my voices replacing the originals, without first becoming a video or audio editor.

The first version targets casual entertainment, not professional dubbing production, acting assessment, or automatic voice generation.

## 2. How it works today and evidence limits

The owner cited Voxalike and Choicer Voicer as related products and believes custom content in those experiences requires manual pack preparation or manipulation. This is an owner-reported understanding, not independently verified competitor research. No comparative usability study or measured preparation-time baseline exists.

The [brainstorm, sections 1–10](../../brainstorm.md#1-product-idea-and-motivation), records the product decisions. Its [research discussion](../../brainstorm.md#11-technical-research-and-proposed-pipeline) identifies candidate capabilities, but no representative video, processing cost, transcription accuracy, or browser-recording synchronization was tested. No working application is established by this document.

The business hypothesis is that removing most preparation effort makes custom dubbing accessible and enjoyable enough for casual users to finish and share a result. This hypothesis needs user evidence.

## 3. Proposed outcome and first useful increment

Deliver an account-based desktop/phone web experience accepting MP4/MOV/WebM originals up to 10 minutes and 250 MB, selecting at most two minutes for mixed English/Russian preparation, correcting lines, recording every character, and downloading/sharing the full selected-section dub. Provide English/Russian UI with a language switch.

The first useful increment is this complete journey, including resumable work, a realistic free trial, and understandable credit spending. A transcript-only tool, prepared clip library, or microphone demo would not deliver the intended business outcome.

Original timing and visual content remain intact. Recording turns define where performances are captured; they do not remove quiet sections or turn the result into a highlights compilation.

## 4. Business requirements

The IDs below are stable requirement references for future specifications. They describe intended user outcomes rather than prescribe a stack or implementation.

### Access and entry

| ID | Requirement | Source |
|---|---|---|
| BR-001-R01 | Support the full journey in desktop Chrome, Edge, Firefox and Safari, Android Chrome and iPhone Safari. Provide English/Russian UI with a language switch. Validate actual versions/device recording behavior before claiming support. | Owner follow-up, brainstorm §17 |
| BR-001-R02 | Public landing/example/120-credit welcome offer and Start dubbing; sign in before upload, land at New dub with saved-project navigation. Google plus email/password, verified-email registration completion, password-reset email and explicit ownership-verified linking to one account. Include confirmed account deletion disabling access/links and removing projects/recordings. | Owner follow-up, brainstorm §17 |
| BR-001-R03 | Target MP4/MOV/WebM originals up to 10 minutes and 250 MB. Select a section <=120 seconds inside the app before preparation; it defines project/export timeline and quoted duration. Transcribe English/Russian together; actual codec/boundary compatibility requires tests. | Owner follow-up, brainstorm §17 |

### Automatic preparation and user correction

| ID | Requirement | Source |
|---|---|---|
| BR-001-R04 | Automatically propose timed recording turns containing transcribed words and speaker labels. Include detected character laughter, screams, and gasps with descriptive captions, not just spoken dialogue. Detection completeness remains subject to validation and correction. | §§2, 4–5 |
| BR-001-R05 | Group connected same-speaker speech, splitting at clear pauses or speaker changes. Retain an uninterrupted 30-second speech as one take rather than forcing short chunks. Add small lead-in/ending margins; their amount is not yet defined. | §5 |
| BR-001-R06 | Provide a full-video subtitled preview with a selectable dialogue list highlighting the currently playing line. Let the user preview the processed background and decide whether its quality is acceptable before recording. | §4 |
| BR-001-R07 | Allow text/speaker edits, draggable start/end adjustments and Add missed line before/after recording. Text/labels preserve takes; timing changes require replacement before export while retaining the old take until a new one saves. | Owner follow-up, brainstorm §17 |
| BR-001-R08 | Reprocessing locks permanently after the first successfully saved take, not a failed attempt; deleting takes never unlocks. Before eligible reprocessing warn/confirm that successful replacement resets all prepared turns/manual edits/additions. Failure preserves old usable work; no general split/merge. | Owner follow-up, brainstorm §17 |
| BR-001-R09 | Keep overlapping character turns independent. Capture with full original reference and highlight the target. In review use saved takes for recorded characters and original voices for unrecorded characters, including overlap; user may preview imperfect isolation and continue if satisfied. Final export requires all turns recorded. | Owner follow-up, brainstorm §17 |

### Recording and result

| ID | Requirement | Source |
|---|---|---|
| BR-001-R10 | Guide recording turn by turn, with optional prior original audition; let users record as soon as microphone/reference readiness permits. | Owner follow-up, brainstorm §17 |
| BR-001-R11 | Immediate Record without countdown, hidden video, visible text and full original reference with independent volume. Window is a maximum: user can stop early with a valid shorter take; auto-stop at its end. Do not extend video/stretch performance; unused character time is silent over the background. | Owner follow-up, brainstorm §17 |
| BR-001-R12 | Stay on turn with Play my take/Retry/Next, no autoplay/advance, one durable current take. Preserve old take until replacement saves; retain recoverable interrupted audio for separate listening/acceptance/retry, never falsely report missing or failed audio as saved. | Owner follow-up, brainstorm §17 |
| BR-001-R13 | Review with video, one processed music/effects background, saved replacement voices and original voices for unrecorded characters. User may accept imperfect isolation after hearing it. Finished output intentionally retains no original dialogue. | Owner follow-up, brainstorm §17 |
| BR-001-R14 | Export the complete selected-section timeline including quiet scenes and aligned overlapping takes, up to 720p MP4 preserving orientation without upscaling or added subtitles. Do not extend/time-stretch for a long performance. | Owner follow-up, brainstorm §17 |
| BR-001-R15 | Watch/re-record/download/share a finished result only when every turn has a compatible saved take; adding a turn or changing its timing blocks export until recorded. Shorter valid takes remain eligible; still-zero-turn export behavior needs an explicit decision. | Owner follow-up, brainstorm §17 |

### Saved work and sharing

| ID | Requirement | Source |
|---|---|---|
| BR-001-R16 | Save projects and takes under the user's account so unfinished dubbing can resume later. Detailed save/restore, interruption, and device-conflict behavior must be specified. | §9 |
| BR-001-R17 | Two saved projects for free accounts; first successful credit purchase permanently unlocks ten. Occupy after upload validation before AI, retain failed-AI projects/slots until deletion, free slot on deletion with no processing refund. No inactivity expiry for current projects/takes. | Owner follow-up, brainstorm §17 |
| BR-001-R18 | Anonymous unlisted links, no gallery. Allow sharing off/on at the same link, retain previous finished output during replacement/failure, and switch only on eligible successful finish. Warn project deletion removes shared output and disables its link; account deletion disables all account links. | Owner follow-up, brainstorm §17 |

### Commercial experience

| ID | Requirement | Source |
|---|---|---|
| BR-001-R19 | Quote ceil(selected-section seconds) credits at one credit per second, covering transcript/speakers/timing/background; 12.4 seconds costs 13, 120 seconds costs 120. No surcharge for worker latency, internal retries, language mix or speaker/overlap complexity. | Owner follow-up, brainstorm §17 |
| BR-001-R20 | One included AI retry per project before the permanent first-save lock; later runs cost normal disclosed price without replenishing it. System failure/queued cancellation preserves allowance; successful replacement or running user cancellation consumes it. Corrections, recording/replay/reopen/download/share incur no extra preparation credits under declared limits. | Owner follow-up, brainstorm §17 |
| BR-001-R21 | Grant 120 one-time non-expiring welcome credits per eligible verified account; purchased credits also never expire. Sell one-time USD packs, no recurring/automatic purchases. Measure complete processing/retry/export/storage/sharing/payment costs before setting pack quantities/prices/margins. | Owner follow-up, brainstorm §17 |
| BR-001-R22 | Reserve quoted credits at authorized preparation start; settle delivered complete preparation before subjective approval, including successful no-dialogue output. System/required-background failure is free and preserves previous usable preparation. Allow queued free cancellation and running completed-stage-only charge shown before confirmation. Project deletion never refunds completed work; successful pending processing remains chargeable after deletion. Stage allocations/races/reservation expiry/reversals/account-deletion balance rules still need definition. | Owner follow-up, brainstorm §17 |

“Free” or “included” here means no additional preparation-credit charge under the agreed entitlement; it does not promise unlimited hosting, unlimited exports, or a finalized retention policy.

## 5. Behavioral flow

### Preconditions

- The user has a supported video within the defined upload limits and an account before upload.
- A project slot and sufficient credits are available before paid preparation starts. The slot is occupied after successful upload validation; exact codec/boundary validation still needs evidence.
- Microphone permission and a supported recording environment are needed before a take can succeed; exact browser recovery interactions belong in the specification.

### Main journey

1. The visitor understands the service and trial from the landing page and selects Start dubbing.
2. The user signs in, enters New dub, and selects/uploads a video.
3. Before preparation, the user sees its duration, exact credit cost, and whether their balance is sufficient. Buying credits and starting processing are separate user actions.
4. Preparation produces subtitles, speaker-labeled turns, timings/margins, and a playable processed background.
5. The user reviews the full video, checks subtitles/speakers/boundaries, previews background quality, corrects mistakes, and optionally uses an allowed AI retry.
6. The user starts dubbing and works through the turns. For a four-second turn, Record captures at most four seconds, allowing early Stop while original audio plays and video is hidden. Text remains visible.
7. After each take, the user can hear it in context, retry it, or continue. They may leave and resume saved work later.
8. After saving compatible takes for every turn, the user watches the complete dubbed result and can return to a turn to improve it.
9. The user downloads or shares the finished result. Its unlisted link follows the latest finished version.
10. From saved projects, the user resumes work or deletes a project after the shared-link consequence is explained.

### Important alternative and failure paths

| Situation | Intended business outcome / unresolved boundary |
|---|---|
| Insufficient credits | The user can buy a one-time pack without being enrolled in recurring billing. Preserving the upload/quote through purchase is a proposed interaction to finalize. |
| Saved-project limit reached | The user chooses what to delete rather than having the service silently discard a selected existing project. Two free/ten upgraded slots are confirmed; occupy after upload validation and free on deletion. |
| Wrong text, speaker, or clipped first word | Correct the affected text, assignment, or timeline boundary; whole-video reprocessing is not the only recovery option. |
| Entirely missed line after recording began | Manually add its time range/text/speaker and record it. Do not unlock whole-video reprocessing implicitly. |
| Bad grouping after recording began | No general split/merge tool was agreed; resolve the supported recovery behavior before claiming complete coverage. |
| Processed music/effects are imperfect | Let the user listen and decide whether to proceed; do not guarantee studio-quality removal for arbitrary content. |
| A replacement recording fails | Preserve the previous successful take. Define what counts as safely saved success during specification. |
| Processing fails because of the service | No preparation-credit consumption for the failed job. Delivered/no-turn success charges before approval; required-background failure does not. Queued cancellation is free; running cancellation charges completed stages. Stage allocations/races remain open. |
| Export fails or the user leaves during work | Preserve saved work as required by resumability; define exact recovery/status behavior before implementation. |
| A turn is unrecorded or an already recorded turn is edited | Require a valid saved take for every turn. Timing edits require replacement; text/label edits preserve validity. No final original-voice fallback or stretching. |
| Existing shared video is being revised | Keep the previous finished result available while a replacement renders or fails; switch only on eligible successful finish. |

## 6. Success signals and evidence

No measured baseline, target conversion rate, accuracy threshold, or cost-per-video figure exists. The following are measurement intentions, not observed results or invented launch thresholds.

| Signal | Baseline | Target / desired outcome | Measurement method |
|---|---|---|---|
| First successful dub | Unknown | A new user completes a supported project from upload to playable/downloadable/shared result; conversion threshold to be decided after pilot evidence. | Observe a representative first-use pilot and measure funnel completion/drop-off. |
| Preparation effort | Unknown | Automatic preparation removes most manual transcription/timing effort while corrections remain practical. No numeric reduction claimed. | Observe correction actions and time spent preparing versus recording; gather user feedback. |
| Preparation wait | Unmeasured | Owner target: about 60 seconds or less for a two-minute supported video. Timing start/end, upload inclusion, hardware, load, and percentile must be defined before it becomes an acceptance metric. | Time the complete preparation needed for subtitle/speaker/turn/background preview on representative inputs. |
| Audio usefulness | Unmeasured | Users can judge and accept the processed background and create a result they want to keep/share. No perfect-separation guarantee. | Listening tests covering speech, effects, music, overlap, and nonverbal sounds; record rejection/correction reasons. |
| Recording usability | Unmeasured | Users complete fixed-window takes and judge them in context on supported phone/desktop browsers. Synchronization tolerance is not selected. | End-to-end device tests and observed recording/retry sessions. |
| Credit predictability | No implemented billing | The shown quote governs the charge; included actions do not incur hidden preparation charges, and system failures are not charged. | Verify quoted versus actual credit changes and meaningful failure/retry scenarios. |
| Commercial sustainability | Unknown | A pack price covers measured processing, retries, exports, storage/sharing, payment overhead, and an owner-selected margin. Values pending. | Measure full cost per uploaded minute across easy/difficult content and expected usage before pricing. |
| Continued use | Unknown | Users can resume saved projects and may choose another dub or buy credits. No retention/purchase target claimed. | Observe project resumption, repeat preparation, and voluntary purchases during an agreed pilot. |

## 7. Scope and constraints

### Included

The end-to-end requirements R01–R22: account entry, custom-video preparation and corrections, all-character fixed-window recording, resumable projects, full-video results, unlisted sharing/downloads, duration-based credits and one-time packs, plus project-slot entitlements.

### Excluded from the selected first version

- Original uploads beyond 10 minutes/250 MB or preparing more than a selected two-minute section.
- Automatic translation, generated voices, or voice cloning as a substitute for the user's performance.
- Performance scoring and pitch/similarity assessment.
- A public gallery, discovery feed, or collaboration/social network.
- Mandatory isolated original per-character audio during recording.
- Multi-take history/comparison, continuous multi-turn recording mode, general-purpose video editing, or a full manual split/merge editor.
- Subscriptions, recurring purchases, and an automatically selected cash price.
- Guaranteed clean source separation or support for every possible uploaded video.

User-supplied movie/show/game examples do not establish content rights, permission policy, or an unrestricted publishing entitlement. These policies remain open for release planning; no legal conclusion is made here.

### Constraints

- Preserve confirmed later choices over superseded brainstorm alternatives: especially hidden video, no countdown, original reference audio, early Stop with automatic maximum-window stop, and one safe-replacement take.
- Keep product behavior independent of a particular speech model, framework, GPU, or vendor. Candidate tools in the brainstorm are research, not requirements.
- Preserve human performances and original video timing; automatic timing stretch/speed-fitting was not selected.
- Best-effort audio quality requires informed user preview, not a claim of universal technical accuracy.
- Preserve confirmed quantities and current-project retention. Cash pack prices, stage allocations, operational cleanup and quality/performance claims still require evidence.

## 8. Structured summary and data implications

- Change type: new product.
- Product context: casual custom-video dubbing through a browser.
- Core behavior: automatically prepare performances, let users correct and record them, then deliver the full dubbed video.
- Interaction principles: guided turn-by-turn performance, clear user control, simple correction access, predictable credits, and resumable work.
- Completion conditions: the agreed journey works on supported environments with appropriate evidence; business/product acceptance is separate from a green technical check. Open material decisions must be resolved for their dependent slices.
- Data implications: account-owned originals, preparation/corrections, current takes and progress, finished outputs, link associations, project-slot entitlements, credit grants/purchases/charges/returns. This is a list of business information to preserve, not a schema.
- Access implications: account work belongs to its owner; the intentionally shared finished output is accessible to link holders without sign-in. Sharing a result does not imply exposing account files or editing access.

## 9. Decisions, assumptions, and open questions

### Provenance of settled direction

| Item | Status and provenance | Effect |
|---|---|---|
| Casual audience; short English/Russian videos; desktop/phone | Explicit owner answers, brainstorm §§1–2 | Defines initial audience and supported journey. |
| Full-video preview and correction; add missing lines; AI retry locks after recording | Explicit owner answers, §§4–5 | Overrides the earlier no-manual-timing idea. |
| Hidden-video recording, no countdown, original audio, exact stop, one safely replaced take | Explicit later owner answers, §6 | Overrides visible-video/countdown/multi-take alternatives. |
| Full original timeline, all characters, separate overlapping turns | Explicit owner answers, §§5–7 | Not a compilation or one-character dubbing app. |
| Best-effort separation accepted through preview | Explicit owner answer, §4 | No mandatory perfect-background guarantee. |
| Sign-in, resume, project slots/upgrades, link behavior/deletion | Explicit owner answers, §§8–9 | Defines ownership and sharing direction. |
| Duration pricing, included retry, failure protection, trial coverage | Assistant proposal accepted in principle by 'Ok, do that', §10 | Later owner answers select 1 credit/second rounded up, 120 welcome credits and explicit retry/failure/cancel rules; USD prices remain evidence-dependent. |
| Credit packs only | Explicit owner answer, §10 | No subscription at launch; non-expiring purchased credits follows the selected proposal. |
| Separate Prepare/Record stages in one familiar workspace | Assistant recommendation used in discussion, §8 | Proposed information architecture, not final UI approval. |
| Casual usage occurs in bursts and automation drives completion | Business hypotheses, §§1, 10 | Validate through usage and pilot observation. |

### Decisions needed for dependent specification/implementation

The project owner decides product/commercial policy. Technical investigation supplies evidence, not silent policy substitutions. These blockers apply to affected work, not to every independent planning activity.

| ID | Open question / evidence needed | Decision owner | Blocks |
|---|---|---|---|
| OQ-01 | Resolved denomination/rounding/trial/non-expiry/USD/2-to-10 slots. Remaining: measured costs, pack quantities/USD prices/margins and payment methods. | Project owner informed by measurements | Commercial configuration, not reopening selected credit units/allowances. |
| OQ-02 | Delivery/failure/no-turn/retry/cancel/deletion charging is confirmed in R20/R22. Remaining: stage cost allocation/rounding, confirmation/completion races, reservation expiry, refunds/reversals and account-deletion balance/financial retention. | Owner plus technical proposal | Monetary edge cases and reversal lifecycle. |
| OQ-03 | 10-minute/250 MB original, <=120-second selection, MP4/MOV/WebM, MP4 <=720p/no upscale and slot lifecycle confirmed. Remaining: validated codec/byte/timebase boundaries and bounded rendering/sharing usage. | Technical evidence and owner | Compatibility/delivery evidence. |
| OQ-04 | All turns require valid saved takes for export; early-stopped shorter takes are valid. No final original fallback. Remaining: export of a still-zero-turn project; manually adding missed lines is supported. | Project owner | Zero-turn export edge only. |
| OQ-05 | Text/speaker edits preserve takes; timing edits require replacement, preserving old audio; first successful save permanently locks AI. General split/merge excluded. Remaining: technical revision/concurrency and recoverable interrupted-candidate UX/durability. | Implementer with owner review where behavior remains open | Safe recovery evidence. |
| OQ-06 | Retention until project/account deletion, account deletion at launch, same-token off/on, previous result during rerender/failure are confirmed. Remaining: intermediate/backup/old-export/CDN/URL-reader lifetimes and cleanup mechanics. | Owner plus operational evidence | Physical deletion/delivery guarantees. |
| OQ-07 | Actual model/overlap-original-speaker/nonverbal quality, margin/grouping parameters, full latency/cost and sync/acoustics. Target browser list is selected; precise supported versions need evidence. | Technical investigation; owner accepts tradeoffs | Feasibility/performance claims. |
| OQ-08 | Optional listening, independent reference volume, early Stop, white/gray/blue flat UI and EN/RU switch confirmed. Remaining: exact tokens/layout/readiness/save/recoverable-candidate controls with rendered/device checks. | Owner and design evidence | Detailed UX acceptance. |
| OQ-09 | Upload/content permission expectations, reporting/removal, abuse/trial controls, and applicable release obligations. No policy researched/adopted yet. | Project owner with appropriate evidence | Public release and operational policy. |

One credit per second rounded up and 120 welcome credits are now selected. A 200-credit balance, 0.5-second margin, 20/30 cancellation-stage split and unselected providers remain illustrative. See brainstorm §17 for later owner provenance.

## 10. Rollout and support considerations

Proposed evidence-led sequence, not an authorized task plan:

1. Validate representative English/Russian preparation and recording, including overlap, character sounds, music/effects, longer speeches, and phone/desktop timing.
2. Resolve the product decisions needed for specification; design the main journey without silently broadening scope.
3. Use a bounded pilot to observe completion, corrections, abandonment, audio acceptance, and full cost. Exact cohort size, thresholds, and release date are not selected.
4. Before public launch, establish pricing/limits, content and account policies, and understandable recovery/support for failed processing, missing credits, lost recording permission, project deletion, and broken share links.

Explain the two-minute scope, best-effort preparation, credit quote/included retry, project limits, and sharing/deletion consequences at the relevant user actions. Headphones can be recommended to reduce reference-audio pickup, but were not made mandatory. Do not promise untested latency, unlimited storage, or flawless audio.

## 11. Linked specifications

- [SPEC-001: Dubbed custom-video dubbing MVP](../specifications/SPEC-001_dubbed_mvp.md) — project-wide revision 0.5 synchronized with BR-001 revision 0.2; new independent review, remaining scoped decisions and whole-document approval are pending. Linking it does not approve either document or imply implementation tasks, issue publication, or an accepted release.

## 12. Source record

- [Brainstorm](../../brainstorm.md): complete decision history, examples, unselected alternatives, research links, and uncertainties. Sections 2–10 supply product direction; §§11–12 contain technical hypotheses/proposed evidence; §§13–14 preserve superseded choices and open questions.
- [BR authoring guide](../sdd/guides/business-requirements-guide.md) and [BR template](../sdd/templates/business-requirements.md): document structure, not additional product scope.

Approval of a future revision should record the approver, date, exact revision, and dispositions of material open decisions. Approval of this BR would establish intended business direction, not proof of implementation or deployed acceptance.

## 13. Follow-up synchronization record

Revision 0.2 incorporates the owner answers preserved in brainstorm §17 and SPEC-001/002 revision 0.5. Earlier open-question wording is superseded by those explicit answers; earlier review reports apply to their frozen inputs only. No implementation, executable product tests, issue publication, Git operations or paid calls occurred. Whole-document approval/readiness is not inferred.
