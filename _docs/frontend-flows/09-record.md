# Flow 09 — Reference playback, microphone capture, take review and acceptance

Date: 2026-10-26 (Asia/Qyzylorda).
Status: owner-authorized specification correction; known UX requirements corrected in place. New composition and direct-action details remain pending prototype validation and independent review. No design or implementation acceptance is implied.
Mode: specification only. No implementation, mock, visual validation or executed test is represented by this document.

## 1. Purpose and authority

This flow lets an authenticated project owner check a usable microphone on the current device, rehearse an automatically processed recording turn against the original scene, capture one microphone performance within that turn's fixed window, review the candidate, replace the turn's accepted take safely, and continue through the project.

The [shared frontend contract](00-shared-contract.md) governs the shell, visual direction, localization, service boundary and cross-flow behavior. The latest owner choices recorded there override conflicting older wording in SPEC-001 and BR-001. The 2026-10-26 owner correction supersedes earlier sparse presentation, mandatory separate visible counters (REC-B06 presentation), segmented-source transport, placement and empty-turn Next permission. Other REC-B capture, partial/zero-data, candidate and take-safety rules remain. Video stays visible and moving during capture. Dated batches/SPEC/BR/publication/QA records remain historical evidence, not current acceptance.

Unchanged recording and take-safety invariants come from BR-001-R07–R16 and SPEC-001 §§4.3–4.6, AC-06 and AC-08–AC-13, except where the shared contract records a newer owner decision. This flow does not restore Prepare: there is no manual transcript, speaker or timing correction, missed-turn addition, background-only audition or approval stage. It also does not redefine processing, final mixing, project retention or public sharing.

## 2. Entry, completion and scope

### Entry

Successful Processing leads directly to Record when:

- the selected section and its current processing revision are available;
- at least one current turn exists;
- the current account can access the project;
- the turn has a valid fixed recording window, including its already-defined margins;
- the original video/reference-audio source can be made ready for synchronized playback.

Before the device may capture, it must acquire exclusive recording access for this project. Only one device may hold that access at a time. A second device may view or navigate the project but cannot begin capture, force a takeover or revoke the active device. To move recording to another device, the owner first leaves Record on the current device, completing any applicable candidate guard, and then enters Record on the other device. After authoritative confirmation that the owning device disconnected, the service releases access automatically; any returning device must recheck and reacquire before capture.

On first recording entry per device, show the separate microphone check. Later contextual input recovery remains available without a mandatory normal-workspace Microphone button. Settings reconfiguration is owner direction; exact location and safe return with a candidate remain unresolved. Remembered readiness never bypasses current permission/input checks.

`Continue` from My projects opens Record when the project has unfinished takes and opens Result when it has none. For unfinished work, Record opens the first turn without an accepted recording in the project's established turn order, never the last-viewed turn. If that turn has an account-persisted unaccepted candidate, offer recovery without automatically accepting it. Record does not ask the user to choose from a list or picker.

`Return to recording` from Result for a fully recorded project opens the first turn in established order. It preserves every accepted take and starts neither capture nor rendering. The owner moves only with `Back` / `Next`; no turn list or last-viewed-turn rule applies.

If initial processing detects zero turns and no prior usable preparation exists, Record is ineligible. The user remains in the Processing recovery outcome `No dialogue found` / `Реплики не найдены`, with eligible reprocessing under the existing quote, credit and included-retry rules or selection of another video. Record must not synthesize an empty turn or route the project to Result. A later zero-turn reprocessing attempt preserves any prior usable nonempty preparation and draft under §5.10.

### Successful per-turn exit

Selecting `Next` with a reviewable candidate starts acceptance. The flow may leave the current turn only after the candidate media and its authoritative association with the compatible turn revision are durably saved. A successful replacement becomes the one current accepted take for that turn.

Next on a turn with neither a usable candidate nor a compatible accepted take cannot advance to the next unfinished turn. Explain the need to record this turn; create no take/count/credit/lock mutation. A revisited accepted turn without a new candidate may advance. With a candidate, Next accepts that exact candidate first and cannot fall back to the prior accepted take on failure/unknown outcome; retain the current turn and candidate for retry/reconciliation.

- If another turn follows in the authoritative order, Record opens that turn without autoplay or automatic capture.
- During the initial required recording sequence, every durable acceptance is followed by an authoritative all-turn eligibility check. The first transition to a fully accepted compatible set automatically starts result assembly and moves the user to the Result progress experience, even when the final gap was a middle turn reached after later turns. The user does not traverse to the final turn again or activate a separate initial `To result` action. Capture completion, draft persistence, navigation and client-local counts cannot trigger assembly. Normal Next cannot create gaps. Legacy/interrupted/reconciled projects may still be incomplete; an incomplete boundary never starts assembly. In that recovery case show **Remaining turns to record: N** and **First unrecorded turn**; that action opens the first turn without a compatible accepted take in established order, without showing a turn list.
- In a fully recorded project being revised, `Next` with a candidate accepts the replacement and stays in Record, advancing normally. Candidate-free `Back` / `Next` navigation changes no take. It does not render automatically merely because all turns remain complete; `To result` explicitly starts the updated assembly under §5.9.
- If result-job creation fails after the take is durably accepted, the accepted take remains saved; recovery belongs to Flow 10 and must not roll the take back.

### Other exits

The user may try to move back to the previous turn, leave for another workspace destination, or choose ordinary `Sign out` while an unaccepted candidate exists. That transition uses the applicable confirmed three-action guard in §5.8. Already accepted takes remain saved regardless of the choice. Sign-out completes only after the guard resolves, releases this device's recording access, ends only the current session, and opens the signed-out landing; other devices remain signed in.

### Out of scope

- processing execution/progress and its billing lifecycle (Flow 07); the visible eligible `Process again` launch and its recording-state safeguards are specified here;
- manual transcript, speaker or timing correction, missed-turn addition, targeted segmentation repair, or adding turns;
- background-only audition or approval;
- final result mixing, rendering, playback and download (Flow 10);
- project-list and long-term resume presentation (Flow 11);
- a multi-take library, performance scoring, voice cloning, translation, time stretching, automatic performance fitting or microphone-gain editing;
- device calibration beyond the approved selection/level/test check, microphone-gain editing, or audio enhancement controls;

If an automatically supplied turn is clipped or otherwise segmented poorly, Record offers no repair control. The user may perform the supplied clip as-is or start a new project under ordinary credit and slot rules. Once the project has its first successfully accepted saved take, whole-section reprocessing is permanently locked; a failed capture, draft persistence or acceptance attempt does not create that lock.

## 3. Experience principles

The work is to follow the scene, read the line to perform, rehearse, record, audition and continue. Give spoken dialogue deliberate prominence rather than treating it as small metadata. Group Replay / Record / Your take as the performance loop, separately from Previous / Next. Keep project identity available without a mandatory filename / Record / Progress saved trail, exact Capture window timestamps, separate Accepted takes counter or idle Recording status.

The owner direction to prototype is centered moving video → prominent centered dialogue → bounded waveform, with a contextual right panel ordered clip position → performance actions → navigation. This is an unapproved design direction, not accepted high-fidelity anatomy, exact type sizing, a global navigation sidebar or approved phone/short-screen behavior. Earlier always-below-waveform/no-contextual-panel requirements no longer constrain exploration. Preserve [Clean/Light tokens](design-tokens.md), Mabry Pro, Lucide and accessible targets. Record a proposed new dialogue type role or other token gap for review rather than selecting arbitrary values.

Keep the complete scene uncropped by default for portrait, square and landscape sources; contain/letterboxing is valid. Do not force a 16:9 crop or infer failure from black bars alone. Validate long English/Russian dialogue, realistic moving content and short screens before accepting a composition.

Reference volume belongs conceptually with audition/player controls and changes audible original/reference playback only, never captured/saved/final gain. Process again is a discoverable secondary utility within the same coherent workspace, retaining its entitlement/cost/warning/lock rules. Errors stay with the affected workspace. Transient notification may supplement it, but blocked capture, lost ownership, unknown saves and unsaved media require durable actionable accessible feedback until resolved or safely dismissed.

Show states when they help a user act or recover. Active capture needs unmistakable visual/programmatic feedback; an idle status label is unnecessary. Position, accepted-compatible count, candidate/draft/accepted identities and revisions remain distinct internal facts without requiring all of them as permanent labels.

## 4. Screen anatomy

### 4.1 Microphone check screen

The separate check screen remains inside authenticated Flow 09 and uses the shared project shell. It contains:

1. **Purpose and readiness state**
   - states that this check prepares the current device for recording and does not create a dialogue take;
   - shows permission, selected-input and usable-input readiness separately;
   - permission success never starts a test recording or timed dialogue take automatically.
2. **Microphone selection**
   - lists only inputs the browser actually exposes and identifies the selected input;
   - unavailable device enumeration is shown honestly rather than populated with invented devices.
3. **Input-level indicator**
   - gives live feedback from the selected input when permission allows;
   - no numeric or visual level threshold is a mandatory completion gate.
4. **Optional test controls**
   - `Record test` begins a microphone test only after explicit activation;
   - `Stop` ends that test and `Listen` auditions the completed test;
   - recording or listening to a test is optional and never creates a candidate, accepted take, credit charge or whole-section reprocessing lock.
5. **Primary Continue and recovery**
   - `Continue to dubbing` is primary once microphone access and a usable input are ready; optional testing is secondary and need not be completed or listened to;
   - permission denial and unavailable/busy/lost input expose recovery actions and do not pretend readiness;
   - microphone-test audio is temporary browser-local data, is deleted when the user leaves this screen, is never uploaded or account-persisted, and is never recoverable as a project candidate; every later visit starts without the previous test recording;
   - device-local first-entry bookkeeping is distinct from microphone-test audio and from account-owned dialogue drafts.

### 4.2 Record turn screen

These capabilities do not approve an arrangement. Validate the desktop direction in §3; phone and short-screen adaptation remain pending.

- **Context:** identify clip/turn position and speaker enough to perform it. Project identity remains available without a mandatory status trail. Only Previous / Next navigate turns; no turn list/picker is added. Position is not completion. Empty unaccepted Next is blocked.
- **Scene and spoken line:** keep moving video and supplied dialogue/caption readable during audition/capture, preserving the full image. Full original audio including overlaps accompanies capture on the authoritative fixed timeline, without stretching timing or substituting a source.
- **Bounded waveform:** one waveform follows the auditioned source, synchronized with video and accessible scrub/time alternatives. Show useful playhead/duration, not mandatory exact Capture window copy. This is not an editing timeline or generic per-block card pattern.
- **Performance:** direct Replay auditions the original turn; Your take auditions the usable current candidate before compatible accepted media. Without either, Your take stays disabled with a concise record-first reason. Record/rerecord starts at the fixed-window beginning. No mandatory segmented source toggle plus common Play or multi-take library is added. Only one synchronized source plays at once.
- **Navigation/acceptance:** group Previous / Next separately. Candidate-bearing Next explicitly accepts that exact candidate and advances only after authoritative success; failure/unknown outcome retains turn/candidate and protects prior accepted media. With no candidate an accepted-compatible turn may advance mutation-free, while an empty unaccepted turn cannot. There is no separate mandatory Save action.
- **Capture feedback:** make active capture unmistakable. Only reference volume is adjustable; no manual dialogue Stop. Transport, seeking, source changes, navigation and other workspace actions stay unavailable until automatic completion/interruption and finalization. Not every unavailable utility must occupy an idle toolbar slot.
- **Utilities/recovery:** integrate reference-volume access with player/audition controls without suggesting microphone/final-mix gain. Keep Process again discoverable as a secondary utility with cost/warning/lock reason; completed-project To result follows §5.9. Contextual microphone recovery remains available when needed.
- **Persistence/access:** distinguish draft saving, durable recovery, accepted association and failure when relevant. Persistent block/unknown/unsaved feedback is durable, bounded, actionable and accessible; toast alone is insufficient. Explain access held elsewhere without fabricated device identity or forced takeover; viewing does not steal access.
- **Existing incomplete projects:** legacy/interrupted/reconciled gaps retain authoritative missing-take count and First unrecorded turn recovery without a list. Candidate guards apply before leaving; assembly/To result remain unavailable until all required takes are compatibly accepted. This recovery never permits normal Next to create gaps.

