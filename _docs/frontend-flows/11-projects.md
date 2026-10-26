# Flow 11 — My projects: resume, capacity, and deletion

Date: 2026-10-26 (Asia/Qyzylorda).
Status: synchronized specification draft; latest owner answers incorporated, limited data/technical/design details remain OPEN
Mode: specification only; no frontend implementation, mockup, browser run, or product verification is authorized or claimed

## 1. Authority and scope

This flow follows [the shared frontend contract](00-shared-contract.md), [SPEC-001](../specifications/SPEC-001_dubbed_mvp.md), and [BR-001](../business-requirements/BR-001_custom_video_dubbing.md). The shared contract and later owner answers override older conflicting material.

This synchronized revision incorporates the 2026-10-22 owner answers recorded in the shared contract for automatic validated-draft preservation; filename-based naming with first-100-grapheme-cluster initial-title truncation and inline blur-autosave rename using the confirmed trim/nonempty/100-character/duplicate-title rules; most-recent-activity order and qualifying activity events; deterministic Continue routing to the first turn without an accepted recording; background completion status updates without cross-page redirect; account-owned cross-device recording-draft recovery without expiry; single-device recording without forced takeover; no-repair behavior and the permanent post-acceptance reprocessing lock; initial zero-turn recovery and preservation of a prior usable preparation/draft when only the latest retry finds zero turns; manual pre-sign-in language precedence; available-versus-reserved credit meaning; no job-completion email/push; the approved shared light visual treatment and geometry; the phone shell; the exact empty state and standard deletion confirmation; and withdrawal of all public-link sharing. The 2026-10-23 title-counting and activity decisions in the shared contract supersede earlier open wording; production event evidence remains open.

Flows 13 and 14 are withdrawn. Flow 11 defines no Share action, public URL or token, access toggle, publishing/hosting path, native-share replacement, or anonymous viewer. The owner may download the finished MP4 from Result and distribute that file outside the application; Result owns that action.

This document owns the signed-in **My projects** experience for:

- showing account-owned saved projects in a compact list;
- showing truthful saved-project capacity;
- resuming a selected project through an authoritative destination rather than inferring from browser state;
- exposing a recoverable unaccepted recording candidate without treating it as accepted;
- deleting one chosen project from its row menu after a consequence-specific confirmation; and
- returning a newly available slot to the account after authoritative deletion.

This document does not own:

- upload, validation, section selection, or preparation authorization details (Flow 06);
- preparation job progress, cancellation, retry, or reprocessing details (Flow 07);
- preparation artifact details or processing progress/retry behavior (Flow 07);
- microphone capture, take acceptance, and candidate recovery interaction details (Flow 09);
- result assembly, playback, or owner MP4 download controls (Flow 10);
- credit packs, payment, balance history, or purchase reconciliation (Flow 12);
- account deletion (Flow 15); or
- physical storage, worker, billing-ledger, backup, or CDN implementation.

## 2. Purpose, entry, and exit

### 2.1 User purpose

The screen answers one question first:

> Which saved project needs my attention, and where can I continue it safely?

The frequent jobs are to continue one project or free a slot by deliberately deleting a chosen project. A user at full capacity must be able to understand why a new project cannot be saved and act without the product selecting a project for deletion.

### 2.2 Entry conditions

Normal entry requires:

- an authenticated account;
- English or Russian locale from the shared shell, defaulting on first use to Russian for browser language `ru` and English otherwise. An explicit manual pre-sign-in choice overrides a different account preference after sign-in and updates that preference; a merely browser-derived choice does not; and
- an authoritative or visibly loading/error state for both the project collection and project-capacity entitlement.

Valid entry points include:

1. the **My projects** item in the compact top navigation;
2. Flow 06 after an authoritative capacity conflict or when capacity is already full;
3. a project workspace when the project becomes unavailable or the user intentionally returns to the list; and
4. a refreshed or reopened browser session that needs the account-owned saved state.

Unauthenticated access hands off to the appropriate authentication flow. It must not expose project titles, thumbnails, progress, media, or deletion actions before authorization is restored.

### 2.3 Successful exits

This flow may exit to:

- Flow 06 for a new dub when authoritative capacity permits;
- Flow 06 New dub for a validated, saved, not-yet-processed project, with its source and selected interval restored and no automatic processing authorization;
- Flow 07 Processing for an active processing job or its recoverable processing outcome;
- Flow 09 Record at the first turn without an accepted recording in established turn order when unfinished recording work remains, including when a previous result also exists;
- Flow 10 Result when no unfinished recording work remains; or
- Flow 09's recovery offer inside Record when that first unfinished turn has a recoverable account-persisted unaccepted recording draft.

These destinations are fixed by authoritative project state. The client must not choose from a stale local route, a visual progress label, cached media, last-viewed state, or a mandatory Record/Result chooser. After deletion succeeds, My projects shows the authoritative freed capacity and the normal New dub action; Flow 06 revalidates capacity before committing another project.

## 3. Confirmed product rules

### 3.1 Saved-project capacity

- A free account has two saved-project slots.
- The first successfully verified credit purchase permanently raises capacity to ten slots.
- Credits and project slots are separate account facts; an unused credit balance does not imply a free slot.
- The shared header's main credit number means available spendable credits after active reservations. Reserved credits are separate **In processing** information; a reservation is not a settled charge.
- A slot becomes occupied only after upload validation and authoritative project/source commit succeed, before AI preparation starts.
- Leaving after that successful validation automatically keeps the project as a draft in My projects. There is no mandatory Save draft/Delete draft leave prompt, and returning to the draft does not authorize or start processing.
- Failed upload validation does not occupy a slot.
- A failed AI preparation remains a resumable saved project and continues to occupy its slot until the owner deletes it.
- Deletion frees one slot only after the deletion command commits authoritatively.
- A full account must let the owner choose a project to delete. The product never auto-deletes, expires, archives, or replaces another saved project to make room.
- Current projects have no inactivity expiry and continue occupying one of the account's two slots, or one of ten after the first verified purchase, until explicit project or account deletion.
- The first-purchase upgrade must not be granted from a browser redirect or client assertion. Purchase verification and any still-open purchase-reversal effect belong to the account/credits contracts.

### 3.2 Project list and progress

- My projects is a **compact list**, not a project-card grid.
- Every normal row contains a small scene/video thumbnail, a project title, truthful progress, a visible **Continue** action, and a row menu containing **Delete project**.
- Progress comes from authoritative saved state. A client-only animation, local route, stale tab, upload filename, or cached result must not promote a project to another stage.
- A preparation failure is a recoverable project state, not a missing project and not a freed slot.
- A project with an unaccepted recording candidate may advertise that recovery is available, but the candidate remains distinct from the current accepted take.
- An unaccepted candidate is offered after return, including after browser reload/crash when its bytes were successfully persisted. Recovery never automatically accepts it.
- My projects fetches authoritative processing/result state when the owner returns. Authoritative background completion may update a project's row/status while the owner is elsewhere, but it must not redirect the current page or open that project. The owner explicitly selects **Continue** to open its current destination. The MVP sends no preparation- or result-completion email/push and exposes no opt-in for such job notifications; leaving the application does not stop approved background work.
- A persisted unaccepted candidate is account-owned, recoverable after sign-in on another device, and has no inactivity or fixed-time expiry. Keep it until acceptance, explicit draft deletion, project deletion, or account deletion. Recovery offers it without automatic acceptance, and the UI cannot claim cross-device safety until media bytes and account association are durably persisted.
- The default project title is the uploaded source filename without its extension. If that derived title exceeds 100 visible Unicode grapheme clusters, use its first 100 grapheme clusters under the shared client/service `Intl.Segmenter` rule. Do not rename or modify the uploaded source file. Filename normalization and an empty-stem fallback remain technical edge handling; do not invent an Untitled product rule here.
- Before the first AI preparation launch, Flow 06 may successfully validate a replacement source inside the same project and occupied slot. My projects consumes the committed result; it does not expose another upload or `Replace video` control. If the title still has authoritative automatic-assignment provenance, successful replacement regenerates it from the new source filename by removing the last extension and applying the same first-100-grapheme-cluster rule. If the title has authoritative manual-rename provenance, preserve it unchanged. Determine this from stored provenance, never by comparing title text with either filename.
- Failed replacement validation changes neither the authoritative source nor the title/provenance. Source replacement is not authorized after the first AI preparation launch; My projects must not present a later lifecycle state as eligible or use replacement to bypass retry/reprocessing rules.
- A name-entry step is not required before processing. The owner renames the title inline in My projects, and leaving the title field (blur) automatically submits the edit; there is no rename dialog and no explicit Save / Cancel pair.
- For rename, trim leading and trailing whitespace and require the resulting title to be nonempty and no longer than 100 visible Unicode grapheme clusters. One emoji or combining sequence counts as one. Duplicate titles are allowed. No extra character-class restriction is selected. Client and service use the same `Intl.Segmenter` rule; code-point counting is not an equivalent fallback. This resolves **OPEN-F11-01A**.
- Enter submits the current edit and ends editing only after successful persistence. Escape cancels the current edit, restores the previous persisted title, and sends no save. Ordinary blur still autosaves. Guard Escape-triggered blur from committing the cancelled value and guard Enter followed by blur from submitting the same change twice.
- A rejected/stale/failed Enter or blur save keeps the attempted value editable, associates the actionable error with the title field, and leaves edit mode open while the last successfully persisted title remains authoritative until a save succeeds.
- Order projects by most recent authoritative activity, newest first. Successfully opening one owned project, successful user changes, authoritative background-processing completion, and authoritative result completion count as activity. Loading or refreshing My projects is not opening every project and must not touch every row's activity. Do not promote errors or incomplete projects ahead of the order and do not use creation time as the primary order. The selected mock uses a shared monotonic activity sequence, stable project ID for ties, and deduplicated activity-event IDs. Production event authority, timestamp/tie semantics, and event-delivery/deduplication evidence remain **OPEN-F11-02**; no additional user-controlled ordering is required by this flow.

### 3.3 Resume truth

