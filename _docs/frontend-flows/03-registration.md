# Flow 03 — Registration and email verification

Date: 2026-10-26 (Asia/Qyzylorda).
Status: synchronized specification draft; remaining owner decisions are listed in Section 14
Mode: specification only; no product implementation, email delivery, Google authentication, backend security, browser run, or verification is authorized or claimed

## 1. Authority and scope

This flow follows [the shared frontend contract](00-shared-contract.md), then the latest owner answers, then unchanged behavior in [SPEC-001](../specifications/SPEC-001_dubbed_mvp.md) and [BR-001](../business-requirements/BR-001_custom_video_dubbing.md).

It owns pending email/password creation, verification-code entry and recovery, verified completion, adding the requested password method to an existing same-email Google-only account after purpose-bound email-code verification, the Flow 05 handoff when explicit different-email linking is required, authoritative welcome-grant presentation, and first-time Google registration as an alternative account-creation entry.

It owns the confirmed direct New dub exit for successful registration. It does not own general sign-in, password reset, account linking, account settings, account deletion, or destinations after other authentication flows; those belong to Flows 02, 04, 05, and 15.

## 2. Confirmed product contract

- Email/password registration uses one password field with show/hide, requires at least 8 characters, has no mandatory uppercase, digit, or special-character class, and has no repeat-password field. Registration, Flow 04 reset, and authenticated password change use the same authoritative minimum/composition policy source.
- Registration verification uses exactly 6 decimal digits, valid for 10 minutes from the service-authoritative email send time; another code may be sent no earlier than 60 seconds after the latest send, with at most 5 total sends in a service-defined hour, and each newly sent code replaces the previous code.
- Google authentication is available as an alternative to email/password registration.
- For a validated first-time Google identity that is not associated with a Dubbed account, successful registration creates one verified canonical account, establishes its signed-in session, applies the eligible welcome grant exactly once, and opens New dub. This branch does not require an additional emailed verification code.
- A client-entered matching address is not identity proof. The identity service must validate Google authentication/email assertions and purpose-bound email-code verification authoritatively.
- When authoritative Google authentication uses the same email as an existing email/password account, link that Google method to the existing canonical account and sign in. Do not require password proof or an Account-settings detour for this exact entry case.
- When email/password registration uses the email of an existing Google-only account, successful purpose-bound registration-code verification adds the requested password method to that existing canonical account and signs in. Do not require Google proof or an Account-settings detour for this exact entry case.
- Neither same-email path creates or merges a second account, moves data to another account, or issues another welcome grant. Preserve the existing canonical balance, projects, and one-time grant history.
- When registration resolves to an account that already has a password, show **Account already exists** with **Sign in** and **Reset password** actions. Do not install or overwrite a password, create another account, or issue another welcome grant.
- This explicit registration disclosure applies only to the existing-password collision. Flow 02 keeps its neutral **Incorrect email or password** invalid-credential error, and Flow 04 keeps its neutral reset-request response.
- The same-email exceptions supersede blanket fresh dual-proof only for these two exact entry paths. Manually linking different-email methods still requires fresh proof of both methods through Flow 05; a method already bound to another account remains blocked without merge.
- The identity service is authoritative for pending-registration state, verification-code validity, verified status, account status, session eligibility, and linking eligibility.
- An eligible verified account receives exactly 120 welcome credits once.
- Welcome credits do not expire.
- Reload, callback replay, repeated completion, Google relinking, and account-method linking must not duplicate the grant.
- After account deletion, the same email address or Google identity may register again and create a new canonical account, but it is ineligible for another 120-credit welcome grant. Re-registration restores no deleted projects, prior balance, or other deleted account state.
- The identity/grant services decide returning-identity eligibility authoritatively. The frontend neither infers nor exposes the retained eligibility fact; its minimum storage, privacy controls, and retention mechanics remain a technical/policy gate rather than a guessed constant here.
- The browser displays authoritative account and grant results; it never computes or issues the grant.
- The verified-registration session remains signed in across browser close/reopen for 30 days from sign-in unless explicit sign-out or authoritative revocation ends it earlier; there is no required Remember me choice.
- English and Russian are supported on desktop and phone.
- First use is Russian when the browser locale is `ru`, otherwise English. A manual pre-sign-in language choice takes precedence over a different saved account preference after sign-in and updates that preference; a browser-derived default does not overwrite it.
- Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed.
- Guest authentication screens use compact top navigation and no permanent sidebar.

## 3. Purpose, entry, and exit

### 3.1 Purpose

The screen answers one question first: **What must I do to create and verify my account?**

The most frequent action is the current primary operation: create the pending registration or complete the six-digit verification value for automatic submission. The code-entry state has no required confirmation button; successful verification continues automatically to New dub.

### 3.2 Entry

Entry comes from Flow 01 or Flow 02, a safe return intent, the active code-entry state, same-browser reload of a pending registration through its authoritative opaque reference, or an identity result requiring reconciliation.

A return intent is only navigation context. It cannot bypass verification, linking, account status, or session checks.

### 3.3 Exit

Exits are correct-code completion to signed-in New dub for either a newly completed account or the existing same-email Google-only account after password-method addition; successful first-time Google registration with a verified canonical account/session and eligible exactly-once welcome-grant result; successful Google continuation through Flow 02, including authoritative same-email auto-link/sign-in to an existing email/password account; `link_required` to Flow 05 only where explicit linking remains required; **Sign in** to Flow 02 or **Reset password** to Flow 04 from **Account already exists**; cancellation to the safe referring public route; or a service-reported terminal blocked state.

