# Flow 04: Password recovery and reset

Status: synchronized draft; not approved; named owner/security decisions remain OPEN
Date: 2026-10-26 (Asia/Qyzylorda).
Mode: specification only; no implementation or delivery evidence
Authority: [shared frontend contract](00-shared-contract.md), then latest owner answers; retained [SPEC-001](../specifications/SPEC-001_dubbed_mvp.md) and [BR-001](../business-requirements/BR-001_custom_video_dubbing.md) apply only where the shared contract has not replaced them

## 1. Purpose and boundary

This flow lets a person who owns an email/password identity request password recovery by email and set a new password after valid confirmation.

The flow must work in English and Russian on desktop and phone, begin from Flow 02 or a recoverable pending reset, and finish with an authoritative signed-in session on the current device after successful reset. It must never create an account, finish an unverified registration, link login methods, infer ownership from an email match alone, or use a return intent to bypass authentication.

Google sign-in remains available in Flow 02. Explicit ownership-verified linking belongs to Flow 05. Registration and email verification belong to Flow 03.

The owner selected an emailed reset code entered in the application: exactly 6 decimal digits, valid for 10 minutes after the email is sent. Resend becomes eligible after at least 60 seconds, at most 5 reset emails may be sent per hour, and a new code replaces the previous code. For every syntactically valid submitted email, the public request result is the same neutral statement, **If an account with this email exists, we sent a code**, followed by code entry. This response proves neither delivery nor reset eligibility and never branches to Account not found or another existence-dependent success state. Syntax errors and actionable transport/service errors remain distinct but must not reveal account existence. The reset code is bound to its reset purpose and identity context; a registration code cannot reset a password and a reset code cannot verify registration. After correct code verification and durable new-password installation, the service establishes a signed-in session on the current device for the selected 30-day lifetime and terminates every other session. A valid preserved project return context reopens that persisted project screen/state without replaying an operation; otherwise the destination is New dub. The delivery provider, invalid-code attempt limit, exact hourly accounting window, maximum password length, Unicode/counting semantics, and remaining server-side abuse controls remain unselected. The common password rule is at least 8 characters with no mandatory uppercase, digit, or special-character class.

Reset-code entry uses six visual cells backed by one logical, accessibly named value. Entering or pasting a changed complete six-digit value automatically starts verification; there is no required Continue or Confirm button. Duplicate in-flight submissions and repeated verification of the same unchanged value are forbidden. An authoritatively incorrect code stays visible, shows its error beneath the cells, and is selected for replacement without auto-clearing. A timeout or unknown outcome is not an incorrect-code result and must be reconciled without automatically spending repeated attempts.

## 2. Entry and exit

### Entry

- **Forgot password?** from email/password sign-in, optionally carrying a validated return intent.
- Same-browser reload return to an in-app pending reset-code entry through its authoritative opaque pending-flow reference.
- **Request another email** from an expired, used, invalid, or failed reset state.
- Browser reload, Back, or Forward while the user is in a recoverable state.

### Exit

| State | Exit |
|---|---|
| Request cancelled | Flow 02 sign-in; no email is sent by cancellation. |
| Syntactically valid request reaches its public response | Stay in this flow, show the neutral existence-safe statement and the in-app 6-digit reset-code entry. The state is not delivery or eligibility proof. |
| Reset cancelled before submission | Flow 02 sign-in; no password change. |
| Reset succeeds | Establish the current-device 30-day session, terminate all other sessions, then return to a valid preserved project screen/state or open New dub. |
| Reset code is expired, used, replaced, invalid, or revoked | Recovery state with **Request another email** and **Back to sign in**. |

No upload, project, credit, recording, result, or linking state is created or mutated by this flow.

## 3. Design application

Both requested design skills are applied as analysis constraints, not owner approval.