- **Continue** must resolve against the current authoritative project revision.
- A successful authoritative open through **Continue** records activity for that selected owned project even when the destination opens without a project mutation. Merely listing, refreshing, observing, or reordering My projects does not record an open for every row.
- Supported destination families are the applicable project creation/processing state and the shared workspace stages **Record** and **Result**. There is no Prepare stage.
- A processing project opens its real progress or recoverable failure state; it is never presented as Record-ready before usable preparation artifacts are activated.
- Successful preparation hands off directly to Record.
- A Record destination must use the same established turn order, accepted-take, incompatible-take, completion, and recoverable-candidate truth as Flow 09. It opens the first turn in that order without an accepted recording, never the last viewed turn.
- A Result destination must distinguish assembly in progress, assembly failure, prior finished output, and the latest eligible finished result according to Flow 10.
- For a project that has both a previous result and unfinished recording work, Continue opens Record at the first turn without an accepted recording in established turn order. If that target turn has an account-persisted unaccepted candidate, Record offers recovery without automatically accepting it. When no unfinished takes remain, Continue opens Result. There is no mandatory choice dialog and no last-viewed preference.
- The MVP has no transcript, speaker, timing, missed-line, background-audition, targeted AI-repair, or post-processing correction flow. A poor/clipped supplied turn can be performed as-is, or the owner can start a normal new project under the ordinary credit and slot rules; after preparation there is no special refund, source replacement, or slot exception.
- Whole-section reprocessing becomes permanently unavailable after the first take is successfully accepted and saved. Failed capture or failed save does not create that lock, and My projects cannot offer a reset that bypasses it.
- When an initial processing attempt, or the latest attempt for a project with no active usable nonempty preparation, detects zero recording turns, the project remains outside Record and Result. Show **No dialogue found**, with eligible reprocessing under the existing quote/credit/included-retry rules or selection of another video.
- When a completed reprocessing attempt detects zero turns while a prior active preparation still has usable nonempty turns, keep that prior preparation, its established turn identities, and its unaccepted draft active. Surface **No dialogue found** as the outcome of the latest attempt, but **Continue** still resolves to Record from the preserved active preparation. Do not replace it with an empty artifact or route the project to blanket zero-turn recovery.
- Every completed zero-turn run keeps its existing processing charge and successful-retry-consumption result. Preservation of the prior usable preparation/draft creates no refund or extra free retry.
- A recoverable candidate for the selected first unfinished turn is surfaced within Record recovery, never silently promoted to the accepted take and never used to resume a later/last-viewed turn instead.
- A stale tab cannot use Continue to overwrite a newer take, result, or deletion state.
- A background processing/result completion may refresh authoritative project/list status but cannot redirect a user who is on My projects, another project, or another section. Only an explicit Continue/open action enters the completed project's resolved destination. Automatic handoff remains limited to the matching owning processing/result screen and valid lifecycle.
- Only one device may record a project at a time. Continue may resolve to Record, but Flow 09 must recheck or acquire recording ownership before capture. If another connected device retains ownership, My projects offers no takeover, forced interruption, device identity, or Continue-here action; the owner must leave recording on the first device before retrying on the second. An authoritative disconnect releases ownership, and a returning client reacquires before capture. Heartbeat/lease timing, interruption handling, and stale-write fencing remain Flow 09 service details.

### 3.4 Project deletion

- Deletion is initiated only from the selected project's row menu.
- A confirmation names the selected project using its authoritative display identity and states the consequences relevant to that project.
- Deletion removes owner access to the project's current source, preparation artifacts, accepted takes, candidate drafts governed by the project, and finished result associations.
- Deletion frees the occupied project slot after authoritative commit.
- Deletion never refunds completed processing.
- Deleting during queued/running processing is not a cancellation command. Successful pending processing may remain chargeable at account level, while the deleted project must not regain owner access or result availability.
- Exact production ordering among project fencing, slot release, worker completion, charge settlement/return, and late events remains **OPEN-F11-T03**. The UI must state known consequences without promising a race outcome that the production contract has not selected.
- Logical access removal and physical deletion from active storage, intermediate artifacts, backups, caches, CDN delivery, and logs are different guarantees. Their timing remains **OPEN-F11-T02**.
- This flow defines no archive, trash, restoration, or undo behavior. None may be implied until approved.

## 4. Experience direction and screen anatomy

### 4.1 Design intent

My projects is a worked-in list screen for casual creators returning to a scene. Its product-specific material is the scene thumbnail and honest saved progress. The strongest visual rhythm is therefore a sequence of compact project rows, not a dashboard of metrics, a marketing hero, or a grid of decorative cards.

The approved [design-token system](design-tokens.md) is normative for the light treatment. Use its semantic roles for page/surface/text/divider rather than selecting raw shades in this flow. Essential input/control boundaries use `border.control`, never `divider.decorative`; primary and destructive controls use their approved default/hover/pressed families and foregrounds; links, errors, selected rows/controls and disabled states use `link`, `error`, `selected.*` and `disabled.*`; apply source opacity only for genuinely disabled controls, with readable reasons and no dimming of focusable busy controls. Light UI uses the approved `focus.light` 2 px ring with 2px gap matching the opaque surrounding ground; any media control uses `focus.media` only on an opaque `media` backing. Hover, selected, invalid and disabled states never erase focus. Use Mabry Pro Regular and Medium only, with no Bold or synthetic Bold: body/dialog text is Regular 16 px/24 px, supporting captions are Regular 14 px/20 px, and buttons use Mabry Pro Medium 14px/20px for task, secondary and navigation actions and Medium 16px/24px for prominent/landing actions; phone buttons use Mabry Pro Medium 16px/24px with retained 48px targets, field labels use Medium 14 px/20 px, and page headings use Medium 32 px/40 px on desktop and 24 px/32 px on phone. Buttons and single-line inputs use component-specific source geometry and the exact mapped source desktop geometry and retained 48px phone targets. Horizontal page gutters are 32 px at 768 px or more and 16 px below it; working content is at most 1200 px wide. Shared spacing is 8 px between closely related items, 16 px between fields/buttons, 24 px within an existing screen block, and 32 px between major sections. Existing panels use 24 px padding at 768 CSS px and above and 16 px below 768 px; these values do not create a new panel or card wrapper. The shared 400 px maximum applies to sign-in/registration forms, not to this list or its inline title field. Use source component rounding. Mapped source component shadows are permitted; gradients and card wrappers around every block are prohibited. There is no permanent sidebar. Font assets/loading/fallback/rendered proof, rendered row-density conformance, rendered dialog conformance, final copy and rendered focus/accessibility evidence remain gaps; common token/state/focus direction is resolved.

The list should feel like a work queue without turning projects into operational tickets: the thumbnail identifies the scene, the title identifies the project, progress explains saved state, and Continue provides the one frequent action. Capacity is a truthful limit line, not a KPI tile.

### 4.2 Persistent top navigation

Use the shared compact navigation containing:

- product identity;
- New dub;
- My projects as the current destination;
- authoritative **available** spendable credit balance after active reservations, or its loading/error state; and
- account and locale access.

The navigation does not duplicate project capacity or fold reserved credits into the main balance. Capacity belongs in the page content where a full-account action can be explained; Flow 12 shows any reserved amount separately as **In processing**.

### 4.3 Page header and capacity region

Required anatomy:

- one Mabry Pro Medium noun title at 32 px/40 px desktop and 24 px/32 px phone: **My projects** / **Мои проекты**;
- one concise capacity statement using authoritative used and maximum values;
- a true-ratio usage indicator when a visual indicator is used, with the same values available as text;
- one New dub action when the action is valid; and
- a capacity-full explanation that points to deliberate project deletion rather than implying automatic cleanup.

The capacity region is one quiet light-gray-divided line or flat strip on the white ground, not a row of metric cards. It must distinguish:

- available capacity;
- full capacity;
- capacity loading;
- capacity unavailable; and
- a capacity revision that changed because another tab/device created or deleted a project.

The screen must not promise that clicking New dub reserves a slot. Flow 06 owns validation and authoritative slot acquisition.

### 4.4 Project-list region

Required anatomy:

- a semantic list with one row per authoritative project;
- a small fixed media slot for the scene/video thumbnail;
- a recognizable inline-editable title, with enough visible text to distinguish projects and full text available accessibly if truncated; wrapping/truncation remains a prototype detail, while blur autosave and the 100-grapheme validation remain;
- a progress block expressed in words and, where relevant, a count such as accepted turns out of total turns;
- a visible Continue action; and
- a trailing row menu with Delete project.

The row must not add invented owner, collaborator, genre, runtime, price, creation date, archive state, favorite state, or vanity statistics. Search, filters, bulk selection, pagination, pinning, and archive are not part of the confirmed scope.

If a thumbnail cannot be loaded, show an honest **Preview unavailable** treatment without requiring every row to repeat an identical large placeholder block. Preserve recognizable titles and accessible full information; a fallback may be compact when it conveys no distinguishing preview content. Thumbnail failure does not make Continue or deletion unavailable when the project itself remains accessible. The exact thumbnail-generation/crop policy is a technical visual dependency.

Progress must communicate the authoritative meaning, not merely apply a colored badge. The required semantic families are:

| Authoritative condition | Information the row must communicate | Owned detail |
|---|---|---|
| Validated source before processing authorization | Saved draft exists automatically; processing has not started and is not authorized by resume | Flow 06 New dub |
| Preparation queued/running | Processing is active and incomplete | Flow 07 |
| Preparation failed with no usable replacement | Attention/retry is required; slot remains occupied | Flow 07 |
| Usable preparation active | Preparation is complete and the project can proceed directly to Record | Flows 07 and 09 |
| Recording incomplete | Accepted progress is current; invalid/missing takes are not complete. Continue opens the first unfinished turn; normal Next cannot create gaps, while legacy/interrupted gaps remain recoverable. | Flow 09 |
| Recoverable unaccepted candidate exists | Account-owned draft recording can be offered across devices after durable persistence; it is not accepted progress | Flow 09 |
| Latest processing attempt found no dialogue and no active usable nonempty preparation exists | No Record/Result entry; eligible reprocessing or another video is available and the successful-processing charge is unchanged | Flows 06–07 |
| Latest reprocessing attempt found no dialogue while a prior usable nonempty preparation remains active | Latest-attempt No dialogue found notice; preserved preparation/turns/draft remain Record-resumable and are not replaced by the empty attempt | Flows 07 and 09 |
| Result assembly queued/running/failed | Assembly state and any prior finished result are distinguished | Flow 10 |
| Eligible result ready | Finished result is available | Flow 10 |
| Deletion pending | Project is fenced from duplicate destructive actions; slot is not yet claimed free | Flow 11 service contract |

Final progress labels remain localization/design details. The title default/truncation and shared grapheme-counting rule, rename validation/failure/keyboard contract, ordering direction, qualifying activity events, mock sequence/tie/deduplication mechanics, list loading as non-activity, and Continue destination rules above are selected. Production event authority and delivery evidence under **OPEN-F11-02**, plus the other listed visual/technical gates, remain open.

### 4.5 Row action menu

The compact trailing menu contains **Delete project** for this flow. It must:

- identify the project in its accessible name;
- open from keyboard, pointer, and touch;
- use the approved destructive red only on the destructive item;
- close without changing the project when dismissed; and
- return focus to the originating row action after cancellation.

The menu is not a substitute for the visible Continue action. Rename occurs inline on the title and is not a row-menu action or a dialog. No archive, duplicate, or billing action is added here. Owner MP4 download remains on Result; there is no Share action or substitute sharing workflow.

