# Frontend flow specifications — shared current requirements

Date: 2026-10-26 (Asia/Qyzylorda).
Mode: current owner-authorized specification correction only. No product code, prototype, browser validation, issue publication, Git delivery or acceptance is included. Existing implementation and correction evidence belong to their dated boundaries; they do not establish conformity to these corrected requirements.

## Authority and decision handling

The current shared requirements and active flow contracts govern intended behavior under the owner’s instructions. Preserve unchanged business/security/data rules from BR-001 and SPEC-001. No unconfirmed behavioral, visual, data, commercial or recovery choice may silently become a requirement. Keep proposals/open questions explicit and affected criteria pending; do not re-ask settled choices. Use the design-first workflow for meaningful composition and explicit owner checkpoints. Specification writing and independent review use its current Sol allocation; this document is not a record of past model assignments.

The design skills guide analysis, not owner approval: their random draw output or default recommendation cannot select a design on the owner's behalf. Read the appropriate page/app-screen references. No runnable mockup, visual verification or browser-test pass may be claimed from specification text. The 2026-10-26 owner-authorized correction removes known bad UX requirements before prototyping; it does not finalize unseen layout. See the [current UX audit](../evidence/ux-root-cause-audit-2026-10-26/report.md) for source and pending issue alignment.

## Account session-expiry destination

If a session expires while the user is on Account, keep private Account facts hidden, send the user through Flow 02, then open New dub after successful sign-in. Do not return to Account. This resolves the bounded Flow 15 §3.2 / Flow 02 §2.2 return-intent conflict recorded for issue #61. The existing same-project-screen return remains the explicit exception for expired project-flow sessions. Exact route URLs remain a separate implementation detail and are not selected here.

## Project title, activity, and support address

For project-title validation and automatic filename-derived title truncation, count visible Unicode grapheme clusters. One emoji or combining sequence counts as one visible character toward the 100-character limit. Use `Intl.Segmenter` where supported; do not present code-point counting as an equivalent fallback. This answer resolves Flow 11 `OPEN-F11-01A`; it does not select filename normalization or an empty-stem fallback.

Recent-project activity includes successfully opening an owned project, successful user changes, authoritative background-processing completion, and authoritative result completion. A list refresh or read-only observer does not itself create activity. This narrows Flow 11 `OPEN-F11-02`; the selected mock uses a monotonically increasing workspace activity sequence, stable project ID for ties, and deduplicated activity-event IDs. Production event authority and delivery evidence remain open.

Use `dystrophyless@gmail.com` as the ordinary support `mailto` destination on the signed-out landing and Credits. The address choice does not decide refund or financial policy. Opening the link does not prove delivery or authorize sending a message.

## Confirmed replacement experience

- Landing explains the product, truthful intended result/value, user recording role/effort and clear next step in EN/RU, and interests a casual visitor. Earlier content quotas, no-media and explanatory-navigation bans are superseded. Preserve the eligible one-time 120-credit offer, public support contact, guest registration and authenticated New dub routing. Proof assets must be permitted and represented honestly; synthetic fixtures are not genuine custom-rendered results. Exact assets/copy/header/content hierarchy await prototype validation.
- Audience: casual users dubbing their own short video scenes; English/Russian UI; desktop and phone.
- React and Zustand; shadcn UI controls only; centralized services boundary with interchangeable mock; backend remains FastAPI/PostgreSQL/SQLAlchemy, outside frontend-spec execution scope.
- Direction: owner-selected Affect UI Clean / Light component appearance, retained Mabry Pro, black video stage and readable text; see current presentation contract. Recording/destructive actions use red. Mabry Pro, exact palette, typography sizes, control dimensions, gutters and the768px responsive breakpoint are confirmed in the later owner-answer sections; do not treat those decisions as open.
- Compact global top navigation: New dub, My projects, credits balance, account. A contextual Record performance panel is allowed and is not a global navigation sidebar. Project identity remains available without a mandatory filename / Record / Progress saved trail. Show persistence status when it helps the user act or recover. Processing leads directly into Record; Prepare remains removed.
- New dub: after choosing video, preview, source-section selector, exact credit quote and Process for{N}credits button on the SAME page. Original up to10min/250MB MP4/MOV/WebM; selected section <=2min. Default to the whole original if<=120s, otherwise first120s; user can change it. A single click on the exact-cost button authorizes the quoted processing; no second cost dialog/checkbox. Selected section becomes project/output timeline.
- No Prepare/review/editing stage in the MVP. No manual transcript, speaker or timing correction, no missed-line addition, and no background-only audition or approval. Earlier separate-panel/bottom-sheet editor decisions are superseded. Automatic processing supplies the recording turns; the user can listen to original audio and perform it even if the displayed transcription is inaccurate.
- Record purpose: follow the moving scene and perform the current line comfortably. Keep the complete source image visible (contain/letterboxing is valid), give spoken dialogue deliberate prominence, and bound the playable waveform. The owner direction for a prototype is centered video → prominent centered spoken line → bounded waveform, with a contextual right panel ordered clip position → Replay / Record / Your take → Previous / Next. This is a direction to validate, not approved geometry, typography, panel behavior or phone/short-screen composition.
- Before first recording on a device, use the separate microphone check: browser-exposed device selection, level feedback and an optional temporary local test. When ready, Continue to dubbing is primary and testing is secondary. Normal Record need not show a peer-primary Microphone button; contextual input recovery remains available. Moving full reconfiguration to Settings is owner direction, with exact location and safe return-with-candidate behavior still to resolve. Dialogue capture starts immediately when ready, without countdown, and automatically stops at the fixed turn-window end including margins, with no manual Stop. Only reference-original volume is adjustable during capture; it affects audition only, never recorded/saved/final gain. Browser/device interruption may produce usable partial drafts. Optional microphone-test Stop remains separate. One device and one tab per project may capture/accept, no forced takeover; release on exit or confirmed disconnect and reacquire on return.
- Group direct Replay / Record / Your take actions apart from Previous / Next navigation. Replay auditions the original fixed turn window; Your take auditions the current usable candidate before a compatible accepted take, or stays disabled with a concise record-first reason. One source plays at a time and the bounded waveform/scrubber stays synchronized with video; no mandatory segmented source toggle plus common Play. Explicit playback from either source at or beyond the fixed-window end restarts at that window beginning, even before the source file ends. After recording the user may audition, rerecord or choose Next. Next explicitly accepts an eligible candidate before advancing, and failure/unknown acceptance stays for recovery. Without a candidate, a compatible accepted take permits forward navigation; an empty unaccepted turn cannot be skipped to the next unfinished turn. Initial authoritative all-turn completion starts assembly; completed-project revisions require explicit To result and the candidate guard. Preserve the prior accepted take until durable replacement acceptance.
- Entering a turn and finishing capture wait for user action, without autoplay, capture or acceptance. Position and accepted-compatible counts remain separate internal facts, but the UI does not require separate visible counters or an idle Recording status. A usable interrupted partial may be explicitly accepted; zero-data attempts cannot, and valid silent media is not zero-data. Source changes reset to the window beginning; an explicit direct audition action may play, while a source-only change on paused/inactive media stays paused. Exact pause behavior/labels for direct actions await prototype resolution. Record supersedes audition from the full-window beginning. Your take auditions once without looping/advancement. Active capture still has unmistakable visual and programmatic feedback.
- Leaving with an unaccepted candidate offers Save and leave / Leave without saving / Stay; a failed save prevents navigation and protects the previous accepted take. Unaccepted completed recordings are recoverable account-owned drafts across devices after sign-in, with no expiry until acceptance, explicit draft deletion or project/account deletion. Recovery offers the draft without automatic acceptance. Do not claim recovery before media/account association is durably persisted. Already accepted takes remain saved. Failed recapture preserves the prior candidate. Logical replacement follows the later confirmed acceptance/reprocessing rules; physical media cleanup remains a technical policy gap.
- Result auto-assembly after initial recording completion; explicit To result for completed-project revisions. Progress then full playback/download/return to the first turn; background assembly has no Cancel control. Public sharing was withdrawn; do not add a Share action. Every turn needs compatible saved recording. There are no user timing/text/speaker edits in this MVP. Any future processing-change/take compatibility still requires an explicit contract; do not reintroduce editing controls.
- A newly ready result does not interrupt active playback of the previous version: show New version ready / Watch new. When playback is paused or inactive at readiness, replace the displayed asset without autoplay. Choosing Watch new switches to the new generation at its beginning and leaves it paused; playback requires a separate Play action. Download MP4 always targets the exact displayed generation; while the previous version is retained for viewing it remains the download target, until Watch new changes both. Latest authoritative result identity and temporarily displayed generation are distinct.
- My projects: compact list with small scene thumbnail, title, progress and Continue; delete in row menu with standard button confirmation. Inline title edits autosave on blur. Empty state is only No projects yet and New dub. Continue unfinished recording at the first turn without an accepted take.
- Before the first accepted take, Process again is discoverable as a secondary utility within the coherent Record workspace, rather than a required standalone outer row. Preserve its entitlement/cost warning; usable nonempty success alone replaces prior preparation/draft. Failure and zero-turn replacement preserve them. After first durable acceptance it is permanently unavailable with an understandable reason.
- No publishing or viewing user results by public link. No Share button/dialog, access toggle, share token, copied viewing URL, public result route or anonymous result viewer. The owner can download the finished MP4 and distribute that file outside the app. Earlier sharing decisions below are historical and fully superseded.
- Credits: separate page with available balance, separately shown processing reservations, packs and unified history. Pending purchases show Confirming payment and refresh automatically; fulfillment requires verified success. Insufficient-credit dialog can lead there; successful purchase returns to the preserved video/selection with refreshed balance/quote and no automatic processing. Exact real USD prices and pack amounts have not been selected.