- Treat this as a sparse product form, not a marketing page or dashboard.
- Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed.
- Use a compact top header with the Dubbed wordmark/home action, language control, and an appropriate sign-in/back action; never add a permanent sidebar.
- Use Mabry Pro Regular and Medium only, never Bold: body text is Regular 16px/24px, supporting captions are Regular 14px/20px, buttons use Mabry Pro Medium 14px/20px for task, secondary and navigation actions and Medium 16px/24px for prominent/landing actions; phone buttons use Mabry Pro Medium 16px/24px with retained 48px targets, field labels are Medium 14px/20px, and page headings are Medium 32px/40px desktop and 24px/32px phone. Actual font asset availability/loading, approved fallback behavior, and rendered proof remain unverified; these weight roles, sizes, and line heights are resolved.
- Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed.
- Keep one narrow reading column and one visible primary action per state. Do not wrap every block in a card.
- Labels stay above fields. Placeholders do not replace labels.
- Use red only for an actionable error and never as the sole error signal.
- Use no security illustration, lock icon card, success confetti, or ornamental status badge.
- Inputs and buttons use component-specific source geometry and are sized to the mapped source component on desktop, 48px below 768px. Page gutters are 32px desktop and 16px phone. The form uses one column and a maximum width of 400px, shrinking to available width inside the gutters. Mapped source component shadows are permitted; gradients are prohibited.
- Use 8px between closely related elements, 16px between form fields/buttons, 24px between blocks within the screen, and 32px between major sections. Existing panel padding is 24px at and above 768px and 16px below 768px; it is distinct from the unchanged 32px/16px page gutters and does not authorize a new panel or card wrapper.
Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.  Do not animate page entry, parallax, decoration, or looping attention effects. Reduced-motion disables interface transitions. Animation never delays verification, password-save acknowledgement, capture in owning media flows, or navigation; video playback and synchronized audio-playhead movement remain functional where owned elsewhere.
- Hover, pressed, disabled, focus treatments, and screen-specific geometry not implied by the shared spacing roles must be defined consistently in the shared UI contract or owning flow; this flow does not invent them. Common motion direction is resolved by the preceding rule.

## 4. Screen anatomy

### 4.1 Shared authentication header

- Dubbed wordmark/home action.
- English/Russian language control.
- **Back to sign in** when it is a valid next action.
- No account/project navigation is assumed for an unauthenticated visitor.
- An already authenticated user may enter only through an allowed recovery/account path; successful reset still replaces the current-device session and terminates every other session authoritatively.

Changing language must update visible copy, labels, errors, instructions, and accessible names without clearing active-form values. On first use without a saved preference, use Russian when the browser language is `ru`, English otherwise. A manual pre-sign-in choice has priority after reset sign-in and updates the account preference. A browser-derived initial choice is not manual consent to overwrite an existing account preference.

### 4.2 Request reset email

Required content:

- title: **Reset your password** / **Сброс пароля**;
- concise instruction to enter the account email;
- visible **Email** / **Электронная почта** label;
- one email field with browser autofill support;
- primary action: **Send reset email** / **Отправить письмо для сброса**;
- secondary action: **Back to sign in** / **Вернуться ко входу**.

The form normalizes only what the shared identity contract explicitly permits. It must not silently rewrite an address into a different identity.

Field-specific validation appears directly below the email field. A request-service error appears above **Send reset email**, preserves the entered email, and offers the applicable retry action.

For every syntactically valid email, the public request state is identical regardless of whether the address maps to an email/password account, Google-only identity, unverified or disabled identity, deleted identity, or no identity. Show **If an account with this email exists, we sent a code** and proceed to code entry. Do not show Account not found, name an identity class, or otherwise branch the request-success presentation on existence. A syntax error remains an email-field error. An actionable transport/service failure remains a service error above **Send reset email**; its copy and retry behavior must be existence-neutral.

### 4.3 Neutral request response / enter code

This state follows every syntactically valid request that is not stopped by an actionable transport/service failure. It explains the next action without claiming that an account exists, an email was delivered, or the request is eligible to reset a password.

On same-browser reload, an authoritative opaque pending-flow reference restores this code-entry state and the selected email without sending another code. It restores no password and proves no delivery, eligibility, verification, session, or account state. If the code expired, the user may explicitly request a new eligible code under the existing resend rules.

Required responsibilities:

- show exactly the neutral English statement **If an account with this email exists, we sent a code**; localized copy must preserve the same neutral meaning without adding an existence claim;
- explain that the email contains a 6-digit reset code to enter in this application;
- make the 10-minute validity and expiry recovery understandable where useful to the next action, without requiring a persistent administrative timing summary;
- provide **Send new code** only when the service reports that at least 60 seconds have elapsed since sending;
- enforce at most 5 sends per hour from the authoritative service, with concise actionable limit/retry feedback when blocked rather than a mandatory quota counter;
- provide **Use a different email** and **Back to sign in**;
- never display the reset secret in application UI or diagnostics;
- never claim a real email arrived when a mock service only simulated acceptance.

