> WITHDRAWN — owner decision, 2026-10-22. This flow is not in the MVP. Prepare, manual transcript/speaker/timing editing, missed-line addition and background audition were removed. The text below is a historical draft, not an active requirement or pending owner-question list. Follow [the shared contract](00-shared-contract.md); processing now leads directly to Record.

# Frontend Flow 08 — Prepare

Status: draft; specification only; pending owner decisions `P08-Q1`–`P08-Q3` and cross-flow readiness decisions.

Date: 2026-10-22 (Asia/Qyzylorda).

Authority: [shared frontend contract](00-shared-contract.md), then the latest owner decisions recorded there, then unchanged behavior in [SPEC-001](../specifications/SPEC-001_dubbed_mvp.md) and [BR-001](../business-requirements/BR-001_custom_video_dubbing.md). Historical frontend implementation evidence does not establish current behavior or readiness.

This document specifies the frontend experience only. It does not authorize product code, dependencies, mockups, GitHub changes, Git operations, paid processing, or deployment. Exact routes, breakpoints, typography, color values, measurements, motion, and component geometry remain open unless this document says otherwise.

## 1. Purpose and boundary

Prepare lets a signed-in project owner review the prepared selected section before recording. The user can:

- play the complete selected section with subtitles;
- see every currently active turn highlighted in a selectable chronological transcript, including simultaneous turns;
- audition the processed background;
- correct a turn's text, speaker, and timing;
- add a missed turn with text, speaker, and timing, even after other turns have saved takes;
- request eligible whole-section reprocessing after seeing its reset consequences;
- move to Record when the project is ready under the final readiness contract.

Prepare does not provide translation, general split/merge, a full video editor, voice cloning, performance scoring, a multi-take library, result assembly, or processing progress. The Processing flow owns an authorized reprocessing job after the handoff. Record owns capture and take acceptance.

## 2. Entry, exit, and dependencies

### 2.1 Entry

Valid entry points are:

1. Processing activates a complete, usable preparation revision and opens Prepare.
2. My projects resumes a project whose authoritative stage is Prepare.
3. Record or Result returns to Prepare to correct an existing or missed turn.
4. A failed reprocessing attempt returns through Processing with the prior usable preparation still active.

Prepare must load the authoritative account-owned project revision. A client-only transcript, locally completed progress animation, stale tab, or historical finished result cannot be presented as the current editable preparation.

Entry requires:

- an authenticated owner session;
- an existing project and selected-section timeline;
- an activated preparation with valid transcript/turn data and playable processed background;
- current correction revision and reprocessing eligibility from the authoritative service.

If the initial preparation has not completed, is invalid, or lacks required background, the project belongs in Processing or its recoverable failure state rather than a falsely ready Prepare screen.

### 2.2 Exit

Prepare can exit to:

- Record through **Start recording**, after final readiness checks;
- Processing after an eligible, revision-bound reprocessing request is accepted;
- another workspace destination through shared navigation, subject to the final unsaved-edit behavior in `P08-Q1`;
- My projects when the project is unavailable or deleted elsewhere.

The destination turn when entering Record is a cross-flow open decision. Prepare must pass the authoritative project/preparation identity and must not choose a stale or timing-incompatible take as ready.

### 2.3 Required upstream and downstream contracts

- Upload/selection defines the canonical selected-section timeline and source offset mapping.
- Processing activates transcript, speaker, turn, subtitle, and background artifacts together as one usable preparation revision.
- Corrections persist against an expected revision; conflicts cannot silently overwrite newer work.
- Record consumes the current preparation revision and sets the permanent reprocessing lock after the first take is successfully accepted and saved.
- Result eligibility treats every added turn and every timing-invalidated turn as requiring a compatible saved take.

## 3. Screen anatomy

Prepare is a working application screen. It uses the shared compact top navigation and project workspace header rather than a permanent sidebar or a marketing-page hero.

### 3.1 Shared workspace chrome

The screen contains:

- compact global navigation: New dub, My projects, credit balance, account;
- project identity and the shared Prepare / Record / Result stage indicator;
- authoritative save or synchronization status;
- Prepare's primary transition to Record when allowed.

Exact project-title placement, stage-control treatment, and save-status geometry are shared-design decisions, not selected here.

### 3.2 Main review workspace

The main workspace contains four functional regions:

1. **Video preview.** A black stage with the complete selected section, standard playback/scrubbing controls, and current subtitles.
2. **Transcript.** A chronological selectable list of prepared turns with speaker, text or sound caption, and time range. Playback-active state and user-selected state are distinct.
3. **Background audition.** A clear way to hear the processed background before recording. The comparison/control pattern and whether explicit acceptance gates Record are pending `P08-Q2`.
4. **Actions.** Add missed line, eligible reprocessing, and Start recording/readiness feedback.

When multiple turns overlap the playhead, all are shown in the subtitle treatment and all corresponding transcript rows are active. One selected row can coexist with several playback-active rows. Highlighting must not imply that overlapping turns are mutually exclusive.

Selecting and editing are separate semantics. An edit action opens the editor for the selected turn. Whether row selection also seeks playback or opens editing is open; implementation must not invent the coupling.

### 3.3 Turn editor

Editing a turn opens a **separate editor panel**. The editor is not expanded inside a transcript row.

It contains:

- the selected turn's text or nonverbal caption;
- speaker assignment from the project speaker model;
- start and end boundaries on the selected-section timeline;
- a visual relationship to the affected range and neighboring/overlapping turns;
- validation and take-impact messaging;
- the persistence controls selected by `P08-Q1`.

Timing can be adjusted by dragging boundaries, as required by SPEC-001. An equivalent non-drag interaction is required for keyboard and assistive-technology users; the exact control and displayed time precision remain open.

Text and speaker-only saves keep an existing saved take compatible. Any start/end change makes that take ineligible for export and requires a replacement, while retaining the old recording until a compatible replacement is durably saved. This consequence is shown before the timing change is committed under the final `P08-Q1` save model.

General turn split/merge is absent. Speaker creation/renaming is not inferred from speaker assignment and remains outside this flow until an authoritative contract adds it.

### 3.4 Add missed line

**Add missed line** creates a new manual turn through the same separate editor surface, with required text or sound caption, speaker, start, and end values. The initial timing-selection method is pending `P08-Q3`.

The user may add a missed turn before recording or after other turns already have saved takes. Valid overlaps are allowed and remain independent turns. Adding a turn never invalidates unrelated takes, but the new turn requires its own compatible take before result assembly.

Until the new turn is successfully saved, it is not part of the authoritative transcript. Canceling the editor must not leave a partial turn. Save failure keeps the user's recoverable draft visible and leaves the authoritative transcript unchanged.

### 3.5 Reprocessing action

Prepare exposes whole-section reprocessing only when the authoritative project state says it is eligible.

Before authorization, the screen states that a **successful** replacement will reset:

- all prepared turns;
- all text, speaker, and timing corrections;
- all manually added turns.

The warning also states that a failed replacement keeps the current usable preparation and edits. Consent is bound to the expected correction revision; if edits change after consent, the request must be reconciled or confirmed again rather than silently discarding newer work.

The UI shows whether the project's one included retry is available or whether the normal preparation quote applies. It does not invent pack prices or allocation policy. Once the request is accepted, the user moves to Processing, which owns queued/running/cancel/failure/success states and actual retry execution.

Reprocessing becomes permanently unavailable after the first take is successfully accepted and saved. Failed capture or failed save does not set the lock. Deleting takes never clears it. A stale open dialog must fail safely if another tab or concurrent Record action sets the lock before submission.

## 4. Responsive composition

### 4.1 Desktop

- The video is on the left and the selectable transcript is on the right.
- The editor opens as a separate panel rather than inside the list.
- The video remains a visually distinct black stage; the transcript is dense enough for review without becoming a stack of decorative cards.
- Exact columns, widths, panel docking/overlay behavior, minimum viewport, and breakpoint are open.

The editor must preserve enough context to identify the video range and transcript turn being edited. A layout must not silently replace the video with the editor or turn Prepare into a full-screen form unless a later owner decision explicitly selects that behavior.

### 4.2 Phone

- The video is above the transcript.
- The transcript is below the video and remains a chronological list.
- The editor opens as a bottom sheet.
- Touch targets, player controls, timing adjustment, and primary actions must remain operable without horizontal page scrolling.

The bottom sheet returns focus to its invoking turn/action when closed. Its modal/modeless behavior, detents, and exact height remain open; the chosen behavior must provide correct focus containment and background interaction semantics.

### 4.3 Intermediate widths and orientation