### 4.6 Delete confirmation

Before the destructive command, the dialog shows:

- the selected project's authoritative title/display identity;
- that deletion removes the project and frees one project slot after completion;
- that completed processing is not refunded;
- an additional pending-processing statement when work is queued/running: deletion does not cancel that work or guarantee no later account charge; and
- distinct cancel and destructive confirmation actions.

Use the standard confirmation: name the project, show the applicable warning, and provide **Cancel** and **Delete** buttons. Do not require the owner to type the project name or another confirmation word. The confirmation must not claim immediate physical erasure from backups/caches or promise that already downloaded copies can be retracted. Final EN/RU sentence-level copy remains a localization detail without changing these required facts and actions.

### 4.7 Empty state

An account with no projects keeps the normal shared shell. The empty-list region contains only:

- **No projects yet**; and
- one **New dub** action.

Do not add capacity copy inside the empty-list region, an illustration, fake/demo projects, an empty card grid, invented activity, a guided onboarding tour, or an extra tutorial. The normal shell may still report a separate capacity/service error and Retry truthfully; it must not fabricate New dub eligibility.

## 5. State model and transitions

### 5.1 Page-level states

| State | Visible truth | Allowed next actions |
|---|---|---|
| Loading | Final header/list geometry with flat placeholders; no fabricated names, counts, or progress | Wait, navigate through available global shell |
| Empty | Authoritative zero projects and current capacity | New dub when allowed |
| Loaded with capacity | Capacity statement and compact rows | Continue, inline rename, open row menu, New dub |
| Loaded and full | Used equals limit; rows remain actionable | Continue or delete a chosen project |
| Partial failure | Successfully loaded region stays visible; failed region identifies itself | Retry failed region; avoid destructive action when its required impact data is unknown |
| Full load failure | No project data exposed as current; explicit error and Retry | Retry or navigate through shell |
| Stale refresh | Existing authoritative snapshot remains visibly timestamped/stale while refresh runs | Continue/delete only if the service revalidates the command |
| Session expired | Project content is hidden or fenced; sign-in recovery offered | Reauthenticate, then reload authoritative state |

Loading uses flat placeholders without shimmer or layout shift. A refresh should keep the prior snapshot visible with a freshness indication rather than replacing known rows with a blank page, but actions must reconcile current revisions before mutation/navigation.

### 5.2 Initial load

1. Enter My projects with authenticated account context and locale.
2. Request the project collection and account capacity through the centralized services boundary.
3. Render each region only from authoritative results; a partial failure remains scoped to the failed region.
4. Reconcile project count and capacity. A mismatch is an error/stale condition, not permission for the frontend to pick which fact wins.
5. Present the empty, available-capacity, or full-capacity state.

Initial load and later list refresh are read-only observations for project activity. They may reconcile order/status from authoritative values already assigned by the service, but they do not mark every returned project as opened and do not generate a new activity value for any row merely because it was listed or observed.

### 5.3 Continue a project

1. The user selects Continue on one row.
2. Disable only that row's repeated Continue submission and request a resume resolution for the current project ID/revision.
3. The service rechecks ownership, deletion state, project revision, the latest preparation-attempt outcome separately from the active usable preparation identity, result jobs, accepted progress, and any recoverable-candidate marker needed by the destination.
4. On successful authoritative open, the service records recent activity for this selected owned project and returns the resulting activity/order revision even when no project content was edited.
5. Navigate using the returned destination and revision-bound context: saved validated draft to New dub; active processing or a zero-turn outcome with no active usable nonempty preparation to Processing; unfinished recording work from the active usable preparation to the first turn without an accepted recording in established order; otherwise to Result. If the latest completed retry found zero turns but a prior usable nonempty preparation remains active, preserve that preparation and its draft, surface the latest-attempt notice, and resolve Record from the active preparation. If that target turn has an account-persisted recoverable candidate, offer it in Record without automatic acceptance.
6. On stale state, update the row and ask the user to continue from the reconciled state rather than navigating with the stale target.
7. On not found/deleted elsewhere, remove or mark the row after authoritative refresh and announce the change.
8. On temporary failure, keep the row and offer Retry. A failed/unconfirmed open must not be presented as a successful activity update.

The resolver applies this rule even when a previous result exists. It does not offer a Record/Result chooser or use the last viewed screen/turn. A Record destination does not bypass Flow 09's single-device recording-ownership check or authorize forced takeover.

### 5.4 Background status completion while elsewhere

1. An authoritative preparation/result observer or subsequent refresh may report that a project's job completed.
2. Update the project's authoritative status/order facts when returned; do not infer completion from a timer or stale callback.
3. If the owner is currently on My projects, another project, or another section, stay on that current page. Do not redirect, open Record/Result, or steal focus because another project completed.
4. The owner explicitly chooses **Continue** on the completed project, which runs §5.3 against its current revision and opens the returned destination.
5. Automatic completion handoff remains owned by the matching processing/result screen only while the user remains on that operation/project and its lifecycle is still valid. A stale observer callback never navigates a different current screen.

This status observation is not itself an implicit open of every listed project. Authoritative background-processing and result completion count as activity; a read-only observer or reload does not. Production event authority and delivery/deduplication evidence remain under **OPEN-F11-02**.

### 5.5 Recover an unaccepted candidate

When resume resolution reports a recoverable recording candidate:

1. Keep accepted recording progress unchanged.
2. Carry the project/turn/candidate identity to Flow 09's recovery interaction.
3. Offer recovery or discard there according to the recording contract.
4. Do not accept the candidate merely because Continue was selected.
5. If candidate bytes are missing, incompatible, explicitly deleted, or superseded, state that recovery is unavailable and preserve the accepted take/project. Do not invent an inactivity or fixed-time expiry.

The draft is account-owned and recoverable across devices after sign-in, with no expiry until acceptance, explicit draft deletion, project deletion, or account deletion. The recovery claim is allowed only after durable media and account association succeed; replacement and physical cleanup mechanics remain production details.

### 5.6 Rename a project

1. The owner activates the title in its row and edits it inline.
2. Leaving the title field submits the changed value automatically; there is no rename dialog and no explicit Save / Cancel pair.
3. Enter submits the current changed value. Keep editing active while persistence is pending and finish editing only after the service returns success.
4. Escape cancels the current edit, restores the previous successfully persisted title, and performs no save. Suppress the blur caused by this cancellation so it cannot submit the cancelled attempted value.
5. De-duplicate the Enter-triggered request and the blur caused by ending that edit; the same changed value/revision produces one save operation, not Enter plus blur duplicates.
6. Apply the shared leading/trailing-whitespace trim. Reject an empty resulting title and any title over 100 visible Unicode grapheme clusters under the shared `Intl.Segmenter` rule. Allow a title that duplicates another project's title; do not add uniqueness validation or an extra character-class rule.
7. Bind the command to the project ID and expected name/project revision, not to display text.
8. While saving, keep the attempted value editable and expose a scoped saving state without blocking unrelated rows.
9. On success from Enter or blur, adopt the returned authoritative trimmed name/revision; Enter then ends editing. Reconcile list order only when the authoritative activity contract requires it.
10. On validation rejection, stale revision, or save failure, preserve the attempted editable value, keep editing active, and show the field-associated error while the last successfully persisted name remains authoritative. Never falsely finish an Enter edit on failure.

The trim/nonempty rule, 100-visible-grapheme-cluster maximum, duplicate allowance, blur autosave, Enter-save-on-success, Escape-cancel-without-save, duplicate-event guards, inline placement, field-associated error, attempted-value preservation, authoritative prior-name behavior, and absence of Save / Cancel buttons are resolved. Use `Intl.Segmenter` consistently for the count; this resolves **OPEN-F11-01A**.

### 5.7 Delete a project

1. Open the row menu and choose Delete project.
2. Load or revalidate the deletion impact if the row does not already hold current impact facts.
3. Open a confirmation bound to the project ID and current revision.
4. On cancel, make no mutation and return focus to the row menu trigger.
5. On confirm, submit one idempotent deletion command and mark the row as deletion pending.
6. Do not increase available capacity optimistically.
7. On authoritative success, remove the row, update used/maximum capacity from the response, announce that the project was deleted and the slot is available, and expose the agreed return path if this visit originated from Flow 06.
8. On rejected/stale impact, keep the project, refresh consequences, and require a new confirmation if materially changed.
9. On failure with a known non-deletion result, restore row actions and show specific retry guidance.
10. On timeout/unknown outcome, reconcile deletion status before enabling another destructive command.

### 5.8 Delete during processing

Deletion is still allowed by the confirmed product contract, subject to an honest confirmation:

1. The dialog states that deleting is not cancellation and does not guarantee a refund or prevent a charge for successful pending work.
2. Confirmation sends the project deletion command, not the Flow 07 cancellation command.
3. After deletion commits, owner access and result availability stay fenced even if a worker later completes.
4. Account-level billing reconciles independently and may update the shared credit balance/history.
5. Late processing or result events cannot recreate the project row or restore deleted project media.

The exact settlement/return order for a completion racing with deletion is production-blocked by **OPEN-F11-T03**.

### 5.9 Capacity change from another tab or purchase

- A verified first purchase may raise the limit from two to ten; My projects refreshes the authoritative entitlement and must not add more than one upgrade.
- Another tab/device may create or delete a project. A stale displayed count is refreshed when the screen regains focus or a command reports a revision conflict, subject to the future freshness policy.
- A visible available slot is not a reservation. Flow 06 must still acquire it atomically after validation.
- A deletion in another client removes the row after reconciliation; a project created or updated elsewhere appears in most-recent-activity-first order after reconciliation.

## 6. Error and recovery matrix

