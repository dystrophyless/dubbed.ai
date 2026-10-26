# Flow 06 — New dub: upload, section selection, quote, and processing authorization

Date: 2026-10-26 (Asia/Qyzylorda).
Status: synchronized specification draft; owner answers incorporated, technical/design evidence gaps remain OPEN  
Mode: specification only; no frontend implementation, mockup, browser run, or product verification is authorized or claimed

## 1. Authority and scope

This flow follows [the shared frontend contract](00-shared-contract.md), [SPEC-001](../specifications/SPEC-001_dubbed_mvp.md), and [BR-001](../business-requirements/BR-001_custom_video_dubbing.md). The shared contract and later owner answers override older conflicting material.

This document owns the signed-in journey from entering **New dub** through:

- choosing and uploading one original video;
- authoritative media validation and saved-project slot acquisition;
- previewing the validated source;
- selecting the canonical project section, no longer than two minutes;
- receiving an exact, source-bound processing quote;
- resolving insufficient credits or project capacity without losing confirmed context;
- explicitly authorizing processing with one cost-bearing action; and
- handing an accepted processing attempt to Flow 07.

This document does not own:

- authentication or account linking (Flows 02–05);
- processing progress, cancellation after authorization, retry, or reprocessing (Flow 07);
- any Prepare/review/editing stage: the owner removed Flow 08 from the active MVP;
- manual transcript, speaker, timing, missed-line, or bad-segmentation correction;
- background-only audition or quality approval;
- project library and deletion UI (Flow 11);
- credit-pack selection, payment, history, or purchase reconciliation (Flow 12);
- backend media-processing implementation, codec policy, payment-provider behavior, or ledger schema.

## 2. Purpose, entry, and exit

### 2.1 User purpose

The screen answers one question first:

> Which exact part of this video will be processed, and what will that processing cost this account?

The user's primary job is to understand the selected scene and exact cost before authorizing processing. Keep validated preview, editable interval and quote/authorization simultaneously understandable on the same page; balance, retry and capacity facts remain available when relevant. Preserve the recent simultaneous-preview improvement rather than returning to a long separated stack. A new integrated media/timeline control is a proposal to validate, not a requirement approved by this correction.

### 2.2 Entry conditions

The normal entry requires:

- an authenticated account;
- current account entitlement data or a visible loading/error state for it;
- the English or Russian locale selected by the shared shell; and
- no assumption that a project, upload, quote, or processing attempt already exists.

Supported resumptions may enter with an account-owned validated New-dub draft. When insufficient credits sent the user to Flow 12, a confirmed successful purchase automatically returns to the preserved source/selection, refreshes entitlements, and requests a fresh quote. That return does not authorize processing.

Unauthenticated access must hand off to the appropriate authentication flow and must not start a durable upload. Post-authentication return behavior belongs to the authentication specifications.

### 2.3 Successful exit

Success exits to Flow 07 with an authoritative processing attempt that is bound to:

- account and project;
- validated source identity and revision;
- canonical selected-section start, end, duration, and original-source offset mapping;
- pricing-policy revision and quoted credit amount;
- current authorization identity;
- credit reservation state; and
- accepted request identity for duplicate-safe retry.

The UI must not navigate to Processing merely because a client request was sent. It exits only after the service reports an accepted attempt/reservation state that Flow 07 can retrieve authoritatively. Successful completion in Flow 07 with at least one recording turn proceeds directly to Flow 09 Record; no Prepare/review/editing stop exists between them. A zero-turn completion follows the confirmed recovery in §3.6 instead.

## 3. Confirmed product rules

### 3.1 Account and project capacity

- Sign-in precedes upload.
- A free account has two saved-project slots.
- The first successfully verified credit purchase permanently increases capacity to ten slots.
- When all slots are occupied, New dub shows the authoritative current limit and a **Manage projects** action to Flow 11. New upload is unavailable until deletion frees capacity or a verified first purchase increases it.
- For an account that has not yet completed a verified credit purchase, the exhausted-capacity explanation states that the first successful purchase permanently increases the limit from 2 to 10. Checkout initiation or pending confirmation does not increase capacity.
- A slot is occupied only when upload validation succeeds and the authoritative project/source commit succeeds, before processing starts.
- Failed upload validation does not consume a slot.
- Failed processing retains the resumable project and its occupied slot until owner deletion.
- After validation and project/source commit succeed, leaving before processing automatically preserves the account-owned project as a draft in My projects. The draft keeps its occupied slot until explicit project or account deletion; leaving shows no mandatory Save draft/Delete draft prompt.
- The saved draft is recoverable after sign-in on another device and has no inactivity expiry. This is a user-visible persistence boundary, not a storage-implementation choice, and recovery must not be claimed before the source and account association are durably persisted.
- Resuming a validated draft never authorizes or starts processing automatically.
- A full account must let the user choose a project to delete through Flow 11. The product must never delete an existing project automatically.
- Capacity shown in the browser is advisory until the server commits the validated project. After returning from project deletion or verified purchase, New dub refreshes capacity before making upload available. The service still rechecks capacity at validated project creation, so concurrent slot use may return an authoritative capacity conflict.

### 3.2 Source limits and validation

- Accepted target containers are MP4, MOV, and WebM.
- The original upload is at most 10 minutes and 250 MB.
- Filename extension and declared MIME type are not sufficient proof of compatibility.
- Actual content, container, codec/media tracks, duration, and timeline must be inspected authoritatively.
- A source with no audio track fails upload validation with `No audio in this video — choose another file.` It launches no AI preparation, spends no preparation credits and commits no new project slot. Browser playback failure alone is not evidence of a missing audio track.
- Exact codec support, byte-unit interpretation, equality/timebase edge handling, corrupt-media classification, and device compatibility require technical evidence. This flow must not publish a more specific validation promise before that evidence exists.
- Browser playback support and authoritative server inspection/processing support are distinct. When the server supports the source but the browser cannot play it directly, the service prepares a browser-compatible preview for section selection without preparation-credit spend, paid-AI authorization, or a manual external-conversion requirement. The original validated source remains authoritative.
- An invalid source must not become the active project source, must not occupy a slot, and must not receive a quote.

### 3.3 Canonical section

- The selected section must be a positive contiguous interval within the validated source.
- Its minimum duration is 1.0 second inclusive and its maximum is 120.0 seconds inclusive. Neither timeline handles nor **Start**/**End** fields can establish a selected interval below 1.0 second or above 120.0 seconds; the product does not accept an inadmissible range and merely defer rejection to processing authorization.
- Both draggable boundaries and editable **Start**/**End** fields use 0.001-second precision (three decimal places) for the same synchronized source interval. This is not a frame editor and makes no frame-accuracy claim. Quote duration is that whole selected interval at the same precision and receives one `ceil` at one credit per second; boundaries are not rounded or billed separately.
- The original source and the overall source section selected in New dub each require at least 1.000 seconds. These are source-file and source-section eligibility limits only; they do not set a minimum recording turn or microphone take. Usable interrupted partial takes remain governed by Flow 09. Dialogue capture has no manual Stop: it automatically runs to the fixed turn-window end even when the user finishes speaking earlier. Eligible interrupted partial audio can still be accepted under Flow 09.
- It becomes the canonical project and output timeline.
- Original-source offset mapping must be preserved so processing, later recording, and export refer to the same media positions.
- Quote, processing, and later output cover only the selected interval. The product must not imply that the rest of a longer upload will be processed or exported.
- The section selector is always available for every validated source of at least 1.000 seconds.
- For a validated source of at least 1.000 seconds, the default starts at `0.000` and ends at the largest 0.001-second value that does not exceed the source end or `120.000`, whichever cap applies. The source end is always floored to three decimal places: `12.3456` becomes `12.345`, while `12.34` is represented as `12.340`. There is no **To end** exception, so a fractional remainder below one millisecond may be excluded. An original source below 1.000 seconds is rejected during upload validation under AC-F06-02B; exactly 1.000 seconds is eligible.
- The user can change either default before processing; changing the source interval is not a recording-turn editor and does not restore removed manual-correction scope.
- Snapping beyond the approved millisecond grid, transient boundary-entry normalization, internal media alignment and serialization remain engineering decisions; downstream agents must not invent them or silently alter the interval the user authorized. The 0.001-second precision, source-end flooring rule and inclusive 1.0-to-120.0-second duration bounds are resolved. Original-source eligibility is resolved in AC-F06-02B.

### 3.4 Quote and credit rules

- Processing costs `ceil(selectedDurationSeconds)` credits, rounded once for the complete selected interval.
- Examples fixed by the approved contract: 12.4 seconds costs 13 credits; 120 seconds costs 120 credits.
- The cost covers transcription, automatic speaker/timing processing, detected character sounds, and background separation.
- There is no surcharge for speech-only duration, internal worker latency/retries, speaker count, language mix, or overlap complexity.
- Before authorization, show the selected duration, exact credit cost, available balance, included-retry eligibility, and project capacity.
- **Available balance** means credits currently spendable after active reservations. Header balance, quote sufficiency, and insufficient-credit checks use this same value. A reservation is never counted as available or presented as a settled charge; if this flow exposes reserved credits, it labels them separately as **In processing**.
- A quote is authoritative only when bound to the validated source revision, exact selected interval/duration, account, and pricing-policy revision.
- Changing the source or interval makes the displayed quote stale immediately. Processing remains unavailable until a replacement quote is accepted by the service and displayed.
- A server-expired or policy-revised quote requires a visible refresh and renewed authorization. The UI must never substitute a higher price behind the existing authorization.
- The account receives 120 one-time, non-expiring welcome credits when eligible and verified. This flow displays authoritative balance; it does not grant credits.
- Buying credits and authorizing processing are separate actions. Returning from Flow 12 preserves the original validated source and selection, then refreshes entitlements and the quote before authorization.
- The launch button includes the exact current cost, using the localized pattern `Process for {N} credits` / `Обработать за {N} кредитов` with correct locale-specific number and plural handling.
- One deliberate activation of that current-cost button is final authorization to reserve credits and start processing. There is no second cost-confirmation dialog and no consent checkbox.

