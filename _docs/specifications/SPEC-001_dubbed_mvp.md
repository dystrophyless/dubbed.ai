# SPEC-001: Dubbed — custom-video dubbing MVP

Status: draft
Revision: 0.5
Created: 2026-10-20 (Asia/Qyzylorda)
Owner: project owner (the requesting user)
Sources: [BR-001](../business-requirements/BR-001_custom_video_dubbing.md), revision 0.2; [brainstorm](../../brainstorm.md); originating owner decisions in this chat
Approval: not approved; neither BR approval nor specification approval is inferred from the request to write this document
Readiness: project-wide behavior draft; material decisions and feasibility evidence remain open in §15

## 1. Goal, authority, and terminology

Let casual users turn a custom short video into a complete self-performed dub through desktop and phone browsers. Automate preparation, retain approachable corrections, guide each recording, preserve work, and deliver a downloadable/shareable full video with predictable credit spending.

This specification covers the complete first-version product and shared contracts, not implementation task bodies. [BR-001](../business-requirements/BR-001_custom_video_dubbing.md) owns the problem and business direction. [The brainstorm](../../brainstorm.md) preserves provenance and superseded alternatives.

### 1.1 Contract status

- **Confirmed:** product behavior explicitly chosen in the chat or accepted in principle through the billing discussion. Described in §§3–5 and traced in §13.
- **Proposed design:** architecture, operations, state names, data boundaries, and consistency rules in §§6–10. These make the draft reviewable; they are not claims about existing code or independently approved technical decisions.
- **Open:** unresolved portions of D01–D13 in §15; D04/D05/D06/D13 product behavior is resolved. Do not substitute a guessed value or behavior. Related acceptance criteria remain blocked until resolved.

All requirements are intended contracts for this draft; none are evidence of implementation. A source conflict must be recorded and resolved. A later explicit user answer takes precedence over an earlier suggestion. In particular, video is hidden during recording and there is no countdown.

### 1.2 Vocabulary

| Term | Meaning |
|---|---|
| Source | Uploaded original video and its audio, with an canonical selected-section timeline. |
| Project | Account-owned source, preparation, corrections, takes, progress, and finished results. |
| Preparation | AI-assisted transcript, speaker labels, timed turns, and separated background preview. |
| Turn | One character's recording unit; may contain speech or a nonverbal performance. |
| Performance interval | The detected/edited content positions within the source timeline. |
| Recording window | Performance interval plus bounded margins, maximum capture interval; shorter performances are allowed. |
| Speaker | A project-local voice label; not verified actor/character/face recognition. |
| Take | A user's microphone recording for one turn/window revision. |
| Background | Processed music/effects with original character voices removed as well as separation permits. |
| Finished result | A completed export of a particular project revision, distinct from pending edits. |
| Share link | Unlisted public viewing capability for the project's current shared finished result. |
| Preparation attempt | One user-authorized initial processing or reprocessing request. Internal worker retries are not new billable attempts. |

## 2. Scope and current repository state

### 2.1 Included

- Account entry and free-credit grant; public landing and signed-in New dub entry.
- MP4/MOV/WebM uploads up to 10 minutes and 250 MB, with a selected section up to two minutes; mixed English/Russian preparation.
- Full-video subtitled review; automatic speakers, timing, turn grouping, and background separation.
- Text/speaker corrections, draggable window boundaries, and manually adding a missed line.
- Overlapping character turns and detected laughter/screams/gasps.
- Fixed-window recording with original reference audio and hidden video, one safely replaceable take per turn.
- Resumable projects, completed full-video playback, re-recording, download, unlisted sharing.
- Duration-priced credits, one included preparation retry, non-expiring purchased packs, and project-slot upgrade after first purchase.
- Shared ownership, consistency, error recovery, evidence, and integration conditions needed for that journey.

### 2.2 Excluded

Processing more than the selected two-minute section, automatic translation, generated/cloned replacement voices, performance scores, public gallery/discovery, collaboration, mandatory isolated per-character reference audio during capture, multi-take libraries, continuous multi-turn recording, full split/merge/video editing, subscriptions, automatic purchases, and guaranteed perfect separation for every video.

English/Russian interface localization, MP4 output and retention until project/account deletion are selected. No watermark policy, payment provider or exact cash price is selected implicitly.

### 2.3 Verified current state and reuse

At drafting, the root contains workflow/configuration/documentation directories, README/AGENTS/changelog, and `brainstorm.md`. Semantic search for application upload/recording/billing returned documentation. No implementation exists in the inspected workspace; no product entry points, models, runtime configuration, build commands, application tests, deployed environment, or Git remote were established.

Reuse the [workflow guides](../sdd/README.md), [Ponytail](../../.agents/skills/ponytail/SKILL.md), [spec/task review](../../.agents/skills/spec-task-review/SKILL.md), [package review](../../.agents/skills/task-package-review-loop/SKILL.md), BR, and brainstorm. Preserve their source decisions. Do not import Pin code or product scope.

The owner-selected application stack is recorded in §6.1. Architecture below names responsibilities, not existing files or APIs; media/AI model selection still requires D10 evidence. This document does not authorize implementation, paid processing, issue publication, commits, or deployment.

## 3. Product entry points and navigation

### 3.1 Public and account entry

The landing page explains custom dubbing, shows an example and the 120-credit welcome offer, and offers Start dubbing. Sign-in precedes uploading. Provide Google and email/password sign-in, verified-email completion of password registration, password-reset email and explicit ownership-verified linking of login methods to one account/balance/library/grant. After sign-in enter New dub; expose My projects through navigation. Launch includes confirmed account deletion, disabling access and links and removing projects/recordings; financial/backup retention and balance treatment remain D03/D08/D11. Provide English/Russian UI and a language switch. Public viewers need no account.

Proposed route responsibilities, not finalized URLs or wireframes:

| Area | User-visible responsibility |
|---|---|
| Landing / sign-in | Explain value/trial; establish account identity. |
| New dub | Select/upload source, understand limits, project capacity, and preparation quote. |
| Processing | Show real job progress/state and a recoverable failure, without representing incomplete preparation as ready. |
| Prepare | Full-video subtitles, highlighted selectable line list, background audition, corrections, allowed AI retry, Start dubbing. |
| Record | Current turn/reference audition, active take, review/retry/next, correction access. |
| Result | Full completed playback, return to a turn, export/download/share. |
| My projects | Find and resume account work; show honest preparation/recording/export state; delete chosen projects. |
| Credits / account | Balance, packs, grants/spend/returns, purchase status and project allowance. |
| Shared result | Public viewing of the associated finished output only; no account editing or raw-asset access. |

Separate Prepare and Record stages with a familiar shared workspace are the proposed information architecture. Desktop side-by-side preview/list and phone stacked preview/list are suggestions, not approved geometry. Do not add a countdown or visible video during an active take when implementing a layout.

## 4. Confirmed functional contracts

### 4.1 Upload and quote

Sign in before uploading. Target MP4, MOV and WebM containers, a maximum original duration of 10 minutes and file size of 250 MB. Validate actual content/codecs. For longer sources, provide in-app selection of a section no longer than two minutes before preparation. That selected section becomes the canonical project timeline; preserve its original offset mapping. Quote only its duration. Do not process or export the entire longer upload by implication.

Target desktop Chrome/Edge/Firefox/Safari, Android Chrome and iPhone Safari for the full journey. Transcribe mixed English/Russian speech within one section. Exact browser versions, codec support, byte/timebase edge handling and actual device reliability require D01/D10 evidence.

Before preparation show selected duration, exact credit cost, available balance, included-retry eligibility and project capacity. Buying a pack and starting preparation are separate explicit actions. Full capacity lets the user choose a project to delete. A slot is occupied after upload validation succeeds, before AI; failed AI keeps the resumable project and its slot. Free accounts have two slots; first successful purchase permanently upgrades to ten.

