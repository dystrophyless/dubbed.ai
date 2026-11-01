# Flow 07 — Initial preparation processing, cancellation and technical recovery

Date: 2026-10-26 (Asia/Qyzylorda).
Status: initial frontend flow specification; specifications only; no implementation or verification executed  
Authority: latest owner decisions in this chat, then [`00-shared-contract.md`](00-shared-contract.md), `SPEC-001`, and `BR-001` where they do not conflict. On 2026-10-22 the owner removed the Prepare/review/edit stage from the MVP; that later decision supersedes older Prepare/manual-edit/background-audition wording.

## 1. Purpose and boundary

Successful processing never inserts a microphone check. The one-time check precedes registration; all later checks are in Settings. Record still validates actual capture readiness.

This flow lets an authenticated project owner understand and control one authoritative preparation attempt from accepted authorization through queueing, processing, validation, cancellation, failure, or activation of a complete usable preparation.

The screen's one question is:

> What is happening to my scene now, what can I safely do, and what will it cost if I stop?

The flow covers:

- initial preparation authorized by New dub;


- truthful queue, running, validation, cancellation, failure, and completion states;
- server-authoritative reload/resume and uncertain-command reconciliation;
- completed-stage cancellation disclosure;
- validated activation bound to the authorized source/selection/project revision; and
- safe initial preparation activation, preserving existing state against stale/deleted/superseded operations.

This flow does **not** own:

- upload, selected-section selection, the initial preparation quote, or paid authorization interaction (Flow 06);
- any Prepare/review/edit stage, manual transcript/speaker/timing correction, missed-line addition, background audition, or quality-approval gate; these are excluded from the revised MVP;
- the Record workspace, reference audition or recording controls (Flow09);
- recording acceptance or its exclusive-access grant;
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
4. A successfully delivered zero-dialogue preparation remains charged. Show No dialogue found / Реплики не найдены and another-video recovery; never enter Record/Result or create a speechless export. This does not grant a refund or project retry allowance.
5. Queued cancellation costs zero. Running cancellation charges only fully completed production stages; elapsed work in an incomplete stage is not charged. The exact production stage allocation and rounding remain OPEN.
6. The cancellation cost is disclosed before confirmation. A cancellation request is not proof that processing stopped or that billing reached a terminal state.
7. User-requested repeat preparation is removed for every project, before and after recording. There is no included allowance or paid rerun.
8. Technical failure is not delivered preparation. Preserve its existing free-failure, accounting and explicit recovery protections; uncertain outcomes reconcile rather than trigger new work.
9. Record, Processing and Projects expose no reset/rerun command or first-take eligibility lock for a removed feature.
10. The MVP has no user-editable preparation. Processing cannot discard an existing recording candidate or accepted take.
11. Initial output is not active merely because a worker completed. Validate and activate against the authorized source/selection/project revision; deletion, supersession or a newer authoritative attempt wins.
12. Failed initial preparation keeps the resumable project and occupied project slot until owner deletion. Current projects have no inactivity expiry.
13. Processing and billing truth are account/server owned. Client timers, animations, stale tabs, or mock callbacks cannot declare completion, cancellation, charge, refund, or activation.
14. Successful automatic processing with recordable turns goes directly to Record, through the applicable microphone-readiness flow, only while the user remains on the matching operation/project Processing screen and that lifecycle is still valid. If the user has moved to another section or project, completion updates authoritative project/job status without redirecting the current page; the owner opens the finished project explicitly. There is no intervening transcript review, speaker/timing editor, missed-line tool, background audition, or quality-approval step.
15. Excellent automatic segmentation is the product target, but this specification makes no perfect-accuracy promise. In Record, transcript text is optional guidance and the user may listen to the original. Processing completion is not subjective segmentation approval.
16. A user who dislikes supplied segmentation performs it as-is or starts a new project under normal credit/slot rules; no correction, targeted re-slice or same-project reset.
17. Technical callbacks, retry, cancellation or failed activation cannot auto-accept or delete an unaccepted recording candidate; preserve durable draft/account/revision safety.
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
- available-balance, reservation and technical-recovery facts returned with authorization; and
- enough revision information to reject a stale or mismatched attempt.

Flow 07 does not repeat upload, selection, quote calculation, or paid authorization UI.

### 3.2 Technical-failure recovery

