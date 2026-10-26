# Flow 10 — Result assembly, playback and download

Date: 2026-10-26 (Asia/Qyzylorda).
Status: synchronized specification draft; owner answers through RESULT-B01–B03 are incorporated, and only the technical, operational, copy and presentation details listed under **Decision register** remain open. Independent re-review remains separate.
Mode: specification only. No implementation, mock, rendered design, visual validation or executed test is represented by this document.

## 1. Purpose and authority

This flow lets an authenticated project owner see result assembly start after every required turn has a compatible durably accepted take, follow truthful progress, watch the latest valid finished dub, download its MP4, and use `Return to recording` to reopen Record.

The [shared frontend contract](00-shared-contract.md) governs the shell, current light visual direction, localization, service boundary and cross-flow behavior. Its latest owner decisions override conflicting older wording in BR-001 and SPEC-001. The Result flow therefore uses the compact top navigation and Record / Result workspace with no permanent sidebar, source Clean / Light working surfaces, a black video stage, mapped restrained component shadows and no gradients or ornamental effects.

Unchanged output invariants come from BR-001-R14–R18 and SPEC-001 §§4.5, 5, 7–9, AC-11–AC-17 and AC-23 where they do not conflict with the latest owner direction. Every nonempty automatically prepared turn must have a compatible durable accepted take before a new result can be assembled. A shorter accepted take remains valid. The output is MP4 up to 720p, preserves the selected section's orientation, never upscales, adds no subtitles, and keeps burned-in source captions unchanged.

The latest owner direction removes the Prepare stage, manual text/speaker/timing editing, missed-line addition and background audition from the MVP. Successful processing enters Record directly. Automatic segmentation should be as good as practical but is not guaranteed to be correct; the user records the generated turns as given or starts a new project. The permanent whole-project AI-processing lock still begins after the first accepted take. Result must not expose a hidden correction path or imply that it can repair segmentation.

This document applies both requested design skills as analysis guidance:

- `design-taste-frontend` is applied as an **app-screen** workflow: one screen question, restrained chrome, flat surfaces, honest states, a no-sidebar shell and responsive operation rather than a landing-page composition.
- `frontend-design` is applied through subject-specific hierarchy: the finished moving dub is the distinctive and largest object, while progress, provenance and next actions exist to support it.

No random style draw, implementation asset or mockup is created. The shared contract fixes the owner-approved typeface, palette, type sizes, control geometry, gutters, breakpoint and content width. Only the remaining presentation details named in §17 stay open, and this assignment permits editing only this specification.

## 2. Entry, exit and scope

### Entry

The user enters Result through one of these paths:

1. **Automatic first-complete-set handoff.** Flow 09 durably accepts the candidate that first makes every current required turn have a compatible accepted take, confirms that authoritative eligibility snapshot, automatically requests initial result assembly and opens Result. The accepted turn may close a legacy/interrupted gap anywhere in established order; no traversal back to the final turn or initial To result action is required. Normal Next blocks an empty unaccepted turn without mutation. A candidate-free compatible accepted revisit may advance; when a candidate exists, its authoritative acceptance is required before advancement, and failure/unknown outcome retains the turn without falling back to older media. Existing gaps recover at the first unfinished turn and cannot assemble until all required takes are accepted-compatible.
2. **Explicit completed-project revision handoff.** In a fully recorded project being revised, replacement `Next` actions durably accept candidates and stay in Record. `To result` explicitly requests updated assembly. If the current turn has an unaccepted candidate, Flow 09 resolves exactly `Save and go`, `Go without saving`, or `Stay` before handoff: successful save accepts before navigation; save failure stays in Record; discard preserves any older accepted take; Stay neither accepts nor navigates. Result receives accepted recordings only.
3. **Resume.** The user opens Result for a project whose result job is queued, rendering, validating, finished, failed or stale.
4. **Previous result.** The project has a valid prior finished result while replacement recording work or a replacement render exists.
5. **Recovery.** The acceptance that first completed the initial compatible set, or the explicit completed-project `To result` handoff, is already durable/authorized, but starting the result job failed or the browser lost the response.

The flow must load authoritative project, eligibility, export-job and finished-generation state before deciding which surface to show. It must not infer completion from client-side turn counts or a locally completed take.

### Successful exit

A successful result state provides:

- full playback of the latest validated finished generation, with an already playing previous result temporarily retained under §5.3 until the user chooses `Watch new`;
- download of the exact displayed generation as an MP4;
- the `Return to recording` action.

The Result screen may remain open while a replacement generation is assembled. A validated completion becomes the owner's current generation only through the generation-ordering rules in §6 and §10.

If the user remains on the screen for the matching project and operation, a valid completion may replace progress with the ready Result state in place. If the user has navigated to another section or project, completion updates authoritative project/job status without redirecting the current page; the user opens the finished project explicitly. A stale observer callback cannot steal navigation from a different current screen.

### Other exits

- Global navigation may leave Result without canceling an authoritative server-side render.
- `Return to recording` opens the first turn in established order, preserves every accepted take, starts neither capture nor assembly, and leaves turn movement to Flow 09's `Back` / `Next` controls. Result does not target the last-viewed or last turn and does not add a turn picker.

### Out of scope

- processing, editing, adding or reordering generated turns;
- capturing, accepting or replacing takes;
- a video editor, audio mixer, subtitle editor, performance score or multi-export library;
- changing resolution, format, orientation, subtitle inclusion, timing or mix parameters;
- publishing or viewing a user result by link, including any Share action/dialog, access toggle, token, copied viewing URL, anonymous viewer route or native-share replacement; these capabilities were withdrawn from the MVP;
- exposing superseded output generations as a user-managed version history;
- promising a render duration, later manual-attempt limit, storage lifetime, download limit or hosting limit that has not been approved and evidenced.

## 3. Experience principle and visual hierarchy

The screen's first question is: **Is my dub ready, and what can I do with it?**

When a current finished generation exists, the full video answers that question and is the largest element. During the first assembly, truthful job status occupies the same principal region so the layout does not jump from an unrelated dashboard to a player. During replacement assembly, show authoritative progress for the new render first and place the playable prior finished result below it, labeled `Previous version` / `Предыдущая версия`. A validated latest-authorized replacement becomes authoritative atomically, independently of the player's presented generation: if the previous result is playing, preserve that playback and show `New version ready` / `Watch new`; otherwise replace the displayed asset without autoplay. Download always follows the displayed identity.

The visual direction follows the shared light rehearsal room:

- compact top navigation and project header, with Record / Result context and authoritative save/job status;
- Mabry Pro Regular and Medium only, with no Bold or synthetic Bold: Regular 16px/24px body and dialogue text, Regular 14px/20px supporting captions, role-specific Mabry Pro Medium desktop labels from design-tokens.md, Medium 14px/20px field labels, and a Medium 32px/40px desktop / 24px/32px phone page heading;
- Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed.
- component-specific source geometry; desktop action roles in design-tokens.md and 48px phone targets;
- 8px between closely related elements, 16px between fields/buttons, 24px between blocks within the screen and 32px between major sections; 24px desktop/16px phone padding only for already-required panels;
- 32px desktop / 16px phone horizontal gutters, a 1200px maximum working-content width, one column below 768 CSS px and regular top navigation/layout from 768 CSS px;
- panel padding remains distinct from page gutters and introduces no new wrapper panel/card; no permanent sidebar, hero marketing treatment, KPI row, decorative card grid, gradient, glow, decorative shadow, all-caps styling or automatic wrapper card around every block;
Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged. 
- flat action controls, quiet grouping and one filled primary action at most in a state; the red destructive role is reserved for recording/destructive semantics and is not general Result decoration;
- progress uses text and state semantics, never animation or color alone;
- pending/loading presentation keeps the approved page, surface and text roles plus an accessible status; it never fabricates progress or uses a decorative loop;
- Mabry Pro asset availability, browser loading/fallback, browser/forced-colors behavior, rendered conformance and Result-specific progress/action geometry not implied by the common spacing roles remain unverified or open as named in §17; weights, line heights, the shared spacing scale and semantic component-state/focus treatments are resolved.

Conceptual composition, with no implied measurements:

```text
Desktop
┌ compact global navigation ─────────────────────────────────────────┐
│ project identity · Record / Result · authoritative state           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│      truthful assembly progress or black finished-result stage      │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ previous-version player below progress, when one exists             │
│ play/pause · seek · time · volume · fullscreen                      │
│ Download MP4 · Return to recording                                  │
└─────────────────────────────────────────────────────────────────────┘

Phone
┌ compact top navigation ┐
│ project + Result state │
├────────────────────────┤
│ assembly progress      │
│ or finished player     │
├────────────────────────┤
│ previous player below  │
│ when replacement runs  │
│ player controls        │
│ primary action         │
│ other actions          │
└────────────────────────┘
```

The wireframes show reading order only. They do not approve exact copy, size, spacing, sticky behavior or button order.

## 4. Screen anatomy

The Result screen contains these semantic regions in reading order.

1. **Shared project shell**
   - compact global navigation: New dub, My projects, credits balance and account;
   - project identity and Record / Result workspace context;
   - authoritative project save/result state;
   - no permanent sidebar.
2. **Result heading and generation status**
   - identifies the Result workspace without an oversized landing-page title;
   - distinguishes `assembling`, `validating`, `ready`, `failed`, `outdated` and `recordings incomplete` in plain language;
   - identifies a previous finished result as previous when current work has not produced a replacement;
   - uses plain current/previous/new-version language; generation IDs, snapshot/retry lineage and worker/provider vocabulary remain service/evidence contracts, not mandatory product explanations;
    - keeps the displayed version and Watch new / Download MP4 consequence understandable; download stays pinned to the exact displayed generation.
3. **Assembly progress**
   - reflects the authoritative Result assembly operation, separate from Flow 07 preparation progress and current-stage presentation;
   - before the service supplies a trustworthy percentage, shows `Assembling video…` / `Собираем видео…`, with no progress bar, numeric value or estimated remaining time;
   - when the service supplies a trustworthy percentage, shows one progress bar and that numeric percentage; it never derives progress from elapsed client time;
   - does not reuse Flow 07 preparation stages as Result assembly stages; any additional Result-specific stage label remains **OPEN-10-05**;
   - reconnecting or refreshing preserves the same operation identity rather than starting duplicate work.
4. **Principal stage**
   - black media stage preserving the output's orientation without cropping it to a decorative ratio;
   - shows the latest valid finished generation, except that active previous-version playback is preserved when a newer authoritative generation becomes ready;
   - during replacement assembly, sits below the new render's progress and labels the playable prior result `Previous version` / `Предыдущая версия`;
   - after successful replacement, active previous playback keeps that label and offers `New version ready` / `Watch new`; paused or inactive presentation switches to the new asset without autoplay;
   - otherwise keeps the stage footprint while showing assembly, validation, empty or recovery information;
   - never substitutes the source upload, a sample clip or a partial render for the finished result.
5. **Playback controls**
   - expose native or equivalent accessible play/pause, seeking, time, volume and fullscreen for the full selected-section output;
   - operate only on a validated finished asset;
   - expose no source/take or audio-track selector, subtitle controls, export settings or editing controls;
   - preserve full selected-section duration, including pauses and scenes outside turns.
6. **Output facts**
   - may show only authoritative facts useful to the owner, such as duration and current/previous status;
   - must not claim 720p when the preserved source is lower resolution, imply upscaling, or describe a sample fixture as the user's render;
   - exact metadata shown is **OPEN-10-05**.
7. **Actions**
   - beneath the finished player, `Download MP4` requests the exact displayed finished generation and `Return to recording` follows the established first-turn handoff;
   - `Return to recording` opens Flow 09 at the first established turn without changing any accepted take, starting capture or starting assembly;
- after the one automatic retry for a failed assembly request also fails, `Repeat assembly` / `Повторить сборку` starts an explicit user-requested attempt only for the same durably authorized exact frozen snapshot and recorded retry lineage; accepted-take changes do not implicitly authorize a new render, which requires the separate explicit completed-project `To result` path;
   - unavailable actions remain understandable, with the blocking reason available to keyboard and assistive-technology users.
8. **Inline status and recovery message**
   - sits with the failed or blocked region rather than as an unrelated global banner;
   - says whether a previous result remains safe, whether the accepted takes remain safe, and what action is available;
   - places a service-level error above the primary recovery action and preserves authoritative playback/job state after failure; Result contains no result-specific text field to which a field-level error would apply;
   - as the download-specific exception, places an app-observable MP4 request error beside `Download MP4` and retries that same finished generation without assembly or credit charge;
   - never describes a worker response as a valid result before media validation and the owner current-generation switch complete.

## 5. State model and transitions

Recording completion, output eligibility, result-job state, authoritative current finished generation and presented player generation are independent dimensions. A single `resultStatus` string is insufficient: active previous playback can coexist with a newer authoritative ready result. The presented identity is temporary UI state, never an alternative generation-ordering authority or a version library.

### 5.1 Loading authoritative context

On entry, load:

- project access and deletion state;
- current generated-turn set and eligibility revisions;
- turn count and any incompatible/missing accepted-take references;
- latest requested result operation and its frozen input snapshot;
- latest valid finished generation and whether it is output-compatible with current project work;

Keep the final layout stable while loading. Loading does not start playback, offer download, claim completion or erase an already known valid result. A lost client response must be reconciled by operation identity before another assembly request is created.

### 5.2 Automatic first assembly

After Flow 09 reports the durable acceptance that first makes every required turn authoritatively eligible, regardless of that turn's position:

1. Consume the authoritative all-turns-complete eligibility revision returned by the acceptance operation.
2. Request or reconcile one result operation for that exact eligible snapshot.
3. For ordinary candidate-bearing `Next`, automatically navigate to Result progress without requiring final-turn traversal or an initial `To result` action. When the same final-gap acceptance comes through Back/`Save and go`, `Save and leave`, sign-out or another explicit navigation guard, start/reconcile assembly in the background and complete the requested destination instead of opening Result. Neither path rolls back the accepted take if job creation or navigation fails.
4. Show `Assembling video…` / `Собираем видео…` until the service supplies a trustworthy percentage, then show the service percentage with one progress bar; show no ETA and do not reuse Flow 07 preparation stages.
5. Validate the finished media and its input provenance.
6. Atomically make the generation the owner's current result only if it is still the eligible latest requested generation for the active project.
7. Replace progress with full playback and enable download.

The trigger follows durable acceptance plus authoritative all-turn eligibility, never capture completion, draft upload, navigation or client-local counts. The trigger/operation authorization is durably recorded for the exact frozen input snapshot before an explicit exit can release recording ownership or end the session and make initiation unrecoverable. The request is idempotent: a repeated acceptance response, refresh, reconnect or route resume cannot create competing billable/current-generation truth for the same frozen input snapshot. Next blocks an empty unaccepted turn without mutation. Candidate-free compatible accepted revisits may advance, while a current candidate requires its own authoritative acceptance before advancement; failure/unknown outcome retains the turn/candidate without older-take fallback. Seeded legacy/interrupted gaps remain recoverable at the first unfinished turn, and no incomplete set starts assembly. Completed-project acceptance remains non-authorizing until explicit `To result`.

### 5.3 Completed-project revision and explicit updated assembly

A user can leave a finished result, rerecord one or more generated turns, durably accept compatible replacements with `Next`, and remain in Record. Accepting a replacement does not itself start assembly in this completed-project revision mode.

- The prior finished generation remains valid for owner playback and download while the replacement is pending, rendering, validating, stale or failed.
- Each replacement `Next` durably accepts the candidate, advances normally and stays in Record so more turns can be revised.
- Starting a rerecord never removes the prior compatible accepted take. The project remains output-eligible until a new candidate is durably accepted or authoritative validation says an accepted asset is unavailable.
- `To result` explicitly starts assembly for the current authoritative accepted-take snapshot. With an unaccepted candidate, Flow 09 first resolves exactly `Save and go`, `Go without saving`, or `Stay`; Result never receives or renders an unaccepted candidate.
- The replacement job binds immutable source, processed background, generated-turn/window and accepted-take revisions returned by the completed `To result` handoff.
- Once the latest eligible replacement validates and wins the generation fence, it atomically becomes the authoritative current result. That does not force an already playing previous asset out of the player.
- This flow does not provide a user-managed version archive. Temporary authorization for the displayed previous asset must support the playback/download presentation below; broader post-success physical retention/cleanup remains governed by SPEC-001 D08.

During replacement progress, show new-render progress first, then the prior finished player labeled `Previous version` / `Предыдущая версия`. When the latest eligible validated generation becomes ready on the matching active Result screen:

- if the previous result is playing, keep its playback, position and displayed identity uninterrupted. Show `New version ready` and the explicit `Watch new` action; the old asset remains labeled previous. Merely finishing that playback does not count as choosing Watch new;
- `Watch new` switches the player and its download target together to the authoritative new generation, resets its playhead to the beginning and remains paused. Playback requires a separate Play action; it must not reassemble or change authoritative generation ordering;
- if playback is paused or inactive when readiness arrives, replace the displayed asset with the new generation without autoplay;
- throughout the retained-previous presentation, Download MP4 requests that exact previous displayed generation. It switches to the new identity only with the player switch, never just because authoritative readiness arrived.

Refresh/new entry loads the authoritative current generation without autoplay rather than creating a persistent old-version preference. Invalid/stale completions cannot offer Watch new, and completion after navigation elsewhere remains status-only under §5.10. Detailed action geometry and Russian copy remain open; the playback/presentation behavior is settled.

### 5.4 Required recordings are incomplete or incompatible

Legacy/interrupted/reconciled state can have missing, unavailable or incompatible accepted media. This recovery does not permit normal Record Next to create gaps: an empty unaccepted turn blocks advancement and an eligible candidate must be accepted first. For an incomplete snapshot:

- do not start or continue a result operation for that ineligible current snapshot;
- identify that the project still needs a compatible recording without exposing private transcript content in a global message;
- keep the prior finished result authoritative when one exists;
- offer `Return to recording` through the Flow 09 handoff;
- keep Download bound only to the prior finished generation, never to incomplete current work;
- never fill missing voices with original dialogue or silently use invalidated takes.

`Return to recording` always opens the first turn in established order. Flow 09 then owns `Back` / `Next`, candidate recovery and any explanation of incompatible/missing recordings; Result does not add a turn list, target the last-viewed turn or silently accept a candidate.

### 5.5 Successful finished state

A generation is ready only after assembly and media validation succeed and the owner current-generation switch accepts its generation fence.

- The stage plays the complete selected-section timeline.
- Readiness never autoplays on first entry or a paused/inactive replacement. Active previous playback and the explicit Watch new transition follow §5.3; authoritative current identity and displayed identity remain distinguishable until that transition.
- The player exposes play/pause, seeking, time, volume and fullscreen. It exposes no audio-track selector, subtitle controls or export settings.
- Beneath the player, `Download MP4` returns the exact displayed generation and `Return to recording` opens Flow 09 at the first established turn under the existing handoff contract.
- The player does not add app-generated subtitles. Burned-in source captions remain part of source pixels and do not create a subtitle control.
- The UI does not promise a resolution above the actual output or source.
- Playback failure is distinct from render failure: it does not invalidate the stored generation without authoritative evidence.

### 5.6 First-result failure

If no prior finished result exists and start, render or validation fails:

- keep all accepted takes and project progress intact;
- show no fake or partial player;
- disable Download;
- describe the failed stage only at a user-action level;
- make exactly one automatic retry for the failed assembly request;
- if that automatic retry also fails, show the error and `Repeat assembly` / `Повторить сборку` for an explicit user retry;
- never loop automatic retries; exact timing/backoff and how later manual attempts receive or consume retry budget remain **OPEN-10-09**;
- do not send the user back to recording as though a take had been lost.

### 5.7 Replacement failure with a prior result

If a replacement fails:

- preserve the prior finished generation as current;
- label the replacement failure separately from the prior result's readiness;
- never swap a partial, invalid or failed asset into owner playback or download;
- make exactly one automatic retry for the failed replacement request;
- if that automatic retry also fails, keep the prior player usable, show the replacement error separately, and offer `Repeat assembly` / `Повторить сборку`;
- never loop automatic retries; exact timing/backoff and treatment of later manual attempts remain **OPEN-10-09**.

### 5.8 Stale or out-of-order completion

A completion is stale when its frozen input/request generation is superseded, the project is deleted, current eligibility changed, or a newer accepted result request owns current-generation priority.

- A stale completion may be recorded for reconciliation but cannot become the current owner result.
- Reversed completion order cannot move the project back to older takes.
- A stale success is not displayed as a successful latest result.
- If current work has a durably authorized result operation for its exact frozen snapshot and retry lineage but lacks an active current request, recovery may reconcile or resume that authorized operation idempotently; it must not reuse incompatible bytes. Eligibility alone is not authorization to assemble a completed-project revision.

### 5.9 Empty and zero-turn boundaries

An empty Result context has no valid finished generation and no active result job.

- If a nonempty project has a durable initial-acceptance trigger or completed-project `To result` authorization bound to its exact eligible frozen snapshot and retry lineage, reconcile the missing assembly-start operation and enter progress. A merely eligible snapshot with no such durable authorization cannot start assembly from Result recovery.
- If it is ineligible, show the blocked-by-recordings state and hand off to Record.
- Initial processing with zero generated turns and no prior usable nonempty preparation cannot enter Record or Result or create a result operation. The processing-owned recovery surface shows `No dialogue found` / `Реплики не найдены` and offers eligible whole-project reprocessing under the existing quote, credit and included-retry rules or choosing another video.
- A zero-turn reprocessing output never replaces a prior usable nonempty preparation or its unaccepted draft. Preserve that active preparation/draft, report that the new attempt found no dialogue, and allow continued Record work against the preserved turns under Flow 09. The zero-turn attempt itself is not an eligible result snapshot and cannot create a result operation; any later Result handoff must meet the normal accepted-compatible-take and durable-authorization requirements for the preserved nonempty preparation.
- The charge for the completed zero-turn processing attempt is unchanged. This decision adds no refund, free retry or entitlement.
- Do not offer manual turn addition, a speech-free result, the source clip as a result, or any claim that dubbing is complete.

### 5.10 Leaving, refresh and cancel semantics

- Refreshing, closing the tab, losing connectivity or using global navigation does not cancel a server-owned result operation.
- Assembly continues in the background after leaving Result. Returning later, including through My projects, restores authoritative job and finished-generation state.
- A completion may transition progress to ready only while the current screen still matches that project, operation and valid lifecycle. After navigation elsewhere, it updates authoritative status only and cannot redirect; stale callbacks cannot navigate or replace state for the currently open section/project.
- Result exposes no Cancel assembly control. Navigation away does not cancel or restart the job, discard recordings or prevent later retrieval. Project/account deletion follows its own lifecycle and is not an assembly-cancel shortcut.
- The MVP sends no result-completion email or push notification and requires no new notification UI for this rule. The user checks authoritative status after returning to the application; registration-verification and password-recovery emails are separate authentication behavior.
- A client disconnect is not a render failure, cancellation confirmation or reason to create another job blindly.

## 6. Generation, eligibility and owner-current invariants

1. **Frozen inputs.** Each result operation references immutable source, selected-section timeline, processed background, generated-turn/window and accepted-take identities.
2. **All-turn eligibility.** Every turn in a nonempty generated turn set must have one compatible durable accepted take. Usable interrupted shorter takes remain compatible when explicitly accepted under Flow 09; dialogue capture normally runs to fixed-window auto-stop without a manual Stop.
3. **Authoritative compatibility.** The frontend does not infer take compatibility from duration, timestamps or opaque revision-number equality. It consumes the recording/export service's eligibility result for the generated turn set.
4. **One continuous mix.** The full selected-section video and one continuous processed background are combined with accepted takes at their original positions, including overlap and dialogue-free intervals. Do not duplicate per-turn background, time-stretch performances, extend the video or intentionally restore original voices.
5. **Immutable finished bytes.** Later accepted-take replacements do not mutate an earlier finished asset. They create a newer frozen output snapshot.
6. **Monotonic owner-current switch.** Only the latest eligible requested generation can become the owner's current result. A late older completion cannot replace it.
7. **Prior-result protection and presentation.** A finished generation remains authoritative until a newer eligible generation validates and switches atomically. Failure/stale completion leave it untouched. After valid authoritative replacement, already playing previous media remains temporarily presented until Watch new; paused/inactive presentation swaps without autoplay. Playback and Download MP4 always target the displayed generation, with authorized access retained for that presentation. Presentation cannot reverse authoritative ordering.
8. **Deletion fence.** A deleted or inaccessible project cannot be revived or restored as current by a late result completion.
9. **No fixture confusion.** A fixed sample MP4 used by a frontend mock is not evidence that accepted takes were mixed, that a custom upload rendered, or that production export works. The additive #72 portrait result fixtures remain synthetic with `productRendered:false` and `assembledFromAcceptedTakes:false`: preview/preparation selection requires exact source ID/revision/SHA-256/byte length, and the first successful private `StoredAuthorization` ACK preserves that source fingerprint for result selection across later source edits/replays. Public `AssemblyAuthorization` stays unchanged. The [issue 72](https://github.com/dystrophyless/dubbed.ai/issues/72) records the fixture and its limits; native product-journey proof remains with #63.
10. **Bounded automatic retry.** Each failed assembly request receives exactly one automatic retry. A second failure becomes an explicit-recovery state; no client or service loop may create further automatic attempts.
11. **Durable authorization before recovery.** Initial completion authorizes one frozen snapshot through its durable final-gap acceptance trigger; a completed-project revision authorizes one through explicit `To result`. Result recovery may reconcile only that authorization and its recorded retry lineage. Eligibility without authorization cannot create a revision assembly.