No exit may claim a signed-in session, verified email, linked method, or granted credits before the responsible service confirms it.

## 4. Information architecture and visual anatomy

### 4.1 Shared frame

- A compact top bar carries product identity, locale access, and the relevant sign-in/register alternative.
- There is no sidebar.
- The main region has one `h1`, one plain supporting sentence, the active form or status, and only the recovery actions needed for that state.
- Use Mabry Pro Regular and Medium only, never Bold: body text is Regular 16 px/24 px, supporting captions are Regular 14 px/20 px, buttons use Mabry Pro Medium 14px/20px for task, secondary and navigation actions and Medium 16px/24px for prominent/landing actions; phone buttons use Mabry Pro Medium 16px/24px with retained 48px targets, field labels are Medium 14 px/20 px, and the page heading is Medium 32 px/40 px desktop and 24 px/32 px phone. Actual font asset availability/loading, approved fallback behavior, and screen-specific geometry not implied by the common spacing roles still require implementation evidence or a shared decision; these weight roles, sizes, line heights, and common spacing scale are resolved.
- Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed.
- Buttons and single-line inputs use component-specific source geometry. Do not add gradients, glass, glow, unmapped decorative shadows, decorative display faces, all-caps styling, or a wrapper card around every block.
- Use 8 px between closely related elements, 16 px between form fields/buttons, 24 px between blocks within the screen, and 32 px between major sections. Existing panel padding is 24 px at and above 768 px and 16 px below 768 px; page gutters remain the separate 32 px/16 px values. Do not add a panel or card merely to apply padding.

### 4.2 Desktop composition

At 768 CSS px and above, use regular top navigation, 32 px page gutters, approved desktop action roles and separate derived single-line-input geometry, and a registration form no wider than 400 px. The shared working area is capped at 1200 px, but the form remains the narrower focused column. Product identity and locale stay available without competing with the form. There is no floating marketing-card shadow.

### 4.3 Phone composition

Below 768 CSS px, use mobile navigation, one column, 16 px page gutters, and 48 px standard buttons and single-line inputs. The form uses the available width without exceeding 400 px or overflowing. The primary action follows the fields without a fixed overlay. The keyboard must not cover the focused field, validation message, or submit result. Long addresses wrap or truncate without page-level horizontal scrolling while retaining an accessible full value.

### 4.4 Form rules

- Every field has a persistent visible label; placeholder text never substitutes for a label.
- Registration has one password field, no repeat-password field. It supports paste and password managers, displays the minimum 8 characters, and imposes no mandatory uppercase, digit, or special-character class. Maximum length, Unicode/counting semantics, breached-password handling, and server abuse controls remain OPEN.
- The password show/hide control has an accessible name, preserves the value and caret where supported, and never changes the submitted value.
- Field-specific errors sit directly beneath the affected field. Service-level errors sit above the current primary action. A failed request preserves all entered values within the active form lifecycle, including the password or code, but does not persist either secret beyond that lifecycle or after success.
- On button-submitted forms, Submit remains available for ordinary client-side mistakes so attempted submission can reveal actionable validation; only an active duplicate request may temporarily disable it. Verification-code entry instead follows the changed-complete-value automatic-submission guard in Section 5.4.
- Loading preserves form geometry and current entered values needed for correction.

## 5. Screens and states

### 5.1 Create account

Required content:

- title and short explanation;
- **Continue with Google** / **Продолжить с Google**;
- a clear separator expressed in words, not decoration alone;
- labeled email and password fields;
- one password field with show/hide and **At least 8 characters** / **Не менее 8 символов**; do not require uppercase, digits, special characters, or repetition;
- **Create account** / **Создать аккаунт**;
- **Sign in** / **Войти** link for an existing account;
- locale control from the shared shell, using browser `ru` → Russian and all other browser locales → English only when there is no preference; a manual pre-sign-in choice is retained after registration and updates the new account preference.

The Google action starts the shared provider-authentication boundary. This specification does not claim a real provider, popup, redirect, consent screen, or callback implementation.

### 5.2 Submission pending

The submitted action shows an in-place busy state and prevents duplicate starts. Field errors render beneath their fields; service errors render above **Create account**. Failed requests preserve the email and protected password value within the active form lifecycle. A retry or reload after an unknown result reconciles the original attempt before creating another pending registration; the UI must not infer failure from a timeout.

### 5.3 Verification pending

The screen shows:

- **Check your email** / **Проверьте почту**;
- the destination address in the display treatment selected in `OPEN-F03-10`;
- one accessible logical six-digit decimal verification-code value presented as six visual cells on the registration screen, with whole-code paste, keyboard editing, and an appropriate numeric keyboard hint;
- actionable service-authoritative expiry and resend feedback: the code lasts 10 minutes, and resend is unavailable before 60 seconds; show the useful wait/recovery when it affects the next action rather than requiring administrative timing prose as primary content;
- when the send limit blocks the next request, explain the block and available recovery using authoritative eligibility; enforce at most 5 total sends per service-defined hour, including the initial send, without requiring a permanent quota/remaining-send counter;
- **Change email** / **Изменить email**, which returns to the email-registration form in correction mode, requires the password to be entered again, and does not silently carry the earlier password;
- a non-secret pending-state reference suitable for reload reconciliation.

On same-browser reload, that authoritative reference restores this code-entry state and its selected email without automatically sending another code. The password is never restored from browser storage. If the code has expired, the user may explicitly request a new eligible code under the existing cooldown and send-limit rules.