| Situation | Required user-visible behavior | Preserved truth |
|---|---|---|
| Project list unavailable | Explain that projects could not be loaded; provide Retry | Do not show cached/local projects as current without a stale marker |
| Capacity unavailable | Keep safely loaded rows; capacity and New dub eligibility are unknown | Never guess 2 or 10 or claim a free slot |
| One thumbnail fails | Keep row text/actions; show Preview unavailable in fixed media slot | Project/progress remain usable |
| Resume resolution times out | Keep the row; offer Retry/reconcile | Do not navigate from the stale target or duplicate a job |
| Latest reprocessing attempt reports zero turns while a prior usable nonempty preparation is active | Show the latest-attempt No dialogue found outcome without replacing the row's active Record-ready state; Continue resolves the preserved preparation | Preserve its turns and unaccepted draft; no refund or extra retry |
| Recording is owned by another connected device | Explain that recording must be left on that device before retrying | No takeover, device identity, or capture start; ordinary authoritative disconnect release applies |
| Project changed elsewhere | Refresh row and destination; explain that newer saved progress was found when needed | Never overwrite the newer revision |
| Project deleted elsewhere | Remove after authoritative reconciliation and move focus predictably | Do not expose cached project media or actions |
| Candidate marker exists but media is unavailable | Route to Record recovery with an unavailable explanation or report before navigation, per Flow 09 | Accepted take/progress remain unchanged |
| Inline rename save fails | Keep the entered title and an actionable scoped error | Last successfully persisted title remains authoritative; no silent rollback or false success |
| Delete-impact load fails | Do not open a consequence-incomplete confirmation; offer Retry | Project remains unchanged |
| Delete command rejected as stale | Refresh title/processing impact and require renewed confirmation | No mutation from the stale consent |
| Delete command fails definitively | Keep the row and occupied slot; restore actions and provide Retry | No false deletion or capacity increase |
| Delete result is unknown | Show checking status and reconcile by command/project identity | Do not issue blind repeated deletes or claim success |
| Processing completes while deletion is pending | Resolve against authoritative delete/billing contract | No restored project or result access; no invented refund |
| Background job completes while another page/project is current | Update/reconcile authoritative status without navigation; explicit Continue opens it later | Stale observer callback cannot redirect or steal focus |
| Session expires | Hide/fence private data and offer sign-in recovery | Reauthentication does not change project state |

## 7. Desktop, phone, keyboard, and assistive behavior

### 7.1 Shared reading and focus order

The semantic order is:

1. compact global navigation;
2. My projects title;
3. capacity statement and New dub action;
4. page-level error/notice when present;
5. project list in the approved order;
6. within each row: thumbnail, title, progress, Continue, row menu.

Visual rearrangement must preserve this reading and focus order.

### 7.2 Desktop and tablet

- Use one centered or fluid list column, at most 1200 px wide, aligned with the shared top-navigation content edges and 32 px page gutters.
- Rows are compact two-line data rows with one fixed thumbnail slot; they are not large media cards.
- Title receives the flexible identity width. Progress and actions remain aligned and do not create ragged card edges.
- Continue stays visible. Delete remains in the row menu.
- At tablet widths, secondary progress may wrap beneath the title, but no project field is dropped and the page does not scroll horizontally.
- Capacity remains above the list and uses the same used/limit values as any indicator.

At 768 CSS px and above, use the regular top navigation, source component desktop density, component-specific source geometry, and desktop gutters. Below 768 px use the phone rules.

### 7.3 Phone

- Use the shared signed-in phone header: logo at left, available credit balance and menu button at right. The menu contains New dub, My projects, Credits, Account, language selection, and Sign out; do not introduce a permanent sidebar.
- Below 768 CSS px use a single-column layout, 16 px horizontal page gutters, 48 px standard button/input height, and component-specific source geometry.
- Each project remains one compact list item: thumbnail at the start, title and progress in the central stack, and an accessible trailing menu.
- Continue is a visible text/button action and is not hidden inside the menu.
- If horizontal space cannot hold progress and Continue, progress moves below the title and Continue stays in the action line; fields are not removed.
- The first row begins in the upper portion of the viewport; capacity cannot expand into a dashboard-like hero that pushes the list below the fold.
- The delete confirmation becomes an accessible dialog or bottom sheet under the shared shadcn pattern, with the destructive action reachable without horizontal scrolling.
- Russian text, browser zoom, and the on-screen keyboard must not cover confirmation actions.

### 7.4 Keyboard and assistive technology

- The page has one `h1`; the project collection uses semantic list structure.
- Each row's Continue and menu trigger uses the current authoritative project name as its programmatic identity, defaulting to the source filename without its extension until renamed.
- The thumbnail is decorative when the same project identity is expressed by the row title; its unavailable state is announced only when it affects understanding.
- Progress is exposed as text. Color, bar length, thumbnail, or stage icon is never the sole signal.
- The capacity indicator exposes used and maximum values and does not rely on a visual bar alone.
- Menu and dialog follow predictable arrow/Escape/Tab behavior. Opening the dialog moves focus to its heading or first safe control; cancellation returns focus to the trigger.
- Destructive confirmation does not receive initial focus when a safer cancel control is available under the selected shadcn dialog pattern.
- While deletion is pending, announce the state without moving focus repeatedly. After success, move focus to the next row's stable action, the previous row when there is no next row, or the list/empty-state heading when no rows remain.
- Loading, refresh, resume failure, deletion success/failure, and external removal are announced through appropriately scoped live regions without duplicating every row update.
Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.  There is no page-entry, parallax, or decorative motion; reduced-motion preference disables the UI transitions. Animation never delays save, delete, Continue, or navigation outcomes. This screen does not alter any video/audio playback or playhead behavior owned by media flows.

## 8. Visible information and localization contract

### 8.1 Required visible information

The screen must expose:

- page identity;
- authoritative used and maximum project slots;
- full/available/unknown capacity meaning;
- for every row: small thumbnail/fallback, project title, progress, Continue, and row menu;
- whether a recoverable recording draft needs attention without calling it accepted;
- specific loading/error/retry state;
- delete consequences relevant to processing state; and
- successful deletion/capacity refresh.

### 8.2 EN/RU working vocabulary

On first use without a saved preference, browser language `ru` selects Russian and every other browser language selects English. The shared locale control permits manual switching. An explicit manual choice made before sign-in remains active after sign-in, overrides a different saved account preference, and updates that account preference. A browser-derived initial locale is not an explicit choice and does not overwrite an existing account preference. My projects reuses this shared reconciliation rule rather than guessing independently.

These strings fix meaning and vocabulary; final punctuation, pluralization, and line wrapping await localization review.

| Purpose | English | Russian |
|---|---|---|
| Page title | My projects | Мои проекты |
| Main row action | Continue | Продолжить |
| Row destructive action | Delete project | Удалить проект |
| Empty state | No projects yet | Проектов пока нет |
| New-project action | New dub | Новый дубляж |
| Thumbnail fallback | Preview unavailable | Предпросмотр недоступен |
| Recoverable candidate | Recording draft available | Доступен черновик записи |
| Capacity pattern | {used} of {limit} project slots used | Использовано мест: {used} из {limit} |
| Full capacity | Project capacity is full. Delete a project to free a slot. | Все места для проектов заняты. Удалите проект, чтобы освободить место. |
| Delete consequence | This project and its saved work will be deleted. | Этот проект и сохранённая работа будут удалены. |
| Billing consequence | Completed processing is not refunded. Deleting does not cancel processing already in progress. | Завершённая обработка не возмещается. Удаление не отменяет уже запущенную обработку. |
| Delete confirmation | Delete project | Удалить проект |
| Safe dialog action | Cancel | Отмена |
| Delete success | Project deleted. A slot is available. | Проект удалён. Место освободилось. |
| Generic retry | Retry | Повторить |

Progress wording must use the same stage vocabulary as Record / Result, with Processing as the pre-record state, and distinguish action-required failures from ordinary in-progress work. English/Russian plural forms, number formatting, truncation, and long-title behavior require localization verification.

Rename validation/limits, confirmed Enter/Escape semantics, opening-as-activity/list-load-as-non-activity, and the remaining authoritative activity/tie mechanics must not be changed or hidden inside translation choices.

## 9. Logical frontend service contracts

The frontend uses the centralized interchangeable service boundary. Names identify responsibilities, not transport endpoints, React hooks, database tables, or backend module layout.

### 9.1 `ListOwnedProjects`

**Input:** authenticated account/session context; optional known collection/capacity revision for refresh reconciliation.

**Success result:**

- collection revision and freshness data;
- authoritative capacity: used slots, maximum slots, entitlement revision, and whether a new slot can be attempted;
- projects ordered by authoritative most recent activity descending, with deterministic service-side tie handling;
- per project: stable project ID/revision; current authoritative source identity/revision and current source filename; current authoritative display name; authoritative title provenance (`automatic_filename` or `manual_rename`) rather than an inferred text match; filename stem/truncation facts for the current automatic title where applicable; rename revision where applicable; whether the first AI preparation launch has occurred; authoritative activity value; thumbnail descriptor/availability; active usable preparation identity and nonempty-turn fact when one exists; latest preparation-attempt identity/outcome separately from that active preparation; workflow/progress summary; action-required reason when present; processing/billing-impact marker needed for deletion impact; deletion-pending state; and recoverable-candidate availability marker without candidate promotion.

**Errors:** unauthenticated/unauthorized; service unavailable; capacity unavailable; partial media-descriptor failure; collection revision conflict.

The response must not expose raw source URLs, other owners' work, or local-only candidate blobs.

`ListOwnedProjects` is observational. Calling it, refreshing it, receiving its rows, or recalculating their displayed order must not record an open/activity event for every project. It returns authoritative activity/order values assigned by the service; it does not synthesize new ones from list visibility.

### 9.2 `ResolveProjectResume`

**Input:** authenticated account/session context; project ID; known project revision; optional current destination context needed for duplicate-safe reconciliation.

**Success result:** current project revision; current source/name revisions and authoritative title provenance; authoritative New dub, Processing, Record, or Result destination and route context; pre-first-AI source-replacement eligibility only when applicable to the New dub state; active usable preparation identity and nonempty-turn fact when one exists; latest preparation-attempt identity/outcome kept distinct from that active preparation; established ordered turn identities from the active preparation; the first turn without an accepted recording when unfinished; required preparation-artifact/turn/result/job identities; accepted progress; unfinished-work truth; zero-turn recovery state only when no active usable nonempty preparation exists; latest-attempt zero-turn notice when applicable; recoverable-candidate marker/locator for that target turn within its permitted scope; recording-ownership precondition or active-elsewhere condition needed by Flow 09; authoritative successful-project-open activity/order revision for this selected project; any reauthentication or action-required condition.

**Errors:** unauthorized/not found/deleted; stale revision with replacement summary; preparation unavailable; media unavailable; candidate unavailable; recording active on another connected device; internally inconsistent workflow state; service unavailable.

The service returns New dub for the saved validated draft, Processing for active/recoverable processing or a zero-turn outcome with no active usable nonempty preparation, Record targeting the first turn without an accepted recording in established order from the active usable preparation when unfinished work exists, and Result otherwise. Only the pre-first-AI New dub state may carry replacement eligibility; Flow 11 passes that authoritative context through and adds no upload control. A candidate marker on the first unfinished target turn triggers a recovery offer without acceptance; last-viewed turn does not affect resolution. When only the latest completed retry has zero turns and a prior usable nonempty preparation remains active, the resolver returns Record from that preserved preparation and carries the latest-attempt No dialogue found notice; it does not replace the active turns/draft or return blanket zero-turn recovery. Only initial/no-active-usable zero-turn state is barred from Record/Result. Record navigation does not itself steal recording ownership: Flow 09 rechecks/reacquires before capture and provides no forced takeover. The frontend does not rebuild these rules from counts, status labels, filenames or title text.