## 7. Failure and recovery behavior

| Condition | Required Result behavior |
|---|---|
| Durable initial-acceptance trigger or completed-project `To result` authorization exists for a frozen snapshot but the assembly-start response fails | Keep the take accepted. Reconcile the idempotent authorized operation and its retry lineage; show a recoverable Result state, never a recording rollback. Eligibility alone cannot create a replacement request. |
| Job queued/running with lost status connection | Keep last authoritative state, show reconnection status, and poll/subscribe again using the same operation identity. Do not label the job failed from silence alone. |
| Assembly start, render worker, storage or other authoritative assembly failure | Preserve accepted takes and the prior finished result. Make exactly one automatic retry for the failed request. If it also fails, show a recoverable error and `Repeat assembly` / `Повторить сборку`; never begin another automatic attempt. |
| Output media fails validation | Treat the operation as failed and apply the same one-automatic-retry rule; never enable playback/download for that asset. Preserve prior result. |
| Generated-turn set or accepted-take revision changes during render | Fence the completion. Do not publish it for the changed project state; return to Record if current work is ineligible. |
| Older and newer jobs finish in reverse order | Only the current-generation authority may advance the owner's current result; the older completion remains stale. |
| Finished-player network/media error | Keep the generation record intact, retry playback or refresh its secure descriptor. Do not rerender unless authoritative validation says the asset is invalid. |
| App-observable MP4 download request fails or delivery authorization expires | Keep the player and accepted recordings intact; show the error beside `Download MP4`; retry or refresh authorized access to the same finished generation. Do not reassemble or charge credits. Do not claim an unobservable operating-system save failure or successful local saving from request initiation alone. |
| Authentication expires | Preserve server-side work, require reauthentication for owner actions, then restore the same project/result context if authorized. |
| Project becomes deleted/inaccessible | Stop owner playback/actions and follow project deletion/access behavior. Late job completion cannot restore access. |
| Browser closes or phone suspends | Server-side assembly may continue. On return, restore job or finished state from the service. |

Failures must say which user-owned work remains safe. They must not claim that an upload, accepted take, render or download succeeded solely because a local animation completed.

## 8. Download contract

`Download` is available only for a validated finished generation that the current account may access.

- Request the exact generation shown in the player, not an unfenced “latest file” URL cached before state refresh.
- While previous playback is retained with New version ready / Watch new, request that previous displayed generation even though a newer result is authoritative. Watch new switches player/download identity together. Freeze each download request to the displayed identity at activation; a later player switch cannot retarget that in-flight request or its same-generation retry.
- The delivered artifact is MP4, no more than 720p, with source orientation preserved and no upscaling.
- The selected-section duration and timeline remain intact. No app-generated subtitle track or burn-in is added.
- A generated filename, expiry duration, download count/traffic limit and offline-retention promise are not selected in this flow.
- A failed download does not invalidate the generation or start a new render.
- An app-observable request failure appears beside `Download MP4` and permits retry of the same finished generation without a credit charge. Expired delivery authorization may be refreshed for that same asset.
- The application does not claim to observe an operating-system save failure the browser does not report, and request initiation alone is not presented as proof that the file was saved locally.
- Signed or private media descriptors must not be exposed in application logs, analytics or error copy.

Actual export-byte verification requires a real media pipeline. A browser download of a bundled fixture proves only the download UI and transport adapter used in that test.

## 9. Download-only distribution boundary

Result provides authenticated owner playback and MP4 download only. The owner may distribute the downloaded file outside the application. The MVP does not publish or expose user results through a link and does not provide a Share button/dialog, access toggle, share token, copied viewing URL, anonymous viewer route, native-share menu or external publishing integration. Withdrawn Flows 13 and 14 create no Result dependency or handoff.

## 10. Logical service contract

The frontend uses the centralized interchangeable services facade. Names below describe responsibilities, not endpoints, stores or implementation modules.

### Load Result context

**Input:** account/session context and project ID.

**Result:** authorized project summary; current generated-turn-set and eligibility revision; turn count; authoritative eligibility state and reason category; current result request/job identity and state; latest authoritative valid finished generation and revision; generation-specific current/previous designation; output metadata; deletion/access state. Playback/download descriptors identify their exact generation independently from the latest authoritative association, so authorized temporary previous presentation cannot masquerade as current truth.

**Errors:** unauthorized/not found/deleted, processing unavailable, temporary service failure, inconsistent state requiring reconciliation.

### Ensure result assembly

**Input:** project ID; initiation mode (`initial-sequence-completion` or `completed-project-to-result`); durable authorization/trigger identity; authoritative eligible snapshot identity; frozen source/background/turn/take mapping reference; expected latest request/current-generation revision; idempotency identity; existing retry-lineage identity when reconciling or retrying.

**Success:** existing or newly created result operation identity, frozen-input provenance and authoritative initial job state.

**Errors:** zero-turn/ineligible snapshot, incomplete/incompatible takes, stale eligibility/request revision, missing asset, deleted/inaccessible project, operation creation failure, service unavailable. A zero-turn candidate snapshot cannot be assembled. If no prior usable nonempty preparation exists, route to processing-owned `No dialogue found` recovery; if a zero-turn reprocessing attempt preserved prior usable turns/draft, retain that active preparation and its Record continuation rather than excluding the project from Record/Result. Assembly eligibility and authorization apply to the preserved nonempty snapshot, never the zero-turn attempt.

For initial sequence completion, the input follows the durable acceptance that first establishes authoritative all-required-turn eligibility, even when the accepted final gap is in the middle of established order. Flow 09 invokes it automatically: ordinary candidate-bearing `Next` opens Result, while Back/`Save and go`, `Save and leave`, sign-out or another explicit navigation guard records/reconciles the trigger before exit and completes the requested destination with background assembly. Final-turn traversal and an initial `To result` command do not exist. Navigation over an unrecorded turn, reaching the end with a gap, capture completion, draft upload, local counts or any other ineligible/non-authoritative signal cannot invoke it. For completed-project revision, Flow 09 resolves the `To result` candidate guard before calling this command and supplies accepted takes only. Eligibility or replacement `Next` alone is not revision authorization. The command cannot repair, accept, choose or persist takes, and it cannot replace a previous finished generation at request time.

### Observe result operation

**Input:** project ID and result operation identity.

**Events/result:** queued/rendering/validating/finished/failed/stale state; an optional service-supplied percentage explicitly trustworthy for display as overall Result assembly progress; recoverability category; finished generation identity only after validation and current-generation disposition. The contract supplies no ETA, and the client does not manufacture progress or import Flow 07 preparation stages; any additional Result-specific stage field remains **OPEN-10-05**.

**Errors:** unauthorized, unknown operation, temporary connection failure. A missing update is not success or failure.

An observer result updates authoritative project/job state independently of navigation. The UI may apply the ready-state handoff in place only when its current project, operation and lifecycle still match the observation; otherwise it stores/reloads status without redirecting. A stale callback is ignored for navigation and cannot replace another project's current screen.

For a matching valid replacement, the client separately checks actual player state at readiness: playing previous media retains its presented identity/playback and exposes New version ready / Watch new; paused/inactive presentation switches without autoplay. The observation never rewinds active previous playback or silently retargets its download. Watch new resolves the authoritative ready generation, switches presentation/download together, resets to its beginning and remains paused until separate Play, without an assembly command. Stale/deleted/inaccessible results cannot become pending Watch new targets.

### Load finished playback

**Input:** project ID and exact displayed finished generation identity, including an authorized previous asset temporarily retained after a newer generation becomes authoritative.