It must not say that an email was delivered when a mock or service has only accepted the request.

### 5.4 Verification-code resolution

Verification uses exactly 6 decimal digits sent by email and entered on the registration screen. Link-only verification and a combined link/code choice are excluded. Six visual cells represent one persistently labeled logical code value. Completing all six digits by keyboard entry or whole-code paste automatically starts verification; no additional **Verify email** / confirmation button is required. Each code expires 10 minutes after its email send time.

Only one verification request for the current logical value may be in flight. Rerender, refocus, or another completion event must not resubmit the same unchanged value. After an authoritatively incorrect response, keep all six digits visible, show the associated error beneath the cells, and select the logical code for replacement without auto-clearing it. Automatic verification may run again only after the logical value changes and is once more complete. An unknown/network outcome is reconciled before retry and is never converted into known-invalid proof or an automatic repeated attempt. Normalization beyond the exact six-decimal-digit value and invalid-code attempt limits remain OPEN.

Code outcomes are distinct service facts:

- valid and registration completed;
- valid but explicit account linking required;
- malformed or invalid code;
- code expired 10 minutes after its email send time;
- already-used code;
- code does not belong to the active pending registration;
- pending registration no longer exists or cannot continue;
- temporarily unavailable or result unknown.

Exact copy and recovery differences among invalid, expired, used, and mismatched codes remain `OPEN-F03-09`. The UI must never convert any of them to success locally.

Format and authoritatively incorrect-code errors sit beneath the six-cell logical field. Delivery, resend, closed-registration, unavailable, and unknown-result failures remain distinct service states and do not create a confirmation button or an automatic retry loop. A known incorrect code remains visible and selected for replacement; an uncertain outcome preserves the value while reconciliation determines whether a retry is safe. A successful verification clears the code when the form lifecycle ends.

### 5.5 Verified completion and direct continuation

After a correct code, the service must authoritatively confirm:

- email verification plus either new registration completion or password-method addition to the existing same-email Google-only canonical account;
- a signed-in session for that canonical account;
- authoritative existing balance/project identity and welcome-credit grant history, with a new grant result only when this completion created an eligible new account;
- readiness to open New dub.

For the existing Google-only branch, code verification authorizes adding only the password requested in this pending registration. It does not create a new account, require Google proof or an Account-settings detour, replace an existing password, merge accounts, or grant another 120 credits. If the canonical account already has a password, including because account state changed during pending verification, the service returns the **Account already exists** collision instead of writing.

After **Change email**, these facts may refer only to the corrected address and its current verification code. The abandoned pending identity and its invalidated code cannot produce completion, a session, or a welcome grant.

The flow opens New dub directly after session confirmation. It does not require a separate success screen or a success-to-sign-in action. The authoritative session lasts 30 days from sign-in across browser close/reopen unless sign-out or revocation ends it earlier; there is no required Remember me control. Navigation alone is not proof that the session or grant succeeded; an unknown completion result is reconciled before navigation or retry.

If the user manually chose a language before registration, New dub keeps that language and the account preference is updated to it. A browser-derived initial locale remains subordinate to an existing account preference and does not overwrite it.

New dub or the shared credits display may say **120 welcome credits added** only when authoritative account state proves this registration created an eligible account and caused the grant. The same-email Google-only password-add branch preserves the existing grant history, balance, and projects and must show current authoritative state without implying a second grant. Re-registration after deletion opens New dub with the new account's authoritative balance and no repeat welcome-grant message; it restores none of the deleted account's projects or balance.

### 5.6 Google alternative outcomes

For a validated Google identity that is not associated with a Dubbed account, the identity service creates one verified canonical account, establishes its signed-in session, applies the eligible 120-credit welcome grant exactly once, and returns New dub readiness. No registration email-code step is added to this Google branch. Reload, callback replay, and retry reconcile the same operation rather than creating another account, session lineage, or grant.

Other provider success continues through Flow 02's session/destination contract. When the validated Google identity has the same email as an existing email/password account, the identity service automatically links Google to that existing canonical account and signs in without additional password proof or an Account-settings detour. Preserve its projects, balance, and grant history; do not create/merge another account or issue another grant. Manually linking different-email methods remains Flow 05 dual-proof work, and a Google method already bound to another account remains a no-merge conflict. Cancellation returns to the unchanged registration screen without an account-success claim. Denial or failure gives a concise retry and keeps email/password registration available. An unknown callback status reconciles through the identity service before retry; client-entered email equality never substitutes for validated Google authentication and email assertions.

### 5.7 Existing-password registration collision

When the authoritative registration service determines that the target canonical account already has a password, show **Account already exists** and exactly the relevant continuations **Sign in** and **Reset password**. **Sign in** opens Flow 02; **Reset password** opens Flow 04. Do not install the submitted password, overwrite the existing password, continue to verification as though a new account were being created, create another account, establish a registration session, or issue another welcome grant.

The disclosure is specific to this registration collision. It does not change Flow 02's neutral **Incorrect email or password** error or Flow 04's neutral **If an account with this email exists, we sent a code** request response. The existing Google-only same-email branch remains distinct: after valid purpose-bound code verification, it adds the requested password because that canonical account does not already have one.

## 6. Main and alternate transitions

### 6.1 Email/password happy path

