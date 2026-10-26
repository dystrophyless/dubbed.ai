# Flow 15 — Account settings, sign-out, and account deletion
Date: 2026-10-26 (Asia/Qyzylorda).
Status: synchronized specification draft; named operational policies remain OPEN
Mode: specification only; no product implementation, mockup, browser run, or verification is authorized or claimed

## 1. Authority and scope
This flow follows [the shared frontend contract](00-shared-contract.md), the latest owner answers recorded there, [SPEC-001](../specifications/SPEC-001_dubbed_mvp.md), and [BR-001](../business-requirements/BR-001_custom_video_dubbing.md) where later decisions have not replaced them.
The screen lets an authenticated account owner:

- switch the product interface between English and Russian;
- inspect the Google and email/password methods associated with the account;
- continue to the established verification, reset, or verified-linking flows when applicable;
- sign out; and
- start confirmed self-service account deletion.
This flow does not add profile editing, a display name, avatar controls, notification preferences, appearance preferences, or unrelated settings.
It does not restore Prepare, manual transcript/timing/speaker editing, missed-line addition, or background audition.
It provides no sharing control, public-link setting, share token, public viewer, or public route. Result access remains owner-only download under the shared contract.

## 2. Confirmed outcome and boundaries
Account deletion is available at launch after confirmation.
An authoritative successful deletion must:

- disable owner access;
- remove the account's projects, takes, recordings, and results from product access; and
- prevent late jobs, callbacks, or uploads from restoring deleted work or result access.
“Remove” here is a logical product outcome, not a promise that every physical copy disappears immediately. Deletion cannot retract an MP4 that the owner already downloaded or distributed outside Dubbed.
Backup, cache, CDN, security-record, and financial-record retention remain unspecified.
The account-deletion dialog warns about remaining purchased credits but permits deletion without prior spending or a refund request. Refund handling is separate; deletion initiates no automatic refund and implies neither waiver nor refund guarantee. Refund eligibility, amounts, reversal and financial-record policy remain unspecified.
The frontend deletion decision is resolved and can be represented in mocks. Live release still requires truthful disclosure of the remaining refund/retention policies and service evidence; it is not permission to add a spend-balance or refund-first gate.