## 5. State model and transitions

### 5.1 Loading the turn

The screen loads the project revision, ordered processed turns, current turn revision, fixed capture window, accepted-take metadata, original media readiness and any eligible account-owned recoverable draft after sign-in.

- Keep the final layout stable while loading: stage, target-line and timeline regions retain their shape.
- A partial load error is shown in the region that failed with a retry action.
- Record stays unavailable until both microphone capture and reference playback can start against the same timing basis.
- Loading must not start playback, request microphone permission or begin capture.
- Capture controls remain unavailable until this device has authoritative exclusive recording access. A stale prior grant is never accepted as proof after reconnecting.

### 5.2 Replay and own-take audition

Replay auditions the original video/audio over the exact fixed turn window, including the same margins as capture. Playback stops at that window's end. There is no wider-context or full-source default for Listen. Pause and replay do not create or alter a candidate.

`Your take` auditions once and stops on the same turn, without looping, acceptance or advancement. Another audition requires an explicit playback action. For original, candidate and accepted sources, explicit playback at or beyond the fixed-window end resets synchronized video/audio/waveform to the window beginning before playing, even when the source file has not ended. Repeat after completion or scrub-to-end must remain usable. A usable current candidate takes preference over the accepted take. With neither eligible source, keep `Your take` visible but disabled with its record-first explanation.

Source changes reset synchronized video/audio/waveform to the fixed-window beginning. An explicit direct Replay or Your take action may play; a source-only change on paused/inactive media stays paused. Exact behavior on activating the already-playing direct action is pending prototype resolution, without blocking ended-window restart. Neither branch records, accepts or deletes a take. Source switching remains unavailable during capture.

Starting any capture supersedes Original or Your take audition without requiring a separate Stop click. Stop the audition before starting the single synchronized capture/reference stream. Regardless of a middle/near-end audition position or selected source, capture starts at the beginning of the identical fixed turn window including margins, with full original audio and moving video. If readiness fails, preserve protected media and show recovery without claiming capture began.

### 5.3 Start capture

`Record` has no countdown. One user activation initiates readiness and capture:

1. If microphone permission or media readiness is still pending, show that pending state without counting down or pretending capture has started.
2. After microphone and reference playback are both ready, begin capture immediately on the synchronized turn-window timing basis.
3. Start the moving video and full original reference audio for that window.
4. Show an unmistakable recording state and elapsed/remaining fixed-window information. There is no manual Stop action; finishing speech early does not end capture.

The exact preflight timing, allowed start tolerance, capture-latency trimming/padding and synchronization-recovery policy remain **OPEN-09-08** and must be measured on supported desktop and phone browsers. No completed take may be fabricated when permission is denied or reference playback does not start.

#### Active-capture action matrix

| Record-workspace action | While capture is active | After stop/finalization |
|---|---|---|
| Manual dialogue-capture `Stop` | Absent | Absent; optional microphone-test Stop remains confined to §4.1 |
| Reference-original volume | Enabled; changes local reference playback only | Restored to its ordinary playback behavior |
| Waveform seek/scrub and play/pause | Disabled; the playhead follows the fixed capture clock | Restored when the finalized state permits audition |
| original / own-take | Disabled; source cannot change mid-attempt | Restored when the finalized state has an eligible source |
| `Back` / `Next` and all other Record-workspace actions | Disabled; no turn or workspace transition races active capture | Restored according to the finalized candidate/failure state and existing guards |

In-app workspace navigation is unavailable during active capture; wait for fixed-window automatic completion and finalization before applying any subsequent candidate guard. Do not turn an in-app leave action into an early-stop shortcut. The product cannot promise to block browser-tab/window closure or every page-lifecycle termination; those events follow the interruption contract and may preserve only media that actually becomes recoverable.

### 5.4 Fixed-window completion and interruption

- Capture runs for the entire fixed window and automatically stops at its end. The user may finish speaking earlier while capture and reference playback continue; there is no manual dialogue-capture Stop.
- Capture never extends the source window, video duration or processed timing.
- Browser/device interruption may yield a usable shorter partial. It may be reviewed and explicitly accepted through `Next`, with no mandatory rerecord solely because it was interrupted. A shorter accepted take leaves the target character silent for its unused remainder; background and other characters continue according to preview/result rules.
- An attempt with no captured audio data produces an error and `Retry recording`, cannot be accepted and preserves prior accepted/protected media. A recording containing silence or quiet speech is not a zero-data attempt; no loudness or speech-detection gate is introduced.
- Recoverable-media compatibility, measured timing tolerance and platform finalization mechanics remain **OPEN-09-08**; they cannot be used to require a full-window take or reject a usable partial merely for interruption.

After automatic completion or interruption, remain on the same turn and wait for user action: audition, rerecord or `Next` for a usable candidate. Do not autoplay, auto-accept, restart capture or navigate automatically. Every newly opened turn likewise waits for explicit audition or Record; listening is optional.

### 5.5 Candidate review

The stopped media is an **unaccepted candidate** until acceptance completes. The UI must distinguish it from the durable accepted take.

- As soon as capture/finalization classifies the candidate as usable, start idempotent draft persistence automatically while the user remains in candidate review. This trigger does not wait for `Next`, a leave guard or acceptance.
- Expose distinct saving, account-recoverable and save-failed states plus a retry action. Account/cross-device recovery may be shown only after the authoritative service confirms both media storage and the account/project/turn association for that exact candidate identity.
- Automatic draft persistence never accepts the candidate, replaces the prior accepted take, advances accepted/project counts, starts Result assembly or creates the permanent reprocessing lock.
- Your take directly auditions the candidate with synchronized video and single-source transport semantics.
- While the candidate exists, selecting `Your take` auditions that new candidate and switches the one waveform to it. Acceptance is not required before audition, and the prior accepted take is not substituted into this review.
- Review uses one processed background. Saved replacement voices play for turns that have accepted compatible takes; original voices remain for unrecorded characters, including overlaps. The candidate substitutes for its target only for its own audition.
- Imperfect original-speaker isolation is not hidden. The user may continue after hearing it.
- `Rerecord` starts another immediate capture for the same fixed window.
- With a candidate, `Next` is the acceptance action. It does not navigate first and save later. Without a candidate, Next advances only from a compatible accepted turn; an empty unaccepted turn stays blocked under §5.6.

The prior accepted take remains authoritative while the candidate is auditioned or its draft is saving. Persistence failure leaves that accepted take and the current candidate available for review/retry. A late persistence result for an older candidate/revision cannot replace a newer current candidate or mark it recoverable. Rerecord replacement follows §5.7; no design may expose a third source or saved-take library implicitly.

### 5.6 Next: accept before advancing; do not skip unfinished turns

When `Next` is selected with an unaccepted candidate:

1. Freeze the candidate identity and its project/turn/processing/timing revisions.
2. Persist the media and its authoritative association idempotently.
3. Verify that the accepted association is durable and compatible with the current turn timing.
4. Only then replace the prior accepted take and update project progress.
5. Re-evaluate authoritative all-turn eligibility after durable acceptance. In the initial sequence, the first incomplete-to-complete transition starts one idempotent Result assembly and opens Result regardless of which turn closed the final gap; otherwise navigate to the next turn in authoritative order. Do not require another pass through the final turn or a separate initial `To result`, and do not infer eligibility from client-local counts. A completed-project revision stays in Record until explicit `To result`.

The prior accepted take remains authoritative through upload, validation and association commit. A failure, stale completion, duplicate response, canceled request or incompatible turn revision must not erase or replace it.

With no candidate, a compatible accepted take permits mutation-free advancement, including revisiting completed work. Without a compatible accepted take, stay on this turn with a concise record-first reason; do not navigate, synthesize media, change accepted/completion counts, bill, start assembly or create a lock. Pending/failed/unknown candidate acceptance cannot fall through to older-take navigation.

Legacy/interrupted/reconciled gaps remain recoverable. At an incomplete boundary show Remaining turns to record: N and First unrecorded turn from required turns without compatible accepted media. The action opens the first such turn in order without a list; candidate guards still apply. Navigation/drafts never reduce N and assembly waits for authoritative completeness. This does not allow new gaps on normal Next.

There are no user text, speaker or timing edits in this MVP. A later processing revision that changes the supplied turn or its timing makes an existing take ineligible for that revision and rejects stale candidate acceptance; the old accepted take remains protected until a compatible replacement is durably accepted. Such a processing revision cannot be created after the first successfully accepted saved take because whole-section reprocessing is then permanently locked.

### 5.7 Rerecord

Rerecord never deletes the prior accepted take. When an unaccepted candidate already exists, keep it protected while the new attempt is in progress and through unsuccessful finalization. A failed, unusable, zero-data or incompatible attempt does not replace it. Successful finalization into a valid usable candidate is the safe atomic replacement boundary, including when an interruption yielded that usable partial; interruption alone neither forces rejection nor accepts the partial. Only that boundary makes the new recording the sole current unaccepted candidate available for listen, `Next` or rerecord. This is replacement safety, not a multi-take library: the UI never offers both candidates for selection, and physical cleanup timing for the superseded draft remains **OPEN-09-12-OPS**.

### 5.8 Back or leave with an unaccepted candidate

Attempting to leave the candidate behind must open a decision rather than silently accept, discard or carry it to another turn. `Next` with a candidate follows §5.6 directly rather than opening a guard.

When `Back` would move to the previous turn, the guard has exactly:

- `Save and go`: durably accept the candidate, then navigate to the previous turn. If draft persistence or accepted association fails, stay on the current turn with the candidate available for retry and the previous accepted take protected.
- `Go without saving`: discard only the unaccepted candidate, preserve any prior accepted take, then navigate to the previous turn.
- `Stay`: close the guard and perform no navigation or acceptance.

When `Save and go` durably accepts the final missing compatible take in the initial sequence, record/reconcile the one idempotent initial-assembly trigger for that frozen accepted-take snapshot before completing the Back navigation. Assembly continues in the background and the requested previous-turn destination wins; do not replace it with Result. A save or trigger-confirmation failure stays on the current turn for retry/reconciliation, preserves the accepted outcome if it already committed, and protects the previous accepted take until replacement commit.

For Result, My projects, New dub, browser history, ordinary `Sign out`, and other screen-leaving destinations, the guard retains exactly:

- `Save and leave`: durably accept the candidate, then continue to the requested destination. If draft persistence or accepted association fails, stay on Record, preserve the previous accepted take, explain the failure and allow retry.
- `Leave without saving`: discard only the unaccepted candidate and continue to the requested destination.
- `Stay`: close the dialog and remain on the current turn with the candidate unchanged.

When `Save and leave` durably accepts the final missing compatible take in the initial sequence, record/reconcile the one idempotent initial-assembly trigger for that frozen snapshot before completing the requested destination. Assembly runs in the background and that explicit destination wins; Result must not steal navigation. Save failure stays on Record, and an uncertain trigger is reconciled before exit rather than made unrecoverable. Completed-project revision behavior is unchanged: acceptance alone does not assemble, and explicit `To result` remains required.

An already accepted take is not at risk in this decision. Unexpected tab/browser/process closure uses the confirmed account-owned draft recovery contract in §6.5; it never accepts the draft automatically.

For ordinary `Sign out`, apply the leave guard before ending the session:

- `Save and leave` durably accepts the candidate. If that acceptance closes the initial final gap, the idempotent assembly trigger must also be durably recorded/reconciled before the explicit exit releases recording access, ends the current session, and opens the signed-out landing; assembly continues in the background and sign-out navigation wins. Save or unresolved trigger failure keeps the user signed in on Record for retry/reconciliation, with the candidate or committed accepted outcome preserved, the previous accepted take protected until replacement commit, and recording access still held.
- `Leave without saving` discards only the unaccepted candidate, then releases recording access, ends the current session, and opens the signed-out landing.
- `Stay` closes the guard and performs no discard, acceptance, recording-access release, session termination, or navigation.