Tablet composition, landscape-phone behavior, and exact responsive thresholds are open shared-design decisions. At every width, the product must retain the confirmed video/list order, access to the separate editor, and access to the full transcript; it may not drop timing, speaker, take-impact, or overlap information to make the layout fit.

## 5. Interaction and state transitions

### 5.1 Review playback

1. The screen loads the current preparation revision.
2. The user plays or scrubs the complete selected section.
3. Subtitles follow playback time.
4. Every turn whose interval contains the playhead becomes active in the transcript; overlapping active turns are all represented.
5. The selected turn remains distinguishable from playback-active turns.

Playback end leaves the transcript and corrections intact. Seeking, pause, source media buffering, and background audition cannot mutate preparation data.

### 5.2 Correct an existing turn

1. The user selects a turn and invokes edit.
2. The separate editor loads that turn and its authoritative revision.
3. The user changes text, speaker, timing, or a permitted combination.
4. Client validation rejects impossible ranges before submission; overlap alone is not an error.
5. The save model follows `P08-Q1`.
6. A successful response updates the transcript and save status from the returned revision.
7. If timing changed, the row and project readiness immediately show that a replacement take is required. If only text/speaker changed, the saved take remains compatible.

A stale-revision response never auto-merges timing or overwrites the user's draft. The user sees that the turn changed elsewhere and can reload/reconcile using a later defined conflict interaction.

### 5.3 Add a missed turn

1. The user invokes Add missed line.
2. The UI collects the new interval according to `P08-Q3` and opens the editor.
3. Text or sound caption, speaker, start, and end are completed.
4. The same validity and expected-revision guards used for correction apply.
5. Success inserts the manual turn in chronological order without flattening overlaps.
6. Readiness shows that this turn needs a recording.

### 5.4 Audition background

The user can hear the processed background for the selected section before recording. Background playback uses the activated preparation revision and clearly identifies what is being heard. It must not promise perfect voice removal; faint residual dialogue or artifacts may remain.

The exact Original/Background comparison, playback-position synchronization, and explicit acceptance rule are pending `P08-Q2`. Until resolved, acceptance criteria must prove audition access but must not require a checkbox, modal, or mandatory listen duration.

### 5.5 Request reprocessing

1. The screen obtains current retry eligibility, quote status, and correction revision.
2. The user invokes reprocessing.
3. The reset warning names all affected correction classes and manually added turns.
4. The user confirms against that revision and quote.
5. The authoritative service either accepts one request and returns the Processing handoff, or rejects it without changing the active preparation.
6. Revision conflict, stale quote, permanent lock, or already-running work is resolved explicitly; no duplicate request is inferred from a timeout.

### 5.6 Start recording

Start recording must perform an authoritative readiness check. Confirmed minimum conditions are:

- the current activated preparation revision is usable;
- there is no pending correction save or accepted reprocessing handoff;
- every persisted turn has a structurally valid text/sound caption, speaker, and in-bounds positive interval;
- the required background artifact remains playable/eligible;
- the preparation revision handed to Record is current.

The following remain open and block the final transition acceptance criteria:

- whether explicit background-quality acceptance is required (`P08-Q2`);
- behavior for a successfully prepared project that still has zero turns;
- the destination turn in Record: first chronological, currently selected, or first missing/timing-invalidated take;
- whether an unsaved editor can be saved as part of the transition (`P08-Q1`) or must be resolved first.

## 6. State model

| State | Visible behavior | Allowed recovery/transition |
|---|---|---|
| Loading | Workspace shell and honest loading treatment; no stale transcript shown as current | Load current project/preparation or enter load error |
| Ready | Preview, transcript, audition, allowed actions, readiness status | Play, select, edit, add, reprocess if eligible, Start recording if ready |
| Zero turns | Valid empty transcript with direction to add a missed line; no false processing failure | Add missed line; final Record behavior remains open |
| Editing | Separate desktop panel or phone bottom sheet; draft and take impact visible | Persist/cancel under `P08-Q1`; close behavior follows unsaved-edit rule |
| Saving | The affected mutation reports pending; duplicate submission prevented | Success, recoverable failure, validation failure, or conflict |
| Save failed | Authoritative state unchanged; recoverable draft and specific retry guidance remain | Retry, revise, or cancel without losing server state |
| Revision conflict | Newer authoritative revision detected; no silent overwrite | Reload/reconcile; exact conflict UI open |
| Audition unavailable | Transcript remains reviewable, but background is not represented as heard or accepted | Retry media access; if artifact is invalid, transition to processing failure/recovery |
| Reprocessing consent | Reset scope, retry/quote, and current revision displayed | Confirm to Processing, or cancel with preparation unchanged |
| Reprocessing locked | Action unavailable with reason: first accepted take was saved | Continue manual corrections/add missed line/Record |
| Record blocked | Readiness explains each resolvable issue | Open affected turn, finish/cancel save, restore artifact, or follow open zero-turn/background rule |
| Project unavailable | No editable data or media exposed | Return to My projects or reauthenticate as appropriate |