Proposed instruction: **Enter the 6-digit code from the email. It is valid for 10 minutes.** / **Введите 6-значный код из письма. Он действует 10 минут.** Proposed resend action: **Send new code** / **Отправить новый код**. Use expiry/cooldown feedback when actionable; no permanent remaining-send counter is required. Exact presentation, hourly-limit recovery copy and Russian localization of the neutral statement remain open localization details. Do not expose or mask an address in a way that introduces an identity-existence branch. Any countdown reflects service-provided expiry/resend times and never establishes validity, eligibility, or delivery itself.

### 4.4 Enter reset code

Required controls and behavior:

- title: **Enter reset code** / **Введите код сброса**;
- visible label: **6-digit code** / **6-значный код**;
- render exactly six visual cells as one semantic input with one accessible name and coherent typing, deletion, selection, and error association;
- accept exactly 6 decimal digits, including a complete whole-code paste and platform one-time-code autofill where supported;
- automatically submit verification when the logical value changes and becomes a complete six-digit value; whole-code paste follows the same path;
- do not require or render an additional Continue or Confirm button;
- allow only one verification for the current logical value while a request is in flight; reconcile an uncertain result before retrying and do not reverify an unchanged complete value during rerenders;
- **Send new code** remains unavailable until the service-provided 60-second threshold, and an accepted resend replaces the prior code;
- code verification must include the reset purpose and authoritative identity/request context, never the digits alone.

Do not render the new-password form until the service reports that this reset code is currently eligible. While verifying, show the stable form frame with a plain loading status and no shimmer.

Code format/validation and authoritatively incorrect-code errors appear directly beneath the six-cell semantic input. An incorrect code remains visible and is selected for replacement; do not clear it automatically. A verification transport/service error preserves the entered code and reports an unknown/retryable outcome rather than relabeling it incorrect. The code is never persisted beyond the active form lifecycle.

Possible authoritative states:

- `valid` — permit password entry for the bound reset context;
- `expired` — do not permit mutation; offer another email;
- `used` — do not permit mutation; offer sign-in and another email;
- `invalid` — retain the complete digits, show the error beneath the cells, select the logical value for replacement, and wait for a changed complete value before automatic verification can run again; do not auto-clear or loop on the unchanged rejected value;
- `replaced` — the code was superseded by a newly sent code; require the newer code;
- `revoked` — do not permit mutation; offer another email;
- `temporarily_unavailable` — keep safe pending context in memory, show Retry, and do not relabel the code invalid.

An expired/replaced message may say **This code is no longer valid. Send a new code.** / **Этот код больше не действует. Отправьте новый код.** Code-state copy remains security-neutral and must not reveal whether the submitted email maps to an account. Invalid-code attempt limits, lockout, and post-success reuse/consumption remain OPEN-06; they are not inferred from format or expiry.

### 4.5 Set new password

Required controls:

- **New password** / **Новый пароль**;
- **Repeat new password** / **Повторите новый пароль**;
- separate show/hide controls with persistent accessible names;
- primary action: **Set new password** / **Установить новый пароль**;
- secondary action: **Cancel** / **Отмена**.

Password managers and paste must work. The interface must not log, retain, translate, or expose either password value.

Both fields are required. The new password must contain at least 8 characters; no uppercase, digit, or special-character class is mandatory. The repeated value must match before the client submits password installation. A too-short value is an error beneath **New password**; a mismatch is an error beneath **Repeat new password**. A service-level failure appears above **Set new password** and preserves both entered values within the active form. Maximum length, Unicode/counting semantics, breached-password handling, and server-side abuse controls remain OPEN-03. Registration, reset, and authenticated password change must use one consistent policy source.

### 4.6 Reset success

Required content:

- one unambiguous success statement;
- confirmation that the user is signed in on this device and other sessions were ended, only after the service confirms both effects;
- the applicable validated project return or New dub destination;
- no password value, reset secret, account metadata, project data, or balance data;
- no claim that other sessions ended while revocation is unconfirmed or failed.

Do not require a separate sign-in step and do not leave any other pre-reset session usable. Proposed success copy: **Password changed. You’re signed in on this device. Other sessions were signed out.** / **Пароль изменён. На этом устройстве выполнен вход. Остальные сеансы завершены.** After the service confirms the complete outcome, return to a valid preserved project screen/state without replaying processing, capture, billing, or assembly; otherwise open New dub. Do not default to My projects.

## 5. Transitions and recovery

### 5.1 Main request path