Ordinary sign-out terminates only the current session. It does not sign out other devices and does not reuse the all-other-session revocation behavior of password reset/change or the all-session revocation behavior of account deletion.

### 5.9 To result after revising a completed project

`To result` is available when the project entered Record with a compatible accepted take for every required turn. It explicitly starts assembly from the authoritative accepted-take set; `Next` may first be used on several turns to accept replacements while staying in Record.

With no unaccepted candidate, `To result` verifies that every required turn still has a compatible accepted take, starts the updated assembly idempotently, and opens Result. The previous finished result remains available until the replacement render succeeds.

With an unaccepted candidate, the guard has exactly:

- `Save and go`: durably accept the candidate, then start assembly and navigate. Save failure stays on Record with the candidate available for retry and the prior accepted take protected.
- `Go without saving`: discard only the candidate, preserve any prior accepted take, then start assembly from accepted recordings.
- `Stay`: close the guard without accepting, discarding, rendering or navigating.

Discarding cannot bypass the requirement that every required turn have a compatible accepted take. Result-job creation failure does not undo an accepted candidate or the existing finished result.

### 5.10 Process again

`Process again` is a discoverable secondary utility within the bounded Record workspace, not a required standalone outer row. Before the first durably accepted take, it uses the existing included-retry/paid eligibility, current quote and explicit authorization rules. After the first durable acceptance it remains unavailable with an explanation that project-level whole-section reprocessing is permanently locked. A microphone test, local candidate, recoverable draft, failed capture, failed draft save or failed acceptance does not create that lock.

If an unaccepted draft exists, launching eligible reprocessing requires explicit confirmation that a usable successful replacement preparation will replace the segmentation and delete that draft. The confirmation includes the applicable free-retry entitlement or paid cost. Launch does not delete or hide the current preparation or draft.

- A system failure preserves the previous preparation and draft.
- A completed replacement with usable nonempty turns atomically becomes the current preparation and only then logically deletes the old draft.
- A completed replacement with zero turns preserves the prior nonempty preparation and its draft, reports that the new run found no dialogue and consumes charges/retry entitlement under the existing processing rules. It does not replace usable recording state with an empty result.
- Initial zero-turn processing with no prior usable preparation remains outside Record under the `No dialogue found` recovery contract.

Physical cleanup of replaced draft media remains **OPEN-09-12-OPS**.

### 5.11 Exclusive recording access

Entering Record acquires or confirms the sole project-recording grant for the active tab before capture. At most one browser tab for this project may capture or accept, including same-profile tabs sharing the existing durable client/session. A second tab may view but cannot capture or accept, and cannot force takeover. This does not change authentication or durable client/session identity. An explicit exit, including ordinary sign-out, releases the grant only after any candidate guard and required durable acceptance/discard outcome completes; a failed `Save and leave` or `Save and go` keeps the user in Record and must not pretend handoff or sign-out completed.

After authoritative disconnect confirmation, the service releases the grant automatically. Capture stops through the interruption contract if connection/access is lost. A returning device or another same-profile tab must acquire/confirm the project's current grant before a new capture or acceptance mutation; late work from a released grant is fenced from overwriting newer state. Exact heartbeat/lease timing, disconnect classification and fencing mechanics remain **OPEN-09-13-LEASE** rather than guessed constants.

The existing `discardDraft` service operation retains its facade signature. Its mock implementation requires the current live recording grant/actor and binds actor identity into its idempotency fingerprint; the owning actor retains safe replay, while a same-profile view-only actor cannot discard the protected candidate or replay another actor's successful discard. This is a private mock fence, not a new public facade method or production authorization guarantee. See [issue 77](https://github.com/dystrophyless/dubbed.ai/issues/77).

## 6. Failure, interruption and recovery behavior

### 6.1 Microphone permission or device failure before capture

- Permission denied, no input device, device busy or a readiness timeout leaves the user on the turn with no new candidate.
- Explain a specific recoverable action only when the current condition has one: grant permission, connect/close the competing device, or retry an explicitly recoverable optional-test failure.