1. Enter email and password.
2. Submit **Create account**.
3. Service returns a pending registration and verification-delivery status.
4. Show verification-pending instructions.
5. Enter or paste the emailed verification code in the six visual cells; completion of the six-digit logical value automatically submits it once.
6. Service atomically reports new-account completion, password-method addition to the existing same-email Google-only account, **Account already exists** without a write, or another authoritative blocked/linking result; successful completion includes a signed-in canonical account session.
7. Reconcile authoritative account and exactly-once grant state; navigation does not stand in for either result.
8. Open New dub directly, without a separate sign-in or interactive success step.

### 6.2 Resend

Request resend from the active pending registration without clearing its context. Resend is unavailable until 60 seconds after the service-authoritative latest send time, and the service permits at most 5 total sends per hour, counting the initial send and every resend. A newly sent code immediately replaces the prior code; only the newest code can verify the registration, with its own 10-minute validity starting from its send time. Render accepted, cooldown, hourly-cap, unavailable, or unknown results from service state. The exact hour-window accounting boundary and response-privacy copy remain OPEN; client clocks cannot establish eligibility.

### 6.3 Email typo correction

1. From verification-code entry, **Change email** returns to the email-registration form in correction mode without sending the user back through the initial landing/registration entry.
2. The user enters the corrected address and enters the password again. The earlier password is neither displayed nor silently carried into this changed-identity request.
3. The service authoritatively changes/replaces the pending email-registration identity and requests a new verification email for the corrected address under the existing six-digit, 10-minute, 60-second resend and five-sends-per-hour parameters.
4. The previous verification code becomes invalid and cannot complete either the abandoned or corrected pending identity. The frontend renders the service's authoritative result and never treats local navigation as invalidation proof.
5. Registration completes only after a valid current code verifies the corrected address. The abandoned pending identity creates no completed account, welcome grant, or signed-in session.

A failed or unknown correction stays in recoverable correction/pending state with entered values preserved only for the active form lifecycle and must be reconciled before another request. Exact server ordering and rate-limit accounting remain technical service details under the existing limits; the client must not invent a new limit or allow the old code to win a race.

### 6.4 Reload and recovery

Reload in the same browser restores the code-entry screen and selected email from an authoritative opaque pending reference; local state is never sufficient proof and reload never sends another code automatically. The password is not persisted or restored, and restored UI state never proves verification, account completion, session creation, or grant issuance. If the current code expired, the user explicitly requests a new code only when the service reports eligibility under the existing resend rules. A used code may return an already-completed result only when safe and must never repeat side effects.

Pending registration context is not transferred to another device. The user starts a new registration-code request for the same purpose and identity under the existing cooldown and send limits; a newly issued code replaces the previous one, and device switching cannot bypass those limits. Cleared-browser-data recovery, longer pending-context retention/abandonment, and any alternate pre-registration return intent remain OPEN without an invented retention period.

## 7. Logical service boundary

Names below describe frontend responsibilities, not implemented APIs.

| Logical operation | Inputs | Required result categories |
|---|---|---|
| Start registration | normalized-for-transport email input, one password secret, effective locale and whether it was manually selected, safe return intent | pending reference and delivery request status; explicit `account_already_exists` collision with Sign in/Reset password continuations and no password write; field validation, rate limit, unavailable, unknown; other identity classes follow their applicable privacy rules |
| Read pending registration | same-browser opaque pending reference | pending with selected email and authoritative send/expiry/resend state, verified/completed, link required, expired/closed, unavailable; never password material or local verification/session inference |
| Resend verification | opaque pending reference | accepted with authoritative send/expiry/cooldown and remaining-send facts, 60-second cooldown, 5-send hourly cap, closed, unavailable, unknown |
| Change registration email | opaque pending reference, corrected address, freshly re-entered password, effective locale, and safe return intent; never a silently carried password | corrected pending reference plus new-code delivery/send/expiry/cooldown facts and authoritative invalidation of the previous code; field validation, conflict, rate limit, unavailable, unknown |
| Resolve verification code | exactly 6 entered decimal digits plus opaque pending reference and any service-required context | new account completed with signed session; requested password method added to existing same-email Google-only account with signed session; `account_already_exists` without overwrite if the account already has a password; link required where the exception does not apply; invalid, expired after 10 minutes, superseded by newer code, used, mismatched, unavailable, unknown |
| Read auth completion | opaque completion reference | canonical verified account, completion kind, unchanged existing projects/balance/grant history, eligible new-account grant result, or allowed post-deletion re-registration with no prior state restoration and no repeat grant; 30-day session anchored to sign-in, New dub readiness, link required, `account_already_exists` without registration session/grant, blocked account, unknown |
| Read credit state | canonical account identity/session | authoritative balance and exactly-once welcome-grant status, including authoritative ineligibility after deletion without exposing the retained eligibility mechanism |
| Reconcile locale | verified account/session plus effective locale and manual/browser source | retained manual choice and updated account preference, or retained account preference when only a browser default exists |
| Start Google authentication | registration purpose, locale and safe return intent | provider handoff; first-time verified canonical account/session creation with eligible exactly-once welcome-grant result and New dub readiness; cancellation; denial; ordinary existing-account success; same-email auto-link/sign-in to existing email/password account; different-email link required; already-bound conflict; unknown |

The client invokes `Resolve verification code` automatically only when the one logical code value first becomes complete or becomes complete after changing. It guards duplicate/in-flight calls for that value and reconciles an unknown outcome before allowing another request; rerendering cannot spend another verification attempt.