**Result:** authorized playable descriptor, duration, dimensions/orientation, actual output resolution and media validation identity.

**Errors:** unauthorized, revoked/deleted/unavailable asset, expired descriptor, temporary delivery failure, invalid media. Expired delivery credentials may be refreshed without rerendering.

### Request result download

**Input:** project ID and exact displayed finished generation identity frozen at Download MP4 activation, including the temporarily presented previous generation; retry uses that original request identity even if the player later switches.

**Result:** authorized download descriptor and truthful metadata for that generation.

**Errors:** unauthorized, generation unavailable, expired descriptor, temporary delivery failure. An observable failure is returned distinctly enough to show beside the download action. Retrying or refreshing expired authorization targets the same finished generation, starts no assembly and incurs no credit charge; the contract does not claim an operating-system save outcome the browser cannot report.

### Retry result assembly

This is either the single automatic retry for an authoritatively failed assembly request, an explicit user attempt after that automatic retry also failed, or reconciliation of an uncertain existing attempt. Inputs and result mirror `Ensure result assembly`; every path requires the same durable authorization, exact frozen snapshot and recorded retry lineage. The service records retry lineage so refresh/reconnect cannot reset the automatic-retry count, switch to a newly eligible but unauthorized snapshot or create a loop. Retry cannot overwrite a prior finished generation before a newer result validates and becomes the owner's current result. Exact retry delay/backoff and the retry budget or treatment for later manual attempts remain **OPEN-10-09**.

### Return to recording

**Input:** authorized project identity and the intent to return from Result.

**Handoff:** Flow 09 opens the first turn in established order, preserves every accepted take and starts neither capture nor assembly. The handoff carries no turn override, candidate acceptance or render command.

### Background status and notifications

Result observes or reloads the authoritative operation through the existing context/operation contracts. Observation carries no global redirect command: matching active-screen presentation is a guarded client transition, while background completion only updates authoritative status. There is no cancel-assembly command, completion-email or push-notification request, or mandatory new notification-UI service in the MVP surface.

## 11. Persistence, ownership and concurrency

- The backend/export boundary is authoritative for result-job state, frozen input provenance, media validation and the owner current-generation switch.
- Result UI state tracks the displayed generation separately from the authoritative current generation and may retain an actively playing previous asset with a pending new-version action. It cannot decide eligibility/current authority from local turn arrays, delay publication to wait for playback or turn presentation retention into version history.
- A finished generation is immutable. The project stores a current finished-generation association separately from the latest job and latest accepted-take snapshot.
- The previous current generation remains associated while replacement is pending or failed. After success, authorized delivery must still support any retained active previous presentation and its exact-generation download/retry; it is no longer the authoritative current association. Broader retention and cleanup remain operational policy, not a version-library promise.
- Duplicate starts and retries use stable operation/idempotency identities. A timeout is reconciled before a new operation is issued.
- Out-of-order completions, stale take snapshots, account/session changes and project deletion are checked before changing the owner's current result.
- Download and owner playback are authorized account actions.
- Project deletion makes the owner result inaccessible according to the project/deletion contracts.
- Leaving Result or returning to Record does not cancel assembly or mutate a finished generation. The job remains observable from Result and summarized by My projects.
- Account-owned unaccepted recording drafts remain Flow 09 data: they are recoverable across devices after sign-in, have no inactivity expiry, and are never automatically accepted by entering or leaving Result. Result does not claim that recovery until persistence is authoritative.

### Ownership boundary with Record and processing

The processing boundary owns the generated turn set and its fixed windows. Record owns accepted-take persistence and the action that makes current work eligible. Result consumes only the authoritative eligibility snapshot and reason categories. It may point the user back to Record, but it must not:

- mark a take compatible;
- select a replacement take;
- edit, add, remove or retime generated turns;
- choose an original-voice fallback;
- silently assemble an older eligible snapshot as though it represented current work.

If automatic segmentation is poor, Result offers no correction workflow. The user records the generated turns as given or starts a new project through the separately owned project-entry flow. Whole-project AI processing remains permanently locked after the first accepted take.

Flow 11 My projects may summarize result state, but Result and the export/current-generation service remain the detailed owner surface and truth for generation progress. For a resumable project with a prior result, `Continue` opens Record at the first turn without an accepted take when unfinished recordings remain and opens Result only when no unfinished takes remain. No completion email or push substitutes for this in-app status.

## 12. Desktop, phone and input behavior

### Desktop

- The black video/result stage is the largest region when a finished result is available.
- Progress/recovery occupies that principal region during a first assembly so the later player does not cause a major layout jump.
- Result actions remain near the stage and status they affect; they do not become a detached dashboard toolbar.
- From 768 CSS px, use regular top navigation, 32px horizontal gutters and up to 1200px working-content width without a permanent sidebar or a narrow centered marketing column.
- The page heading is 32px; standard controls use source desktop density with component-specific source geometry. Exact stage width within the 1200px cap, aspect-fit treatment, action-row arrangement and prior-result/progress geometry remain open Result-specific details.

### Phone

- Below 768 CSS px, use one column, 16px horizontal gutters, a 24px page heading and 48px standard controls with component-specific source geometry.
- Use the shared signed-in compact phone header: logo at left; balance and menu at right; menu entries New dub, My projects, Credits, Account, language and Sign out; no persistent sidebar.
- Stack heading/status, stage, playback/progress and actions in semantic order with no page-level horizontal scrolling.
- Preserve portrait, landscape and square source orientation inside the stage without cropping or forcing a fixed decorative ratio.
- Controls used during playback and recovery use the approved 48px phone control height and remain operable by touch.
- The main action for the current state appears without requiring horizontal action scrolling. Secondary actions may wrap or stack while retaining their labels.
- System browser backgrounding does not imply render cancellation. On resume, refresh authoritative status.

### Keyboard and assistive technology

- Heading, status, stage/player, progress/recovery and actions follow the same logical DOM and focus order as the visual reading order.
- All player, download, retry and return actions are keyboard operable with visible focus on both light surfaces and the black stage.
- Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed.
- Assembly state changes use a restrained live region. Frequent progress updates must not repeatedly interrupt the user; terminal ready/failed/stale outcomes are announced once.
- When a trustworthy service percentage exists, the progress control exposes that value and an accessible label. Before it exists, the exact assembling message is announced without rendering a progress bar or fabricated numeric value.
- Current, previous and outdated result status is conveyed in text, not color alone.
- Disabled actions expose the reason through adjacent text or an accessible description rather than a hover-only tooltip.
- Video has an accessible name and standard time controls. No subtitle control is promised when the product has added no subtitles.
- System reduced-motion disables interface transitions. It does not remove progress or state feedback, and video playback plus time-synchronized audio/playhead movement remain functional.
- Capture, save acknowledgement and navigation never wait for an animation to complete.
- After a successful retry transitions into progress, focus remains stable unless a blocking error requires focused guidance.

## 13. Visible language and localization

The interface supports English and Russian. With no preference, browser language `ru` selects Russian and other browser languages select English. A manual language choice persists to the signed-in account; an explicit pre-sign-in choice overrides and updates a different saved preference, while a browser-derived default does not overwrite the saved account preference. Project titles and user content may mix Cyrillic and Latin scripts. System copy uses sentence case, plain verbs and one name per action through pending, success and failure states.

Confirmed action concepts are:

- Download;
- Return to recording;
- Repeat assembly / Повторить сборку, after the single automatic retry also fails.
- New version ready / Watch new, when replacement readiness arrives during previous-version playback.

The interface must communicate these facts when applicable:

- the result is being assembled or validated;
- accepted recordings remain saved;
- a previous finished result remains available and is not the new version;
- current project work needs one or more compatible recordings;
- assembly failed and whether retry is available;
- download failed without invalidating the result;
- a result is ready and is the current generation.

The confirmed Result copy includes `Assembling video…` / `Собираем видео…`, `Previous version` / `Предыдущая версия`, `Repeat assembly` / `Повторить сборку`, and the zero-turn message; confirmed English labels include `Download MP4`, `Return to recording`, `New version ready` and `Watch new`. Remaining Russian labels (including new-version readiness/action), error text and previous/outdated terminology are **OPEN-10-06**; any additional Result-specific stage label is **OPEN-10-05**. Result exposes no ETA. Service errors appear above the primary recovery action and preserve current authoritative state; Result has no result-specific text-entry field requiring a field error. Working translations in a prototype or mock are placeholders and cannot be treated as approved copy. Internal terms such as generation fence, blob, worker, callback, codec or object storage do not appear in user-facing messages.

