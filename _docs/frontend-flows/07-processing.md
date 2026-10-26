# Flow 07 — Preparation processing, cancellation, retry, and reprocessing

Date: 2026-10-26 (Asia/Qyzylorda).
Status: initial frontend flow specification; specifications only; no implementation or verification executed  
Authority: latest owner decisions in this chat, then [`00-shared-contract.md`](00-shared-contract.md), `SPEC-001`, and `BR-001` where they do not conflict. On 2026-10-22 the owner removed the Prepare/review/edit stage from the MVP; that later decision supersedes older Prepare/manual-edit/background-audition wording.

## 1. Purpose and boundary

This flow lets an authenticated project owner understand and control one authoritative preparation attempt from accepted authorization through queueing, processing, validation, cancellation, failure, or activation of a complete usable preparation.

The screen's one question is:

> What is happening to my scene now, what can I safely do, and what will it cost if I stop?

The flow covers:

- initial preparation authorized by New dub;
- the one included retry while it remains eligible;
- later paid whole-section reprocessing while it remains eligible;
- truthful queue, running, validation, cancellation, failure, and completion states;
- server-authoritative reload/resume and uncertain-command reconciliation;
- completed-stage cancellation disclosure;
- safe replacement activation after confirmation bound to the current automatic preparation; and
- preservation of the prior usable preparation during reprocessing until a valid replacement is successfully activated.

This flow does **not** own:

- upload, selected-section selection, the initial preparation quote, or paid authorization interaction (Flow 06);
- any Prepare/review/edit stage, manual transcript/speaker/timing correction, missed-line addition, background audition, or quality-approval gate; these are excluded from the revised MVP;
- the Record workspace, playback of the original as guidance, optional transcript guidance inside Record, or the exact reprocessing entry control owned by the Record flow;
- recording or the first-successfully-saved-take event beyond consuming its authoritative lock state;
- project-list layout or deletion interaction (Flow 11);
- pack prices, checkout, payment verification, or credit-history layout (Flow 12);
- production stage taxonomy, stage allocation, rounding, queue implementation, worker/provider selection, or exact progress measurement;
- public sharing, share links, public viewers, or external publishing; these are withdrawn from the MVP;
- exact routes, Mabry Pro asset availability, browser loading/fallback, forced-colors behavior, rendered conformance, screen-specific geometry not implied by the shared spacing roles, internal composition, or final EN/RU copy beyond the approved shared typography, spacing, motion, semantic states/focus, tokens and geometry; or
- any product code, mockup, dependency installation, issue publication, or Git mutation.

## 2. Confirmed invariants

1. Preparation cost for a normally billed attempt is the authoritative quote for the selected section: `ceil(selectedDurationSeconds)` credits at one credit per second.
2. Authorization reserves the applicable quote. A complete delivered preparation settles before subjective approval. Dissatisfaction is not a system failure or refund condition.
3. A system preparation failure, including failure to produce the required background artifact, is free. It releases the applicable reservation and preserves any prior usable preparation. The revised MVP has no background audition or user quality-approval gate.
4. A successfully delivered zero-dialogue preparation remains a successful charged preparation under the retained billing contract. Initial zero-turn preparation shows **No dialogue found / Реплики не найдены**, offers eligible reprocessing or selection of another video, and does not enter Record or Result. If reprocessing finds zero turns while a prior usable preparation has turns, preserve that preparation and its unaccepted draft instead of activating an empty replacement. Both outcomes grant no extra free retry or refund and consume billing/retry entitlement under the existing successful-run rules.
5. Queued cancellation costs zero. Running cancellation charges only fully completed production stages; elapsed work in an incomplete stage is not charged. The exact production stage allocation and rounding remain OPEN.
6. The cancellation cost is disclosed before confirmation. A cancellation request is not proof that processing stopped or that billing reached a terminal state.
7. Every project has exactly one included retry. Successful replacement or a deliberate user cancellation after that retry starts running consumes it. System failure and queued cancellation preserve it.
8. Later eligible reprocessing uses the normal current quote, grants no new included retry, and follows the same cancellation and system-failure protections.
9. Whole-section reprocessing becomes permanently unavailable after the first successfully accepted take is saved. Failed capture/save does not lock it; deleting takes never unlocks it.
10. The revised MVP contains no user-editable preparation. Successful reprocessing replaces the current automatic preparation only after explicit authorization/confirmation bound to that active preparation identity and only when the replacement has usable nonempty turns. Failure, cancellation, or zero-turn replacement keeps the prior automatic preparation active.
11. A replacement preparation is not active merely because a worker completed. It must be validated and activated against the authorized current preparation and must lose to deletion, supersession, or a newer authoritative attempt.
12. Failed initial preparation keeps the resumable project and occupied project slot until owner deletion. Current projects have no inactivity expiry.
13. Processing and billing truth are account/server owned. Client timers, animations, stale tabs, or mock callbacks cannot declare completion, cancellation, charge, refund, retry consumption, or activation.
14. Successful automatic processing with recordable turns goes directly to Record, through the applicable microphone-readiness flow, only while the user remains on the matching operation/project Processing screen and that lifecycle is still valid. If the user has moved to another section or project, completion updates authoritative project/job status without redirecting the current page; the owner opens the finished project explicitly. There is no intervening transcript review, speaker/timing editor, missed-line tool, background audition, or quality-approval step.
15. Excellent automatic segmentation is the product target, but this specification makes no perfect-accuracy promise. In Record, transcript text is optional guidance and the user may listen to the original. Processing completion is not subjective segmentation approval.
16. After the first accepted take locks reprocessing, a user who dislikes segmentation records the provided clips as-is or starts a new project. The MVP offers no correction, targeted re-slice, or reprocessing unlock. Exact new-project transition UI belongs to the Record/New dub handoff.
17. An unaccepted recorded candidate does not trigger the permanent reprocessing lock and is not automatically accepted by processing. Before eligible reprocessing begins, explicitly warn that a successful usable replacement will replace segmentation and delete that draft, and show the applicable included-retry or paid-cost consequence. Preserve the prior preparation and draft until a usable nonempty replacement activates. System failure, cancellation, activation rejection, or zero-turn reprocessing preserves both. Physical cleanup timing remains technical policy.
18. The main/header balance is authoritative available spendable credits after active reservations. Any reserved amount is separate **In processing** state, not available balance or a final posted charge.
19. Leaving the Processing screen or application does not stop an accepted preparation attempt. Completion while another section/project is current does not steal navigation. The MVP adds no completion email, push notification, or mandatory notification UI; the owner checks authoritative application/My projects status and opens the project explicitly.

## 3. Entry, identity, and exit

### 3.1 Entry from New dub

Flow 06 hands off only after the preparation authorization service accepts the command and returns an authoritative project identity and preparation-attempt identity. A request that was merely sent, a client-side success animation, or an unreconciled timeout is not valid entry.

Required handoff facts are:

- account and project identity;
- source and selected-section identities/revisions;
- preparation attempt identity and attempt classification;
- accepted quote/reservation identity and exact authorized amount when billed;
- available-balance, reservation, and retry facts returned with authorization; and
- enough revision information to reject a stale or mismatched attempt.

Flow 07 does not repeat upload, selection, quote calculation, or paid authorization UI.

### 3.2 Entry for reprocessing

Record keeps **Process again** discoverable as a secondary utility within its coherent workspace; it need not occupy a separate outer row. Before the first durably accepted take it reflects current included-retry or paid eligibility; after that take it remains unavailable with an explanation of the permanent project-level lock. Its accepted handoff supplies:

- project identity;
- active automatic preparation identity/revision;
- authoritative reprocessing eligibility and permanent-lock status;
- attempt classification: included retry or paid reprocessing;
- current quote identity when payment is required; and
- evidence that the user authorized replacing the current automatic preparation on usable success and accepted the shown retry/credit consequence; and
- any unaccepted-draft identity plus evidence that the required warning/confirmation explained its deletion only after a usable nonempty replacement succeeds.

Flow 07 owns the resulting job, progress, cancellation, failure settlement, reconciliation, and activation. It must not infer replacement authorization from navigation alone. No Prepare/review/edit step is inserted around this handoff.

### 3.3 Resume and reload entry

My projects, browser reload, a new tab, or return after authentication may enter by project and/or attempt identity. The client first resolves the current authoritative attempt. It does not replay the original command unless reconciliation establishes that no accepted attempt exists and the relevant upstream flow obtains fresh authorization.

### 3.4 Exit

| Terminal authoritative outcome | Destination/handoff |
|---|---|
| Complete validated initial preparation activated with one or more recordable turns | On the matching active Processing screen, direct handoff through applicable microphone readiness to Record with the active automatic preparation identity; elsewhere, update status without redirect |
| Complete validated reprocessing activated with one or more recordable turns | Atomically replace the prior preparation and delete the warned unaccepted draft when applicable; on the matching active Processing screen hand off through applicable microphone readiness to Record with the replacement identity, otherwise update status without redirect |
| Failed or cancelled reprocessing with prior preparation | Record/project flow can resume the unchanged prior automatic preparation |
| Initial complete validated zero-turn preparation | Show **No dialogue found / Реплики не найдены** and offer eligible reprocessing or another video; do not enter Record or Result |
| Complete zero-turn reprocessing with a prior usable preparation | Report **No dialogue found**, preserve the prior preparation and unaccepted draft, and return to their valid Record/project state without activating an empty replacement |
| Failed initial preparation | Remains a resumable failed project; retry/restart path depends on eligibility and current authorization |
| Cancelled initial preparation | Return to New dub with the durable source video and selected interval preserved; the user may change the interval, obtains a fresh quote, and must deliberately authorize the next run from its exact-cost button |
| Project deleted or access revoked elsewhere | Leave the project workspace and hand off toward Flow 11/authentication as applicable |

Navigation to another screen does not itself cancel an attempt. After the user leaves the matching operation/project Processing screen, completion may update durable job/project state and My projects status but must not redirect the current page. A stale observer callback cannot navigate a different section/project or an invalidated project lifecycle. The user opens the completed project explicitly. This adds no completion email, push notification, or mandatory notification surface.

## 4. Attempt classes and billing outcomes

The UI renders an authoritative `attemptClass`; it never derives the class from displayed balance or local history.

The balance presented in the shell and processing summary is available spendable credit after active reservations. A reserved amount is shown separately as **In processing** only when useful to this state. Reservation, final posted charge, released unused amount, and available balance remain distinct ledger facts.