1. User opens password recovery from Flow 02.
2. User enters an email and activates **Send reset email**.
3. The client prevents duplicate local submission while the request is pending.
4. The request service returns either invalid syntax, an actionable existence-neutral transport/service failure, or a neutral public request result with opaque code-entry context.
5. For the neutral result, show **If an account with this email exists, we sent a code** and the in-app reset-code state. Do not infer delivery, eligibility, or account existence from this transition.
6. No account session, registration, link, project, or credit state changes yet.

### 5.2 Main reset path

1. User receives the emailed reset code and enters it in the application.
2. When one changed logical value becomes exactly 6 decimal digits through typing, autofill, or whole-code paste, the client automatically submits it with the bound reset request/identity context. There is no required Confirm action.
3. A currently valid, purpose-bound code opens the new-password form.
4. User enters **New password** and **Repeat new password**. Both are required; the new value has at least 8 characters, no character class is mandatory, and the repeated value must match before submission.
5. The reset service performs one authoritative mutation.
6. Success establishes a new authoritative 30-day session on this device and terminates all other sessions before navigation; post-success code consumption follows the remaining OPEN-06 security contract.
7. Navigate to a valid preserved project screen/state without replaying an operation; otherwise open New dub.

### 5.3 Expired, used, replaced, invalid, and revoked codes

- Never submit a password mutation after the service reports an ineligible code.
- Keep eligible code-lifecycle reasons distinguishable in logical state while public copy remains account-existence-neutral.
- For an authoritatively incorrect code, retain and select the digits, show the error beneath the six cells, and wait for the user to change the logical value; never auto-clear or automatically resubmit the unchanged value.
- Treat timeout/network uncertainty as unknown, not invalid. Reconcile it before permitting an intentional retry so rerenders cannot consume repeated verification attempts.
- Offer **Request another email**; do not automatically send one.
- **Back to sign in** remains available.
- Retrying inspection after a transport failure is not the same as requesting another email.

### 5.4 Resend and repeated requests

- Resend uses the opaque request context established by the neutral request response; the UI does not need an existence-bearing identity result.
- A resend action must show pending, accepted, cooldown, hourly-limit, and unavailable states honestly.
- Resend becomes eligible no earlier than 60 seconds after sending. At most 5 reset emails may be sent per hour; exact fixed-versus-rolling accounting remains OPEN-06.
- An accepted resend issues a new 6-digit code with its own 10-minute lifetime and immediately replaces the older code.
- Client-clock changes must not bypass service-provided resend eligibility, expiry, or the hourly send limit.

### 5.5 Service and validation failures

- Invalid email shape: attach a concise error to the email field and focus it on submission.
- Repeated-password mismatch: show the error beneath **Repeat new password** without clearing either field.
- Password policy rejection: present the authoritative unmet rule without echoing the password.
- Request/reset unavailable: show an existence-neutral service error above the current primary action, preserve active-form values, offer Retry when valid, and do not report success. Distinguish this actionable transport/service failure from invalid email syntax and from the neutral request response.
- Rate limit: show an actionable retry state only if the service supplies a safe retry time; exact behavior is OPEN-06.
- Proof expires between inspection and submit: preserve no password after leaving the form; show expired recovery and another-email actions.
- Concurrent/double submit: only one authoritative result may win; never show two success states or retry a mutation blindly.
- Duplicate automatic code verification: suppress a second in-flight request for the same logical value and do not automatically retry an unchanged completed value after success, rejection, timeout, or rerender; a changed complete value may start the next allowed verification.

### 5.6 Reload, Back, Forward, and interruption

- Reload on the request form returns to a usable request form and never sends an email automatically.
- Same-browser reload on check-email/code entry restores the screen and selected email only through the authoritative opaque pending-flow reference and never claims or triggers a resend.
- Reload on code entry rechecks the authoritative request/code context; cached `valid` state is insufficient.
- Reload during submission checks the authoritative result before allowing another mutation.
- Back/Forward after success must not restore an actionable password form.
- New/repeated password fields are cleared on reload, route exit, expiry, success, and cancellation.
- Pending reset context is not transferred to another device. That device starts a new reset request for the same purpose and identity under the existing resend/rate limits; a newly issued code replaces the previous code, and changing devices cannot bypass those limits.
- Cleared-browser-data recovery and longer pending-context retention remain OPEN-08. No password or local verification/session inference is persisted, and no retention constant is selected.

## 6. Account and session impact