## 14. Acceptance criteria

All criteria are unexecuted. A criterion marked **BLOCKED** cannot pass until its named open decision is resolved.

- [ ] **AC-10-01 Assembly handoffs:** the first durable acceptance that makes every required turn authoritatively eligible records/reconciles one initial assembly operation even when the accepted final gap is in the middle of turn order; no final-turn traversal or initial button is required. Ordinary candidate-bearing `Next` opens Result. Acceptance through Back/`Save and go`, `Save and leave`, sign-out or another explicit navigation guard durably records/reconciles the trigger before exit/release and starts background assembly while the requested destination wins. Capture, drafts, navigation and local counts cannot trigger it. Empty unaccepted Next is blocked without mutation; compatible accepted candidate-free revisits may advance. A present candidate must itself be authoritatively accepted before advancement; failure/unknown outcome retains current turn/candidate, without older-take fallback. Legacy/interrupted gaps recover at the first unfinished turn; no assembly is allowed until all required takes are accepted-compatible. In a completed-project revision, replacement `Next` accepts and stays in Record; only explicit `To result`, after the exact `Save and go` / `Go without saving` / `Stay` candidate guard when needed, durably authorizes the frozen all-accepted snapshot and starts/reconciles updated assembly. Eligibility alone is not revision authorization.
- [ ] **AC-10-02 Eligibility:** a nonempty generated turn set assembles only when every turn has a compatible accepted take; shorter accepted takes remain eligible. Result consumes authoritative compatibility and exposes no manual turn-edit path.
- [ ] **AC-10-03 Zero-turn recovery:** initial zero-turn processing without prior usable nonempty preparation shows `No dialogue found` / `Реплики не найдены`, offers eligible reprocessing or another video and cannot enter Record/Result. A zero-turn reprocessing attempt over prior usable nonempty preparation preserves that preparation and unaccepted draft, reports no dialogue for the new attempt and permits continued Record work against the preserved turns. Neither case assembles the zero-turn output, offers a speech-free result or exposes manual turn addition. Completed-attempt charging and retry consumption remain unchanged; any Result handoff for preserved turns still requires normal authoritative eligibility and durable authorization.
- [ ] **AC-10-04 Truthful progress:** queued/rendering/validation state comes from the authoritative operation and survives refresh/reconnect. Before a trustworthy service percentage exists, Result shows `Assembling video…` / `Собираем видео…`, with no bar, numeric progress or ETA; when one exists, it shows one progress bar and that service percentage without client estimation. Flow 07 preparation stages are not presented as Result assembly stages.
- [ ] **AC-10-05 Complete media:** the finished output preserves the complete selected-section duration, orientation, pauses, dialogue-free scenes and overlapping takes with one processed background, no stretching, no intentional original-dialogue fallback and no added subtitles.
- [ ] **AC-10-06 Delivery format and retry:** the downloadable artifact is a validated MP4 at no more than 720p, never upscaled, and download targets the exact generation shown in the player. An app-observable request failure appears beside `Download MP4`; retry or refreshed authorization uses that same generation without assembly or credit charge, preserves the player/accepted recordings and makes no unobservable operating-system save claim.
- [ ] **AC-10-07 Current playback:** full playback is enabled only for validated finished media and provides play/pause, seeking, time, volume and fullscreen, with `Download MP4` and `Return to recording` beneath the player. It provides no audio-track selector, subtitle controls or export settings; player delivery failure is recoverable without silently starting a new render or changing generations.
- [ ] **AC-10-08 Prior result:** a prior finished result remains authoritative for owner playback/download while a replacement is pending, stale or failed, and changes only after an eligible validated replacement switches atomically.
- [ ] **AC-10-09 Prior-result presentation:** during replacement assembly, show new-render progress above a playable prior result labeled `Previous version` / `Предыдущая версия`. A latest eligible validated success switches authoritative current generation atomically. If previous playback is active at readiness, preserve its playback/position/display identity and offer New version ready / Watch new; no automatic swap occurs. If paused/inactive, display the new asset without autoplay. Watch new switches player/download together to the new authoritative generation, resets to its beginning and stays paused until separate Play, without reassembly. Failure/stale completion never produces a new-version offer or disrupts prior playback.
- [ ] **AC-10-10 Failure recovery:** start/render/validation failure preserves accepted takes and any prior result, makes exactly one automatic retry for the failed request, then shows `Repeat assembly` / `Повторить сборку` after a second failure without duplicate operations or an automatic retry loop. Recovery/retry must reuse the durable initial-trigger or completed-project `To result` authorization, exact frozen snapshot and recorded retry lineage; a newly eligible snapshot alone cannot authorize assembly.
- [ ] **AC-10-11 Generation fencing:** reversed, duplicate, stale and post-deletion completions cannot replace a newer current owner result or restore deleted access.
- [ ] **AC-10-12 Background resume, navigation and notification scope:** refresh, disconnect, tab close and navigation preserve background assembly and restore authoritative job/result state. Only a screen still matching the completed project/operation/lifecycle may transition to ready in place; completion after the user leaves updates status without redirecting, and stale callbacks cannot steal navigation from another section/project. Result has no Cancel assembly action, completion email/push or mandatory new notification UI.
- [ ] **AC-10-13 Return-to-Record handoff:** `Return to recording` opens the first established turn, preserves every accepted take, starts neither capture nor assembly, and adds no turn list or last-turn override.
- [ ] **AC-10-14 Download-only distribution:** Result exposes no Share action/dialog, access toggle, share token, viewing URL, anonymous result route, native-share replacement or external publishing integration. The user can distribute only the downloaded MP4 outside the app.
- [ ] **AC-10-15 Output privacy:** owner playback/download require project authorization and expose no source, transcript or take asset through the Result delivery contract.
- [ ] **AC-10-16 Responsive contract:** below 768 CSS px Result uses the signed-in mobile header, one column, 16px gutters, 24px heading and 48px phone control targets; from 768 CSS px it uses regular navigation, 32px gutters, 32px heading and approved desktop action roles in design-tokens.md; working content is capped at 1200px, media orientation is preserved and the page does not scroll horizontally.
- [ ] **AC-10-17 Accessibility and motion:** Player/progress keyboard operation, restrained live announcements, disabled reasons and previous/current generation identity satisfy §12 with no color-only or animation-only meaning. Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed. Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.
- [ ] **AC-10-18 Localization — BLOCKED by OPEN-10-06:** English and Russian cover ready, progress, blocked, stale, previous-result, failure, retry and download states with approved equivalent meaning and mixed-script project content.
- [ ] **AC-10-19 Mock truth:** a frontend mock/sample identifies its MP4 as a fixed fixture and never claims it was rendered from accepted takes or a custom upload.
- [ ] **AC-10-20 Production evidence boundary:** real assembly/export is accepted only with backend/worker/storage and media evidence; frontend state tests and fixture playback alone cannot pass the real output contract.
- [ ] **AC-10-21 Shared presentation:** Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed.
- [ ] **AC-10-22 Locale and service errors:** first-use and account locale precedence follows §13; service failures appear above the primary recovery action except that an app-observable MP4 request failure appears beside `Download MP4`. Failures preserve current playback, accepted recordings and authoritative job state.
- [ ] **AC-10-23 Displayed-generation download:** while previous playback is retained after a newer generation becomes authoritative, Download MP4 requests the exact previous displayed generation, with authorized access preserved for that presentation. Only the player switch changes future download targets. Each request/retry remains frozen to its activation-time displayed identity, including after Watch new; no latest-generation substitution, render or credit charge occurs.

## 15. Verification plan

No verification in this section has been executed. Record the command or manual procedure, environment/browser/device, date, project and operation revisions, input media/take identities, expected and actual result, and evidence location. Separate mock/frontend proof from real media-pipeline proof.

### Contract and state tests