### 3.5 Reservation and handoff

- Credits are reserved when the user activates the exact-cost processing button.
- The pending reservation is distinct from the final posted processing charge. Authoritative settlement posts the charge and the applicable success/failure/cancellation policy releases any unused reservation.
- Settlement occurs after complete processing is delivered under the project contract; there is no intervening subjective Prepare/background-approval stage.
- System failure releases the reservation; Flow 07 owns how that failure and any cancellation charge are presented.
- The browser does not decide balance, reservation, settlement, processing completion, or purchase success.
- Duplicate clicks, network retries, refreshes, and returned responses must not create more than one reservation or processing attempt for the same accepted authorization.

### 3.6 Direct-to-Record scope boundary

- Flow 07 processing leads directly to Flow 09 Record when processing succeeds with at least one recording turn.
- There is no transcript review, turn editor, speaker/timing editor, missed-line addition, or background-only audition/approval in this MVP.
- If an automatically supplied recording turn is clipped or otherwise poorly segmented, the user records it as supplied or starts a new project under the ordinary credit and slot rules. This flow must not offer repair, targeted reprocessing, refund, skip/original fallback, or manual correction.
- The first successfully accepted saved take permanently locks whole-section reprocessing. Failed capture/save does not set the lock. Flow 07/09 own enforcement and presentation; Flow 06 must not imply that starting the first run creates the lock.
- When processing detects zero recording turns, the project does not enter Record or Result. The processing surface shows `No dialogue found` / `Реплики не найдены` and offers eligible reprocessing under the existing quote/credit/included-retry rules or a return to New dub to choose another video. The already-confirmed charge for a successfully completed zero-turn processing run remains unchanged; this outcome adds no refund or free retry.
- This zero-turn policy applies only when authoritative inspection found an audio track and completed processing found no dialogue. It does not convert a validation-time missing-audio rejection into a charged run, silent-video voiceover mode or manual turn creation.
- If an eligible reprocessing run finds zero turns while an earlier usable preparation has turns, the new run does not replace that preparation or delete its unaccepted draft. Flow 07/09 preserve and expose the prior usable recording state while reporting that the new run found no dialogue. Replacement occurs only after reprocessing yields a usable nonempty turn set. The completed zero-turn run still follows the existing charge and retry-consumption rules.

### 3.7 Durable draft identity and naming

- Derive the project's initial displayed title from the uploaded source filename by removing only its last extension. If the resulting title is longer than 100 visible Unicode grapheme clusters, use its first 100 grapheme clusters under the same client/service `Intl.Segmenter` contract as Flow 11 rename validation.
- Title derivation never renames or modifies the uploaded source file. Filename normalization and a fallback for an empty derived stem remain technical edge handling and must not be invented here.
- The owner can rename the project later through the inline title field in its Flow 11 My projects row; the edit autosaves on blur. New dub does not require a naming step before processing.
- Flow 11 rename allows duplicates, requires a nonempty value after trimming leading/trailing whitespace, and limits the title to 100 visible Unicode grapheme clusters. Initial-title truncation shares that `Intl.Segmenter` rule, but does not silently import rename trimming/normalization or invent an empty-stem fallback.
- Activity caused by creating, validating, or later resuming the project may feed Flow 11's authoritative recent-activity order. This flow does not invent the activity-event definition or tie handling.

## 4. Experience direction and component anatomy

### 4.1 Design intent

This is a working app screen, not a marketing page. Its product-specific material is the user's actual video, selected timeline interval, and exact quote. The validated preview is therefore the main visual object after upload; decoration, stock imagery, abstract gradients, KPI tiles, and an illustrated empty state would obscure the task.

Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed.

Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.  There is no page-entry animation, parallax, decorative or looping attention motion. System reduced-motion disables interface transitions. Video playback and its time-synchronized audio/playhead movement remain functional. Capture, save acknowledgement and navigation never wait for an animation to finish.

Pending/loading states keep the approved page, surface and text roles plus an accessible status; they never fabricate progress, use a decorative loop, or rely on color alone.

Below 768 CSS px the screen uses the mobile shell and a single working column; at 768 CSS px and above it uses regular top navigation and desktop dimensions. Mabry Pro asset availability, browser loading/fallback, forced-colors behavior, rendered conformance and screen-specific geometry not implied by the common spacing roles remain unverified; the approved weights, line heights, shared spacing, semantic component states/focus treatments, tokens and dimensions above are not OPEN.

The screen must keep one primary action at a time and use the actual video/selection/quote hierarchy instead of a row of generic cards. The action that authorizes paid work is visually distinct from navigation to Credits.

### 4.2 Persistent shell region

Required information and controls:

- product identity and compact primary navigation from the shared contract;
- current available credits balance after active reservations, with loading/error handling rather than a guessed value;
- account access;
- current locale; and
- saved/pending status once a durable project exists, without implying cross-device recovery before durable account association completes.

On phone, the header places the logo at left and the available balance plus menu button at right. The menu contains New dub, My projects, Credits, Account, language, and Sign out. Desktop uses the regular top navigation. There is no permanent sidebar at either width.

### 4.3 Empty source state

Required anatomy:

- one clear source-selection action backed by a native file input;
- concise supported-container, maximum-duration, and maximum-size information available before selection;
- current project-capacity information or a visible entitlement-loading/error state;
- an accessible explanation that the file is validated after selection; and
- a capacity-blocked route to Flow 11 when no slot is available.

Drag-and-drop may supplement the native file picker but cannot be the only input path. When capacity is exhausted, disable new file selection/upload, show the current limit, and provide **Manage projects**. Re-enable upload only after a refreshed authoritative capacity value shows space or the verified first-purchase increase.

### 4.4 Uploading and validating state

Required anatomy:

- selected filename and locally available file metadata, clearly distinguished from validated metadata;
- upload progress when the transport can report it;
- separate status language for transfer and authoritative validation;
- a visible Cancel upload action while file transfer remains cancellable before validated project creation;
- a non-destructive way to replace a file before validation begins, where technically safe;
- an explicit failure region associated with the source control; and
- no quote, paid-action enablement, or slot-success claim before validation and project creation commit.

The MVP does not resume partial uploads. Cancellation, navigation/closure before validation, or an interrupted connection returns to an unsaved source state; the user must select the file and upload it again. Never present partial bytes as a durable project or offer byte-range resume. Cancellation-versus-validation races and cleanup of partial server objects remain technical requirements: cancellation must not delete a source/project that already committed successfully. Validated drafts retain the automatic preservation and slot behavior in §3.1.

### 4.5 Validated preview and section state

Required anatomy on the same page:

- the real validated video on a black stage with native-equivalent accessible playback controls;
- when that original cannot play directly in the browser but remains server-supported, truthful server-preview pending, ready, error and retry presentation on the same stage; the compatible preview preserves original identity, duration, orientation and canonical timeline mapping and never presents itself as a replacement source;
- validated duration and source status;
- the default project title derived by removing the source filename's last extension and taking the first 100 visible grapheme clusters only when the derived value is longer, without modifying the source file;
- one synchronized section-selection control representing the complete source and selected contiguous interval through both draggable start/end handles and editable **Start**/**End** time fields;
- selected start, end, and duration exposed consistently as either handles or fields change, with keyboard and touch alternatives and no reliance on dragging alone;
- a clear indication that only the selected interval proceeds to processing/output; and
- a **Replace video** action only before the project's first AI preparation run is launched. It validates a candidate before changing the project, uses the same project and occupied slot, and makes no processing authorization or credit spend. Failed candidate validation preserves the old source and title. Successful validation atomically replaces the source, resets section selection to `[0.000, min(120.000, source end floored to three decimals)]` for the new source, invalidates the old selection/quote, and requires a fresh quote. If the title still has authoritative auto-assigned provenance, derive its replacement from the new filename by removing only the last extension and taking the first 100 visible grapheme clusters when longer; if it was manually renamed, preserve it. Provenance comes from authoritative state, never text equality.

The selection control must support pointer, touch, and keyboard operation. Its handles and **Start**/**End** fields edit one canonical source-bounded interval at 0.001-second precision (three decimal places); this is source-section selection, never turn editing, a frame editor or a Prepare stage, and it makes no frame-accuracy claim. **Start** cannot be below `0.000`; **End** cannot exceed the source end floored to three decimal places; and `End - Start` must remain from 1.0 through 120.0 seconds inclusive. The `120.000` limit applies to selected duration, not the absolute **End**, so a later window such as `[300.000, 420.000]` is admissible in a 600-second source. There is no **To end** exception. An attempted edit cannot silently move the other boundary to make it admissible. Transient invalid-entry behavior, handle styling, keyboard increment, snapping beyond the approved grid, internal media alignment/serialization and preview-loop behavior remain OPEN, but none may silently alter the authorized interval.

### 4.6 Quote and processing-launch region

Required anatomy:

- quote state: not requested, calculating, ready, stale, or failed;
- selected duration;
- exact quoted credits;
- current available spendable balance after active reservations;
- reserved credits only as a separately labelled **In processing** amount if that secondary accounting detail is shown here;
- sufficient/insufficient balance result;
- project capacity and occupied/available status;
- included-retry eligibility information;
- one paid-processing launch action containing the exact current credit cost when all prerequisites are current; and
- when balance is insufficient, a separate route to Flow 12 that does not authorize processing.

The action remains disabled when any required authoritative value is loading, failed, stale, mismatched, or insufficient. Disabled state must say what needs to change; it must not rely on visual dimming alone.