## 7. Validation and persistence rules

### 7.1 Turn validity

- Start and end are expressed on the canonical selected-section timeline.
- Start must be before end; both must remain within selected-section bounds.
- Overlap with another turn is valid and must not be auto-trimmed, merged, or rejected solely because of overlap.
- Text may represent speech or a supported nonverbal performance such as laughter, a scream, or a gasp.
- Speaker is a project-local label, not verified identity or face recognition.
- Exact character limits, whitespace normalization, timing precision, and minimum interval length are open and must not be guessed in implementation.

### 7.2 Revision and save boundary

Every persisted correction/addition is conditional on the expected active preparation/correction revision. Success returns the authoritative revision and take-compatibility impact. Failure cannot partially apply fields or claim they are saved.

The user's draft may be retained locally for recovery, but local retention is not durable project persistence and must not be labeled **Saved**. Reload/resume shows authoritative saved work unless a later recovery contract explicitly adds drafts.

### 7.3 Take compatibility

| Change | Existing saved take | Readiness/result consequence |
|---|---|---|
| Text only | Remains valid | No rerecord required |
| Speaker only | Remains valid | No rerecord required |
| Start or end time | Old media retained but incompatible for output | Turn requires a new compatible take |
| Add missed turn | No take exists | New turn requires a take |
| Successful whole-section reprocessing | Old preparation and all corrections/additions are replaced | Processing/Record recomputes state for the new active revision |
| Failed whole-section reprocessing | Prior preparation and edits remain active | Prior take compatibility remains unchanged |

### 7.4 Reprocessing lock and consent

- The lock is authoritative, project-wide, and permanent after the first successfully accepted saved take.
- Failed capture or save does not lock; deleting takes does not unlock.
- Consent must name successful-reset scope and the current expected edit revision.
- New edits after consent invalidate that consent for activation; they cannot be discarded silently.
- A network timeout does not authorize blind duplicate retry submission.
- Processing, not Prepare, owns actual job progress, cancellation, failure settlement, and activation.

## 8. Error and recovery behavior

Errors use plain, actionable language and the shared red error treatment. A transient error must not erase usable transcript, corrections, takes, or the active background revision.

| Failure | Required behavior |
|---|---|
| Project/preparation load fails | Keep the stage unavailable, explain that current preparation could not be loaded, provide retry; never show cached work as authoritative without labeling it |
| Source video fails to play | Keep transcript/corrections available when safe; provide media retry; do not claim playback review succeeded |
| Background audition fails | Explain that background cannot be played; do not mark quality accepted; provide retry or processing recovery according to artifact validity |
| Validation fails | Keep editor values, identify the affected field/range, focus or link to it, and make no server mutation |
| Correction/add save fails | Preserve draft and prior saved revision; provide retry/cancel; do not invalidate a take until timing save succeeds |
| Expected revision conflicts | Preserve draft, announce newer changes, and require reload/reconciliation; never last-write-wins silently |
| Reprocessing becomes locked concurrently | Close/replace consent state, refresh lock reason, preserve current preparation and edits |
| Reprocessing quote expires/changes | Require a renewed exact quote and confirmation; do not submit at a hidden changed cost |
| Request outcome is unknown after timeout | Reconcile by stable request/project identity before offering retry; do not create duplicate paid work |
| Session expires | Preserve non-sensitive local draft only as allowed, reauthenticate, and return to the same project if still authorized |
| Project is deleted/revoked elsewhere | Stop media and edits, clear inaccessible project data from the screen, and return toward My projects |

Exact unexpected-close draft durability is not selected. The screen may warn about an unsaved editor according to `P08-Q1`, but must not promise recovery that the persistence layer does not provide.

## 9. Accessibility and input