- Password recovery does not create an account, grant welcome credits, or complete an unverified registration; Flow 03 owns email verification and completion.
- It does not attach Google or merge libraries/balances; Flow 05 owns explicit verified linking, and a matching Google email is never authority to reset, create, or link a password identity.
- Google-only, unverified, disabled, deleted, and nonexistent identities receive the same neutral public request statement and code-entry presentation as any other syntactically valid email. This presentation cannot create password eligibility; only authoritative valid purpose-bound proof can open password installation.
- After durable reset, establish a new 30-day session on the current device and terminate every other session; client navigation/local state cannot stand in for either authoritative result.
- A preserved project return may be used only after authentication succeeds and its route/access/current-state guards pass. Otherwise open New dub.
- After reset sign-in, retain an explicit manual pre-sign-in language choice and update the account preference. If the pre-sign-in locale was only browser-derived, do not overwrite a different saved account preference.

## 7. Responsive, keyboard, and accessibility behavior

### Desktop (768 CSS pixels and above)

- Use the shared compact top header, 32px page gutters, a single-column form region up to 400px, source-derived field geometry and role-sized buttons according to design-tokens.md, and 32px page heading.
- Keep instruction, fields, errors, and actions in one reading order.
- Do not place unrelated product promotion beside the recovery form.

### Phone (below 768 CSS pixels)

- Use 16px page gutters, a single-column form filling the available width up to 400px, 48px inputs/buttons, and a 24px page heading.
- Controls and icon buttons need at least 44px touch targets; the approved 48px form controls satisfy this.
- No horizontal page scroll.
- Keep the primary action visible after the software keyboard without fixed overlays hiding fields or errors.
- Do not replace the header with a sidebar or multi-level account menu.

### Keyboard and assistive technology

- Logical order: header, title/instructions, fields, field help/errors, primary action, secondary actions.
- Code verification is driven by a changed complete six-digit logical value; Enter does not create an extra verification request or trigger Resend from an unrelated state.
- Visible focus is required for every interactive element.
- On validation failure, focus the first invalid field and associate each message programmatically.
- Announce pending, accepted, expired, used, unavailable, and success state changes without stealing focus repeatedly.
- Show/hide controls expose current state and do not move focus or change field content.
- Errors use text plus structure/iconography; color alone is insufficient.

## 8. Logical service boundary

Names below describe responsibilities, not approved endpoints or implementation files.

| Logical operation | Inputs | Required result categories |
|---|---|---|
| `requestPasswordReset` | email, locale, validated return intent if supported | invalid syntax; actionable existence-neutral transport/service failure; or one neutral public result with opaque request context and safe `expiresAt`, `resendAt`, and send-limit state, independent of identity-existence class |
| `readPasswordResetPending` | same-browser opaque pending-flow reference | pending code-entry state with selected email and authoritative expiry/resend facts; expired/closed; unavailable; never password material or local verification/session inference |
| `verifyPasswordResetCode` | bound reset request/identity context, changed complete 6-digit logical value, verification operation identity | valid, expired, used, replaced, invalid, revoked, attempt-limited, unavailable/unknown; duplicate in-flight and unchanged-value submissions reconcile without a second blind attempt |
| `submitNewPassword` | eligible bound reset context and new password, only after required Repeat new password matches | durable password/session/revocation success; policy rejection, conflict, expired, used/replaced, invalid/revoked, rate limit, unavailable |
| `resolveSession` | current session context | authenticated, anonymous, expired, unavailable |
| `applyResetSessionPolicy` | successful durable password reset | current-device session established with authoritative 30-day expiry and all other sessions terminated, or explicit partial/failure result that must not navigate as complete |
| `resolvePostResetDestination` | successful reset session, preserved project return context if present | guarded persisted project screen/state with no command replay, otherwise New dub |