## 3. Purpose, entry, and exit
### 3.1 Purpose
The screen's primary question is: **How can I control access to my account and close it safely?**
The screen is a sparse settings view, not a profile dashboard, usage report, or marketing page.
### 3.2 Entry
The user selects Account in the authenticated compact top navigation.
Entry requires an authenticated account context and an authoritative account-settings snapshot.
If the session has expired, private account facts stay hidden and the user continues through Flow 02. Successful sign-in opens Flow 06 New dub; Account is not a return intent. This follows the owner answer recorded in the [shared contract](00-shared-contract.md#account-session-expiry-destination).
### 3.3 Exits

- Language change: remain on Account with the selected locale applied to the whole visible state.
- Verify email: continue to Flow 03 with an explicit return destination.
- Forgot password: continue to the separate Flow 04 code-reset flow.
- Link a method: continue to Flow 05; never link from email equality alone.
- Sign out: after any required recording-candidate exit guard and recording-ownership release, terminate only the current session and return to the ordinary signed-out landing; sessions on other devices remain active.
- Cancel deletion: close the confirmation and restore focus to Delete account.
- Successful deletion: terminate every session for the deleted account, clear private client state, and open the ordinary signed-out landing with **Account deleted** confirmation.
Exact route URLs remain OPEN. Deletion does not open a standalone deleted-account page, sign the user back in, or automatically recreate the account.

## 4. Screen anatomy and visual contract
### 4.1 Shared shell
Use the confirmed compact top navigation with product identity, New dub, My projects, credits balance/entry, and Account.
Account is the active destination. There is no permanent sidebar.
At widths below 768 CSS px, use the signed-in phone header: logo on the left and balance plus menu on the right; the menu contains New dub, My projects, Credits, Account, language, and Sign out. At 768 CSS px and above, use the regular desktop top navigation.
The account snapshot and the top-navigation balance must use the same authoritative account revision; the Account page does not invent a second balance.
### 4.2 Content order

1. `Account` noun title and one short scope sentence.
2. Language.
3. Sign-in methods.
4. Session action: Sign out.
5. Destructive action: Delete account, last and visually separate.
The destructive section cannot appear before the account-access controls in visual, DOM, focus, or screen-reader order.
### 4.3 Settings rows
On wide screens, each area uses a label/description column beside one flat working panel.
On narrow screens, the label stacks above its panel.
Existing panels use the mapped source 10px white/tone-step treatment and exact restrained shadow where that source component calls for it. QA62-06 allows one bounded derivative content card in Account settings; it does not add per-block card wrappers.
The approved [design-token system](design-tokens.md) is normative. Use `page`, `surface`, `text.primary`, `text.secondary` and `divider.decorative` by meaning rather than choosing raw shades in this flow. Essential field/control boundaries use `border.control`, never the decorative divider. Primary and destructive controls use their approved default/hover/pressed families and foregrounds; links, errors, selections and disabled states use `link`, `error`, `selected.*` and `disabled.*`; apply source opacity only for genuinely disabled controls, with readable reasons and no dimming of focusable busy controls. Light UI uses `focus.light` with its 2 px ring and 2px gap matching the opaque surrounding ground; any media control uses `focus.media` only on opaque `media` backing. Hover, selected, invalid and disabled states never erase focus. Use Mabry Pro Regular and Medium only, with no Bold or synthetic Bold: body/dialog text is Regular 16 px/24 px, supporting captions are Regular 14 px/20 px, and buttons use Mabry Pro Medium 14px/20px for task, secondary and navigation actions and Medium 16px/24px for prominent/landing actions; phone buttons use Mabry Pro Medium 16px/24px with retained 48px targets, field labels use Medium 14 px/20 px, and page headings use Medium 32 px/40 px desktop and 24 px/32 px phone.
Use component-specific source geometry for buttons and single-line inputs. Controls are sized to the mapped source component on desktop and 48 px high on phone. The content uses 32 px desktop gutters, 16 px phone gutters, one column below 768 CSS px, and a working maximum width of 1200 px.
Use 8 px between closely related items, 16 px between fields/buttons, 24 px within an existing screen block, and 32 px between major sections. Existing panels retain the shared 24 px desktop / 16 px phone padding unless a bounded screen-specific exception is stated below.

QA62-06 Account settings density exception: `.account-screen` uses 16px 0 64px body padding on desktop and 32px 0 56px on phone; shared App main-area sizing and gutters stay unchanged. Desktop sections use 8px vertical padding with a 24px gap; the single derivative content card uses 10px vertical / 16px horizontal padding and a 10px gap. Phone sections use 22px vertical padding with a 16px gap, and cards use 16px padding. The shared 24px desktop / 16px phone panel padding remains the default elsewhere. The owner authorized correction of poor small sizing; the exact density values were selected by the Orchestrator under delegation and were not separately human pixel-approved. This bounded source-gap exception retains Clean/Light, Mabry Pro, mapped radii and control geometry, and 48px phone targets; it establishes no new universal panel default.
Use flat surfaces with only mapped source component shadows. Gradients, glass, glow, decorative illustration, vanity metrics, charts, icon-topped cards, decorative type, all-caps headings and wrapper cards around every block are prohibited.
Font-asset availability, browser loading, fallback, rendered proof, forced-colors behavior and screen-specific interaction evidence remain implementation-validation gaps rather than permission to substitute other values above. The approved component states/focus, Regular/Medium weights, line heights, common spacing and motion are resolved.
### 4.4 Product-specific substance
The screen shows the real current locale, method-specific verified identifier where required by its row, and the real association state of Google and email/password. Method labels do not invent a primary email or profile identity.
It does not show sample identities, fabricated account age, security scores, or invented usage figures.

## 5. Language control
The Language area contains one mutually exclusive English / Russian control with an accessible group name.
Selecting a language updates navigation, headings, actions, dialog content, status, loading text, and errors as one locale; mixed-language states are invalid.
The control must not change audio-language detection or project media.
An explicit manual pre-sign-in language choice wins over a different saved account preference after authentication and updates the account preference. A browser-derived default never overwrites a saved account preference. On first use with neither an explicit choice nor a saved preference, select Russian for browser locale `ru` and English otherwise.
Changing Language on Account is an explicit account-preference update. While it is pending, expose a truthful saving state. On failure, preserve or restore the last authoritative locale, keep the rest of Account intact, and offer Retry.

## 6. Sign-in methods
### 6.1 Method rows
Show exactly two supported method families:

| Method | Facts shown | Available continuation |
|---|---|---|
| Google | Associated / not associated / linking in progress / unavailable | Continue to Flow 05 when linking is allowed |
| Email and password | Verified method email / verification pending / not associated / unavailable | Direct password change when associated; Flow 03 verification; Flow 04 forgotten-password reset; Flow 05 linking |
The frontend must not infer association from matching email text.
The identity service supplies the authoritative association and verification state.
An interrupted linking attempt remains a Flow 05 concern; Account may show its returned status but does not duplicate that flow.
Flow 05 may link Google and email/password even when their verified emails differ, but only after fresh proof of both the current account and the method being attached. If that method is already bound to another account, block linking; do not merge accounts.
### 6.2 Direct password change
For an associated email/password method, Account provides exactly two fields: Current password and New password. Do not add a Repeat new password field.
New password must contain at least 8 characters. Do not require uppercase, lowercase, digit, or special-character classes. Submit to Change password; current-password mismatch, too-short rejection, session expiry, stale state, timeout, and service failure remain recoverable in the form without exposing secrets.
Put field-specific errors directly beneath the corresponding field and service-level errors above Change password. A failed request preserves both entered values for the active form lifecycle while keeping password values out of logs, URLs, analytics, and other rendered surfaces.
Forgot password leaves this form for Flow 04's separate code-reset flow. Direct change does not reuse the reset-code contract.
After a successful direct change, keep the current device signed in and terminate every other session. Flow 04 reset has the same session outcome; neither path signs out the current device or preserves other sessions.
### 6.3 Method removal excluded from MVP
The MVP may add/link a second verified method through Flow 05, but it provides no Unlink, Disconnect, or Remove login method action for either method.
There is no last-method unlink flow because no method-removal flow exists. Method rows expose association facts, linking where eligible, and the selected password actions only.

## 7. Sign out
Sign out is a distinct session action, not part of the destructive section.
Ordinary Sign out terminates only the current session. It does not revoke sessions on other devices. This differs from successful password reset/direct password change, which keep the current device signed in and terminate other sessions, and from account deletion, which terminates every account session.

Before sign-out can terminate the session, any active recording context follows the shared exit contract:

1. If there is an unaccepted candidate, resolve **Save and leave / Leave without saving / Stay** before logout.
2. **Save and leave** proceeds only after durable save/acceptance; save failure stays in Record with the candidate and prior accepted take protected, and sends no sign-out request.
3. **Leave without saving** discards only the unaccepted candidate while preserving any prior accepted take; **Stay** performs neither navigation nor sign-out.
4. After the chosen exit is safely resolved, release this device's exclusive recording ownership before terminating the current session. A release failure/unknown result must be reconciled rather than abandoning a live ownership claim or pretending logout succeeded.

Once those prerequisites are satisfied, selecting Sign out sends one current-session termination request and shows a pending state on that action.
On authoritative success, clear private account/project/balance state from this client and navigate to the ordinary signed-out landing. Other-device sessions remain active.
On failure or timeout, do not claim sign-out success; keep the user on Account, explain that sign-out could not be confirmed, and offer Retry.
If the server reports the session already absent, reconcile to the signed-out state.
Reload during an uncertain sign-out checks the authoritative session rather than trusting a stale client flag.

## 8. Account deletion confirmation
### 8.1 Known consequence disclosure
Before the final destructive action, the confirmation must state that deletion:

- ends account access;
- removes every account project, take, recording, and result from product access; and
- cannot be undone through the product.
The dialog must not promise immediate erasure from backups, caches, logs, financial records, or external systems. It must not imply that Dubbed can delete or retract MP4 copies already downloaded or distributed by the owner.
Show the service-authoritative remaining purchased-credit amount in this confirmation. A positive amount does not disable Delete account or require spending/refund contact first. Refund requests are handled separately; deletion creates no refund request or guarantee and does not waive refund rights. Financial/security-record and physical-retention disclosures still require policy before live release. Do not substitute the total available balance for the purchased-credit amount unless the service establishes they are the same.
### 8.2 Confirmation sequence

1. User selects Delete account.
2. An accessible dialog on desktop or bottom sheet on phone names the account and complete known consequences.
3. The authenticated owner types the visible localized token into the confirmation field: `DELETE` in English or `УДАЛИТЬ` in Russian.
4. The final action remains explicitly named Delete account / Удалить аккаунт.
5. The client submits one idempotent deletion operation bound to the authenticated account and current revision.
6. The client reconciles the authoritative outcome before retrying after an ambiguous timeout.
Token matching is case-insensitive after trimming leading and trailing whitespace. Do not apply other normalization or accept extra/internal characters as the token. The dialog does not ask for the password, Google reauthentication, or a second factor. The backend still guards the operation with the current authenticated owner context and account/revision checks.

The typed localized token is specific to account deletion. Deleting an individual project in Flow 11 keeps its ordinary Cancel / Delete project button confirmation and requires no typed token.
Closing, Escape, or Cancel before submission performs no deletion and returns focus to the initiating button.
Once authoritative account disablement succeeds, terminate all sessions for that account, clear private state, and navigate to the ordinary signed-out landing with **Account deleted** / **Аккаунт удалён** confirmation. The frontend must not restore private content, auto-sign in, or offer automatic account recreation even if physical cleanup is still pending. A failure or unknown outcome must not show this success message or navigate as if deletion succeeded.

Deletion does not permanently block a later explicit registration. The same email address or Google identity may register again through Flow 03 and create a new canonical account, but the new account receives no repeat 120-credit welcome grant and recovers none of the deleted account's projects, prior balance, or other account state. This is a later user-initiated registration, not an automatic recreation from the deletion success flow.
### 8.3 Deletion states

| State | Visible behavior | Protection |
|---|---|---|
| Closed | Destructive section with consequence summary and Delete account | No destructive request |
| Reviewing | Full consequence text, Cancel, and typed-token field showing the locale-appropriate `DELETE` or `УДАЛИТЬ` instruction | Final action follows disclosure; enabled only when case-insensitive comparison succeeds after trimming leading/trailing whitespace |
| Confirmation mismatch | Specific recoverable message; consequences remain visible | No deletion request |
| Submitting | Final action disabled with plain progress text | Prevent duplicate clicks; keep operation identity |
| Outcome unknown | Say deletion could not yet be confirmed; Retry checks status first; remain out of the success destination | No blind duplicate destructive request or false **Account deleted** claim |
| Rejected/stale | Explain that account state changed; reload authoritative snapshot | No client-side override |
| Disabled/deleted | Terminate all account sessions, remove private UI, and open the signed-out landing with **Account deleted** confirmation | No account resurrection, auto-sign-in, or automatic recreation from cached state |

## 9. Loading, stale, failure, and reload behavior
### 9.1 Initial loading
Render the final section structure with headings immediately and flat placeholders at their final sizes.
Do not show guessed method associations, email, balance, or deletion eligibility while loading.
### 9.2 Partial failure
Keep each failed area in place with one concrete message and Retry.
Failure to load login methods must not hide the Language or Sign out controls if their own authoritative state is available.
Failure to load deletion policy or eligibility disables Delete account and states why.
### 9.3 Stale and concurrent state
Method, locale, session, and deletion commands carry the expected account revision or equivalent stale-write protection.
If another tab/device changes a method or deletes the account, refresh to the authoritative state; never overwrite it with the old screen.
If a different account signs in during a return from verification or linking, stop the continuation and do not disclose the previous account's facts.
### 9.4 Reload and recovery
Reload reconstructs from server-owned session and account state.
It does not replay a password reset, linking, sign-out, or deletion command from component memory.
A reload during pending/unknown deletion reconciles by operation identity and account status before offering any retry.

## 10. Visible copy and localization
The baseline labels are:

| English | Russian |
|---|---|
| Account | Аккаунт |
| Language | Язык |
| English | English |
| Russian | Русский |
| Sign-in methods | Способы входа |
| Email and password | Электронная почта и пароль |
| Verify email | Подтвердить почту |
| Reset password | Сбросить пароль |
| Current password | Текущий пароль |
| New password | Новый пароль |
| Change password | Изменить пароль |
| Forgot password? | Забыли пароль? |
| Link | Подключить |
| Sign out | Выйти |
| Delete account | Удалить аккаунт |
| DELETE | УДАЛИТЬ |
| Account deleted | Аккаунт удалён |
| Cancel | Отмена |
| Try again | Повторить |
Google remains the provider's product name in both locales.
Final method-status wording, account-identification wording, deletion consequence copy, retention disclosure, and post-deletion copy require localization review after the OPEN policies resolve.
Use plain user consequences/actions throughout Account. Session/operation IDs, adapter state, deletion fences, worker cleanup and eligibility-retention mechanics remain implementation/service contracts rather than mandatory persistent explanations. Show approved security, deletion, purchased-credit and retention disclosures where they inform a decision, without inventing policy or hiding uncertainty. Errors name what failed and the available next action.
Field errors appear beneath their field; service-level errors appear above the affected primary action. Failed requests preserve entered values for the active form lifecycle unless authoritative state makes the form invalid.

## 11. Desktop, phone, keyboard, and assistive technology

- Desktop uses the shared compact top navigation and a bounded settings canvas; no sidebar appears.
- At 768 CSS px and above, use the desktop navigation, 32 px gutters, approved desktop action roles in design-tokens.md, and the two-column label/panel settings rows where space permits.
- Below 768 CSS px, use the signed-in phone header, 16 px gutters, one-column stacked rows, and 48 px controls.
- No page-level horizontal scrolling is allowed at 390 px, 200% zoom, or with long Russian copy.
- The deletion sheet and its actions remain visible above the on-screen keyboard and safe areas.
- DOM, reading, and focus order follow the content order in §4.2.
- Every control has a visible focus state, programmatic name, current state, disabled reason, and status announcement where state changes asynchronously.
- Radio/segmented language choices expose one selected value; login-method status is text, not color alone.
- The deletion dialog traps focus, has an accessible name and description, supports Cancel/Escape before submission, and returns focus correctly.
Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.  There is no page-entry, parallax or decorative motion; reduced motion disables the UI transitions. Animation never delays language/password saving, sign-out, deletion acknowledgement or navigation. Video/audio playback and playhead behavior owned by media flows remain unchanged.

## 12. Logical frontend services
The frontend depends on replaceable service interfaces rather than importing transport details into components.

| Service | Inputs | Required results |
|---|---|---|
| `AccountSettingsService.load` | current authenticated context | account revision, locale, method associations/verification, deletion eligibility and approved disclosure revision |
| `LocaleService.set` | account, locale, explicit-choice source, expected revision, operation ID | authoritative locale/revision or stale/failure result; explicit pre-sign-in choice may replace the saved account preference, browser default may not |
| `SessionService.signOut` | current session and operation ID, invoked only after any recording-candidate exit guard and recording-ownership release have resolved | current session terminated/already absent/failure/unknown; other-device sessions remain active |
| `IdentityService` | current account and continuation target | Flow 03/04/05 verification/link continuation and reconciled method state; no unlink command |
| `PasswordService.change` | authenticated account, current password, new password, expected revision, operation ID | changed/rejected/stale/unknown; success keeps current session and revokes all others |
| `AccountDeletionService.start` | authenticated owner, account/revisions, active locale, typed token, operation ID | rejected token after locale-specific case-insensitive comparison with leading/trailing whitespace trimmed; pending/disabled/completed-with-all-account-sessions-terminated/unknown |
| `AccountDeletionService.status` | account/deletion operation ID where still authorized | reconciled outcome without repeating deletion; completed means account disabled and all account sessions terminated before the signed-out landing success state |
| `RegistrationEligibilityService` | verified email or Google identity presented by Flow 03 | authoritative permission to create a new account after deletion plus welcome-grant eligible/ineligible result; no old account, balance, or project restoration and no frontend-readable deleted-identity marker |

Deletion orchestration must fence project workers, uploads, results, owner download authorization, and late events through backend/application services. The exact minimum retained eligibility fact, privacy controls, and retention mechanics needed to prevent a repeat welcome grant remain a technical/policy gate; this flow selects no storage shape or duration.
A future mock must label itself as a mock and use deterministic fixtures for desktop/phone geometry, EN/RU including explicit-pre-sign-in precedence and browser fallback, password field/service failures with retained values, the distinct session outcomes for ordinary current-session-only sign-out versus password change/reset revoking other sessions versus deletion revoking all sessions, linked/unlinked method facts without removal commands, unaccepted-candidate exit branches, save failure staying in Record, recording-ownership release/reconciliation, sign-out uncertainty, localized `DELETE` / `УДАЛИТЬ` match/mismatch including case and leading/trailing whitespace variants, deletion pending/stale/timeout/failure, authoritative-success routing to the signed-out landing with **Account deleted** while all simulated account sessions become invalid, and later same-email/Google re-registration creating a new simulated account with no restored projects/balance and no repeat welcome grant.
Mock account/result fixtures expose no sharing controls, public-link fields, share tokens, or public viewer routes.
A mock is not proof of live Google, email delivery, password reset, cross-device state, project/take/result removal, data cleanup, or account deletion.
No backend, security, retention, billing, or external-provider implementation is created by this specification.

## 13. Persistence and privacy boundaries

- Current projects, accepted takes, and account-owned unaccepted recording drafts have no inactivity expiry.
- They remain until acceptance where applicable, explicit draft/project deletion, or account deletion.
- A validated but unprocessed upload remains a My projects draft and occupies its slot until project/account deletion.
- Account deletion removes those projects, takes, recordings, and results from product access.
- Later same-email or Google re-registration creates a new account and restores none of the deleted projects, balance, or other account state; it is ineligible for another welcome grant.
- Downloaded MP4 copies on owner devices or external destinations remain outside Dubbed's control; the UI must not promise their retraction.
- Private account identifiers, method state, balance, projects, and deletion evidence must not appear in signed-out surfaces, public errors, analytics payloads, or URLs.
- Credentials, reset tokens, provider tokens, confirmation evidence, signed-media URLs, and raw security records never render in the settings UI or logs.
- Exact physical cleanup and legally/operationally retained-record policies remain OPEN.

## 14. Acceptance criteria
All criteria are unexecuted.

- [ ] **F15-AC01 — Authorized entry:** only the authenticated owner can load Account facts; expiry and account switching hide prior private state and route through the correct recovery.
- [ ] **F15-AC02 — Shared shell and locale:** desktop and phone use the approved navigation, breakpoint, gutters, and control heights without a sidebar; EN/RU switching updates every visible state without changing media language or producing mixed-language UI; an explicit pre-sign-in choice overrides and updates a different saved preference, while a browser-derived default never overwrites one.
- [ ] **F15-AC03 — Method truth/linking:** rows show only method-specific authoritative facts; different verified emails may link only with fresh proof of both sides, a method bound to another account is blocked without merge, and no method-removal action exists.
- [ ] **F15-AC04 — Password management:** an associated email/password method provides only Current password/New password; minimum 8 applies without required character classes; field errors sit below fields, service errors above Change password, and a failed request preserves entered values for the active form lifecycle; forgotten password uses Flow 04; either success keeps the current device signed in and terminates all other sessions.
- [ ] **F15-AC05 — Sign out:** before logout, an unaccepted recording candidate uses **Save and leave / Leave without saving / Stay**; save failure stays in Record and sends no sign-out request; resolved exit releases recording ownership. Authoritative sign-out then terminates only the current session, clears this client's private state, and opens the ordinary signed-out landing while other-device sessions remain active. Failure, unknown, timeout, and reload never falsely claim termination. Password change/reset revoking other sessions and deletion revoking all sessions remain distinct outcomes.
- [ ] **F15-AC06 — Informed deletion:** confirmation names the account/effects, places Cancel before the final action, requires localized `DELETE` in English or `УДАЛИТЬ` in Russian using case-insensitive matching after leading/trailing whitespace is trimmed, uses no password/provider reauthentication, and keeps the backend authenticated-owner guard. Individual project deletion uses its ordinary Cancel / Delete project confirmation with no typed token. The dialog warns about the authoritative remaining purchased credits and allows deletion without spending or requesting a refund first. Deletion starts no automatic refund and implies neither waiver nor guaranteed refund. **Live release still requires approved remaining refund/retention disclosures and service evidence; the frontend balance gate is resolved.**
- [ ] **F15-AC07 — Deletion effects and destination:** authoritative disablement immediately prevents owner access, terminates every session for the deleted account, removes projects/takes/recordings/results from product access, revokes new owner download authorization, fences late events, clears private client state, and opens the ordinary signed-out landing with **Account deleted** / **Аккаунт удалён** without a standalone page, auto-sign-in, or automatic recreation. A later explicit registration with the same email or Google identity may create a new account, but restores no deleted projects/balance/state and receives no repeat welcome grant. It does not claim control of already downloaded copies. **Frontend mock coverage cannot satisfy live service proof.**
- [ ] **F15-AC08 — Idempotent recovery:** duplicate clicks, lost responses, reload, stale revisions, and another-device deletion reconcile one operation without resurrecting work or issuing blind duplicates. Failure/unknown states never show deletion success or enter the signed-out success destination prematurely.
- [ ] **F15-AC09 — Responsive and accessible:** the complete EN/RU screen and confirmation work by keyboard and assistive technology at desktop, tablet, 390 px phone, 200% zoom, and reduced viewport height.
- [ ] **F15-AC10 — Privacy:** private account, identity, balance, token, and deletion evidence stays out of public state, URLs, and user-visible logs/errors.
- [ ] **F15-AC11 — Honest mock and no-sharing boundary:** deterministic mocks visibly remain mocks and do not claim live provider, email, password-change, deletion, or retention evidence; no Account or result fixture exposes sharing controls, tokens, public routes, or a public viewer.
- [ ] **F15-AC12 — Visual and state contract:** Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed. Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.

## 15. Verification plan — not executed

1. Review this flow against the latest shared contract, SPEC-001, BR-001, and resolved owner answers.
2. Contract-test snapshot, revision, sign-out, and deletion-operation result mapping, including stale and unknown outcomes.
3. Component-test every language, method, direct-password, session, and deletion state with deterministic fixtures, including explicit-pre-sign-in locale precedence, browser-derived first-use fallback, and persistence failure without mixed-language output.
4. Exercise direct password success/rejection/timeout/stale paths with only Current password/New password, minimum 8 and no character-class requirements; assert field/service error placement and retained form values; prove success keeps the current device signed in and terminates all others; verify Flow 04 has the same outcome; exercise Flow 05 same-email/different-email proof plus other-account-bound rejection without merge; assert no unlink/disconnect/remove action or service command exists.
5. Exercise ordinary sign-out with no active recording and with each unaccepted-candidate branch: durable Save and leave, save failure staying in Record with no logout, Leave without saving preserving a prior accepted take, and Stay. Verify recording ownership releases before current-session termination, release/unknown outcomes reconcile, the current client reaches the ordinary signed-out landing, and sessions on other devices remain valid. Contrast this with password reset/change revoking other sessions and deletion revoking all sessions.
6. Exercise deletion cancel; English `DELETE` and Russian `УДАЛИТЬ`; matching lowercase/mixed case and leading/trailing whitespace; rejection of wrong locale, extra/internal characters, and mismatch; the no-reauth path; ordinary project deletion without a typed token; duplicate click; timeout; reload; stale revision; pending status; disabled account; and late callback.
7. Inspect final renders at desktop, the 768 CSS px boundary, and 390 px. Verify decorative divider versus essential border, primary/destructive default-hover-pressed foregrounds, link, error, selected, disabled source opacity only for genuinely disabled controls, with readable reasons and no dimming of focusable busy controls, `focus.light` geometry and `focus.media` only on opaque media backing. Verify Mabry Pro Regular/Medium only with role-specific Mabry Pro Medium desktop labels from design-tokens.md and Medium 14 px/20 px field labels, component-specific source geometry, role-sized desktop controls in design-tokens.md and 48px phone targets controls, 32/16 px gutters, 8/16/24/32 px shared spacing, 24 px desktop / 16 px phone padding only on existing panels, correct headers, one-column phone layout, long Russian copy, 200% zoom, short viewport, keyboard open, and safe-area insets. Confirm spacing adds no panel/card wrapper; keep static token evidence separate from font assets/loading, fallback, browser rendering, forced-colors and accessibility proof.
8. Run keyboard-only and screen-reader checks for navigation, language selection, status announcements, dialog naming, focus containment, Escape, and focus return.Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged. 
9. Run localization review across all loading, stale, failure, unknown, and success states; confirm no mixed language.
10. Assert Account and result surfaces, service mocks, and route fixtures contain no sharing control, public-link field, share token, public route, or public viewer.
11. With real services, verify all sessions for the deleted account terminate; owner access and new download are denied; project/take/recording/result access is removed; workers are fenced; authoritative success reaches the ordinary signed-out landing with localized **Account deleted** and no standalone page/auto-sign-in/automatic recreation; failure/unknown never claims success; and later explicit same-email/Google registration creates a new account without restoring deleted projects/balance or issuing a repeat welcome grant. Verify authoritative returning-identity eligibility, minimum retained-data/privacy policy, retained-record disclosure, and truthful treatment of already downloaded copies separately.
12. Record command, environment, date, revision/dirty boundary, result, and evidence location; mark blocked or not run honestly.
No item above has been executed by this specification authoring pass.

Additional deletion fixtures and planned checks: zero and positive purchased-credit balances; authoritative purchased balance distinct from trial credits and reservations; warning visible for a positive purchased balance; final localized confirmation remains usable without spending or contacting refunds; no refund operation emitted by deletion; no waiver/guarantee claim; failed/unknown deletion preserves its normal reconciliation behavior. Mock facts must not be presented as live accounting evidence.

## 16. Dependencies and ownership

| Dependency | Supplies to Flow 15 |
|---|---|
| Shared shell / Flow 01 | Product identity, top navigation, locale entry, responsive shell, [design-tokens.md](design-tokens.md) semantic/component-state, typography, spacing, focus and motion roles, and the ordinary signed-out landing destination for localized **Account deleted** confirmation |
| Flow 02 — Sign in | Authenticated account/session and expired-session return |
| Flow 03 — Registration verification | Verified-email/Google completion, permitted post-deletion re-registration, no deleted-state restoration, and authoritative no-repeat-welcome-grant result |
| Flow 04 — Password reset | Separate forgotten-password code reset and safe return |
| Flow 05 — Account linking | Fresh proof of current account and attached method, different-email linking, other-account binding rejection; no unlink path |
| Flow 09 — Record / recording ownership | Unaccepted-candidate exit guard, durable save/discard/stay outcomes, and release/reconciliation of this device's exclusive recording ownership before sign-out |
| Flow 11 — My projects | Project/draft/slot facts, ordinary project-delete button confirmation with no typed token, and account-deletion propagation |
| Flow 12 — Credits | Authoritative balance/history facts and approved deletion treatment |
| Account/session/identity/password services | Authorization, method state, direct change, sign-out, linking, deletion operation |
| Project/media/result workers | Logical removal, download-authorization revocation, late-event fences, physical cleanup under policy |
| Policy owners | Balance, financial/security record, backup/cache/CDN retention and user-visible disclosure |

## 17. OPEN decisions and blockers

| Current rule reference | Requirement | Owning issue |
|---|---|---|
| RESOLVED-F15-Q1 | Account deletion uses localized `DELETE` (EN) / `УДАЛИТЬ` (RU), compared case-insensitively after trimming leading/trailing whitespace; no password/Google reauthentication or both. Project deletion keeps ordinary button confirmation without a token. | [#62](https://github.com/dystrophyless/dubbed.ai/issues/62) |
| RESOLVED-F15-Q2 | Owner selected direct Current password / New password change in Account; forgotten password remains Flow 04. | [#62](https://github.com/dystrophyless/dubbed.ai/issues/62) |
| RESOLVED-F15-Q3 | Owner excluded unlink/disconnect/removal of login methods from the MVP; adding/linking a second method remains allowed. | [#62](https://github.com/dystrophyless/dubbed.ai/issues/62) |
| RESOLVED-F15-Q4 | Direct change and Flow 04 reset keep the current device signed in and terminate every other session. | [#62](https://github.com/dystrophyless/dubbed.ai/issues/62) |
| RESOLVED-F15-Q5 | The shared locale priority applies: explicit pre-sign-in choice wins and updates a different saved preference; a browser-derived default never overwrites one; first-use browser `ru` selects Russian and other locales select English. | [#62](https://github.com/dystrophyless/dubbed.ai/issues/62) |
| RESOLVED-F15-Q6 | Public sharing was withdrawn: Account and result behavior provide no sharing UI, token, route, or viewer. | [#62](https://github.com/dystrophyless/dubbed.ai/issues/62) |
| RESOLVED-F15-Q7 | Authoritative account-deletion success terminates all sessions and opens the ordinary signed-out landing with localized **Account deleted**; there is no standalone page, auto-sign-in, or automatic recreation, and failure/unknown is not success. | [#62](https://github.com/dystrophyless/dubbed.ai/issues/62) |
| RESOLVED-F15-Q8 | Ordinary Sign out runs the recording candidate-exit guard and ownership release first, then terminates only the current session and opens the ordinary signed-out landing; other-device sessions remain active. Password reset/change revoking other sessions and account deletion revoking all sessions are distinct. | [#62](https://github.com/dystrophyless/dubbed.ai/issues/62) |
| RESOLVED-F15-Q9 | After deletion, the same email or Google identity may explicitly register again and create a new canonical account, but receives no repeat 120-credit welcome grant and restores no deleted projects, balance, or account state. | [#62](https://github.com/dystrophyless/dubbed.ai/issues/62) |
| RESOLVED-F15-TYPOGRAPHY | Mabry Pro uses Regular and Medium only, with no Bold or synthetic Bold. Body/dialog text is Regular16px/24px; captions are Regular14px/20px; desktop actions are task40px/Medium14px/20px, prominent/landing44px/Medium16px/24px, secondary32px/Medium14px/20px, and navigation36px/Medium14px/20px; medium segmented controls are40px/14px/20px desktop and48px/16px/24px phone; phone text actions retain48px targets; field labels are Medium14px/20px; headings are Medium32px/40px desktop and24px/32px phone. | [#62](https://github.com/dystrophyless/dubbed.ai/issues/62) |
| RESOLVED-F15-SPACING | Shared spacing is 8 px for closely related items, 16 px for fields/buttons, 24 px within screen blocks and 32 px between major sections. Existing panels use 24 px desktop / 16 px phone padding except the bounded QA62-06 Account settings density exception above; no per-block wrappers are added. | [#62](https://github.com/dystrophyless/dubbed.ai/issues/62) |
| RESOLVED-F15-MOTION | Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged. | [#62](https://github.com/dystrophyless/dubbed.ai/issues/62) |
| RESOLVED-F15-TOKENS | [design-tokens.md](design-tokens.md) is authoritative for primitive, semantic and component-state roles. Decorative divider/control border, action states, link/error, selected, disabled and focus mappings are settled; no per-flow arbitrary primitive selection is allowed. Source opacity .4 applies only to genuinely disabled controls; focusable busy controls stay readable, and any required disabled explanation remains independently readable. | [#62](https://github.com/dystrophyless/dubbed.ai/issues/62) |
| RESOLVED-F15-PURCHASED-BALANCE | Warn about remaining purchased credits and permit deletion without spending or a prior refund request. Handle refund requests separately; no automatic refund, waiver or guarantee. | [#62](https://github.com/dystrophyless/dubbed.ai/issues/62) |
| RESOLVED-F15-ACCOUNT-RETURN | After session expiry on Account, successful sign-in opens New dub; Account is not retained as a return intent. The existing same-project return for expired project sessions remains. | [#62](https://github.com/dystrophyless/dubbed.ai/issues/62) |
| RESOLVED-F15-SUPPORT | Use `mailto:dystrophyless@gmail.com` as the ordinary support contact shared with the signed-out landing and Credits. Opening the link proves neither delivery nor refund approval. | [#62](https://github.com/dystrophyless/dubbed.ai/issues/62) |

Current release blockers:

- refund eligibility/amounts, reversal handling, and financial/purchase-history retention; the support address is approved and the purchased-balance warning/nonblocking deletion interaction are resolved, while no email delivery evidence is claimed;
- required financial/security record retention and user disclosure;
- backup, cache, CDN, provider-copy, and physical media cleanup timing, without implying control of owner-downloaded MP4 copies;
- minimum retained eligibility fact, privacy controls, and retention mechanics needed to allow post-deletion re-registration while preventing a repeat welcome grant; no storage shape or duration is selected, and the success flow itself offers no automatic recreation;
- password maximum length, Unicode/counting semantics, and server-side abuse controls;
- font-asset availability, browser loading, fallback/rendered proof, screen-specific geometry, final copy, and rendered focus/forced-colors/accessibility evidence; and
- exact route URLs.

## 18. Design-skill application and evidence boundary
The author applied both requested skill sources:

- `.agents/skills/design-taste-frontend/SKILL.md` and its complete `references/app-screens.md`; and
- `.agents/skills/frontend-design/SKILL.md`.
Their app-screen guidance produced the sparse settings hierarchy, noun title, top-level job, flat surfaces, restrained color, settings-row layout, destructive action last, explicit full state set, phone stacking, visible focus, and plain action/result copy.
The confirmed Dubbed direction overrides any generic or randomly dealt palette: [design-tokens.md](design-tokens.md) supplies semantic/component states, focus, typography, geometry, spacing and motion; this flow retains the flat settings hierarchy. Mapped source component shadows are permitted; gradients, new panel wrappers and a sidebar are prohibited.
No style draw was promoted to a requirement; the values above come from the shared approved contract. Remaining font-asset/loading/fallback/rendering, screen-specific geometry, final copy and rendered focus/accessibility evidence stay explicit.
No mockup, product code, screenshot inspection, browser run, live identity/email request, destructive account operation, or backend verification occurred.