Only recovery from a confirmed technical failure of the initial preparation remains. Resolve the authoritative failed attempt and its accounting before presenting the existing retry; unknown/pending outcomes reconcile the same operation identity and never blindly start another command. No rerun of delivered preparation, free project allowance, paid repeat class, recording-state reset or Record launch control exists.

### 3.3 Resume and reload entry

My projects, browser reload, a new tab, or return after authentication may enter by project and/or attempt identity. The client first resolves the current authoritative attempt. It does not replay the original command unless reconciliation establishes that no accepted attempt exists and the relevant upstream flow obtains fresh authorization.

### 3.4 Exit

| Terminal authoritative outcome | Destination/handoff |
|---|---|
| Complete validated initial preparation activated with one or more recordable turns | On the matching active Processing screen, direct handoff directly to Record with the active automatic preparation identity; elsewhere, update status without redirect |


| Initial complete validated zero-turn preparation | Show No dialogue found / Реплики не найдены and another video; no Record/Result entry |

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



Technical recovery retains explicit authoritative accounting and idempotent operation identity. A failed attempt is not a successful delivery or a new project entitlement.

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
| `activation_rejected` | Initial output cannot activate because it is stale, superseded, deleted, or no longer authorized | Preserve the authoritative current preparation and reconcile |
| `cancel_quote_loading` | Current cancellation consequences are being resolved | Prevent duplicate confirm; processing may continue |
| `cancel_confirmation` | An authoritative cancellation quote is displayed | Confirm or keep processing |
| `cancel_requested` | Cancellation command was accepted but terminal outcome is unknown | Reconcile; do not claim stopped or settled |
| `cancelled` | Service confirms cancellation and terminal accounting outcome | Show exact result and appropriate exit/restart action |
| `failed` | Service confirms attempt failure and terminal accounting outcome | Explain recovery; preserve prior usable preparation where present |
| `no_dialogue` | A complete validated successful attempt contains no recordable turns | Show another-video recovery, unchanged successful charge and no Record/Result entry. |
| `ready` | Complete preparation is validated and activated | On the matching active operation/project screen, hand off directly to Record; elsewhere update status without redirect and await explicit project open |

`requested`, `queued`, `running`, and `validating` may outlive the current browser session. Reloading does not restart their visual sequence from zero.

### 5.2 Independent facts

One flat status string is insufficient. At minimum the resolved view keeps these dimensions separate:

- attempt state and revision;
- attempt class;
- authorized initial preparation identity/revision;
- protected recording-draft identity/state if present; no preparation callback may delete it;
- initial output candidate identity and activation state;
- current stage and completed-stage facts, when production defines them;
- progress measurement and its provenance, if production can provide one;
- quote/reservation/settlement/release state;
- cancellation eligibility and current cancellation-quote identity;

- project access/deletion state; and
- actionable error or reconciliation state.

### 5.3 Transition protections

- Repeating an identical accepted operation reconciles the existing attempt; it does not reserve or spend twice.
- Reusing an operation identity with different source, selection, quote or revision is a conflict.
- A stage update older than the current attempt revision cannot move progress backward or replace a terminal result.
- `cancel_requested` becomes `cancelled`, `failed`, or `ready` only from authoritative reconciliation. A late completion may race with cancellation; policy and service response decide the terminal outcome.
- A worker callback after project deletion or supersession cannot reactivate project access or a stale preparation.
- A completion observer is bound to the matching attempt/project and current lifecycle. It may reconcile authoritative status from any screen, but it may navigate only while that matching Processing screen is still current; stale callbacks cannot steal navigation from another section or project.
- Initial output cannot activate against stale/deleted/superseded source/selection/project authorization.
- Zero recordable turns never activate a recording snapshot or delete a protected recording draft.

## 6. Screen structure and anatomy

### 6.1 Shared workspace

Processing is an interim state in the project workspace under the shared compact top navigation and common project header/status area. There is no permanent sidebar and no Prepare stage. Successful automatic processing hands directly to Record only when its matching operation/project Processing screen is still current; a background completion after the user navigates elsewhere updates status without redirect. Result remains downstream of recording.

Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed.

Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.  There is no page-entry animation, parallax, animated decorative recording effect or looping attention motion. System reduced-motion disables interface transitions. Video playback and time-synchronized audio/playhead movement remain functional. Capture, save acknowledgement and navigation never wait for animation completion.