## Unchanged product invariants

120 one-time non-expiring welcome credits per verified eligible account. Preparation quote is ceil(selected seconds), 1credit/sec;2free slots,10after first purchase. One included retry per project; whole-section reprocessing locked permanently after first successfully accepted saved take; failed capture/save does not lock it. Successful allowed reprocessing replaces processed output only after applicable warning/consent; failure preserves prior usable output. There are no manual edits to reset in the revised MVP. System preparation failure free; running cancellation completed-stage-only amount disclosed, production allocation unresolved. No translation, performance scoring, cloned voices, multi-take library, full video editor or incomplete export. Output up to720p MP4, orientation preserved, no added subtitles. Original voices replaced while background preserved; there is no dedicated background audition or quality-approval UI. Authentication Google/email/password; email verified before registration completion; reset and explicit verified account linking; account deletion. Current projects persist until owner deletion, public-link sharing and its revocation flow are excluded by the latest owner decision.

## Scope of each flow document

Name purpose/entry/exit, screens and component anatomy, explicit main and alternate transitions, empty/loading/error/cancel/recovery states, desktop/mobile/keyboard behavior, visible copy/localization, logical services inputs/results, persistence boundaries, acceptance criteria and verification plan (not executed tests), dependencies and unresolved owner questions. Reference shared rules rather than inventing a fresh design system per document. Document mock truth and production dependencies. Specifications are not implementation tasks or delivery evidence.

## Current common presentation contract

The owner selected **Affect UI Clean / Light** on 2026-10-23 and explicitly retained **Mabry Pro**. The [exact source catalog](affect-ui-clean-light-reference.md), [adoption mapping](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md) replace the old blue-primary palette, 8px universal controls, 40px desktop buttons, 16/24 desktop button labels, blanket no-shadow and at-most-150ms motion rules.

| Role | Current contract |
|---|---|
| Typeface / body / dialogue | Mabry Pro Regular/Medium only, no Bold/synthetic Bold; body/dialogue Regular16px/24px |
| Captions / field labels / headings | Regular14px/20px captions; Medium14px/20px field labels; Medium32px/40px desktop and24px/32px phone headings |
| Page / source light surfaces | Retain white page; source black.03 wash, white controls, black.06 decorative hairlines, black.88 ink / black.61 readable supporting text |
| Primary / secondary / destructive | Source dark primary, white subtly shadowed secondary, red.08/.12 soft-destructive wash; readable destructive/error ink adapted to #C1262C |
| Accessible boundaries / links / focus | Black.447 essential control boundary, opaque #0060E2 link/focus, 2px focus ring +2px opaque-ground gap; retained media focus only on opaque black |
| Desktop action roles | Task40px high / Mabry Pro Medium14px/20px / 14px horizontal padding / 8px gap / 16px icon; prominent/landing44px / Medium16px/24px / 16px horizontal padding; secondary32px / Medium14px/20px; navigation36px / Medium14px/20px; medium segmented40px /14px/20px desktop and48px /16px/24px phone. Frequent Record/Play/Next and consequential purchase/download/guard actions use task; incidental compact controls need a documented reason. |
| Control targets | Desktop icon-only targets are at least40x40px; all phone targets are at least48px, including 48x48px icon-only targets and text actions48px high with16px/24px labels. |
| Original source density provenance | Original source24/28/32px heights and12/16 small,13/20 medium/large labels remain in the reference catalog only; they are not current Dubbed target sizes. |
| Other component geometry | Exact mapped source; OTP40x44px/radius8/gap8, segmented outerradius8/optionsradius6, required menus/panelsradius10; derived fields/dialog/media/progress as specified in tokens |
| Phone controls | All interactive targets at least48px; text actions are48px high with Mabry Pro Medium16px/24px labels, icon-only targets are48x48px; readable input text and character/target separation remain required |
| Shadows | Exact catalogued small/hover/floating source families only on mapped components; no general per-block cards |
| Motion | Exact bounded source functional recipes, including140/160ms buttons and eligible selection/content/width morph; functional pending spinner only for real pending work; immediate reduced-motion state changes |
| Layout | Retained32px/16px page gutters, below768px phone/one-column shell, regular top navigation from768px, 1200px working and400px applicable auth-form maxima |
| Layout spacing / existing panel padding | Retained8/16/24/32px layout rhythm and24px desktop/16px phone padding; mapped source internal spacing takes precedence inside that component |

The owner authorized correction of undersized desktop action roles on 2026-10-25. Under delegated QA-fix authority, the Orchestrator selected the exact numeric roles listed above; those pixel values were not separately human-approved. Phone labels remain Mabry Pro Medium16px/24px and all phone targets are at least48px. Original compact source dimensions remain source provenance only, not Dubbed targets. These numeric component roles remain the current baseline; they do not approve new page composition. Meaningful redesign follows the owner checkpoints in the [design-first workflow](../frontend-design-workflow.md). Only Light renders, including under OS dark preference; no theme toggle or imported .dark behavior. Only selected component treatments are adopted. The source defines no generic input/dialog/waveform/player, so their derivative visual mappings are explicit in design-tokens.md; do not invent source counterparts.

No gradients, marketing/page-entry/parallax/decorative background loops, new product features or wrapper around every block. Global navigation remains compact; the owner-directed contextual Record panel is permitted for prototype validation. Source functional spinners replace the old blanket looping-motion ban only for genuine pending work. Loading/progress never invents service facts. Animation never delays capture, persistence acknowledgement, payments, consent or navigation. shadcn semantic primitives remain the behavior foundation adapted to the source look.

Keep Record focused on scene and spoken performance rather than technical metadata. Desktop contextual-panel layout and phone/short-screen adaptation await prototype validation; the old always-below-waveform placement and fit arithmetic are not current design acceptance. Preserve full-image media, reachable actions, readable long EN/RU dialogue, safe areas, keyboard access and durable actionable failure feedback. The signed-in phone header remains logo left, balance/menu right; its menu retains New dub, My projects, Credits, Account, language and Sign out.

Locale precedence, actionable accessible field/service errors, neutral sign-in copy, retained values and every billing/auth/recording/result invariant are unchanged. Actual Mabry asset loading/fallback, CSS-pixel/DPR-normalized component fidelity, contrast/target/focus checks, keyboard/assistive behavior and runtime rendering remain unverified; source PNGs and static ratios are not Dubbed acceptance.

## Current cross-flow behavior

The following functional topics state current shared requirements. Use the active flow transitions, service contracts and acceptance criteria for detailed behavior. Unresolved product/technical questions stay explicit; no past-decision chronology is required to interpret the current rules.

## Recording review and draft safety

- The single waveform/timeline stays synchronized to the auditioned source and video. The historical mandatory Original / My recording toggle/common Play presentation is superseded by direct Replay / Your take actions; source identity and candidate precedence remain.
- Leaving with an unaccepted recorded candidate offers exactly Save and leave / Leave without saving / Stay. Save and leave navigates only after successful persistence; failed save keeps the user on the turn, with the previous accepted take protected.
- An unaccepted recorded candidate must be kept as a recoverable draft and offered after return, including browser crash/reload. Recovery does not automatically accept it. Storage scope and lifetime were subsequently resolved below: account-owned cross-device recovery and no expiry; replacement and physical-cleanup details remain open. Do not promise recovery of bytes never successfully persisted.

## No Prepare or manual correction

The owner explicitly removed Prepare and all manual correction from the initial MVP, including manual missed-line addition. There is no background-only preview/check/approval. Processing flows directly to recording. Transcription accuracy is not a prerequisite to the performance: users can listen and repeat the original. Reliable automatic segmentation that does not clip dialogue is a desired processing-quality requirement, not evidence of a perfect implementation or permission to omit explicit failure behavior. Bad supplied segmentation has no repair control; perform it as supplied or start another project. Initial zero turns use No dialogue found recovery, while zero-turn reprocessing preserves prior usable preparation/draft. Whole-section reprocessing locks permanently after the first durably accepted take. No author may restore the deleted stage as an assumed fallback. Flow08 is withdrawn from the active scope, leaving12 active flow specifications; stable existing flow IDs are retained.

## Bad segmentation

No correction or repair of a poorly segmented recording turn is provided in the MVP. A user encountering a clipped turn after recording others can perform the supplied turn as-is or start a new project. Do not add targeted AI repair, manual correction, skip/export-original fallback, or a post-first-accepted-take whole-section reset. The permanent reprocessing lock remains. Starting another project follows the ordinary credit and slot rules; no new refund or entitlement was approved by this answer.