Field/control validation errors, including invalid interval values, sit directly beneath the affected control. Service-level upload, quote, entitlement, and authorization errors sit above the current primary action. Failed requests preserve the selected file reference only while the browser still holds it, the entered interval values, and other recoverable form values for that active lifecycle.

The launch action follows the confirmed localized exact-cost pattern `Process for {N} credits` / `Обработать за {N} кредитов`; number and plural forms must be grammatically correct. Whether a post-charge balance is also shown remains a copy/product detail. No second confirmation dialog or checkbox may be inserted.

### 4.7 Blocking dialogs or notices

Only consequential blockers may interrupt the page:

- insufficient credits: show required amount and available balance, with an action to Flow 12 and a non-purchase return path;
- capacity reached: explain the current limit and route to Flow 11 to choose a project for deletion;
- source replacement before the first AI preparation launch: keep the old validated source and title active while the candidate uploads/validates; on failure preserve both, and on success atomically replace the source within the same project/slot, reset the approved interval default, invalidate the old quote, and update the title only when authoritative provenance still marks it auto-assigned. After the first launch this action is unavailable and cannot bypass retry or permanent first-accepted-take rules;
- quote changed after the user acted: show old versus current amount when available and require activation of the refreshed exact-cost button; and
- authorization conflict: explain whether balance, slot, source revision, or quote changed, then return to the relevant current state.

Do not use a generic error dialog when an inline block can identify and repair the failed region.

## 5. State model and transitions

### 5.1 Canonical client-visible states

| State | User-visible truth | Available next actions |
|---|---|---|
| `entitlements-loading` | Available balance/capacity are unknown. | Wait, retry entitlement load, or leave. |
| `empty` | No source has been selected or durably created and authoritative capacity is available. | Select a file. |
| `capacity-exhausted` | All authoritative project slots are occupied; new upload is unavailable. | Manage projects; if purchase-naive, open Credits after reading that verified first purchase raises the limit from 2 to 10; refresh capacity after return. |
| `local-source-selected` | A browser file is selected but not uploaded/validated. | Start/continue upload, replace, or clear. |
| `uploading` | Bytes are transferring; no slot-success or compatibility claim. | Observe progress or Cancel upload while the transfer remains cancellable. |
| `upload-cancelled-or-interrupted` | No validated project was created and partial transfer cannot resume. | Reselect the file and upload from the beginning, or leave. |
| `validating` | Transfer completed, media and capacity commit are not yet accepted. | Wait; retry only through the service's safe retry path. |
| `source-invalid` | Validation rejected the source; no active quote or occupied slot for it. | Choose another file; inspect actionable reason. |
| `capacity-conflict` | A validated project cannot be committed because no slot is available. | Open Flow 11, then return and retry authoritative commit as allowed. |
| `preview-preparing` | The validated original is server-supported but not directly playable by this browser; a compatible preview is being prepared free of preparation-credit spend. | Wait, leave safely, or return later; no paid AI run starts. |
| `preview-failed` | Compatible preview preparation or delivery failed for the preserved validated source. | Retry/reload the same preview path or leave; do not require external conversion or start processing. |
| `draft-ready` | Validated account-owned source/project exists, is automatically preserved in My projects, and occupies a slot until deletion. Its direct or server-compatible preview is ready for section selection. | Preview and establish section selection, leave safely, resume later, or use **Replace video** before the first AI launch without automatic processing. |
| `replacing-source` | Before first AI launch, a candidate source is uploading/validating while the current source remains authoritative. | Wait or cancel where safe; failure keeps the current source, while success atomically switches within the same project/slot. |
| `selection-valid` | Canonical candidate interval is in source bounds and from 1.0 through 120.0 seconds inclusive at 0.001-second precision. | Request/refresh quote or adjust selection. |
| `quote-loading` | Source-bound quote is requested; prior quote cannot authorize. | Wait or retry quote request. |
| `quote-ready-sufficient` | Exact current quote, balance, capacity, and retry entitlement permit processing. | Activate the one-click exact-cost processing button, adjust selection, or leave. |
| `quote-ready-insufficient` | Quote is current but balance is too low. | Open Flow 12, adjust selection, or leave. |
| `quote-stale` | Source, interval, policy, balance, or quote validity changed. | Refresh/requote; no processing authorization. |
| `authorizing` | One idempotent authorization is in flight. | Wait; repeat interaction must not create a duplicate. |
| `authorization-conflict` | Server rejected changed balance/capacity/source/quote state. | Refresh affected truth and decide again. |
| `attempt-accepted` | Authoritative reservation/processing attempt exists. | Handoff to Flow 07 using the returned attempt identity. |

### 5.2 Main transition sequence

1. Enter signed-in New dub and load available balance, capacity, and retry-entitlement context.
2. If capacity is exhausted, keep new upload unavailable, show the current limit and **Manage projects**, and for a purchase-naive account explain the verified first-purchase increase from 2 to 10. After return, refresh capacity before enabling upload.
3. With available capacity, select one source through the accessible file input.
4. Transfer the source and show transport truth. Cancel may stop a still-cancellable transfer; cancellation, interruption, or leaving before validation requires selecting and uploading the file again from the beginning.
5. Validate actual media and atomically commit the source/project and slot, deriving the initial displayed title by removing only the uploaded filename's last extension and truncating values longer than 100 grapheme clusters to their first 100 under the shared `Intl.Segmenter` rename-counting contract; preserve the uploaded source filename unchanged and recheck capacity authoritatively.
6. If the validated original plays directly, show it. If it is server-supported but cannot play directly in the browser, prepare a browser-compatible preview without preparation credits and show truthful pending/error/retry states until it is usable. Preserve the original source identity, duration, orientation and timeline mapping; require neither external conversion nor paid-AI authorization.
7. Show the playable preview and always-available selector. For an eligible source, default **Start** to `0.000` and **End** to the source end floored to three decimal places, capped at `120.000`; for example, source ends `1.0009`, `12.34`, `12.3456`, `119.9999`, and `120.04` default to `1.000`, `12.340`, `12.345`, `119.999`, and `120.000`. The user may change the range within the same grid and bounds. An original source below 1.000 seconds is rejected before this selection state under AC-F06-02B; exactly 1.000 seconds is eligible.
8. Persist the section against the current source revision.
9. Request a quote bound to that persisted source/selection/pricing revision.
10. Display duration, exact quote, available spendable balance, retry eligibility, and capacity together. Any reserved amount shown is separate and labelled **In processing**.
11. If credits are insufficient, hand off to Flow 12. A confirmed successful purchase automatically returns to the preserved source/selection, refreshes balance, and requests a fresh quote. Cancellation or failure is not presented as success; any deliberate return still reloads current entitlements and quote. Purchase alone never starts processing.
12. With sufficient credits and capacity, show the one-click launch button with the exact current credit cost.
13. One deliberate activation authorizes reservation and processing immediately; send one duplicate-safe request without an additional confirmation dialog or checkbox.
14. On authoritative acceptance, hand off to Flow 07. On conflict, refresh the changed state and require a new decision.

### 5.3 Selection and quote invalidation

- Any committed admissible start/end change invalidates the prior quote immediately. An attempted range below 1.0 second or above 120.0 seconds cannot become the current selection or authorize a quote, through either handles or fields; it cannot silently move the boundary the user did not edit.
- The timeline, fields, persisted selection, processing authorization and output use the same 0.001-second start/end values shown by handles and fields. Cost applies one `ceil` to the whole selected duration at one credit per second, never to the original source duration and never by separately rounding either boundary.
- Before the first AI launch, **Replace video** validates the candidate while the old source stays current. Failure changes neither source nor title. Success atomically reuses the same project/slot, switches source, resets the approved interval default, invalidates selection/quote/authorization eligibility, and updates only an authoritatively auto-assigned title from the new filename; a manually renamed title stays unchanged.
- A quote response for an older source or selection revision must be discarded visibly; it must not overwrite the current state.
- A balance refresh may turn a sufficient quote into an insufficient state without changing the quoted cost.
- A pricing-policy or quote-validity change makes the quote stale and requires requote/re-authorization.
- Navigating to Flow 12 preserves the validated project and selection, not an old authorization.

### 5.4 Concurrent and duplicate actions

- Only one upload/validation commit may become active for a given draft revision.
- Repeated quote requests may coexist, but only the response matching the latest source/selection revision is displayable as current.
- The authorization control becomes pending after activation and carries a stable idempotency identity across safe network retries.
- A browser timeout is an unknown outcome, not proof of failure. The client retrieves the authorization/attempt state before offering a fresh paid action.
- Server conflicts identify the invalidated condition: source, selection, quote, balance, capacity, account/session, or existing attempt.
- Upload cancellation and validation commitment race authoritatively. A confirmed cancellation leaves no project; a confirmed commit produces the normal validated draft and cannot be silently removed by a late cancellation response.

### 5.5 Leave and cross-flow return transitions

- Leaving after successful validation requires no save/delete prompt. The draft remains in My projects, keeps its slot, and can be resumed on another signed-in device without starting processing.
- When cancellation of the initial processing attempt completes in Flow 07, return to New dub with the saved source and selected interval preserved. The user may change the interval; New dub then loads current entitlements, requests a fresh quote, and requires a new deliberate exact-cost authorization.
- When Flow 07 reports zero detected turns, do not route to Record or Result. The user can authorize an eligible reprocessing attempt under current rules or return to New dub and choose another video.
- If that zero-turn outcome came from reprocessing and a prior usable preparation exists, keep its segmentation and unaccepted draft authoritative; the empty replacement never displaces them.
- Once a processing attempt has been accepted, leaving the application does not stop that approved background job. The MVP sends no preparation-completion email or push notification; returning users retrieve authoritative status in the application or My projects.

## 6. Error, cancellation, and recovery matrix