- Cover every state combination that matters: no prior result/first render; prior result/replacement render; incomplete or incompatible recordings; failed/stale job; validated finished generation; deleted/inaccessible project.
- Verify eligibility matrices for missing/unavailable/incompatible take, shorter accepted take and accepted replacement take. For initial zero turns without prior usable nonempty preparation, verify `No dialogue found`, eligible reprocessing/another-video actions and no Record/Result entry. Separately complete zero-turn reprocessing over prior usable nonempty preparation with an unaccepted draft: prove the prior preparation/draft remains active, the no-dialogue notice refers to the new attempt, Record continuation remains available and the zero-turn output never becomes an assembly snapshot. In both cases verify unchanged completed-attempt charging/retry consumption and no manual-add or speech-free-output path; any later assembly of preserved turns must still have normal eligibility and durable authorization.
- Verify duplicate start/retry and uncertain response reconciliation use one durable authorization, operation identity, frozen snapshot and retry lineage. Present a different eligible snapshot without an initial trigger or completed-project `To result` authorization and prove Result recovery creates no operation.
- Verify an assembly operation without a trustworthy service percentage shows `Assembling video…` / `Собираем видео…` and no progress bar, number or ETA. Then supply a trustworthy percentage and verify one progress bar exposes exactly that service value without an elapsed-time estimate or client-generated progress. Do not reuse Flow 07 preparation stages as Result assembly stages or treat an unapproved Result stage label as settled.
- Verify ordinary candidate-bearing `Next` that completes all-required-turn eligibility durably starts one assembly and opens Result. Repeat with the final gap accepted in the middle of turn order in a legacy/interrupted project with later accepted turns and prove there is no required traversal or initial action. Then accept the final gap through Back/`Save and go`, `Save and leave`, sign-out and another explicit guard; prove the same trigger is durable before exit/release, assembly runs in the background and each requested destination wins. Prove save/trigger uncertainty stays for retry/reconciliation and accepted work is not rolled back. Prove capture completion, draft upload, navigation and local counts do not trigger assembly. Separately verify blocked empty unaccepted Next without mutation, allowed compatible accepted candidate-free revisits, and candidate acceptance before advancement, including failure/unknown retention without older-take fallback. Seed legacy/interrupted gaps rather than creating them through Next; prove first-unfinished recovery and no assembly until all required takes are accepted-compatible. In a completed-project revision, verify replacement `Next` stays in Record and creates no assembly request. Verify explicit `To result` durably authorizes and starts one updated frozen-snapshot assembly only after each of `Save and go`, `Go without saving`, and `Stay` behaves exactly as specified, including save failure and preservation of the older accepted take on discard.
- Force an authoritative assembly failure and prove one automatic retry occurs against the same durable authorization and frozen snapshot. Fail that retry and prove no further automatic attempt occurs, the error exposes `Repeat assembly` / `Повторить сборку`, refresh does not reset the retry lineage, and an explicit attempt continues that same authorization, exact frozen snapshot and lineage rather than assembling a merely current eligible snapshot. Change an accepted take after the failure and prove `Repeat assembly` does not authorize that changed snapshot; the completed-project revision requires its separate explicit `To result` authorization.
- Complete two result jobs in reverse order and prove only the newest eligible requested generation becomes current.
- Complete a valid replacement while the previous result is playing at a nonzero time: prove authoritative current identity advances but playback, position and displayed identity remain unchanged; New version ready / Watch new appears, and download still returns the previous displayed generation. Activate Watch new and prove player/future-download identities switch together to the new beginning, remain paused and require separate Play, without assembly. Repeat readiness while paused and while inactive: the new asset displays without autoplay. Verify first entry/reload uses authoritative current without autoplay, stale callbacks cannot replace presentation or create a Watch new target, and no user-managed version history is introduced.
- Change the authoritative generated-turn-set or accepted-take snapshot during rendering through controlled service fixtures and prove the old completion is fenced from the owner's current-generation state.
- Delete the project during rendering and prove late completion cannot restore playback or download.
- Leave Result through workspace navigation, browser close and `Return to recording`; prove assembly continues, no duplicate/restart occurs, My projects/Result later restore the operation, no Cancel action exists, and no completion email/push or mandatory notification-UI request is emitted. Complete the job while viewing another section/project and prove only authoritative status updates, with no redirect. Then complete while the matching project/operation screen remains active and prove its progress may transition to ready. Deliver stale callbacks after both cases and prove they cannot steal navigation or replace the current screen.

### Real media assembly and export

- Use an appropriately permitted source with dialogue-free intervals, multiple turns, overlaps, explicitly accepted usable interrupted partial takes and a portrait or square orientation case; normal dialogue capture uses full-window automatic completion without manual Stop.
- Assemble from actual accepted-take assets and the actual processed background; compare output duration/timeline and source orientation, and listen for aligned overlaps, continuous background, unused shorter-take silence and absence of intentional original-dialogue fallback.
- Inspect the real MP4 container, dimensions, orientation handling, duration and resolution; prove no upscaling and no app-added subtitle track/burn-in.
- Validate the finished asset before it becomes authoritative current, then compare each download's identity/bytes or authoritative checksum to its activation-time displayed asset. Exercise both a temporarily retained previous player after authoritative replacement and the new player after Watch new; never equate current authority with displayed identity during that interval. Start an old-generation request, switch presentation, fail/retry or refresh its expired descriptor and prove the request remains pinned to the old identity.
- Fail an app-observable MP4 request and prove the error appears beside `Download MP4`; retry and expired-authorization refresh must target the same finished generation, preserve player/takes, create no assembly request and consume no credits. Separately document that an unreported operating-system save failure and completed local saving cannot be inferred from request initiation.
- During replacement assembly, prove the previous finished result remains playable below new-render progress with the exact `Previous version` / `Предыдущая версия` label. Repeat with a failed/invalid render and prove the prior valid asset remains owner playback/download truth through the single automatic retry and manual-fallback state.

These checks require a backend, render worker, storage/delivery integration and representative media. None currently exists as production proof. Candidate model/render/export technology remains unselected and unverified.

### Browser and responsive interaction

- Exercise first assembly, replacement assembly with a playable labeled previous version, ready playback, recordings-incomplete, the single automatic retry followed by manual `Repeat assembly`, expired playback descriptor and failed download at desktop, tablet and supported phone widths.
- In ready playback, exercise play/pause, seeking, time, volume and fullscreen; verify `Download MP4` and `Return to recording` sit beneath the player and that no audio-track selector, subtitle controls or export settings appear. Preserve `Repeat assembly` only in its approved error state.
- Verify portrait, landscape and square media fit without cropping, page-level horizontal overflow or hidden actions.
- Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed.
- Use keyboard-only and screen-reader checks for heading order, player controls, progress semantics, terminal announcements and action availability/reasons.
Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.  Under reduced motion, verify interface transitions are disabled while video/audio/playhead remains functional, and prove save acknowledgement/navigation never wait for animation. Also check high zoom, long English/Russian status text and mixed-script project names.
- Verify first-use locale for browser `ru` versus other languages, saved account preference reuse, explicit pre-sign-in choice overriding/updating a different saved preference, and browser-derived default not overwriting it.
- Trigger assembly and playback service errors; verify placement above their primary recovery actions, preservation of authoritative state and absence of invented field-level errors. Trigger an app-observable MP4 request failure separately and verify its error and retry beside `Download MP4` under the download-specific contract.
- Verify reconnect/reload restores the same operation rather than starting a duplicate.

### Owner authorization and download-only scope

- Attempt cross-account owner playback/download; both must be denied.
- Verify project/account deletion disables owner playback/download separately from later physical cleanup evidence.
- Verify Result exposes no Share control or public-result route/service handoff and that the downloaded MP4 is the only in-scope distribution artifact.

### Mock and fixture boundary

A UI-only adapter may simulate queued, rendering, validating, ready, failed and stale states, including both absence and presence of a trustworthy service percentage, and may serve a fixed MP4 fixture. It may also simulate authoritative eligibility becoming complete after durable acceptance at any turn position, matching and nonmatching current project/operation screens, stale callbacks, a prior finished result below replacement progress and an app-observable download-request failure for the same fixture generation. Its interface and tests may prove the guarded active-screen readiness transition, status-only background completion with no redirect, stale-callback navigation fencing, automatic initial transition without final-turn traversal/button, absence of a trigger from capture/draft/navigation/local counts, exact no-value message, conditional progress-bar/percentage presentation, player/action composition, adjacent download-error/retry wiring, localization coverage and accessibility mechanics. Evidence must label the asset as a fixture and state explicitly that it was **not rendered from accepted takes or a custom upload**. It cannot prove that simulated eligibility or a simulated percentage is authoritative/trustworthy, cross-device delivery, mixing, synchronization, MP4 export, storage, generation fencing across real workers, secure delivery, credit accounting or an operating-system save outcome unavailable to the browser.