The centralized frontend services boundary may have an interchangeable mock. It must expose deterministic six-cell keyboard completion and whole-code paste, one automatic submission per changed complete value, duplicate/in-flight suppression, known-invalid retention/error/selection, unknown-outcome reconciliation without invalid-state inference, code-valid/expired/superseded states, cooldown/cap, same-browser reload restoration of code entry and selected email without auto-resend or password persistence, another-device restart without pending-context transfer and without bypassing resend limits, corrected-email success/failure/unknown, previous-code rejection after correction, corrected-address verification, new-account completion, first-time Google verified canonical-account/session completion with eligible exactly-once grant and no email-code step, allowed same-email/Google re-registration after deletion with a new canonical account but no restored projects/balance and no repeat grant, purpose-bound password addition to an existing same-email Google-only canonical account, `account_already_exists` both at initial registration and after an account-state race with no password write/session/grant, Sign in/Reset password continuations, authoritative same-email Google auto-link/sign-in to an existing email/password account, different-email `link_required`, already-bound conflict, Google cancellation/failure/unknown, session, unchanged existing balance/projects/grant history, eligible new-account grant, and locale reconciliation. It must never create a simulated session or grant from restored client state, the abandoned pending identity, or the existing-password collision; must never create a repeat grant for a returning deleted identity; and must never create a second account/grant for either same-email branch. It must not model the frontend as reading a durable deleted-identity marker. It must mark email delivery, password authorization/addition, provider authentication/linking, code invalidation/validation, session creation, account resolution, returning-identity eligibility, and grant issuance as simulation; it is not evidence that any production service exists or is secure.

## 8. Persistence, privacy, and security-visible behavior

- Passwords never enter URLs, analytics, logs, local persistence, error copy, or fixtures. The emailed verification code is secret and must not enter URLs, analytics, logs, persisted UI state, error copy, or fixtures.
- Passwords and codes may remain only in active form memory to satisfy failed-request value preservation; they are cleared after success or when that form lifecycle ends. Entering email-correction mode requires a freshly entered password and never restores or carries the original password from create-account state. Pending persistence contains only a same-browser opaque reference and allowed non-secret presentation state sufficient to restore the selected email; it contains no password or local verification/session conclusion. Addresses appear only for confirmation/correction; masking remains OPEN.
- The existing-password registration collision intentionally discloses **Account already exists** only in this registration context. Deleted, blocked, and other registered-address response classes remain governed by `OPEN-F03-11`; do not generalize this disclosure. Flow 02 invalid credentials and Flow 04 reset requests retain their neutral messages. Client timers may display service guidance but cannot decide validity.
- Completion kind, same-email method addition/linking eligibility, no-overwrite collision handling, grant issuance, 30-day session creation/revocation, and locale reconciliation require authoritative idempotent handling. Client-entered address equality is never identity proof. This frontend specification does not prove transport security, token entropy, hashing, abuse prevention, provider authenticity, or Mabry Pro asset availability.

## 9. Accessible interaction

- Reading and tab order follow the visible order: shell, title, provider action, form, secondary links, then state-specific recovery.
- Every field exposes a programmatic label, purpose, error association, and valid autocomplete metadata. The verification code is one accessible logical value presented as six visual cells; it supports whole-code paste and keyboard editing without six unrelated control names.
- Field failures focus the first invalid field. For an authoritatively incorrect code, retain and select the logical six-digit value for replacement and associate the error beneath the cells. Unknown/network outcomes use their distinct reconciled status rather than the invalid-code treatment. Other operation failures focus their status summary. Status updates use appropriate polite or assertive live announcements.
- Keyboard users can operate password visibility, create-account submission, code editing/paste, resend, address correction, locale, and recovery actions. Focus remains visible and returns after a dismissed transient UI.
- Copy never relies on color, icons, or elapsed animation.Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.  Reduced-motion disables interface transitions. Animation never delays verification, account/session save acknowledgement, capture in owning media flows, or navigation; video playback and synchronized audio-playhead function remain unaffected where owned elsewhere.

## 10. Core English/Russian copy

Core pairs are: **Create your account / Создайте аккаунт**; **Continue with Google / Продолжить с Google**; **Email / Электронная почта**; **Password / Пароль**; **Create account / Создать аккаунт**; **Check your email / Проверьте почту**; **6-digit verification code / 6-значный код подтверждения**; **Send again in {seconds} / Отправить снова через {seconds}**; **Change email / Изменить email**; **Sign in / Войти**; **Email verified / Email подтверждён**; **Try again / Повторить**. The collision heading is **Account already exists**; its exact Russian localization remains copy review. Code entry has no required verification-button label.

Baseline code errors are **This code cannot be used. / Этот код нельзя использовать.** and **This code has expired. / Срок действия кода истёк.**

Final terminology, tone, pluralization, address masking, delivery claims, and code-state guidance remain subject to the listed OPEN decisions and localization review.

## 11. Acceptance criteria