| Situation | Required user-visible result | State/data consequence |
|---|---|---|
| Unsupported declared container | Identify supported target containers and allow reselection. | No project, slot, selection, or quote. |
| File over maximum size | Identify the maximum and allow reselection. Exact byte interpretation remains a technical dependency. | No project, slot, selection, or quote. |
| Source over 10 minutes | Reject the source; selecting only two minutes does not make an over-limit original eligible. | No project, slot, selection, or quote. |
| Original source shorter than 1.000 seconds | Reject during upload validation through the existing content-validation error state and allow reselection; exactly 1.000 seconds is eligible. | No project, capacity/slot mutation, persisted source media, quote, or credit effect. During replacement, preserve the existing project/source/title/section/quote/slot/media/credit state. |
| Authoritative inspection finds no audio track | Show `No audio in this video — choose another file.` and allow reselection. Browser playback failure alone cannot produce this result. | Initial upload commits no project/slot, launches no AI preparation and spends no credits. During eligible replacement, preserve the existing project/source/title/section/quote/slot under failed-validation rules. |
| Corrupt/incompatible actual media | Explain that the content could not be validated, without promising unsupported codec details. | No project, slot, selection, or quote. |
| Browser cannot directly play a server-supported validated source | Prepare a compatible preview and show truthful pending state; require no external conversion. | Original source/project and occupied slot remain authoritative; preview preparation spends no preparation credits and starts no AI run. |
| Compatible-preview preparation or delivery fails | Identify preview failure and offer retry/reload without implying source invalidity or paid-processing failure. | Preserve the validated draft, source identity, title, slot and any source-bound state not invalidated by the failure; no credits or AI launch. |
| Source is unsupported by both authoritative server validation and browser playback | Reject it with actionable reselection guidance and no claim of acceptance. | No project, slot, selection, quote or preview-success claim. |
| Upload transport failure or disconnect | Explain that partial upload cannot resume. Keep the selected local file only while the browser still holds it and offer a fresh upload; after leave/close require reselection. | No slot-success claim before validation commit. Partial-object cleanup is technical. |
| User cancels upload | Stop the still-cancellable transfer and return to unsaved source selection. If validation already committed, reconcile to the validated draft instead of deleting it. | No resume of partial bytes; no project unless authoritative validation/project commit won the race. |
| Validation service unavailable | Distinguish temporary service failure from invalid media and offer retry. | No active quote; no false slot/project success. |
| Capacity already exhausted on entry/refresh | Show the current limit and **Manage projects**; disable new upload. For purchase-naive accounts, explain that verified first purchase raises capacity from 2 to 10. | Re-enable only after authoritative refresh shows capacity; checkout initiation/pending payment changes nothing. |
| Capacity becomes full during validation | Explain the capacity conflict and route to Flow 11. | New project/source commit does not displace an existing project; refresh after deletion/purchase before retry. |
| Preview media cannot load after validation | Keep the durable draft, identify direct or compatible-preview delivery failure, and offer retry/reload. | Do not silently delete the occupied project, require external conversion, spend credits, or quote unseen media. |
| Replacement candidate fails transfer/validation before first AI launch | Explain the candidate failure and keep **Replace video** repair available where eligible. | Existing source, title, section, quote, project and single occupied slot remain unchanged. |
| Replacement candidate validates before first AI launch | Show the new source through the direct/compatible-preview path and reset section to the approved default. | Atomically replace within the same project/slot; invalidate old selection/quote; update title only when authoritative provenance is auto-assigned; do not start or charge processing. |
| Replace video is requested after first AI launch | Do not expose or accept this pre-launch replacement action. | Existing processing/retry and permanent first-accepted-take constraints remain authoritative and cannot be bypassed. |
| Invalid section | Identify an interval outside source bounds, below 1.0 second or above 120.0 seconds under the selected transient-input behavior. | No current quote or authorization. The inclusive bounds, 0.001-second precision and source-end flooring are settled; transient invalid-input presentation remains OPEN. |
| Quote service failure | Keep the source and selection, show quote-specific retry. | No paid action. |
| Quote response is stale | Keep current source/selection and request a matching quote. | Old quote cannot authorize. |
| Insufficient balance | Show quote and current available spendable balance; route to Flow 12. | Confirmed purchase success automatically returns to preserved source/selection with refreshed balance/quote; cancellation/failure is not success, and no return path automatically starts processing. |
| Session expires | Hand off to sign-in without treating the attempt as accepted. | Durable project stays account-owned; post-auth return requires session-flow contract. |
| Authorization times out | Resolve by request/attempt identity before allowing another authorization. | No duplicate reservation. |
| Authorization rejected after a concurrent change | Name the changed prerequisite and refresh it. | User must decide again; no hidden price or deletion. |
| User leaves before validation | Explain on return that an unfinished transfer was not saved; require file reselection and a new upload. | Never claim a saved project or resumable partial transfer unless validation/project commit succeeded before departure. |
| User leaves after validation | Leave without a save/delete prompt; the validated project remains available in My projects. | Account-owned draft and occupied slot persist until explicit project/account deletion; no processing is authorized. |
| Initial processing cancellation completes in Flow 07 | Return to New dub with the saved source and interval, allow interval changes, and show a fresh quote before any new paid action. | No automatic restart or reservation; prior cancellation billing remains owned by Flow 07. |
| Processing completes with zero detected turns | Show `No dialogue found` / `Реплики не найдены` in the processing recovery context and offer eligible reprocessing or another video. | Do not enter Record/Result; successful zero-turn processing charge remains unchanged and creates no extra entitlement. |
| Reprocessing completes with zero turns while a prior usable preparation exists | Report that the new run found no dialogue and keep the prior usable preparation available. | Preserve its segmentation and unaccepted draft; do not replace with an empty turn set. Charge/retry consumption remains unchanged. |

## 7. Desktop, mobile, and keyboard behavior

### 7.1 Shared reading and focus order

The logical order is:

1. screen identity and capacity/balance context;
2. source selection or validated video;
3. section selection and exact interval;
4. quote and consequence;
5. the single current primary action;
6. secondary navigation/recovery actions.

Visual layout must preserve this order and must not place the paid action before its quote in keyboard or screen-reader order.

### 7.2 Desktop

- At 768 CSS px and above, use the regular top navigation, 32px horizontal gutters, and a working-content width capped at 1200px.
- Use the available canvas for the actual video and the selection/quote work; do not build a marketing hero above it.
- Preview, selection, quote, and the exact-cost processing button remain on one page.
- The source stage is the dominant object after validation.
- Quote and authorization remain visible in the same working context as the selected interval; internal column proportions and sticky behavior remain OPEN.
- The repeated one-column-versus-side-arrangement question is withdrawn: neither new desktop arrangement is selected. Preserve the established same-page preview, selector, quote and action contract; any later internal composition must fit it and requires rendered specification/evidence.
- Error messages remain adjacent to the region that failed.

### 7.3 Mobile

- Below 768 CSS px, use a single column with 16px horizontal gutters and standard controls at 48px high.
- Use the signed-in phone header with logo left and available balance plus menu right; the menu contains New dub, My projects, Credits, Account, language, and Sign out. No persistent desktop sidebar appears.
- Stack the working order as video, selection, quote, then action.
- The page itself must not scroll horizontally. Any timeline panning stays inside the selection control.
- Touch operation cannot be the only way to set exact boundaries; provide an accessible non-drag alternative.
- The paid action must not cover the timeline or quote, including when the on-screen keyboard is open.
- Exact sticky action behavior and media/timeline proportions remain OPEN; the shared breakpoint, gutters, single-column structure, header, and standard control height are resolved.

### 7.4 Keyboard and assistive technology

- Native file selection is keyboard accessible; drag-and-drop is optional enhancement only.
- Visible focus follows the logical task order and returns to the repaired region after dialog/screen handoffs where possible.
- Upload, validation, quote, and authorization status changes use restrained live announcements; progress updates must not flood assistive technology.
- Video controls expose play/pause, time, duration, and volume with accessible names.
- Section start, end, and duration are programmatically related. Both boundaries are independently operable without pointer precision.
- Color is never the sole signal for error, insufficiency, selection, loading, or success.
- Loading placeholders preserve layout and do not use shimmer/gradient animation.
- System reduced-motion disables interface transitions without hiding status or focus; video playback and synchronized audio/playhead movement remain functional.
- Error summaries identify the failed field/region and provide a direct retry or repair path.
- Disabled paid actions expose the unmet prerequisite in nearby readable text.

The applicable accessibility conformance target and exact nonstandard touch-target geometry remain unselected. Approved standard control heights and semantic focus roles do not establish complete browser, forced-colors or rendered accessibility verification.

## 8. Visible information and localization contract

### 8.1 Required user-visible information

Both English and Russian locales must cover:

- supported containers and source maximums;
- local selection, upload, validation, and durable-source status;
- upload cancellation, the no-partial-resume consequence, and file-reselection recovery;
- validated source duration;
- selected start, end, and duration;
- the statement that only the selected interval will be processed/output;
- quote calculation/loading/stale/failure status;
- exact quoted credits, available balance, retry eligibility, and project capacity;
- any displayed reserved amount as the separate **In processing** concept rather than spendable balance or settled charge;
- insufficient-credit and capacity consequences;
- exhausted-capacity limit, **Manage projects**, and the purchase-naive 2-to-10 verified-first-purchase explanation;
- whether processing authorization is pending, accepted, conflicted, or unresolved after timeout;
- source/selection preservation when entering and returning from Credits; and
- automatic return after confirmed purchase success, with refreshed balance/quote and no automatic processing;
- automatic draft preservation after validation, occupied-slot consequence, and safe resume without automatic processing;
- the initial project title derived from the source filename's last-extension stem with the confirmed 100-character rule; and
- zero-turn reprocessing preservation of a prior usable preparation; and
- recovery actions for every blocking state.

### 8.2 Copy rules