Zero-turn recovery was subsequently resolved below: show No dialogue found, offer eligible reprocessing or another video, and do not enter Record/Result.

## Upload defaults and cost authorization

- The source-section selector is available for short and long videos. Default selection is the entire original when its duration is at most120 seconds; for longer originals, default to the first120 seconds. The user can change the range before processing. This source-section choice is not a manual editor for detected recording turns.
- The preparation/processing launch button includes the exact quoted credit cost (for example, Process for37 credits). One deliberate click authorizes processing/reservation under that shown quote; no second cost-confirmation dialog or consent checkbox is required. Existing stale-quote/insufficient-balance protections still apply.

## Recoverable draft scope

The unaccepted recorded take/draft belongs to the account and must be recoverable after sign-in on another device. Same-browser-only recovery does not satisfy this frontend contract. Recovery offers the draft without automatically accepting/replacing the current accepted take. A visible saving/draft-readiness state must not claim cross-device availability before the media and account association are actually persisted. Draft retention duration was subsequently answered as no expiry; leaving an already validated/uploaded but unprocessed project was subsequently resolved as automatic draft preservation in My projects. Real cross-device durability requires backend storage; a future backend-free mock cannot be presented as proof of that capability.

## Unaccepted-draft lifetime

The account-owned, cross-device recoverable unaccepted take/draft has no inactivity or fixed-time expiry. Keep it until acceptance, explicit draft deletion or deletion of its project (account deletion also removes account projects under the already confirmed account-deletion rule). Do not implement or specify7-day/30-day expiry. This answers user-visible retention; physical disposal of superseded/discarded media and backup/cache erasure timing remain separate operational policies and are not implied to be immediate. Ordinary restart/reload must not automatically accept the draft.

## Leaving a validated upload

After video upload and validation succeed, leaving before processing automatically preserves the project as a draft in My projects. Do not show a mandatory Save draft/Delete draft leave dialog. The validated project retains its occupied slot until explicit project/account deletion under the existing capacity rule. Resuming does not automatically authorize/start processing. This resolves the New dub / My projects draft-retention question.

## Zero detected turns

When automatic processing finds no recording turns, show No dialogue found / Реплики не найдены. Offer eligible reprocessing under the existing quote/credit/included-retry rules, or selection of another video. Do not enter Record or assemble/download a speechless result as a substitute. Manual turn addition remains excluded. This resolves the frontend zero-turn recovery/output choice; the previously confirmed successful zero-turn processing charge remains unchanged. No extra free retry or refund entitlement is introduced by this answer.

## Initial processing cancellation destination

After cancellation of an initial processing attempt completes, return to New dub with the saved source video and selected interval preserved. The user may change the selected interval and explicitly authorize another processing run using the fresh displayed credit quote. Do not automatically start or reserve for the next run. Cancellation billing and included-retry consumption remain governed by the existing confirmed rules; this answer changes navigation, not those entitlements.

## Processing progress presentation

Show one overall progress bar with a numeric percentage and the current processing-stage name. Do not require a detailed stage checklist as the default presentation. Percentage must be a real service-reported progress value, not an elapsed-time simulation or fabricated animation. While queued show Queued. While running without trusted percentage show the authoritative stage without a bar/number; trusted progress semantics/weights, production stage taxonomy and billing allocation remain technical/product gates.

## Cancellation quote changes

If additional completed work increases the cancellation charge while its confirmation is open, invalidate the stale cancellation quote/consent, show the revised amount and require fresh explicit confirmation. Do not charge the larger amount using the old confirmation. This does not choose production stage amounts or rounding.

## Result during replacement rendering

While an updated result is assembling, show the new render progress together with a playable previous finished result labeled Previous version / Предыдущая версия on the owner's Result screen. Do not hide the previous player merely because a replacement is pending. Existing atomic validated-success publication and preservation-on-failure rules still apply. When a replacement becomes ready, active prior playback continues with New version ready / Watch new; paused/inactive playback switches without autoplay. Watch new selects the new generation at its beginning paused; download remains pinned to the displayed generation.

## Result render failure retry

After result assembly fails, make exactly one automatic retry for that failed render request. If the automatic retry also fails, show the error and Repeat assembly / Повторить сборку action for an explicit user retry. Preserve accepted recordings and any previous finished result throughout. Do not loop automatic retries indefinitely or return the user to recording as if accepted takes had been lost. Technical retry timing and treatment of later manual attempts still require explicit detail if not determined by the shared operation contract.

## Project naming

Default the project's displayed name to the uploaded source filename without its extension. Allow the owner to rename it later. Do not require a name-entry step before processing or substitute an untitled default for a usable source filename. Rename is inline with blur autosave, trims edge whitespace, requires a nonempty title and permits at most 100 visible Unicode grapheme clusters; preserve the prior title and editable attempted value on rejection. Duplicate titles are allowed. Filename normalization and empty-stem handling remain technical edge cases.

## Continue with unfinished recordings

For a resumable project with a previous result and unfinished recording work, Continue opens Record. If there are no unfinished takes, Continue opens Result. Do not show a mandatory Record/Result choice dialog or prefer last-visited state over this rule. Other lifecycle states (validated upload not processed, active processing) still resume their corresponding valid flow; this answer is specifically the Record-versus-Result selection rule.

## Project list ordering

Order My projects by most recent activity, newest activity first. Do not use creation date as the primary order or automatically rank errors/incomplete projects ahead of that ordering. Activity includes successful project opening, successful user changes, and authoritative background-processing/result completion. List refresh and read-only observation do not create activity. The service owns its monotonic activity sequence, stable-ID tie-break, and event deduplication; production event evidence remains open.

## Return after credit purchase

When a user came to Credits because the selected video could not be processed for insufficient balance, a confirmed successful purchase automatically returns to that preserved video/section on New dub. Refresh the balance and request/show the current processing quote. Do not automatically authorize, reserve for or start processing. The user deliberately clicks the exact-cost processing button again. Purchase cancellation/failure must not be presented as success.

## Checkout navigation

Selecting a credit pack opens the payment provider's secured checkout page in the same browser tab, followed by return to the application. Do not choose a popup/new-tab or embedded-card-form presentation for this MVP flow. Provider, exact pack quantities/prices, currencies beyond the chosen USD and payment integration mechanics remain unselected. Return navigation alone is not a confirmed purchase; verified purchase state still governs balance and automatic return to the preserved New dub context.

## Credit-history information architecture

Credits displays one unified chronological activity feed containing welcome-credit grants, verified pack purchases, processing charges and returns/refunds, with the balance after each operation. Do not split purchases and credit activity into mandatory separate tabs or omit spending/returns from the visible history. The main balance is available spendable credits after active reservations; In processing is separate and is not a posted charge. Pending purchases remain pending without fabricated posted balance.

## Download only

The owner explicitly withdrew ALL sharing/viewing by public link. Users may share their work only by downloading the resulting file and distributing it externally. Flows13 (owner sharing controls) and14 (anonymous public viewer) are WITHDRAWN from this MVP. There is no replacement native-share menu, external publishing integration or public URL workflow. Remove their actions, services, acceptance criteria, navigation and deletion warnings from active flow contracts. Every earlier sharing/link/viewer decision in this file and older specifications is historical and superseded by this scope reduction.

Owner Result playback and MP4 download remain, including the previous finished version displayed during replacement rendering. Landing may propose truthful permitted demonstration/proof; selected assets and presentation remain pending prototype validation. Flow08 is also withdrawn, leaving12 active flow specifications with stable IDs.

## Landing proof and media

The prior no-video restriction is withdrawn by the later owner correction. Landing must explain the product, truthful intended result/value, user role/effort and next step, and interest a visitor. Truthful demonstration/proof and explanatory navigation may be explored; assets, representation, copy and composition require prototype validation. Synthetic fixtures are not genuine user-rendered results. No fabricated testimonials, usage metrics, prices, voice-cloning claims or unsupported promises are allowed.

## Registration email verification

Email/password registration uses a verification code delivered by email, entered on the registration screen. Registration cannot complete before successful verification. Do not replace this with a verification-link-only flow or automatically add both link and code alternatives. Use the current six-digit, ten-minute, sixty-second/five-sends-per-hour code rules and purpose binding below. Same-browser pending reload restores no password or new send; successful registration signs in and opens New dub. Password reset has separate purpose-bound proof under the same code parameters.

## Successful registration destination

After the user enters a correct registration verification code, complete verification/registration, establish the signed-in account session and open New dub directly. Do not require a separate success-to-sign-in step. Preserve the existing exactly-once eligible120-credit welcome grant rule; navigation must not be treated as proof of session or grant completion. Alternate return-intent and cross-device code-entry rules remain separate if not selected.

## Minimum password length

The owner selected a minimum password length of8 characters for both registration and password reset. No uppercase/digit/special-character classes are required. Maximum length, counting semantics and abuse/security mechanics remain explicit technical policy; do not invent stricter frontend rules. Registration and reset must use one consistent policy source.

## Session persistence