The optional readonly `PreparationSnapshot.reservationCredits` projection, when present, comes only from `StoredReservation.allocation` after matching account/project/operation identity and safe nonnegative-integer validation. It is the original authorized reservation amount, not a claim about the amount currently held, settled or released; the current lifecycle state stays separate. Missing legacy allocation is unavailable and must not be reconstructed from ledger rows/current balance or converted into new billing policy. See [issue 74](https://github.com/dystrophyless/dubbed.ai/issues/74) for the local mock projection; that receipt is not Root acceptance or production accounting proof.

| Attempt class | Authorization basis | Success | Queued user cancellation | Running user cancellation | System failure |
|---|---|---|---|---|---|
| Initial preparation | Exact normal quote reserved | Full applicable quote settles | No charge; reservation released | Completed-stage-only amount settles; unused reservation returns | Free; reservation released |
| Included retry | One project allowance; no additional preparation-credit fee | Included retry is consumed | No charge; retry remains available | Completed-stage rule is shown; retry is consumed once running cancellation is authoritative | Free; retry remains available |
| Later paid reprocessing | Fresh exact normal quote reserved | Full applicable quote settles; no retry replenishment | No charge; reservation released | Completed-stage-only amount settles; unused reservation returns | Free; reservation released |

For the included retry, production services still return explicit accounting/allowance state. The UI must not invent a nonzero preparation charge or treat a zero-credit attempt as outside the ledger/reconciliation contract.

Project deletion during processing is not a cancellation or refund action. A real successful completion remains chargeable at account level but cannot resurrect the deleted project, activate output, or publish access.

## 5. Authoritative state model

State names below are frontend contract names, not required backend enum spellings.

### 5.1 Attempt states

| State | User-visible truth | Permitted primary behavior |
|---|---|---|
| `resolving` | The client is loading/reconciling authoritative state | Wait; retry resolution if it fails |
| `requested` | Authorization was accepted but queue placement is not yet confirmed | Reconcile; do not show running progress |
| `queued` | Work is authoritatively queued and waiting | Show **Queued**, free-cancellation eligibility, and no elapsed-time-derived stage, percentage, or ETA |
| `running` | At least one production stage is authoritatively running | Always show the authoritative current stage name; show one overall bar plus numeric percentage only when the service supplies a trusted percentage; show no ETA |
| `validating` | Worker output exists but is not yet a complete active preparation | Explain validation; cancellation availability comes from the service |
| `activation_rejected` | Replacement output cannot activate because it is stale, superseded, deleted, or no longer authorized | Preserve the authoritative current preparation and reconcile |
| `cancel_quote_loading` | Current cancellation consequences are being resolved | Prevent duplicate confirm; processing may continue |
| `cancel_confirmation` | An authoritative cancellation quote is displayed | Confirm or keep processing |
| `cancel_requested` | Cancellation command was accepted but terminal outcome is unknown | Reconcile; do not claim stopped or settled |
| `cancelled` | Service confirms cancellation and terminal accounting/allowance outcome | Show exact result and appropriate exit/restart action |
| `failed` | Service confirms attempt failure and terminal accounting/allowance outcome | Explain recovery; preserve prior usable preparation where present |
| `no_dialogue` | A complete validated successful attempt contains no recordable turns | For an initial attempt, show eligible reprocessing/another video and never enter Record/Result. For reprocessing with a prior usable preparation, preserve it and its unaccepted draft; do not activate the empty replacement. |
| `ready` | Complete preparation is validated and activated | On the matching active operation/project screen, hand off through applicable microphone readiness to Record; elsewhere update status without redirect and await explicit project open |

`requested`, `queued`, `running`, and `validating` may outlive the current browser session. Reloading does not restart their visual sequence from zero.

### 5.2 Independent facts

One flat status string is insufficient. At minimum the resolved view keeps these dimensions separate:

- attempt state and revision;
- attempt class;
- active prior preparation identity, if any;
- unaccepted recording-draft identity and warned replacement consequence, if any;
- candidate replacement identity and activation state, if any;
- current stage and completed-stage facts, when production defines them;
- progress measurement and its provenance, if production can provide one;
- quote/reservation/settlement/release state;
- cancellation eligibility and current cancellation-quote identity;
- included-retry availability/consumption state;
- permanent reprocessing-lock state;
- project access/deletion state; and
- actionable error or reconciliation state.

### 5.3 Transition protections

- Repeating an identical accepted operation reconciles the existing attempt; it does not reserve or spend twice.
- Reusing an operation identity with different source, selection, quote, replacement authorization, or revision is a conflict.
- A stage update older than the current attempt revision cannot move progress backward or replace a terminal result.
- `cancel_requested` becomes `cancelled`, `failed`, or `ready` only from authoritative reconciliation. A late completion may race with cancellation; policy and service response decide the terminal outcome.
- A worker callback after project deletion or supersession cannot reactivate project access or a stale preparation.
- A completion observer is bound to the matching attempt/project and current lifecycle. It may reconcile authoritative status from any screen, but it may navigate only while that matching Processing screen is still current; stale callbacks cannot steal navigation from another section or project.
- A complete replacement cannot activate if its authorized source/current-preparation revision is stale or superseded. The prior preparation remains active.
- A replacement with zero recordable turns cannot activate over a prior usable preparation. Only a validated nonempty replacement may delete the warned unaccepted draft and replace the prior segmentation.

## 6. Screen structure and anatomy

### 6.1 Shared workspace

Processing is an interim state in the project workspace under the shared compact top navigation and common project header/status area. There is no permanent sidebar and no Prepare stage. Successful automatic processing hands through applicable microphone readiness to Record only when its matching operation/project Processing screen is still current; a background completion after the user navigates elsewhere updates status without redirect. Result remains downstream of recording.

Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed.

Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.  There is no page-entry animation, parallax, animated decorative recording effect or looping attention motion. System reduced-motion disables interface transitions. Video playback and time-synchronized audio/playhead movement remain functional. Capture, save acknowledgement and navigation never wait for animation completion.

Pending/loading states keep the approved page, surface and text roles plus an accessible status; they never fabricate progress, use a decorative loop, or rely on color alone.

During initial preparation, Record is the pending destination. During reprocessing, the header identifies that the current automatic preparation is retained until a replacement activates. Record and Result availability come from authoritative project readiness, not from a locally completed progress animation.

Exact routing and whether the Processing state has its own URL or a project-workspace substate are OPEN.

### 6.2 Main processing surface

Prioritize the authoritative current stage/progress and what the user can do: understand what is happening, leave safely, or inspect cancellation impact before deciding. Identify the project/attempt concisely. Show the financial/preservation summary when it informs that decision and expose supporting detail accessibly; do not require six accounting/run facts ahead of the progress surface. The service still supplies all independent facts in §5.2, and condensation never conflates quote, original reservation, current held amount, charge, release or retry state.

The progress surface is the screen's largest working block. It is not a hero, illustration, decorative animation, card grid, detailed stage checklist, or fake dashboard. While the service authoritatively reports `queued`, show **Queued**. While it authoritatively reports `running`, show the current authoritative stage name even when no trusted overall percentage exists. When a trusted percentage exists for the current attempt revision, show exactly one overall progress bar, its numeric percentage, and that current stage name. Never fabricate `0%`, an indeterminate percentage, stage advancement, or running state from an elapsed client clock. No ETA, elapsed-time simulation, invented percentage or stage, queue position, cost split, completion time, or production stage allocation may be shown.

### 6.3 Billing and preservation summary

The summary uses plain language and server facts, with concise relevant information and accessible detail instead of requiring every fact as an always-visible line:

- initial/paid attempt: authorized total quote and current reservation/terminal result;
- available spendable balance after reservations, with any reserved amount separately labelled **In processing** rather than shown as posted spending;
- included retry: included status and whether the allowance remains available or is consumed;
- running cancellation entry: a promise to calculate the current cancellation cost before confirmation, not a guessed number;
- reprocessing: the current automatic preparation remains usable until an authorized valid replacement activates; and
- reprocessing with an unaccepted draft: only usable nonempty activation deletes that warned draft; zero-turn, failure, cancellation, or rejected activation preserves it; and
- system failure: no preparation charge and prior usable preparation retained.

Exact credit history and pack purchase UI remain in Flow 12.

## 7. Required screens and alternate states

### 7.1 Resolving/reconciling

Show the stable workspace frame and project identity if already authoritative. Preserve block geometry with flat loading placeholders; no shimmer or gradient. Do not show zero credits, zero progress, a free retry, or a generic first stage as placeholders.

If resolution fails, keep the failed region in place with a concise cause class, last-known timestamp if safe, and Retry. Cached status can appear only when clearly labeled stale and must not enable monetary or destructive actions.

### 7.2 Queued

Render **Queued** only from the authoritative attempt state. Keep the applicable free-cancellation entry and reservation/retry facts visible. Do not promote the attempt to running, invent a stage or percentage, or estimate an ETA from time spent waiting.

State clearly that the attempt is waiting and has not started running. Do not promise an ETA or queue position without an authoritative measured contract.

Cancellation entry states that queued cancellation is free. For an included retry it also states that queued cancellation preserves the retry. The terminal result is shown only after authoritative cancellation confirmation.

### 7.3 Running

Render the authoritative current stage name whenever the attempt is running. If no trusted overall percentage is available, show the stage name without a progress bar or numeric percentage; do not fabricate `0%`, simulated fill, or an indeterminate value presented as measured progress. Once the service supplies a trusted percentage for the current attempt revision, show one overall bar with that numeric value and the same authoritative current stage. Never show an ETA.

The screen shows one overall progress bar with the numeric service-reported percentage and the current service-reported stage name for the current attempt revision. It does not require or default to a detailed stage checklist. Billing truth remains separate: the cancellation service, rather than the visible percentage or stage label, identifies fully completed production stages that may contribute to running-cancellation cost.

The screen does not calculate money from visual progress. Selecting Cancel first requests a cancellation quote. Processing may continue while that quote is fetched and while the dialog is open.

### 7.4 Validating

Explain that processing output is being checked before it can become the active preparation. Do not show Record as ready or settle from a local timer while validation/activation remains incomplete.

Cancellation availability and consequences during validation are returned by the service; this specification does not invent them.

### 7.5 Queued-cancellation confirmation

The dialog/sheet names the project/attempt, states zero cancellation cost, and states the attempt-specific allowance result. Actions are one destructive confirmation and one keep-processing action. Final copy is OPEN.

After confirmation, show `cancel_requested` until the service returns a terminal outcome.

### 7.6 Running-cancellation confirmation

Before confirmation the client requests an authoritative cancellation quote bound to the current attempt revision. The confirmation shows:

- exact credit amount that will settle if confirmed now;
- exact amount released/returned where the service can state it;
- the completed stages included in that amount using production-approved user-facing names;
- that the active incomplete stage is not charged;
- included-retry consumption when this is the included retry; and
- preservation of the prior active preparation for a reprocessing attempt.

Production stage allocation, rounding, names, and quote expiry remain OPEN. No illustrative allocation or stage-price percentage may appear in final fixtures or copy. If additional completed work increases the cancellation charge while this confirmation is open, the service invalidates the displayed quote. The dialog shows the revised amount and consequence and requires fresh explicit confirmation; stale consent cannot authorize the higher charge.

### 7.7 Cancellation pending

Disable duplicate confirmation for the same quote/operation identity and show that the result is being reconciled. The user may leave the page; returning resumes the same reconciliation. Do not claim that workers stopped or credits returned until confirmed.

If the request outcome times out, expose Retry status/reconcile, not Submit cancellation again.

### 7.8 Cancelled

Show the authoritative terminal accounting and allowance outcome. For reprocessing, confirm that the prior preparation remains unchanged. After initial cancellation completes, return to New dub with the saved source video and selected interval preserved. The user may change the interval; New dub requests and displays a fresh exact quote and requires a new deliberate click on its exact-cost processing button. Returning must not automatically authorize, reserve, or start another attempt.

Any restart requires current eligibility and, where applicable, a fresh exact quote and new authorization. A cancelled attempt is not silently restarted.

### 7.9 System failure

State what failed at a user-actionable level and what remained safe. Confirm only authoritative facts:

- preparation was not activated;
- the applicable preparation reservation was released/no preparation charge was taken;
- the included retry remains available when applicable; and
- the prior usable automatic preparation remains active for reprocessing.

Initial failure retains the project/slot and valid source/selection. A retry action reconciles eligibility and current quote before starting new billable work. It must not blindly clone the failed attempt.

### 7.10 Activation rejection

If reprocessing output completes after the authorized current preparation was superseded, the project was deleted, or a newer attempt became authoritative, do not replace anything. State that this processing result could not be applied and that the authoritative current preparation remains safe where the project is still accessible. The billing treatment of complete but non-activatable output must be defined by the production contract before release; the UI cannot choose it.

### 7.11 Ready

Only a complete validated and successfully activated preparation with one or more recordable turns enters `ready`. If the user remains on the matching operation/project Processing screen and its lifecycle is valid, present a restrained completion status and hand off through applicable microphone readiness to Record. If another section/project is current, update authoritative project/job status without redirecting; the user opens the project explicitly. Observer callbacks must recheck the current screen, project, attempt, and lifecycle before navigation, so a stale callback cannot steal navigation.Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.  No completion email, push notification, or mandatory new notification UI is introduced.

An initial complete validated successful attempt with zero recordable turns enters `no_dialogue`, keeps the confirmed successful charge unchanged, and shows **No dialogue found / Реплики не найдены**. Offer reprocessing only when current retry/quote/credit and permanent-lock rules allow it, or offer another video through New dub. Do not create a recording turn, enter Record, enter Result, offer manual addition/correction, or assemble a speechless downloadable result.

If a reprocessing attempt completes successfully with zero recordable turns while a prior usable preparation exists, keep the successful charge and retry-consumption outcome unchanged but do not activate the empty candidate. Preserve the prior preparation and any unaccepted draft, report **No dialogue found**, and return to the still-valid Record/project state.

## 8. Failure and recovery matrix

| Condition | Required UI behavior | Protected truth |
|---|---|---|
| Attempt lookup unavailable | Keep project context if authoritative, show Retry | No fabricated job state |
| Lost connection during queued/running | Mark live data unavailable/stale and reconcile | Job may continue server-side |
| Worker/system failure | Show free failure outcome after ledger reconciliation | Reservation released; prior preparation retained |
| Required background absent/unusable | Treat as system preparation failure | No activation and no preparation charge |
| Invalid/incomplete worker output | Do not activate or route to Record | Prior revision remains active |
| Cancellation quote fetch fails | Keep processing state and allow quote retry | No cancellation without disclosed cost |
| Cancellation charge increases while confirmation is open | Invalidate the shown quote/consent, show the revised amount, and require fresh explicit confirmation | Stale consent cannot authorize a higher charge |
| Cancellation command timeout | Reconcile by stable identity | No blind duplicate cancellation |
| Completion races cancellation | Render only authoritative terminal outcome and accounting | No double settle/release |
| Stale/superseded activation | Preserve the authoritative current preparation and reconcile | No stale automatic preparation activation |
| Reprocessing lock appears concurrently | Stop reprocessing initiation/retry and explain lock | First saved take guard wins |
| Session expires | Reauthenticate, then reconcile same attempt if still authorized | No owner data exposed while signed out |
| Project deleted/revoked elsewhere | Clear inaccessible project media/data and leave workspace | Late job cannot resurrect access |
| Balance/ledger state uncertain | Show reconciliation state; do not display guessed balance | One terminal accounting result |
| Reprocessing returns zero turns while prior preparation is usable | Report no dialogue and retain the prior preparation and unaccepted draft | Empty replacement cannot erase usable work |
| Owner leaves the matching Processing screen or application after an attempt is accepted | Continue server-owned processing; update authoritative project/job status without redirecting another section/project; show current status on return/My projects; add no completion email, push, or mandatory notification UI | Navigation does not cancel accepted work, and completion cannot steal current navigation |

## 9. Reload, navigation, and persistence

- The attempt, its stage history, billing state, allowance state, cancellation operations, outputs, and activation result are durable server-owned facts.
- Client state may cache display data but cannot be the only record of progress or a user command.
- Reload, duplicate tab, or device change queries current state using stable identity and expected revision.
- Leaving the page does not pause or cancel processing.
- Completion auto-handoff is scoped to the still-current matching attempt/project Processing screen and valid lifecycle. After navigation to another section/project, completion updates authoritative status only; it cannot redirect the active page, and the owner opens the finished project explicitly.
- When returning to a terminal attempt, the UI shows the terminal result rather than replaying progress animation.
- A cancelled initial attempt returns to New dub using the durable account-owned project/source/selection. The validated uploaded project remains an automatically saved My projects draft while it exists; changing or leaving this surface does not discard it or authorize another attempt.
- Any unaccepted recording candidate remains an account-owned cross-device draft under the shared no-expiry rule and is never auto-accepted by processing. Before an eligible reprocessing attempt starts, the UI warns that a successful usable replacement will replace segmentation and delete the draft, and discloses the applicable retry/cost consequence. The draft remains recoverable until a nonempty replacement activates; failure, cancellation, activation rejection, or zero-turn reprocessing preserves it.
- A previously active preparation remains authoritative during replacement processing, failure, cancellation, or activation rejection.
- Client-side completion animations, optimistic balance changes, and mock timers never write terminal truth.
- Exact polling or in-app subscription, offline cache, and signed-media refresh mechanisms are architecture decisions, not frontend component choices. The MVP has no completion email or push notification.

## 10. Desktop, tablet, and phone behavior

### 10.1 Desktop

- At 768 CSS px and above, use the project workspace canvas with regular compact top navigation, 32px page gutters, a maximum 1200px working-content width, and no sidebar.
- Keep current status, progress/stages, billing consequence, and available action visible in the first viewport at a normal desktop height.
- Use flat white/light-gray surfaces and quiet separation. No gradients, glows, decorative illustrations, colored icon tiles, or repeated KPI cards.
- The cancel control is visually secondary until invoked; its confirmation clearly carries destructive consequence.

### 10.2 Tablet

- At 768 CSS px and above, preserve the regular top-navigation contract, 32px gutters, the same reading order, and the complete billing/cancellation explanation.
- Stack blocks before either becomes too narrow; do not compress progress labels, amounts, or dialog copy into ambiguous columns.
- No sidebar is introduced for this flow. Internal column choice and exact stack thresholds within the shared 1200px maximum remain design details that require rendered evidence.

### 10.3 Phone

- Below 768 CSS px, use one content column with 16px page gutters in this order: project/status, progress/stages, billing/retry, preservation note, action.
- The phone header shows logo on the left and available balance plus menu on the right. The menu provides New dub, My projects, Credits, Account, language, and Sign out. No persistent rail/sidebar is used.
- Standard controls are 48px high on phone and role-sized on desktop according to design-tokens.md; standard corners use the shared component-specific source geometry.
- Cancellation opens an accessible modal dialog or bottom sheet whose complete cost and consequence text precedes confirmation in focus and reading order.
- Touch and keyboard access cannot depend on stage graphics, swiping, or precise pointer gestures.
- A sticky action, if later selected, must not cover progress, cost, error, focus, or the on-screen keyboard. Exact sticky behavior and geometry are OPEN.
- No page-level horizontal scrolling; long Russian copy and large credit amounts wrap without hiding the action or its context.

## 11. Accessibility and motion

- The screen has one programmatic title and an exposed current attempt status.
- Progress uses native or equivalent semantics only when a meaningful authoritative value exists. Authoritative queued state shows **Queued**. Running without a trusted overall percentage shows the authoritative current stage as text with no progress bar, numeric percentage, or ETA. Running with a trusted percentage shows one overall bar, its numeric percentage, and the current stage. Percentage semantics, weighting, update frequency, revision ordering, and production evidence remain **OPEN-F07-T02**; the UI must not present a fabricated `0%`, simulated advance, invented stage, or time estimate.
- Stage state is conveyed by text and structure, never color alone.
- Live announcements are restrained: announce state transitions, cancellation-quote readiness, terminal outcomes, and blocking errors; do not announce every progress tick.
- The cancellation dialog/sheet has a programmatic title and description, moves focus inside, contains focus while modal, and restores focus to the invoking control when dismissed.
- Field-specific errors appear beneath the affected field/control. Service errors appear above the primary action. Both identify the affected region, expose a direct recovery action where one exists, and preserve entered or recoverable values.
- Focus remains visible across loading, stage changes, and dialogs. A status refresh does not steal focus.
- System reduced-motion disables interface transitions. Progress truth and completion remain visible without animation; video playback and time-synchronized audio/playhead movement remain functional.
- Capture, save acknowledgement and navigation never wait for an animation to complete.
- Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed.

## 12. Visible copy and localization

English and Russian are required. Copy uses sentence case, active verbs, and user terms such as preparation, scene, current stage, completed stage, credits, retry, and current preparation. It does not expose queue names, worker/provider names, reservation tables, callback terms, or internal revision IDs.

On first use, browser locale selects Russian only when it is Russian; all other browser locales default to English. An explicit pre-sign-in language choice overrides that default and, after sign-in, updates a different stored account preference. A browser-derived default alone does not overwrite an existing account preference. Field-specific errors sit below the relevant field/control, service errors sit above the primary action, and localization or service failure preserves entered/recoverable values.

The following is working copy for contract clarity, not approved final copy:

| Purpose | English proposal | Russian proposal |
|---|---|---|
| Initial queued title | Preparing your scene | Подготавливаем вашу сцену |
| Reprocessing title | Reprocessing your scene | Обрабатываем сцену заново |
| Queued status | Waiting to start | Ожидает запуска |
| Validating status | Checking the preparation | Проверяем подготовку |
| Queued cancel fact | Cancel now for 0 credits. | Сейчас отмена стоит 0 кредитов. |
| Running cancel entry | Check cancellation cost | Узнать стоимость отмены |
| Keep action | Keep processing | Продолжить обработку |
| Confirm cancel action | Cancel processing | Отменить обработку |
| Prior-preservation note | Your current preparation stays available until the replacement succeeds. | Текущая подготовка останется доступной, пока повторная обработка не завершится успешно. |
| System failure | Preparation failed. You were not charged. | Подготовка не удалась. Кредиты не списаны. |
| Retry preserved | Your included retry is still available. | Ваша включённая повторная попытка по-прежнему доступна. |
| Stale replacement | This processing result couldn't be applied. Your current preparation is still safe. | Этот результат обработки не удалось применить. Текущая подготовка сохранена. |
| Zero turns | No dialogue found | Реплики не найдены |
| Another-video action | Choose another video | Выбрать другое видео |

Final wording, plural rules, terminology, line breaks, and action labels remain OPEN. Localization verification must include long Russian strings, credit plurals, large amounts, stage names, and assistive announcements. Locale formatting must not change canonical durations, credit arithmetic, attempt identity, or stage completion.

## 13. Logical frontend service boundary

All operations go through the centralized services facade with interchangeable mock and production adapters. React components and Zustand actions do not call backend endpoints directly and do not reproduce billing or lifecycle rules.

### 13.1 Resolve attempt

Input:

- authenticated account/session;
- project identity and optional attempt identity;
- optional last-known attempt revision for efficient reconciliation.

Result:

- authoritative attempt identity, class, state, and revision;
- project/source/selection identities needed for safe context;
- active prior preparation and candidate replacement/activation facts;
- current and completed stage data only from the approved production taxonomy;
- optional trusted authoritative overall percentage with its attempt revision/provenance; absence is explicit and never synthesized from elapsed time;
- quote/reservation/settlement/release facts and exact amounts;
- available spendable balance after reservations and any separately identified **In processing** reserved amount;
- included-retry state and permanent-lock state;
- unaccepted-draft identity/state, when present, and whether the required replacement/deletion warning has been acknowledged for the current authorization;
- cancellation eligibility and any pending cancellation operation;
- last authoritative update time; and
- structured recovery/next-action reason.

### 13.2 Observe attempt

Input: attempt identity and last accepted revision/event cursor.

Result: ordered authoritative updates or instruction to perform a full resolve, including authoritative queued/running state, current stage name while running, and an optional trusted overall percentage. Transport may be polling, subscription, or another selected mechanism. Delivery order or reconnect cannot make an older event current. Consumers bind observation to project/attempt identity and may update durable status from a background completion, but may request Record navigation only after confirming that the matching operation/project Processing screen and valid lifecycle are still current. An observer callback from a prior screen, project, attempt, or lifecycle is status-only and cannot navigate. The observer never derives queued/running state, percentage, or ETA from a client clock.

### 13.3 Request cancellation quote

Input:

- attempt identity and expected attempt revision;
- stable request identity.

Result:

- cancellation allowed/not allowed;
- cancellation-quote identity and expiry/revision binding;
- exact charge, release/return amount where defined, and included-retry consequence;
- completed stages included using approved user-facing stage identities; and
- structured stale/terminal/conflict response, including a revised authoritative quote when newly completed work increases the charge.

The frontend cannot derive this result from progress pixels, elapsed time, or cached stage rows.

### 13.4 Confirm cancellation

Input:

- attempt identity and expected revision;
- cancellation-quote identity;
- stable cancellation operation identity; and
- explicit user confirmation.

Result:

- accepted/pending, terminal cancelled, already terminal, stale quote, conflict, unavailable project, or unknown outcome requiring reconciliation.

Success returns authoritative terminal accounting and retry-allowance facts. A transport success alone does not mean cancellation succeeded. If the quote is stale because the charge increased, confirmation is rejected, the revised amount is shown, and the user must explicitly confirm that new quote. The service must never settle the higher amount from the stale quote identity or consent.

### 13.5 Activate preparation

Input is owned by the processing/application service and includes attempt/candidate identity, validated artifacts, authorized current automatic-preparation revision, and idempotent activation identity.

Result is either:

- one active complete nonempty preparation revision with recordable-turn count, reset outcome, terminal accounting, and authoritative deletion outcome for any warned unaccepted draft;
- an initial complete validated successful zero-turn outcome with terminal accounting and current reprocessing eligibility, but no Record/Result handoff;
- a complete validated successful zero-turn reprocessing outcome with terminal accounting, unchanged billing/retry consumption, and explicit preservation of the prior usable preparation and unaccepted draft; or
- no activation, with the prior preparation preserved and an explicit validation, authorization/revision, deletion, supersession, or system-failure reason.

The browser renders this result but does not decide activation, merge preparation revisions, or delete a draft. Draft deletion occurs only as part of the authoritative activation of a usable nonempty replacement after the required warning/authorization boundary.

## 14. Mock truth and production dependencies

### 14.1 Interchangeable mock scenarios

The mock may deterministically simulate:

- requested, queued, running, validating, ready, cancelled, and failed attempts;
- authoritative queued state rendered as **Queued**; authoritative running with a current stage but no trusted percentage; and running with exactly one service-reported overall bar, numeric percentage, and current stage;
- absence checks for fabricated `0%`, simulated/indeterminate fill presented as measured progress, client-clock state promotion, detailed stage checklist, and ETA;
- initial, included-retry, and paid-reprocessing classes;
- queued free cancellation with reservation/allowance preservation;
- running cancellation with fixed fixture stages and accounting explicitly labeled mock data;
- a stale cancellation quote and a cancellation/completion race;
- an increased cancellation quote that invalidates prior consent and requires reconfirmation;
- system failure with release and prior-preparation preservation;
- initial successful charged zero-turn completion with eligible reprocessing and another-video paths and no Record/Result handoff;
- successful charged zero-turn reprocessing that consumes billing/retry entitlement as a success while preserving the prior usable preparation and unaccepted draft;
- cancelled initial processing returning to the saved video/interval, permitting interval change, requiring a fresh quote and exact-cost authorization, and never auto-starting;
- reprocessing success, failure, cancellation, permanent-lock conflict, stale/superseded activation, a visible eligible **Process again** state, and the disabled permanent-lock state;
- reprocessing with an unaccepted draft, including warning/cost acknowledgement, preservation until usable nonempty activation, deletion on that activation only, and preservation on failure/cancellation/zero-turn/rejected activation;
- available balance after reservations, a separate **In processing** reserved amount, settlement, and release;
- accepted work continuing after navigation, with completion updating authoritative status but leaving a different current section/project unchanged; matching-screen completion may hand through microphone readiness to Record, stale callbacks cannot navigate, and no completion email, push notification, or mandatory notification UI is added;
- reload into every state, out-of-order updates, duplicate commands, and unknown timeout reconciliation;
- deleted/revoked project and expired session; and
- long EN/RU stage/error/cost strings, locale-precedence fixtures, field-error placement, and service-error placement; and
- shared visual fixtures at below 768px and at/above 768px using the approved palette, Mabry Pro, heading/body/caption sizes, gutters, control heights, radius, maximum width, and phone header/menu contents.

Mock fixtures must use stable identities and arithmetic that reconciles. A mock pass proves only frontend state/interaction behavior. It does not prove worker execution, media validity, duration, stage allocation, billing correctness, persistence, queue behavior, or production cancellation.

### 14.2 Production dependencies and OPEN evidence

Production acceptance depends on:

- a measured, owner-approved stage taxonomy, stage cost allocation, integer rounding, and user-facing stage names;
- defined service semantics/weighting/update behavior and production evidence for the optional trusted overall percentage; the queued, running-without-percentage, running-with-percentage, and no-ETA presentation contract is already resolved;
- cancellation quote expiry and quote/completion race rules;
- idempotent reservation, settlement, release/return, and included-retry consumption;
- durable ordered job state and recovery after worker/client interruption;
- validated completeness rules for automatic segmentation, optional guidance transcript, timing, nonverbal turns, and required background artifact;
- revision-bound activation that cannot apply a stale or superseded preparation;
- authoritative reprocessing lock enforcement against recording races;
- project deletion fencing and account-level reconciliation;
- observability that excludes private media, transcripts, credentials, and signed URLs; and
- actual browser/device accessibility, localization, responsive, typography-rendering and motion evidence using the approved shared tokens, weights, line heights, spacing roles, transition limit and breakpoint, plus selected remaining focus, internal composition, asset/loading/fallback and final-copy decisions.

## 15. Acceptance criteria

### 15.1 Confirmed and unblocked

- **AC-F07-01 — Authoritative identity:** Flow 07 opens only for an accepted attempt identity, resolves current server state on entry/reload, and never creates duplicate work from a timeout, refresh, or repeated click.
- **AC-F07-02 — Honest lifecycle:** Requested, queued, running, validating, cancellation-pending, failed, cancelled, activation-rejected, no-dialogue, and ready states are distinguishable without a client timer declaring terminal truth.
- **AC-F07-03 — Queued cancellation:** Authoritative queued cancellation costs zero, releases any reservation, and preserves the included retry when applicable; the UI waits for a terminal result before claiming cancellation.
- **AC-F07-04 — Running cancellation disclosure:** Before confirming running cancellation, the UI displays the exact authoritative completed-stage charge and retry consequence and never derives cost from elapsed time or visual progress.
- **AC-F07-05 — Failure protection:** System/required-background failure activates no preparation, charges no preparation credits, preserves the included retry when applicable, and retains the prior usable automatic preparation during reprocessing.
- **AC-F07-06 — Retry contract:** Exactly one included retry exists per project; success or authoritative running user cancellation consumes it, while queued cancellation and system failure preserve it. Later runs use a fresh normal quote and never replenish it.
- **AC-F07-07 — Permanent lock:** Record exposes a visible **Process again** action. Before the first successfully accepted saved take it reflects current eligibility/cost; afterward it is disabled with a permanent project-level lock explanation. Failed capture/save and an unaccepted recoverable draft do not lock it, deleting takes does not unlock it, concurrent commands cannot bypass the guard, and processing never auto-accepts that draft.
- **AC-F07-08 — Safe activation:** Reprocessing keeps the prior automatic preparation active until a complete nonempty replacement validates and activates against revision-bound explicit authorization. Failure, cancellation, zero-turn replacement, stale authorization, deletion, or supersession cannot silently replace it; only that usable activation may delete the warned unaccepted draft.
- **AC-F07-09 — Reload and stale updates:** Reload/new tab/device resume the authoritative attempt and terminal result. Older/out-of-order updates cannot move state backward, replace a terminal result, or reactivate a stale preparation.
- **AC-F07-10 — No invented progress:** The UI shows only authoritative state, stage, and trusted progress data. `queued` renders **Queued**; running without a trusted percentage renders the authoritative current stage name without a bar or number; trusted percentage renders exactly one overall bar, numeric percentage, and current stage. No client clock invents running state, stage, percentage, ETA, queue position, production cost allocation, or illustrative stage price.
- **AC-F07-11 — Responsive, visual, motion, and accessible control:** Every supported size preserves status, real progress, billing/retry consequences, preservation notes and action order; keyboard/assistive operation and restrained live announcements remain required. Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed. Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.
- **AC-F07-12 — Bilingual truth:** EN/RU views communicate equivalent state, cancellation cost, retry consequence, failure protection, and preservation behavior without changing canonical values or hiding actions. Browser Russian selects RU on first use, all other browser locales select EN, an explicit pre-sign-in choice overrides and updates a different account preference, and a browser-derived default alone does not overwrite it. Field errors appear below their control, service errors above the primary action, and recoverable values survive either error.
- **AC-F07-13 — Mock boundary:** Deterministic mock states remain visibly fixture-backed in evidence and cannot be cited as proof of production processing, billing, persistence, or media behavior.
- **AC-F07-14 — Direct-to-Record MVP:** A successful preparation with recordable turns enters Record through applicable microphone readiness when the matching operation/project Processing screen and lifecycle remain current. If the user has moved to another section/project, completion updates authoritative status without redirect and the user opens the finished project explicitly. Flow 07 exposes no Prepare/review/edit/background-audition/quality-approval step and makes no perfect-segmentation claim.
- **AC-F07-15 — Post-lock recovery boundary:** After the first accepted saved take, Flow 07 exposes no whole-section retry, targeted re-slice, manual correction, or unlock. The user continues with the provided clips or starts a new project through the adjacent flow.
- **AC-F07-16 — Initial-cancellation return:** After authoritative initial cancellation, New dub receives the same durable source video and selected interval. The user may change the interval, receives a fresh exact quote, and must click the corresponding exact-cost processing button; return never auto-authorizes, reserves, or starts work.
- **AC-F07-17 — Confirmed progress composition:** Authoritative queued state shows **Queued**. Authoritative running state always shows the current service-reported stage name; before a trusted overall percentage exists it shows no fabricated `0%`, bar, measured indeterminate fill, or ETA. When trusted percentage exists, it shows exactly one overall bar, numeric percentage, and current stage, with no detailed checklist, elapsed-time simulation, invented values, or inferred billing allocation.
- **AC-F07-18 — Increased cancellation quote:** If newly completed work increases the cancellation charge while confirmation is open, the stale quote and consent cannot settle that higher amount. The UI shows the revised amount and consequence and requires fresh explicit confirmation.
- **AC-F07-19 — Zero-turn completion:** A complete validated zero-turn attempt remains successfully charged and consumes retry entitlement under successful-run rules. Initial processing shows No dialogue found and offers eligible reprocessing or another video without entering Record/Result, fabricating a turn, adding manual correction, or creating a speechless output. Reprocessing with a prior usable preparation preserves it and its unaccepted draft instead of activating an empty replacement.
- **AC-F07-20 — Balance and reservation truth:** Main/header and processing balance show available spendable credits after active reservations; any reserved amount is separate **In processing** state and is never presented as a final posted charge.
- **AC-F07-21 — Background continuation without navigation theft or notifications:** Leaving the matching Processing screen or application after an attempt is accepted does not stop it. Completion updates authoritative project/job status but cannot redirect another current section/project; stale observer callbacks are status-only. The owner opens the finished project explicitly. Current status is available in the application/My projects, and the MVP adds no completion email, push notification, or mandatory notification UI.
- **AC-F07-22 — Draft replacement warning:** Before eligible reprocessing starts with an unaccepted draft, the UI warns that a successful usable replacement replaces segmentation and deletes the draft and discloses the retry/cost consequence. The draft remains recoverable until that activation and survives system failure, cancellation, activation rejection, and zero-turn reprocessing.

### 15.2 Blocked acceptance criteria

- **AC-F07-B04 — Production cancellation arithmetic:** **BLOCKED by SPEC-001 D03 / BR-001 OQ-02.** Exact stages, allocation, rounding, names, quote expiry, and validation-stage cancellation remain unselected; release acceptance cannot use example percentages or values.
- **AC-F07-B05 — Rejected-activation billing:** **BLOCKED by production policy.** A complete replacement that cannot activate because it is stale, superseded, deleted, or no longer authorized must not replace current state, but its settlement/release treatment needs an explicit contract.
- **AC-F07-B07 — Remaining visual and copy acceptance:** **BLOCKED by unselected flow-specific details and rendered evidence.** The shared Mabry Pro Regular/Medium roles, type sizes and line heights, 8/16/24/32px spacing roles, existing-panel padding, restrained motion direction, semantic colors/component states/focus treatments, radius, separate gutters, breakpoint, maximum width, and phone-header contents are fixed. Font assets/loading/fallback, browser/forced-colors behavior, screen-specific composition/geometry not implied by those roles, modal/sheet and sticky treatment, routing, final stage treatment, final EN/RU strings and rendered conformance still require selection or evidence.

## 16. Verification plan — not executed

No item below has been run. Future evidence must record procedure/command, result, environment/browser/device, date, revision or dirty-worktree boundary, fixture provenance, and artifact location. Mock and production evidence are reported separately.

### 16.1 State and reconciliation tests

- Exercise every state and transition in §5 for all three attempt classes.
- Reload and resume during requested, queued, each running stage, validating, cancellation quote, cancellation pending, failure, activation rejection, cancellation, no-dialogue, and ready.
- Deliver duplicate and out-of-order updates; prove state and money never move backward or terminate twice.
- Simulate timeout after each command; reconcile the existing attempt/cancellation before enabling another command.
- Delete/revoke the project and expire the session during every nonterminal state; prove no stale access or activation.

### 16.2 Billing and allowance contract tests

- Prove queued cancellation settles zero, releases the reservation, and preserves the included retry.
- Prove running cancellation uses only service-returned completed stages and returns/reconciles the unused reservation.
- Prove the main/header balance equals available spendable credits after all active reservations, while each reserved amount remains separate **In processing** state until settlement or release.
- Prove included-retry success and running user cancellation consume exactly one allowance; system failure and queued cancellation do not.
- Prove paid reprocessing uses a current exact quote and never replenishes the included retry.
- Hold cancellation confirmation open while another stage completes and increases the charge; prove the old quote/consent is rejected, the new amount is shown, and fresh explicit confirmation is required before any higher settlement.
- Exercise cancellation quote expiry, completion/cancellation race, duplicate settlement/release, and project deletion during processing after the remaining production policy is selected.
- Reconcile every displayed amount against account-level ledger evidence; test large balances and RU pluralization.

### 16.3 Confirmed recovery and handoff tests

- Cancel an initial attempt from queued and running states; after terminal cancellation prove New dub restores the same durable video and selected interval, allows interval change, refreshes the exact quote, and starts nothing until the exact-cost button is clicked.
- Render authoritative queued updates and prove the UI shows **Queued** without an invented stage, percentage, bar, or ETA and without client-clock promotion to running.
- Render authoritative running updates without a trusted percentage and prove the current stage name remains visible while no bar, number, fabricated `0%`, measured-looking indeterminate fill, or ETA appears. Then supply a trusted percentage and prove exactly one overall bar, its numeric percentage, and the current stage render from the same attempt revision, with no detailed stage checklist, client-simulated progress, or inferred stage-cost percentage.
- Complete an initial successful zero-turn attempt; prove the successful charge remains unchanged, No dialogue found is shown, eligible reprocessing and another-video actions follow current entitlement rules, and neither Record nor Result is reachable from that outcome.
- Complete successful zero-turn reprocessing over a prior usable preparation; prove billing/retry consumption remains a successful-run outcome while the prior preparation and unaccepted draft remain usable and the empty replacement never activates.
- Complete processing while remaining on the matching operation/project screen; prove the authoritative ready transition hands through the applicable microphone-readiness path to Record.
- Navigate to another section and to another project during accepted processing; complete the original attempt and prove its authoritative project/job status updates while the current page does not redirect. Deliver late, duplicate, and out-of-order callbacks from the former observer and prove none can steal navigation; explicitly opening the finished project reaches its valid destination. Verify no completion email, push notification, or mandatory notification UI is added.

### 16.4 Preparation safety tests

- Start reprocessing from an automatic preparation and prove it remains active during queue/running/failure/cancellation.
- With an unaccepted draft present, prove the required warning names successful segmentation replacement/draft deletion and discloses retry/cost consequence before authorization.
- Activate a successful nonempty replacement and prove the automatic preparation switches atomically and the warned draft is deleted only then.
- Fail, cancel, reject activation, and return zero turns after draft warning; prove the prior preparation and draft both remain recoverable.
- Supersede the authorized preparation/attempt before activation; prove the stale result cannot replace current state.
- Race first-take save against reprocessing authorization/activation; prove the permanent lock is authoritative.
- Deliver stale/superseded worker completions and prove they cannot replace the current revision.

### 16.5 Responsive, visual, accessibility, and localization review

- Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed.
- Inspect every state for first-viewport task clarity, overflow, occlusion, loading shift, long stage names, large credit amounts, and long Russian copy.
- Complete resolution, cancellation-quote, confirm/dismiss, failure recovery, and ready handoff using keyboard only and with a screen reader.
- Verify dialog/sheet labeling, focus containment/return, status semantics, restrained live announcements, zoom/reflow and high contrast.Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged. 
- Confirm no gradient, glow, page-entry animation, parallax, animated decorative recording effect, looping attention effect, permanent sidebar, fake percentage, fake ETA, or illustrative production price is present.
- Verify locale precedence for browser-derived first use, explicit pre-sign-in choice, and stored account preference; verify field errors below controls, service errors above the primary action, and preservation of entered/recoverable values.

### 16.6 Production evidence gate

- Prove real service stage/progress events, durable restart behavior, and validation/activation under worker interruption.
- Prove ledger reservation/settlement/release and allowance consumption under concurrent requests and retries.
- Prove system and required-background failures are free in production and preserve prior preparation.
- Prove cancellation against measured production stages and selected race/rounding rules.
- Do not mark release-ready from frontend mock, unit, or screenshot evidence alone.

## 17. Dependencies and cross-flow handoffs

| Dependency | Flow 07 expects | Flow 07 returns |
|---|---|---|
| Flow 06 — New dub | Accepted initial attempt identity, selected-section/quote/reservation revisions; durable saved video/interval for cancellation return | Ready automatic preparation hands through applicable microphone readiness to Record only from its matching current Processing screen; otherwise status updates without redirect. Other returns are failed outcome, cancelled-initial return with preserved editable interval and fresh-quote reauthorization, or zero-turn another-video handoff without auto-start |
| Record flow | Visible **Process again** entry; reprocessing authorization while eligible; current automatic-preparation identity; authoritative first-successfully-saved-take lock state; and any unaccepted account-owned draft identity/state plus required deletion warning acknowledgement | Activated nonempty replacement with authoritative warned-draft deletion, or unchanged prior preparation/draft after failure, cancellation, rejection, or zero-turn; zero-turn never enters a new Record preparation; no bypass of permanent lock, no automatic draft acceptance, and no recording UI |
| Flow 11 — My projects | Project/attempt resume identity and current access | Truthful progress/failed/ready summary facts and explicit finished-project opening after background completion; no project-list design or completion-driven redirect |
| Flow 12 — Credits | Authoritative available spendable balance after reservations, separate **In processing** reservation state, and history after settlement/release | Accounting operation identity/outcome; no pack or checkout UI |
| Shared shell | Approved responsive compact navigation, account/available-balance access, locale precedence, project header, Record/Result workspace, and no completion-notification promise | Processing state inside that shell; no sidebar, no Prepare stage, and no email/push completion path |
| Approved design tokens | Semantic colors, component states, focus treatments, typography, spacing, geometry and motion from `design-tokens.md` | Normative shared presentation roles; no flow-local arbitrary color system |
| Production services | Durable jobs, validated artifacts, stage/progress facts, ledger and cancellation contracts | Idempotent user commands and rendered authoritative state |

## 18. Open decisions and evidence gaps

### Production/product evidence still required

- **OPEN-F07-T01 — Stage and cost model:** stage taxonomy, user-facing names, allocation, integer rounding, completion evidence, validation treatment, and cancellation quote expiry.
- **OPEN-F07-T02 — Progress measurement mechanics:** trusted percentage semantics, weighting, update frequency, revision ordering, and service production evidence. Presentation is resolved: queued shows **Queued**; running without a trusted percentage shows the authoritative current stage and no bar/number; trusted percentage shows one overall bar, numeric percentage, and current stage; ETA is excluded.
- **OPEN-F07-T03 — Job observation:** polling/subscription contract, cursor/revision ordering, reconnect, stale cache, and cross-device resume.
- **OPEN-F07-T04 — Rejected activation:** settlement/release and candidate cleanup when valid output cannot activate because it is stale, superseded, deleted, or no longer authorized.
- **OPEN-F07-T05 — Terminal race:** cancellation versus completion/validation/deletion precedence and user-visible accounting result.
- **OPEN-F07-D01 — Remaining visual details:** Mabry Pro asset availability, browser loading/fallback, browser/forced-colors behavior, rendered conformance, screen-specific composition/geometry not implied by the common spacing roles, modal/sheet and optional sticky behavior, routes, final stage treatment, and final EN/RU copy. Shared Mabry Pro Regular/Medium roles, type sizes and line heights, 8/16/24/32px spacing roles, 24px desktop/16px phone existing-panel padding, restrained motion direction, semantic colors/component states/focus treatments, radius, separate gutters, 768px breakpoint, 1200px maximum, standard-control heights, and phone-header contents are resolved.

### Current contract references

- **OPEN-F07-X02 — Resolved by owner answer:** an unaccepted draft does not trigger the permanent lock. Before eligible reprocessing begins, warn that a successful usable replacement will replace segmentation and delete the draft and disclose retry/cost consequence. Preserve the prior preparation and draft until a nonempty replacement activates; system failure, cancellation, activation rejection, and zero-turn reprocessing preserve both. Physical cleanup timing remains a technical implementation/evidence detail rather than a new product question.
- **RESOLVED-F07-PROGRESS-PRESENTATION — Resolved by owner answer:** authoritative queued state shows **Queued**. Running without a trusted percentage shows the authoritative current stage name and no bar/number; running with trusted percentage shows exactly one overall bar, numeric percentage, and current stage. No ETA is shown, and elapsed client time cannot promote state or fabricate progress. Percentage semantics/weighting/update/ordering, transport, stage taxonomy, and production evidence remain technical dependencies.
- **RESOLVED-F07-BACKGROUND-NAVIGATION — Resolved by owner answer:** completion may auto-handoff through applicable microphone readiness to Record only while the matching operation/project Processing screen and valid lifecycle remain current. After navigation to another section/project, it updates authoritative status without redirect; stale observer callbacks cannot steal navigation, and the owner opens the project explicitly. This creates no completion email, push notification, or mandatory notification UI.

## 19. Design-skill application and evidence boundary

The author read and used both required design skills:

- `.agents/skills/design-taste-frontend/SKILL.md`, including the complete app-screen guidance at `references/app-screens.md`; and
- `.agents/skills/frontend-design/SKILL.md`.

They informed this specification by treating Processing as a worked-in app screen with one question and one primary job; putting real attempt/stage/accounting facts ahead of decoration; keeping flat surfaces, a compact no-sidebar shell, restrained red for errors/destructive action, honest loading/error/zero states, clear phone order, and accessible status feedback; and rejecting gradient, card-kit, fake-dashboard, decorative-motion, invented-number, and generic-copy defaults.

No style draw, code, mockup, browser inspection, screenshot review, accessibility run, or visual verification was performed. Owner-selected shared typography, including weights and line heights, common spacing and panel padding, restrained motion direction, semantic colors/component states/focus treatments, geometry, responsive shell, balance semantics, locale precedence, error placement, processing/reprocessing behavior, and notification boundaries are normative here. The skills did not invent the remaining font assets/loading/fallback, browser/forced-colors behavior, rendered conformance, screen-specific composition/geometry, routing, product policy, billing constants, or final copy; those remain labeled OPEN or proposed above.