Successful resolution/open records recent activity for the selected owned project even if it causes no project-content mutation. Successful user changes and authoritative background-processing/result completion also count as activity. Failed, unauthorized, deleted, stale-without-open, or unknown resolution must not be represented as a confirmed open/activity update. The mock uses a shared monotonic sequence, stable project-ID tie-break, and event-ID deduplication; production event authority and delivery evidence remain **OPEN-F11-02**.

### 9.3 `ObserveOwnedProjectStatus`

**Input:** authenticated account/session context; known collection/project/job revisions or observer cursor; current visible page/project context.

**Success result:** authoritative project/job status changes, current project/activity/order revision when applicable, and instruction to refresh/resolve. It never returns a command to navigate a different current page merely because preparation or assembly completed.

**Errors:** unauthenticated/unauthorized; stale cursor requiring full list refresh; service unavailable.

The frontend may update the corresponding row/status or refresh the list, but only explicit **Continue** calls `ResolveProjectResume` to open that project. Observer delivery, reconnect, list reload, duplicate completion, or stale callback cannot redirect the user or count as opening every observed project. Automatic completion handoff is valid only inside the matching operation/project screen under its owning flow.

### 9.4 `RenameOwnedProject`

**Input:** authenticated account/session context; project ID; expected project/name revision; edited title; save trigger (`blur` or `Enter`); client operation identity used to de-duplicate Enter plus resulting blur. Escape produces no command.

**Success result:** authoritative persisted title after leading/trailing trim, proven nonempty and at most 100 visible Unicode grapheme clusters under the shared `Intl.Segmenter` rule; new project/name revision; authoritative title provenance set to `manual_rename`; collection/activity revision if affected. A duplicate of another project title is valid.

**Errors:** unauthorized/not found/deleted; stale revision with current authoritative title; empty-after-trim; over 100 visible Unicode grapheme clusters under the shared counting rule; temporary service failure. Duplicate title is not an error.

The command is idempotent for the same expected revision and edited value/operation identity, so Enter plus blur cannot create two saves. Every successful rename sets authoritative provenance to `manual_rename`, including when the saved text happens to equal the automatic filename-derived title; failed, stale, rejected, or escaped edits do not change provenance. Enter finishes editing only after success. Rejection, stale revision, or temporary failure preserves the attempted title as editable, keeps editing active, and returns a field-associated error while the last successful service value remains authoritative. Escape restores that authoritative title locally, suppresses its caused blur save, and sends no rename command. The service contract does not add a dialog, Save / Cancel actions, or client-only success. Client and service use the same `Intl.Segmenter` grapheme-cluster rule, with a 100-cluster maximum; **OPEN-F11-01A** is resolved.

### 9.5 `GetProjectDeletionImpact`

**Input:** authenticated account/session context; project ID and known revision.

**Success result:** authoritative display identity; current project revision; occupied-slot fact; queued/running processing and known charge-impact category; whether deletion is currently permitted; consequence revision/confirmation token if used.

**Errors:** unauthorized/not found; stale revision; temporary service failure; impact unavailable.

If processing consequences cannot be established, destructive confirmation remains unavailable. The frontend does not omit unknown consequences.

### 9.6 `DeleteOwnedProject`

**Input:** authenticated account/session context; project ID; expected project/impact revision; one idempotency identity for the confirmed command.

**Success result:** deletion identity and committed logical-deletion state; updated used/maximum capacity and entitlement revision; owner-media/result fencing status; account-level billing-reconciliation status where processing was pending; collection revision.

**Errors:** unauthorized/not found; stale impact requiring renewed confirmation; already deleted as an idempotent reconciled result; deletion prohibited; dependency failure; temporary service failure; unknown outcome requiring status lookup.

Deletion success cannot be represented by a locally removed row alone. A late worker/result event must be fenced by the authoritative deletion identity.

### 9.7 `GetProjectDeletionStatus`

**Input:** authenticated account/session context; deletion command identity and project ID.

**Success result:** pending, committed, or definitively failed; current capacity revision; billing-reconciliation state when applicable.

**Errors:** unauthorized; unknown command identity; service unavailable.

This contract prevents a network timeout from turning into repeated destructive commands or false slot release.

## 10. Persistence, ownership, and concurrency boundaries

### 10.1 Browser/UI state

May include:

- current scroll/focus position;
- open row-menu or confirmation state;
- in-flight request identity;
- known collection/project revisions; and
- the active inline title edit and its actionable save error; and
- originating capacity-blocked return context.

Browser state cannot establish ownership, capacity, project existence, accepted progress, result readiness, candidate durability, deletion, media removal, or billing outcome.

### 10.2 Account-authoritative state

Includes:

- saved project/source identity and occupied slot;
- current source revision, last successfully persisted project title, authoritative automatic/manual title provenance, and name revision;
- the active usable preparation artifact/turn set, separately from the identity and outcome of the latest preparation attempt, plus processing progress;
- accepted takes and their compatibility;
- finished result associations;
- recoverable-candidate marker only after candidate persistence actually succeeds;
- account-owned candidate media and account association needed for cross-device recovery, retained without expiry until acceptance, explicit draft deletion, project deletion, or account deletion;
- capacity entitlement and upgrade;
- logical deletion/fencing; and
- credit/billing reconciliation independent of the removed project row.

### 10.3 Concurrency requirements

- List, resume, and delete commands carry/reconcile revisions.
- A confirmed open/activity update applies only to the selected owned project and is returned with an authoritative activity/order revision. List load, row observation, reconnect, or duplicate completion cannot touch every row or replay one activity event multiple times.
- Background completion may update status/order facts but cannot navigate a different current page. Stale observer callbacks are ignored or reconciled; explicit Continue performs the later project open.
- Inline rename carries the expected project/name revision; stale or failed saves cannot overwrite a newer authoritative title, and unrelated rows remain usable.
- A successful eligible Flow 06 source replacement commits one new source revision in the existing project/slot and updates the title only when authoritative provenance is `automatic_filename`; `manual_rename` preserves the title. Failed replacement preserves the prior source, title and provenance. Clients never infer provenance from text equality, and no post-first-AI-launch replacement is accepted through a stale project revision.
- A stale Continue cannot navigate as though older progress were current.
- A stale delete confirmation cannot delete after materially changed processing consequences without renewed confirmation.
- Duplicate deletion commands converge on one deletion outcome.
- Slot release and a concurrent validated upload are server-authoritative; the frontend cannot allocate by decrementing a displayed number.
- A late preparation/result completion cannot recreate a deleted project or restore its result access.
- A competing-tab take acceptance remains governed by the Record flow's revision fences.
- Recording capture is exclusive to one connected device per project. Explicit recording exit and authoritative disconnect release ownership; clients recheck/reacquire before capture, and no Flow 11 action forces takeover.

## 11. Mock truth and production dependencies

### 11.1 Interchangeable mock boundary

The mock service must cover at least:

- zero projects with `0/2` capacity;
- one project with `1/2` capacity;
- full free capacity at `2/2`;
- upgraded capacity before and after the first verified purchase, including `10/10`;
- a validated automatically saved pre-processing draft that resumes in New dub without processing authorization;
- most-recent ordering in which explicitly opening one owned project moves it to the top without any edit/recording mutation, while initial list load and refresh leave every row's activity unchanged;
- cross-project activity fixtures under a frozen clock, stable-ID ties, and duplicate-event/reload observers to verify the selected mock sequence mechanics; production event authority remains open under `OPEN-F11-02`;
- filename-stem initial titles at 0/1/99/100/101 visible grapheme clusters under the shared count fixture, including first-100-cluster truncation with the original source filename unchanged and explicit empty-stem technical handling; include emoji and combining-sequence examples;
- pre-first-AI replacement fixtures in the same project/slot: successful validation with `automatic_filename` provenance regenerates the title from the new filename after last-extension removal and first-100-grapheme-cluster truncation; successful validation with `manual_rename` provenance preserves the manual title; failed validation preserves prior source/title/provenance; and a post-first-launch state is ineligible. Include an automatic title whose text coincidentally matches a manual title to prove provenance is not guessed from equality;
- inline blur-autosave and Enter-save success/pending; every successful rename sets `manual_rename` provenance even when its text equals the automatic title; Enter ends edit only after success; Enter-triggered blur de-duplicates to one save; Escape restores the prior persisted title without a command and suppresses Escape-caused blur autosave; leading/trailing trim; empty-after-trim and 101-character rejection; 100-character acceptance; duplicate-title acceptance; stale revision and temporary failure with the attempted value still editable, edit mode retained, field-associated error, prior persisted title authoritative, and prior provenance unchanged;
- queued/running preparation;
- failed preparation that still occupies a slot;
- usable preparation complete and Record-ready state;
- incomplete Record state with accepted progress;
- ordered turns with accepted gaps and a last-viewed turn different from the first unaccepted turn;
- an account-owned cross-device recoverable unaccepted candidate distinct from accepted progress, including durability-pending and offered-after-return states;
- a recoverable candidate on the first unaccepted turn and a candidate/last-viewed marker on a later turn that must not change the resume target;
- a Record destination available for ownership acquisition, ownership retained by another connected device with no takeover, explicit-exit release, authoritative-disconnect release, and reacquisition before capture;
- initial/no-active-usable zero dialogue detected, with eligible reprocessing and another-video exits but no Record/Result destination;
- a latest reprocessing attempt with zero turns while a prior usable nonempty preparation remains active: the prior preparation/turn identities and unaccepted draft are preserved, Continue resolves Record, and the latest-attempt notice does not grant a refund or extra retry;
- Result assembly running, failed, and ready;
- preparation/result completion observed while the user remains on My projects, another project, and another section: row/status updates without redirect; only explicit Continue invokes the current resume destination; stale/duplicate observer callbacks never navigate;
- deletion with no processing and during processing;
- stale revisions, external deletion, duplicate delete, timeout/unknown delete outcome, and definitive delete failure;
- list-only failure, capacity-only failure, thumbnail failure, and session expiry;
- browser-`ru`, non-`ru`, account-preference, explicit manual pre-sign-in override/update, and authenticated account-persisted language states;
- header balance fixtures where the main number is available credits after reservations and the reserved amount is separate;
- no email/push completion-notification fixture or UI path; and
- long English/Russian titles at the confirmed 100-grapheme-cluster limit, including emoji and combining sequences.

Fixtures must use stable IDs and revisions. Mock success proves the UI state contract only. It does not prove durable retention, cross-device candidate recovery, worker fencing, private result-media removal, slot atomicity, ledger reconciliation, or physical erasure.

### 11.2 Production dependencies

Production readiness depends on:

- an authoritative project repository and ownership checks;
- atomic upload-validation/project-slot acquisition and deletion/slot release;
- atomic eligible source replacement in the existing Flow 06 project/slot, with authoritative source/title-provenance revision and no post-first-AI-launch mutation;
- a canonical project workflow/resume resolver shared by Flows 06–07 and 09–10 that distinguishes latest preparation-attempt outcome from the active usable preparation identity;
- stable thumbnail generation and access control;
- durable accepted-take/progress and result state;
- durable account-associated storage for cross-device candidate recovery and defined replacement/physical-cleanup mechanics;
- exclusive recording-ownership acquisition, explicit-exit release, authoritative disconnect release, reacquisition, and stale-write fencing owned with Flow 09;
- deletion fences for workers, private result media, and late events;
- defined processing-completion/deletion billing reconciliation;
- logical-versus-physical deletion, backup, cache, and CDN policies;
- authoritative inline rename persistence with shared trim/nonempty/100-grapheme-cluster/duplicate-title enforcement, plus selected-project open activity, successful changes and completion events, read-only list observation, and selected mock sequence/tie/event-ID deduplication; production event authority/delivery remains `OPEN-F11-02`;
- authentication/session-expiry behavior; and
- shared-shell available-credit semantics, locale-preference reconciliation, and exclusion of job-completion email/push; and
- rendered desktop/phone, accessibility, and localization evidence using the approved shared tokens, type scale, dimensions, breakpoint, gutters, content width, and phone header.

## 12. Acceptance criteria

### 12.1 Confirmed and unblocked

- **AC-F11-01 — Authoritative list:** An authenticated user sees only account-owned projects returned by the authoritative service. Local cache, route history, or stale client progress is never shown as current without an explicit stale state.
- **AC-F11-02 — Compact row anatomy:** Every normal project is represented by one compact list row with a small scene/video thumbnail or truthful unavailable fallback, inline-editable project title, saved progress, visible Continue action, and a row menu containing Delete project. The screen is not a card grid and has no permanent sidebar.
- **AC-F11-03 — Capacity truth:** The screen shows authoritative used and maximum project slots. Free capacity is two; the first verified credit purchase permanently changes the maximum to ten. Credits and slots are not conflated.
- **AC-F11-04 — Slot lifecycle:** Validated committed projects, including failed-AI projects, count as occupied. Rejected uploads do not. Deletion frees one slot only after authoritative commit, and no existing project is deleted automatically.
- **AC-F11-05 — Retention truth:** Current projects are not presented as expiring for inactivity. A persisted unaccepted recording draft is account-owned and has no expiry until acceptance, explicit draft deletion, project deletion, or account deletion. The UI defines no automatic archive, project expiry, trash, or whole-project substitution; eligible pre-first-AI source replacement remains inside the same project and occupied slot.
- **AC-F11-06 — Resume authority:** Continue revalidates the selected project and navigates only with an authoritative destination/revision: validated unprocessed draft to New dub, active/recoverable processing to Processing, unfinished recording work to the first turn without an accepted recording in established order, and no unfinished work to Result. A persisted candidate on that target turn is offered without acceptance. It never uses last-viewed state or a mandatory chooser, and no Prepare destination exists.
- **AC-F11-06A — No repair or lock bypass:** A successfully prepared project proceeds to Record as given. My projects exposes no transcript/speaker/timing edit, missed-line addition, background audition, targeted repair, post-preparation source replacement, automatic refund, or slot exception. A poor turn is performed as-is or restarted as a normal new project, and whole-section reprocessing remains permanently locked after the first successfully accepted saved take; failed capture/save alone does not lock it.
- **AC-F11-07 — Candidate distinction and recovery:** A durably persisted unaccepted recording candidate is offered after return/reload and after sign-in on another device without being counted, presented, or automatically committed as an accepted take. Candidate loss/unavailability preserves the accepted take and is stated honestly; the UI does not claim cross-device safety before media and account association are durable.
- **AC-F11-08 — Delete confirmation:** Delete project is in the row menu and requires a project-bound standard confirmation that names the project, states that the project/saved work will be deleted and one slot frees on success, states that completed processing is not refunded, and adds the in-progress-processing warning when applicable. Its actions are Cancel and Delete; it requires no typed name or confirmation word.
- **AC-F11-09 — Delete during processing:** Deletion is not sent as cancellation. A committed deletion fences owner access and result availability and cannot be reversed by a late worker completion; account-level billing remains independently reconciled.
- **AC-F11-10 — Delete failure and idempotency:** Definite failure keeps the row and occupied slot. Unknown outcomes reconcile before retry. Duplicate commands do not free multiple slots or create contradictory states.
- **AC-F11-11 — Empty/loading/error states:** The zero-project list region contains only No projects yet and New dub, with no demos, tour, tutorial, illustration, or fake project. Loading, list failure, capacity failure, thumbnail failure, stale refresh, unauthorized, and project-unavailable states preserve truthful data and expose a relevant next action without invented values.
- **AC-F11-12 — Responsive list:** Desktop, tablet, and phone retain thumbnail, title, progress, Continue, and menu with no page-level horizontal overflow. At 768 CSS px and above the regular top navigation, approved desktop action roles in design-tokens.md, and 32 px gutters apply; below 768 px the phone header, single column, 48 px controls, and 16 px gutters apply. Controls use component-specific source geometry and working content is at most 1200 px wide. Continue remains visible and deletion remains in the menu.
- **AC-F11-13 — Accessible operation:** Capacity, progress, Continue, menus, confirmation, pending state, failures, and success are operable and understandable with keyboard and assistive technology; color, image, and bar length are never the sole signals.
- **AC-F11-14 — Localization and preference:** English and Russian versions preserve every required fact and consequence, including long text, plural forms, progress counts, full-capacity guidance, project/media deletion, and billing wording. First use defaults to Russian for browser language `ru` and English otherwise. An explicit manual pre-sign-in choice overrides a different account preference after sign-in and updates it; a browser-derived initial locale does not overwrite the account preference.
- **AC-F11-15 — Validated-draft preservation:** Leaving after upload validation automatically keeps the project in My projects without a mandatory save/delete leave prompt. It continues to occupy one slot until project/account deletion, and resuming it does not automatically authorize or start processing.
- **AC-F11-16 — Project name and provenance:** Initial display name is the uploaded source filename without its extension, truncated to its first 100 visible Unicode grapheme clusters when longer using `Intl.Segmenter`; the uploaded source filename remains unchanged and no name entry is required before processing. Rename edits inline and autosaves on blur without a dialog or Save / Cancel buttons. Enter saves and ends editing only after success; Escape restores the prior persisted title without saving; Escape-caused blur and Enter-plus-blur cannot submit cancelled/duplicate saves. The service trims leading/trailing whitespace, rejects an empty result or more than 100 grapheme clusters, allows duplicates, and adds no unselected character-class restriction. Rejection/failure keeps the attempted value editable, edit mode active, and the field-associated error visible while the last successful name and provenance remain authoritative. Every successful inline rename sets `manual_rename` provenance even when the saved text equals the derived automatic title. A successful eligible pre-first-AI source replacement regenerates a title with authoritative automatic provenance from the new filename using last-extension removal and first-100-grapheme-cluster truncation, while authoritative manual-rename provenance preserves its title; failed replacement preserves source/title/provenance. Provenance is never inferred from text equality. **OPEN-F11-01A** is resolved.
- **AC-F11-17 — Most-recent activity order:** Projects are ordered by authoritative most recent activity, newest first. Errors/incomplete states do not jump the queue and creation time is not the primary order.
- **AC-F11-17A — Qualifying activity events:** A successful owned-project open, successful user changes, authoritative background-processing completion, and authoritative result completion move that project by most-recent activity. Loading, refreshing, or observing My projects does not touch every row. The mock uses a shared monotonic sequence, stable project-ID ties, and deduplicated event IDs. Real-service event authority and delivery evidence remain under `OPEN-F11-02`.
- **AC-F11-18 — Unfinished-work routing:** A project with unfinished recording work, including one with a prior result, resumes at the first turn without an accepted recording in established order. A recoverable candidate on that turn is offered without automatic acceptance. The last-viewed turn is ignored; when no unfinished takes remain the project resumes in Result.
- **AC-F11-19 — Zero-turn recovery and prior-state preservation:** An initial/no-active-usable zero-turn outcome never enters Record or Result and offers eligible reprocessing or another video. If only the latest completed retry finds zero turns while a prior usable nonempty preparation exists, that preparation, its turns, and its unaccepted draft remain active; Continue resolves Record from them while the latest-attempt No dialogue found outcome is shown. In both branches the completed processing charge and successful-retry consumption remain unchanged, with no refund or extra free retry.
- **AC-F11-20 — Approved shared visual treatment:** Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed. Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.
- **AC-F11-21 — Credit meaning:** The shared header's main credit number is available spendable credits after reservations. Reserved credits are separate as In processing and are never folded into or mislabeled as the available balance.
- **AC-F11-22 — Background status without navigation theft:** My projects provides authoritative processing/result status when the user returns, and may update a row while visible. Completion while the owner is on My projects, another project, or another section never redirects or opens that project; only explicit Continue opens its current authoritative destination. Matching owning processing/result screens retain their own valid in-flow handoff. The MVP sends no preparation/result-completion email or push and exposes no notification opt-in; background work continues normally.
- **AC-F11-23 — Single-device recording handoff:** Only one connected device records a project at a time. Continue never forces takeover or reveals the owning device. Explicit recording exit and authoritative disconnect release ownership, and every client rechecks/reacquires before capture; exact lease timing and stale-write fencing remain technical Flow 09 details.
- **AC-F11-24 — Same-project source replacement handoff:** My projects reflects Flow 06 replacement only after successful validation in the same project and occupied slot before the first AI preparation launch. It exposes no replacement-upload control itself. Failed validation changes neither source nor title, and no state after first AI launch is represented as replacement-eligible or allowed to bypass retry/reprocessing rules.

### 12.2 Open contract details without reopening confirmed behavior

- **AC-F11-B02 — Production activity evidence:** **OPEN-F11-02** tracks real-service event authority, timestamp/tie semantics, and event-delivery/observer/reload/retry deduplication evidence. It cannot remove the resolved qualifying activity events, turn list loading into row activity, change newest-first order, or add error priority. Local mock sequence/tie/event-ID deduplication mechanics are selected and tested.

### 12.3 Blocked on production policy/evidence

- **AC-F11-T01 — Candidate durability and cleanup:** Production evidence must prove account-owned cross-device persistence before the UI claims safety. Superseded/discarded-media replacement and physical cleanup timing remain technical policy; they cannot introduce inactivity expiry or automatic acceptance.
- **AC-F11-T02 — Physical deletion claim:** Backup/cache/CDN/intermediate/log erasure timing must be defined and evidenced before the UI or policy promises complete physical deletion by a deadline.
- **AC-F11-T03 — Processing/deletion billing race:** The completion-versus-deletion ordering and account-level reservation/settlement/return result must be selected and tested before production acceptance of deletion during processing.