Pending/loading states keep the approved page, surface and text roles plus an accessible status; they never fabricate progress, use a decorative loop, or rely on color alone.

Record is the pending destination only after authoritative usable preparation. Availability is never inferred from a completed animation. No delivered-preparation reset is offered.

Exact routing and whether the Processing state has its own URL or a project-workspace substate are OPEN.

### 6.2 Main processing surface

Prioritize the authoritative current stage/progress and what the user can do: understand what is happening, leave safely, or inspect cancellation impact before deciding. Identify the project/attempt concisely. Show the financial/preservation summary when it informs that decision and expose supporting detail accessibly; do not require six accounting/run facts ahead of the progress surface. The service still supplies all independent facts in §5.2, and condensation never conflates quote, original reservation, current held amount, charge, release or retry state.

The progress surface is the screen's largest working block. It is not a hero, illustration, decorative animation, card grid, detailed stage checklist, or fake dashboard. While the service authoritatively reports `queued`, show **Queued**. While it authoritatively reports `running`, show the current authoritative stage name even when no trusted overall percentage exists. When a trusted percentage exists for the current attempt revision, show exactly one overall progress bar, its numeric percentage, and that current stage name. Never fabricate `0%`, an indeterminate percentage, stage advancement, or running state from an elapsed client clock. No ETA, elapsed-time simulation, invented percentage or stage, queue position, cost split, completion time, or production stage allocation may be shown.

### 6.3 Billing and preservation summary

The summary uses plain language and server facts, with concise relevant information and accessible detail instead of requiring every fact as an always-visible line:

- initial/paid attempt: authorized total quote and current reservation/terminal result;
- available spendable balance after reservations, with any reserved amount separately labelled **In processing** rather than shown as posted spending;

- running cancellation entry: a promise to calculate the current cancellation cost before confirmation, not a guessed number;


- system failure: no preparation charge and prior usable preparation retained.

Exact credit history and pack purchase UI remain in Flow 12.

## 7. Required screens and alternate states

### 7.1 Resolving/reconciling

Show the stable workspace frame and authoritative project identity. Preserve geometry with flat placeholders, no shimmer. Do not invent credit, progress, entitlement or stage values.

If resolution fails, keep the failed region in place with a concise cause class, last-known timestamp if safe, and Retry. Cached status can appear only when clearly labeled stale and must not enable monetary or destructive actions.

### 7.2 Queued

Render **Queued** only from the authoritative attempt state. Keep the applicable free-cancellation entry and reservation/retry facts visible. Do not promote the attempt to running, invent a stage or percentage, or estimate an ETA from time spent waiting.

State clearly that the attempt is waiting and has not started running. Do not promise an ETA or queue position without an authoritative measured contract.

Queued cancellation is free; claim completion only after authoritative terminal cancellation and reservation release.

### 7.3 Running

Render the authoritative current stage name whenever the attempt is running. If no trusted overall percentage is available, show the stage name without a progress bar or numeric percentage; do not fabricate `0%`, simulated fill, or an indeterminate value presented as measured progress. Once the service supplies a trusted percentage for the current attempt revision, show one overall bar with that numeric value and the same authoritative current stage. Never show an ETA.

The screen shows one overall progress bar with the numeric service-reported percentage and the current service-reported stage name for the current attempt revision. It does not require or default to a detailed stage checklist. Billing truth remains separate: the cancellation service, rather than the visible percentage or stage label, identifies fully completed production stages that may contribute to running-cancellation cost.

The screen does not calculate money from visual progress. Selecting Cancel first requests a cancellation quote. Processing may continue while that quote is fetched and while the dialog is open.

### 7.4 Validating

Explain that processing output is being checked before it can become the active preparation. Do not show Record as ready or settle from a local timer while validation/activation remains incomplete.

Cancellation availability and consequences during validation are returned by the service; this specification does not invent them.

### 7.5 Queued-cancellation confirmation

The dialog/sheet names project/attempt and zero cancellation cost. Offer destructive confirmation and keep-processing; claim only authoritative terminal accounting.

After confirmation, show `cancel_requested` until the service returns a terminal outcome.

### 7.6 Running-cancellation confirmation

Before confirmation the client requests an authoritative cancellation quote bound to the current attempt revision. The confirmation shows:

- exact credit amount that will settle if confirmed now;
- exact amount released/returned where the service can state it;
- the completed stages included in that amount using production-approved user-facing names;
- that the active incomplete stage is not charged;

- preservation of source/selection and all protected project state.

Production stage allocation, rounding, names, and quote expiry remain OPEN. No illustrative allocation or stage-price percentage may appear in final fixtures or copy. If additional completed work increases the cancellation charge while this confirmation is open, the service invalidates the displayed quote. The dialog shows the revised amount and consequence and requires fresh explicit confirmation; stale consent cannot authorize the higher charge.

### 7.7 Cancellation pending

Disable duplicate confirmation for the same quote/operation identity and show that the result is being reconciled. The user may leave the page; returning resumes the same reconciliation. Do not claim that workers stopped or credits returned until confirmed.

If the request outcome times out, expose Retry status/reconcile, not Submit cancellation again.

### 7.8 Cancelled

Show authoritative terminal accounting. After initial cancellation return to New dub with saved source/interval; changes request a fresh exact quote and require a new deliberate processing authorization. Navigation never reserves or starts work.

Any restart requires current eligibility and, where applicable, a fresh exact quote and new authorization. A cancelled attempt is not silently restarted.

### 7.9 System failure

State what failed at a user-actionable level and what remained safe. Confirm only authoritative facts:

- preparation was not activated;
- the applicable preparation reservation was released/no preparation charge was taken;

- source, selection and protected project state remain available.

Initial failure retains the project/slot and valid source/selection. A retry action reconciles eligibility and current quote before starting new billable work. It must not blindly clone the failed attempt.

### 7.10 Activation rejection

If output completes after project deletion, supersession or a newer authoritative attempt, reject stale activation and preserve current state. Production billing for completed non-activatable output remains an explicit technical gate; the UI cannot choose it.

### 7.11 Ready

Only a complete validated and successfully activated preparation with one or more recordable turns enters `ready`. If the user remains on the matching operation/project Processing screen and its lifecycle is valid, present a restrained completion status and hand off directly to Record. If another section/project is current, update authoritative project/job status without redirecting; the user opens the project explicitly. Observer callbacks must recheck the current screen, project, attempt, and lifecycle before navigation, so a stale callback cannot steal navigation.Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.  No completion email, push notification, or mandatory new notification UI is introduced.

A complete validated successful zero-turn attempt enters no_dialogue and keeps the successful charge. Show No dialogue found / Реплики не найдены and another-video/New dub action. No turn fabrication, Record/Result entry, manual correction or speechless output.



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

| Session expires | Reauthenticate, then reconcile same attempt if still authorized | No owner data exposed while signed out |
| Project deleted/revoked elsewhere | Clear inaccessible project media/data and leave workspace | Late job cannot resurrect access |
| Balance/ledger state uncertain | Show reconciliation state; do not display guessed balance | One terminal accounting result |

| Owner leaves the matching Processing screen or application after an attempt is accepted | Continue server-owned processing; update authoritative project/job status without redirecting another section/project; show current status on return/My projects; add no completion email, push, or mandatory notification UI | Navigation does not cancel accepted work, and completion cannot steal current navigation |

## 9. Reload, navigation, and persistence

- The attempt, its stage history, billing state, cancellation operations, outputs, and activation result are durable server-owned facts.
- Client state may cache display data but cannot be the only record of progress or a user command.
- Reload, duplicate tab, or device change queries current state using stable identity and expected revision.
- Leaving the page does not pause or cancel processing.
- Completion auto-handoff is scoped to the still-current matching attempt/project Processing screen and valid lifecycle. After navigation to another section/project, completion updates authoritative status only; it cannot redirect the active page, and the owner opens the finished project explicitly.
- When returning to a terminal attempt, the UI shows the terminal result rather than replaying progress animation.
- A cancelled initial attempt returns to New dub using the durable account-owned project/source/selection. The validated uploaded project remains an automatically saved My projects draft while it exists; changing or leaving this surface does not discard it or authorize another attempt.
- An unaccepted recording candidate remains account-owned and recoverable under the shared no-expiry rule. Processing/technical recovery never auto-accepts or deletes it. Physical cleanup remains technical policy.
- Technical recovery cannot replace a delivered preparation or reset its recording state.
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