Replacement fixtures carry separate authoritative-current and presented-generation identities, player playing/paused/inactive state, pending new-version identity and generation-specific playback/download descriptors. Cover readiness during playing previous media with uninterrupted old playback and New version ready / Watch new; paused/inactive readiness swapping without autoplay; Watch new switching player/download together to the new beginning while remaining paused until separate Play; stale/reversed completion fencing; and activation-time request/retry identity surviving a later player switch. These fixtures prove presentation wiring only, not real old-asset retention/authorization or generation ordering across workers.

Zero-turn fixtures distinguish an initial attempt with no usable preparation from a reprocessing attempt whose zero-turn output leaves prior nonempty preparation and its draft active. Only the first excludes Record/Result entry for lack of usable preparation; the second preserves Record continuation. Neither zero-turn output can authorize or supply an assembly snapshot, and any preserved-turn Result handoff keeps the ordinary eligibility/authorization gate.

Mock recovery fixtures must carry a durable initial-trigger or completed-project `To result` authorization, its exact frozen snapshot and retry lineage. A fixture with eligibility alone must prove that Result neither starts nor retries a revision assembly. Navigation fixtures distinguish ordinary final-gap `Next` opening Result from Back/leave/sign-out final-gap acceptance starting background assembly while the requested destination wins.

## 16. Dependencies and cross-flow contracts

- **Shared contract:** compact navigation, project header/save state, light visual direction, localization and centralized services boundary.
- **Approved design tokens:** `design-tokens.md` owns semantic colors, component states, focus treatments, typography, spacing, geometry and motion used by Result.
- **Processing flow/service:** owns the automatically generated fixed turn set and direct transition to Record. Initial zero turns with no prior usable preparation stay in `No dialogue found` recovery, with eligible reprocessing/another-video actions and no Record/Result entry. A zero-turn reprocessing output preserves prior usable nonempty preparation and its unaccepted draft, reports the new attempt's no-dialogue outcome and permits continued Record work against the preserved turns; it never replaces them or supplies an assembly snapshot. Completed-attempt charge/retry consumption is unchanged in both cases, and preserved-turn Result entry retains normal eligibility/authorization gates. There is no Prepare, manual correction, missed-line addition or background-audition stage in the MVP.
- **Flow 09 Record:** owns candidate acceptance, turn navigation and rerecording. The durable acceptance that first completes the initial all-required-turn eligibility set records/reconciles one assembly trigger from any turn position, with no final-turn traversal or initial button; capture, draft, navigation and local counts are not triggers. Ordinary final-gap `Next` opens Result. Final-gap acceptance through Back/leave/sign-out or another explicit guard durably records/reconciles the same trigger before exit/release, runs assembly in the background and preserves the requested destination. Next blocks an empty unaccepted turn without mutation; a compatible accepted candidate-free revisit may advance. A present candidate requires authoritative acceptance before advancement, with failed/unknown outcome retaining current turn/candidate and no older-take fallback. Legacy/interrupted gaps retain first-unfinished recovery and cannot assemble until all required takes are accepted-compatible. In completed-project revision, replacement `Next` stays in Record; `To result` owns the exact three-way candidate guard and durable frozen-snapshot authorization, and hands Result accepted takes only. `Return to recording` from Result opens the first established turn without capture or assembly. A failed assembly start never rolls back an accepted take.
- **Flow 11 My projects:** summarizes and resumes result states without becoming a second generation truth; `Continue` chooses Record when unfinished recordings remain and Result otherwise.
- **Authentication/account and project deletion flows:** owner access restoration and immediate logical revocation.
- **Backend/export/storage work:** owns real mixing, media validation, immutable assets, idempotency, generation ordering, secure playback/download and cleanup evidence.

Cross-flow issues to resolve once rather than independently:

- exact retry timing/backoff and the budget/treatment of later explicit manual assembly attempts;
- shared wording for project `Rendering`, `Ready`, `Previous result`, `Needs recording`, `Failed` and save/result status;
- the atomic boundary among final take acceptance, durable assembly-trigger/authorization recording before explicit navigation or ownership/session release, result-job creation and the owner current-generation switch;
- operational retention and bounded rendering/download usage under SPEC-001 D08.

## 17. Open questions

No remaining open item below may be silently selected by implementation, a design skill, a mock fixture or a test. Settled owner choices are integrated into the normative contract above rather than retained as stale OPEN entries.

Independent review provenance: MEDIA-R02 is resolved by explicit-navigation priority with a durable background initial-assembly trigger; MEDIA-R03 is resolved by requiring durable operation authorization, the exact frozen snapshot and recorded retry lineage for every recovery/retry. Eligibility alone cannot authorize a completed-project revision.

- **RESULT-B01:** A valid latest-authorized result becomes authoritative under the existing generation fence. Already playing previous media remains presented uninterrupted with New version ready / Watch new; paused/inactive presentation switches without autoplay. Detailed Russian copy/geometry remain named below.
- **RESULT-B02:** Download MP4 always uses the exact displayed generation, including temporarily retained previous playback. Player switching changes future download targets together; an activated request and its retries remain frozen to their original identity.
- **RESULT-B03:** Watch new resets the newly displayed generation to its beginning and stays paused; the user explicitly selects Play to watch it. No automatic playback follows that switch.
- **REC-B01 / REC-B05 integration:** Result consumes accepted usable interrupted partials under Flow 09, preserves all-turn eligibility and silence for an unused remainder, and no longer assumes a user early-stop capture action.

| ID | Decision or remaining question | Why it matters |
|---|---|---|
| **OPEN-10-05** | Define the production source, meaning and update semantics that make an overall assembly percentage trustworthy; decide whether any additional Result-specific stage label accompanies it and approve that wording; define any optional finished-output metadata beyond the required media facts. Settled presentation is the assembling message before a value, one bar plus the supplied percentage after it, no ETA, no reuse of preparation stages and no cancellation. | The UI must consume a real service fact without independently guessing how work maps to a percentage, borrowing another flow's stages or promising optional metadata. |
| **OPEN-10-06** | Approve remaining Russian finished-player action labels plus blocked, previous/outdated and error copy, including download-failure wording, beyond the confirmed copy enumerated in §13. Download-error placement beside its action and same-generation retry behavior are settled. | Required for complete testable bilingual behavior; AC-10-18 remains blocked. |
| **OPEN-10-07** | Supply/verify Mabry Pro assets, browser loading/fallback, browser/forced-colors behavior and rendered conformance; define Result-specific stage/progress/action geometry and action order not implied by the common spacing roles within the approved responsive grid. | Shared Regular/Medium roles, type sizes and line heights, 8/16/24/32px spacing roles, 24px desktop/16px phone existing-panel padding, restrained motion direction, semantic colors/component states/focus treatments, radii, control heights, separate gutters, breakpoint and maximum width are settled; the remaining evidence/details are required for rendered visual acceptance. |
| **OPEN-10-08** | Define bounded render/download usage and old-export/CDN/backup/owner-media-descriptor lifetimes after replacement and deletion. Public-link lifetime questions are withdrawn. | SPEC-001 D08 leaves operational owner delivery and physical cleanup guarantees open; UI copy must not promise them. |
| **OPEN-10-09** | Define automatic retry timing/backoff and how later explicit `Repeat assembly` attempts are limited, counted or charged after the confirmed one automatic retry. | The owner selected the immediate recovery shape but did not select later-attempt mechanics; the UI and service must not invent them. |
| **TECH-10-10** | Define the transactional/idempotent boundary between initial final-take acceptance or completed-project `To result`, durable authorization/trigger recording before explicit exit/release, result-operation creation, retry lineage and owner-current generation switching. | The user-visible triggers, navigation priority and preservation rules are settled, but implementation must prevent accepted-work rollback, unrecoverable initiation, duplicate jobs, eligibility-only revision starts and stale publication without inventing a client-only transaction. |

## 18. Evidence status

- Specification authoring only; no product code, dependency installation, runnable mock, GitHub mutation or Git mutation was performed.
- No Result frontend or backend behavior was executed for this document.
- No actual AI processing, take-derived render, MP4 export or secure download was proven.
- Existing implementation and fixed sample media do not establish conformity to this corrected specification; no Result runtime behavior was executed during this pass.
- Both requested design skills informed hierarchy, state honesty, app-screen restraint, phone behavior and accessibility. Their defaults do not resolve owner decisions or provide visual acceptance.