Bind each quote to validated selected-source identity/duration and pricing-policy revision. Changed selection/expired or changed quote requires renewed confirmation, not a hidden price increase. Preserve source/selection context through checkout. Exact normalization/selection mechanics and remaining commercial policies stay explicit under D01–D04.

### 4.2 Preparation and segmentation

Prepare transcript words, speakers, turn positions, and playable background. Include detected character laughter/screams/gasps with captions. Do not claim a label repair recovers words never transcribed.

Group connected same-speaker speech, split at clear pauses or speaker changes, and retain a continuous 30-second speech as one turn. Do not segment simply at every punctuation mark. For overlap, retain independent turns with overlapping intervals; a single chronological list must not flatten simultaneous content into false exclusivity.

Provide small leading/trailing margins within source bounds. Exact margin/pause rules and detection evidence remain D10; 0.5 seconds is illustrative. Successful zero-dialogue detection is chargeable and permits manual line addition. Complete background-separation failure makes preparation fail without charge even if transcription succeeded; preserve the prior usable revision. Invalid artifacts cannot be activated.

Model outputs are proposals until validated and activated. Keep machine output distinguishable from user corrections. Reprocessing cannot silently overwrite a current reviewed preparation before a valid new revision is available.

Before eligible reprocessing, warn and obtain confirmation that successful replacement resets all prepared turns and manual text/speaker/timing corrections, including added turns (D13 resolved). Failure leaves the old preparation/edits active. Bind consent and activation to the expected edit revision; concurrent edits require reconciliation/new consent rather than silent loss. Charge settlement follows §4.7, not subjective preview approval.

### 4.3 Preview and correction

Play the full source with subtitles and highlight currently active lines in a selectable dialogue list; overlapping lines can both be active. Allow audition of the background before dubbing. Users decide whether separation quality is acceptable; faint residual dialogue/artifacts are a known possibility, not additional intended original-dialogue mixing.

Edit text, assign speakers, drag start/end edges on a preview timeline, or add a missed turn with timing/text/speaker. Corrections are possible after recording begins. General split/merge is not launch scope. A missed `Come back!` must be addable even after five other takes are saved.

Whole-selected-section AI reprocessing is available only until the first take is successfully saved. Failed capture/save does not lock it. Once set, the project lock persists even after deleting all takes; no delete-all-and-reprocess action. One included retry per project; further runs use the normal disclosed preparation quote, never replenish the included retry, and remain subject to the permanent lock. Enforce the guard authoritatively, including concurrent recording/processing commands.

Text or speaker-label edits without timing changes keep saved takes valid. Changing start/end invalidates the affected take for export and requires a new take, retaining the old recording until durable replacement. Added turns require their own takes. Preserve captured window/revisions; stale completions cannot silently attach to changed timing. General split/merge remains excluded; after lock use supported manual corrections/addition, not AI reset.

### 4.4 Recording

Original listening/viewing before recording is optional. Once microphone/reference readiness is established, Record starts immediately without countdown, plays full original audio, hides video and leaves target text visible. Reference volume is adjustable independently of saved microphone gain. The recording window is a maximum: provide early Stop and allow shorter valid takes; auto-stop at the window end including margins. A shorter take leaves that character silent for the unused remainder, with background/other characters continuing.

For window `[3,7]`, local recording time runs `[0,4]`; a five-second performance does not extend the source or trigger automatic speed-fitting. Implementation tolerances, output trimming/padding for capture latency, reference readiness and synchronization recovery must be tested and specified under D10. Readiness handling must not fabricate a completed take when microphone access is denied or playback cannot start.

For overlapping characters, show/highlight only the current character's line during recording while the full original audio remains audible. Capture separate takes and later combine them at their source positions.

After recording stay on the turn with Play my take, Retry and Next, without automatic playback/navigation. Review shows video and one background, with saved takes replacing their corresponding original voices. Retain original voices for characters without saved takes; when A is recorded and B is not, play A plus original B. When B is saved, use both takes. This requires original-speaker isolation for overlap preview; validate it under D10. Users may preview imperfect isolation and continue if acceptable. Final export requires all turns and has no intentional original-dialogue fallback.

One current successful take per turn. Keep it through a retry until a replacement is durably successful; failed capture/upload or an unaccepted interrupted candidate must not erase it. Successful means the media and its authoritative association are available for resume/export, not merely that the browser stopped recording. Temporary upload/capture artifacts are not a multi-take library.

Play my take targets the durable current saved take; while replacement is saving/failed, keep that labeled target or disable if none exists. A recoverable interrupted attempt can be auditioned separately and retried or accepted as a shorter take through safe persistence; it is not silently the current saved take. Preserve the old take until the accepted compatible replacement commits. After commit the next explicit playback uses it, without switching active playback/autoplay. Starting capture stops existing take playback. Recovery controls/durability need technical design; never manufacture recoverable audio after actual device/media loss.

### 4.5 Full result and sharing

Preserve source images, duration, timeline, pauses, and scenes outside turns. Mix current eligible takes at their original positions over a continuous processed background. Do not duplicate background by mixing separate per-turn background copies. Avoid intentionally including original character speech/nonverbal voice under new takes; separation remnants remain subject to the accepted preview quality.

Let users watch the completed selected-section timeline, revisit/re-record, download MP4 and create an unlisted link. Target up to 720p while preserving orientation and avoiding upscaling. Add no output subtitles; burned-in source captions are unchanged. Require a compatible saved take for every turn, including newly added or timing-invalidated turns. No incomplete export or original-voice fallback. Still-zero-turn export behavior remains D07; manual addition is supported.

Anyone with a link can watch without sign-in; no gallery. The same link follows the latest finished output, not an unfinished edit. Confirmed publication behavior: keep the prior finished result while replacement renders; atomically switch only to a validated playable result for the current requested revision. Owners can disable sharing without deleting and re-enable the same token. Define technical generation ordering and revocation/cache behavior under D08 so a late old render cannot undo the latest result.

Deleting a project removes its shared video too, after a warning that the link will stop working. Logical access removal and physical storage/backup erasure are distinct; exact retention/expiry guarantees are D08. Do not claim deletion retracts copies already downloaded.

### 4.6 Projects and resumption

Save account-owned source, current preparation/corrections, takes, progress, and finished result associations. My projects supports returning to the authoritative saved state rather than only browser-memory state. Show an unsaved/pending operation honestly; never promise an in-flight take is safe solely because a save animation completed locally.

Free accounts have two saved-project slots; the first successful credit purchase permanently increases capacity to ten. Occupy a slot after upload validation and before AI. Failed preparation retains its resumable project/slot until deletion. Deletion frees capacity but does not refund completed processing. Retain current projects/takes until project/account deletion, with no inactivity expiry. Superseded/intermediate/backup/cache lifetimes and purchase-reversal effects remain D03/D08.

### 4.7 Credits, packs, and payments

Preparation costs one credit per second of the selected section, rounded up once: `ceil(selectedDurationSeconds)`. Thus 12.4 seconds costs 13 credits and 120 seconds costs 120. Charge entire selected duration, not speech duration, latency, speaker count, language mix or overlap complexity. Cover dialogue preparation and background separation in one fixed upfront quote. Each eligible new verified account gets 120 one-time non-expiring welcome credits. Purchased credits also do not expire. Sell one-time packs in USD, with no subscriptions, automatic purchases or periodic trial replenishment. Measure full processing/retry/export/storage/delivery/payment costs before selecting pack quantities, USD prices and margins (D02).

Manual corrections, performance retries, take replay, and reopening a prepared project have no preparation-credit charge. Download/share creation are included within declared limits, not a promise of unlimited hosting/rendering.

Reserve the quote when the user authorizes processing and settle once complete preparation is delivered, before subjective user approval. Dissatisfaction is not failure/refund. System failure, including absent required background, releases the reservation and preserves previous preparation. Successful no-dialogue processing is delivered and charged; manual addition remains available. One included retry per project is consumed by successful replacement or deliberate user cancellation after it starts; system failure or queued cancellation preserves it. Later paid reprocessing uses the normal quote and grants no additional included retry.