| Queued status | Waiting to start | Ожидает запуска |
| Validating status | Checking the preparation | Проверяем подготовку |
| Queued cancel fact | Cancel now for 0 credits. | Сейчас отмена стоит 0 кредитов. |
| Running cancel entry | Check cancellation cost | Узнать стоимость отмены |
| Keep action | Keep processing | Продолжить обработку |
| Confirm cancel action | Cancel processing | Отменить обработку |

| System failure | Preparation failed. You were not charged. | Подготовка не удалась. Кредиты не списаны. |

| Stale initial output | This processing result couldn't be applied. Your current preparation is still safe. | Этот результат обработки не удалось применить. Текущая подготовка сохранена. |
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
- authorized initial preparation candidate/activation facts;
- current and completed stage data only from the approved production taxonomy;
- optional trusted authoritative overall percentage with its attempt revision/provenance; absence is explicit and never synthesized from elapsed time;
- quote/reservation/settlement/release facts and exact amounts;
- available spendable balance after reservations and any separately identified **In processing** reserved amount;
- technical-failure recovery state;
- protected unaccepted-draft identity/state when present; no deletion authorization is implied;
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
- exact charge and release/return amount where defined;
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

Success returns authoritative terminal accounting facts. A transport success alone does not mean cancellation succeeded. If the quote is stale because the charge increased, confirmation is rejected, the revised amount is shown, and the user must explicitly confirm that new quote. The service must never settle the higher amount from the stale quote identity or consent.

### 13.5 Activate preparation

Input is owned by the processing/application service and includes attempt/candidate identity, validated artifacts, authorized current automatic-preparation revision, and idempotent activation identity.

Result is either:

- one active complete nonempty preparation revision with recordable-turn count, terminal accounting and unchanged protected recording-draft state;
- a complete validated successful zero-turn outcome with terminal accounting, another-video action and no Record/Result handoff;

- no activation, with the prior preparation preserved and an explicit validation, authorization/revision, deletion, supersession, or system-failure reason.

The browser renders authoritative activation outcomes; it never activates, merges revisions, deletes a recording draft or converts technical retry into a delivered-preparation reset.

## 14. Mock truth and production dependencies

### 14.1 Interchangeable mock scenarios

The mock may deterministically simulate:

- requested, queued, running, validating, ready, cancelled, and failed attempts;
- authoritative queued state rendered as **Queued**; authoritative running with a current stage but no trusted percentage; and running with exactly one service-reported overall bar, numeric percentage, and current stage;
- absence checks for fabricated `0%`, simulated/indeterminate fill presented as measured progress, client-clock state promotion, detailed stage checklist, and ETA;
- initial authorization, confirmed technical failure recovery and identity-bound uncertain-outcome reconciliation;
- queued free cancellation with authoritative reservation release;
- running cancellation with fixed fixture stages and accounting explicitly labeled mock data;
- a stale cancellation quote and a cancellation/completion race;
- an increased cancellation quote that invalidates prior consent and requires reconfirmation;
- system failure with release and prior-preparation preservation;
- successful charged zero-turn completion with another-video recovery and no Record/Result handoff;

- cancelled initial processing returning to the saved video/interval, permitting interval change, requiring a fresh quote and exact-cost authorization, and never auto-starting;
- no delivered-preparation rerun, project allowance or reset control/command;
- technical failure, cancellation, stale activation and project deletion preserving protected media;
- available balance after reservations, a separate **In processing** reserved amount, settlement, and release;
- accepted work continuing after navigation, with completion updating authoritative status but leaving a different current section/project unchanged; matching-screen completion may hand directly to Record, stale callbacks cannot navigate, and no completion email, push notification, or mandatory notification UI is added;
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
- idempotent reservation, settlement, release/return, and duplicate-charge protection;
- durable ordered job state and recovery after worker/client interruption;
- validated completeness rules for automatic segmentation, optional guidance transcript, timing, nonverbal turns, and required background artifact;
- revision-bound activation that cannot apply a stale or superseded preparation;
- authoritative deletion/supersession fences and idempotent technical recovery;
- project deletion fencing and account-level reconciliation;
- observability that excludes private media, transcripts, credentials, and signed URLs; and
- actual browser/device accessibility, localization, responsive, typography-rendering and motion evidence using the approved shared tokens, weights, line heights, spacing roles, transition limit and breakpoint, plus selected remaining focus, internal composition, asset/loading/fallback and final-copy decisions.