After authoritative reset completion, attach the localized `password-reset-completed` notice only after a fresh signed-in identity refresh succeeds. Carry it as one-use typed transient navigation state to the existing safe project-return or New dub destination; consume it once with history replacement while preserving unrelated route state. Do not put reset secrets or identity/password data in the URL or storage. The notice adds no route or mandatory continuation step. See the bounded local handoff in [issue 71](https://github.com/dystrophyless/dubbed.ai/issues/71); it is not production session-revocation proof.

The service layer is centralized and interchangeable, as required by the shared contract. Zustand may coordinate view state but is not an authority for proof eligibility, password mutation, email delivery, or session revocation.

Each form maps validation failures beneath the affected field and service failures above its primary action. A failed request preserves the active-form values, but passwords/codes are never placed in persisted Zustand state or retained after success/exit.

### Mock-truth boundary

A mock may deterministically simulate every result above, including identical neutral request presentation for existing, Google-only, unverified, disabled, deleted, and nonexistent identity fixtures; invalid syntax; existence-neutral transport/service failure; six-cell typing and whole-code paste auto-verification; duplicate/in-flight suppression; unchanged-value rerenders; incorrect-code retention/selection; timeout as unknown; delay; expiry; used/replaced code; same-browser restoration of code entry and selected email without auto-resend or password persistence; another-device new request without pending-context transfer or rate-limit bypass; policy rejection; session outcome; and guarded destination resolution.

A mock cannot prove:

- that any email was delivered;
- that the neutral request response corresponds to an existing account or reset-eligible identity;
- ownership of a mailbox;
- reset-code generation quality, purpose/identity binding, expiry/replacement enforcement, replay resistance, or post-success consumption;
- password hashing, breached-password checks, rate limiting, abuse prevention, or account-enumeration resistance;
- session invalidation across browsers/devices;
- provider uptime, sender reputation, or deliverability.

UI checks against a mock must be labeled simulation, not backend, provider, or security evidence.

## 9. Acceptance criteria

All criteria are unexecuted. `BLOCKED` means an owner/security decision is still required.

- [ ] **AC-04-01 Request form:** English/Russian request UI accepts an email, exposes pending/failure states, supports keyboard use, puts syntax validation beneath the field, puts an actionable existence-neutral transport/service error above the primary action, preserves the email on failure, and never mutates account state on cancellation. Remaining abuse behavior stays `BLOCKED` on OPEN-06.
- [ ] **AC-04-02 Neutral request next step:** every syntactically valid email receives the same **If an account with this email exists, we sent a code** response and code-entry interface, with no Account not found or identity-class branch. It explains the 6-digit code and 10-minute lifetime and exposes new-code/different-email/sign-in actions without treating the neutral response or a mock as delivery, account-existence, or reset-eligibility proof.
- [ ] **AC-04-03 Code lifecycle:** six visual cells expose one accessible logical input; a changed complete 6-digit typed, autofilled, or pasted value automatically starts verification without a required Continue/Confirm button. Only one request for that value may be in flight, rerenders never reverify it unchanged, and uncertain outcomes reconcile before retry. An authoritatively incorrect code remains visible, shows its error beneath the cells, and is selected for replacement without auto-clear; timeout remains unknown rather than invalid. Service validity starts at email sending and ends after 10 minutes; resend is unavailable before 60 seconds; at most 5 sends per hour are accepted; a newly issued code replaces the prior code; cached client state cannot extend or revive a code. Invalid-attempt and post-success consumption behavior remain `BLOCKED` on OPEN-06.
- [ ] **AC-04-04 Password form:** required **New password** and **Repeat new password** fields support paste/password managers and accessible show/hide controls. Values shorter than 8 characters cannot succeed; an 8-character value is not rejected for length alone; uppercase, digit, and special-character classes are not mandatory; mismatch appears beneath Repeat new password. A service failure appears above Set new password and preserves both active-form values without persisting them. Maximum length, Unicode/counting, and remaining server policy stay `BLOCKED` on OPEN-03.
- [ ] **AC-04-05 Successful reset:** exactly one authoritative password mutation is represented as success; the current device receives a new 30-day signed-in session, all other sessions terminate, and no separate sign-in is required. A valid preserved project context returns to its persisted screen/state without replaying processing, capture, billing, or assembly; otherwise New dub opens. Account creation, registration completion, linking, and a My projects default do not occur. Post-success code consumption remains `BLOCKED` on OPEN-06.
- [ ] **AC-04-06 Interruption:** same-browser reload restores code entry and the selected email only through an authoritative pending reference, without auto-resend, password restoration, or local verification/session inference. An expired code exposes only an eligible explicit resend under existing limits. Another device receives no transferred pending context and starts a new request under those same limits; a newly issued code replaces the previous code. Back/Forward, transport failure, duplicate/in-flight automatic verification, unchanged-value rerender, and expiry-between-inspection-and-submit never fabricate delivery, validity, mutation, or session revocation or automatically spend another verification attempt. Cleared-browser-data and longer pending-context retention remain OPEN-08.
- [ ] **AC-04-07 Separation:** existing email/password, Google-only, unverified, disabled, deleted, and nonexistent identity fixtures receive the same neutral request presentation; none can silently create/link a password identity or bypass Flow 03/05, and password installation still requires authoritative valid purpose-bound proof.
- [ ] **AC-04-08 Responsive access:** Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed. Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.
- [ ] **AC-04-09 Evidence truth:** mock verification is reported as simulation; real email, backend security, session revocation, and cross-device behavior remain unverified until production-capable dependencies and evidence exist.
- [ ] **AC-04-10 Locale continuity:** first use selects Russian for browser `ru`, English otherwise; manual switching works without clearing active values; an explicit pre-sign-in choice survives reset sign-in and updates the account preference; a browser-derived choice does not overwrite a different saved preference.

## 10. Verification plan — not executed

- Component/state checks for request, neutral-response/code entry, password form, and success states in EN/RU.
- Keyboard-only walkthrough: focus order, Enter behavior, error focus, show/hide controls, Resend isolation, and Back to sign in.
- Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed. Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.
- Mock contract matrix proves byte-for-byte-equivalent neutral request presentation for syntactically valid existing email/password, Google-only, unverified, disabled, deleted, and nonexistent identity fixtures; no Account not found branch exists. Separate cases cover invalid syntax, existence-neutral transport/service failure, six-cell typing completion, whole-code paste, one auto-verification per changed complete value, duplicate in-flight suppression, unchanged-value rerenders, incorrect-code retention/error/selection without auto-clear, timeout as unknown, same-browser code-entry/selected-email restoration without auto-resend/password persistence, another-device new request without context transfer or limit bypass, valid/expired/used/replaced/invalid/revoked code, invalid-attempt limit, policy rejection, conflict, and successful reset.
- Navigation/reload cases for request form, same-browser check-email/code-entry restoration, expired-code explicit resend, in-flight submit, another-device new request, and success history; verify no pending-context transfer, new-code replacement of the prior code, guarded return to each valid persisted project state, and New dub fallback for missing, invalid, deleted, or stale project context, with no operation replay.
- Format and timing boundaries: 5 digits do not verify; the transition to 6 changed digits verifies once; 7/non-decimal input is rejected; whole-code paste/autofill verifies once when complete; rerender and unchanged selection do not reverify; edited complete replacement may verify; exactly 10 minutes from service send time, resend at 59/60 seconds, first through sixth sends in the authoritative hourly window, and old-code rejection after resend.
- Purpose/identity-boundary checks prove registration codes cannot reset passwords, reset codes cannot verify registration, and a reset code cannot be applied to another identity/request.
- Evidence-boundary checks prove the neutral response and code-entry state are never recorded as evidence of delivery, account existence, or reset eligibility; only authoritative valid purpose-bound proof permits password installation.
- Boundary checks that no password or reset code reaches Zustand persistence, analytics, visible diagnostics, URL logging, or error text under the final security design.
- Boundary checks for 7- and 8-character passwords against the shared registration/reset policy source; verify that 7 cannot succeed and 8 is not rejected for length alone.
- Password-form checks require both fields, accept ordinary 8-character passphrases without uppercase/digit/special-class requirements, place too-short and mismatch errors beneath their respective fields, place service errors above Set new password, preserve both values on service failure, and clear them on exit/success.
- Locale checks cover first use with `ru`, first use with another browser language, manual EN/RU switching during every step, explicit pre-sign-in choice overriding a saved account preference after reset, and browser-derived locale yielding to the saved preference without overwriting it.
- Integration checks with a real backend/email provider for delivery, ownership proof, code expiry/replacement, purpose/identity binding, replay/post-success consumption, send/attempt limits, the remaining password policy, current-device 30-day session creation, and termination of every other session; these cannot run from the current frontend-only specification.
- Target-browser/device checks remain required before claiming support in Chrome, Edge, Firefox, Safari, Android Chrome, or iPhone Safari.

Record command or method, result, environment, date, revision/dirty boundary, fixture or account class, and evidence location. No check has been run for this draft.

## 11. Open decisions and dependencies

| ID | Decision/dependency | Why it blocks |
|---|---|---|
| RESOLVED-01 | Emailed reset code entered in the application; no reset-link-only or link-plus-code alternative. Code is exactly 6 decimal digits and purpose/identity bound separately from registration codes. | Owner answer, 2026-10-22. |
| RESOLVED-02 | Code validity is 10 minutes after email sending; resend is eligible after at least 60 seconds; maximum 5 sends per hour; a new code replaces the previous code. | Owner answer, 2026-10-22. |
| RESOLVED-03 | Reset requires New password and Repeat new password; both are required and must match before submission. Minimum 8 characters; no mandatory uppercase, digit, or special-character class. | Owner answers, 2026-10-22. |
| OPEN-03 | Remaining password policy: maximum length, Unicode/counting semantics, breached-password handling, and server-side abuse controls. | Determines complete authoritative validation and evidence; resolved client rules must not be expanded independently. |
| RESOLVED-04 | After correct code verification and durable new-password installation, automatically sign in on this device for the selected 30-day lifetime and terminate all other sessions. No separate sign-in and no surviving other session. | Owner answer, 2026-10-22. |
| RESOLVED-05 | Every syntactically valid email receives **If an account with this email exists, we sent a code** plus code entry, without Account not found or another existence-dependent branch. Syntax and actionable transport/service errors remain distinct and existence-neutral. The neutral response proves neither delivery nor reset eligibility. | Owner answer, 2026-10-22. Exact Russian localization remains review work, not a disclosure-policy choice. |
| OPEN-06 | Invalid-code attempt limit/lockout, exact hourly send-window accounting, post-success code consumption/replay behavior, and remaining abuse mechanics. | Determines unresolved errors and complete security verification; the visible 60-second/5-per-hour resend limits are resolved. |
| RESOLVED-07 | Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed. Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged. | Shared owner answers and approved design tokens, 2026-10-22. Font asset/loading/fallback, browser/rendered proof, and screen-specific geometry remain evidence gaps; common tokens are resolved. |
| RESOLVED-08A | Same-browser reload restores code entry and selected email through an authoritative opaque reference without auto-resend, password persistence, or local success inference. Pending context does not transfer to another device; that device starts a new request under existing send limits and a newly issued code replaces the previous code. | Owner answers, 2026-10-22. |
| OPEN-08 | Cleared-browser-data recovery and longer pending-context retention/abandonment; no retention constant is selected. | Determines whether any context survives beyond the approved same-browser reference lifecycle. |
| RESOLVED-09 | After successful automatic sign-in, return to a valid persisted project screen/state without replaying operations; otherwise open New dub. Do not default to My projects. | Owner answer, 2026-10-22. |
| RESOLVED-10 | Initial locale follows browser `ru` else English; manual switch is available; an explicit pre-sign-in choice has priority after sign-in and updates the account preference. Field errors sit beneath fields; service errors sit above the primary action and preserve active-form values. | Shared owner answers, 2026-10-22. |
| RESOLVED-11 | Reset verification uses six visual cells over one semantic value and automatically verifies a changed complete six-digit typed/autofilled/pasted value without a required Confirm button. Duplicate/in-flight and unchanged-value rerender submissions are suppressed and uncertain outcomes reconcile. | Shared owner answer, 2026-10-22. |
| RESOLVED-12 | An authoritatively incorrect code retains and selects its digits, shows the error beneath the cells, and is not auto-cleared or reverified unchanged. Timeout/network uncertainty is not invalid proof. | Shared owner answer, 2026-10-22. |
| DEP-01 | Flow 02 sign-in and validated return-intent contract. | Owns entry, cancellation, and sign-in destination. |
| DEP-02 | Flow 03 registration/email verification. | Prevents reset from silently completing unverified registration. |
| DEP-03 | Flow 05 explicit account linking. | Prevents email matching from merging identities. |
| DEP-04 | Real backend identity/session service and email provider. | Required for delivery, proof security, password mutation, and session evidence. |
| DEP-05 | [`design-tokens.md`](design-tokens.md). | Normative semantic roles, component interaction states, focus treatments, typography, spacing, and motion; implementation still requires browser/rendered evidence. |

## 12. Contract and verification boundary

The current contract defines the proof method/parameters, reset fields and base password rules, post-reset session handling, shared visual/form/locale contract including typography, common spacing, and motion direction, destination behavior, neutral request disclosure, six-cell automatic verification, incorrect-code recovery, same-browser pending restoration, and the no-cross-device-transfer/new-request rule. These decisions come from the matching owner-answer sections in the shared contract and are integrated above rather than treated as override footnotes. Only OPEN-03, OPEN-06, and the narrowed OPEN-08 cleared-data/longer-retention question remain unresolved in this flow; no design-skill default or author recommendation is an approved requirement.

This typography synchronization applies `.agents/skills/design-taste-frontend/SKILL.md` and `.agents/skills/frontend-design/SKILL.md` only as presentation guidance. The shared owner answer supplies the normative weights and line heights; this pass did not verify font assets, fallback rendering, or visual output.

This specification pass did not run a mock, send email, verify an account, or test reset eligibility. The neutral response is a privacy-preserving presentation contract, not delivery, provider, backend-security, or eligibility evidence.