- Use plain user language rather than worker, codec-pipeline, reservation-table, or revision jargon.
- First use without a saved preference selects Russian for a browser language of `ru`, otherwise English. An explicit manual pre-sign-in language choice overrides and updates a different account preference after sign-in; an automatic browser default does not overwrite it.
- The paid launch action states both effect and exact current cost using the confirmed localized `Process for {N} credits` / `Обработать за {N} кредитов` pattern.
- Field-specific validation errors sit beneath the affected control. Service-level errors sit above the primary action and preserve recoverable form values after failure. Error text says what failed and what the user can do next; it does not apologize or use a generic “Something went wrong” alone.
- Cost is always expressed in credits in this flow. Real USD pack prices belong to Flow 12 and remain unselected.
- Never promise flawless support, flawless segmentation/separation, an exact processing time, or whole-source output beyond the selected interval.
- Do not publish exact final EN/RU strings from this draft. Copy review must verify meaning parity, plural forms, duration/number formatting, and that buttons retain the same action identity across states.

## 9. Logical frontend service contracts

These are logical interfaces behind the centralized service boundary. They do not select transport, endpoint URLs, state-library structure, or backend decomposition.

### 9.1 `AccountEntitlements`

Input:

- authenticated account/session identity.

Result:

- authoritative available spendable balance after active reservations and its revision;
- reserved credits separately when required for display/reconciliation, never folded into available balance or final posted charge;
- project slots used and total;
- whether the first-purchase capacity upgrade is active;
- whether the account is eligible for the still-unrealized first-purchase increase from 2 to 10;
- welcome-credit/retry information needed by this flow; and
- freshness/retrieval status.

Errors distinguish unauthenticated, unavailable, and stale/conflict states.

### 9.2 `SourceUpload`

Commands/queries:

- start upload for one local file and stable client request identity;
- observe transport progress where supported;
- query/reconcile an uncertain upload request;
- request authoritative media validation and atomic project/source commit;
- before the first AI preparation launch, upload/validate a replacement candidate against the expected project/source revision while retaining the current source until atomic success; and
- cancel a still-cancellable transfer before validated project creation.

Cancellation result distinguishes confirmed cancellation with no project from a validation/project commit that won the race. No command promises byte-range resume: after cancellation, leave/close, or interrupted connection before commit, a later attempt starts from a newly selected file. Partial-object cleanup remains an operational dependency.

Accepted result includes:

- project identity and revision;
- initial displayed project title derived by removing only the uploaded filename's last extension and, when longer than 100 grapheme clusters, taking the first 100 using the shared Flow 11 `Intl.Segmenter` semantics;
- the original uploaded source filename/identity unchanged by title derivation;
- source identity and revision/checksum-equivalent identity;
- whether project-title provenance is still auto-assigned or has been manually renamed;
- validated container/media properties;
- authoritatively inspected audio-track presence;
- canonical duration/timebase mapping metadata needed by downstream services;
- slot-occupancy result; and
- durable preview reference or readiness status.

Rejected result includes a stable reason class without exposing unsafe internal details. Authoritative inspection distinguishes a missing audio track from browser playback failure and from a server-supported source that merely needs a compatible preview. Missing audio returns the exact English message `No audio in this video — choose another file.`, commits no initial project/slot and creates no AI attempt/credit operation. A capacity rejection returns current slots used/total and first-purchase-upgrade eligibility so New dub can show the confirmed exhausted-capacity recovery without guessing. Any rejected replacement, including missing audio, leaves the current project, source, title, section, quote and occupied slot unchanged. An accepted eligible replacement reuses the same project and occupied slot, advances the source revision atomically, invalidates prior selection/quote authorization, and returns the approved default interval for the new source. It also returns the resulting title: derive it from the replacement filename only when authoritative provenance was auto-assigned; preserve a manually renamed title. The client never infers provenance by comparing title text.

### 9.2A `PreviewDelivery`

Input:

- project/source identity and expected source revision;
- authoritative source duration, orientation and canonical timeline metadata; and
- browser direct-playback capability for the current environment.

Result:

- a directly playable original reference when supported by the browser, or pending/ready/error status for a server-prepared browser-compatible preview when the original is server-supported but cannot play directly;
- a preview reference bound to the same original source identity/revision and preserving duration, orientation and source-timeline mapping; and
- a retry/reload path that distinguishes temporary preparation/delivery failure from authoritative source invalidity.

Compatible-preview preparation is free of preparation-credit spend, creates no paid AI attempt/reservation, and never authorizes processing automatically. The original supported source remains authoritative. A source unsupported by authoritative server validation and browser playback is rejected rather than presented as accepted. Exact codecs, conversion implementation, preparation timing, operational limits, signed delivery/expiry and recovery mechanics remain production evidence/engineering contracts.

### 9.3 `SectionSelection`

Input:

- project/source identity and expected revision;
- requested start and end on the canonical source timeline;
- both boundaries expressed at the resolved 0.001-second user-visible precision;
- the synchronized handle/field edit source and input revision; and
- stable request identity.

Accepted result includes:

- selection revision;
- normalized start, end, and precise duration;
- the same 0.001-second boundary values used for display, persistence, authorization and source-bound quote identity;
- values returned for both draggable-handle and editable **Start**/**End** field presentation as one synchronized interval;
- original offset mapping; and
- validation result against source bounds and the inclusive 1.0-second minimum / 120.0-second maximum.

The service rejects stale source revisions and does not silently normalize a materially different interval without returning the normalized values for user review.

No accepted selection can be below 1.0 second or above 120.0 seconds. A handle or time-field attempt outside those inclusive bounds cannot commit or silently move the other boundary; the service/UI contract keeps authorization bound only to an admissible persisted interval. The source-end cap is always floored to the greatest three-decimal value within the source, with no **To end** exception. Internal media alignment and serialization may implement the interval but cannot silently change the 0.001-second boundaries the user authorized. Transient-entry presentation/recovery remains under OPEN-F06-T02. Original-source eligibility is settled in AC-F06-02B: reject below 1.000 seconds during upload validation; exactly 1.000 seconds is eligible.

### 9.4 `ProcessingQuote`

Input:

- account, project, source, and selection identities/revisions;
- expected pricing context; and
- stable request identity.

Accepted result includes:

- quote identity and validity/revision information;
- authoritative selected duration used for pricing;
- exact credit amount;
- authoritative available spendable balance after active reservations and sufficiency at quote time;
- reserved amount separately if supplied for display, without treating it as settled spending;
- current project capacity;
- included-retry eligibility; and
- source/selection/pricing identities echoed for client matching.

The client may display an immediate non-authoritative estimate only if it is explicitly superseded by the authoritative quote and can never enable authorization on its own.

### 9.5 `ProcessingAuthorization`

Input:

- quote identity;
- expected source/selection/balance/capacity/pricing revisions;
- evidence of the deliberate activation of the displayed exact-cost processing button; and
- idempotency/request identity.

Accepted result includes:

- processing attempt identity;
- reservation/authorization state and reserved amount;
- project and input revisions;
- next-flow retrieval key; and
- whether the attempt was newly created or reconciled from a duplicate request.

Conflict result identifies the changed prerequisite and never upgrades the cost silently.

Later settlement, release of unused reservation, cancellation charge, and successful zero-turn charge are authoritative ledger transitions owned with Flow 07. New dub must not convert a reservation into a posted charge from client state.

## 10. Persistence boundaries

### 10.1 Browser-only state

- native file handle/value before durable upload;
- transient transport progress and partial-upload state, which is not resumable after cancellation, leave/close, or disconnect;
- uncommitted local control focus/playhead state; and
- presentation state that can be reconstructed safely.

Browser-only state must never be represented as a saved project, occupied slot, authoritative quote, credit reservation, or accepted processing attempt.

### 10.2 Account-authoritative state

- validated project and source revisions;
- occupied slot;
- canonical persisted section and original-offset mapping;
- quote/price binding and validity;
- available-balance, reservation, and capacity revisions;
- authorization/request identity and reservation state; and
- accepted processing attempt handed to Flow 07.

Validated projects and sources in this section are account-owned durable state, recoverable after sign-in on another device, with no inactivity expiry. They remain until explicit project or account deletion. This contract does not choose storage technology, replication, backup disposal, cache cleanup, or source-adapter implementation.

### 10.3 Cross-flow preservation

- Flow 12 receives a return context that identifies the durable project/source/selection, not raw media bytes held only by the browser.
- After a confirmed successful purchase, Flow 12 automatically returns to the preserved source/selection; Flow 06 reloads authoritative entitlements and requests a fresh quote before authorization. Purchase cancellation/failure is not treated as success, and any later deliberate return follows the same refresh rule.
- Flow 11 may delete a chosen project and free a slot; Flow 06 then refreshes capacity and must not assume the current draft survived if that exact project was deleted.
- When capacity was exhausted, Flow 06 keeps upload disabled until that refresh authoritatively reports a free or newly purchased slot.
- Flow 11 displays the preserved validated draft in its most-recent-activity-first order; the shared service owns the exact activity-event and tie semantics.
- Flow 07 receives the accepted attempt identity and owns all subsequent progress/cancel/retry behavior. Successful processing with turns proceeds directly to Flow 09 Record. Completed initial cancellation returns the preserved source/selection to Flow 06 for fresh quote and authorization; zero detected turns stay out of Record/Result and offer eligible reprocessing or another video.
- A zero-turn reprocessing result cannot replace a prior usable preparation or delete its unaccepted draft. The previous state remains authoritative until a nonempty replacement succeeds.
- No cross-flow handoff promises a completion email or push notification. Accepted background jobs remain retrievable through application/project status after the user returns.

## 11. Mock truth and production dependencies

### 11.1 Interchangeable mock boundary

The mock implementation may deterministically simulate:

- valid and invalid source outcomes;
- authoritative missing-audio-track rejection with the exact message and no initial project/slot, AI launch or credit operation; browser-playback failure that does not masquerade as missing audio; and an audio-present completed zero-dialogue fixture that retains the distinct charged zero-turn recovery;
- transfer and validation progress;
- upload cancellation before commit, interrupted transfer with no resume, required reselection after leave/disconnect, and cancellation-versus-validation race reconciliation;
- capacity available/full/conflict, disabled upload at exhaustion, Manage projects return, and the verified first-purchase 2-to-10 transition;
- short and long validated media;

- original-source boundary cases prove that a file shorter than1.000 seconds is rejected before project/source commit, exactly1.000 seconds is eligible, and rejected replacement preserves the project/source/title provenance/selection/quote/slot/media/credit state; this is separate from source-section, generated-turn and microphone-take duration;
- the additive #72 portrait mock fixture (540x960, 35,956.553 ms) has four annotated longer turns and one overlap; preview and preparation mapping require the exact stored source ID/revision, SHA-256 and byte length. This is fixture-specific, not arbitrary-source support. See the [portrait fixture manifest](../../frontend/public/media/portrait-fixture-manifest.json) and [issue 72](https://github.com/dystrophyless/dubbed.ai/issues/72); the native New dub-to-Record-to-Result product journey remains with #63;
- synchronized 0.001-second source-interval editing through draggable start/end handles and editable **Start**/**End** time fields, including pointer, touch and keyboard changes without treating the selector as turn or frame editing or claiming frame accuracy; boundary fixtures below/at/above the inclusive 1.0 and 120.0 limits; source-end flooring fixtures `1.0009 -> 1.000`, `12.34 -> 12.340`, `12.3456 -> 12.345`, `119.9999 -> 119.999`, and `120.04 -> 120.000`; no **To end** exception, established out-of-range interval, silent movement of the other boundary, matching quote/authorization or auto-processing; and one whole-selected-duration `ceil` without per-boundary or original-duration billing;
- browser-direct preview readiness; server-supported/browser-unplayable source with free compatible-preview pending, ready, error and retry states; and rejection when authoritative server validation plus browser playback provide no supported path;
- preservation of original source identity, duration, orientation and section-timeline mapping through the compatible-preview fixture, with no preparation-credit spend, AI authorization or external-conversion action;
- eligible pre-first-launch **Replace video** candidate pending/failure/success in the same project/slot; preservation of the old source/title on failure; atomic source switch, default-section reset and old-quote invalidation on success; auto-assigned-title rederivation versus manually renamed-title preservation using explicit provenance; and rejection after first launch;
- missing-audio replacement validation failure that preserves the existing project/source/title/section/quote/slot and exposes no silent-video voiceover or manual-turn path;
- quote loading/ready/stale/failure;
- available balance after reservations, separately reserved credits, and sufficient/insufficient results;
- purchase-return balance refresh;
- automatic preservation and later resume of a validated draft;
- initial project-title derivation from filenames with one or multiple extensions, exact-100 and longer-than-100 derived titles under visible grapheme-cluster counting (including emoji/combining sequences), and an unchanged source filename;
- authorization acceptance, conflict, timeout reconciliation, and duplicate recovery;
- completed initial-cancellation return with preserved source/selection and a required fresh quote;
- initial zero-turn recovery with no Record/Result transition;
- zero-turn reprocessing that preserves a prior usable preparation and unaccepted draft;
- accepted background processing with no completion email/push notification.