- The video player and background audition controls are keyboard operable and have programmatic names and state.
- Subtitles are readable on the black stage and expose equivalent text in the transcript.
- Transcript rows expose speaker, text/sound caption, start/end, selected state, playback-active state, take compatibility, and edit action without relying only on color.
- Simultaneous active turns remain understandable to screen-reader users; announcements avoid repeating every animation frame.
- Timing adjustment has a keyboard-accessible, non-drag equivalent with validation and current values.
- The desktop editor and phone bottom sheet have a programmatic title. Focus moves into the editor on open and returns to the invoking control on close.
- If the bottom sheet is modal, background content is inert and focus is contained; if later selected as modeless, its focus order and background controls remain unambiguous.
- Save, error, conflict, reprocessing, and readiness changes use an appropriate status announcement without stealing focus unnecessarily.
- Destructive/reset confirmation names the consequence in text and does not use color as the only warning.
- Touch targets support phone use; content reflows without page-level horizontal scrolling; zoom does not hide the editor's persistence actions.
- Reduced-motion preferences are respected. Playback-driven highlighting may update without decorative travel or flashing.
- Final contrast ratios, focus style, type scale, and target dimensions depend on the open shared visual tokens, but must meet the product's chosen accessibility baseline.

## 10. Visible copy and localization

English and Russian are required. Copy is sentence case, uses the user's vocabulary, and distinguishes background, original audio, saved takes, and preparation. The following is working copy for specification clarity; owner approval and final localization remain open.

| Purpose | English draft | Russian draft |
|---|---|---|
| Stage title | Prepare | Подготовка |
| Review instruction | Review the transcript and background before recording | Проверьте расшифровку и фон перед записью |
| Add action | Add missed line | Добавить пропущенную реплику |
| Edit action | Edit line | Изменить реплику |
| Background source | Background | Фон |
| Original source | Original | Оригинал |
| Persist action (`P08-Q1` option A) | Save changes | Сохранить изменения |
| Cancel | Cancel | Отмена |
| Record transition | Start recording | Начать запись |
| Retry action | Reprocess | Обработать заново |
| Timing impact | Changing the timing means you need to record this line again. Your current recording stays until you save a new one. | После изменения времени эту реплику нужно записать заново. Текущая запись сохранится, пока вы не сохраните новую. |
| Reset warning lead | Successful reprocessing replaces all prepared lines and removes your text, speaker, timing, and added-line changes. If it fails, your current preparation stays. | При успешной повторной обработке все подготовленные реплики будут заменены, а изменения текста, спикеров, времени и добавленные реплики — удалены. Если обработка не удастся, текущая подготовка сохранится. |
| Save failure | Changes weren't saved. Your previous version is still safe. | Изменения не сохранены. Предыдущая версия не изменилась. |
| Revision conflict | This line changed elsewhere. Reload the latest version before saving. | Эта реплика была изменена в другом месте. Загрузите последнюю версию перед сохранением. |
| Reprocessing lock | Reprocessing is unavailable after the first recording is saved. You can still edit lines or add a missed line. | После сохранения первой записи повторная обработка недоступна. Вы всё ещё можете изменять и добавлять реплики. |

Time, number, and duration formatting must follow the active locale without changing stored timeline values. Russian expansion and long speaker/text content must be included in layout verification.

## 11. Logical frontend service boundary

These are capabilities and result contracts, not endpoint, store, or implementation names. React components must consume them through the centralized interchangeable service boundary selected in the shared contract.

### 11.1 Load Prepare

Input: authenticated project identity.

Result must provide:

- project identity/title and authoritative stage;
- selected-section duration and source offset mapping needed for display;
- playable source preview and processed-background audition references or explicit availability errors;
- active preparation and correction revisions;
- ordered turns with stable identity, text/sound caption, speaker identity/label, interval, machine/manual origin, take-compatibility state, and saved/pending state;
- speaker choices authorized by the domain;
- reprocessing eligibility, permanent-lock reason, included-retry status, and exact current quote requirement when applicable;
- Record-readiness facts without duplicating domain rules in components.

### 11.2 Persist an existing-turn correction

Input: project/preparation identity, turn identity, expected correction/turn revision, and changed text/speaker/start/end fields.

Result: authoritative updated turn/revisions, save timestamp/status as available, and explicit take-compatibility impact. Expected failures include validation, conflict, unavailable project, and transient persistence failure.