- [ ] **F03-AC01 — Verification gate:** email/password registration cannot reach completed-account success before authoritative email verification.
- [ ] **F03-AC02 — Google alternative:** Google authentication is available and its cancellation, denial, unknown, same-email auto-link/sign-in, different-email `link_required`, and already-bound conflict results have explicit paths without being simulated as production. A validated same-email Google identity links to the existing email/password account without password proof or an Account-settings detour; client-entered email equality alone cannot trigger it.
- [ ] **F03-AC03 — Same-email password addition and scoped proof exception:** after purpose-bound code verification, registration against an existing Google-only account adds the requested password method and signs in to that same canonical account without Google proof or an Account-settings detour. It preserves projects, balance, and grant history, creates no second account/grant, and never overwrites an existing password. The exception does not weaken dual proof for manual different-email linking or the no-merge rule for already-bound methods.
- [ ] **F03-AC04 — Exactly-once welcome grant:** an eligible verified canonical account receives exactly 120 non-expiring credits once; reload, code replay, duplicate completion, relinking, deletion, and permitted re-registration with the same email or Google identity do not duplicate them. Post-deletion re-registration creates a new account with no restored projects or balance and no repeat welcome grant.
- [ ] **F03-AC05 — Verification code:** email/password verification uses exactly 6 emailed decimal digits as one accessible logical value shown in six visual cells. Keyboard completion and whole-code paste each automatically submit one changed complete value; no confirmation button is required; duplicate/in-flight and unchanged-value rerender submissions are suppressed; expiry remains exactly 10 minutes after send. Expiry/resend feedback helps the next action; a permanent quota counter or policy paragraph is not required. Service enforcement remains unchanged.
- [ ] **F03-AC06 — Password form:** registration uses one password field with show/hide and no repeat field; the shared policy enforces/displays at least 8 characters without mandatory uppercase, digit, or special-character classes; paste and password-manager use work. Maximum length and counting mechanics remain **BLOCKED by `OPEN-F03-02B`.**
- [ ] **F03-AC07 — Direct signed-in continuation:** a correct registration code either completes a new registration or adds the requested password to the existing same-email Google-only canonical account, establishes a 30-day session anchored to sign-in, and opens New dub directly without a separate success-to-sign-in step or Remember me choice; navigation never substitutes for account resolution, session, password-method addition, or grant confirmation.
- [ ] **F03-AC08 — Pending recovery:** same-browser reload restores code entry and the selected email through an authoritative pending reference without sending another code, restoring a password, or inferring verification/session success. An expired code offers only an eligible explicit resend under existing limits. Another device receives no transferred pending context and must start a new request under those same limits; a newly issued code replaces the previous code. Cleared-browser-data and longer-retention/abandonment behavior remain **BLOCKED by `OPEN-F03-04`.**
- [ ] **F03-AC09 — Resend:** resend is unavailable before 60 seconds, no more than 5 total sends occur per service-defined hour, a new code replaces the previous one, and the UI renders authoritative cooldown/cap/expiry state. Exact hour-window accounting and response privacy remain **BLOCKED by `OPEN-F03-07B`.**
- [ ] **F03-AC10 — Email correction:** **Change email** returns from code entry to the email-registration form in correction mode without restarting from the initial entry; requires the corrected address and freshly re-entered password; never silently carries the earlier password; sends a new code under the approved parameters; invalidates the previous code; completes only after verification of the corrected address; and creates no account, grant, or session from the abandoned pending identity.
- [ ] **F03-AC11 — Honest services:** the interchangeable mock covers the declared result states and labels email, Google, code validation, session, grant, and locale effects as simulation; production capability is claimed only from integrated evidence.
- [ ] **F03-AC12 — Responsive access:** below 768 px the form is one column with 16 px gutters and 48 px controls; from 768 px it uses regular navigation, 32 px gutters, and approved desktop action roles in design-tokens.md; it stays within 400 px and never causes page-level horizontal scrolling. Keyboard and focus access work in EN/RU.
- [ ] **F03-AC13 — Visual contract:** Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed.
- [ ] **F03-AC14 — Secret handling:** passwords and verification codes do not enter URLs, logs, analytics, persisted UI state, error copy, or fixtures beyond the minimum transport boundary.
- [ ] **F03-AC15 — Locale precedence:** browser `ru` defaults to Russian and other browser locales to English only without a preference; a manual pre-sign-in choice survives registration and updates a different account preference, while a browser default never overwrites it.
- [ ] **F03-AC16 — Form errors:** field errors render beneath their field, service errors render above the current button primary action where one exists, and failed requests preserve entered values only for the active form lifecycle. The automatic code state's confirmed incorrect-code placement is governed by F03-AC17.
- [ ] **F03-AC17 — Incorrect-code recovery:** an authoritatively incorrect code remains visible in all six cells, its error appears beneath the logical field, and the code is selected for replacement without auto-clear. Automatic verification can run again only after the logical value changes and is complete. Unknown/network outcomes reconcile separately and do not become invalid proof or automatic repeated attempts.
- [ ] **F03-AC18 — Existing-password collision:** an authoritative existing-password result shows **Account already exists** with **Sign in** and **Reset password**; it installs/overwrites no password, creates no account/session/grant, and does not alter projects, balance, or grant history. Sign in and reset retain their own neutral security copy. The verified same-email Google-only branch remains eligible for password addition because no password exists there.
- [ ] **F03-AC19 — Motion direction:** Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.
- [ ] **F03-AC20 — First-time Google registration:** validated first-time Google registration creates one verified canonical account, establishes its signed-in session, applies the eligible welcome grant exactly once, and opens New dub without an emailed verification-code gate; callback replay, reload, and retry cannot duplicate the account or grant.
- [ ] **F03-AC21 — Re-registration after deletion:** the same email or Google identity may register after deletion and receive a new canonical account/session and New dub access, but receives no repeat 120-credit welcome grant and restores no deleted projects, balance, or account state. Eligibility is authoritative and the frontend does not infer or expose retained deleted-identity facts.

## 12. Verification plan — not executed

The following is a future evidence plan, not a report of passing behavior:

- Component/service checks cover one password field, no repeat field, show/hide, paste/password manager, 7-character rejection and 8-character acceptance under the eventual shared counting rule, no class requirements, parity with Flow 04, create-account submit locking, six visual cells as one accessible value, whole-code paste, automatic submission without a confirmation button, resend, **Change email** returning to correction-mode registration, mandatory fresh password entry with no silent carry, focus, live regions, keyboard, and screen readers.
- Service/state checks cover every Section 7 result, one request per changed complete code value, duplicate/in-flight and rerender suppression, known-invalid retention/error/selection, unknown-result reconciliation without invalid-state inference or auto-retry, same-browser reload before/after code submission with selected-email restoration and no auto-resend/password restoration, another-device new-request behavior without context transfer or limit bypass, corrected-email success/failure/unknown, expiry/use/mismatch, previous-code rejection after resend/correction, corrected-address verification, and the Flow 05 handoff.
- Code/time/resend checks cover exact six-decimal-digit validation, digit-by-digit completion, whole-code paste, labeling, invalid/used/expired codes, changed complete value versus unchanged rejected value, the 10-minute and 60-second boundaries, 5 versus 6 total sends in the selected hour model, client-clock changes, concurrent resend, rejection of prior codes after resend or email correction, pending context, and separation from password-reset proof.
- Completion checks cover atomic email/password new-account registration, first-time Google verified canonical-account/session creation with eligible exactly-once grant and no email-code step, and purpose-bound password addition to an existing same-email Google-only canonical account; the latter preserves account identity, balance, projects, and welcome-grant history and requires neither Google proof nor an Account-settings detour. They also cover `account_already_exists` at initial submission and after a verification-time account-state race, exact heading/actions, no password install/overwrite, no account/session/grant creation, neutral Flow 02/04 messages after continuation, a 30-day session anchored to sign-in across browser reopen, earlier sign-out/revocation, direct New dub navigation, no account/session/grant from restored or abandoned pending client state, no Remember me or success-to-sign-in step, failure/unknown reconciliation, and no navigation-based grant inference.
- Idempotency/grant checks cover duplicate starts and callbacks, replay, concurrency, refresh, eligible/ineligible/already-granted accounts, same-email password addition and Google auto-link, allowed same-email/Google re-registration after deletion, repeated initialization, and proof that neither a same-email method path nor post-deletion re-registration issues a second welcome grant. Re-registration checks also prove the new account does not recover the deleted balance or projects.
- Privacy/session checks cover enumeration responses, absence of codes from URLs/history/logs/analytics/fixtures, no password in pending browser persistence or email correction carry, rendered secrets, same-browser opaque-reference recovery, no cross-device pending-context transfer, new-device requests under unchanged send limits, stale return intent, blocked accounts, and expired sessions.
- Google checks cover first-time verified canonical-account/session creation with eligible exactly-once grant and no email-code step, cancellation, denial, replay, provider outage, unknown result, validated same-email auto-link/sign-in without password proof/settings detour, client-entered-email rejection as proof, different-email Flow 05 dual proof, and already-bound no-merge conflict.
- Locale checks cover browser `ru`, another browser locale, no preference, saved account preference, a conflicting manual pre-sign-in choice, and confirmation that an automatic browser default never overwrites the account preference.
- Error checks verify field-below/service-above placement for button-submitted forms; known incorrect code retained and selected with its error beneath the six cells; no automatic cell clearing; value-change-before-resubmission; distinct unknown/network reconciliation; and value preservation for failed create/code operations followed by clearing password/code only when the form lifecycle ends or succeeds.
- Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed. Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.
- Integrated email/provider/backend checks run only when real services exist; mock checks remain labeled simulation.

Required evidence must record command or procedure, result, environment, date, revision or dirty-worktree boundary, and artifact location.

## 13. Dependencies and handoffs

| Dependency | Responsibility |
|---|---|
| Shared contract / Flow 01 / [`design-tokens.md`](design-tokens.md) | Product identity, compact top navigation, locale precedence, responsive shell, and normative semantic tokens/component states/geometry |
| Flow 02 — Sign in | Existing-account entry, Google/session continuation, authoritative same-email Google auto-link/sign-in to an existing email/password account, return intent, expired-session handling, and final authenticated destination |
| Flow 04 — Password reset | Recovery for an existing email/password identity; never completes this pending registration; shares the six-visual-cell, one-logical-value, automatic-verification and known-incorrect recovery interaction |
| Flow 05 — Account linking | Fresh dual proof for manual different-email linking and no-merge conflict handling; not a detour for either approved same-email entry exception |
| Flow 12 — Credits | Authoritative balance and exactly-once grant presentation after completion |
| Flow 15 — Account | Verified-email/account status presentation and later method-management entry points |
| Identity/email/provider services | Pending identity and corrected-address transition, previous-code invalidation/order fencing, delivery, purpose-bound verification, canonical-account/method status, same-email password addition without overwrite, validated Google same-email auto-link, different-email proof/conflict, 30-day session/revocation, locale reconciliation, abuse controls, and idempotency |

Flow 03 supplies a verified new-account completion, verified password-method addition to an existing same-email Google-only account, a safe Google authentication continuation including same-email auto-link, or an opaque `link_required` intent where explicit linking remains necessary. It does not supply password-reset proof, manual different-email linking proof, account settings, or locally asserted credit state.

## 14. Current contract references and OPEN questions