Mock scenarios must use explicit fixed fixture values and source/selection/quote revisions so identity mismatch can be tested. Preview and replacement fixtures must identify themselves as simulated and cannot prove actual conversion, playback compatibility, orientation/timeline preservation or atomic media replacement. A mock “accepted” or “recovered on another device” response proves only UI contract behavior. It does not prove real codec compatibility, durable or cross-device storage, no-expiry retention, ledger correctness, payment success, or worker readiness.

### 11.2 Production dependencies

Production readiness depends on evidence for:

- actual server inspection/processing support and direct browser playback across codecs/tracks within MP4/MOV/WebM on target desktop/mobile browsers;
- authoritative audio-track inspection across representative containers/codecs, distinct from browser playback capability and from dialogue detection during paid processing;
- exact 250 MB, 10-minute, timestamp, and timebase boundaries;
- durable upload, cancellation-versus-commit fencing, and partial-object cleanup; the user-visible no-resume policy is resolved;
- compatible-preview conversion/preparation, timing, operational limits, secure delivery/expiry/retry/recovery, orientation/timeline fidelity, and proof that preview work creates no paid AI reservation/charge;
- atomic same-project/same-slot source replacement before first launch, first-launch eligibility fencing, source/title provenance, and failure preservation;
- atomic slot acquisition with validated project creation;
- canonical source-to-selection timeline mapping;
- server-authoritative quote/reservation/ledger concurrency;
- authoritative available-versus-reserved balance semantics and settlement/release behavior;
- payment return and verified purchase fulfillment through Flow 12;
- idempotent attempt creation and unknown-outcome reconciliation; and
- authoritative rehydration after the resolved session-expiry return and cross-device sign-in contracts.

## 12. Acceptance criteria

### Confirmed and unblocked