### 11.3 Add a missed turn

Input: project/preparation identity, expected correction revision, text/sound caption, speaker, start, and end.

Result: stable new turn identity, authoritative revisions, chronological placement data, and `take required` status. Valid overlap is accepted. Partial success is not exposed as a saved turn.

### 11.4 Authorize reprocessing

Input: project identity, expected correction revision, current retry/quote identity as required, and evidence of informed reset confirmation.

Result: one accepted processing request and handoff identity, or an explicit conflict/lock/quote/already-running/unknown-outcome result. The service, not the UI, enforces permanent lock, attempt use, idempotency, and activation fencing.

### 11.5 Check Record readiness

Input: project identity and expected preparation/correction revision.

Result: ready/not-ready, current revision, structured reasons tied to resolvable turns/artifacts, and the eventual Record destination selected by the cross-flow contract. Components must not infer readiness from row counts or local save indicators alone.

## 12. Acceptance criteria

No criterion below is implementation or test evidence. Criteria marked **BLOCKED** need the named owner decision.

| ID | Criterion |
|---|---|
| P08-AC01 | Desktop presents the black video stage on the left, selectable transcript on the right, and a separate turn editor panel; phone presents video above transcript and the editor as a bottom sheet. Exact geometry remains open. |
| P08-AC02 | The complete selected section can be played with subtitles; every active overlapping turn is simultaneously represented in subtitles and the transcript without flattening overlap. |
| P08-AC03 | Playback-active and user-selected states are distinguishable visually and programmatically; a selected turn can open the separate editor. |
| P08-AC04 | Users can edit text, speaker, and valid start/end timing. Invalid/out-of-bounds ranges are rejected, while valid overlap is accepted. Timing is adjustable without drag as well as by dragging. |
| P08-AC05 | A successful text-only or speaker-only save preserves the affected saved take's compatibility. A successful timing save marks it incompatible for output, retains its old media, and explains that a replacement is required. Failed saves change neither authoritative fields nor compatibility. |
| P08-AC06 | A missed turn with text/sound caption, speaker, and valid timing can be added before recording and after at least five other turns have saved takes. It is placed chronologically, may overlap, leaves unrelated takes valid, and requires its own take. |
| P08-AC07 | Processed background is auditionable before Record, is identified accurately, and does not promise perfect separation. **BLOCKED in part by `P08-Q2`** for the comparison and acceptance-gate interaction. |
| P08-AC08 | Eligible reprocessing shows included-retry/quote status and obtains revision-bound confirmation that success resets every prepared turn and every manual text/speaker/timing/added-turn change; failure preserves the prior usable preparation. Accepted work hands off to Processing. |
| P08-AC09 | The first successfully accepted saved take permanently disables reprocessing. Failed capture/save does not lock, deleting takes does not unlock, and a concurrent/stale consent submission cannot bypass the guard. |
| P08-AC10 | Correction and missed-turn writes use expected revisions. Conflict preserves the user's draft and never silently overwrites newer work. |
| P08-AC11 | Loading, zero-turn, media failure, audition failure, validation, save failure, revision conflict, reprocessing lock, Record-blocked, and unavailable-project states give accurate recovery without presenting unsaved/local state as durable. |
| P08-AC12 | Keyboard and assistive-technology users can operate playback, audition, transcript selection, editor open/close, all fields, timing adjustment, reprocessing confirmation, and the Record transition; state is not communicated by color alone. |
| P08-AC13 | English and Russian layouts preserve all required content and actions, including long transcript text and reset/timing-impact messages, without horizontal page scrolling. |
| P08-AC14 | **BLOCKED by `P08-Q1`.** The chosen correction-save model defines commit, cancel/close, unsaved navigation, and timing-impact confirmation consistently on desktop and phone. |
| P08-AC15 | **BLOCKED by `P08-Q3`.** Add missed line has one owner-selected initial timing method that works on desktop, phone, keyboard, and touch. |
| P08-AC16 | **BLOCKED cross-flow.** Start recording uses authoritative readiness, handles zero-turn projects, resolves unsaved edits, and enters the owner-selected Record turn without racing reprocessing or a stale preparation. |

## 13. Verification plan (not executed)

### 13.1 Contract and state tests

