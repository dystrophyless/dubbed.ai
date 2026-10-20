# Dubbed — project brainstorm

Recorded: 2026-10-20 (Asia/Qyzylorda).
Source: this chat, including the preceding AI-native workflow setup request.
Status: brainstorming record, not an approved implementation specification or claim of working software.

This is a structured record of the substantive ideas, decisions, examples, alternatives, recommendations, research, and open questions. It is not a verbatim transcript. Later explicit answers supersede earlier possibilities. Illustrative numbers are not approved prices or engineering guarantees.

Current decision authority: the later [follow-up decision record](#17-confirmed-follow-up-brainstorm-decisions--2026-10-20) supersedes conflicting older proposals and open questions below. Earlier sections preserve discussion history.

## 1. Product idea and motivation

Build a web application for voice acting: users upload their own video, AI prepares its dialogue as timed recording units, and users record performances through a microphone. Content can be scenes from movies, shows, games, or other videos. Users try to match the original tone, pitch, and timing; the resulting video uses their voices instead of the original dialogue.

The user cited Voxalike and Choicer Voicer as related products. Their understanding is that these mainly offer predefined packs, while custom videos require manual transcription, timing, and clipping. This competitor characterization was not independently verified. The proposed differentiation is automatic preparation of custom videos. Whisper was suggested as an example, not selected as a dependency.

The selected primary audience is casual users having fun dubbing favorite scenes. Aspiring actors practicing and creators producing publishable dubs were alternative audiences, not the selected focus.

## 2. Confirmed first-version scope

- Full workflow in desktop/laptop and phone browsers.
- Custom uploaded videos up to approximately two minutes.
- English and Russian speech transcription.
- Sign in before upload; projects and takes belong to the account.
- AI transcription, word/line timing, speaker labels, and proposed recording turns.
- Include detected character laughter, screams, and gasps with captions such as `[laughs]` and `[screams]`.
- Dub every character and dialogue line in the normal flow, rather than select one character.
- Record one turn at a time; users retry or explicitly continue.
- Small lead-in and ending margins; fixed recording-window duration.
- Preserve the full original video timeline, including pauses and non-dialogue scenes.
- Replace original dialogue while retaining music/effects as well as processing allows.
- Preview processed background audio and let the user decide whether quality is acceptable.
- Save unfinished projects and recordings for later continuation.
- Watch the full result and revisit any line to re-record.
- Download the video or share an unlisted viewing link.
- Anyone with a link can watch without signing in; no public gallery.
- No automatic translation. Original dialogue is a guide; users may edit text or say something different.
- No timing, pitch, similarity, or performance scoring. Users judge takes by listening.
- Target preparation time: up to about one minute for a two-minute upload. This is an expectation, not measured performance.

## 3. Original flow and timing example

Initial flow: upload -> AI transcription/timing -> dialogue clips -> transcription preview -> microphone recording -> assemble the result -> share/download.

Preview was initially raised as possibly skippable, but the user subsequently confirmed a full-video subtitled preview and correction opportunity.

Example: a 20-second video contains `I want you to be mine` at 0:03–0:07 and `only mine` at 0:13–0:16. Offer recording units around those two ranges, with margins. Do not require dubbing the other ranges. However, 0:00–0:03, 0:07–0:13, and 0:16–0:20 remain in the final full video.

Recording units do not imply physically cutting out non-dialogue portions of the finished video. The initial wording about uploading the result was later clarified into download and viewing links.

## 4. Preparation and corrections

### Full-video preview

Play the complete video with AI-generated subtitles and highlight the current line in a selectable dialogue list. The assistant proposed that selecting a line seeks to its moment and opens correction controls.

Check words, speaker assignments, clip boundaries, and processed background before recording. The assistant proposed original/background audio comparison controls; the user confirmed hearing the processed background and deciding whether to proceed. Exact control labels/layout are not approved designs.

### Confirmed corrections

- Edit text.
- Correct AI speaker assignments such as Speaker 1 and Speaker 2.
- Drag clip start/end edges on a small timeline while previewing the video.
- Add a completely missed line: select a time range, enter text and speaker, then record it.
- Retry AI preparation before the first recorded line.

Example: if `I love you` is clipped to `love you`, the user must be able to move the start earlier to recover `I`.

`Fix clip` was proposed as a compact entry into editing rather than leaving an editing-heavy interface open. This label is provisional.

### AI reprocessing restriction

Whole-video `Process again` is available only before the first recorded line. After recording begins, users can still edit text/speakers/timing and add missed lines manually, but cannot rerun whole-video AI preparation for that project.

The concrete example was five recorded lines followed by discovery of an entirely missed `Come back!`. The final answer permits adding it manually. Earlier alternatives—keeping a parallel AI version, clearing takes with a warning, or starting another project—were not selected as the primary solution.

General manual splitting/merging is not in the selected first-version scope. Before recording, retry AI for missing/badly grouped material. After recording, add missed lines manually; a complete bad-grouping recovery flow remains unresolved.

### Background quality

Removal is best effort. The user can preview and continue despite faint original voice traces or slightly muffled music if it sounds good enough. Consistently clean separation for every upload is not a launch guarantee. No automated quality threshold was agreed.

## 5. Recording-turn grouping

- Keep connected same-speaker speech together; do not automatically split every sentence.
- `I love you. I always have.` may be one turn without a clear pause or speaker change.
- Split at speaker changes or clear pauses.
- Keep an uninterrupted 30-second speech as one take; no forced short-turn maximum was selected.
- Add small margins. Expanding 0:03–0:07 to 0:02.5–0:07.5 was illustrative; a 0.5-second margin is not finalized.
- Include detected nonverbal performances with descriptive captions.
- `[gasps]`, `You're alive!`, `[laughs]` illustrated possible recording units, not a mandatory grouping rule.

### Overlapping characters

Offer separate turns for each character, preserving their original positions. While recording A, play the full original audio including A and B, but highlight A's text. Repeat for B. Mix the new takes at overlapping positions in the result.

Isolated original per-character reference tracks are not required. Recovering both characters' words/timings remains an automatic-preparation goal. Speaker labels do not mean recognized character names or face identity.

## 6. Recording interaction — latest confirmed behavior

1. Watch/listen to the original clip before recording.
2. Press Record; start immediately with no countdown.
3. Hide the video during the take.
4. Keep dialogue text visible and play the original clip audio while the microphone records.
5. Stop automatically after the exact clip duration, including margins.
6. Stay on that turn with `Play my take`, `Retry`, and `Next`.
7. `Play my take` shows the video with the user's voice and processed background music/effects, without original dialogue.
8. Continue only when the user chooses Next; no automatic replay or auto-next was selected.

Keep one current take per line. Retry preserves the previous take until a replacement finishes successfully, then replaces it. Multiple saved takes and comparison were considered but not selected. The exact persistence boundary for successful replacement is still a specification detail.

For a four-second clip containing `I love you`, record exactly four seconds. Do not extend the video for a five-second take. Automatic speed-fitting and a manually controlled variable-duration Stop were alternatives, not selected behavior.

The assistant proposed displaying the speaker and a simple progress bar with the text. Text visibility is confirmed; other display details remain proposals.

Earlier visible-video recording and countdown suggestions are superseded by the user's explicit hidden-video/no-countdown decision.

## 7. Final result

- Full original video, not a compilation of dialogue clips.
- Original visual timing and pauses remain.
- New takes replace original dialogue while processed music/effects continue.
- Simultaneous character takes overlap at their correct positions.
- Watch full playback, revisit/re-record a line, download, or share.

Proposed mixing architecture: one continuous music/effects track plus takes at their source-timeline positions. Do not duplicate background audio for overlapping takes. This is an implementation direction, not working code.

Not selected: export format/resolution, size/quality limits, watermarks, exported subtitles, volume/normalization controls, or handling incomplete recordings.

## 8. Screens and navigation

Confirmed entry choices:

- Visitors see a short landing page with an example, free-credit explanation, and `Start dubbing`.
- Sign in before uploading.
- Signed-in entry is `New dub`, not the saved-project library.
- Saved work is accessible through navigation.

Working navigation:

`Landing -> Sign in -> New dub -> Processing -> Prepare -> Record -> Result`

Additional areas: `My projects`, `Credits`, and account controls.

### Prepare and Record relationship

The user asked for advice rather than explicitly selecting separate versus combined screens. The assistant recommended two stages in a shared workspace: Prepare focuses on correctness; Record focuses on performing. Correction tools remain accessible while recording, and Result offers full playback/export/sharing.

Reasoning: showing every editor and recording control together could overwhelm casual users; unrelated screens could make fixes cumbersome. This recommendation guided later discussion, but exact layout and visual design were not separately approved.

Desktop proposal: video beside dialogue list; selecting a line opens corrections. Phone proposal: video above the list, correction controls open for the selected line. During an active take, hide video as explicitly confirmed, even though earlier layout suggestions had assumed a visible video.

### Billing/navigation proposals

- Credits screen: balance, purchases, and grants/spending/returned-credit history.
- Account menu: balance/billing entry.
- New dub: quote preparation cost and resulting balance before commitment.
- Preserve selected upload when buying credits and return to the same quote.
- Buying credits alone does not start processing; confirm processing separately.

These are proposals consistent with the selected model, not finished screen designs.

## 9. Persistence, project limits, and sharing

Confirmed:

- Save account-owned projects and takes for resumption after closing the browser.
- Limit saved-project count; let users choose what to delete when full.
- Free users get fewer slots; their first credit purchase permanently unlocks more.
- Exact slot counts are undecided.
- Deleting a project removes its shared video too; warn that the link stops working.
- Unlisted links work without viewer sign-in; no public gallery.
- The same shared link automatically shows the latest finished version after re-recording.

Assistant proposal: retain the last playable finished result while a replacement is in progress. Exact publication/version-update semantics still need definition.

Unresolved: share-link revocation/rotation independent of project deletion, visible metadata, when a project consumes a slot, failed/abandoned uploads, refund/chargeback effects on permanent slot upgrades, intermediate/back-up retention, and discarded takes/old exports. No control over already downloaded copies was promised.

## 10. Credits and purchase model

### Decision provenance

The user proposed credits and initial free credits for every new account. After requesting thoughtful pricing advice, they accepted the duration-based proposal with 'Ok, do that, let's continue with the brainstorming.' Later answers explicitly selected credit packs without subscriptions and a permanent project-slot increase after the first purchase.

Separate explicit user choices from accepted-in-principle recommendations and details still to be specified.

### Accepted-in-principle model

- Charge for AI preparation by uploaded video duration, with the exact cost displayed upfront.
- Preparation covers transcription, timing, speaker assignment, and processed background.
- Include one user-requested AI retry before recording begins.
- Further user-requested attempts may spend credits after an explicit quote; exact retry cost is undecided.
- Manual edits, recording/re-recording, playback, and reopening prepared projects do not spend preparation credits.
- Include downloads and share-link creation, subject to separate storage/sharing limits still to be defined.
- Give new users enough free credits for one maximum-length two-minute project, including the included retry. The numeric credit amount is not finalized.
- One-time credit packs only at launch, no subscription or automatic recurring charges.
- Purchased credits do not expire under the selected proposal. Free-credit expiry was not decided.
- No automatic purchases when credits run out.

### Proposed transaction behavior

- Upload/file checks are free.
- Reserve the quote when processing starts; finalize it when preparation becomes available.
- Release reserved credits if processing fails because of the system.
- Internal retries, duplicate clicks, or slow execution do not increase the quoted amount.
- Merely reopening an existing prepared project is not a new paid preparation.
- Distinguish system failure from a technically completed output the user dislikes. Do not silently promise unlimited dissatisfaction refunds.
- Provide an included retry and correction tools as the predictable recovery path.
- Reuse valid processing results where possible: retrying transcription need not rerun a successful background separation.

Reservation expiry, user cancellation, refund policy, completion criteria, idempotency, partial failures, and stage-specific retries need exact contracts. They are not implemented or fully settled by this brainstorm.

### Billing rationale

Duration billing avoids charging the same amount for a 15-second video and a two-minute scene. Billing by detected dialogue alone was discouraged because the price would only be known after processing. Quote from known source duration before work starts.

The recommendation is a predictable product price, not an unannounced post-processing surcharge based on GPU runtime. No extra language/speaker/overlap pricing was selected.

### Illustrative amounts — not approved values

The assistant used one credit per second to demonstrate understandable arithmetic:

- 1 minute 24 seconds -> 84 credits.
- Balance 200 -> 116 after that preparation.
- 120 credits -> two minutes of preparation.

These are examples only. No one-credit-per-second denomination, starting balance of 200, pack amount, currency, monetary price, rounding rule, or minimum fee was adopted. Packs could show an approximate equivalent in preparation minutes once the denomination is chosen.

### Why packs first

Assistant hypothesis: casual users may dub in bursts rather than monthly. Packs let them pay when needed, without recurring commitment. Subscriptions add monthly allowances, rollover, cancellation, and project-limit downgrade behavior before recurring demand is established. Both purchase models from launch would add complexity.

Later, measured recurring usage could justify a subscription with monthly credits and perhaps more project slots. That is a future option, not launch scope.

### Actual costs and eventual prices

Do not price only from speech-to-text costs. Measure recognition/alignment, speaker handling, dialogue/background separation, overlap/nonverbal processing if needed, conversion/export, retries/failures, storage/file operations/sharing, payment overhead, and margin.

Benchmark easy and difficult clips on intended hardware before assigning cash prices. Free credits should let users experience the full result without implicitly promising unlimited permanent hosting.

Provider references checked in the chat, not selected vendors:

- [Modal pricing](https://modal.com/pricing): an example of execution/GPU-resource billing, including per-second prices.
- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/): storage and file-operation costs and its documented direct-egress policy.

No actual provider-cost model, monetary quote, or unit-economics measurement was produced.

## 11. Technical research and proposed pipeline

Evidence boundary: documentation research only. No model installed/run, video processed, accuracy benchmark, runtime measurement, cost measurement, or end-to-end mobile recording validation occurred. 'Feasible' was a reasoned assessment based on available building blocks, not proof of the complete experience or an 'any video' guarantee.

### A. Transcription and timing

WhisperX was identified as a candidate for speech recognition plus word-level alignment. Its alignment source includes English and Russian models. It combines Whisper-family recognition with alignment and optional diarization.

Its documentation explicitly warns about imperfect diarization, weak handling of overlapping speech, and alignment limitations for some transcript tokens. Candidate support is not proof of accuracy on movies, shows, or games.

References:

- [WhisperX](https://github.com/m-bain/whisperX).
- [Alignment model mappings](https://github.com/m-bain/whisperX/blob/main/whisperx/alignment.py).
- [WhisperX paper](https://arxiv.org/abs/2303.00747).

Context7 resolved `/m-bain/whisperx` and returned transcription/alignment/diarization documentation. No dependency or version was pinned.

### B. Speaker assignment

Diarization estimates who speaks when and produces speaker labels. Pyannote was identified as a candidate. This does not inherently recognize character names/faces or extract clean individual voice tracks.

Reference: [pyannote speaker-diarization-community-1](https://huggingface.co/pyannote/speaker-diarization-community-1).

The model exposes regular and exclusive diarization. A single speaker assignment for a word is not evidence that both overlapping transcripts were recovered. Preserve overlapping turns rather than assuming every source moment belongs to only one speaker.

### C. Clip preparation

Slicing itself need not use another generative model. Given detected words, speakers, and speech ranges, apply ordinary grouping/boundary/margin rules. Store positions against the original video; physical per-clip files are optional.

FFmpeg provides trimming, timestamp adjustment, and audio mixing. `atrim` and `amix` appeared in the documentation research. No production command or media pipeline was written.

Reference: [FFmpeg filters](https://ffmpeg.org/ffmpeg-filters.html).

### D. Removing original dialogue

This is separate from transcription and speaker labeling. BandIt specifically targets cinematic dialogue/music/effects separation and was identified as a candidate to audition. Published dataset results do not establish clean output for arbitrary uploads.

Reference: [BandIt](https://github.com/kwatcharasupat/bandit).

Demucs also appeared in research. Its common separation categories are music-oriented vocals/drums/bass/other, and the original repository states it is no longer maintained. It was not selected as a guaranteed movie-dialogue remover.

Reference: [Demucs](https://github.com/facebookresearch/demucs).

Test voices under loud music/effects, whispers, screams, overlap, singing, and other expressive sounds. Some original voice may remain and some background may be altered. The selected user-preview acceptance handles imperfect output without promising clean recovery.

### E. Overlap

Distinguish two tasks:

1. Record two new takes and mix them at overlapping timeline positions.
2. Recover both original speakers' words/timings and speaker identities from a mixed source.

The second is the harder preparation problem. A label correction cannot restore a transcript omitted by recognition. Additional separation/transcription approaches may be needed. Manual missing-line creation is the product recovery path.

SpeechBrain/SepFormer appeared as examples of speech separation, not selected dependencies or validated film/game models.

- [SpeechBrain](https://github.com/speechbrain/speechbrain).
- [Speech-separation recipe](https://github.com/speechbrain/speechbrain/blob/develop/recipes/WSJ0Mix/separation/README.md).

Full-original-audio recording guidance avoids requiring isolated original character tracks.

### F. Nonverbal performances

Laughter/scream/gasp detection and captioning are desired functionality. This was not demonstrated by WhisperX alone. Original nonverbal voice must also be considered during source removal; otherwise the actor's original scream could remain under the user's scream.

### G. Browser recording and synchronization

The microphone capture and original-audio playback must share a reliably established timing reference for fixed-duration takes. Do not assume starting two browser actions produces identical timing. Validate on intended phone and desktop browsers.

Original playback may leak into the microphone. Headphones were suggested, not mandated as a product restriction. Permissions, echo cancellation, Bluetooth/device latency, interruptions, backgrounding, and possible calibration remain untested/unresolved.

### H. Proposed architecture

Conceptual components: web interface, account/project service, asynchronous AI/media workers, stored source/processed files, timed takes, and export/sharing.

No frontend/backend framework, database, queue, authentication/payment provider, storage/hosting vendor, GPU, or model version was selected. Stack selection should follow evidence from audio processing and intended operating cost.

## 12. Proposed feasibility experiment

Use representative English/Russian clips: clean single-speaker dialogue, turn-taking, loud music, action/game effects, simultaneous voices, nonverbal performances, and longer uninterrupted speeches.

Measure and listen for:

- Incorrect/missing words and nonverbal sounds.
- Clipped word beginnings/endings and turn-boundary accuracy.
- Speaker swaps/counting errors and coverage of both overlapping voices.
- Residual original dialogue and damage to music/effects.
- End-to-end preparation time for all preview assets, not transcription alone.
- Cost per uploaded minute, variability, and expected retry overhead.
- Phone/desktop recording synchronization and reference-audio leakage.

No sample count or numerical accuracy threshold was agreed. The experiment was proposed, not executed or separately authorized as paid external model usage. A one-minute turnaround remains a target.

## 13. Decision evolution and unselected alternatives

| Topic | Alternatives/earlier direction | Final choice or current status |
|---|---|---|
| Audience | Actors practicing; publishing creators | Casual users having fun |
| Video length | Ten-minute scenes; episodes/movies | About two minutes |
| Characters | Selected lines or one chosen character | All characters/dialogue in normal flow |
| Output | Dialogue compilation; practice-only takes | Full original video |
| Recording approach | Continuous scene performance; both modes | One turn at a time |
| Recording video | Originally assumed scene visible | Video hidden during active recording |
| Start cue | Countdown | Immediate start, no countdown |
| Stop/timing | Manual stop; stretch scene; speed-fit take | Fixed clip duration with auto-stop |
| After recording | Automatic playback; automatic next | Stay with Play my take, Retry, Next |
| Takes | Multiple selectable takes | One current take, safe replacement |
| Preview | Initially maybe skippable; approve every line | Full subtitled video and selectable line list |
| Corrections | Initially no manual timing | Drag boundaries; edit text/speaker; add missed line |
| General split/merge | Full manual clip editing | Not agreed; AI retry before recording for grouping |
| Reprocess recorded project | Parallel version; clear takes with warning | AI retry only before first recorded line |
| Failed clipping recovery | Skip/retain original; accept imperfect clip; use another video | User must be able to fix it |
| Overlap | One combined turn; unsupported content | Separate character takes with overlapping timing |
| Reference audio | Isolated target character | Full original audio, target text highlighted |
| Final background | Mute everything; original mix quietly underneath | Processed music/effects with original dialogue removed |
| Imperfect removal | Demand clean output or block | User previews and judges acceptability |
| Segmentation | Sentence-by-sentence; short forced chunks | Same-speaker speech intact, including a 30-second speech |
| Vocal sounds | Speech only | Include detected laughter/screams/gasps |
| Language | English only; broad automatic-language support | English and Russian |
| Translation | Automatic English/Russian translation | No automatic translation |
| Scoring | Timing-only; pitch/similarity scores | No scores |
| Auth | Anonymous or sign in to save later | Sign in before upload |
| Signed-in home | Project library | New dub |
| Public entry | Upload screen first | Landing with example/free-credit explanation |
| Sharing | Gallery; signed-in viewers; invited users | Unlisted link, no viewer sign-in |
| Shared update | Explicit publish; new URL | Same link shows latest finished version |
| Delete project | Keep shared result separately | Delete both; warn link stops working |
| Limits | Retention expiry; storage upsell | Project count; first purchase permanently increases slots |
| Billing basis | Fixed per video; detected dialogue duration | Source duration, upfront quote |
| Purchase model | Subscription; packs and subscription | Credit packs only |

Unselected alternatives are history, not requested optional launch features.

## 14. Remaining decisions

Enough information exists for a coherent brief and first-version specification. The assistant recommended ending repetitive isolated question rounds and consolidating the whole picture. These remain open:

### Limits, billing, and storage

- Credit denomination, rounding/minimum charge, free-credit numeric balance/expiry.
- Pack sizes, actual cash prices, currency, payment methods, taxes/fees handling.
- Extra retry prices and stage-specific retry behavior.
- Cancellation, refund/dissatisfaction policy, failed/partial processing and reservation expiry.
- Exact free/paid-account project-slot counts and their consumption rules.
- Upload formats/file size/resolution and over-duration handling.
- Export quality, output size/format, repeated-render limits, share/view/download limits.
- Retention of originals, processed assets, backups, replaced takes and old exports.
- Trial abuse controls and slot-upgrade handling after refunds/chargebacks.

### Incomplete work and changes to existing takes

- Can users skip lines or export without completing every turn?
- What plays for an unfinished line: original voice, silence, or another fallback? No answer selected.
- What happens to an existing take after changing its clip boundaries? The assistant proposed a warning and contextual preview before choosing to re-record; not explicitly adopted.
- Text-only corrections should preserve takes was a recommendation, not a separately confirmed contract.
- What happens to takes after speaker reassignment?
- How to fix bad grouping after whole-video AI reprocessing is locked, beyond the agreed correction tools?
- Whether deleting every take unlocks reprocessing, or duplicating a project is possible.
- Recording/save/export failures, interruption recovery, simultaneous devices/tabs, duplicate actions.
- Exact point where a replacement take is safely successful and where a new export becomes the shared version.

### Screens and controls

- Final layout, labels, responsive behavior, accessibility, and visual styling.
- Whether listening before recording is required or optional.
- Microphone setup, original-audio volume, during-recording progress display.
- Processing/saving states, progress, notifications, and return/resume states.
- Share-link disable/rotation without deleting the project and viewer-visible metadata.
- Sign-in providers, recovery, account deletion.

### Technical and content questions

- Which pipeline reaches quality, time, and cost targets on representative uploads?
- English/Russian overlap and character-sound coverage.
- Recording timing/echo behavior on phones and desktops.
- Singing, crowd/background voices, narration, in-scene TV/radio, mixed-language content.
- Content ownership/permission expectations, reporting/removal, moderation, and abuse handling were future topics, not researched legal conclusions or selected policy.
- Frontend, backend, processing infrastructure, storage, authentication, and payments.

## 15. Broader areas identified for exploration

The assistant listed: audio feasibility; recording experience; screens/navigation; editing/recovery; storage/sharing; costs/usage limits; upload/content rules; architecture. The user explicitly chose screens/navigation and costs/usage limits for the later discussion, after the earlier technical feasibility exploration.

The user asked to reason thoughtfully about credit calculation and purchase models. Explanations were given before questions were repeated through request-user-input.

The user repeatedly asked to rephrase unclear questions. Concrete examples worked better than abstract alternatives: a four-second line, a clipped first word, five already recorded lines, and a missed `Come back!`.

Keep future questions concrete and explain tradeoffs before asking for a choice. Keep user decisions separate from assistant proposals. This chat does not approve implementation, paid model calls, external publication, a specification, or a release merely by discussing them.

## 16. Preceding AI-native workflow setup

The user first requested copying the reusable AI-native development setup from `D:\Program\python\pin` to `D:\Program\python\Dubbed`, including BR/SPEC/task/orchestration guidance, review skills, task packages, and Ponytail, without importing Pin's actual product specs/tasks.

Setup reported:

- 26 copied/adapted reusable files plus seven clean entry/provenance files, totaling 33 setup files.
- Ponytail, spec-task-review, task-package-review-loop local skills with available metadata.
- BR/spec/task/evidence templates, six SDD guides, GitHub issue forms and PR template.
- Agent instructions, orchestration, clean HANDOFF, product-brief scaffold, changelog and provenance.
- Planner/Reviewer policy: `gpt-6.1-sol`; Executor/Publisher: `gpt-6-luna`; explicit effort/clean-context dispatch and live-tool availability checks. Not an account/model-setting change.
- Independent reviews for specs, individual tasks, and packages. Orchestrator directly verifies implementation/evidence; no mandatory separate implementation Reviewer.
- Local Superpowers disable setting matching the source Ponytail workflow; shared installations unchanged.
- Semble-first discovery, Context7 docs lookup, and batching independent tool calls.
- Excluded Pin requirements, real specs/tasks/indexes/review reports, product code, assets/secrets, brainstorm decisions, handoff history, evidence, runtime/backup workflows, deployment configuration, Git history/remotes, and issue identity.
- No application stack or Git repository/remote was configured by installing the setup.

Historical setup verification: 82 relative Markdown links resolved; required metadata for all three skills; TOML parse; seven YAML issue/config/metadata files parsed; all 26 recorded source hashes unchanged. These are setup checks, not product tests.

The later runtime catalog exposed all three Dubbed skills, but no controlled fresh-session behavior test or live GitHub forms/publication was exercised.

Tooling note: the default sandbox command runner failed with `helper_unknown_error: setup refresh had errors`; outside-sandbox commands completed the approved setup checks. This is not an application bug or product acceptance evidence.

Workflow entry points:

- [README](README.md).
- [AGENTS](AGENTS.md).
- [Orchestration](_docs/orchestration.md).
- [SDD guides/templates](_docs/sdd/README.md).
- [Setup inventory/provenance](_docs/WORKFLOW_SETUP.md).
- [HANDOFF](_docs/HANDOFF.md).
- [Original brief scaffold](_docs/PROJECT_BRAINSTORM.md).

This requested root `brainstorm.md` now records the substantive product discussion. At creation time `_docs/PROJECT_BRAINSTORM.md` still contained the empty setup scaffold; do not interpret it as evidence that no decisions were discussed. Other workflow files were not rewritten by this save request.

## 17. Confirmed follow-up brainstorm decisions — 2026-10-20

This section records the later owner answers given while resolving the reviewed task package's blockers. It supersedes conflicting earlier proposals/open questions in §§1–16. It is a decision record, not evidence that implementation, tests, costs or feasibility have been validated. The existing React/Zustand frontend, FastAPI/PostgreSQL/SQLAlchemy backend, centralized services facade, backend-free mock and test requirements remain selected.

### 17.1 Reprocessing, corrections and completion

- Lock whole-project AI reprocessing only after the first take is successfully saved. Failed capture/save does not lock it. Once set, the lock is permanent for that project even if all takes are deleted; there is no delete-all-and-reprocess shortcut. Manual corrections and Add missed line remain available.
- Before an eligible reprocessing run, warn that successful replacement discards all prepared lines and manual text/speaker/timing edits, including manually added turns; proceed only after confirmation. Failed replacement preserves the previous usable preparation and edits. Concurrency must not silently discard edits made after confirmation.
- Timing changes invalidate the affected saved take for export and require a new take. Retain the old recording until a replacement saves. Text-only and speaker-label changes without timing changes keep the saved take valid.
- Require a current valid saved take for every turn before export. Adding a missed turn or changing recorded timing makes export unavailable until that turn has a valid saved take. No original-voice fallback in the finished result. Zero detected turns may be corrected by manually adding lines; whether a still-zero-turn project can export is not explicitly selected.

### 17.2 Recording and preview

- Listening beforehand is optional. Record is available as soon as microphone and reference audio are ready. No countdown; hide video while recording, keep target text visible, and play full original audio including overlapping voices.
- The window is a maximum: users may stop early and save a shorter performance, e.g. one or two seconds within a four-second window. Auto-stop at the window end; never exceed it, stretch the performance or extend the video. The unused remainder has background without that character's voice.
- Keep an interrupted attempt for listening when recoverable; it must not automatically erase the old saved take. The later clarification confirms shorter recordings can be valid. Unrecoverable media/save failures are not successful takes. Exact interrupted-candidate recovery/accept controls and durability are still technical design work, not a multi-take library.
- Stay on the current turn with Play my take, Retry and Next. Keep one current saved take; replace it only after a compatible replacement saves successfully. A separate recoverable-attempt audition must not masquerade as the durable Play my take action.
- Provide reference-audio volume control independent of saved microphone gain.
- In review, use saved takes for recorded characters and original voices for unrecorded characters, with one processed background. Example: recorded A replaces original A while original B remains; once B is recorded, use both takes. Full original audio still plays during capture.
- Preserving original B while replacing overlapping A requires per-speaker original-voice separation for preview. This is a new capability to validate, distinct from removing all dialogue for the final mix. The owner accepts hearing imperfect separation and continuing if satisfied; do not claim clean isolation is proven or silently replace the chosen preview with silence. Final export still requires all turns recorded and uses no intentional original dialogue.

### 17.3 Credits, retry and cancellation

- Preparation costs **1 credit per second of the selected section, rounded up once for the section**: 12.4 seconds costs 13 credits; 45 seconds costs 45; two minutes costs 120. Charge full section duration, not dialogue-only duration or worker runtime. Include transcription, speaker/timing preparation and background separation; no complexity/language/overlap surcharge.
- Each eligible new verified account receives **120 one-time welcome credits**. Free and purchased credits do not expire. No periodic refill. Grant/account-link replay must not create duplicate allowances.
- **One included AI retry per project**, not per purchase or paid processing run. After it is used, further eligible reprocessing costs the normal preparation price shown before confirmation. Later paid runs never replenish the included retry. Reprocessing remains permanently unavailable after the first successfully saved take.
- Charge when complete preparation is delivered, before subjective user approval. Disliking subtitles/background quality does not reverse a delivered processing charge. Corrections and the included retry provide recovery.
- A system failure is not charged and does not consume the included retry. If background separation completely fails, preparation fails even if transcription succeeded; preserve the old usable preparation and allow retry. Successful zero-dialogue detection is charged; users can manually add missed lines.
- Allow cancellation. Queued cancellation costs nothing. Once processing starts, charge only fully completed stages; show the cancellation cost before confirmation. Do not charge elapsed fractions of an unfinished stage. The example of 20 credits dialogue + 30 background, canceled halfway through background, costs 20; **these stage weights are illustrative, not selected prices**. Stage allocations, rounding and cancellation-confirmation races still need a measured, consistent contract.
- Canceling an included retry after processing starts consumes its allowance; canceling while queued does not. It remains included (no extra preparation-credit fee).
- Allow project deletion during processing. A deleted project's successful processing remains chargeable; deletion is not a cancellation or refund command. Completed charges are not refunded by deletion. Keep access/publication fenced while reconciling account-level billing.
- Manual corrections, performance retries, playback, reopening, download and share creation remain included under declared usage limits. Purchase is separate from starting processing; no recurring payments or automatic top-ups.
- Credit packs only; **USD** prices. Measure full processing, included/failed retries, export, payment, storage and sharing costs before proposing pack quantities, cash prices and margins. Permanent storage has ongoing cost; no arbitrary dollar equivalence is adopted for a credit.

### 17.4 Upload, output and languages

- Accept target containers **MP4, MOV and WebM**, original upload **up to 10 minutes and 250 MB**. Actual codec compatibility/content validation still requires testing; a filename alone is not compatibility proof.
- In the app, choose a section of **up to two minutes** from a longer upload before AI preparation. The selected section supplies the project timeline and duration quote. Export its entire timeline, including pauses, rather than the whole longer upload or a dialogue-only compilation. Exact byte/duration/timebase boundary mechanics remain to specify.
- Target **up to 720p**, preserve portrait/landscape orientation, never enlarge low-resolution sources; deliver one **MP4** download format. Actual codecs/encoding settings require validation.
- Transcribe both **English and Russian within the same selected section**. No automatic translation.
- Subtitles support preparation and recording only; add no subtitles to finished/shared video. This does not promise removal of captions already burned into the uploaded image.

### 17.5 Projects and sharing

- **2 saved projects** for free accounts; first successful credit purchase permanently increases allowance to **10**. Credits and slots remain separate.
- Consume a slot after upload validation succeeds, before AI processing. A failed AI preparation keeps the resumable project and its slot until deletion. Deletion frees the slot without refunding completed processing.
- Keep projects and recordings until project/account deletion; no inactivity expiry. Cleanup of superseded/intermediate assets, backups and cache/URL lifetimes still needs a technical policy compatible with retained current work.
- Anonymous unlisted viewing links; no public gallery. Owner can disable sharing without deleting the project, then re-enable the **same link**.
- While a new result renders, or if it fails, the link keeps showing the previous finished result. Switch automatically only after a valid new version finishes; late old renders cannot replace newer results.
- Project deletion removes its shared video; warn that the link stops working. Deletion cannot retract copies visitors already downloaded.

### 17.6 Accounts, interface and browsers

- **Google sign-in and email/password**. Email/password registration cannot finish until email verification succeeds. Include self-service password reset by email.
- Same email across Google/password must use an explicit ownership-verified account-linking flow, keeping one account, balance, project library and welcome grant. Email matching alone is not authorization to link.
- Launch includes confirmed self-service account deletion: disable account access and shared links and remove projects/recordings. Unused-credit/refund/reversal policy and retained financial/security/backup data are still open; do not silently invent them.
- **English and Russian UI**, with a language switch, separate from audio-language detection.
- Flat **neutral white/gray with blue accent**, red recording/destructive/error controls. Supersedes warm off-white/mustard proposal; no gradients or decorative effects. Exact new hex values/layout remain design proposals requiring rendered contrast/visual checks.
- Browser targets: desktop **Chrome, Edge, Firefox and Safari**, **Chrome on Android**, **Safari on iPhone**. Exact versions and real permission/capture/playback/synchronization support must be tested; target list is not passing evidence.

### 17.7 Credit research and remaining evidence

Official documentation checked during the discussion on 2026-10-20:

- [Higgsfield credit rules](https://higgsfield.ai/creator-hub/help-center/credits/how-credits-work): generation costs depend on model/resolution/duration; exact cost appears before confirmation; history shows deductions/returns. Failed generations usually receive automatic returns, with model exceptions. These are competitor rules, not Dubbed's policy.
- [Figma AI credit rules](https://help.figma.com/hc/en-us/articles/33459875669015-How-Figma-AI-credits-work): fixed consumption for some actions and variable consumption for agentic actions based on model/complexity/context. Credits need not expose underlying computation. Dubbed chose a predictable duration quote.
- [Figma additional credits](https://help.figma.com/hc/en-us/articles/35865276858647-Manage-AI-credits): subscription credit pools and capped pay-as-you-go are alternatives there; Dubbed retains the owner's one-time-pack-only decision. Competitor recurring/expiry rules were not adopted.

Remaining work is evidence and bounded policy/technical detail: real models/providers, original-speaker isolation during overlap, nonverbal detection/quality, margins/pause rules, device acoustic/sync tolerance, exact normalization/codec/browser versions, one-minute preparation benchmark definition, full costs and USD packs/stage allocations, cancellation races/reservation expiry, reversal/account-deletion balance treatment, content/reporting/trial-abuse/support policy, asset/cache/backup cleanup mechanics, and remaining toolchain/infrastructure choices. None is proven by this brainstorm. Earlier independent reviews cover their frozen inputs, not these later changed contracts. No product code, paid services, GitHub publication or executable product tests are authorized by saving these decisions.