Preserve signed-in state across browser closure/reopen for30 days after successful sign-in. Explicit sign-out terminates it earlier, as do existing authoritative account/session revocation conditions. Do not choose browser-session-only login, add a mandatory Remember me choice or silently turn this into an indefinitely sliding activity-based lifetime. Expiry is anchored to sign-in under the selected wording; reauthentication behavior has its own flow. Backend session authority, not a client timer/local flag, establishes actual access.

## Reauthentication return destination

If a session expires during project work, successful reauthentication returns to the same valid project screen and restores its persisted state. Do not always route to New dub/My projects, and do not automatically replay processing authorization, charges, microphone recording or render creation. Access/deletion/current-state guards still apply; this answer is not permission to restore an invalid route or unsaved bytes as if durable.

## Owner clarification — verified registration precedes sign-in

Email verification is mandatory to complete registration. An unverified pending registration must not be treated by the frontend as a completed account that can sign in. Keep pending verification in the registration/code-entry flow; withdraw the proposed Sign-in branch that authenticates valid credentials and then presents an unverified completed account. This does not forbid internal pending-registration records or choose their backend representation. The owner did not select a general invalid-credentials error-copy alternative in this clarification; exact neutral error wording remains a separate shared-copy detail if not otherwise selected.

## Registration code format

The registration email-verification code is exactly6 decimal digits. Use the same code-format rule across input expectations and logical verification service validation. Expiry, resend/cooldown/attempt limits and lifecycle of earlier issued codes remain separate unanswered choices; do not infer them from the six-digit format.

## Registration code validity

A registration verification code remains valid for10 minutes after sending its email. The six-digit format remains unchanged. UI countdowns reflect service-provided expiry rather than establishing validity themselves. Repeat-send eligibility, attempt limits and handling of earlier codes when resending are not selected by this expiry answer.

## Registration code resend

Registration verification-code resend is available no earlier than60 seconds after sending, with at most5 sends per hour. The question explicitly specified that a new code replaces the previous one, and that replacement rule is part of the selected variant. Preserve six-digit format and10-minute validity. The service authoritatively supplies resend eligibility/remaining cooldown; client-clock changes must not bypass it. Exact rate-limit accounting window and invalid-code attempt limits remain technical policy details if not separately selected.

## Password-reset proof method

Password reset is confirmed using an emailed code entered in the application, like the registration interaction. Do not use a reset-link-only or link-plus-code flow. Use the exact shared code parameters with reset-specific purpose binding, then durably install the new password and establish the current-device session while revoking other sessions. The shared minimum new-password length remains8 characters.

## Password-reset code parameters

Password-reset code parameters match registration: exactly6 decimal digits, valid for10 minutes after email sending, resend no sooner than60 seconds, maximum5 sends per hour, and a newly issued code replaces the previous one. These are shared user-visible code parameters, not permission to use a registration code as reset proof or vice versa; purpose/identity binding remains authoritative. After successful reset, keep the current device signed in, revoke other sessions and use validated same-project return context or New dub.

## Session handling after password reset

After successful reset-code verification and durable new-password installation, establish a signed-in session on the current device and terminate all other sessions. Do not require a separate sign-in step or leave other pre-reset sessions usable. Session creation/revocation must be authoritative, not inferred from client navigation. The already selected30-day session lifetime governs a newly established current-device session; exact post-reset destination/return intent follows the applicable shared navigation contract or remains explicit if unresolved.

## Proof for linking login methods

Explicitly linking a second login method requires fresh confirmation of both the current account's existing method and the method being added. A merely existing long-lived session is not sufficient proof of the current method for this action. Do not silently choose new-method-only or risk-based conditional reauthentication. This selects the proof requirement, not exact proof freshness windows, provider mechanics or conflict/merge policy.

## Login-method ownership conflict

If the login method being added already belongs to another Dubbed account, block linking, explain the conflict and offer entry/recovery for the other account. Do not merge accounts, balances, project libraries or welcome-credit eligibility. An account-merging flow is excluded from this MVP. This choice does not authorize exposing another account's private identity or projects.

## Different emails on linked methods

Allow linking Google and email/password methods whose verified email addresses differ, after fresh proof of both the existing and added methods. Keep one canonical account/balance/library/grant history; do not create or merge a second account as part of linking. Adding the second method is not authorization to replace the existing method's email/password recovery destination. A method already bound to another account still triggers the confirmed no-link/no-merge conflict rule. Any separate primary/contact-email preference remains unselected if needed beyond these method identities.

## Account-deletion confirmation

Confirm account deletion through a confirmation dialog requiring the user to type УДАЛИТЬ. Do not additionally require password entry, Google reauthentication or a two-step combination for this selected frontend flow. Keep the existing authenticated-owner authorization and explicit project/recording/result deletion consequences; the typed word is not backend authentication. The English-locale confirmation token and case/whitespace matching details remain localization/interaction details if not otherwise selected.

## Authenticated password-change form

Account settings includes a direct Current password / New password form. Do not replace it with only a link to the forgotten-password reset flow. Forgotten-password recovery by emailed code remains available separately in Flow04. New-password validation uses the common selected minimum8 rule; do not create divergent minimum rules for this third password-entry surface. Additional confirmation fields, post-change session treatment and other unselected policy are not implied by the two-field form choice.

## Sessions after settings password change

After a successful authenticated Current password / New password change in Account settings, keep the current device signed in and terminate all other sessions, matching the selected password-reset session outcome. Do not force an extra current-device sign-in or leave the other sessions active. Session-rotation and lifetime accounting details must follow the shared authoritative session contract rather than being invented separately in this form.

## No login-method unlinking

The MVP allows adding/linking a second login method but provides no unlink/remove-method functionality. Do not add a Disconnect action, last-method removal flow or unlink confirmation. Existing explicit dual-proof linking and no-merge rules remain. References to unlink policy as a pending MVP product question are withdrawn, not permission for implementers to choose it.

## Recording turn navigation

Do not show a turn list during recording, either persistently or in a panel opened by a Turns button. Navigate turns using Back / Next only. Preserve the large moving-video hierarchy and existing acceptance/save behavior on Next. This replaces earlier proposals for direct turn-list selection during recording; it does not introduce a separate turn picker elsewhere.

## Audition of unaccepted replacement

When a new completed recording candidate exists but Next has not yet accepted it, My recording plays that new candidate so the user can evaluate it before acceptance. Do not force acceptance before audition and do not silently play the older accepted take instead. Preserve the older accepted take until its replacement is durably accepted. Background/overlapping-turn mixing and synchronized single-source playback remain applicable; the mandatory toggle presentation is superseded by direct Replay / Your take.

## Initial interface language and preference

On first use without a saved preference, select Russian for a browser language of ru and English otherwise. Allow manual English/Russian switching. After sign-in, persist the user's language choice in the account so the preference can be reused rather than independently guessed by each flow. Do not always default to English or Russian regardless of browser language. Apply this shared rule across landing, authentication and authenticated screens; exact preference reconciliation when an anonymous choice differs from an existing account preference remains explicit if required.

## Back with an unaccepted recording

Pressing Back to another turn while a new unaccepted candidate exists requires the same explicit three-way protection as leaving the recording screen: Save and go / Go without saving / Stay. Save and go accepts/saves the candidate durably before navigating to the previous turn; a save failure keeps the current turn and candidate available for retry. Go without saving discards that candidate while preserving any prior accepted take. Stay performs no navigation or acceptance. Do not silently accept, discard or retain the candidate and navigate without the selected prompt.

## Resuming unfinished recording

When Continue routes an unfinished project to recording, open the first turn without an accepted recording in the project's established turn order, rather than the last viewed turn. If that turn has an account-persisted unaccepted candidate, offer recovery without automatically accepting it. Existing rules route a fully completed recording project to Result.

## Shared typography

Use Mabry Pro as the frontend typeface, replacing the proposed system-font primary choice. Approved sizes: body text16px, supporting captions14px, page headings32px on desktop and24px on phone, and dialogue beneath the video16px. Do not introduce decorative display fonts or all-caps styling. Apply one shared typography contract across active flows. Font assets, available weights, fallback stack, line heights and exact responsive breakpoint must be specified or verified separately; this approval does not establish that licensed font files are already present in the repository.

## Phone recording controls

The former prescribed bottom-pinned panel is historical. The replacement phone and short-screen composition must be shown and validated; preserve safe areas, unobscured full dialogue/media, reachable actions and only Previous / Next turn navigation. No turn list is introduced.

## Signed-in phone navigation

Use a compact signed-in phone header: logo at left, credit balance and menu button at right. The menu contains New dub, My projects, Credits, Account, language selection and Sign out. No permanent sidebar. Keep this shared shell consistent across authenticated flows; the recording bottom action panel has a separate task-specific role. This answer does not authorize showing authenticated account actions to signed-out visitors.

## Public landing

The earlier title/description/120-credit/CTA content quota and closed header inventory no longer govern. Retain logo/home, locale access, Sign in, the truthful eligible one-time 120-credit offer, support contact and the guest registration / authenticated New dub destination. Useful explanation, demonstration or navigation is evaluated by purpose and truth rather than a section-count/template requirement. Final header and content hierarchy remain unapproved pending design checkpoints.

## Dedicated microphone check