## 15. Acceptance criteria

### 15.1 Confirmed and unblocked

- **AC-F07-01 — Authoritative identity:** Flow 07 opens only for an accepted attempt identity, resolves current server state on entry/reload, and never creates duplicate work from a timeout, refresh, or repeated click.
- **AC-F07-02 — Honest lifecycle:** Requested, queued, running, validating, cancellation-pending, failed, cancelled, activation-rejected, no-dialogue, and ready states are distinguishable without a client timer declaring terminal truth.
- **AC-F07-03 — Queued cancellation:** terminal queued cancellation costs zero and releases reservation; UI waits for authoritative outcome.
- **AC-F07-04 — Running cancellation disclosure:** Before confirming running cancellation, the UI displays the exact authoritative completed-stage charge and accounting consequence and never derives cost from elapsed time or visual progress.
- **AC-F07-05 — Failure protection:** technical/required-background failure activates no preparation, charges no preparation credits and preserves protected source/project/media for explicit recovery.
- **AC-F07-06 — Technical recovery:** retry only confirmed technical failure under existing accounting rules; unknown outcomes reconcile the same identity without duplicate work/charge. No included or paid project-rerun entitlement.
- **AC-F07-07 — Removed reset:** no user-initiated whole-section rerun action, command, eligibility lock or quote exists at any recording stage.
- **AC-F07-08 — Safe activation:** activate only complete validated authorized initial output; deletion, stale revision or supersession wins. No callback deletes recording drafts or replaces protected accepted media.
- **AC-F07-09 — Reload and stale updates:** Reload/new tab/device resume the authoritative attempt and terminal result. Older/out-of-order updates cannot move state backward, replace a terminal result, or reactivate a stale preparation.
- **AC-F07-10 — No invented progress:** The UI shows only authoritative state, stage, and trusted progress data. `queued` renders **Queued**; running without a trusted percentage renders the authoritative current stage name without a bar or number; trusted percentage renders exactly one overall bar, numeric percentage, and current stage. No client clock invents running state, stage, percentage, ETA, queue position, production cost allocation, or illustrative stage price.
- **AC-F07-11 — Responsive, visual, motion, and accessible control:** Every supported size preserves status, real progress, billing/retry consequences, preservation notes and action order; keyboard/assistive operation and restrained live announcements remain required. Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed. Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.
- **AC-F07-12 — Bilingual truth:** EN/RU views communicate equivalent state, cancellation cost, retry consequence, failure protection, and preservation behavior without changing canonical values or hiding actions. Browser Russian selects RU on first use, all other browser locales select EN, an explicit pre-sign-in choice overrides and updates a different account preference, and a browser-derived default alone does not overwrite it. Field errors appear below their control, service errors above the primary action, and recoverable values survive either error.
- **AC-F07-13 — Mock boundary:** Deterministic mock states remain visibly fixture-backed in evidence and cannot be cited as proof of production processing, billing, persistence, or media behavior.
- **AC-F07-14 — Direct-to-Record MVP:** A successful preparation with recordable turns enters Record directly when the matching operation/project Processing screen and lifecycle remain current. If the user has moved to another section/project, completion updates authoritative status without redirect and the user opens the finished project explicitly. Flow 07 exposes no Prepare/review/edit/background-audition/quality-approval step and makes no perfect-segmentation claim.
- **AC-F07-15 — No reset recovery boundary:** at every recording stage, perform supplied clips as-is or start a normal new project. No same-project preparation rerun, targeted re-slice or manual correction. Technical-failure recovery remains distinct.
- **AC-F07-16 — Initial-cancellation return:** After authoritative initial cancellation, New dub receives the same durable source video and selected interval. The user may change the interval, receives a fresh exact quote, and must click the corresponding exact-cost processing button; return never auto-authorizes, reserves, or starts work.
- **AC-F07-17 — Confirmed progress composition:** Authoritative queued state shows **Queued**. Authoritative running state always shows the current service-reported stage name; before a trusted overall percentage exists it shows no fabricated `0%`, bar, measured indeterminate fill, or ETA. When trusted percentage exists, it shows exactly one overall bar, numeric percentage, and current stage, with no detailed checklist, elapsed-time simulation, invented values, or inferred billing allocation.
- **AC-F07-18 — Increased cancellation quote:** If newly completed work increases the cancellation charge while confirmation is open, the stale quote and consent cannot settle that higher amount. The UI shows the revised amount and consequence and requires fresh explicit confirmation.
- **AC-F07-19 — Zero turns:** a complete zero-turn attempt remains successfully charged, shows No dialogue found and another video, never Record/Result/manual-add/speechless output.
- **AC-F07-20 — Balance and reservation truth:** Main/header and processing balance show available spendable credits after active reservations; any reserved amount is separate **In processing** state and is never presented as a final posted charge.
- **AC-F07-21 — Background continuation without navigation theft or notifications:** Leaving the matching Processing screen or application after an attempt is accepted does not stop it. Completion updates authoritative project/job status but cannot redirect another current section/project; stale observer callbacks are status-only. The owner opens the finished project explicitly. Current status is available in the application/My projects, and the MVP adds no completion email, push notification, or mandatory notification UI.
- **AC-F07-22 — Draft protection:** technical recovery/cancellation/activation failure cannot auto-accept or delete a recording candidate; account/revision fences remain.