## 13. Verification plan — not executed

No check below has been run. This is required future evidence, not a test result.

### 13.1 Contract and state verification

- Exercise every page and row state in §§5–6 with fixed mock fixtures.
- Verify collection/project/name/capacity revisions are carried through list, inline blur-autosave rename, resume, impact, delete, and deletion-status reconciliation.
- Verify partial list/capacity/thumbnail failures do not fabricate the failed facts or erase successfully loaded regions.
- Verify session expiry hides/fences private project content and reauthentication reloads authoritative state.

### 13.2 Capacity verification

- Verify `0/2`, `1/2`, `2/2`, `0/10`, `9/10`, and `10/10` states.
- Verify failed upload validation does not add a row or consume a slot.
- Verify successful validated project commit consumes exactly one slot, automatically appears in My projects when the user leaves, presents no mandatory Save/Delete draft leave prompt, and keeps that slot until project/account deletion.
- Verify resuming the validated draft returns to New dub with its source/selection and does not authorize or start processing.
- Verify failed AI preparation remains listed and occupied.
- Verify the first verified purchase raises the limit from two to ten exactly once; a duplicate payment event/redirect cannot repeat the upgrade.
- Verify a displayed free slot cannot bypass authoritative acquisition when another tab/device wins the race.
- Verify successful project deletion frees exactly one slot and a failed/unknown deletion does not claim capacity prematurely.

### 13.3 Naming, order, and resume verification

- Verify the initial display name is the uploaded source filename without its extension and processing never requires prior name entry. At 99/100/101 visible grapheme clusters under a fixed shared-counting fixture, verify the 101-cluster derived title uses exactly its first 100 clusters while the source filename remains byte-for-byte unchanged; include emoji/combining sequences and cover the still-technical empty-stem/normalization edge separately.
- For eligible pre-first-AI source replacement, keep the project ID and occupied-slot count unchanged. After successful validation, verify an `automatic_filename` title is regenerated from the new filename using last-extension removal and first-100-grapheme-cluster truncation, while a `manual_rename` title remains byte-for-byte unchanged. Verify authoritative provenance rather than text equality decides the branch, including equal-looking filename/manual-title fixtures. On validation failure prove source/title/provenance remain unchanged; after first AI launch prove Flow 11 exposes no replacement action or eligible state and does not route around retry/reprocessing rules.
- Verify rename is inline and blur submits automatically with no dialog or Save / Cancel pair. Enter submits once and ends editing only after successful persistence; its resulting blur does not duplicate the save. Every successful rename sets authoritative `manual_rename` provenance, including a rename whose saved text equals the automatic filename-derived title. Escape restores the previous persisted title, sends no command, and its resulting blur cannot save the cancelled attempted value. Cover whitespace-only rejection after leading/trailing trim, successful trimmed nonempty value, 99/100-character acceptance, 101-character rejection, duplicate-title acceptance across project IDs, and no extra character-class rejection. For Enter/blur validation rejection, stale revision, and temporary failure, verify the attempted value remains editable, edit mode remains active, the error stays associated with the title field, and the last successful persisted title and provenance stay authoritative until success.
- Run Unicode boundary fixtures using `Intl.Segmenter`; prove client validation, service validation, initial-title truncation, and automatic title regeneration after eligible replacement use the same grapheme-cluster unit and never split encoded bytes.
- Verify the service returns most-recent-activity-first order, never elevates errors/incomplete rows, and does not use creation time as its primary key. Verify successful opens, user changes, authoritative processing completion, and authoritative result completion advance activity; duplicate operations and read-only list/observer refreshes do not reorder projects. Verify the mock monotonic sequence and stable-ID tie-break under a frozen clock. Production event-source and delivery evidence remains under **OPEN-F11-02**.
- Exercise the fixed decision table for every authoritative project state and expected Flow 06/07/09/10 destination.
- Verify stale local route and stale progress label cannot override the returned destination.
- Complete preparation and result assembly while the owner is on My projects, another project, and another section; verify authoritative row/status reconciliation without redirect, focus theft, or automatic project open. Verify only explicit Continue invokes the completed project's current resolver destination, while the matching owning operation screen may retain its valid in-flow handoff.
- Verify a validated unprocessed draft opens New dub, active/recoverable processing opens Processing, unfinished recording work opens the first turn without an accepted recording in established order, and no unfinished work opens Result.
- Verify accepted gaps, out-of-order saved progress, and a different last-viewed turn cannot displace that first-unaccepted target.
- Verify a project with a previous result and unfinished recording work still opens that first-unaccepted turn in Record; no state opens a mandatory Record/Result chooser or uses last-viewed preference.
- Verify a durably persisted candidate on the target turn is offered without automatic acceptance, while a candidate marker on a later turn does not change the target.
- Verify incomplete/failed processing never opens falsely ready Record.
- Verify successful processing proceeds directly to Record and that no Prepare/correction destination is exposed.
- Verify a poor/clipped supplied turn offers performance as-is or only a normal new-project path with ordinary credit/slot behavior and no automatic refund.
- Verify the first successfully accepted saved take permanently removes whole-section reprocessing, while failed capture/save does not create the lock and resume cannot bypass it.
- Verify an initial/no-active-usable zero-turn result shows No dialogue found with eligible reprocessing or another video, never Record/Result, and leaves the successful processing charge and retry entitlement unchanged.
- Verify a completed zero-turn retry with a prior active usable nonempty preparation preserves that preparation, its established turns, and its unaccepted draft; the row shows the latest-attempt No dialogue found notice while `ResolveProjectResume` returns Record from the preserved preparation. Prove no empty artifact replacement, refund, or extra retry occurs.
- Verify incompatible or missing takes are not counted complete.
- Verify result assembly in progress/failure and an older usable result are distinguished.
- Verify newer take/result/deletion revisions force reconciliation before navigation.

### 13.4 Candidate-recovery verification

- Verify a durably persisted unaccepted candidate is offered after reload/crash and after sign-in on another device, and is never auto-accepted.
- Verify one connected device can record a project at a time; Continue on another device cannot force takeover or reveal the owner. Verify explicit exit preserves the candidate-exit contract before release, authoritative disconnect releases ownership, and a returning/second client rechecks or reacquires before capture. Verify lease timing and stale-write fencing separately as Flow 09 technical evidence.
- Verify accepted progress does not increase until Flow 09 acceptance commits.
- Verify discard/recovery cannot delete or replace the prior accepted take accidentally.
- Verify the draft has no inactivity/fixed-time expiry and is removed only by acceptance, explicit draft deletion, project deletion, or account deletion.
- Verify the UI does not claim cross-device availability while media or account association is still pending/failed; test replacement and physical cleanup separately from user-visible retention.
- Verify missing/unpersisted bytes are never represented as recoverable.

### 13.5 Deletion verification

- Verify menu selection and confirmation are bound to the intended project ID/revision even when default or renamed titles duplicate.
- Verify the standard confirmation names the project, shows the applicable warning, provides Cancel and Delete, and never requests a typed name or confirmation word.
- Verify base, queued-processing, running-processing, completed-processing, and result-ready impact variants.
- Verify owner project/result media becomes inaccessible after committed deletion and a late result event cannot restore it.
- Verify completed processing is never refunded merely because the project is deleted.
- Verify pending processing deletion does not invoke cancellation and account-level billing reconciles according to the future **OPEN-F11-T03** rule.
- Verify stale impact requires renewed confirmation, double-click/network retry is idempotent, and timeout uses status reconciliation.
- Verify logical deletion/slot release separately from physical storage/CDN/backup cleanup evidence.

### 13.6 Interaction, responsive, accessibility, and localization verification

- Render and inspect representative empty, one-row, full-capacity, long-list, failure, inline-rename, and delete-dialog states above, at, and below the 768 CSS px breakpoint, including 390 px.
- Confirm a 1200 px maximum working-content width, 32 px desktop and 16 px phone gutters, role-sized desktop standard controls in design-tokens.md and 48px phone targets, component-specific source geometry, the 8/16/24/32 px shared spacing scale, and 24 px desktop / 16 px phone padding on panels that already exist. Confirm the scale creates no new panel or card wrapper. On phone confirm logo left plus available balance and menu right, with New dub, My projects, Credits, Account, language, and Sign out in the menu.
- Confirm the zero-project list region contains only No projects yet and New dub, with no illustration, demo/fake project, tour, or tutorial.
- Confirm the layout remains a compact list and does not collapse into project cards on phone.
- Complete inline rename/blur/error, Enter success/failure, Escape cancellation, duplicate-event suppression, Continue, menu, cancel, confirm, retry, reauthentication, and post-delete focus paths by keyboard only.
- Check screen-reader names, list structure, progress/capacity text, dialog description, live announcements, and focus restoration/movement.
- Check 200% zoom/reflow, contrast, touch targets, and the phone on-screen keyboard.Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged. 
- Check long Russian titles/messages, plural forms for `0/1/2/5/10`, progress counts, truncation disclosure, and no page-level horizontal overflow.
- Verify first use selects Russian for browser language `ru` and English otherwise. Verify an explicit manual pre-sign-in choice remains active, overrides a different account preference, and updates it after sign-in, while a browser-derived locale does not overwrite that preference.
- Verify the header's main credit number equals available spendable credits after reservations and that reserved credits, when shown on Credits, are separate as In processing. Verify insufficient-credit checks use the same available meaning.
- Verify neither preparation completion nor result-assembly completion creates an email, push, or notification-opt-in path; returning to My projects fetches authoritative status, visible status updates do not redirect, and leaving does not stop background work.
- Verify every approved semantic/component mapping: decorative divider versus essential control border, primary/destructive default-hover-pressed foregrounds, link, error, selected, disabled source opacity only for genuinely disabled controls, with readable reasons and no dimming of focusable busy controls, `focus.light` geometry and `focus.media` only on opaque media backing. Also verify Mabry Pro Regular/Medium only, role-specific Mabry Pro Medium desktop labels from design-tokens.md, Medium 14 px/20 px field labels, and the other approved type/line heights, shared dimensions/spacing/motion, moderate rounding outside the fixed component-specific source geometry, and absence of gradients, unmapped decorative shadows, and wrapper cards around every block. Keep static token calculations distinct from font assets/loading, fallback, browser rendering, forced-colors and actual accessibility evidence.

### 13.7 Evidence record

Future evidence must record procedure/command, result, environment/browser/device, date, revision or dirty-worktree boundary, fixture/service provenance, and artifact location. Mock, real-service, worker/billing, storage/CDN, and manual accessibility evidence must be reported separately. A green component or mock run does not prove slot atomicity, durable recovery, billing settlement, private result-media removal, or physical deletion.