Proposed consistency invariants: one account trial grant per eligible account, one credited pack per verified successful purchase, one permanent first-purchase upgrade, and at most one reservation/settlement for the same authorized attempt. Use server-verified payment identity/amount/currency; a browser redirect or client claim is not purchase proof. Payment duplicate/out-of-order delivery and pending/failed purchase must not create credit or slots twice. Trial abuse/cross-account policy remains D11.

Allow cancellation: queued costs zero; once running, only fully completed stages are charged, with the cancellation cost shown before confirmation. Incomplete-stage elapsed work is not charged. The 20/30-stage split is illustrative, not policy; measured stage allocation, integer rounding and confirmation/completion races remain D03. Deleting a project during processing does not cancel/refund it: successful completion remains chargeable but cannot restore access/publication. Deletion never refunds completed processing. Reconcile billing at account level after project deletion. Reservation expiry, purchase reversal and account-deletion unused-balance treatment remain open. Preserve quote/reserve/settle/return provenance; concurrent reservations cannot overspend.

## 5. Canonical timing and media invariants

Proposed common timeline contract, independent of chosen tools:

1. Every accepted media revision refers to a canonical source timeline of duration `D`. Specify normalization and timebase before implementation; browser, worker and export timestamps must use the same mapping.
2. Valid performance/window ranges satisfy `0 <= start < end <= D`. Preserve precision sufficient for the chosen synchronization tolerance; units/precision are technical decisions, not arbitrary UI rounding.
3. A take's local time zero maps to its recording-window start, not automatically to its first spoken word. Store the exact window and preparation/turn revisions it references.
4. Margin windows may overlap even when spoken lines do not. Preserve each take's relative timing; a collision is not permission to shift words or truncate another character. Treatment of mic noise in margins/gain is D10.
5. Turns for simultaneous characters are independent; no exclusive-speaker representation may erase an intended overlap.
6. Original playback is reference audio during capture, not an audio source intentionally included in the microphone take or final mix. Test physical playback leakage; headphones are a recommendation, not a confirmed mandatory restriction.
7. Do not generate missing character speech to conceal an omitted turn. Do not time-stretch a user performance or extend video without a new owner decision.
8. Subtitle edits are text, not executable instructions. Validate captions/model output and reject invalid timing/media references before exposing them as an active preparation.
9. A completed export is bound to immutable input revisions. Project edits do not retroactively change the bytes/provenance of an earlier finished asset.

## 6. Proposed architecture and responsibility boundaries

### 6.1 Selected application stack

Owner decision recorded on 2026-10-20: use React and Zustand for the frontend, and FastAPI, PostgreSQL and SQLAlchemy for the backend. The instruction explicitly prohibits writing code yet. This records the intended implementation stack, not approval of the entire specification or evidence of installed dependencies.

| Layer | Selected technology | Responsibility |
|---|---|---|
| Frontend UI | React | Browser screens, shared components and interaction rendering. |
| Frontend application state | Zustand | Shared client-side application state; not a replacement for backend authority or the centralized services boundary. |
| Backend API | FastAPI | Backend API and application entry points consumed through frontend services. |
| Relational persistence | PostgreSQL | Durable relational application data. Media/blob storage remains a separate unselected infrastructure decision. |
| Backend ORM / data access | SQLAlchemy | Backend mapping and data access for PostgreSQL; exact schemas and transaction/session boundaries remain to be designed. |

Retain the frontend's centralized services facade and interchangeable mock adapter in [SPEC-002](SPEC-002_frontend.md). React components and Zustand state/actions must not bypass that boundary to call backend APIs. Frontend-only mock mode must still run without starting FastAPI or PostgreSQL.

Versions, frontend build/router/test tooling, backend database driver and sync/async session approach, migration tooling, worker/queue infrastructure, media storage, hosting and payment integration are not selected by this decision. Do not infer them from the named libraries.

### 6.2 Logical responsibilities

These are logical responsibilities implemented within the selected stack; they do not require separate microservices. No architecture pattern is imported from Pin as a mandatory product choice.

| Responsibility | Owns | Must not decide implicitly |
|---|---|---|
| Browser experience | Preview, corrections, microphone capture, local readiness, progress, explicit user commands | Authoritative balance, payment success, ownership, or job completion. |
| Identity/access | Account/session and owner authorization; public-share capability checks | Viewer editing access or public access to source/takes. |
| Project/media coordination | Source identity, project revisions, prepared-turn/correction references, current takes, export inputs, deletion state | Unresolved take invalidation or incomplete-export policy. |
| Processing workers/adapters | Media inspection, transcription/alignment, speakers, background/voice separation, detected character sounds | Pricing, account grants, or accepting arbitrary model output as authoritative. |
| Recording persistence | Candidate media validation and current-take replacement against the captured revision | Replacing a take after a stale recording or declaring failed uploads successful. |
| Credits/purchases | Quote, reservation, settlement/release, pack receipts, balance/slot entitlements | Trusting client purchase assertions or billing internal retries as new attempts. |
| Export/publication | Full timeline render, validated result, current share-target switch | Publishing partial/stale/deleted project output. |
| Storage/job execution | Durable assets, work delivery/retry and cleanup | Creating a second product truth from a queue message or storage listing. |

Candidate tools in the brainstorm (WhisperX, pyannote, BandIt, FFmpeg, SpeechBrain) remain candidates. Exact selection, licensing/operating review, versioning, hardware and per-stage quality/cost tests belong to D10/D11. This specification makes no current API claims and selects no vendor.

## 7. Logical records and cross-boundary messages

These records specify necessary information and ownership, not database tables or a complete schema.

| Record | Required logical information |
|---|---|
| Account | Stable identity, eligibility/grant provenance, current slot entitlement. |
| Project | Owner, source identity/revision/duration, lifecycle/deletion state, preparation/current edit revision, recording-lock history, progress, finished-result/share associations. |
| Source/asset | Owner/project association, type, validated media properties, duration/timebase mapping, identity/checksum, durable readiness and lifecycle. |
| Preparation attempt/revision | Attempt identity, requested source/pricing/authorization revisions, initial/included/additional retry classification, job/stage state, validated artifacts, error and completion evidence. |
| Turn/speaker/correction | Stable turn identity, text or sound caption, speaker label, source/window positions, origin machine/manual, revision and correction provenance. |
| Take candidate/current take | Project/turn identity and revision, captured window, ready media/duration, upload state, current-association revision; previous current take retained until safe replacement. |
| Export/result | Request identity, frozen inputs/current-take mapping/background/source versions, status, media validation, finished asset, publication generation. |
| Quote/credit operation | Account/source/duration/policy identity, exact amount, authorization, attempt/purchase identity, reservation/terminal state and reconciliable accounting history. |
| Share | Project, non-guessable capability, active/inactive state and current finished-result generation; cache/revocation policy pending. |

Proposed operation envelope: operation ID, authenticated actor/authority, project/account identity, expected revision, input asset identities, quoted policy where relevant, and result/error identity. A result identifies actual authoritative state or a pending operation, never an invented success.

Work messages carry immutable input revision and attempt identity. Completion messages must be checked against current project/deletion/attempt state before publication or settlement. Exact HTTP paths, event schemas, numeric units, database keys and transaction mechanisms are not allocated here; define them consistently in the implementation architecture before related tasks execute (D12).

## 8. Proposed state and concurrency contracts

Independent state dimensions are needed; a project may have saved takes and a previous export while a replacement is running. One flat progress string must not discard that information.