Provide a separate microphone-check screen before recording rather than handling first permission exclusively inline on the recording screen. Do not automatically start a timed dialogue take when browser permission is granted. The check screen's controls, test-recording behavior, completion gate and revisit frequency require explicit follow-up; this answer alone does not approve device selection or a mandatory rehearsal.

## Microphone-check controls

The separate microphone-check screen includes microphone selection, an input-level indicator, Record test / Stop / Listen controls and Continue to dubbing. The test recording is not a dialogue take, does not accept a turn, does not lock AI reprocessing and consumes no credits. Device-list availability must reflect browser capabilities rather than invented devices. Mandatory test completion, revisit frequency and test-recording retention are not established by this controls-selection answer.

## Optional microphone test

Recording and listening to a microphone test is optional. Continue to dubbing is available once microphone access and a usable input are ready; do not require a completed/listened-to test as an additional gate. Do not treat an input-level threshold as an approved mandatory gate. Permission-denied or unavailable-input states must offer recovery rather than pretending readiness.

## Microphone-check revisit frequency

Show the separate microphone check on first recording entry per device; later contextual microphone recovery remains available when needed, rather than setup on every project entry. The former mandatory normal-workspace Microphone button is superseded by the 2026-10-26 correction. Settings reconfiguration location and safe return remain unresolved. A remembered check never bypasses current permissions/readiness or starts capture; device-local bookkeeping is not account-wide readiness.

## Temporary microphone-test recording

Microphone-test audio is temporary browser-local data only, removed when leaving the microphone-check screen. Do not upload it to the account, persist it for later sessions or expose it as a project take/recoverable candidate. Account-persisted recovery of real dialogue candidates remains unchanged. A subsequent visit starts without the previous test recording.

## Explicit pre-sign-in language precedence

An explicit manual language choice made before sign-in takes precedence over a different saved account preference. Keep that chosen interface language after sign-in and update the account preference accordingly. Browser-derived initial language is not an explicit manual choice and must not be treated as consent to overwrite an existing account preference. Apply the same reconciliation rule across landing, authentication and account settings.

## Return from Result to completed recording

When all turns already have accepted recordings, Return to recording from Result opens the first turn in established order. Preserve all accepted recordings and use Back / Next to move between turns; do not add a turn list or start on the last turn. This differs from Continue for unfinished work, which targets the first turn without an accepted recording. Merely opening recording does not invalidate takes or start capture/rendering.

## Rebuilding after revising a completed project

When revisiting a fully recorded project, accepting a replacement with Next keeps the user in recording and advances normally, allowing multiple turns to be revised. Do not automatically route to Result/render after every replacement merely because every turn has an accepted take. Provide To result to start assembly of the updated accepted recordings. The previously approved automatic assembly after completing the initial required recording sequence remains; this answer specifically governs revision of a completed project. Preserve the previous finished result until a valid replacement render succeeds.

## To result with an unaccepted candidate

To result with a new unaccepted candidate opens Save and go / Go without saving / Stay. Save and go durably accepts the candidate before navigation; save failure stays on recording with retry available. Go without saving discards the candidate while preserving any older accepted take. Stay does not navigate or accept. Rendering uses accepted recordings only and remains gated on an accepted recording for every required turn; discarding a candidate cannot bypass this gate. Preserve the completed-project revision rule: replacements may be accepted sequentially before explicitly returning to Result to assemble the update.

## Shared responsive grid

Below768 CSS pixels use the mobile menu, a single-column layout and the approved phone dimensions/gutters. At768 CSS pixels and above use the regular top navigation and approved desktop dimensions/gutters. Working content has a maximum width of1200px; sign-in and registration forms have a maximum width of400px. On narrower screens forms use the available width inside page gutters rather than overflowing. These shared constraints apply consistently across active flows; media keeps its source orientation and the approved recording hierarchy.

## Shared form errors

Show field-specific validation errors directly beneath the affected field. Show service-level errors above the primary action button and preserve entered values when the request fails. Invalid email/password sign-in uses one neutral message: Incorrect email or password (Russian: Неверный email или пароль). Do not introduce separate unknown-account versus wrong-password sign-in messages. Apply the placement and value-preservation rule consistently across forms; it does not authorize persisting passwords/codes beyond their active form lifecycle or retaining them after successful completion.

## Project-deletion confirmation

Deleting an individual project uses a standard confirmation dialog showing its name, warning that its video and recordings will be deleted, and Cancel / Delete project actions. No typed confirmation word is required for a project. The typed УДАЛИТЬ confirmation remains specific to account deletion. Existing deletion rules still apply: free the project slot, do not refund delivered processing, and preserve correct handling of any chargeable in-flight work. No public-link warning is applicable because public sharing is excluded.

## Inline project renaming

Rename a project by editing its title inline in its My projects list row. Do not open a separate rename dialog. Preserve the default filename-without-extension naming rule until renamed. The inline edit's commit/cancel interaction and validation constraints must be specified consistently rather than inferred from the rejected dialog proposal.

## Inline rename autosave

Inline project-title edits save automatically on leaving the field (blur). Do not require explicit Save / Cancel buttons from the rejected proposal. This answer selects blur autosave only; it does not independently approve Enter/Escape semantics or additional validation constraints. Preserve the entered title and actionable error state on a failed save, following the approved shared form-error preservation rule, while keeping the last successfully persisted name authoritative until success.

## Background assembly without cancellation

Result assembly continues in the background when the user leaves its screen. Provide no Cancel assembly control in the MVP. Navigation away does not cancel or restart the job, discard recordings or prevent later retrieval of its finished result. Keep preparation-processing cancellation distinct: its separately approved cancellation and credit rules are unchanged. Account/project deletion still follows its own authorized lifecycle and must not be presented as an assembly-cancel shortcut.

## Pending payment confirmation

When authoritative payment confirmation has not yet arrived after checkout, show Confirming payment and automatically refresh/reconcile its status. Do not grant credits or the purchased-project-slot entitlement until verified success. The user may leave the page; the pending purchase remains visible in the unified history. Mark it pending rather than a posted credit movement, and do not fabricate a new balance-after entry before settlement. A checkout return alone is not proof of payment; do not claim money was received without authoritative evidence. Existing successful-purchase return-to-upload behavior remains.

## Available balance and processing reservation

The main credit-balance number represents available spendable credits after active reservations. On Credits show reserved credits separately as In processing. Example:120 posted credits with40 reserved displays80 available and40 in processing. A reservation is not a final posted charge. Show the final processing charge only after authoritative settlement and release any unused reservation under the approved success/failure/cancellation policy. Use the same available-balance meaning in the header, quotes and insufficient-credit checks.

## Empty project library

An empty My projects library shows only No projects yet and the New dub action within the normal shared shell. Do not add demonstration projects, a guided onboarding tour or an extra step-by-step tutorial. The action opens the normal New dub flow, with existing slot, validation and processing-credit rules unchanged.

## Upload cancellation without transfer resume

Allow cancellation of a file transfer before validated project creation. MVP does not resume partial uploads: after leaving/closing the page or an interrupted connection, the user selects the file and uploads it again. Do not claim an unfinished transfer is a durable project or offer byte-range resume as an approved feature. Validated saved projects retain their existing automatic-draft and slot behavior. Uploading itself does not authorize AI processing or its credit charge. Partial-object cleanup and cancellation-versus-validation races require technical handling without silently deleting an already committed project.

## Exhausted project slots

When project capacity is exhausted, New dub shows the current limit and Manage projects leading to My projects for owner-selected deletion. New upload is unavailable until capacity is freed or increased. For an account that has not yet purchased credits, also explain that the first successful credit purchase permanently increases capacity from2 to10. Do not auto-delete projects, replace an existing project or treat checkout initiation as an entitlement increase. Capacity must still be checked authoritatively at validated project creation to handle concurrent changes.

## No out-of-app completion notifications

Do not send completion emails or push notifications for video preparation or result assembly in the MVP. The user checks authoritative job/project status after returning to the application, including My projects. Leaving the application does not stop the approved background jobs. This exclusion concerns job-completion notifications only; required registration verification and password-recovery emails remain in scope.

## Single-device project recording

Only one device may record a given project at a time. Do not allow simultaneous project capture on multiple devices or silently resolve competing takes through last-write-wins. The owner's free-text answer selects exclusivity only; it does not approve a takeover button, forced interruption of active capture, or device-identifying information. Handoff/release behavior is being clarified separately, and viewing or navigating a project is not itself permission to steal recording ownership.

## One recording tab per project

At most one browser tab may own recording access for a project at a time, including same-profile tabs that share the existing signed-in durable client/session. A second same-project tab may view the project but cannot capture or accept a turn, and cannot force takeover. This decision does not change authentication or durable client/session identity; it adds same-profile-tab exclusivity to the existing one-device-per-project rule. Production lease timing, disconnect classification and fencing remain unapproved technical evidence.

## Release recording before device switch

To continue project recording on another device, first leave recording on the current device, then enter it on the other. Provide no forced takeover or Continue here action that revokes another active recording session. Preserve the existing unaccepted-candidate exit confirmation and durable-save requirements before completing an explicit exit. A second device cannot begin capture while the first retains recording ownership. Crash/disconnection recovery and stale-ownership release must be defined separately so exclusivity cannot permanently strand a project; no arbitrary timeout is selected by this answer.