- **AC-F06-01 — Entry, locale, and shell truth:** A signed-in user can enter New dub in EN or RU under the shared locale-precedence rule and sees authoritative available-balance/capacity loading, success, or repairable failure without fabricated values. Desktop and phone use the confirmed shared navigation anatomy.
- **AC-F06-02 — Source boundaries:** The UI accepts target selection for MP4/MOV/WebM and prevents authorization for a source rejected by authoritative content validation, an original shorter than 1.000 seconds, over-10-minute duration, or over-250-MB size. The 1.000-second minimum is inclusive; other exact technical boundary semantics remain evidence-dependent and cannot be overstated in copy.
- **AC-F06-02A — Missing audio track:** Authoritative upload validation rejects a source with no audio track using `No audio in this video — choose another file.` Initial upload creates no project/slot, AI launch or credit spend; eligible replacement failure preserves the existing project/source/title/section/quote/slot. Browser playback failure alone cannot trigger this result. An existing audio track with no detected dialogue remains the distinct completed-processing zero-turn outcome with its approved charge/recovery. No silent-video voiceover mode or manual turn creation appears.
- **AC-F06-02B — Minimum original-source duration:** Authoritative upload validation rejects an original source shorter than 1.000 seconds before a new project/source commit or eligible source replacement; exactly 1.000 seconds is eligible. Initial rejection creates no project, capacity/slot mutation or persisted source media and has no quote or credit effect. A rejected replacement preserves the existing project, source, title/provenance, section, quote, occupied slot, media and credit state.
- **AC-F06-03 — Slot lifecycle:** No slot is claimed before successful validation/project commit. A successful commit occupies one slot; a capacity race produces a recoverable conflict and never silently removes another project.
- **AC-F06-03C — Exhausted capacity:** When slots are exhausted, New dub shows the current limit and **Manage projects**, disables new upload until refreshed capacity is available, and for a purchase-naive account explains that verified first purchase raises capacity from 2 to 10. Neither checkout initiation nor pending payment changes capacity.
- **AC-F06-03A — Validated-draft retention:** After validation/project commit succeeds, leaving shows no mandatory save/delete prompt. The account-owned draft remains in My projects, is recoverable after sign-in on another device with no inactivity expiry, and keeps its slot until explicit project/account deletion. Resume does not authorize processing.
- **AC-F06-03B — Default project title:** The initial displayed title removes only the uploaded filename's last extension and, when the derived title exceeds 100 visible Unicode grapheme clusters, uses its first 100 under the same client/service `Intl.Segmenter` contract as Flow 11 rename. The uploaded source file/name is not modified. New dub requires no naming step; later rename uses Flow 11 inline blur autosave. Filename normalization and empty-stem fallback are not invented.
- **AC-F06-03D — Pre-first-launch source replacement:** Before the project's first AI preparation launch, **Replace video** validates a candidate while the current source remains authoritative. Failure changes neither source nor title. Success atomically replaces the source in the same project and occupied slot, resets section selection to the approved new-source default, invalidates the old selection/quote, requires a fresh quote and spends no processing credits or automatic authorization. The title is rederived from the new filename only when authoritative provenance remains auto-assigned; a manually renamed title is preserved. After first launch, this action is unavailable and cannot bypass retry or first-accepted-take locks.
- **AC-F06-04 — Canonical interval:** A persisted in-bounds contiguous source interval from 1.0 through 120.0 seconds inclusive, at 0.001-second precision, becomes the only timeline quoted, authorized, handed to processing and preserved in output, with original-source offset mapping retained. The overall source-section bounds are not a minimum generated-turn or microphone-take duration; usable interrupted partial takes remain governed by Flow 09. Record has no manual Stop and automatically ends capture at the fixed window end; finishing speech earlier does not shorten capture. An original source below 1.000 seconds is rejected before selection under AC-F06-02B; exactly 1.000 seconds is eligible.
- **AC-F06-04A — Confirmed defaults:** The section selector is present for every source that reaches this selection state. It defaults to `[0.000, min(120.000, floor-source-end-to-three-decimals)]`: `1.0009 -> 1.000`, `12.34 -> 12.340`, `12.3456 -> 12.345`, `119.9999 -> 119.999`, and `120.04 -> 120.000`. There is no **To end** exception, so the default may exclude a sub-millisecond trailing remainder; the user can change the range before processing. Sources below 1.000 seconds are rejected before this state under AC-F06-02B; an exactly 1.000-second source is eligible.
- **AC-F06-04B — Free compatible preview:** A server-supported validated source that cannot play directly in the browser receives a browser-compatible preview with truthful pending/error/retry states, no manual external-conversion requirement, no preparation-credit spend and no automatic AI authorization. The original source remains authoritative and its identity, duration, orientation and selection timeline mapping are preserved. A source unsupported by both authoritative server validation and browser playback is rejected rather than shown as accepted.
- **AC-F06-04C — Synchronized interval controls, precision and hard bounds:** The same canonical source interval is editable at 0.001-second precision through both draggable start/end handles and **Start**/**End** time fields. Pointer, touch and keyboard paths remain synchronized and create neither turn/frame editing nor a Prepare stage or frame-accuracy claim. Neither method can set **Start** below `0.000`, set **End** beyond the source end floored to three decimals, establish a selected duration below 1.0 second or above 120.0 seconds, silently move the other boundary to repair an attempted edit, or produce a quote/authorization for an out-of-range interval. The maximum is a duration bound rather than an absolute-end cap: `[300.000, 420.000]` is valid within a 600-second source. Display, persistence, quote identity, authorization and output use the same selected boundaries; internal media alignment/serialization cannot silently alter them. Transient invalid-input presentation remains an evidence/decision gap rather than an invented acceptance rule.
- **AC-F06-05 — Quote calculation:** An authoritative 12.4-second selection is quoted at 13 credits and a 120-second selection at 120 credits, using one `ceil` over the whole selected duration and no complexity surcharge.
- **AC-F06-06 — Quote identity and balance meaning:** The ready quote displays selected duration, exact cost, available spendable balance after active reservations, retry eligibility, and capacity and matches the active source/selection/pricing revisions. Any reserved amount shown is separately labelled **In processing** and is not a settled charge. Changing source or interval blocks authorization until a matching quote is displayed.
- **AC-F06-07 — No hidden increase:** Expiry or pricing revision cannot replace an authorized cost silently. The user sees the new current quote and must authorize it again.
- **AC-F06-08 — Insufficient credits:** Insufficiency does not start processing. Flow 12 can be opened separately; a confirmed successful purchase automatically returns to the preserved durable project/selection, refreshes balance, and requests a fresh quote. Cancellation/failure is not presented as success. Purchase success alone never starts processing.
- **AC-F06-08A — One-click exact-cost authorization:** With a current quote and sufficient balance/capacity, the launch button displays the exact cost using `Process for {N} credits` / `Обработать за {N} кредитов`. One deliberate activation authorizes reservation and processing. No second cost-confirmation dialog or consent checkbox appears.
- **AC-F06-09 — Duplicate safety:** Repeated clicks, network retry, refresh, or timeout reconciliation cannot create duplicate paid reservations/attempts for one accepted authorization.
- **AC-F06-10 — Honest handoff:** Flow 07 is entered only with an authoritative accepted attempt identity; a sent request or client-only success animation is insufficient.
- **AC-F06-11 — Responsive task order:** Desktop and phone keep preview, section, quote, and action on the same page in a coherent reading order, with no page-level horizontal overflow and no paid action obscuring quote/selection. The withdrawn desktop one-column-versus-side-arrangement question selects neither option; acceptance does not infer a new internal arrangement beyond this same-page order and the settled phone stack.
- **AC-F06-12 — Accessible operation:** File selection, direct or compatible-preview playback, synchronized handle/time-field interval definition, error repair, and authorization are operable by keyboard and assistive technology; dragging and color are never the sole mechanisms.
- **AC-F06-13 — Failure preservation:** Upload, validation, preview, quote, entitlement, or authorization failure never fabricates a saved/paid/processing success and preserves every already-authoritative project/source/selection state that the failure does not invalidate.
- **AC-F06-13A — Upload cancellation without resume:** The user can cancel transfer before validated project creation. Cancelled, interrupted, or abandoned pre-validation uploads cannot resume and require file reselection/upload from the beginning after leave/close or disconnect. Race reconciliation preserves a project that committed before cancellation completed.
- **AC-F06-14 — Initial-cancellation return:** After Flow 07 confirms cancellation of an initial processing attempt, New dub restores the saved source/selection, permits a changed interval, requests a fresh quote, and requires another exact-cost authorization without automatically restarting or reserving credits.
- **AC-F06-15 — Zero-turn boundary:** An initial completed processing attempt with zero detected turns does not enter Record or Result. The user sees `No dialogue found` / `Реплики не найдены` and can choose eligible reprocessing or another video; the successful zero-turn processing charge and existing retry rules remain unchanged. If reprocessing finds zero turns while a prior usable preparation exists, that preparation and its unaccepted draft remain available and authoritative.
- **AC-F06-16 — Background status only:** Leaving after an accepted processing handoff does not stop the approved background job. The MVP sends no preparation-completion email or push notification; authoritative application/project status is the recovery source.
- **AC-F06-17 — Shared presentation contract:** Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed. Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.

### Blocked on technical/product evidence

- **AC-F06-B04 — Upload cleanup and commit race:** User-visible cancellation/no-resume behavior is resolved. Production acceptance remains blocked on evidence that partial-object cleanup and cancellation-versus-validation fencing cannot delete an already committed project or expose an unfinished transfer as durable.

## 13. Verification plan — not executed

No check below has been run. This is the required future evidence plan.

### 13.1 Contract and state verification

- Exercise every state and transition in §5 using fixed mock fixtures.
- Assert stale source/selection quote responses cannot become current.
- Assert selection/source changes disable paid authorization until requoted.
- Assert timeout reconciliation retrieves an existing attempt before enabling a new paid command.
- Assert concurrent capacity, balance, and policy changes surface distinct conflicts.
- Assert available balance excludes active reservations everywhere it appears; reserved credits, when shown, are separately labelled and never rendered as a posted charge.
- Assert accepted background processing continues across navigation and exposes no completion-email or push-notification preference/action.

### 13.2 Pricing and identity verification

- Boundary fixtures include positive sub-second duration, 12.0, 12.4, just under/at/over 120 seconds, and a changed selection with the same rounded price but a different identity.
- Verify the displayed authoritative duration and quoted cost come from the same selected revision.
- Verify a source switch cannot reuse a prior source's quote even when durations/costs match.
- Verify every validated source exposes the selector, defaulting to `0.000` through the greatest three-decimal end within the source and `120.000` cap, with no **To end** exception; verify both boundaries remain editable before launch.
- Verify purchase return refreshes balance/quote and does not auto-authorize.
- Verify confirmed purchase success automatically returns to the preserved source/selection, while cancellation/failure is not rendered as success or used to start processing.
- Verify the insufficient-credit calculation uses available spendable balance after reservations rather than posted balance before reservations.
- Verify duplicate authorization uses one reservation/attempt identity.
- Verify the launch button renders the authoritative exact cost in EN/RU and that one activation starts the idempotent authorization without a second dialog or checkbox.

### 13.3 Media and project verification

- Test representative valid and invalid MP4/MOV/WebM files with actual inspection; extension-only renaming must not pass.
- Test a source with no audio track through authoritative inspection and verify the exact English message, no initial project/slot, quote, AI launch or credit operation, and no voiceover/manual-turn path. Repeat as an eligible replacement and prove the existing project/source/title/section/quote/slot remain unchanged. Separately force browser playback failure for a server-supported source and prove it enters compatible-preview recovery rather than missing-audio rejection.
- For a browser-playable/server-supported source, verify direct preview. For a server-supported source the browser cannot play directly, verify free compatible-preview pending, ready, error and retry states; no external-conversion action, preparation-credit operation or automatic AI launch; and preserved original identity, duration, orientation and section-timeline mapping. Reject a fixture unsupported by both server validation and browser playback without a project/slot/quote claim.
- Test the agreed exact size, duration, timestamp, and timebase boundaries once defined.
- Verify slot occupancy occurs atomically with validated project creation and not for rejected media.
- Verify a capacity race neither loses the upload silently nor deletes another project.
- Verify exhausted capacity disables new file selection/upload, shows current used/total capacity and **Manage projects**, explains the 2-to-10 verified-first-purchase increase only when applicable, and remains blocked through checkout initiation/pending confirmation.
- Verify returning after project deletion or verified purchase refreshes capacity before enabling upload, while the commit service still rejects a concurrent race safely.
- Verify Cancel upload before commit returns to unsaved source selection; interrupted transfer has no resume; leave/close or disconnect requires file reselection and a full new upload.
- Verify cancellation-versus-validation races yield either confirmed cancellation with no project or a normal committed validated draft, never deletion of a committed project or a resumable partial project.
- Verify leaving after validation shows no save/delete prompt, keeps the draft and occupied slot, supports cross-device signed-in recovery without expiry, and does not start processing on resume.
- Verify last-extension-only derivation with single- and multiple-dot filenames; derived titles below, exactly at, and above 100 visible grapheme clusters, including emoji and combining sequences. Prove values above the limit use the first 100 grapheme clusters, the uploaded source filename/file identity remains unchanged, no naming step blocks processing, and Flow 11 receives the title for inline blur autosave. Record empty-stem/normalization behavior as unresolved rather than inventing a fallback.
- Before first AI launch, attempt **Replace video** with an invalid candidate and prove source/title/section/quote/project/slot remain unchanged. Then validate an eligible candidate and prove one atomic same-project/same-slot source switch, approved default-section reset, old-quote invalidation, fresh quote requirement, no paid operation/auto-launch, and direct-or-compatible preview behavior. Verify an auto-assigned title rederives from the new filename while a manually renamed title is preserved using authoritative provenance; reject replacement after first launch and prove it cannot bypass retry or first-accepted-take locks.
- Change the canonical interval in 0.001-second steps through each draggable handle, each **Start**/**End** time field, pointer, touch and keyboard. Prove every representation, persisted selection, quote identity, authorization and output remains synchronized and is source-section selection rather than turn/frame editing or a frame-accuracy claim. Exercise exact durations below/at/above 1.0 and 120.0 seconds through both methods: 1.0 through 120.0 inclusive can establish an in-bounds selection, while out-of-range values cannot become current, silently move the unedited boundary, receive a matching quote/authorization or auto-start processing. In a 600-second source, establish `[300.000, 420.000]` and prove the 120-second duration is accepted; reject an end beyond the floored source end and reject a duration above 120 seconds without treating `120.000` as an absolute-end cap. Prove default end flooring with `1.0009 -> 1.000`, `12.34 -> 12.340`, `12.3456 -> 12.345`, `119.9999 -> 119.999`, and `120.04 -> 120.000`, with no **To end** exception and no restoration of the excluded remainder in later stages. Every committed admissible change invalidates the old quote and requires a matching one. For fractional selected durations, prove cost is one `ceil` over the whole selected duration at one credit per second, without separately rounding either boundary or billing the original source duration. Exercise media-alignment/serialization fixtures and prove they do not silently alter the authorized interval. Verify the 1.0-second section minimum does not become a recording-turn/microphone minimum and does not reject otherwise eligible usable interrupted partial audio. Verify dialogue capture has no manual Stop, continues after the user finishes speaking early and automatically ends at the fixed window boundary; actual browser/device interruption recovery and the optional microphone-test Stop remain separate. Record transient invalid-entry behavior. Verify an original source shorter than 1.000 seconds is rejected before project/source commit, exactly 1.000 seconds is eligible, and a rejected replacement preserves the prior project/source state.
- Verify canonical section-to-original offset mapping remains consistent at Flow 07 handoff.
- Verify a completed initial cancellation returns to New dub with the saved source/selection, supports changing the interval, and requires a fresh quote and authorization.
- Verify a zero-turn result shows the confirmed bilingual state, does not enter Record/Result, preserves the unchanged successful-processing charge, and exposes only eligible reprocessing or another-video recovery.
- Verify the zero-turn fixture contains an audio track and reaches the outcome only after completed processing; prove its charge/recovery remains distinct from validation-time missing-audio rejection.
- Verify zero-turn reprocessing preserves a prior usable segmentation and unaccepted draft, while a later usable nonempty replacement can apply through the existing replacement contract.