| Dimension | Proposed states / transitions | Guard |
|---|---|---|
| Upload/source | uploading -> inspecting -> usable, or failed | Incomplete/unvalidated media is not AI-ready; source identity cannot change under an existing quote. |
| Preparation attempt | requested -> queued -> running -> validating -> ready, or failed | Ready requires complete validated preview contract under D03/D10; internal delivery retry preserves attempt identity. |
| Recording candidate | ready -> capturing -> saving/validating -> saved, or failed/interrupted | Current take changes only at durable successful association for the expected turn revision. |
| Export | requested -> rendering -> validating -> finished, or failed/stale | Frozen input snapshot; stale completion is not the latest shared generation. |
| Credit reservation | reserved -> settled OR released | One terminal settlement/release per reservation; retries reconcile current truth. Post-settlement refunds, if allowed, are separate policy-controlled entries. |
| Purchase | pending -> verified successful / failed | Credit grant and first-purchase upgrade only once per verified purchase; reversal policy D03. |
| Project deletion | active -> deletion requested -> inaccessible -> cleanup completed | Workers/publication cannot revive access; physical erasure timetable D08. |

State names are proposed. Cancellation follows §4.7; its stage allocation and race mechanics remain D03/D08; do not treat a cancellation request as proof that worker activity, delivery, or storage has stopped.

### 8.1 Revision and duplicate-operation rules

- A replay of an identical authorized operation returns/reconciles its existing outcome; it does not spend twice, grant twice, create duplicate turns, or publish twice. Reusing an operation identity with different inputs is a conflict.
- A retry of a user take is a new candidate, not permission to discard the old current take at capture start.
- Detect stale edits/recording completion from another tab/device using expected revisions or equivalent protection. Return a recoverable conflict; do not silently overwrite unrelated newer work.
- Before recording begins, a processing change and a recording start must not race into an inconsistent preparation. The first successfully saved take sets a permanent reprocessing lock; define compatible concurrent commands under D12; apply one authoritative guard for both.
- Partial queue/payment/storage success is reconciled by stable identity and durable records. API timeouts must not cause blind duplicate monetary or destructive actions.
- Model/worker callbacks after deletion or superseded preparation/export cannot resurrect a project, expose files, replace newer output, or cause a second settlement.
- A payment that really succeeded must remain reconcilable even if the browser closes; a project job failure must not roll back an unrelated credit purchase.

## 9. Failure, recovery, access, and observability

| Condition | Required protection / draft disposition |
|---|---|
| Unsupported/corrupt/oversize/no-audio source | Reject safely with a recoverable explanation. Exact accepted-media and billing boundaries remain D01/D03. |
| Invalid model timestamps, absent speaker, unusable stage output | Do not activate malformed references or mark complete from provider transport success. Preserve the existing usable revision on failed retry. D10 defines acceptable output/empty cases. |
| Queued job, timeout, worker crash or duplicate completion | Show truthful pending/failure state, reconcile attempt/reservation, resume/retry safely without duplicate charge. |
| Mic denied/unavailable, playback unavailable, browser interruption | Explain inability to record; do not save a false successful take. Preserve old current take and prior saved project. |
| Candidate upload completed but association failed | Reconcile operation before retry; previous current take remains until the candidate is valid and committed. |
| Source/turn changed during capture | Keep candidate identifiable; do not attach to incompatible current timing without D06 handling. |
| Export failure/stale success | Keep saved takes; do not publish partial/stale media. Automatic retry limits/export eligibility are D07/D08. |
| Credit settlement uncertain | Reconcile one authoritative ledger/attempt state; don't both settle and release or retry against an invented balance. |
| Project deleted while jobs/uploads/export run | Disable project access/publication authoritatively; reject late association and schedule orphan cleanup according to D08. |
| Lost connection, expired session, duplicate tab | Restore from server-owned saved state; require authentication for owner actions and resolve revision conflicts rather than implying unsaved work persisted. |

Every owner operation checks account/project/asset authorization on the server. Owner and public-share access checks deny disabled accounts immediately before physical cleanup finishes. A share grants only access to its associated finished output, not project details, raw source, takes, billing, editing, or other projects. Use an unguessable capability or equivalent and avoid public bucket enumeration. Google/password sign-in, verified registration, linking/reset and account deletion are selected (§3.1); session/security mechanics, cache/financial/backup retention and abuse/content policy remain D03/D08/D11/D12.

Treat uploaded media and model text as untrusted. Bound decoding/processing resources, validate file content rather than filename alone, and escape user/model captions on rendering. Do not place credentials, private audio, transcripts, or signed-media URLs in public error/analytics output. Exact tooling and retention policies remain implementation decisions, not permission to omit boundary validation.

Record operation/attempt IDs, stage durations, input/output revisions, failure categories, balance transitions, purchase reconciliation, and export/share generation changes. Evidence must support why a job was charged/returned and which revision a result contains. Logs are diagnostic records, not a second authoritative backlog or public transcript repository.

## 10. Data lifecycle, compatibility, and delivery operations

No existing product schema/data migration is present. Introduce versioned migrations only after D12 architecture is selected. Proposed compatibility rules: deployed clients/workers must interpret the same timeline units/revision fields; jobs refer to immutable inputs and remain valid or explicitly fail with recorded recovery after a processing-version change.

Changes to pricing or policies apply through recorded revisions. Do not reinterpret historic quotes/settlements at new rates, silently expire purchased balances, or discard permanent slot upgrades. Policy for purchase reversals remains open.

Deletion must prevent fresh project/link access and late publication while cleanup processes originals, takes, prepared assets and results under a declared policy. Backup/CDN/external-copy limitations must be stated accurately (D08). Monetary history may need separate retention from deletable media; no legal duration is selected.

Before deployment, define backup/recovery, migration rollback, old/new-worker compatibility, secret management, limits and failure monitoring. Rollback must preserve monetary records and saved media associations rather than pretending user writes or confirmed payments never happened. No production mutation or deployment is authorized by this plan.

## 11. Project-level acceptance criteria

All criteria below are unexecuted. D01–D13 references point to the current register; only unresolved portions denote missing decisions/evidence; a blocked criterion must not be reported passing because a placeholder value or mock worked. D12 is partially resolved by the application stack selection in §6.1; its remaining architecture choices are still open.