- `RESOLVED-F03-01` — Email/password verification uses a code sent by email and entered on the registration screen; link-only verification and offering both methods are excluded.
- `RESOLVED-F03-02A/05` — Registration uses one password field with show/hide, no repeat field, minimum 8 characters, and no required uppercase/digit/special-character classes; the minimum/composition source is shared with reset/change.
- `RESOLVED-F03-03` — A correct code completes registration, establishes the 30-day signed-in session, and opens New dub directly without a separate success-to-sign-in step or Remember me choice.
- `RESOLVED-F03-06/07A/13A` — Registration uses exactly 6 decimal digits valid for 10 minutes after send; resend is available no earlier than 60 seconds, at most 5 total sends occur per hour, and every new code replaces the previous code.
- `RESOLVED-F03-12` — Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed.
Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.  Reduced-motion disables interface transitions without disabling function; media playback/playhead behavior remains functional in owning flows.
- `RESOLVED-F03-15/16` — Browser/manual/account locale precedence and shared field/service error placement with active-form value preservation apply to registration.
- `RESOLVED-F03-08` — **Change email** returns code entry to the email-registration form in correction mode, requires the corrected address and a freshly re-entered password, issues a new code, invalidates the previous code, and permits completion/session/grant only after the corrected address is verified; the abandoned pending identity produces none of those outcomes.
- `RESOLVED-F03-13C` — Registration and password-reset verification use six visual cells for one accessible logical code value, automatically verify a changed complete value from keyboard entry or whole-code paste, require no confirmation button, suppress duplicate/in-flight/unchanged-value rerender submissions, retain/select a known incorrect code with its error beneath the cells, and reconcile unknown outcomes without treating them as invalid or auto-retrying.
- `RESOLVED-F03-17A` — A validated Google authentication using the same email as an existing email/password account automatically links Google to and signs in to that canonical account without additional password proof or an Account-settings detour. Different-email manual linking still uses Flow 05 dual proof; already-bound conflicts do not merge.
- `RESOLVED-F03-17B` — After purpose-bound registration-code verification, an existing same-email Google-only account receives the requested password method and signs in without Google proof or an Account-settings detour. Preserve its balance, projects, and one-time grant history; create no second account/grant and do not overwrite an existing password.
- `RESOLVED-F03-17C` — Registration resolving to an account that already has a password shows **Account already exists** with **Sign in** and **Reset password**. It installs/overwrites no password and creates no account or grant. This explicit registration disclosure does not change neutral Flow 02 invalid-credential or Flow 04 reset-request copy.
- `RESOLVED-F03-17D` — First-time Google registration creates one verified canonical account, establishes its signed-in session, applies the eligible welcome grant exactly once, and opens New dub without an additional emailed verification-code step.
- `RESOLVED-F03-14A` — Same-browser reload restores code entry and selected email from an authoritative pending reference without auto-resend, password persistence, or local success inference. Pending context is not transferred to another device; a new-device request remains under the existing send limits and its new code replaces the previous code.
- `RESOLVED-F03-17E` — After deletion, the same email or Google identity may register a new canonical account and open New dub, but receives no repeat 120-credit welcome grant and recovers no deleted projects, balance, or account state. Authoritative services enforce returning-identity eligibility; the minimum retained fact, privacy controls, and retention mechanics remain a technical/policy gate without a selected constant.

2. `OPEN-F03-02B` — Remaining password policy: maximum length, Unicode/character-counting semantics, breached-password handling, and server-side abuse controls.
4. `OPEN-F03-04` — Pending-registration retention and abandonment behavior beyond approved same-browser reload, including cleared-browser-data and longer-retention behavior; no retention constant is selected.
7. `OPEN-F03-07B` — Exact fixed-versus-rolling hourly accounting boundary, concurrency treatment at that boundary, and privacy-preserving capped/unknown response copy.
9. `OPEN-F03-09` — Final copy and any distinct recovery actions for malformed, expired, used, mismatched, and closed codes beyond the confirmed known-incorrect retention/selection behavior.
10. `OPEN-F03-10` — Whether and how the destination email is masked on pending and error screens.
11. `OPEN-F03-11` — Account-enumeration policy for blocked, deleted, and other already-registered address classes beyond the explicitly resolved existing-password registration disclosure.
13. `OPEN-F03-13B` — Input normalization beyond an exact six-decimal-digit value, invalid-code attempt limit/lockout, and recovery after that limit.
14. `OPEN-F03-14` — Whether an alternate pre-registration return intent may ever override the confirmed New dub default. Cross-device pending-context transfer is excluded by `RESOLVED-F03-14A`.

Acceptance criteria explicitly marked as blocked remain unready until their cited OPEN decisions are resolved. F03-AC10 is no longer blocked by email-correction behavior; production ordering, security, and rate-limit accounting still require implementation evidence and must honor the existing product limits without inventing new ones.

## 15. Design-skill application and evidence boundary

This synchronization retains the sparse, single-job registration hierarchy from `.agents/skills/design-taste-frontend/SKILL.md` plus its app-screen guidance and `.agents/skills/frontend-design/SKILL.md`: one focused form column, persistent labels, flat surfaces, restrained color, clear primary action, explicit states, and responsive keyboard-accessible behavior. The owner-approved shared type, palette, geometry, shell, locale, and error contracts override generic skill suggestions.

Neither skill selects identity behavior. First-time Google account/session/grant completion, the same-email exceptions, proof boundaries, no-overwrite rule, resolved collision disclosure/actions, and pending-context recovery limits come from the shared owner answers. This specification pass did not run a mock, browser, Google authentication, email delivery, password installation, session creation, account-linking operation, or grant issuance.