### 13.4 Interaction and accessibility verification

- Inspect at widths below and at/above 768 CSS px using the approved 16px/32px page gutters, 8/16/24/32px shared spacing roles, 16px/24px existing-panel padding, no new wrapper panels/cards, single-column phone layout, regular desktop navigation, 1200px content maximum, Mabry Pro Regular 16px/24px body/dialogue, Regular 14px/20px captions, role-specific Mabry Pro Medium desktop labels from design-tokens.md, Medium 14px/20px field labels, Medium 32px/40px desktop and 24px/32px phone headings, no Bold/synthetic Bold, semantic token roles, radii, and control heights. Verification must confirm actual font assets, browser loading/fallback, forced-colors behavior and rendered conformance rather than assume them; static token-pair checks are not a rendered accessibility pass.
- On desktop, verify the established same-page preview/section/quote/action contract without treating either withdrawn one-column or side arrangement as approved. Record the actual internal composition as pending rendered evidence rather than an owner-selected layout.
- Complete source, interval, quote, insufficiency return, and authorization paths using keyboard only.
- Check screen-reader names, relationships, live announcements, focus restoration, and error navigation in EN and RU.
- Check touch operation without requiring precision dragging and with the on-screen keyboard open.
- Check field errors beneath their controls, service errors above the primary action, and failed-request preservation of recoverable values.
- Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed. Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.
- Check first-use browser-language selection and explicit pre-sign-in language precedence against a different saved account preference.
- Check long Russian strings, plural forms, credit/duration formatting, and zoom/reflow.

### 13.5 Evidence record

Future evidence must record command/manual procedure, result, environment/browser/device, date, revision or dirty-worktree boundary, fixture/media provenance, and artifact location. Mock evidence and real-service evidence must be reported separately. A green mock run does not establish codec, storage, ledger, payment, or processing readiness.

## 14. Dependencies and cross-flow handoffs

| Dependency | Flow 06 expectation | Owned elsewhere |
|---|---|---|
| Flows 02–05 | Authenticated account and safe return after session/auth work. | Authentication, verification, reset, linking. |
| Shared shell | Compact navigation, locale precedence, available-balance/account access, approved Mabry Pro/palette/geometry, and the 768px responsive shell. | Shared frontend contract/design system. |
| Approved design tokens | Semantic colors, component states, focus treatments, typography, spacing, geometry and motion from `design-tokens.md`. | Shared frontend design system. |
| Flow 07 | Retrieve the accepted attempt; on success with turns proceed directly to Record; after completed initial cancellation return the saved source/selection to New dub; for zero turns show the confirmed recovery without Record/Result; preserve prior usable preparation on zero-turn reprocessing. | Processing, cancellation, reservation settlement/release, retry, background status, and zero-turn lifecycle presentation. |
| Flow 09 | Receive successful processing output directly; no intervening Prepare/editing flow. | Recording and take lifecycle. |
| Flow 11 | Show automatically preserved validated drafts, order projects by most recent activity, let the owner choose deletion, and return after capacity is freed. | Project list, activity ordering, delete confirmation, rename entry point/resume, and the shared 100-grapheme-cluster title-counting contract used by initial truncation. |
| Flow 12 | Preserve return context, sell one-time packs, verify fulfillment, automatically return after confirmed purchase success, and never auto-start processing. | Credits, packs, purchase/history, cancellation/failure presentation. |
| Backend media/project services | Durable upload, authoritative support inspection, direct/compatible preview, canonical timeline, atomic slot/project commit, and eligible same-project/same-slot pre-first-launch replacement with title provenance. | Production backend/infrastructure. |
| Backend quote/ledger services | Quote identity, balance/capacity revisions, reservation, idempotency, reconciliation. | Production backend/commercial infrastructure. |

## 15. OPEN decisions and evidence gaps

### Technical/product evidence still required

- **OPEN-F06-T01A — Partial-object cleanup and commit fencing.** Define and verify server cleanup and cancellation-versus-validation race behavior without deleting a committed project. User-visible cancellation/no-resume behavior is already resolved above.
- **OPEN-F06-T02 — Selection edge mechanics.** Define transient invalid-field behavior, snapping beyond the approved millisecond grid, internal frame/keyframe alignment and serialization mechanics. The synchronized handles plus **Start**/**End** fields, 0.001-second precision, downward source-end flooring to three decimals with no **To end** exception, no-frame-editor/no-frame-accuracy boundary, inclusive 1.0-to-120.0-second establishment bounds, no-silent-other-boundary rule, one whole-selected-duration `ceil`, separation from recording-turn/microphone minimums and prohibition on silently altering the authorized interval are settled by MEDIA-R04. Original-source eligibility is settled by AC-F06-02B.
- **OPEN-F06-T03 — Compatibility matrix, audio inspection and preview pipeline evidence.** Establish actual server inspection/processing and direct-browser-playback codec/audio-track combinations, authoritative audio-track detection, compatible-preview input/output behavior, and exact size/duration boundary mechanics across target browsers/devices. The missing-audio rejection, its distinction from browser playback failure/audio-present zero dialogue, free compatible preview for a server-supported/browser-unplayable source and rejection of unsupported-by-both sources are settled.
- **OPEN-F06-T04 — Quote validity.** Define quote expiry/refresh triggers and policy-revision behavior while preserving the no-hidden-increase rule.
- **OPEN-F06-T05 — Preview delivery and recovery.** Define compatible-preview conversion implementation, preparation timing and operational limits, signed-media access/expiry, refresh, offline/reload behavior, retry/recovery and how a durable draft resumes after preview failure. Free preparation, no external conversion, no paid-AI authorization and preservation of original source identity/duration/orientation/timeline are settled.
- **OPEN-F06-T06 — Content policy.** Upload permission expectations, reporting/removal, and abuse/trial controls remain outside this UI draft and block public-release policy claims.
- **OPEN-F06-D01 — Remaining shared presentation evidence.** Approved semantic colors, component states and focus treatments, Mabry Pro Regular/Medium roles, type sizes and line heights, 8/16/24/32px spacing roles, existing-panel padding, restrained motion direction, standard-control radius/heights, separate gutters, 768px breakpoint, phone header/single column, 1200px maximum and same-page preview/section/quote/action contract are fixed. Mabry Pro asset availability, browser loading/fallback, forced-colors behavior, rendered conformance, screen-specific media/timeline proportions, desktop internal composition, sticky-action behavior, and remaining EN/RU copy still require specification or rendered evidence. The withdrawn one-column-versus-side-arrangement question approves neither option.

## 16. Design skill application and evidence boundary

The author read both requested skill sources in full:

- `.agents/skills/design-taste-frontend/SKILL.md`, including its app-screen routing; and
- `.agents/skills/frontend-design/SKILL.md`.

The author also read the complete app-screen reference at `.agents/skills/design-taste-frontend/references/app-screens.md`.

They informed this specification by treating New dub as a worked-in app screen; making the real video/selection/quote the product-specific substance; naming the screen's one question; keeping the paid job one clear action away; avoiding marketing-hero, card-kit, gradient, decorative-icon, and invented-data defaults; requiring honest loading/empty/error states; and preserving a distinct phone task order and accessible non-drag controls.

No design-skill script was run because script defaults or random deals are not owner decisions and the assignment forbids a mockup/build. No visual, browser, screenshot, responsive, accessibility, or product verification was performed. The approved shared tokens and geometry are specified above; remaining asset, interaction-state, internal-composition, and rendered-evidence gaps stay explicit.

## Cancelled/failed purchase handoff — owner clarification

Known cancelled/failed checkout stays on Credits with a safe reason, deliberate purchase retry and Return to video. That explicit return restores this flow's preserved source/range and refreshes authoritative balance/quote without launching preparation. Only verified purchase success automatically returns here. Unknown/pending payment outcomes reconcile in Credits and do not authorize a duplicate purchase. Planned handoff verification must exercise these distinct destinations and preserve the selected interval across each path.