- [ ] **AC-01 Entry and ownership:** Google/password registration, email verification, reset and explicit verified linking preserve one account/library/balance/grant; bilingual navigation and owner authorization work on target browsers. Confirmed account deletion disables access/links and removes work.
- [ ] **AC-02 Supported upload:** MP4/MOV/WebM originals up to 10 minutes/250 MB permit selecting at most 120 seconds; quote and canonical timeline refer to that section. Mixed EN/RU works; test boundaries/codecs and reject invalid input safely.
- [ ] **AC-03 Preparation coverage:** representative speech, speaker turns, overlapping characters and detected laughter/screams/gasps produce valid timed/captioned turns and auditionable background; empty/partial cases follow D03/D10 rather than falsely passing.
- [ ] **AC-04 Segmentation:** same-speaker connected sentences and an uninterrupted 30-second speech remain intact; clear pause/speaker boundaries and bounded margins follow the D10 rule, retaining simultaneous turns.
- [ ] **AC-05 Preview:** full-video subtitles and dialogue list track current playback including overlap; users can audition background before starting dubbing, without being promised perfect separation.
- [ ] **AC-06 Correction:** users edit text/speaker, drag a valid time range, and add an entirely missed turn before and after saved takes; invalid ranges are rejected and D06 take-compatibility handling preserves work.
- [ ] **AC-07 Reprocessing:** first successful take save permanently locks AI reset; failed first attempts do not, nor does later take deletion unlock. Pre-recording replacement warns/confirms reset of all turns/manual edits; failure/concurrent edits preserve current work.
- [ ] **AC-08 Bounded capture:** immediate/no-countdown hidden-video capture with target text, full original reference and independent volume; optional prior audition, early stop/short takes and auto-stop at maximum window within measured tolerance.
- [ ] **AC-09 Review:** explicit Play my take/Retry/Next; use saved overlapping takes and original voices for unrecorded characters with one background. Allow audition/acceptance of imperfect isolation; label prior durable take during replacement and audition recoverable candidates separately.
- [ ] **AC-10 Safe replacement:** retain previous take on failed/stale/unaccepted interrupted replacement; recoverable shorter attempts can be reviewed and safely saved without exceeding the window. Timing edits require re-recording; text/label edits preserve eligibility.
- [ ] **AC-11 Complete mix:** preserve full selected-section video/timeline/pauses and aligned overlapping takes with one background and no intentional original dialogue or stretching. MP4 up to 720p, preserved orientation/no upscaling, no added subtitles.
- [ ] **AC-12 Export eligibility:** every turn has a compatible durable saved take; newly added/timing-changed turns block export until recorded. Shorter valid takes do not make a project incomplete. Still-zero-turn export follows explicit D07 resolution.
- [ ] **AC-13 Resume:** saved preparation, corrections, takes and progress restore after browser close/sign-in; in-flight failure and competing-tab scenarios do not misrepresent unsaved state as safe.
- [ ] **AC-14 Project allowance:** two free slots, ten permanently after first purchase; occupy after upload validation, retain failed-preparation projects until deletion, free on deletion. No inactivity expiry or processing refund on deletion.
- [ ] **AC-15 Public sharing:** a link works without sign-in, exposes only the intended finished video, is not listed in a gallery, and cannot disclose source/takes/account data.
- [ ] **AC-16 Sharing versions:** disable/re-enable the same link; retain prior finished result during replacement/failure and switch only on eligible successful completion, fencing late/stale/deleted output.
- [ ] **AC-17 Deletion:** after warning and confirmation, a project and its link become unavailable as defined by D08; running/late jobs cannot restore them, and cleanup meets the declared retention/cache contract.
- [ ] **AC-18 Upfront quote:** ceil(selected duration in seconds) at one credit/second, without complexity/runtime surcharges; 12.4 seconds costs 13 and 120 costs 120. Changed source/quote requires renewed consent.
- [ ] **AC-19 Accounting safety:** no duplicate/negative spending; delivery charges before subjective approval, zero-turn success charges, required-background/system failure does not. Queued cancellation is free; running cancellation charges completed stages at disclosed cost. Successful processing after project deletion still settles without resurrection.
- [ ] **AC-20 Included use:** exactly one included retry per project; failure/queued cancellation preserves it, running user cancellation consumes it. Additional eligible runs use normal quote without replenishment. Manual correction/recording/replay/reopen/download/share carry no extra preparation charge under declared limits.
- [ ] **AC-21 Trial:** exactly 120 non-expiring one-time welcome credits per eligible verified account, with no duplicate grant from callback/link/replay; maximum 120-second preparation plus its one included retry is covered.
- [ ] **AC-22 Packs:** verified one-time purchases credit the correct account/amount once, unlock slots once, and purchased credits do not expire. Pending/failed/forged/replayed callbacks and D03 reversals obey the chosen policy; no recurring/automatic purchase is created.
- [ ] **AC-23 Media-job safety:** invalid model/media output, stage crashes, duplicate/stale callbacks, expired auth and project deletion cannot expose private assets, replace newer revisions, resurrect work or silently double-charge.
- [ ] **AC-24 Performance evidence:** measure all stages needed for a usable preview against the approximately 60-second/two-minute target, under D10-defined timing/load/hardware conditions; report measured quality, correction burden, and cost without claiming an untested SLA.
- [ ] **AC-25 Integrated journey:** a representative eligible user completes trial upload -> preview/correction -> record/retry -> interruption/resume -> finished result -> download/share -> re-record/latest link -> deletion, with compatible revision and credit evidence across the whole journey.

## 12. Verification plan and evidence boundaries

No test commands exist yet; the checks below are proposed scenarios, not executed results. Record actual command/scenario, environment/device, source/model/worker version, project revision, isolated data, expected/actual result, and limitations. Use owned or appropriately permitted fixtures and a payment test environment; no paid/live calls are implied by this specification request.

| AC | Required scenario/check | Expected proof and environment |
|---|---|---|
| AC-01 | Landing/sign-in/New dub and cross-account/anonymous mutations | Browser evidence plus server authorization checks; supported phone/desktop matrix. |
| AC-02 | Valid EN/RU sources, duration edges, corrupt/no-audio/unsupported/oversize media | Exact D01 validation result, source mapping and D03 quote/charge outcome in isolated media pipeline. |
| AC-03 | Dialogue, overlap, vocal sounds, empty and stage-partial outputs | Human-annotated source comparison plus validated preview assets; real candidate pipeline, not only model mocks. |
| AC-04 | Connected sentences, clear pause, speaker change, 30-second monologue, source-edge margins | Expected intervals/grouping and unchanged overlap against D10 fixture annotations. |
| AC-05 | Full preview, selection/highlights, simultaneous captions, background audition | Browser playback and listening proof against known source positions. |
| AC-06 | Correct clipped word, speaker, text; add missed line after five saved takes; invalid/stale edits | User interaction, revision/take association and D06 outcome after reload. |
| AC-07 | Attempt retry, capture/processing race, stale-tab lock bypass, failed and successful reprocessing after saved text/speaker/boundary corrections plus an added missed turn; concurrent edit during retry | D05 lock and D13 disposition/provenance/confirmation evidence at activation; unset policy or stale revision cannot silently replace edits. Settlement reconciles separately under D03. |
| AC-08 | Immediate record on actual devices; permission denial, playback readiness and interruption | Screen/audio timing measurements with D10 tolerance; hidden video, early Stop, independent reference volume and maximum-window auto-stop proven in browser. |
| AC-09 | Complete a turn; playback/retry/next; overlap review; save/fail a replacement with and without an existing saved take | Video/audio evidence showing explicit controls and target identity: previous saved take while pending/failed, disabled if absent, new take only on next playback after commit; no automatic playback switch; saved-A/original-B then both-saved review mix with user-accepted artifacts. |
| AC-10 | Failed candidate upload/association, dropped response, stale revision, successful replacement | Old take remains through failure; new current take durable exactly once; restore/export check. |
| AC-11 | Full scene with dialogue-free intervals, margins and simultaneous takes | Output duration/timeline comparison and listening analysis; no duplicated background or deliberate original-voice layer. |
| AC-12 | Re-record a finished project, edit recorded timing, try incomplete export | D06/D07 guard and output behavior; no hidden fallback. |
| AC-13 | Close/reopen after saves and during pending work; concurrent-device edit | Restored authoritative state, honest pending/conflict messages and retained media. |
| AC-14 | Free capacity/full state, successful purchase, duplicate purchase, deletion/free slot | D04 capacity and accounting evidence; no unintended project loss. |
| AC-15 | Anonymous link view and attempts to retrieve private assets/edit | Public browser proof and negative authorization tests, no private URLs/metadata leak. |
| AC-16 | Two exports completing in reverse order, failed replacement, new finished generation | Same-link target history proves D08 order; no partial/stale publication. |
| AC-17 | Delete while recording/upload/render/payment reconciliation is active; late callbacks/cache reads | No resurrection or link access under D08; cleanup proof distinct from logical invalidation. |
| AC-18 | Different durations, quote changes, buy credits, worker slowdown/retry | Shown/accepted/settled amounts tied to source/policy; no hidden processing from purchase. |
| AC-19 | Double-click, parallel account spend, duplicate job completion, unknown settlement result | Durable reservation/ledger reconciliation; no negative availability or conflicting terminal events. |
| AC-20 | Initial preparation, included retry, additional retry and each included action | Exact entitlement usage and ledger differences before/after actions. |
| AC-21 | New-account grant replay/concurrency plus maximum-length trial project | D02 trial capacity and exactly-once eligible grant, exactly 120 non-expiring welcome credits without duplicate issuance. |
| AC-22 | Provider test checkout, duplicate/forged/out-of-order/missing response, reversal per D03 | Server-verified receipts, one credit/slot effect, no subscription; real payment integration test mode. |
| AC-23 | Malformed model references/media, stage crashes, stale completions and deletion/auth races | Failure-injection evidence at real boundaries; privacy, revision and money invariants maintained. |
| AC-24 | Representative EN/RU quality/time/cost benchmark including music/effects/overlap/nonverbal sounds | Actual measured stage/end-to-end time, quality notes and full-cost report on declared hardware/load. |
| AC-25 | One compatible full journey plus relevant failed-job and payment/recording recovery | Requirement-to-artifact-to-proof record in integrated environment, not unrelated unit passes. |