## 14. Dependencies and cross-flow handoffs

| Dependency | Flow 11 expectation | Owned elsewhere |
|---|---|---|
| Shared shell and design tokens | Regular top navigation at 768 px and above; phone header below 768 px with logo, available balance and menu; 1200 px content maximum; 400 px maximum for shared sign-in/registration forms (not the project list); 32/16 px gutters; role-sized desktop controls in design-tokens.md and 48px phone targets control heights; component-specific source geometry; 8/16/24/32 px spacing; 24 px desktop / 16 px phone padding on existing panels without new wrappers; browser-based first-use locale; explicit pre-sign-in manual-choice precedence and account update; available credit meaning; account access; [design-tokens.md](design-tokens.md) semantic/component-state, typography, focus and motion roles | Shared frontend contract/design-token system |
| Flow 06 | Creates the slot-bearing validated project and returns capacity-blocked context; before first AI launch owns `Replace video` validation in that same project/slot, fresh selection/quote and the authoritative source/title-provenance outcome consumed here; consumes a newly free slot only after revalidation | Upload, validation, eligible source replacement, title-provenance mutation, selection, quote, authorization |
| Flow 07 | Supplies queued/running/cancelled/failed processing state, latest attempt outcome separately from the active usable preparation identity, initial/no-active-usable zero-turn recovery eligibility, preserved-prior-preparation behavior after a zero-turn retry, and direct usable handoff to Record | Processing lifecycle |
| Flow 09 | Owns established turn order, accepted progress, first-unaccepted target truth, target-turn candidate recovery/acceptance/discard, and single-device recording ownership. Explicit exit and authoritative disconnect release access; other clients recheck/reacquire; no forced takeover | Record lifecycle and recording-ownership service |
| Flow 10 | Supplies result assembly/current-result state and accepts Result resume context | Result lifecycle |
| Flow 12 | Supplies authoritative purchase verification, available balance after reservations, separately displayed In processing reservations, credit history, and permanent first-purchase capacity upgrade | Credits/packs/payment |
| Flow 15 | Deletes the account and all account projects under its own confirmation/policy | Account settings/deletion |
| Project/entitlement services | Ownership, source/list/name/title-provenance revisions, inline rename persistence, capacity, canonical resume resolution, logical deletion and slot release | Backend/application services |
| Worker/ledger/storage/CDN | Late-event fencing, billing reconciliation, artifact removal and delivery revocation | Production infrastructure/policy |

## 15. OPEN decisions and evidence gaps

### 15.1 Remaining owner/data-contract details

- **RESOLVED-F11-01 — Project-title derivation and rename validation.** Initial title is the source filename without its extension, truncated to the first 100 visible Unicode grapheme clusters when longer without modifying the source filename. Rename trims leading/trailing whitespace, requires a nonempty result, permits at most 100 grapheme clusters, allows duplicates, autosaves on blur, and adds no unselected character-class rule. Rejection/failure keeps the attempted value editable with a field-associated error while the last persisted title remains authoritative.
- **RESOLVED-F11-01A — Shared Unicode counting/truncation unit.** The 2026-10-23 owner answer selects visible Unicode grapheme clusters for client and service validation, initial-title truncation, and automatic-title truncation after eligible replacement. One emoji or combining sequence counts as one; use `Intl.Segmenter` and do not present code-point counting as an equivalent fallback.
- **RESOLVED-F11-01C — Title after eligible source replacement.** Before first AI launch, successful Flow 06 validation replaces the source in the same project/slot. An authoritative automatically assigned title is regenerated from the new filename using last-extension removal and first-100-grapheme-cluster truncation; an authoritative manually renamed title is preserved. Failed validation changes neither source nor title. Title provenance is stored authoritatively rather than inferred from text equality, and replacement is not authorized after the first AI launch.
- **RESOLVED-F11-01B — Inline Enter/Escape behavior.** Enter saves and finishes editing only after successful persistence; failure retains edit mode, attempted value, and field error. Escape cancels without saving and restores the prior persisted title. Escape-triggered blur cannot save the cancelled value, and Enter plus blur cannot duplicate the save. Ordinary blur autosave remains.
- **RESOLVED-F11-TYPOGRAPHY — Shared weights and line heights.** Use Mabry Pro Regular and Medium only, with no Bold or synthetic Bold. Body/dialog text is Regular 16 px/24 px; captions are Regular 14 px/20 px; buttons use Mabry Pro Medium 14px/20px for task, secondary and navigation actions and Medium 16px/24px for prominent/landing actions; phone buttons use Mabry Pro Medium 16px/24px with retained 48px targets, field labels use Medium 14 px/20 px, and page headings use Medium 32 px/40 px desktop and 24 px/32 px phone. Font assets/loading, fallback and rendered proof remain evidence gaps.
- **RESOLVED-F11-SPACING — Shared spacing scale.** Use 8 px between closely related items, 16 px between fields/buttons, 24 px within a screen block and 32 px between major sections. Existing panels use 24 px desktop / 16 px phone padding. The scale does not introduce a panel or card wrapper; project-rendered row-density conformance and other screen-specific geometry remain separate evidence gaps.
- **RESOLVED-F11-MOTION — Shared motion direction.** Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.
- **RESOLVED-F11-TOKENS — Approved token system.** [design-tokens.md](design-tokens.md) is authoritative for primitive, semantic and component-state roles. Decorative divider and essential control border remain distinct; approved primary/destructive, link/error, selected, disabled and focus mappings replace per-flow shade selection. Static contrast evidence is not rendered accessibility acceptance.
- **OPEN-F11-02 — Production recent-activity evidence.** A successful owned-project open, successful user changes, authoritative background-processing completion, and authoritative result completion count as activity; read-only list/observer refresh does not. The mock uses one monotonic workspace sequence, stable project-ID tie-breaks, and deduplicated event IDs. Production event authority, timestamp/tie semantics, and event-delivery/observer/reload/retry deduplication evidence remain open. Newest-first order remains confirmed; error priority and creation-time-primary order are excluded.

### 15.2 Technical and production evidence

- **OPEN-F11-T01 — Candidate durability and cleanup mechanics.** Prove durable account/media association for cross-device recovery and define replacement and physical cleanup of superseded/discarded media without adding expiry or automatic acceptance.
- **OPEN-F11-T02 — Deletion and retention mechanics.** Define active-storage, intermediate, old-result, backup, cache, CDN, audit, and log retention/erasure behavior without contradicting no-inactivity-expiry for current projects or unaccepted drafts.
- **OPEN-F11-T03 — Pending-processing billing race.** Define reservation/settlement/return and stage-completion ordering when worker completion races project deletion. Deletion must remain non-cancellation and non-refund by itself.
- The canonical revisioned resolver must implement the confirmed New dub / Processing / first-unaccepted-turn Record / Result mapping, distinguish latest attempt outcome from active usable preparation identity, preserve Record routing and the prior draft after a zero-turn retry, record selected-project open activity, and enforce late/stale-event fences. Background completion observers update status without redirecting another current page; explicit Continue opens the project. These are implementation evidence, not open product choices.
- Thumbnail delivery still needs production evidence for scene-frame selection, crop/orientation, access URL lifetime/refresh, failure fallback, and deletion revocation; it does not change the row contract.
- Initial or replacement filename normalization and an empty filename-stem fallback remain technical edge handling. They must not modify the uploaded source filename or silently invent a user-visible Untitled rule. Apply the resolved `Intl.Segmenter` grapheme-cluster rule for first-100 truncation of regenerated automatic titles.
- **OPEN-F11-D01 — Remaining visual evidence and screen-specific details.** Mabry Pro asset availability/browser loading/fallback/rendered proof, rendered row-density conformance and other screen-specific geometry, rendered dialog conformance, final EN/RU sentence-level copy, and rendered focus/forced-colors/accessibility evidence await specification or proof. The approved semantic/component states, focus geometry, motion, 8/16/24/32 px spacing, existing-panel padding, typography, palette roles, controls, gutters, breakpoints, widths, phone header and flat-treatment bans are settled.

## 16. Design skill application and evidence boundary

The author read and applied both requested design sources:

- `.agents/skills/design-taste-frontend/SKILL.md`, including its app-screen routing and the complete `.agents/skills/design-taste-frontend/references/app-screens.md`; and
- `.agents/skills/frontend-design/SKILL.md`.

They informed this specification by treating My projects as a worked-in app list; naming one screen question; keeping the frequent Continue action visible; making actual scene thumbnails and saved progress the product-specific substance; presenting capacity as a truthful limit rather than a KPI card; using a compact semantic list instead of a card grid; applying the approved Mabry Pro Regular/Medium scale and white/light-gray/dark-text palette with Clean dark primary actions and destructive red; applying the approved 768 px breakpoint, 1200 px content maximum, 32/16 px gutters, role-sized desktop controls in design-tokens.md and 48px phone targets controls, component-specific source geometry, 8/16/24/32 px spacing, existing-panel padding, and phone-header composition; using moderate rounding elsewhere without gradients, unmapped decorative shadows, a new panel wrapper, or a wrapper card around every block; defining the exact restrained empty state and honest loading/stale/error states; folding the list for phone without dropping fields; and requiring keyboard, focus, and assistive-state behavior.

No design-skill script was run because random/dealt defaults cannot approve owner decisions and this assignment forbids a build or mockup. No browser, screenshot, responsive, accessibility, service, billing, storage, or product verification was performed. Production activity-event authority, timestamp/tie semantics, and event-delivery/observer/reload/retry deduplication evidence remain open under `OPEN-F11-02`; remaining screen-specific geometry/font-assets/fallback/rendering/dialog/copy details, rendered focus/forced-colors/accessibility evidence, recording lease/stale-write mechanics, deletion/billing races, and physical retention/cleanup remain open where stated. Inline rename with blur autosave, Enter-save-on-success, Escape cancellation/restoration, duplicate-event guards, trim/nonempty/100-grapheme-cluster/duplicate-title validation and attempted-value preservation; first-100-grapheme-cluster initial-title truncation without source-file modification; successful pre-first-AI same-project/same-slot replacement with authoritative automatic/manual title provenance, failure preservation and no post-launch eligibility; standard delete confirmation without typed words; the exact empty state; responsive geometry and phone shell; first-unaccepted-turn resume; single-device recording without takeover; target-turn recovery; explicit locale precedence; available/reserved-credit meaning; no completion email/push; background status updates without cross-page redirect; explicit Continue opening the appropriate current flow; approved shared semantic/component-state, palette, focus, type, spacing and motion treatment; project-name default; qualifying open/user-change/background-completion/result-completion activity events without list-load activity; selected mock activity-sequence/tie/deduplication mechanics; validated-draft retention; cross-device no-expiry candidate recovery; zero-turn behavior; and download-only external distribution with no in-app sharing are resolved requirements.