- Load each state in §6 from controlled service responses; assert no state is labeled saved/ready from client-only data.
- Exercise text, speaker, timing, combined edits, invalid ranges, source-bound edges, valid overlaps, and stale revisions.
- Prove the take-compatibility matrix in §7.3, including save failure and reload.
- Add a missed turn before any take and after five saved takes; prove unrelated take identities remain valid and the added turn requires a take.
- Exercise free retry, paid eligible retry, stale quote, reset cancellation, expected-revision conflict, unknown timeout outcome, successful handoff, failure return, and permanent lock races.
- Prove a processing failure preserves the prior usable preparation and all corrections.
- Exercise Record-readiness reasons and stale-readiness rejection after a concurrent save/reprocessing/first-take lock.

### 13.2 Playback and transcript tests

- Use representative English, Russian, mixed-language, nonverbal, long-speech, and overlapping-turn fixtures.
- Verify full selected-section duration, subtitle timing, seeking, buffering recovery, playback end, and simultaneous active-row highlighting.
- Verify background audition uses the active preparation and clearly differs from any original-audio mode selected by `P08-Q2`.
- Verify that selecting/editing one turn does not erase other active overlap highlighting or mutate playback data.

### 13.3 Responsive and visual review

- After shared breakpoints and tokens are selected, inspect representative desktop, intermediate, 390px phone, and landscape-phone layouts.
- Confirm desktop video-left/list-right/separate-editor and phone video-above/list-below/bottom-sheet anatomy.
- Confirm white/light-gray surfaces, black stage, red reserved for recording/error semantics, no gradients, no permanent sidebar, and no generated-dashboard ornament.
- Inspect long Russian copy, long turn text, multiple overlapping active rows, zero turns, dense turn lists, errors, focus, zoom/reflow, and the open editor at each required width.
- Do not claim visual fidelity until screenshots are rendered and reviewed against owner-approved tokens and geometry.

### 13.4 Accessibility review

- Keyboard-only traversal and timing adjustment; visible focus; logical reading/focus order.
- Screen-reader checks for player state, simultaneous active turns, selected turn, timing values/errors, save status, take invalidation, and reset warning.
- Phone bottom-sheet focus open/close and modal/modeless behavior after it is selected.
- Contrast and non-color state checks after tokens are approved; reduced-motion and zoom/reflow checks.

### 13.5 Localization review

- Verify all visible and announced strings in English and Russian, including error/retry/reset paths.
- Verify locale-appropriate duration/time display does not alter canonical stored timing.
- Review product terminology consistently across Prepare, Processing, Record, and Result.

## 14. Open owner decisions and cross-flow flags

### P08-Q1 — correction save model

Pending options sent to the Orchestrator:

- **A — recommended:** explicit **Save changes** and **Cancel** for the editor, with inline timing-impact warning before save. This gives revision, cancellation, and take invalidation a single visible commit boundary.
- **B:** autosave every field/boundary; timing changes require a confirmation dialog.
- **C:** autosave text/speaker, but explicitly save timing.

This decision also defines editor close, shared navigation with a draft, retry after failure, and whether Start recording can resolve a pending draft.

### P08-Q2 — background audition and acceptance

Pending options sent to the Orchestrator:

- **A — recommended proposal:** an **Original / Background** comparison plus explicit **Background is acceptable** confirmation before Record.
- **B:** the comparison is available, but Start recording itself counts as acceptance and is not separately gated.
- **C:** a separate Check background mode/dialog ends with Continue.

This is a proposal only. BR-001 requires audition and a user quality decision; it does not by itself prove that a checkbox or separate mandatory gate is required.

### P08-Q3 — initial timing for a missed turn

Pending options sent to the Orchestrator:

- **A — recommended:** mark a range on the full-section timeline, then complete text and speaker in the editor.
- **B:** create a short draft interval at the current playhead, then adjust its edges.
- **C:** enter/select start and end in the editor, then show the range on the timeline.

### Cross-flow OPEN — Prepare to Record

Flow 08 and Flow 09 must share one decision for:

- the first Record turn (first chronological, selected, or first missing/timing-invalidated take);
- zero-turn behavior;
- the readiness response and race with accepted reprocessing or a newly saved first take;
- terminology for compatible, missing, and timing-invalidated takes.

### Shared visual OPEN

Typography, exact colors, accent role, radii, borders, spacing, desktop panel mechanics, phone-sheet detents, breakpoints, timing format/precision, focus styling, and motion remain open. The design skills constrain quality and anti-template choices but do not select these values for the owner.