- If a live input exists but the `MediaRecorder` API is absent, report local recording unavailable; do not describe it as reconnectable or imply retry can enable it, and do not start a recorder. The optional test does not change microphone readiness or `Continue`; a recoverable `media-invalid` test failure retains retry guidance, and permission denial remains a separate permission-specific state. See the [issue 64](https://github.com/dystrophyless/dubbed.ai/issues/64) and [issue 69](https://github.com/dystrophyless/dubbed.ai/issues/69). These are injected/local checks, not a browser-support matrix or device certification; the six historical issue-64 artifacts remain unchanged.
- Keep `Listen` available when original playback remains usable.
- Preserve the prior accepted take and any already-existing candidate; a failed recapture cannot replace either.
- Do not repeatedly trigger the browser permission prompt without a new user action.

### 6.2 Reference playback failure before or during capture

- If the full original reference cannot start, do not start microphone capture.
- If reference/video loses its timing basis during capture, stop the attempt and classify it through the interrupted-take rule below.
- Never accept a take as normally synchronized merely because microphone bytes exist.

### 6.3 Interrupted take

Interruptions include device disconnection, audio-track end, browser background suspension, incoming-call/media interruption, navigation, page lifecycle termination and loss of the synchronized reference clock.

- Stop active capture as soon as the interruption is known.
- On phone, browser backgrounding or screen lock is a terminal stop for the active attempt and its synchronized reference playback. The product must not deliberately continue capture or reference playback in the background.
- On return, never resume capture or reference playback automatically. A new attempt requires an explicit user action after readiness and exclusive recording access are confirmed again.
- If actual usable compatible partial media exists, expose it honestly as an unaccepted interrupted candidate/draft. It may be listened to, rerecorded or explicitly accepted through `Next`; interruption alone does not require rerecord and it is never auto-accepted.
- During rerecord, preserve the earlier candidate until successful finalization of a valid usable replacement under §5.7. A usable interrupted partial may cross that boundary as the sole current unaccepted candidate; an unusable interrupted attempt does not replace it or create a second selectable candidate.
- If media is missing, corrupt or outside the allowed timing contract, expose capture failure and no candidate.
- Never manufacture recoverable media or label an interrupted candidate as accepted.
- The prior accepted take remains authoritative throughout.
- Cross-device recovery may be offered only after the interrupted candidate's media and account/project/turn association are durably persisted. A same-device playable partial is not proof of cross-device durability.

The measurable media/timing tolerance, browser event ordering and finalization mechanics that determine whether bytes are recoverable and compatible remain **OPEN-09-08**. Acceptance of a usable partial, rejection of zero-data attempts, and phone background/screen-lock behavior are settled; no silence/quiet-performance rejection threshold is implied.

### 6.4 Candidate acceptance/save failure

- Stay on the same turn.
- State separately whether draft persistence failed or the draft is safely recoverable but accepted association failed. Never call a recoverable draft an accepted take.
- Preserve the prior accepted take unchanged.
- Allow a retry of draft persistence or acceptance when the same candidate remains valid, or rerecord.
- A stale candidate caused by a timing/revision change cannot be force-saved; reload the authoritative turn and record a compatible candidate.
- Do not advance progress, navigate or start result assembly until durable acceptance succeeds.

### 6.5 Session/authentication or connectivity loss

- Ordinary user-initiated sign-out is an explicit guarded exit under §5.8, not an unexpected authentication loss. Resolve any candidate and release recording access before completing current-session termination and landing navigation.
- A failed authenticated save does not turn local capture completion into a saved take.
- Reauthentication or reconnection may retry only against the same frozen candidate and compatible turn revision.
- After the media and account association are durably persisted, the unaccepted take belongs to the signed-in account and is recoverable on another device after sign-in. Reload, browser crash and ordinary restart offer that draft for recovery; they never accept it automatically or replace the current accepted take.
- The recoverable draft has no inactivity or fixed-time expiry. Keep it until acceptance, explicit draft deletion, project deletion or account deletion. Physical cleanup of superseded, discarded, cached or backup media remains an operational policy and is not promised to be immediate.
- A local recording, playable preview or completed byte upload is not yet a cross-device draft unless durable media storage and the account/project/turn association have succeeded. If that persistence has not completed, the UI must not promise recovery of those bytes.
- Competing-tab acceptance requires authoritative revision fencing; a stale tab cannot overwrite a newer accepted take silently.
- Loss of the owning connection stops capture and triggers authoritative automatic release of exclusive recording access. Reconnection must reacquire before capture or acceptance; it cannot reuse a stale local ownership flag.

### 6.6 Result-start failure after acceptance or `To result`

Every accepted take remains accepted and any previous finished result remains available. Show the Result flow's recoverable assembly-start state rather than returning recording to candidate status or asking the user to record again.

### 6.7 Recording access held elsewhere

Keep capture and acceptance mutations unavailable. Explain that recording is active on another device and that the owner must leave Record there before starting here. Do not show a takeover action, disclose unapproved device-identifying information or let a local capture race begin. Retry acquisition after the current holder exits or after the service confirms a disconnect and releases access.

## 7. Desktop, phone and input behavior

### Desktop

Use the shared component/tokens, global navigation, gutters and working-width baseline. Prototype §3’s contextual performance panel, prominent spoken line and bounded waveform. Exact sizing, scroll/pinning and layout are pending, rather than fixed by the old below-waveform requirement.

### Phone and short screens

Retain the shared phone shell, 48px targets, safe areas, logical reading/focus order and no horizontal page overflow. Validate realistic portrait/square/landscape media and long EN/RU dialogue. Do not shrink or cover text/scene to satisfy the former fixed panel budget; deliberate usable scrolling is allowed. Pinning/reflow remains a prototype decision.

Phone backgrounding or screen lock stops capture/reference under §6.3. Return never auto-resumes either or accepts a partial; offer only actually recoverable compatible media as an unaccepted candidate/draft.

### Keyboard and assistive technology

- Every transport, audition-source control, volume control, record/rerecord action, microphone-test Stop, `Microphone`, `Process again`, `To result` and the `Back` / `Next` controls are keyboard operable in logical reading order when available.
- Visible focus is required: `focus.light` applies on light UI, while `focus.media` applies only to controls on an opaque `media` backing. Hover, selected, invalid and disabled states never erase keyboard focus.
- Recording state, elapsed/remaining limit, stop result, candidate status, save progress and failures are announced without repeatedly interrupting the target line.
- Recording and error states use text/icon/state semantics in addition to red.
- The waveform has an accessible transport/time alternative; a screen reader must not traverse decorative waveform samples individually.
- The shared scrubber is an accessible slider with current time, minimum, maximum and keyboard increments. It seeks the selected waveform source and synchronized video. Capture itself remains bounded by the fixed window and is not scrubbed while active.
Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.  There is no page-entry, parallax or decorative motion, and reduced-motion preference disables these UI transitions. Animation never delays capture start/stop, saving, acceptance or navigation. Video/audio playback and the synchronized playhead remain functional media behavior and are unchanged by this UI-motion rule; reduced motion must not remove the visible playhead or recording-state information needed to operate the flow.

## 8. Visible language and localization

The interface supports English and Russian. On first use without a saved preference, use Russian when the browser language is `ru` and English otherwise. Allow manual switching and persist the signed-in choice to the account. An explicit manual choice made before sign-in takes precedence over a different saved account preference after sign-in and updates that preference; a browser-derived default is not an explicit choice and does not overwrite an existing account preference.

Labels use sentence case, plain verbs and the same action name through pending, success and error feedback. Speaker names and transcript text are user/project content and must support mixed Cyrillic/Latin text without truncating the active line beyond comprehension.

Current performance concepts are Replay, Record/rerecord and Your take, apart from Previous / Next. “Back” in existing guards/services denotes the previous-turn action. Other concepts are Retry recording, contextual microphone recovery, secondary Process again, To result, microphone-test Record test / Stop / Listen / Continue to dubbing, and the exact three-action candidate guards. Stop remains microphone-test only. Clip position does not require a separate accepted counter. Final EN/RU labels, direct-action pause semantics and detailed actionable messages remain OPEN-09-10 / OPEN-09-PLAYBACK-DESIGN.

Messages must communicate these facts explicitly when applicable:

- microphone permission or device readiness is blocking capture;
- recording begins immediately when ready;
- the fixed window ended automatically or a browser/device interruption stopped the attempt;
- no audio data was captured and Retry recording is available, without equating silence with missing data;
- a candidate is not yet saved;
- a previous accepted take remains safe;
- draft persistence and accepted-take association are shown as separate states, including which one failed;
- leaving will affect only the unaccepted candidate;
- an interrupted take is recoverable or was not captured.

## 9. Logical service contract

The frontend talks through the centralized interchangeable services boundary. Names below identify responsibilities, not transport endpoints or implementation modules.

### Load recording context

**Input:** account/session context, project ID and entry/resume context.

**Result:** authorized project summary; processing revision; ordered automatically supplied turns; authoritative current-turn identity; availability of the adjacent `Back` / `Next` destinations; each turn's ID, supplied speaker/text, source start/end and margins, timing revision and accepted-compatible-take eligibility/status; authoritative remaining-required-turn count and first missing-accepted-take identity when incomplete; whether entry is an initial sequence or revision of a completed project; project completion and previous-result state; original video/reference descriptors; accepted-take save status; current whole-section reprocessing eligibility/quote/lock reason; and any durably persisted account-owned candidate draft eligible for the current turn. For Continue into unfinished recording, the current turn is the first without an accepted recording. For Return to recording from Result, it is the first turn in established order. The result does not expose a UI contract for direct turn selection.

**Errors:** unauthorized/not found, processing output unavailable/stale, zero turns, invalid turn window, media unavailable, temporary service failure.

### Resolve adjacent navigation with sequential acceptance

**Input:** current authoritative project/processing revision, current turn identity, and requested adjacent `Back` / `Next` direction.

**Result:** authoritative adjacent context/order boundary or blocked-needs-recording. Candidate-free forward navigation requires current compatible accepted media; otherwise return unchanged current context without any take/count/progress/billing/lock mutation. Candidate-bearing Next uses its own authoritative acceptance success, never this bypass. Backward navigation preserves its candidate guard. Legacy/interrupted incomplete state returns authoritative missing count/first missing identity, never an incomplete Result handoff. Revalidate project/turn/take revisions instead of trusting cached eligibility.

The frontend maps that incomplete boundary only to **Remaining turns to record: N** plus **First unrecorded turn**. Following the action requests the returned first-missing turn context; it does not expose the ordered-turn collection as a picker. The service counts accepted-compatible takes, not visited turns or unaccepted drafts, and revalidates the project/take revisions before navigation or assembly gating.

### Acquire and release project recording access

**Acquire input:** signed-in session, project ID, device/session grant identity, active-tab recording-owner identity and expected project revision. Tab ownership does not alter authentication or the durable client/session identity.

**Acquire result:** authoritative `held by this tab`, `held elsewhere` (including another same-profile tab sharing the authenticated session), `reacquiring` or `unavailable` state plus a fenced grant identity when acquired. It returns no unapproved device/other-tab identity and exposes no forced-takeover operation.

**Release input/result:** current fenced grant plus an explicit completed exit, or authoritative disconnect confirmation. Release success makes the project eligible for acquisition elsewhere. A returning device or another tab must acquire a fresh grant.

**Errors/events:** access held elsewhere, including from another same-profile tab, grant lost/released/stale, disconnect confirmed, connectivity failure and temporary service failure. Exact heartbeat/lease timing, disconnect classification and stale-write fencing remain **OPEN-09-13-LEASE**. Mocks must model denial, loss, release and reacquisition; a process-local boolean is not proof of production cross-device exclusivity.

### Check microphone on this device

**Input:** current browser/device context and explicit permission, device-selection or test-control action.

**Result/events:** browser-exposed inputs, selected input, permission and usable-input readiness, live level indication, and optional `Record test` / `Stop` / `Listen` state. `Continue to dubbing` depends only on current access plus a usable input, never on completing/listening to a test or passing an invented level threshold.

**Persistence boundary:** microphone-test audio stays browser-local and is removed on leaving the check screen. It is never uploaded, restored or represented as a project draft/take. Device-local first-entry bookkeeping is separate from the temporary test recording and from account-owned dialogue candidates.

**Errors:** permission denied/revoked, device enumeration unavailable, selected device missing/busy/lost, capture/playback unavailable. Errors remain actionable within the affected bounded workspace; device-specific feedback stays with its control and recoverable selections are preserved. Persistent blocks/unknown outcomes require durable accessible feedback rather than toast alone.

### Make synchronized reference playback ready

**Input:** project/processing/turn revision, the exact fixed source window including margins, and requested playback source.

**Result:** playable media handles and one shared timing basis for explicit Listen playback and capture over that identical fixed window.

**Errors:** original/reference unavailable, unsupported media, readiness timeout, stale revision. Readiness must be distinguished from playback actually starting.

### Capture candidate

**Input:** frozen project/processing/turn/timing revisions and maximum local duration derived from the fixed source window.

**Events/result:** permission/readiness state; capture-started timestamp/timing basis fixed at the turn-window beginning; progress; automatic fixed-window completion or browser/device interruption reason; actual media metadata and presence/absence of audio data; recoverability/compatibility evidence. No manual dialogue-stop command/event exists. Phone browser background or screen lock stops capture and synchronized reference, then returns an actually recoverable usable partial as an unaccepted candidate or no candidate. A usable partial may be accepted through `Next`; no-data produces error plus `Retry recording` and cannot be accepted. Silence/quiet content is not evidence of no data. It never returns background-running, auto-resume, auto-audition or auto-acceptance. Capture completion alone is not persistence.

While capture is active, only reference-original volume is adjustable. Reject seek/scrub, play/pause, audition-source changes, turn/workspace-navigation and other workspace action requests until automatic completion/interruption and finalization return the next authoritative state; an in-app leave cannot manually stop capture. Reference-volume events alter only local reference playback, never microphone gain/captured media. A new capture supersedes either audition source, resets to the full fixed-window beginning regardless of the audition playhead and preserves protected media on readiness failure.

**Errors:** permission denied, no/busy/lost device, unsupported capture, no media, encoding failure, reference synchronization loss.

### Audition source

**Input:** source selection, prior transport state (playing versus paused/inactive), current turn window including margins, accepted-take map, optional candidate identity and current revisions.

**Result:** synchronized video plus the preview mix: one processed background, accepted replacement voices where available, original voices for unrecorded characters, and candidate substitution only for candidate review. When a current candidate exists, `Your take` resolves to that candidate and its waveform while the prior accepted take remains authoritative until durable acceptance.

Source availability is explicit: without usable candidate or compatible accepted media, `Your take` is visible but disabled with a record-first reason. A source change resets synchronized waveform/video to the fixed-window beginning; explicit direct audition may play, while source-only change on paused/inactive media stays paused. Explicit playback at/beyond the fixed-window end resets before playing for both original and own-take sources, regardless of source-file ended state. Recorded-take completion stops once on the same turn without looping, acceptance or advancement. Entering a turn or finalizing capture never starts audition automatically.

**Errors:** source unavailable, candidate missing or explicitly deleted, stale/incompatible take, preview isolation unavailable. The result must not claim perfect separation. An inactivity expiry is not permitted by the confirmed retention contract.

### Persist candidate draft

**Input:** signed-in account/session context; project, turn, processing and timing revisions; immutable candidate identity/media; duration/timing metadata; idempotency identity.

**Success:** durable account/project/turn draft identity, media-storage confirmation and cross-device recovery readiness. This may persist an actually recoverable interrupted partial, but the state remains unaccepted and does not replace the current accepted take or advance project progress.

**Errors:** upload/validation/storage/account-association failure, stale processing/timing revision, unauthorized session or connectivity failure. A partial upload or local preview must not be reported as cross-device ready.

This operation is started automatically when capture/finalization produces a usable candidate, while review remains available. It is fenced to the exact current candidate and expected project/turn/processing/timing revisions. Success for a superseded candidate is retained only for reconciliation/cleanup and cannot replace the newer current candidate; failure preserves the current candidate and prior accepted take and permits retry with the same identity while it remains current. No success from this operation changes accepted count, project completion, Result eligibility or the reprocessing lock.

### Accept candidate

**Input:** project ID; turn ID; processing and timing revisions; immutable candidate or durable-draft identity/media; duration/timing metadata; idempotency identity; expected current accepted-take revision.

**Success:** durable accepted-take identity and revision, replaced-take outcome, authoritative turn/project progress, authoritative all-turn eligibility and whether this acceptance caused the initial sequence's first incomplete-to-complete transition, and the next turn in the authoritative order when one exists.

**Errors:** upload/validation/storage/accepted-association failure, stale processing/timing/accepted-take revision, incompatible or missing media, unauthorized session, connectivity failure. Errors must state whether retry with the same candidate or already durable draft is possible.

Reject zero-audio-data attempts before accepted association and return the recording error/retry state without changing accepted progress or prior media. Usable interrupted partial candidates are eligible under the same explicit durable acceptance path as other compatible candidates. Silent/quiet recorded media is not rejected as zero-data. Context/acceptance responses keep current turn position/total separate from accepted-compatible count/required total; navigation and draft persistence never increment accepted progress.

### Start result assembly

**Input:** project ID, authoritative all-turns-complete revision and accepted-take-set revision. During the initial sequence these come from whichever durable acceptance closes the final gap, regardless of turn order; during a completed-project revision they are revalidated when `To result` is activated.

**Success:** result job identity and Result-flow state.

**Errors:** incomplete/stale revision, job creation failure, service unavailable. This operation must be idempotent and must not undo the final accepted take.

For an initial recording sequence, this follows only the first authoritative incomplete-to-complete transition after durable acceptance. It does not follow capture completion, draft upload, navigation or client-local count changes, and retries/reconciliation cannot create a duplicate job. Ordinary candidate-bearing `Next` records/reconciles the trigger and opens Result. When final-gap acceptance occurs through `Save and go`, `Save and leave`, ordinary sign-out or another explicit navigation guard, record/reconcile the same durable trigger before completing the requested exit, run assembly in the background and preserve that destination instead of opening Result. For a completed-project revision, it is called only by explicit `To result` after any three-way candidate guard resolves; it uses accepted recordings only and preserves the previous finished result until validated replacement success.

### Start eligible reprocessing from Record

**Input:** project/current preparation revision, authoritative eligibility and quote/entitlement revision, explicit authorization, and any unaccepted-draft identity covered by the replacement confirmation.

**Success:** a processing job whose output becomes current only when it contains usable nonempty turns. Only then may the previous preparation and unaccepted draft be logically replaced.

**Errors/outcomes:** locked after first durable accepted take, stale quote/eligibility, insufficient credits, system failure, canceled processing, or completed zero-turn output. Failure preserves prior usable preparation/draft. Zero-turn replacement also preserves a prior nonempty preparation/draft and reports `No dialogue found`; with no prior usable preparation, Record remains ineligible. Mocks must exercise each outcome without claiming real billing, durable media cleanup or production processing.

### Resolve candidate on leave

This is a flow-level composition of automatic/retried `Persist candidate draft` when needed, `Accept candidate`, explicit candidate-draft deletion and navigation or assembly start. It must follow the confirmed Back, screen-leave and `To result` three-action guards and account-owned draft retention; deleting the draft must never delete the accepted take. If acceptance through an explicit navigation guard closes the initial final gap, the composition durably records/reconciles the idempotent assembly trigger before completing navigation, then returns the requested destination rather than Result.

For ordinary sign-out, the composition returns `stay`, `save_failed`, or an authoritative completed candidate outcome before any session termination. If completed save closes the initial final gap, it also returns the durably recorded/reconciled assembly-trigger identity for the frozen accepted snapshot. Only after those required outcomes may it release the fenced project-recording grant, end the current session and return the signed-out landing destination. `Stay`, save failure, unknown candidate/trigger outcome, or failed recording-access release must not be presented as completed sign-out; reconcile authoritative state before retry. Other-device sessions are not an input to revoke and remain active.

### Interchangeable mock truth

The mock boundary exposes distinct temporary microphone test, local candidate, durable recoverable draft, accepted take, recording grant, current session, processing replacement and result job states. Fixtures cover permission/readiness, persistence failures, access denial/loss/reacquisition, stale revisions, reprocessing outcomes, result-start failures, navigation, candidate guards and current-session-only sign-out including uncertain release/termination. End-of-order fixtures return the exact authoritative missing count and first missing turn without a list or assembly. Initial final-gap fixtures cover a middle turn, one idempotent assembly trigger, ordinary Next opening Result and explicit-navigation precedence.

Recording fixtures expose only adjustable reference volume during active dialogue capture, no manual Stop, the unchanged full fixed window and disabled transport/source/navigation/workspace actions. In-app leave cannot create an early stop. Automatic completion and interruption restore controls only after finalization; optional microphone-test Stop remains available on its separate screen. Distinguish usable interrupted partial, incompatible/corrupt media, zero-data failure plus Retry recording, and recorded silence/quiet speech. A usable partial is reviewable and acceptable through Next, including the safe sole-candidate replacement boundary in §5.7; unusable recapture preserves protected media. Preserve prior accepted media until durable acceptance. Phone background/screen lock stops capture/reference and never auto-resumes, auditions or accepts on return. Cross-device recovery requires simulated durable media/account association and is not proven by local playback.

Audition fixtures cover visible disabled Your take without usable media, candidate preference, one-shot completion and explicit Replay/Your take from the fixed-window end after completion or scrub-to-end. Prove reset to window beginning even when the source file has not ended, without concurrent source playback. Source-only changes on paused/inactive media reset without playing; exact direct-action pause behavior awaits prototype resolution. Record supersedes either audition from the full-window beginning and preserves media on readiness failure. Internal progress fixtures cover accepted revisits, blocked empty Next, failed/unknown candidate acceptance, legacy gaps, drafts, usable partials and non-double-counted replacements without mandatory duplicate visible counters.

Fixtures also cover automatic draft persistence when a usable candidate appears, visible saving/account-recoverable/failure-with-retry states, authoritative-success-only recovery claims, stale persistence responses fenced from newer candidates, and no accepted-count/progress/reprocessing-lock mutation. For initial final-gap acceptance, ordinary `Next` opens Result; `Save and go`, `Save and leave`, sign-out and other explicit guard fixtures durably record/reconcile the same trigger before completing the requested navigation with background assembly. Save/trigger uncertainty stays for retry/reconciliation, and completed-project fixtures still require explicit `To result`.

The mock must not:

- invent browser microphone devices or claim real device permission/capture;
- collapse draft persistence and accepted association into one success flag;
- advance from an empty unaccepted turn on Next or create take/count/credit/lock/assembly effects from navigation alone;
- present process-local state as proof of account durability, cross-device recovery or exclusive production recording access;
- imply phone background capture, auto-resume capture/reference on return, or recoverable partial media without fixture-backed bytes and compatibility evidence;
- claim sign-out, landing transition, or recording-access release before their authoritative ordered outcomes, or model ordinary sign-out as all-session revocation;
- delete the previous preparation/draft at reprocessing launch or replace it with zero turns;
- claim real credits, media cleanup, processing, assembly or browser/device compatibility evidence.

## 10. Persistence, ownership and concurrency

- One durable current accepted take exists per turn; temporary artifacts do not form a take library.
- Draft persistence and accepted-take association are different durable states. A recoverable draft remains unaccepted and does not advance the project; only a successful accepted association makes it authoritative for output.
- Every newly usable candidate automatically starts idempotent draft persistence during review. The UI distinguishes saving, authoritative account-recoverable success and failure with retry; `Next` and leave guards may reuse/reconcile that same operation rather than create a second draft identity.
- A candidate is not durable merely because capture stopped, local playback works or an upload progress indicator completed. Cross-device recovery may be claimed only after media storage and account/project/turn association succeed.
- A phone interruption may produce a local unaccepted partial only when actual compatible media is recoverable. It does not replace an accepted take or a protected candidate by itself, and it becomes cross-device recoverable only after durable draft persistence.
- The prior accepted take stays authoritative until the compatible replacement association commits successfully.
- Accepted takes belong to the account-owned project and restore through normal project resume.
- A durably persisted unaccepted draft belongs to the account, restores across devices after sign-in and has no inactivity or fixed-time expiry. Retain it until acceptance, explicit draft deletion, project deletion or account deletion; never auto-accept it on restore.
- A late response for an older candidate, timing revision or accepted-take revision cannot replace newer work.
- Automatic draft persistence is fenced by candidate plus project/turn/processing/timing revisions. A stale success cannot switch the current candidate, and a stale failure cannot erase a newer candidate, prior recoverable draft or accepted take.
- Only one device holds a fenced project-recording grant at a time. Another device may view the project but cannot capture, accept or force takeover. Explicit exit, including ordinary sign-out, releases after its candidate decision completes; confirmed disconnect releases automatically; return requires reacquisition. Ordinary sign-out ends only the current session and leaves other-device sessions active.
- Microphone-test audio is temporary browser-local data removed on leaving the check screen. It never enters account/project persistence and is never conflated with a dialogue candidate.
- The MVP offers no user timing, text or speaker edits. A newer eligible processing revision fences older candidates and accepted-take compatibility, subject to the permanent reprocessing lock after the first successfully accepted saved take.
- Physical disposal timing for superseded, discarded, cached and backup media is a backend operational policy and cannot be inferred from the visible one-take model or no-expiry user contract.
- The flow must expose enough authoritative state to distinguish `candidate`, `saving draft`, `draft recoverable`, `accepting`, `accepted`, `failed` and `stale`; optimistic UI may not collapse them into one saved checkmark.
- Moving across a turn with no candidate or accepted take preserves that turn as unaccepted and changes no durable media, progress, billing or lock state. First-unaccepted resume continues to target it regardless of later navigation history.

## 11. Acceptance criteria

All criteria are unexecuted. Criteria marked **BLOCKED** cannot pass until the named open decision is resolved.

- [ ] **F09-AC-01 — Task hierarchy:** Keep moving scene, prominent spoken line and bounded waveform readable, with full image uncropped by default. No mandatory filename/status trail, exact Capture window copy, separate accepted counter or idle Recording status. Owner-directed centered scene/line/waveform and contextual performance panel remain pending prototype acceptance, including phone/short-screen/long-RU composition.
- [ ] **F09-AC-02 — Immediate bounded capture:** One `Record` activation starts at the fixed turn-window beginning immediately after real microphone/reference readiness, with no countdown, regardless of prior audition seeking/source. It supersedes active audition without a separate Stop click or competing playback streams. Full original audio and moving video run through the fixed window and automatically stop; finishing speech early does not stop capture, and no manual dialogue Stop exists. Readiness failure preserves protected media and never claims capture began.
- [ ] **F09-AC-03 — Independent volume:** Changing reference volume changes only local original/reference playback and never captured microphone media, saved-take gain or final-mix gain.
- [ ] **F09-AC-04 — No implicit continuation:** Capture completion stays on the current turn with no autoplay, auto-acceptance or navigation. A usable candidate automatically starts idempotent draft persistence during review without waiting for `Next`; it remains listenable/rerecordable, and draft persistence never accepts the take, advances project progress, starts assembly or creates the reprocessing lock.
- [ ] **F09-AC-05 — Direct audition/replay:** Group Replay / Record / Your take apart from navigation without mandatory segmented source selection plus common Play. Your take prefers the usable current candidate to compatible accepted media; prior accepted media stays protected. One source/waveform/video plays in sync. Explicit playback at the fixed-window end resets to its beginning for original/candidate/accepted sources, including scrub-to-end and before source-file ended. Exact pause semantics/labels await prototype resolution.
- [ ] **F09-AC-06 — Honest candidate:** An unaccepted or interrupted candidate is visibly distinct from the durable accepted take; missing/corrupt media is never represented as recoverable or saved.
- [ ] **F09-AC-07 — Safe replacement:** Capture, upload, validation, stale response or association failure leaves the prior accepted take authoritative. Only a durable compatible commit replaces it.
- [ ] **F09-AC-08 — Accept before advancing:** Next with a candidate durably accepts that exact compatible candidate idempotently before navigation. Failure/unknown outcome stays on the turn with retry/reconciliation, preserves candidate/prior accepted media and cannot fall through to older-take navigation. Failed acceptance starts no Result job; F09-AC-33 governs accepted revisits and empty-turn blocking.
- [ ] **F09-AC-09 — Initial-sequence completion gate:** After any durable acceptance in the initial sequence, authoritative all-turn eligibility is re-evaluated. The first transition to a fully accepted compatible required-turn set durably starts/reconciles exactly one Result assembly even when the final gap is a middle turn accepted after later turns; no retraversal or separate initial `To result` is required. Ordinary candidate-bearing `Next` opens Result. Acceptance through `Save and go`, `Save and leave`, sign-out or another explicit navigation guard records/reconciles the same trigger before the exit becomes unrecoverable, runs assembly in the background and completes the requested navigation instead of redirecting to Result. Capture completion, draft persistence, navigation and client-local counts never trigger it. Save failure stays on Record; result-start uncertainty preserves accepted takes for reconciliation. Reaching the end with a gap never starts assembly. Completed-project revisions follow F09-AC-29 instead.
- [ ] **F09-AC-10 — Preview mix:** Candidate review uses one processed background, accepted voices for recorded turns and original voices for unrecorded turns; overlapping original speakers remain audible where not yet replaced, and imperfect isolation can be auditioned and accepted.
- [ ] **F09-AC-11 — Revision safety:** A newer eligible processing or turn-timing revision rejects stale candidate acceptance and requires a compatible replacement; competing-tab or duplicate completions cannot silently overwrite newer accepted work. No user text, speaker or timing editing control is present.
- [ ] **F09-AC-12 — Screen-leave guard:** Leaving Record with an unaccepted candidate offers exactly `Save and leave`, `Leave without saving` and `Stay`. Save failure keeps the user on Record with retry available and the previous accepted take protected; discard affects only the candidate. If successful save accepts the initial final missing take, the assembly trigger is durably recorded/reconciled before exit, assembly continues in the background and the requested destination wins.
- [ ] **F09-AC-13 — Automatic account-owned draft recovery:** Every usable candidate starts idempotent draft persistence during review without `Next` or acceptance. The UI exposes saving, authoritative account-recoverable success and save failure with retry. Only after media storage plus account/project/turn association succeed may reload, browser crash or sign-in on another device offer that exact unaccepted take, never auto-accept it; accepted takes restore normally. Persistence is revision-fenced so late older outcomes cannot replace a newer candidate, and failure preserves the current candidate and prior accepted take. Draft success changes no accepted count, project completion, assembly eligibility or reprocessing lock. The draft has no inactivity or fixed-time expiry and remains until acceptance, explicit draft deletion, project deletion or account deletion. Bytes that were never durably stored are not promised as recoverable.
- [ ] **F09-AC-14 — Rerecord safety:** Rerecord never deletes the prior accepted take. A prior candidate is protected until new media successfully finalizes as one valid usable candidate, including a usable interrupted partial. Failed, unusable, zero-data or incompatible recapture preserves it. Successful finalization atomically makes the new recording the sole unaccepted candidate; no automatic acceptance or multi-take choice is introduced.
- [ ] **F09-AC-15 — Permission and interruption:** Permission denial, missing/busy/lost device and blocked reference playback produce specific recoverable states with no false take. On phone, browser backgrounding or screen lock stops the active attempt and synchronized reference; return never auto-resumes either or auto-accepts/replaces a take. An actually recoverable compatible partial is offered as an unaccepted candidate/draft for listen, rerecord or explicit shorter-take acceptance; unusable/missing media yields no new candidate. A prior accepted take and any protected rerecord candidate remain authoritative unless a valid replacement later completes, and cross-device recovery is claimed only after durable draft persistence. **BLOCKED by OPEN-09-08** only for measurable media/timing thresholds and platform finalization mechanics.
- [ ] **F09-AC-16 — Responsive operation:** Core actions remain keyboard/touch reachable, full media and long EN/RU dialogue readable, with safe areas, 48px phone targets and no hidden required content/horizontal page overflow. Validate varied ratios and short screens. Exact panel layout, scrolling/pinning and responsive geometry remain pending prototype approval; old fit arithmetic is not acceptance.
- [ ] **F09-AC-17 — Accessibility and motion:** Keyboard/screen-reader users can identify source, time, capture, candidate/save state and errors; visible focus and an operable semantic waveform alternative are required, and red is never the sole cue. Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.
- [ ] **F09-AC-18 — Localization:** Without a saved preference, browser language `ru` selects Russian and every other browser language selects English; manual choice is available and persists to the signed-in account. An explicit pre-sign-in manual choice wins over and updates a different saved account preference, while a browser-derived default does not overwrite it. English and Russian preserve action meaning and critical save/interruption facts without clipping the active target or controls. **BLOCKED by OPEN-09-10** only for still-unapproved detailed copy.
- [ ] **F09-AC-19 — Direct processing handoff and initial zero turns:** Successful non-empty Processing enters Record directly without Prepare. An initial zero-turn result with no prior usable preparation stays out of Record and Result, shows `No dialogue found` / `Реплики не найдены`, and offers only eligible reprocessing or another video under existing quote, credit and retry rules. A replacement zero-turn outcome follows F09-AC-31.
- [ ] **F09-AC-20 — No repair or approval stage:** Record exposes no transcript, speaker or timing correction, missed-turn addition, targeted segmentation repair, background-only audition or approval. For a poor supplied segment, the user can record it as supplied or start a new project under ordinary rules.
- [ ] **F09-AC-21 — Continue destination and reprocessing lock:** Continue opens Record when unfinished takes remain and Result otherwise. Record exposes a discoverable secondary `Process again` workspace utility before the first durably accepted take under current retry/cost authorization rules; afterward it remains unavailable with the permanent-lock explanation. Capture, microphone test, draft-persistence and acceptance failures do not create the lock.
- [ ] **F09-AC-22 — Bounded Replay window:** Replay plays the original video and full original audio over the exact fixed turn window including margins, identical to capture, and stops at its end. It does not default to a wider context or full-source range.
- [ ] **F09-AC-23 — Previous / Next only:** No turn list, Turns panel, picker or direct selection. Candidate Next accepts before advancing; candidate-free Next advances only on a compatible accepted turn. Empty unaccepted Next is blocked. Previous/Back with candidate offers exactly Save and go / Go without saving / Stay; failure stays with media intact. Final-gap Save and go durably records/reconciles assembly, runs it in background and honors the requested previous-turn destination.
- [ ] **F09-AC-24 — Resume target:** Continue for unfinished recording opens the first turn without an accepted recording in established turn order, not the last-viewed turn; an account-persisted candidate for that turn is offered for recovery without automatic acceptance. A project with no unfinished recording opens Result.
- [ ] **F09-AC-25 — Shared visual tokens and grid:** Record references the approved design-token system and uses semantic/component roles rather than per-flow raw shades. Decorative dividers never serve as essential control borders; primary and recording/destructive controls use their approved default/hover/pressed families with approved foregrounds; link, error, selected and disabled states use their semantic roles; apply source opacity only for genuinely disabled controls, with readable reasons and no dimming of focusable busy controls; light focus is the approved 2px ring/2px gap and media focus is used only on opaque media backing. Record uses only Mabry Pro Regular and Medium, with no Bold or synthetic Bold: body/dialogue are Regular 16px/24px, captions are Regular 14px/20px, buttons use Mabry Pro Medium 14px/20px for task, secondary and navigation actions and Medium 16px/24px for prominent/landing actions; phone buttons use Mabry Pro Medium 16px/24px with retained 48px targets, field labels are Medium 14px/20px, and page headings are Medium 32px/40px desktop and 24px/32px phone. It uses component-specific source geometry; role-sized desktop controls in design-tokens.md and 48px phone targets standard button/input height; 32px desktop / 16px phone horizontal gutters; 8px related-item, 16px field/button, 24px within-block and 32px major-section spacing; and 24px desktop / 16px phone padding on panels that already exist. Below 768 CSS pixels it uses the single-column phone layout; at 768 and above it uses the regular layout within 1200px maximum working content. It uses no gradients or automatic per-block wrapper cards; only mapped source component shadows apply, and spacing creates no new panel.
- [ ] **F09-AC-26 — Microphone check:** First recording entry on a device opens a separate check with browser-exposed device selection, input level, optional `Record test` / `Stop` / `Listen`, and `Continue to dubbing` once access plus a usable input are ready. Test/listen and a level threshold are not mandatory; permission never auto-starts test or dialogue capture; later contextual recovery remains available; a normal-workspace Microphone button is not mandatory.
- [ ] **F09-AC-27 — Temporary microphone test:** Test audio is browser-local, removed on leaving the microphone-check screen, never uploaded/account-persisted/recoverable as a project take and absent on the next visit. Dialogue candidates retain their separate account-owned recovery contract.
- [ ] **F09-AC-28 — Return from Result:** A fully recorded project returning from Result opens the first turn in established order, preserves all accepted recordings, starts neither capture nor rendering, and still exposes only `Back` / `Next` for turn navigation.
- [ ] **F09-AC-29 — Completed-project revision:** In a fully recorded project, `Next` with a candidate durably accepts the replacement, advances normally and stays in Record; ordinary `Back` / `Next` navigation with no candidate changes no take. `To result` explicitly starts updated assembly. With a candidate it offers exactly `Save and go`, `Go without saving`, `Stay`; save failure stays with retry, discard preserves the older accepted take, and rendering uses accepted takes only. The previous finished result remains until valid replacement-render success.
- [ ] **F09-AC-30 — Single-tab project recording:** At most one device and at most one browser tab can capture/accept for a project, including same-profile tabs sharing authentication and the durable client/session. A second tab may view but cannot capture/accept or force takeover. Explicit exit completes its candidate guard before release; confirmed disconnect releases automatically; a returning device or another tab reacquires before capture and stale-grant writes are fenced. **BLOCKED by OPEN-09-13-LEASE** only for measurable technical lease/disconnect/fencing rules.
- [ ] **F09-AC-31 — Safe reprocessing replacement:** Before the permanent lock, `Process again` uses current entitlement/cost authorization. With an unaccepted draft it requires the replacement warning and cost/entitlement confirmation; failure preserves the prior preparation/draft, usable nonempty success replaces them atomically, and a zero-turn replacement preserves prior usable turns/draft while reporting no dialogue.
- [ ] **F09-AC-32 — Guarded ordinary sign-out:** Selecting `Sign out` with an unaccepted candidate first offers exactly `Save and leave`, `Leave without saving`, and `Stay`. Successful save/discard resolution precedes recording-access release, current-session termination, and navigation to the signed-out landing. If save accepts the initial final missing take, its assembly trigger is durably recorded/reconciled before release/session termination; assembly continues in the background and sign-out navigation wins. Save or unresolved-trigger failure stays signed in on Record with retry/reconciliation and the prior accepted take protected; `Stay` changes nothing. Other-device sessions remain signed in.
- [ ] **F09-AC-33 — Sequential Next:** Empty unaccepted turns block Next with concise record-first feedback and no navigation/take/count/credit/lock mutation. Accepted revisits may advance without candidate; a new candidate requires its own authoritative acceptance. Failed/unknown save retains turn/candidate and reconciles the same operation. First-unfinished resume and legacy-gap recovery remain without new skipping.
- [ ] **F09-AC-34 — End with missing accepted takes:** At the end with gaps, show **Remaining turns to record: N** and **First unrecorded turn**. `N` counts required turns without compatible accepted takes; navigation and unaccepted/recoverable drafts do not count. The action opens the first missing-accepted-take turn in established order without a list, preserves the candidate guard before leaving an unaccepted take, and leaves Result assembly unavailable until every required turn is compatibly accepted.
- [ ] **F09-AC-35 — Active-capture action lock:** Only reference-original volume is adjustable during dialogue capture; manual Stop is absent. Waveform seek/scrub, play/pause, source switch, turn navigation and all other workspace actions remain disabled until automatic completion or interruption and finalization. In-app leave cannot end the window early. Reference volume never changes microphone/captured/saved/final gain; browser/OS interruption remains possible, and microphone-check test Stop is preserved.
- [ ] **F09-AC-36 — Wait and audition transitions:** Every newly opened turn and finalized capture waits for explicit audition/Record/rerecord/Next as applicable, with no autoplay, auto-capture, auto-acceptance or advancement. Your take stays visible but disabled with a record-first explanation without usable candidate/accepted media. Its audition runs once and stops on the same turn. Switching sources while playing resets to the window beginning and plays; switching while paused/inactive resets and stays paused. No switch accepts or deletes media.
- [ ] **F09-AC-37 — Partial/empty/progress truth:** Usable interrupted partials may be auditioned, rerecorded or explicitly accepted through Next without mandatory rerecord solely for interruption. Zero-data attempts cannot be accepted; preserve prior media and offer Retry recording. Silent/quiet valid media is distinct. Position and accepted-compatible progress stay separate internally without mandatory visible counters; partial acceptance counts, replacements do not double-count, and navigation/drafts/empty attempts never advance accepted progress.

## 12. Verification plan

This is a proposed test plan, not evidence of execution.

### Contract and state tests

- reducer/store transitions for loading, ready, original/recorded audition, capture, fixed-window auto-stop, usable partial, zero-data failure, candidate, rerecord, saving, accepted, save failed, stale and interrupted states;
- during active capture, assert manual Stop is absent and only reference-original volume is adjustable; seek/play, source switch, turn/workspace navigation, microphone/reprocessing/result actions and in-app leave cannot end capture early or execute before automatic completion/interruption and finalization;
- change reference-original volume during capture and prove fixed timing and microphone/captured gain remain unchanged; finish speech early and prove capture still reaches the fixed end. After automatic completion or interruption, verify only appropriate finalized-state controls return; separately preserve optional microphone-test Stop;
- verify no autoplay/capture/acceptance/advancement on turn entry or post-capture; visible disabled Your take with no usable audio; candidate preference; one-shot audition for candidate and accepted take; playing source switch both ways resets and plays, paused/inactive switch resets and stays paused; Record after middle/near-end seeking or during either audition supersedes playback and starts the full window only when ready;
- Distinguish zero-data from valid quiet/silent media, permit usable-partial acceptance and keep internal position/accepted facts accurate without requiring visible duplicate counters.
- ensure no candidate or accepted state is synthesized from permission/reference failure;
- produce a usable candidate and prove draft persistence starts automatically during review without `Next`; exercise saving, authoritative recoverable success, failure/retry and a stale older completion after a newer candidate appears. Prove recovery is claimed only after durable media/account association and that every path preserves the prior accepted/current candidate appropriately without changing accepted count, project completion, assembly eligibility or the reprocessing lock;
- Ensure candidate-bearing Next is idempotent and waits for durable acceptance; failed/unknown outcomes retain turn/candidate for reconciliation. Candidate-free accepted revisits navigate without mutations, while empty unaccepted Next stays blocked with no persistence/acceptance/billing effect.
- Exercise accepted revisits, blocked empty Next and candidate-bearing Next success/failure/unknown; only authoritative acceptance permits advancement. Previous/Back retains Save and go / Go without saving / Stay, and no direct turn picker exists.
- absence checks for a persistent turn list, `Turns` button, list panel, picker and other direct turn-selection control;
- ensure an old accepted take survives every candidate/capture/save failure path;
- revision-fence tests for a changed processing/turn revision, competing tabs, duplicate callbacks and out-of-order completion;
- absence checks for Prepare and every excluded manual correction, missed-turn, segmentation-repair and background-approval control;
- Processing handoff tests for nonempty turns and initial zero turns without prior usable preparation, including eligible reprocessing/another-video recovery without Record/Result entry; separately verify a zero-turn reprocessing output preserves prior usable nonempty preparation/draft and allows Record continuation under the replacement tests below;
- Continue routing with unfinished takes versus no unfinished takes, plus permanent whole-section reprocessing lock after first accepted success and no lock after capture/draft/acceptance failure;
- resume with several unfinished turns to prove the first without an accepted recording opens regardless of last-viewed state, including offer-only recovery of an account-persisted candidate on that turn;
- Return from Result with all turns complete opens the first turn, preserves takes and starts no capture/render; verify `Back` / `Next` only;
- completed-project revision across several turns: each candidate-bearing `Next` durably accepts and stays in Record, ordinary candidate-free navigation mutates no take, and explicit `To result` starts one idempotent updated assembly; exercise the exact three candidate-guard outcomes and save/job failures while preserving the previous result;
- Verify secondary Process again discoverability, entitlement/cost warning and permanent lock after first durable acceptance; tests and unaccepted drafts do not lock it.
- reprocessing with an unaccepted draft across declined confirmation, system failure, usable nonempty success and completed zero-turn output; prove prior preparation/draft survives until usable replacement and survives the zero-turn outcome;
- exclusive recording-access transitions for acquire, held elsewhere, explicit guarded exit/release, confirmed-disconnect auto-release, reacquisition and stale-grant fencing; verify there is no forced-takeover action or device identity;
- ordinary sign-out from Record with and without a candidate: verify exact `Save and leave` / `Leave without saving` / `Stay` choices, save failure with retry, and ordered candidate resolution; when that save closes the initial final gap, verify durable idempotent assembly-trigger recording/reconciliation occurs before recording-access release, current-session termination and signed-out landing, background assembly does not steal navigation, and another device remains signed in;
- mock-contract checks keep microphone test, candidate, recoverable draft, accepted take, recording grant, replacement processing and result job distinct, and never report process-local simulation as production durability, exclusivity, billing or media evidence;
- rerecord with an existing candidate across full-window success, failed/unusable/zero-data/incompatible finalization and interrupted usable partials; prove protected media survives unsuccessful finalization and one usable finalized partial can become the sole current unaccepted candidate, then be auditioned/accepted through Next without mandatory rerecord;
- phone browser background and screen-lock transitions during capture: prove capture and synchronized reference stop, returning never auto-resumes or auto-accepts, actually recoverable compatible partial media appears only as an unaccepted candidate/draft, unusable/missing media creates no candidate, and the prior accepted/protected candidate is unchanged when there is no valid replacement;
- initial-sequence completion in multiple orders, including accepting the final gap in a middle turn after later turns are already complete: prove ordinary candidate-bearing `Next` starts exactly one Result job and opens Result without retraversing the final turn or exposing a separate initial `To result`; repeat final-gap acceptance through `Save and go`, `Save and leave`, sign-out and another explicit guard, proving the same trigger is durably recorded/reconciled before exit, assembly runs in the background and each requested destination wins. Prove save/trigger failure stays for retry/reconciliation, completed-project acceptance still requires explicit `To result`, and capture completion, draft persistence, navigation, client-local counts, duplicate responses and reconciliation do not start extra jobs or roll back accepted takes;
- Seed legacy/interrupted projects with gaps and verify missing count/First unrecorded turn plus candidate guard without creating new gaps via normal Next. Assembly stays unavailable until all required takes are accepted-compatible.

### Media/timing integration tests

- supported desktop and phone browsers with granted, prompt, denied and revoked microphone permission;
- microphone-check device enumeration, selected-input loss, live-level feedback, optional test/listen and readiness-only Continue; verify permission grants never auto-start a test/take and no level threshold is required;
- leave the microphone-check screen after stopped, active and failed tests; prove test bytes are removed locally, never sent through project-draft services and are absent on return;
- exact-interval checks proving Listen and capture use the same turn start/end including margins, and that Listen stops at the fixed end without widening to section/full-source playback;
- full-window auto-stop with early speech completion, no manual dialogue Stop, and usable interrupted partials at different durations; measure recoverability/tolerance once **OPEN-09-08** is resolved without requiring full-window audio or rejecting silence;
- video/reference/capture start alignment and measured tolerance under normal and throttled conditions;
- reference playback rejection, device loss, Bluetooth/device change, tab backgrounding and phone screen lock/media interruption; measure stop/finalization ordering, actual partial-media availability and compatibility without inferring recoverability from an event alone;
- overlapping-speaker preview with saved/unsaved combinations and one background;
- when a replacement candidate and prior accepted take both exist, verify that `Your take` plays the candidate and changes the waveform to it while acceptance failure still leaves the prior accepted take authoritative;
- account-owned candidate-draft recovery after reload and sign-in on another device only after durable media/account association; no-expiry state and explicit deletion/acceptance/project-deletion/account-deletion boundaries;
- same-device return after phone background/screen lock before and after durable interrupted-draft persistence; prove local playback alone never creates a cross-device recovery claim and no capture/reference resumes automatically;
- explicit proof that draft persistence alone does not replace the accepted take or advance project progress;

### Interaction and responsive tests

- desktop, tablet and phone layouts around the 768 CSS-pixel breakpoint using long English, long Russian and mixed-script target lines; verify one column below 768, regular navigation/layout from 768 and a 1200px maximum working-content width;
- visual-contract inspection at desktop and phone widths for every approved semantic/component mapping: decorative divider versus essential control border, primary/destructive default-hover-pressed foregrounds, link, error, selected, disabled source opacity only for genuinely disabled controls, with readable reasons and no dimming of focusable busy controls, `focus.light` geometry and `focus.media` on opaque media backing; also verify Mabry Pro Regular/Medium only, role-specific Mabry Pro Medium desktop labels from design-tokens.md, Medium 14px/20px field labels, the other approved type/line heights, component-specific source geometry, role-sized desktop controls in design-tokens.md and 48px phone targets standard control heights, 32px/16px gutters, 8/16/24/32px shared spacing, 24px desktop / 16px phone padding on existing panels, and absence of gradients, unmapped decorative shadows, new panel wrappers and per-block cards. Treat static token evidence separately from font loading, browser rendering, forced-colors and actual accessibility evidence;
- Validate the future approved prototype for desktop repeated rehearsal, coherent workspace/action grouping and durable errors. An old below-waveform screenshot or fit assertion cannot accept the new composition.
- Validate phone/short-screen prototypes with long EN/RU, portrait/square/landscape and safe areas, including full dialogue/media, reachable actions and deliberate usable scrolling.
- first-use language selection for browser `ru` versus other browser languages, manual switching, signed-in account-preference reuse, explicit pre-sign-in choice overriding/updating a different saved preference, and browser-derived default not overwriting that saved preference;
- portrait and landscape source video while preserving video dominance and reachable controls;
- keyboard-only operation, focus order, focus restoration after dialogs/errors and no conflicting shortcuts while typing/using sliders;
- screen-reader announcements for record start/stop, candidate ready, saving, accepted and failed states;
Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged. 
- `Back` with an unaccepted candidate, covering all three Back-specific actions and a failed `Save and go` retry;
- screen-leave attempts through every enabled workspace destination and browser history, covering all three leave actions and a failed `Save and leave` retry.
- active-capture in-app leave remains unavailable without shortening the window; after automatic completion/finalization, exercise the applicable guard. Separately exercise browser-tab/window closure/page-lifecycle termination as interruption without claiming closure prevention.
- `Sign out` from the phone and desktop shell with an unaccepted candidate, covering all three actions, keyboard/focus return, failed save, current-session-only termination, landing destination and release of exclusive recording access only after the exit decision completes.

### Failure evidence

For each case record environment/browser/device, project and turn revision, command or manual procedure, observed timestamps/durations, expected and actual authoritative take, result, date and evidence location. Physical-device and acoustic findings must be separated from mock/service-contract results.

## 13. Dependencies and cross-flow contracts

- **Shared contract:** navigation, project header/save state, localization and centralized services boundary; [design-tokens.md](design-tokens.md) is authoritative for primitive, semantic, component-state, typography, spacing, focus and motion roles.
- **Design guidance applied:** `.agents/skills/design-taste-frontend/SKILL.md` (including its application-screen guidance) and `.agents/skills/frontend-design/SKILL.md` informed hierarchy, control placement, responsive behavior and accessibility. This specification is the contract; no browser render or runtime proof is claimed here.
- **Processing flow:** supplies the selected section, ordered automatic turns, fixed windows/margins and processing/turn revisions; usable nonempty preparation hands off directly to Record. Initial zero turns without prior usable preparation remain in `No dialogue found` recovery, while zero-turn reprocessing preserves prior usable nonempty preparation/draft and permits continued Record work against those turns. `Process again` uses its authoritative retry/cost quote and replaces existing preparation/draft state only after usable nonempty success.
- **Flow 10 Result:** accepts the initial first authoritative all-turn completion handoff after durable acceptance and the completed-project `To result` handoff only when every required turn has a compatible accepted take; legacy/reconciled incomplete state remains in Record with missing count/recovery. Ordinary final-gap `Next` opens Result, while a final-gap acceptance through an explicit navigation guard durably starts/reconciles background assembly and preserves the requested destination. Result owns assembly progress and retry, preserves the previous result during replacement rendering and returns completed projects to the first turn.
- **Flow 11 Projects:** restores accepted project/take progress and account-owned recoverable drafts; navigation history does not count as progress; normal Next cannot skip an unfinished turn. `Continue` opens the first turn without an accepted recording in established order when unfinished takes remain, and Result otherwise.
- **Authentication/session flows:** ordinary sign-out resolves the Record candidate guard and, when save closes the initial final gap, waits for durable assembly-trigger recording/reconciliation before releasing owned recording access, terminating only the current session and opening the signed-out landing while background assembly continues and other devices stay signed in. Reauthentication cannot promote a local candidate to saved status, bypass revision/recording-grant fences or turn a browser-derived language default into an explicit preference.
- **Backend/media work:** must validate synchronized timing, automatic candidate-draft persistence and revision fencing, overlap-preview isolation, durable association, initial assembly-trigger durability/idempotency before explicit exit, single-device recording ownership, automatic release after confirmed disconnect, stale-operation fencing and retention. The frontend cannot prove these properties alone.

Cross-flow issues to resolve once, not independently in this document:

- Mabry Pro font-file availability, browser loading and fallback/rendered proof; Regular/Medium-only weights, approved line heights, the 8/16/24/32px common spacing scale, existing-panel padding, 768px breakpoint and 1200px working-content maximum are settled;
- actionable shared persistence/recovery semantics when acceptance is pending, failed or unknown, without mandatory idle Saved chrome;
- operational cleanup timing for superseded, explicitly deleted, cached and backup draft media across Record, authentication round trips and Projects resume; the user-visible account ownership and no-expiry contract is settled;
- authoritative incomplete-to-complete acceptance transaction boundary with Result job creation;
- global navigation/history interception pattern for unsaved work dialogs.
- exact heartbeat/lease timing, authoritative disconnect classification, interruption handling and stale-write fencing for single-device recording ownership.

## 14. Current rule reference

- **RESOLVED-09-01:** One waveform/video follows the auditioned source. The former toggle/common-Play UI is superseded by Replay / Your take; candidate preference and single-source synchronization remain.
- **RESOLVED-09-04:** Replay plays the exact fixed turn window including margins, identical to capture, and stops at that window's end; it has no wider-context or full-source default.
- **RESOLVED-09-05:** When a new candidate exists, `Your take` plays that candidate for evaluation before acceptance rather than the prior accepted take. The prior accepted take remains protected until durable replacement acceptance.
- **RESOLVED-09-02:** The leave guard has exactly `Save and leave`, `Leave without saving` and `Stay`. A failed save keeps the user on Record with retry available and the previous accepted take protected.
- **RESOLVED-09-02B:** `Back` with an unaccepted candidate has exactly `Save and go`, `Go without saving` and `Stay`. Durable save precedes navigation; failure stays on the current turn, discard preserves the prior accepted take and Stay performs no navigation or acceptance.
- **RESOLVED-09-03A:** An unaccepted take is recoverable after reload or browser crash and is offered without automatic acceptance.
- **RESOLVED-09-03B:** After durable media and account association, the draft is account-owned and recoverable across devices after sign-in. Same-browser-only recovery is insufficient, and bytes not durably stored must not be promised as recoverable.
- **RESOLVED-09-03C:** The account-owned draft has no inactivity or fixed-time expiry and remains until acceptance, explicit draft deletion, project deletion or account deletion. Physical cleanup timing for discarded, superseded, cached and backup media remains an operational policy.
- **RESOLVED-09-SCOPE:** Successful non-empty Processing goes directly to Record. Prepare and manual transcript, speaker/timing, missed-turn, segmentation-repair, background-audition and approval controls are absent.
- **RESOLVED-09-SEGMENTATION:** A poorly segmented supplied turn can be performed as supplied or handled by starting a new project; no repair/reset path is added. Whole-section reprocessing locks permanently after the first successfully accepted saved take.
- **RESOLVED-09-06A:** My projects `Continue` opens Record when unfinished takes remain and Result otherwise. Initial zero detected turns without prior usable nonempty preparation cannot enter either destination and remain in Processing recovery with eligible reprocessing or another video. A zero-turn reprocessing output preserves prior usable nonempty preparation and its unaccepted draft, reports no dialogue for the new attempt and permits continued Record work against the preserved turns under §5.10.
- **RESOLVED-09-06B:** No turn list/panel/picker. Previous / Next only; 2026-10-26 requires accepted-compatible current media before forward advancement and explicit current-candidate acceptance when present. Former empty-turn skipping is superseded.
- **RESOLVED-09-06C:** Continue for unfinished recording opens the first turn without an accepted recording in established turn order rather than the last-viewed turn, and offers any account-persisted candidate there without auto-acceptance.
- **RESOLVED-09-09:** During rerecord, keep the existing candidate until successful finalization of a valid usable replacement, including a usable interrupted partial. Failed, zero-data, unusable or incompatible finalization preserves it. The replacement becomes the sole unaccepted candidate atomically without a multi-take library; accepted media stays protected until durable acceptance.
- **RESOLVED-09-PHONE-INTERRUPTION:** Phone browser backgrounding or screen lock stops the active capture attempt and synchronized reference rather than deliberately continuing them. On return, actually recoverable compatible partial audio may be offered only as an unaccepted candidate/draft for listen, rerecord or explicit shorter-take acceptance; capture/reference never auto-resumes and the partial never auto-accepts. Without a valid usable replacement, the prior accepted take and any protected rerecord candidate remain authoritative. Cross-device recovery starts only after durable draft persistence.
- **RESOLVED-09-VISUAL:** The shared treatment references [design-tokens.md](design-tokens.md) for primitive, semantic and component-state roles rather than redefining raw shades. Typography uses Mabry Pro Regular and Medium only. Current desktop action roles are task40px/Medium14px/20px, prominent/landing44px/Medium16px/24px, secondary32px/Medium14px/20px and navigation36px/Medium14px/20px; medium segmented controls are40px/14px/20px desktop and48px/16px/24px phone. Original compact source measurements are provenance in the reference catalog, not current Dubbed button sizes. Phone buttons retain Medium16px/24px and48px targets; field labels remain Medium14px/20px. Control radius, mapped states, gutters, shared spacing, existing-panel padding, the768px boundary and1200px maximum remain governed by the active token contract. Gradients and per-block wrappers remain excluded; mapped source component shadows are required. Font assets/loading, fallback and rendered proof remain open.
- **RESOLVED-09-TOKENS:** The complete owner-approved token specification is normative. No component may choose arbitrary primitives or reuse `divider.decorative` as an essential border; disabled state uses its semantic background/foreground source opacity only for genuinely disabled controls, with readable reasons and no dimming of focusable busy controls, and media focus is valid only on opaque black backing. Static contrast evidence is not rendered accessibility acceptance.
- **RESOLVED-09-MOTION:** Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.
- **RESOLVED-09-DESKTOP-CONTROLS:** Former always-below-waveform placement is superseded by the 2026-10-26 owner direction. Contextual performance-panel composition awaits prototype validation; retain reachability without freezing old geometry.
- **RESOLVED-09-PHONE-CONTROLS:** Former prescribed pinning/fit budget is historical. Phone/short-screen composition awaits validation while retaining safe areas, readable unobscured scene/dialogue, reachable targets and no turn list.
- **RESOLVED-09-LANGUAGE:** With no saved preference, browser language `ru` selects Russian and other browser languages select English. Manual English/Russian choice persists to the signed-in account. An explicit pre-sign-in choice wins over and updates a different saved preference; a browser-derived default does not overwrite one.
- **RESOLVED-09-NEXT:** Next durably accepts the current candidate before advancing. Without one it advances only if this turn already has compatible accepted media; otherwise stays blocked. Failure/unknown acceptance retains turn/candidate. Navigation changes no take/count/credits/lock. Legacy gaps remain recoverable; first authoritative completion records initial assembly regardless of final-gap position. Completed-project revisions require To result.
- **RESOLVED-09-14:** End-of-order with missing accepted-compatible takes shows **Remaining turns to record: N** and **First unrecorded turn**. The count excludes navigation and unaccepted drafts; the action opens the first missing accepted take in established order without a turn list; candidate guards still apply; Result remains unavailable until all required turns are compatibly accepted.
- **RESOLVED-09-AUTO-DRAFT:** A usable candidate automatically starts idempotent draft persistence during review without waiting for `Next` or acceptance. Saving/account-recoverable/failure-with-retry remain distinct; durable recovery is claimed only after authoritative media and account association, stale outcomes are revision-fenced, and draft persistence changes no accepted count, completion, assembly eligibility or reprocessing lock. This resolves MEDIA-R01.
- **RESOLVED-09-INITIAL-ASSEMBLY:** In the initial sequence, accepting the final missing compatible take automatically records/reconciles one idempotent assembly trigger even when that gap is in the middle of the established order. Ordinary candidate-bearing `Next` opens Result. When acceptance occurs through Back/`Save and go`, `Save and leave`, sign-out or another explicit navigation guard, background assembly starts while the requested destination wins, after the trigger is durable and before exit/release makes initiation unrecoverable. Save failure stays for retry; capture completion, drafts, navigation and local counts do not trigger assembly. No final-turn retraversal or separate initial `To result` is required. Completed-project revision assembly remains the explicit `To result` path. This incorporates MEDIA-R02.
- **RESOLVED-09-MIC:** First entry per device uses the separate check with actual exposed devices/levels and optional test. Continue is primary when ready; test/level threshold is not required. The normal-workspace Microphone mandate is superseded; contextual recovery remains, and Settings location/return is pending.
- **RESOLVED-09-MIC-TEMP:** Microphone-test audio is browser-local only, removed on leaving the check screen, never account-uploaded/persisted/recovered and absent on the next visit. It is distinct from account-owned dialogue candidates.
- **RESOLVED-09-RESULT-RETURN:** `Return to recording` from a fully recorded Result opens the first established turn, preserves all accepted takes and starts neither capture nor rendering.
- **RESOLVED-09-TO-RESULT:** Completed-project replacement acceptance with `Next` stays in Record. `To result` starts updated assembly and, with an unaccepted candidate, offers exactly `Save and go`, `Go without saving`, `Stay`; rendering uses accepted takes only and preserves the previous finished result until replacement success.
- **RESOLVED-09-EXCLUSIVE:** Only one device records a project at a time. Handoff requires leaving Record on the current device before entering it elsewhere; there is no forced takeover. Authoritative confirmed disconnect releases access automatically, and any returning device must reacquire.
- **RESOLVED-09-SIGNOUT:** Ordinary `Sign out` from Record first resolves an unaccepted candidate through exactly `Save and leave`, `Leave without saving`, or `Stay`. Save failure stays signed in on Record with retry; a completed exit releases exclusive recording access, ends only the current session, and opens the signed-out landing. Other-device sessions remain active.
- **REC-B01 / RESOLVED-09-ACTIVE-CAPTURE:** Dialogue capture has no manual Stop; full fixed-window auto-stop applies even when speech finishes early. Only reference volume remains adjustable; transport/source/navigation/other workspace actions stay disabled until automatic completion or interruption and finalization. In-app leave cannot shorten capture. Browser/OS interruption recovery and optional microphone-test Stop remain.
- **REC-B02 / REC-B03:** Post-capture review and every newly opened turn wait for user action, without autoplay, capture, acceptance or navigation.
- **REC-B04:** Your take stays visible but disabled with a record-first explanation when no usable candidate or accepted media exists.
- **REC-B05:** Usable interrupted partials may be listened to, accepted through Next or rerecorded. No mandatory rerecord solely for interruption; preserve prior media through the applicable candidate-finalization and durable-acceptance boundaries.
- **REC-B06:** Position and accepted-compatible progress remain distinct domain facts. Separate visible counters in the dated batch are superseded only in presentation by 2026-10-26. Accepted compatible media, including usable partials, alone advances progress.
- **REC-B07:** Zero-data attempts cannot be accepted; show error/Retry recording and preserve prior media. Valid silence is distinct. Empty unaccepted Next is blocked by the later sequential rule; backward navigation/legacy recovery remain.
- **RESOLVED-09-PLAYBACK:** Own-take audition runs once on the same turn; explicit playback at/beyond the fixed-window end restarts synchronized media at the beginning for either source, independent of source-file ended. Record supersedes audition from the full-window beginning. Source-only changes reset and preserve paused/inactive state; direct action pause details remain OPEN-09-PLAYBACK-DESIGN. No audition accepts/deletes media.
- **RESOLVED-09-REPROCESS:** Record shows a visible `Process again` action before the first durably accepted take and a permanent-lock explanation afterward. With an unaccepted draft, confirmation describes replacement and entitlement/cost; previous usable preparation/draft survive until usable nonempty success, including preservation after system failure or a zero-turn replacement.
- **RESOLVED-09-FORM-ERRORS:** Errors stay with the affected bounded workspace/control and durable actionable accessible recovery. Persistent blocked/unknown/unsaved states cannot rely on transient toast alone. Preserve recoverable candidate/prior accepted media.

## 15. Open decisions

No item below is an implementation choice. Each requires owner or approved shared-contract resolution before affected acceptance criteria can be considered complete.

| ID | Decision needed | Why it matters |
|---|---|---|
| **OPEN-09-07** | Validate owner-directed desktop structure, phone/short-screen adaptation, dialogue prominence, varied ratios, geometry and font loading/fallback. | Current component identity/tokens remain; new anatomy and any proposed dialogue type role are unapproved. |
| **OPEN-09-PLAYBACK-DESIGN** | Exact pause behavior for an already-playing direct action and final labels; Settings reconfiguration location and safe candidate-preserving return. | Preserve ended-window restart, single-source playback, no autoplay on entry and contextual input recovery; do not invent routes/guards. |
| **OPEN-09-08** | Capture margins, measured start/stop tolerance, latency trimming/padding, recoverable-media compatibility evidence, and browser event-order/finalization mechanics. | Technical measurability remains open. Full-window automatic capture without manual Stop, disabled in-app leave, independent reference volume, usable partial acceptance, zero-data rejection distinct from silence, and phone interruption stop are settled. Do not reopen them through an arbitrary duration/quality gate or claim browser closure prevention. |
| **OPEN-09-10** | Approved English/Russian labels and messages for permission, interruption, unsaved candidate, leave choice and save failure. | Prevents downstream product-copy decisions and supports testable localization. |
| **OPEN-09-12-OPS** | Operational deletion timing for explicitly deleted, superseded, cached and backup draft media. | The user-visible account ownership and no-expiry retention contract is settled; storage operations still need an implementable privacy/cleanup policy without promising immediate physical erasure. |
| **OPEN-09-13-LEASE** | Exact recording-grant heartbeat/lease timing, authoritative disconnect classification, interruption handling and stale-write fencing mechanics. | The owner settled automatic release after confirmed disconnect and mandatory reacquisition but did not approve arbitrary timing or protocol constants. |