### 15.2 Blocked acceptance criteria

- **AC-F07-B04 — Production cancellation arithmetic:** **BLOCKED by SPEC-001 D03 / BR-001 OQ-02.** Exact stages, allocation, rounding, names, quote expiry, and validation-stage cancellation remain unselected; release acceptance cannot use example percentages or values.
- **AC-F07-B05 — Rejected-activation billing:** **BLOCKED by production policy.** Complete initial output that cannot activate because it is stale, superseded, deleted, or no longer authorized must not replace current state, but its settlement/release treatment needs an explicit contract.
- **AC-F07-B07 — Remaining visual and copy acceptance:** **BLOCKED by unselected flow-specific details and rendered evidence.** The shared Mabry Pro Regular/Medium roles, type sizes and line heights, 8/16/24/32px spacing roles, existing-panel padding, restrained motion direction, semantic colors/component states/focus treatments, radius, separate gutters, breakpoint, maximum width, and phone-header contents are fixed. Font assets/loading/fallback, browser/forced-colors behavior, screen-specific composition/geometry not implied by those roles, modal/sheet and sticky treatment, routing, final stage treatment, final EN/RU strings and rendered conformance still require selection or evidence.

## 16. Verification plan — not executed

No item below has been run. Future evidence must record procedure/command, result, environment/browser/device, date, revision or dirty-worktree boundary, fixture provenance, and artifact location. Mock and production evidence are reported separately.

### 16.1 State and reconciliation tests

- Exercise every state and transition in §5 for all three attempt classes.
- Reload and resume during requested, queued, each running stage, validating, cancellation quote, cancellation pending, failure, activation rejection, cancellation, no-dialogue, and ready.
- Deliver duplicate and out-of-order updates; prove state and money never move backward or terminate twice.
- Simulate timeout after each command; reconcile the existing attempt/cancellation before enabling another command.
- Delete/revoke the project and expire the session during every nonterminal state; prove no stale access or activation.

### 16.2 Billing and technical-recovery contract tests

- Prove terminal queued cancellation settles zero and releases reservation.
- Prove running cancellation uses only service-returned completed stages and returns/reconciles the unused reservation.
- Prove the main/header balance equals available spendable credits after all active reservations, while each reserved amount remains separate **In processing** state until settlement or release.
- Verify confirmed technical failure recovery and terminal cancellation retain existing accounting protections without a project rerun allowance.
- Prove no successful-delivery rerun entitlement, paid quote or command is exposed.
- Hold cancellation confirmation open while another stage completes and increases the charge; prove the old quote/consent is rejected, the new amount is shown, and fresh explicit confirmation is required before any higher settlement.
- Exercise cancellation quote expiry, completion/cancellation race, duplicate settlement/release, and project deletion during processing after the remaining production policy is selected.
- Reconcile every displayed amount against account-level ledger evidence; test large balances and RU pluralization.

### 16.3 Confirmed recovery and handoff tests