## Recording ownership recovery after disconnect

Automatically release exclusive project-recording access after authoritative confirmation that the owning device has lost its connection. A returning device must recheck/reacquire recording access before starting another capture; it cannot rely on a stale ownership state. Do not require support intervention or provide forced takeover of an active owner. Exact heartbeat/lease timeout, interruption handling and stale-write fencing remain technical service-contract details, not owner-approved constants. Preserve account-persisted candidate recovery and the distinction between durable audio and bytes never uploaded before a crash.

## Visible reprocessing action in recording

Keep Process again discoverable as a secondary workspace utility; the later owner correction removes the mandated standalone button/outer-row placement. Before the first durably accepted take it follows the existing retry eligibility and shown free/paid authorization rules. After that first acceptance it remains unavailable with an explanation of the permanent project-level lock. Do not confuse an unaccepted recoverable candidate or microphone test with an accepted take. This placement does not restore Prepare or manual editing, and does not authorize reprocessing without showing its applicable cost or entitlement.

## Reprocessing with an unaccepted draft

Before eligible reprocessing when an unaccepted recording draft exists, explicitly warn that a successful replacement preparation replaces the segmentation and deletes that draft. Require confirmation before launch; include the applicable free-retry or paid cost information. Preserve the previous preparation and its draft until the replacement succeeds; system failure leaves both available. Do not block reprocessing merely because an unaccepted draft exists, silently discard it at launch or reinterpret it as the first accepted-take lock. This is logical draft replacement; physical cleanup timing remains a separate technical policy.

## Zero-turn reprocessing preserves usable preparation

If a completed reprocessing run finds zero turns while a previous preparation has turns, preserve that previous segmentation and its unaccepted draft. Notify the user that the new run found no dialogue instead of replacing usable recording state with an empty result. This is an exception to replacement on successful reprocessing: replacement must yield usable nonempty turns before deleting the previous draft. The zero-turn run remains completed processing under existing charge and successful-retry-consumption rules; this answer grants no refund or extra retry. Initial zero-turn processing without a prior usable preparation still shows No dialogue found with eligible retry/another-video actions and cannot enter recording or Result.

## Password composition

Use the previously approved minimum8 characters without mandatory uppercase letters, digits or special characters. Apply this same composition rule to registration, password reset and authenticated password change. Do not add client-side character-class requirements independently in any flow. Maximum length, Unicode/counting semantics and server-side abuse controls remain separately specified technical policy; this answer does not approve arbitrary rejection of ordinary passphrases.

## Registration form fields

Registration offers Continue with Google as well as email/password registration. The email form contains email and a single password field with a show/hide control; there is no repeat-password field. Required emailed-code verification remains the next step for email registration. Do not interpret this email-form simplification as removal of Google authentication or as a change to the already selected linking/conflict and verification rules.

## Repeated new password during recovery

After password-reset email-code verification, require New password and Repeat new password fields. Do not reuse registration's single-password-field layout for reset. Check that the repeated value matches before submitting installation of the new password; mismatch is a field-validation error under the shared form-error rule. Keep the common minimum8/no-required-character-classes policy and the approved post-reset current-device sign-in/other-session revocation outcome. Authenticated settings password-change field count remains governed separately by its confirmed Current password / New password form.

## Default destination after password reset

After successful password reset and automatic current-device sign-in, open New dub when no valid preserved project return context exists. Where a valid project-return context exists, retain the approved return to its persisted screen/state without replaying processing, capture, billing or assembly commands. Do not default to My projects or require a separate sign-in after reset.

## Correcting registration email

The registration code-entry screen provides Change email. It returns to the email-registration form, requires the password to be entered again and sends a new verification code to the corrected address. The previous code is no longer valid. Do not require restarting from the initial entry screen or carry the password silently into the changed-identity request. Registration still completes only after verification of the corrected address under the approved code parameters. No completed account, welcome grant or signed-in session is created from the abandoned pending identity. Server ordering and rate-limit accounting must prevent reuse of the invalidated code without inventing new product limits.

## Neutral password-reset request response

For any syntactically valid email submitted to password recovery, show the same response: If an account with this email exists, we sent a code, followed by the code-entry interface. Do not expose Account not found or a different request-success presentation based on account existence. This neutral response is not evidence of actual delivery, eligibility or a verified reset context. Keep syntax validation and actionable transport/service errors distinct, without using them to disclose account existence. Password installation still requires authoritative valid purpose-bound proof.

## Six-cell automatic code verification

Use six visual code-entry cells for both registration email verification and password reset. Automatically submit verification when the complete six-digit value is entered; do not require an additional Confirm button. Support whole-code paste as one logical code value, including automatic verification when all six digits are present. Keep accessible naming, keyboard editing and focus behavior consistent across both flows. Guard duplicate/in-flight submissions and reconcile uncertain outcomes rather than verifying the same unchanged value repeatedly during rerenders. Existing format, expiry, resend and purpose-binding rules remain unchanged. Exact incorrect-code recovery and focus behavior after rejection remain to be specified; this selection does not approve auto-clearing or endless retry loops.

## Incorrect-code recovery

For registration and password-reset verification, an authoritatively incorrect code remains visible in the six cells. Show its error beneath the cells and select the code for replacement. Do not clear the cells automatically. Automatic verification may run again only after the logical code value changes and is complete, not repeatedly for the unchanged rejected value. Preserve whole-code paste, keyboard editing and accessible error association. Distinguish a known incorrect-code response from an unknown/network outcome: this decision does not authorize treating a timeout as invalid proof or automatically spending repeated verification attempts.

## Automatic same-email Google linking

When Google authentication uses the same email as an existing email/password account, automatically link that Google identity to the existing account and sign in to that account. Do not require an additional password proof or a detour through Account settings for this same-email entry case. This explicitly supersedes the earlier blanket dual-proof requirement for this case only. Preserve the canonical account, balance, projects and one-time welcome-grant history; do not create or merge a second account. The previously confirmed explicit dual-proof flow for manually linking different-email methods remains. An already-bound Google identity belonging to another account remains subject to the no-merge/conflict rule. The identity service must validate Google authentication and email assertions authoritatively; client-entered emails are not identity proof. Reverse email/password registration against an existing Google account is not selected by this answer and requires separate clarification.

## Adding password through same-email registration

When an existing Google-only account's email is used in email/password registration, successful purpose-bound email-code verification adds the requested password method to that existing account. Keep its canonical account, project library, credit balance and welcome-grant history; do not create a second account or grant another welcome allowance. Do not require a detour through Google sign-in and Account settings for this same-email case. This supersedes the prior blanket fresh-proof-of-both-methods requirement for this entry case only, retaining code verification before password installation. It does not authorize overwriting an already existing password, merging separate accounts or bypassing explicit different-email linking. Registration against an account that already has a password remains a separate collision/recovery case.

## Registration collision with an existing password

When email/password registration targets an account that already has a password, show Account already exists with Sign in / Reset password actions. Do not install or overwrite a password through repeat registration, create another account or issue another welcome grant. This deliberately selected registration disclosure does not change the neutral password-reset request response or the neutral incorrect-email-or-password sign-in error. The separate same-email Google-only registration case still adds a password after valid email-code verification under its approved contract.

## Localized account-deletion confirmation token

Account deletion requires DELETE in the English interface and УДАЛИТЬ in the Russian interface. Compare the entered confirmation word without case sensitivity and ignore leading/trailing whitespace. Do not require another password or Google proof for this selected confirmation interaction; authenticated-owner authorization remains required. This resolves the previously open English token and case/edge-whitespace handling. Project deletion still uses ordinary button confirmation without a typed word.

## Destination after account deletion

After authoritative successful account deletion, terminate all of that account's sessions and open the signed-out landing with an Account deleted confirmation. Do not automatically sign in, recreate an account or route to an extra standalone deletion-success page. Failed or unknown deletion outcomes must not be presented as completed deletion. Existing project/media access revocation and separately specified physical cleanup/accounting retention remain applicable.

## Ordinary sign-out scope

The ordinary Sign out menu action ends only the current session and returns to the signed-out landing. Other devices remain signed in. If a dialogue candidate is unaccepted, resolve the existing Save and leave / Leave without saving / Stay guard before completing sign-out; failed saving stays and permits retry. This does not alter all-other-session revocation after password reset/change or all-session revocation after account deletion. Explicit exit must release any owned recording access under its existing lifecycle.

## Project-title validation

For project renaming, allow duplicate titles, require a nonempty title after trimming leading/trailing whitespace and limit the title to100 visible Unicode grapheme clusters. A rejected rename preserves the last successfully saved title and shows a field-associated error. Preserve the editable attempted value for correction under the shared form-error rule; do not treat it as persisted. Inline blur autosave remains the approved commit interaction. Client and service use the same `Intl.Segmenter` grapheme-counting rule. This rename limit does not silently define how to shorten an initial filename-derived title exceeding100 grapheme clusters.

## Long initial filename-derived project title