Unit checks establish local logic only. Real media samples, browser microphone/playback, worker/storage races, payment integration and actual hosted delivery require their own evidence. Do not substitute existing workflow-file validation for any AC.

## 13. Requirement traceability

Each BR requirement maps to shared contracts, project AC and actual unpublished task drafts. Their [package index](../task-drafts/SPEC-001/README.md) provides dependency-based order and review boundaries. Execution evidence is not run; full integration proof belongs to the real-product/final gates, not isolated draft readiness. Full task bodies remain in their individual files.

| BR requirement | Contract sections | Project AC | Task / executed evidence |
|---|---|---|---|
| BR-001-R01 | §§3, 4.4, 9 | AC-01, AC-08, AC-13, AC-25 | [Render the flat visual system and responsive public/account shell](../task-drafts/SPEC-001/visual_system_shell.md); [Authenticate account-owned access and initialize eligible accounts once](../task-drafts/SPEC-001/account_identity.md); [Run the existing frontend through the real backend services adapter](../task-drafts/SPEC-001/frontend_real_adapter.md); evidence not run |
| BR-001-R02 | §§3, 4.1 | AC-01, AC-18 | [Render the flat visual system and responsive public/account shell](../task-drafts/SPEC-001/visual_system_shell.md); [Take a demo user from file selection and quote to a usable preview](../task-drafts/SPEC-001/upload_preparation_ui.md); evidence not run |
| BR-001-R03 | §§4.1–4.2, 5 | AC-02, AC-03 | [Create resumable projects with validated durable source media](../task-drafts/SPEC-001/project_media_upload.md); [Produce validated timed speaker turns including overlap and character sounds](../task-drafts/SPEC-001/dialogue_preparation.md); evidence not run |
| BR-001-R04 | §§4.2, 5 | AC-03 | [Produce validated timed speaker turns including overlap and character sounds](../task-drafts/SPEC-001/dialogue_preparation.md); [Produce an auditionable music-and-effects background for a source](../task-drafts/SPEC-001/background_separation.md); evidence not run |
| BR-001-R05 | §§4.2, 5 | AC-04 | [Produce validated timed speaker turns including overlap and character sounds](../task-drafts/SPEC-001/dialogue_preparation.md); evidence not run |
| BR-001-R06 | §4.3 | AC-05 | [Take a demo user from file selection and quote to a usable preview](../task-drafts/SPEC-001/upload_preparation_ui.md); [Correct prepared turns and add a missed line without losing saved work](../task-drafts/SPEC-001/turn_correction_ui.md); evidence not run |
| BR-001-R07 | §§4.3, 8–9 | AC-06, AC-12 | [Correct prepared turns and add a missed line without losing saved work](../task-drafts/SPEC-001/turn_correction_ui.md); [Persist revision-safe turn corrections and manually added dialogue](../task-drafts/SPEC-001/preparation_corrections.md); evidence not run |
| BR-001-R08 | §§4.3, 8.1 | AC-07 | [Exercise sample preparation and explicit correction disposition without AI](../task-drafts/SPEC-001/mock_preparation_lifecycle.md); [Activate a complete preparation with correct credits and retry behavior](../task-drafts/SPEC-001/preparation_orchestration.md); [Authorize recording and commit a compatible durable take safely](../task-drafts/SPEC-001/recording_commit_backend.md); evidence not run |
| BR-001-R09 | §§4.2, 4.4–4.5, 5 | AC-03, AC-08, AC-11 | [Produce validated timed speaker turns including overlap and character sounds](../task-drafts/SPEC-001/dialogue_preparation.md); [Record and safely review one durable take per turn](../task-drafts/SPEC-001/recording_review_ui.md); [Render a full source-timeline video using current recorded performances](../task-drafts/SPEC-001/full_video_rendering.md); evidence not run |
| BR-001-R10 | §4.4 | AC-08, AC-09 | [Record and safely review one durable take per turn](../task-drafts/SPEC-001/recording_review_ui.md); evidence not run |
| BR-001-R11 | §§4.4, 5 | AC-08 | [Capture a bounded local microphone take synchronized to reference audio](../task-drafts/SPEC-001/browser_capture_adapter.md); [Record and safely review one durable take per turn](../task-drafts/SPEC-001/recording_review_ui.md); [Authorize recording and commit a compatible durable take safely](../task-drafts/SPEC-001/recording_commit_backend.md); evidence not run |
| BR-001-R12 | §§4.4, 8.1 | AC-09, AC-10 | [Record and safely review one durable take per turn](../task-drafts/SPEC-001/recording_review_ui.md); [Authorize recording and commit a compatible durable take safely](../task-drafts/SPEC-001/recording_commit_backend.md); evidence not run |
| BR-001-R13 | §§4.3–4.4 | AC-05, AC-09 | [Produce an auditionable music-and-effects background for a source](../task-drafts/SPEC-001/background_separation.md); [Record and safely review one durable take per turn](../task-drafts/SPEC-001/recording_review_ui.md); evidence not run |
| BR-001-R14 | §§4.5, 5 | AC-11 | [Render a full source-timeline video using current recorded performances](../task-drafts/SPEC-001/full_video_rendering.md); evidence not run |
| BR-001-R15 | §4.5 | AC-12, AC-15, AC-25 | [Resume projects and manage honest finished results and public demo links](../task-drafts/SPEC-001/results_projects_sharing_ui.md); [Render a full source-timeline video using current recorded performances](../task-drafts/SPEC-001/full_video_rendering.md); [Publish only the latest finished result and revoke a deleted project's access](../task-drafts/SPEC-001/sharing_project_deletion.md); evidence not run |
| BR-001-R16 | §§4.6, 7–9 | AC-10, AC-13 | [Persist and restore the demo workspace through the shared facade](../task-drafts/SPEC-001/mock_workspace_persistence.md); [Create resumable projects with validated durable source media](../task-drafts/SPEC-001/project_media_upload.md); [Authorize recording and commit a compatible durable take safely](../task-drafts/SPEC-001/recording_commit_backend.md); evidence not run |
| BR-001-R17 | §§4.6–4.7 | AC-14, AC-22 | [Create resumable projects with validated durable source media](../task-drafts/SPEC-001/project_media_upload.md); [Fulfill verified one-time credit purchases and the permanent slot upgrade once](../task-drafts/SPEC-001/one_time_purchase_fulfillment.md); evidence not run |
| BR-001-R18 | §§4.5, 8–10 | AC-15, AC-16, AC-17 | [Publish only the latest finished result and revoke a deleted project's access](../task-drafts/SPEC-001/sharing_project_deletion.md); [Resume projects and manage honest finished results and public demo links](../task-drafts/SPEC-001/results_projects_sharing_ui.md); evidence not run |
| BR-001-R19 | §§4.1, 4.7 | AC-18, AC-19 | [Maintain durable trial and preparation credit accounting](../task-drafts/SPEC-001/credit_reservations.md); [Take a demo user from file selection and quote to a usable preview](../task-drafts/SPEC-001/upload_preparation_ui.md); evidence not run |
| BR-001-R20 | §§4.3, 4.7 | AC-07, AC-20 | [Maintain durable trial and preparation credit accounting](../task-drafts/SPEC-001/credit_reservations.md); [Activate a complete preparation with correct credits and retry behavior](../task-drafts/SPEC-001/preparation_orchestration.md); evidence not run |
| BR-001-R21 | §4.7 | AC-21, AC-22 | [Maintain durable trial and preparation credit accounting](../task-drafts/SPEC-001/credit_reservations.md); [Fulfill verified one-time credit purchases and the permanent slot upgrade once](../task-drafts/SPEC-001/one_time_purchase_fulfillment.md); evidence not run |
| BR-001-R22 | §§4.7, 8–9 | AC-19, AC-23 | [Maintain durable trial and preparation credit accounting](../task-drafts/SPEC-001/credit_reservations.md); [Activate a complete preparation with correct credits and retry behavior](../task-drafts/SPEC-001/preparation_orchestration.md); evidence not run |

## 14. Task index and implementation phases

Related specialization: [SPEC-002: Frontend, visual system, services and mock mode](SPEC-002_frontend.md) defines proposed visual tokens/layouts, centralized backend access, a backend-free frontend demonstration contract and test plan. It does not close this specification's open production decisions or constitute a frontend implementation.

The user authorized decomposition into unpublished drafts, not implementation or issue creation. The [package index and proposed execution order](../task-drafts/SPEC-001/README.md) links 35 individual contracts; all remain drafts pending applicable decisions/grooming/package readiness. Dependency fields in the individual files are authoritative. No GitHub numbers or issue URLs are assigned. This spec contains only the concise index, not task bodies or live execution statuses.

| Task title | Intended outcome | Individual draft / issue |
|---|---|---|
| Establish the real media pipeline's quality, latency and cost envelope | Measured media, device and cost envelope | [Draft](../task-drafts/SPEC-001/media_feasibility.md) |
| Run a tested React and Zustand frontend in an isolated mock configuration | Runnable tested frontend bootstrap | [Draft](../task-drafts/SPEC-001/frontend_runtime.md) |
| Freeze the frontend facade and enforce its transport boundary | One enforceable typed service boundary | [Draft](../task-drafts/SPEC-001/frontend_service_contract.md) |
| Provide playable, annotated and permitted dubbing fixtures | Playable permitted annotated demo assets | [Draft](../task-drafts/SPEC-001/demo_media_fixtures.md) |
| Render the flat visual system and responsive public/account shell | Flat responsive visual foundations and navigation | [Draft](../task-drafts/SPEC-001/visual_system_shell.md) |
| Persist and restore the demo workspace through the shared facade | Durable local project and take state | [Draft](../task-drafts/SPEC-001/mock_workspace_persistence.md) |
| Simulate credit quotes, reservations and one-time purchases consistently | Consistent simulated credits and purchases | [Draft](../task-drafts/SPEC-001/mock_credit_accounting.md) |
| Exercise sample preparation and explicit correction disposition without AI | Honest sample preparation and retry activation | [Draft](../task-drafts/SPEC-001/mock_preparation_lifecycle.md) |
| Simulate finished generations and local share deletion honestly | Generation-safe local demo result lifecycle | [Draft](../task-drafts/SPEC-001/mock_result_lifecycle.md) |
| Take a demo user from file selection and quote to a usable preview | Upload/quote-to-preview user journey | [Draft](../task-drafts/SPEC-001/upload_preparation_ui.md) |
| Correct prepared turns and add a missed line without losing saved work | Recoverable text/speaker/timing and missed-line edits | [Draft](../task-drafts/SPEC-001/turn_correction_ui.md) |
| Capture a bounded local microphone take synchronized to reference audio | Measured fixed-window microphone capture | [Draft](../task-drafts/SPEC-001/browser_capture_adapter.md) |
| Record and safely review one durable take per turn | One durable safely reviewed take per turn | [Draft](../task-drafts/SPEC-001/recording_review_ui.md) |
| Resume projects and manage honest finished results and public demo links | Resume, result, download and public demo UI | [Draft](../task-drafts/SPEC-001/results_projects_sharing_ui.md) |
| Buy demo credit packs and return to the original preparation quote | Explicit one-time demo purchase/return journey | [Draft](../task-drafts/SPEC-001/credits_purchase_ui.md) |
| Prove the full backend-free frontend milestone | Integrated backend-free frontend proof | [Draft](../task-drafts/SPEC-001/frontend_mock_integration_gate.md) |
| Resolve the production policy baseline needed by dependent implementation | Owner decisions for production behavior | [Draft](../task-drafts/SPEC-001/production_policy_baseline.md) |
| Run FastAPI against an isolated PostgreSQL and SQLAlchemy test environment | Isolated API/database/migration test environment | [Draft](../task-drafts/SPEC-001/backend_runtime.md) |
| Freeze API, timeline and durable data contracts for real integration | Compatible API/timeline/data foundation | [Draft](../task-drafts/SPEC-001/backend_contracts_schema.md) |
| Authenticate account-owned access and initialize eligible accounts once | Authenticated account-owned access | [Draft](../task-drafts/SPEC-001/account_identity.md) |
| Create resumable projects with validated durable source media | Durable validated source/project lifecycle | [Draft](../task-drafts/SPEC-001/project_media_upload.md) |
| Maintain durable trial and preparation credit accounting | Transactional trial/preparation accounting | [Draft](../task-drafts/SPEC-001/credit_reservations.md) |
| Deliver durable version-bound media jobs without duplicate publication | Recoverable version-bound media jobs | [Draft](../task-drafts/SPEC-001/processing_job_foundation.md) |
| Produce validated timed speaker turns including overlap and character sounds | Validated speech/speaker/nonverbal turns | [Draft](../task-drafts/SPEC-001/dialogue_preparation.md) |
| Produce an auditionable music-and-effects background for a source | Source-aligned auditionable background | [Draft](../task-drafts/SPEC-001/background_separation.md) |
| Activate a complete preparation with correct credits and retry behavior | Complete preview activation and correct charging | [Draft](../task-drafts/SPEC-001/preparation_orchestration.md) |
| Persist revision-safe turn corrections and manually added dialogue | Revision-safe manual corrections and added lines | [Draft](../task-drafts/SPEC-001/preparation_corrections.md) |
| Authorize recording and commit a compatible durable take safely | Authorized durable compatible take replacement | [Draft](../task-drafts/SPEC-001/recording_commit_backend.md) |
| Render a full source-timeline video using current recorded performances | Actual full-video render of submitted takes | [Draft](../task-drafts/SPEC-001/full_video_rendering.md) |
| Publish only the latest finished result and revoke a deleted project's access | Latest-finished public output and deletion fencing | [Draft](../task-drafts/SPEC-001/sharing_project_deletion.md) |
| Fulfill verified one-time credit purchases and the permanent slot upgrade once | Verified once-only purchase/slot fulfillment | [Draft](../task-drafts/SPEC-001/one_time_purchase_fulfillment.md) |
| Run the existing frontend through the real backend services adapter | Real-backend integration through existing facade | [Draft](../task-drafts/SPEC-001/frontend_real_adapter.md) |
| Make the application environment reproducible and recoverable | Reproducible recoverable delivery environment | [Draft](../task-drafts/SPEC-001/delivery_recovery_environment.md) |
| Prove the complete real-service dubbing journey and failure recovery | Full real-service media/billing/lifecycle proof | [Draft](../task-drafts/SPEC-001/real_product_integration_gate.md) |
| Establish final acceptance and the actual delivery readiness of the MVP | Evidence-backed final acceptance/delivery verdict | [Draft](../task-drafts/SPEC-001/release_acceptance_gate.md) |

Proposed phases are planning context, not a task queue or statuses:

1. Resolve material behavior/limit decisions and validate media feasibility/cost/synchronization.
2. Establish shared identity, timeline, asset, persistence, operation/revision and credit contracts before dependent consumers diverge.
3. Deliver preparation/correction and safe recording/resumption against those contracts.
4. Deliver compatible full rendering, latest-version sharing, purchases/slots and lifecycle recovery.
5. Prove integrated AC, resolve defects and satisfy release/delivery conditions.

Parallel execution is not requested. Future ownership/dependencies must be explicit; overlapping data/media/payment contracts need coordination. A final integration-gate task must prove the whole journey rather than treating individual task results as feature acceptance.

## 15. Decisions and blockers

Owner: the requesting project owner for observable product/commercial policy; implementer proposes technical mechanics with evidence. A blocker prevents dependent implementation/acceptance, not unrelated investigation or document work.

| ID | Decision / evidence required | Source relationship | Blocks |
|---|---|---|---|
| D01 | Partially resolved: 10-minute/250 MB MP4/MOV/WebM upload, selected section <=120 seconds, mixed EN/RU, named desktop/mobile browsers, MP4 <=720p/no upscale/orientation. Remaining: codec/encoding/browser-version validation, exact bytes/timebase boundaries and normalization. | BR OQ-03/OQ-07; brainstorm §17 | Media compatibility evidence, AC-02/AC-08/AC-11. |
| D02 | Partially resolved: ceil(section seconds) at 1 credit/second, 120 one-time welcome credits, no expiry, USD one-time packs. Remaining: measured full costs, pack quantities/prices/margins and payment methods/provider. | OQ-01; brainstorm §17 | Commercial configuration/checkout; no arbitrary USD equivalence. |
| D03 | Partially resolved: delivered preparation charged, no-turn success charged, system/required-background failure free; one retry/project with failure/cancel rules; completed-stage cancellation and success-after-project-deletion charging. Remaining: stage allocation/rounding, cancellation quote/completion races, reservation expiry, refunds/reversals and account-deletion balance treatment. | OQ-02; brainstorm §17 | Monetary edge mechanics and reversal/cancellation acceptance. |
| D04 | Resolved product policy: 2 free/10 after first purchase; occupy after upload validation, retain failed-preparation slot, release on project deletion; no inactivity expiry. Atomic capacity/cleanup mechanics remain technical work. Purchase reversal is D03. | OQ-01/OQ-03; brainstorm §17 | Not an unanswered slot-count/lifecycle decision. |
| D05 | Resolved: first successfully saved take permanently locks AI reprocessing; failed attempt does not lock, deleting takes never unlocks. Enforce authoritative race guards. | Brainstorm §17 | Not an unanswered lock-event decision; concurrency verification still required. |
| D06 | Resolved: text/label edits preserve take validity, timing changes require replacement before export while retaining old media. Manual add/corrections remain after lock; no general split/merge. Safe revision/candidate mechanics require verification. | OQ-05; brainstorm §17 | Not an unanswered edit-compatibility decision. |
| D07 | Resolved for nonempty projects: every turn needs a current valid saved take; shorter within-window takes are valid, no final original fallback. Remaining: export eligibility for a preparation still containing zero turns; users may manually add lines and continue. Next navigation must not imply recording completion. | OQ-04; brainstorm §17 | Zero-turn export case and integration proof. |
| D08 | Partially resolved: same link off/on, previous finished result during rerender/failure, retain projects until project/account deletion; self-service account deletion included. Remaining: cleanup/backup/CDN/URL-reader lifetimes, generation mechanics and bounded delivery/render usage. | OQ-03/OQ-06; brainstorm §17 | Operational deletion/delivery evidence, not reopening agreed retention/link behavior. |
| D09 | Partially resolved: neutral white/gray/blue, bilingual UI/switch, optional listening, independent reference volume, early Stop and recoverable interrupted review, saved/original character preview fallback with user-accepted artifacts. Remaining: exact tokens/layout and candidate-recovery UX, measured mic/readiness/sync behavior. | OQ-08; brainstorm §17 | Detailed design/device proof; no assumed clean speaker isolation. |
| D10 | Real model/provider/version/quality/cost evidence, especially original-speaker isolation during overlap preview, mixed EN/RU/nonverbal detection, margins/pause rules, capture/acoustic tolerance and normalization. Define the 60-second target measurement boundaries, percentile/load/hardware. | OQ-07; brainstorm §17 | Feasibility/performance claims and provider selection; no claim of a tested SLA. |
| D11 | Partially resolved: Google plus verified email/password, explicit verified linking, reset email and self-service account deletion. Remaining: trial abuse/eligibility after recreation, content permissions/report/removal/support/public-release policy, security and required retained records. | OQ-09; brainstorm §17 | Release/support controls; authentication and deletion launch scope are selected. |
| D12 | Partially resolved: React + Zustand frontend and FastAPI + PostgreSQL + SQLAlchemy backend selected by the owner (§6.1). Remaining: versions/build/router/test tools, schemas/API/message units and compatibility, database driver/session/migrations, storage/job delivery, payment provider, transaction/coordination mechanics and deployment/recovery environment. | Owner stack decision, 2026-10-20; detailed architecture still open | Only the remaining architecture choices block their dependent implementation/infrastructure tasks; do not reopen the selected application stack without a new owner decision. |
| D13 | Resolved: confirmed reprocessing resets all prepared lines and manual edits/additions only on successful replacement; warn/confirm before starting. Failure preserves old usable preparation; expected-revision protection prevents unconfirmed loss of concurrent edits. | Review DBR-002; brainstorm §17 | No remaining reset/carry/merge product decision; activation/race proof still required. |

No hidden defaults for these decisions. A spec revision should record the owner/evidence, selected behavior and affected AC before dependent tasks become ready. Especially, choosing a price/slot count, silently clearing takes, exporting an incomplete dub, or promising a fixed SLA is not an autonomous technical detail.

## 16. Rollout, delivery, and review record

### 16.1 Delivery conditions

The current planning deliverables are this project-wide specification and its user-authorized unpublished implementation task package. They are not product implementation or release readiness. BR-001 and the specs remain drafts; no human approval or task readiness is manufactured.

Before executable work: review this spec using [spec-task-review](../../.agents/skills/spec-task-review/SKILL.md), resolve material decisions for affected slices, then decompose/groom/package-review actual individual task drafts. Independent planning review is separate from implementation verification; no mandatory separate implementation Reviewer is added.

Before product acceptance: complete AC with compatible evidence, record residual risks and decisions, establish permitted delivery conditions (local/staging/production as actually agreed), and perform full integration proof. Passing isolated tests does not prove processing quality, device sync, payment correctness, or deployed behavior.

Before public release: configure actual prices/limits, supported devices/media, truthful performance/quality messaging, account/content/retention policies, backup/recovery, and support for failed processing/credits, lost recording permission, project deletion and unavailable links. Pilot cohort/threshold/release date are not selected. Paid calls, hosting purchases, publication and deployment require applicable authority.

### 16.2 Review record

- Source baseline: BR-001 revision 0.1 and the saved brainstorm. No semantic changes to their accepted choices are authorized by this draft.
- Author verification: document structure, links, AC/BR traceability and decision references are checked as documentation; these do not constitute independent review or product tests.
- Independent specification review: GPT-6.1 Sol High reviewed revision 0.1 together with SPEC-002 revision 0.1; see the [joint review and correction record](SPEC-001_002_review.md). No new CRITICAL/HIGH contradiction was found; two MEDIUM findings and one LOW clarification were reported. The same reviewer confirmed DBR-001–003 closed as document findings in a targeted revision 0.2 recheck, with no residual correction in scope. This is not a package-readiness PASS. At that historical review D13 was still open; the later owner answers recorded in revision 0.5 resolve its reset/confirmation policy.
- Owner approval: pending, with date and exact accepted revision to be recorded when given.
- Revision 0.4: user-authorized decomposition adds 35 individual unpublished tasks, dependency order, task links and coverage. Shared product decisions are not changed. Author structural/grooming checks do not constitute independent review of the task package; no implementation or issues were created.
- Revision 0.3: records the owner's React/Zustand and FastAPI/PostgreSQL/SQLAlchemy stack decision and narrows D12. The completed independent review/recheck applies to earlier revisions; it does not imply independent review of this stack update. No code or dependency installation is authorized by the update.
- Revision 0.5: incorporates the later owner brainstorm (root brainstorm §17), updates shared contracts/AC and narrows D01–D13. These changed contracts and synchronized tasks have not undergone a new independent review. Explicit answers are confirmed decisions; whole-document approval/readiness is still pending.
- Executed product checks: none; no implementation/test commands exist.
- Task publication, implementation, commit/push, payment/model call, merge or deployment: none performed as part of this request.