- Cancel an initial attempt from queued and running states; after terminal cancellation prove New dub restores the same durable video and selected interval, allows interval change, refreshes the exact quote, and starts nothing until the exact-cost button is clicked.
- Render authoritative queued updates and prove the UI shows **Queued** without an invented stage, percentage, bar, or ETA and without client-clock promotion to running.
- Render authoritative running updates without a trusted percentage and prove the current stage name remains visible while no bar, number, fabricated `0%`, measured-looking indeterminate fill, or ETA appears. Then supply a trusted percentage and prove exactly one overall bar, its numeric percentage, and the current stage render from the same attempt revision, with no detailed stage checklist, client-simulated progress, or inferred stage-cost percentage.
- Complete a successful zero-turn attempt: charge unchanged, No dialogue found/another video, no Record/Result.

- Complete processing while remaining on the matching operation/project screen; prove the authoritative ready transition hands directly to Record.
- Navigate to another section and to another project during accepted processing; complete the original attempt and prove its authoritative project/job status updates while the current page does not redirect. Deliver late, duplicate, and out-of-order callbacks from the former observer and prove none can steal navigation; explicitly opening the finished project reaches its valid destination. Verify no completion email, push notification, or mandatory notification UI is added.

### 16.4 Preparation safety tests

- Retry only confirmed technical failure, preserving source/selection/project/slot and existing accounting protections.
- Reconcile unknown start/cancel/activation by operation identity without duplicate authorization or charge.
- Fence deleted/superseded projects and stale worker completions; none can replace current state or erase recording drafts.
- Assert no rerun-delivered-preparation command, allowance, quote, reset or UI entry exists.

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
| Flow 06 — New dub | Accepted initial attempt identity, selected-section/quote/reservation revisions; durable saved video/interval for cancellation return | Ready automatic preparation hands directly to Record only from its matching current Processing screen; otherwise status updates without redirect. Other returns are failed outcome, cancelled-initial return with preserved editable interval and fresh-quote reauthorization, or zero-turn another-video handoff without auto-start |
| Record flow | Validated nonempty preparation, source/selection/timing revisions | Direct Record handoff; no reset/rerun command or recording UI inside Processing |
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

- **OPEN-F07-X02 — Withdrawn feature:** the former draft-reset decision no longer applies. Preserve account-owned candidates; no repeat-preparation reset exists. Physical cleanup timing remains technical evidence.
- **RESOLVED-F07-PROGRESS-PRESENTATION — Resolved by owner answer:** authoritative queued state shows **Queued**. Running without a trusted percentage shows the authoritative current stage name and no bar/number; running with trusted percentage shows exactly one overall bar, numeric percentage, and current stage. No ETA is shown, and elapsed client time cannot promote state or fabricate progress. Percentage semantics/weighting/update/ordering, transport, stage taxonomy, and production evidence remain technical dependencies.
- **RESOLVED-F07-BACKGROUND-NAVIGATION — Resolved by owner answer:** completion may auto-handoff directly to Record only while the matching operation/project Processing screen and valid lifecycle remain current. After navigation to another section/project, it updates authoritative status without redirect; stale observer callbacks cannot steal navigation, and the owner opens the project explicitly. This creates no completion email, push notification, or mandatory notification UI.

## 19. Design-skill application and evidence boundary

The author read and used both required design skills:

- `.agents/skills/design-taste-frontend/SKILL.md`, including the complete app-screen guidance at `references/app-screens.md`; and
- `.agents/skills/frontend-design/SKILL.md`.

They informed this specification by treating Processing as a worked-in app screen with one question and one primary job; putting real attempt/stage/accounting facts ahead of decoration; keeping flat surfaces, a compact no-sidebar shell, restrained red for errors/destructive action, honest loading/error/zero states, clear phone order, and accessible status feedback; and rejecting gradient, card-kit, fake-dashboard, decorative-motion, invented-number, and generic-copy defaults.

No style draw, code, mockup, browser inspection, screenshot review, accessibility run, or visual verification was performed. Owner-selected shared typography, including weights and line heights, common spacing and panel padding, restrained motion direction, semantic colors/component states/focus treatments, geometry, responsive shell, balance semantics, locale precedence, error placement, initial-processing/technical-recovery behavior, and notification boundaries are normative here. The skills did not invent the remaining font assets/loading/fallback, browser/forced-colors behavior, rendered conformance, screen-specific composition/geometry, routing, product policy, billing constants, or final copy; those remain labeled OPEN or proposed above.