At project creation, derive the title from the uploaded filename without its extension and, when longer than100 grapheme clusters, use the first100 grapheme clusters as the project title. Do not rename or modify the uploaded source file. Apply the same `Intl.Segmenter` rule as rename validation rather than splitting encoded bytes. This resolves the initial-title length exception; filename normalization and an empty-stem fallback remain technical edge handling if needed.

## Desktop recording action placement

The former always-below-waveform desktop placement and prescribed phone pinning are superseded. The owner-directed contextual right panel and centered video/dialogue/bounded-waveform structure are prototype targets, not approved final anatomy. Keep source component identity and current tokens while validating long dialogue, varied ratios and short screens.

## Inline title keyboard actions

During inline project-title editing, Enter saves the title and finishes editing on successful persistence; Escape cancels the current edit and restores the previous saved title without saving. Ordinary blur still autosaves under the existing rule. Prevent Escape-triggered blur from committing the cancelled edit, and prevent Enter plus blur from submitting the same change twice. Validation/save failure retains the attempted editable value and field error rather than falsely finishing a successful edit. Apply the confirmed trim/nonempty/100-grapheme-cluster/duplicate-title validation consistently.

## Result assembly progress without ETA

During result assembly, show a progress bar and percentage when the service supplies a trustworthy percentage. Before such a value is available, show Assembling video… without a fabricated numeric progress value. Do not display estimated remaining time. If a previous finished result exists, keep its player below the new assembly progress with the approved Previous version label. This governs Result assembly presentation, not the separately approved preparation progress/current-stage contract.

## Finished-result player and actions

The owner result player exposes play/pause, seeking, time, volume and fullscreen. Beneath it place Download MP4 and Return to recording. No audio-track selector, subtitle controls or additional export settings are provided. Retain applicable assembly-error recovery controls only in their already approved error states; this normal finished-player composition does not remove Repeat assembly. All download and return destinations retain their established authorization, generation and first-turn contracts.

## Retry failed MP4 download

When an app-observable MP4 download request fails, show the error beside its download action and allow retry of the same finished generation. Do not trigger a new assembly or charge credits for that retry. Preserve the finished player and existing accepted recordings. If delivery authorization expires, the service may refresh access to the same asset rather than treating expiry as a missing render. Do not claim visibility of an operating-system save failure that the browser cannot report or claim successful local saving from request initiation alone.

## Navigating past an unrecorded turn

The former empty-turn Next permission is superseded. Normal Next cannot leave a turn without a usable compatible accepted take; with a candidate it first durably accepts that exact candidate, while failure/unknown outcome retains the turn for recovery. A revisited accepted turn may advance without a new candidate. Navigation alone changes no take/count/credits/lock. Legacy/interrupted projects with gaps still resume at the first unfinished turn and retain missing-take recovery; no incomplete export or new gap creation is permitted.

## Recording end with missing takes

For legacy/interrupted projects or reconciled incomplete state with missing accepted takes, show Remaining turns to record: N and a First unrecorded turn action. It opens the first turn without an accepted recording in established order, without displaying a turn list. Result assembly remains unavailable until every required turn has an accepted compatible recording. Count missing accepted recordings rather than treating navigation or unaccepted drafts as completed performances. Preserve the normal candidate acceptance/save guard before any transition that would leave an unaccepted take. This remains a legacy/interrupted/reconciled-state recovery, not permission for normal Next to create gaps.

## Initial assembly after filling the final gap

The first transition to a fully accepted compatible set of required recordings automatically starts initial result assembly and opens Result, even when the final missing take is accepted in the middle of the turn order after returning to skipped turns. Do not require traversing again to the final turn or a separate initial To result click. The trigger follows durable acceptance and authoritative all-turn eligibility, not capture completion, draft upload, navigation or mere local counts. Completed-project revision remains distinct: accepting replacement takes stays in Record and To result explicitly requests updated assembly. Keep idempotent operation reconciliation and previous-result preservation.

## Project opening counts as recent activity

Opening an owned project counts as project activity and moves it up the most-recent-activity project order, even without editing or recording. Do not restrict activity updates to mutations such as processing, accepted-take saving, renaming or assembly. Opening My projects itself is not opening every project and must not touch every row. Exact authoritative timestamp/tie-breaking and observation/reload deduplication remain technical contract details rather than independently chosen client ordering.

## Background completion does not steal navigation

If the user has left a project's processing or assembly screen for another section/project, completion updates its authoritative project/job status but does not redirect the current page. The user opens the finished project explicitly. Automatic completion handoff applies only while the user remains on the screen for that matching operation/project and its valid lifecycle; stale observer callbacks cannot navigate a different current screen. Keep preparation success to Record (with applicable microphone readiness flow) and Result readiness presentation within their owning screens. This does not introduce completion emails, push notifications or mandatory new notification UI.

## Credit-history pagination and scope

Credits uses one unified activity feed initially showing the20 most recent operations and a Show more action for older operations. No filters, search or history export/download tools in the MVP. Preserve balance-after information for each completed posted operation; pending purchases remain distinctly pending without a fabricated posted balance. Maintain the existing welcome/purchase/charge/return families and account ownership. Page/cursor mechanics and stable ordering under concurrent updates must be defined by the service rather than guessed separately by each adapter.

## Phone capture on backgrounding or screen lock

When the user backgrounds the phone browser or locks the screen during dialogue capture, stop the attempt rather than intentionally continuing background capture. Offer any actually captured recoverable partial audio as an unaccepted draft on return, with listening and rerecording available. Never automatically replace an accepted take or mark the interrupted attempt accepted. Preserve earlier accepted recordings and any protected prior candidate when no usable replacement is available. Do not promise recovery of bytes the browser never delivered or cross-device durability before account/media persistence succeeds. Return does not automatically resume capture or reference playback. Existing readiness, exclusive-device ownership and explicit acceptance requirements remain.

## Omit Bold typography

Use Mabry Pro Regular and Medium only, with no Bold or synthetic Bold. The current common presentation contract defines selected weights, line heights and type roles; no alternate weight proposal remains pending.

## Final shared weights and line heights

Use the current common presentation roles: Mabry Pro Regular/Medium only, body/dialogue Regular16px/24px, captions Regular14px/20px, labels Medium14px/20px and the defined desktop/phone action and heading roles. A new dialogue/landing type role is a reviewed prototype/token gap rather than an arbitrary local value.

## Shared spacing scale

Use8px between closely related elements,16px between form fields/buttons,24px between blocks within a screen and32px between major sections. Internal panel padding is24px on desktop and16px on phone under the approved768px breakpoint. Existing page gutters remain32px desktop/16px phone and are not replaced by panel padding. This resolves the common spacing scale across active flows; it does not authorize wrapping every block in a panel or adding decorative cards. Preserve the approved flat treatment and media-first recording hierarchy. Screen-specific geometry not implied by these roles remains explicit rather than independently guessed.

## Preparation queue and unknown progress

While preparation is queued, show Queued. After execution starts but before a trustworthy overall percentage is available, show the authoritative current-stage name without a fabricated percentage. Once the service supplies trustworthy overall progress, show one overall bar with its percentage and current stage. Do not show estimated remaining time. Queue/run/stage distinctions must come from authoritative job state, not elapsed client time. This resolves presentation of missing preparation progress and the ETA choice; technical progress weighting, stage taxonomy and update transport remain separately specified.

## Free server-compatible upload preview

If the browser cannot directly play an uploaded source but the server supports inspecting/processing it, the server prepares a browser-compatible preview without spending preparation credits. Let the user select the source section using that preview rather than requiring external manual conversion. This preview work is distinct from paid AI preparation and does not automatically authorize it. Preserve source identity, duration/orientation and selected-section timeline mapping; the original supported source remains authoritative. Show truthful preview-pending/error/retry states, and do not claim that a file unsupported by both server and browser is accepted. Actual codec support, conversion pipeline, timing, operational limits and recovery mechanics still require service/media evidence. Existing validated-project slot/draft rules remain; this answer does not move the slot-commit boundary.

## Source replacement before first AI run

Before the project's first AI preparation run is launched, offer Replace video within the same project. A newly uploaded source replaces the previous source only after successful validation; failed validation preserves the previous file. Reuse the project and its single occupied slot rather than requiring another slot. Reinitialize section selection using the approved whole-video-or-first120-seconds default and obtain a fresh source-bound credit quote; invalidate the old source's selection/quote for authorization. Do not authorize processing automatically or spend credits for the replacement/preview itself. Source replacement after a first preparation launch is not approved by this action; existing retry and permanent first-accepted-take rules must not be bypassed by replacement. Project-title treatment on replacement is a separate question.

## Project title after source replacement

On successful eligible pre-processing source replacement, regenerate the project title from the new filename only while the title is still automatically assigned. Preserve a title the user has manually renamed. Apply the existing filename-extension removal and first100-grapheme-cluster rule to a regenerated automatic title. Failed replacement changes neither source nor title. Track title provenance authoritatively rather than guessing manual ownership from whether the text happens to match a filename. This answer does not grant source replacement after the first AI run launch.

## Source-section selection controls

New dub provides both draggable start/end handles on the source-section timeline and editable Start / End time fields. Both representations control one selected source interval and remain synchronized; neither creates a separate independently billable range. Preserve keyboard/touch alternatives and the approved default and at-most120-second selection rule. This is source-section selection before processing, not a return of turn-level timing correction or Prepare. Exact visible time precision, minimum range and invalid-range behavior still need a shared contract where not already settled.

## Hard two-minute selection limit

Enforce the maximum120-second source-section interval within both timeline interaction and Start/End field editing: the user cannot establish a selected interval longer than two minutes through either control. Do not rely only on a later processing-button error or backend rejection while treating an overlong interval as valid selection. Keep both representations synchronized to the same admissible range and preserve source bounds. This answer chooses a hard selection constraint, not authorization to silently move the other boundary, launch processing or charge for a different interval. Transient text-entry validation and precise boundary interaction must consistently enforce this invariant without inventing a second selection state for quoting.

## New dub composition boundary

Keep upload/preview/section controls/quote/authorization on the same page. Exact composition remains subject to prototype validation; no unapproved one-column or side-summary arrangement is selected. Preserve synchronized timeline/time fields, the hard 120-second limit and all settled upload rules.

## Reject sources without an audio track

Reject a source that has no audio track during upload validation, with No audio in this video — choose another file. Do not launch AI preparation, spend preparation credits or commit a new project slot for that rejected source. During eligible source replacement, preserve the already existing project/source/slot under the failed-validation rule. Distinguish absent audio tracks from an existing audio track with no detected dialogue: the latter retains its separately approved completed-processing charge and zero-turn recovery policy. Do not add silent-video voiceover mode or manual turn creation. Actual media inspection is authoritative; a browser playback problem alone does not prove absence of an audio track.

## Selected source-section duration limits

The selected overall source section is at least 1 second and at most 120 seconds inclusive, using the canonical 0.001-second interval. This is distinct from original source-file eligibility and is not a minimum generated-turn or microphone-take duration. Usable interrupted partial takes remain governed by Flow 09.

## Explicit navigation wins at first complete recording set

When saving through Back, Save and leave, Sign out or another explicit navigation guard accepts the final missing take and completes the initial compatible accepted set, start initial assembly in the background while completing the user's requested navigation. Do not replace that destination with Result. Ordinary Next accepting the final missing take still starts initial assembly and opens Result automatically. Preserve successful-save-before-navigation, failed-save-stays, sign-out scope, recording-ownership release and all-turn eligibility. The assembly trigger must be durably recorded before the completed exit makes its initiation unrecoverable; backend transaction/idempotency design remains technical. This resolves independent review finding MEDIA-R02 without changing completed-project revisions, which still require explicit To result.

## Same-browser code-entry recovery after reload

For pending email registration and password reset, reloading the page in the same browser restores the code-entry screen and selected email through an authoritative pending-flow reference. Do not automatically send a new email on reload. If the code has expired, offer an eligible explicit new-code request under the existing resend rules. Do not persist the password in browser storage or infer successful verification from restored client state. Restoring the screen is not account/session completion. Pending code-entry context is not transferred across devices: start a new purpose-bound request under the same send rules. Cleared-browser-data and longer retention mechanics remain open.

## New authentication-code request on another device

Pending registration/password-reset code-entry context is not transferred across devices in the MVP. On another device, start a new request for that purpose and identity under the already approved resend/rate limits. A newly issued code replaces the previous code under the existing rule; changing devices must not bypass those limits. Do not complete a pending flow merely from an email address or a code without its authoritative matching context. Same-browser reload recovery remains approved. Existing accounts, projects and account-owned dialogue drafts retain their separate cross-device behavior.

## Millisecond source-section precision

Use one canonical 0.001-second source interval across timeline handles, Start/End fields, saved state, quote, authorization and output. Floor the source end to milliseconds:12.3456seconds becomes12.345seconds;12.34 is representable as12.340. Preserve inclusive1–120-second selected-range bounds, no frame-by-frame editor and one ceil(total selected seconds) quote. Internal media alignment must not extend source bounds or change the visible/authorized interval.

## Original-source duration eligibility

Reject an original video source shorter than1.000 seconds during upload validation before a new project/source commit or eligible source replacement; exactly1.000 seconds is eligible. Initial rejection creates no project, capacity/slot mutation or persisted source-media object and has no quote or credit effect. A rejected replacement preserves the existing project, source, title/provenance, selected section, quote, occupied slot, media and credit state. This original-file eligibility rule is separate from the 1–120-second selected source-section bounds and is not a minimum generated turn or microphone take; usable interrupted partial takes remain governed by Flow 09.

## Re-registration after account deletion

Allow a person to register again using the same email or Google identity after account deletion, but do not issue another120-credit welcome allowance for that returning identity. Create a new account under the ordinary registration/verification contract; do not restore the deleted account, its projects, recordings, results or prior credit balance. Preserve the distinction between the returning identity's welcome-grant eligibility and current account data. Exact minimal identity/eligibility records and financial/security retention must be defined in technical/privacy policy; this decision does not authorize restoring deleted product data or promise immediate erasure of every legally retained record.

## Button and field-label type sizes

Button text, field labels and control heights follow the current role-specific common presentation contract. Field labels are Mabry Pro Medium14px/20px; phone action labels remain Medium16px/24px with48px targets. No obsolete uniform desktop label/height rule applies.

## Account deletion with purchased credit balance

Warn about remaining purchased credits in the account-deletion confirmation and allow deletion without requiring the user to spend the balance or finish a refund request first. Refund requests are handled separately; account deletion itself does not automatically initiate a refund. Do not imply that deletion waives refund rights or that a refund is guaranteed. Preserve the selected localized confirmation word, all-session revocation and signed-out landing on successful deletion. A later new account does not restore the deleted balance. Refund eligibility, money amounts, retained financial/identity records, contact channel and legal/provider obligations remain a separate policy/service contract before live payments; this owner choice resolves the frontend deletion gate, not those policies.

## Payment/refund support email

Provide an ordinary support-email link for payment/refund enquiries on Credits and on the signed-out landing. It must remain available without sign-in, including after account deletion. No embedded chat, support-request form or ticketing workflow in the MVP. Use `dystrophyless@gmail.com`. Keep this contact available within the purpose-led public page; it imposes no content or explanatory-navigation quota. Opening the email link is not proof that a message was sent or that a refund request was received/approved. The address decision does not settle refund eligibility or other financial policy.

## Cancelled or failed checkout destination

After an authoritatively cancelled or failed payment, return to Credits with its safe reason/status, a deliberate purchase-retry action and Return to video when a preserved New dub origin exists. Keep the selected video/range intact; do not launch preparation or grant credits/capacity from cancellation/failure. Verified success still automatically returns to the preserved video with refreshed balance/quote and no automatic processing. Unknown/pending payment outcomes remain reconciliation states, not failure proof or permission for blind replacement purchase. Do not claim the provider reversed money or made no external charge without authoritative accounting evidence.

## One-shot recorded-take audition

Own-take audition plays once, then stops on the same turn. Repeat requires another explicit playback action; no automatic looping or advancement/acceptance follows audition completion. Keep the shared video/audio timeline, selected source, draft-versus-accepted take preference and existing mixing rules. This answer concerns recorded-take audition; it does not independently choose looping behavior for the original-reference preview.

## Capture always starts at turn-window beginning

Record always starts the current fixed turn window at its beginning, including the approved margins, regardless of the audition playhead position. Reset the reference video/audio position to that beginning and start microphone capture under the existing synchronized-readiness contract. Do not record only the remaining tail after an audition seek. Keep no countdown, the fixed maximum duration, no manual dialogue Stop and independent reference-volume behavior; browser/device interruption recovery remains available.

## Record supersedes active audition

Activating Record while Original or My recording audition is playing stops that audition and begins capture from the fixed turn-window start once microphone/reference readiness permits. No separate user Stop action is required first. Do not run competing audition and capture playback streams. Preserve the prior accepted take and protected candidate under the existing successful-recapture/acceptance rules; pressing Record is not deletion or acceptance. If readiness fails, show the recoverable input/media state without claiming capture began.

## Audition-source switching restarts playback

Switching Original / My recording during audition restarts the selected source and synchronized video from the beginning of the fixed turn window rather than preserving the prior playhead position. The waveform reflects the selected source. Keep source switching unavailable during active microphone capture under the existing action restriction. This answer selects active-audition switching behavior; it does not silently choose autoplay on a paused or never-played turn.

## Audition source switch while paused

When audition is paused, switching Original / My recording selects the new source and moves the synchronized playhead to the fixed turn-window beginning while remaining paused. Playback requires an explicit audition action; a source-only change is not playback authorization. Preserve the separately approved active-playback source switch, which restarts the new source from the beginning and continues playing. No source switch accepts, deletes or records a take.

## Recording and Result contract

[Flow 09](09-record.md) defines current capture, audition, candidate, sequential-navigation, partial/zero-data and draft-safety rules. [Flow 10](10-result.md) defines immutable assembly authorization, revision generations, playback and download. Browser/device interruption recovery and the optional microphone-test Stop remain separate from dialogue capture; this document does not claim executed verification.
