# Flow 02: Sign in and session entry

Status: synchronized specification draft; not approved
Date: 2026-10-26 (Asia/Qyzylorda).
Mode: specification only; no implementation or delivery evidence
Authority: [shared frontend contract](00-shared-contract.md), then the latest owner answers; retained [SPEC-001](../specifications/SPEC-001_dubbed_mvp.md) and [BR-001](../business-requirements/BR-001_custom_video_dubbing.md) apply only where the shared contract has not replaced them

## 1. Purpose and boundary

This flow lets a visitor authenticate with Google or an existing email/password identity, resolves the resulting account session, and enters the authenticated product.

Confirmed boundaries:

- sign-in occurs before any upload;
- ordinary successful sign-in enters Flow 06 **New dub**;
- **My projects** is available from authenticated navigation;
- Flow 03 owns sign-up, email verification, and completion of email/password registration;
- a first-time Google registration initiated from Flow 03 completes only when the identity service creates one verified canonical account, establishes its signed-in session, reports the eligible welcome grant exactly once, and returns New dub readiness; it does not add an emailed-code step;
- Flow 04 owns password reset;
- the ordinary authenticated-menu **Sign out** action ends only the current session and returns to the signed-out landing after any recording-exit guard completes; other devices remain signed in;
- a service-authenticated Google identity whose authoritative email matches an existing email/password account is automatically linked to and signed in as that existing canonical account, without another password proof or Account-settings detour;
- Flow 05 owns manual linking of different-email methods with fresh proof of both methods and the conflict/recovery path when the Google identity is already bound to another account;
- a client-entered email or unauthenticated email string never authorizes linking, merging, or account replacement;
- this flow does not create a project, upload media, reserve or spend credits, accept a recording, or start processing.

The flow is bilingual in English and Russian and must work on desktop and phone. The shared contract and [`design-tokens.md`](design-tokens.md) fix Mabry Pro Regular/Medium only with no Bold, the approved line heights and type sizes, the 8/16/24/32 common spacing roles with 24px desktop/16px phone existing-panel padding, semantic component states/focus, palette roles, control dimensions, gutters, the 768 CSS px breakpoint, 1200px working-content width, 400px authentication-form width, locale precedence, form-error placement, and neutral invalid-credential copy. Routes, font asset availability/loading and fallback behavior, flow-specific geometry beyond those roles, browser/rendered evidence, provider mechanics, and remaining copy stay unresolved where identified below. Session persistence is confirmed in section 6.1.

## 2. Entry and exit

### 2.1 Entry

- **Sign in** from the public landing page.
- **Sign in** explicitly selected from Flow 03 after the anonymous landing **Start dubbing** action routed the user to registration, carrying the confirmed logical intent to enter New dub after authentication.
- An unauthenticated attempt to enter an authenticated destination, carrying only validated safe return context.
- A session-expired handoff from a project flow, carrying the persisted project-screen context needed for the confirmed same-screen return after reauthentication.
- A return from Flow 03, Flow 04, or Flow 05 when that flow explicitly hands control back.
- Browser reload, Back, or Forward while the sign-in or provider-return state is recoverable.

No entry may carry raw video bytes, passwords, provider tokens, recording media, or a command to replay.

### 2.2 Exit

| State and action | Exit |
|---|---|
| Existing identity authenticates successfully from ordinary sign-in or an explicit Flow 03 switch from registration to sign-in | Flow 06 New dub. |
| Existing authenticated session is resolved on entry | Flow 06 New dub, except a reauthenticated project session returning to the same project screen with persisted state. |
| Session expired while the user was on Flow 15 Account and sign-in succeeds | Flow 06 New dub; Account is not a return intent. |
| User chooses **Create account** | Flow 03 registration and on-screen verification code. Successful verification signs the user in automatically and enters New dub. |
| User chooses **Forgot password?** | Flow 04 password reset. |
| User chooses ordinary **Sign out** from the authenticated menu | Resolve any unaccepted-candidate exit guard, release owned recording access on completed exit, end only the current session, and open the signed-out landing. Other devices remain signed in. |
| Authenticated Google identity authoritatively matches an existing email/password account | Atomically link it to and sign in as that existing canonical account; preserve its balance, projects, and one-time grant history. |
| First-time Google registration is initiated from Flow 03 and succeeds authoritatively | Create one verified canonical account, establish its session, apply the eligible welcome grant exactly once, and open New dub without an emailed verification-code gate. |
| Different-email methods require manual linking | Flow 05 fresh proof of both methods. |
| Google identity is already bound to another account | Keep accounts separate; Flow 05 owns conflict explanation and entry/recovery for the other account. |
| Google flow is cancelled | Return to the usable Flow 02 sign-in form without an authenticated session. |
| User leaves sign-in | Return according to the valid prior navigation entry; do not fabricate a product destination. |

Authentication success does not itself authorize upload, processing, purchase, unrelated account linking, recording, rendering, charging, or replay of the action that encountered an expired session. The only automatic linking exception here is the service-confirmed same-email Google case above.

## 3. Design-skill application

Both requested skills were read and applied as analysis constraints, not owner approval: `.agents/skills/design-taste-frontend/SKILL.md` with its app-screen/form guidance, and `.agents/skills/frontend-design/SKILL.md`.

Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed.

No style draw, mockup, screenshot review, browser inspection, or runnable UI was produced.

## 4. Screen anatomy

### 4.1 Authentication header

Required responsibilities:

- Dubbed wordmark/home action;
- English/Russian language control;
- no account, project, credits, or upload controls before authentication is established;
- no sidebar or empty application chrome around the form.

Changing language updates labels, help, errors, provider status, and accessible names together. It must not clear typed email or password values. Without a saved preference, first use selects Russian for browser language `ru` and English otherwise. An explicit RU/EN choice before sign-in remains active after authentication and updates a different saved account preference. A browser-derived default is not an explicit choice and must defer to, and must not overwrite, an existing account preference.

### 4.2 Sign-in form

Required controls in logical order:

1. screen title: **Sign in** / **Войти**;
2. Google action: **Continue with Google** / **Продолжить с Google**;
3. a text separator whose accessible reading does not imply two simultaneous requirements;
4. **Email** / **Электронная почта** field;
5. **Password** / **Пароль** field;
6. password show/hide control with a persistent accessible name and state;
7. primary action: **Sign in** / **Войти**;
8. **Forgot password?** / **Забыли пароль?**;
9. **Create account** / **Создать аккаунт**.

Labels remain visible above fields. Placeholders do not replace labels. Browser autofill, password managers, and paste must work. The form must not log, translate, persist in Zustand, or expose the password.

There is no **Remember me** control. Every successful sign-in uses the confirmed fixed 30-day session rule in section 6.1.

Keep sign-in focused on choosing a method and completing the current action. In a mock/prototype, use one unmistakable simulation indicator with scenario/diagnostic controls outside the intended sign-in form; do not repeat implementation explanations as form content or imply real Google/session proof. Normal user-facing validation and recovery remain visible and actionable.

### 4.3 Pending state

- Disable duplicate submission for the active method, keep the form stable, and expose a concise programmatic status.
- Preserve entered email and password values after a failed request within the active form lifecycle; never persist the password beyond that lifecycle or after success.
- Do not claim authentication, destination success, or ownership before the service result.
- Google pending may identify the provider handoff but must not imitate provider UI inside Dubbed.

### 4.4 Credential and account-state feedback

Only a completed, email-verified registration is eligible for email/password sign-in. A pending unverified registration remains in Flow 03's registration/code-entry flow and is not presented by Flow 02 as an unverified completed account.

Flow 02 has no “valid password, verify your account” branch and no verification-help handoff based on a sign-in attempt. It establishes no session or account access before registration verification succeeds. Invalid credentials use exactly one neutral message: **Incorrect email or password** / **Неверный email или пароль**. Field-specific validation sits directly beneath the affected field. Credential rejection and other service-level errors sit above the primary **Sign in** button, do not clear entered values within the active form lifecycle, and use associated text rather than color alone. Separate unknown-account and wrong-password messages are forbidden. Disabled, deleted, rate-limited, and unavailable-account behavior belongs to the future identity/security contract.

### 4.5 Google return state

The provider return resolves one authoritative outcome: already-linked authentication; first-time Google account creation with a verified canonical account/session and eligible exactly-once welcome-grant result when initiated from Flow 03; same-email automatic link/sign-in to an existing email/password account; different-email manual linking required; Google identity already bound to another account; cancelled; provider failure; invalid/stale/unavailable result; or temporarily unknown and requiring reconciliation.

This draft does not select Google OAuth configuration, consent scopes, token handling, callback routes, proof rules, or provider-specific error disclosure.

## 5. Main and alternate transitions

### 5.1 Email/password success

1. User enters email and password and activates **Sign in**; the client checks field presence and the selected email-shape rule.
2. The centralized identity service performs the authoritative credential check.
3. On success, resolve the session and destination: ordinary sign-in and the explicit registration-to-sign-in switch enter New dub; reauthentication returns to the same project screen with persisted state and no replay.

### 5.2 Pending registration boundary

An unverified pending registration is not a completed account and cannot authenticate in Flow 02. If its email/password details are submitted here, no account access or session is established and no distinct verification branch appears. Verification code entry, pending-registration recovery, completion, session creation, and direct New dub continuation remain in Flow 03. This frontend boundary does not forbid or define internal pending-registration records.

### 5.3 Google success and linking boundaries

The centralized service starts the real provider interaction or clearly labeled simulation and authoritatively validates the Google identity and its email assertion. An already-linked identity may establish its account session.

When the authenticated Google email matches an existing email/password account, the service automatically links that Google identity to the existing account and signs the user in to it. This same-email entry case requires no additional password proof and no detour through Account settings. It preserves one canonical account, balance, project library, and one-time welcome-grant history; it neither creates nor merges a second account.

When Flow 03 initiates Google registration for a validated Google identity that is not associated with a Dubbed account, the identity service creates one verified canonical account, establishes its signed-in session, reports whether the eligible one-time 120-credit welcome grant was applied, and returns New dub readiness as one authoritative completion. No additional emailed verification code is required for this Google branch. Callback replay, reload, or retry must reconcile the same completion rather than create another account, session lineage, or grant.

This exception does not change the manual different-email rule: adding a Google and email/password method whose verified addresses differ requires Flow 05 and fresh proof of both methods. A Google identity already bound to another account remains a conflict; accounts, balances, projects, and grant histories are not merged, and Flow 05 owns entry/recovery for the other account. Client-entered email is never Google identity proof.

The reverse same-email case is also settled at the Flow 03 boundary. When email/password registration uses an address belonging to an existing Google-only account, Flow 03 first requires successful email-code verification, then the identity service adds the requested password method to that existing canonical account and signs it in. It requires no additional Google proof or Account-settings detour, creates/merges no second account, and issues no extra welcome grant.

When registration instead targets an account that already has a password, Flow 03 shows **Account already exists** with **Sign in** and **Reset password**. It installs/overwrites no password and creates no account or extra grant. The authoritative collision may be detected during initial registration or after a verification-time account-state race; Flow 02 must not assume the user always entered a code first. **Sign in** returns here, while **Reset password** enters Flow 04. This registration disclosure does not alter Flow 02's neutral invalid-credential message or Flow 04's neutral reset-request response.

### 5.4 Google cancellation and provider failure

- Cancellation returns to the usable form with no session change.
- Provider refusal, invalid callback, or temporary failure offers Retry without changing methods automatically.
- An interrupted or unknown return is reconciled before another attempt; reload never replays a completed callback blindly.
- A mock is never described as Google consent, ownership proof, or provider availability.

### 5.5 Registration and reset handoffs

**Create account** enters Flow 03, where the verification code is entered on the registration screen; successful verification automatically signs the user in and enters New dub without returning through this form. **Forgot password?** enters Flow 04. Flow 02 duplicates neither flow. Flow 03 and Flow 04 share the confirmed minimum password length of eight characters with no mandatory uppercase, digit, or special-character class. Flow 02 checks an existing sign-in password for presence only and does not impose registration/reset composition validation. Maximum length, Unicode/counting semantics, and server-side abuse controls remain technical policy rather than client guesses. Only validated non-secret context follows a handoff, and any return re-resolves the session rather than trusting component memory.

For the reverse same-email Google-only case, Flow 03 returns success only after code verification and authoritative addition of the requested password. Flow 02 accepts the resulting session/destination state; it does not request Google proof, route through Account settings, or create another account/grant. Separately, **Account already exists** may be returned before code entry or after a verification-time race when a password already exists; that state writes nothing and offers only the selected Sign in/Reset password continuations.

## 6. Session, reload, and protected-return behavior

### 6.1 Session authority

- The centralized session service is authoritative; Zustand may coordinate view state but is not the session record.
- On reload or direct entry, resolve the session before presenting an authenticated destination as usable.
- If resolution is unavailable, keep protected content inaccessible, show Retry, and do not relabel the user anonymous.
- Every successful sign-in establishes a session that expires 30 days after that successful sign-in.
- The 30-day expiry is anchored to sign-in success. User activity, browser reload, and browser reopen do not slide or extend it.
- Closing and reopening the browser preserves the session until that fixed expiry.
- Ordinary **Sign out** invalidates only the current session earlier and returns to the signed-out landing; it leaves other devices' sessions active.
- There is no browser-session-only mode and no Remember-me choice.

Password reset and authenticated password change are separate security events: each keeps the current device signed in and terminates every other session after authoritative success. Account deletion is also separate: authoritative success terminates all sessions for the deleted account. Ordinary Sign out must not be implemented with either broader revocation policy.

### 6.2 Session expiry

- When a protected operation discovers expiry, stop before any further protected mutation.
- Preserve only safe context needed for a possible return; do not retain credentials or raw media in the auth route.
- After successful reauthentication, return to the same project screen and reconstruct its persisted state through the owning service.
- Do not replay upload, charging, processing, purchase, deletion, save, recording/capture, recording acceptance, or result rendering.
- Transient component state that was never persisted is not presented as recovered.

### 6.3 Product-state continuity

Authentication must preserve the following confirmed ownership boundaries without claiming that Flow 02 stores the data:

- account-owned unaccepted recording drafts are cross-device recoverable and have no inactivity expiry;
- recovery offers an unaccepted draft without automatically accepting or replacing the current accepted take;
- a validated upload left before processing is automatically preserved as a My projects draft and is not automatically processed on return;
- project and draft retrieval occurs through their owning services after the authenticated account is resolved.

Real cross-device recovery requires backend persistence. A frontend mock cannot prove it.

### 6.4 Ordinary sign-out

The authenticated-menu **Sign out** action begins a controlled exit; it does not invalidate the session before protected recording state is resolved.

- If no project recording ownership or unaccepted dialogue candidate is active, end the current session once, then open the signed-out landing.
- If an unaccepted candidate exists, show the established **Save and leave / Leave without saving / Stay** guard before logout. **Save and leave** continues only after the candidate is durably saved; save failure keeps the user signed in on the recording screen with the candidate and Retry available. **Leave without saving** discards only that candidate while preserving any older accepted take. **Stay** performs no logout or recording exit.
- After Save and leave or Leave without saving completes the exit, release this device's owned project-recording access under the established lifecycle before completing sign-out. Do not leave a signed-out session holding recording ownership.
- An unknown release or session-ending outcome is reconciled before claiming logout success. Do not navigate to the signed-out landing while the current session is still authoritatively active or while the exit guard has failed/stayed.
- Successful ordinary sign-out ends only the current session. Sessions on other devices remain signed in.

This behavior does not change the all-other-session revocation after password reset/change or the all-session revocation after account deletion.

## 7. Failure and recovery matrix

| Condition | Required response |
|---|---|
| Invalid local field | Associate concise help with the first invalid field; no service call. |
| Credential rejection | Keep the form usable, preserve entered values within the active form lifecycle, and show **Incorrect email or password** / **Неверный email или пароль** above the primary button without distinguishing account existence. |
| Pending unverified registration submitted to sign-in | Establish no session or account access and expose no distinct verification branch; Flow 03 remains the code-entry flow. |
| Google cancelled | Return to sign-in; no error-styled blame and no session. |
| Google/provider failure | Explain that sign-in could not complete; offer Retry and email/password. |
| Same-email Google match to an existing email/password account | Link and sign in to the existing canonical account without separate password proof or Account-settings detour; preserve balance, projects, and grant history. |
| Different-email manual linking required | Hand off to Flow 05 for fresh proof of both methods. |
| Google identity already belongs to another account | Keep accounts separate and hand off to Flow 05 conflict/recovery; never merge balances, projects, or grant histories. |
| Session resolution unavailable | Keep protected destinations closed; offer Retry. |
| Session expires in a project flow | Stop the protected action; after reauthentication return to the same project screen with persisted state and no replay. |
| Sign out with an unaccepted candidate | Resolve Save and leave / Leave without saving / Stay before ending the current session. Save failure stays signed in on recording with Retry; Stay performs no logout. |
| Recording ownership release or current-session ending is unknown | Reconcile the authoritative result; do not claim signed-out success or leave ownership stranded. |
| Flow 03 reports **Account already exists** | Offer the selected Sign in/Reset password continuations without assuming code entry occurred, installing/overwriting a password, or changing the neutral sign-in/reset security copy. |
| Destination unavailable | Keep the authenticated session truthful and provide safe navigation; do not claim sign-in failed. |
| Duplicate submission | One in-flight attempt per method; reconcile unknown outcomes before retry. |

## 8. Desktop, phone, keyboard, and accessibility

### Desktop

- At 768 CSS px and above, use the compact signed-out top header, 32px horizontal page gutters, a 32px page heading, and desktop action controls use the approved role heights in design-tokens.md; single-line inputs use separate derived field geometry; retain mapped component shape and state.
- Working content is capped at 1200px. The sign-in form is capped at 400px within that content and remains one clear column in logical order.
- Use no promotional cards, testimonials, security illustrations, product screenshots, unmapped decorative shadows, gradients, all-caps styling, or wrapper card around every block.

### Phone

- Below 768 CSS px, use the compact signed-out mobile header, one vertical sequence, 16px horizontal gutters, a 24px page heading, and 48px standard buttons/single-line inputs with component-specific source geometry.
- The form uses the available width inside the gutters up to its 400px maximum and never creates horizontal page scroll.
- The software keyboard cannot cover the active field, error, or primary action; long Russian labels wrap without overlap.

### Shared visual roles

- Use Mabry Pro Regular and Medium only, never Bold: body text is Regular 16px/24px, supporting captions are Regular 14px/20px, buttons use Mabry Pro Medium 14px/20px for task, secondary and navigation actions and Medium 16px/24px for prominent/landing actions; phone buttons use Mabry Pro Medium 16px/24px with retained 48px targets, field labels are Medium 14px/20px, and page headings are Medium 32px/40px desktop and 24px/32px phone.
- Use 8px between closely related elements, 16px between form fields/buttons, 24px between blocks within the screen, and 32px between major sections. Existing panel padding is 24px at and above 768px and 16px below 768px; it is distinct from the unchanged 32px/16px page gutters and does not authorize a new panel or wrapper card.
Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.  Do not animate page entry, parallax, decoration, or looping attention effects. Reduced-motion disables interface transitions. Animation never delays sign-in submission, save acknowledgement, recording/capture, or navigation; video playback and synchronized audio-playhead movement remain functional where owned by another flow.
- Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed.
- `#000000` remains the shared video-stage role and does not create a decorative stage on this media-free form.
- Mabry Pro asset availability/loading and approved fallback behavior, exact auth-form geometry not implied by the shared spacing roles, and browser/rendered evidence remain unresolved or unverified and must not be inferred from this specification. Regular/Medium roles, stated line heights, common spacing, semantic component states/focus, and motion direction are resolved.

### Keyboard and assistive technology

- Order: header, title, Google, separator, email, password, show/hide, primary action, reset, registration.
- Enter submits only the eligible email/password form. All controls have visible focus.
- Local failure focuses the first invalid field with its associated message.
- Pending, failure, provider return, and success are announced without repeated focus theft.
- Show/hide preserves value and focus; locale change updates document language and names without clearing fields.

## 9. Logical service boundary

Names describe responsibilities, not approved endpoints, libraries, or implementation files.

| Logical operation | Inputs | Required result categories |
|---|---|---|
| `resolveSession` | Current browser/session context | authenticated account summary, anonymous, expired, unavailable |
| `resolveInterfaceLocale` | Browser language; anonymous locale and whether it came from an explicit choice or automatic default; optional saved account locale after authentication | effective EN/RU locale; whether the account preference must be updated after an explicit pre-sign-in choice; browser-derived default must not overwrite an existing account preference |
| `signInWithPassword` | Email, password, locale, opaque validated return context | authenticated completed account with the fixed 30-day session anchor, invalid credentials, rate limited, unavailable |
| `startGoogleSignIn` | Locale, opaque validated return context | provider handoff, unavailable |
| `resolveGoogleReturn` | Provider-owned return context with authoritative Google identity/email assertion and initiating sign-in/registration purpose | already linked and authenticated; first-time verified canonical account created with signed session and eligible exactly-once welcome-grant result; same-email linked to existing canonical email/password account and authenticated; different-email manual linking required; identity bound to another account conflict; cancelled; failed; unknown/unavailable |
| `resolvePostAuthDestination` | Authenticated session plus validated logical intent | New dub for ordinary sign-in or the explicit registration-to-sign-in switch; same project screen with persisted state after reauthentication; invalid/unavailable |
| `resolveSignOutGuard` | current session, project-recording ownership, accepted-take reference, unaccepted-candidate state, selected Save and leave / Leave without saving / Stay action, operation identity | safe to leave after durable save; safe to leave after candidate discard with older accepted take preserved; stayed; save failed/retryable; unavailable/unknown |
| `releaseRecordingOwnership` | current session/device, owned project-recording lease, completed exit-guard result, operation identity | released/already released; unavailable/unknown requiring reconciliation |
| `endCurrentSession` | current authenticated session, completed exit guard and ownership release where applicable, explicit logout intent, operation identity | current session invalidated/already ended with other-device sessions unchanged; unavailable/unknown |

The future implementation must keep backend/provider calls behind one centralized interchangeable service boundary. For either same-email direction, that boundary must preserve the existing canonical account ID, balance, projects, and one-time welcome-grant history and must not create/merge a second account. A Flow 03 reverse-link completion must prove email-code verification, add the requested password only to a Google-only account, and refuse to overwrite an existing password. The specification does not approve a particular auth SDK or security protocol.

## 10. Mock-truth boundary

An interchangeable mock may simulate the fixed 30-day expiry anchor, browser close/reopen, ordinary current-session-only Sign out with other sessions retained, the no-candidate path, each Save and leave / Leave without saving / Stay branch, save failure that stays signed in, recording-ownership release/already-released/unknown, current-session ending success/already-ended/unknown, session states, password outcomes including the one neutral invalid-credential response and denial of session access to a pending registration, already-linked Google success, first-time Google registration returning one verified canonical account/session and an eligible exactly-once welcome-grant result without an email-code step, Google-to-password same-email auto-link/sign-in, verified Flow 03 password addition to a Google-only same-email account, **Account already exists** detected at initial registration or after a verification-time race with Sign in/Reset password and no write, different-email manual-linking-required, already-bound conflict, cancellation/failure/unknown outcomes, same-project-screen restoration, locale reconciliation, field/service error placement, and value preservation within the active form lifecycle for UI testing.

A mock cannot prove real Google consent or identity/email assertions, verified email-code proof, atomic same-email linking/canonical-account preservation in either direction, safe password addition/non-overwrite, password/backend protections, account-enumeration resistance, persisted account-language updates, server-enforced current-session-only logout, preservation of other-device sessions, durable candidate save/discard, recording-ownership release, session security/revocation/cross-browser continuity, Flow 05 different-email ownership proof/conflict handling, or cross-device project/draft recovery.

Mock checks must be labeled simulation rather than authentication, provider, backend, or security evidence.

## 11. Visible copy and localization

Baseline labels are in section 4; remaining EN/RU provider, pending, unavailable, and recovery copy needs editorial review. Use **Sign in** and **Continue with Google** consistently. Never claim account creation, email verification, or linking before the owning flow confirms it. Provider failures name the action and next step without technical tokens. Invalid credentials always use **Incorrect email or password** / **Неверный email или пароль** and reveal no account-existence distinction. Flow 03 alone may disclose **Account already exists** for its resolved existing-password registration collision. Choosing Reset password then enters Flow 04, whose request response remains **If an account with this email exists, we sent a code** rather than confirming existence or delivery.

## 12. Acceptance criteria

| ID | Acceptance criterion | Status |
|---|---|---|
| F02-AC01 | A visitor can sign in through an existing Google or email/password identity from desktop and phone in EN and RU. | Confirmed behavior; requires implementation evidence. |
| F02-AC02 | Ordinary successful sign-in and an explicit switch to Sign in from the registration flow entered through landing Start dubbing open Flow 06 New dub before any upload begins; landing Start dubbing itself routes to registration. | Confirmed. |
| F02-AC03 | Create account hands off to Flow 03 on-screen code verification, whose success automatically signs in and enters New dub; Forgot password hands off to Flow 04. Flow 02 duplicates neither responsibility. | Confirmed. |
| F02-AC04 | An unverified pending registration is not a completed account, cannot establish a session in Flow 02, and remains in Flow 03's registration/code-entry flow. | Confirmed. |
| F02-AC05 | An authoritatively authenticated Google identity with the same email as an existing email/password account is automatically linked to and signed in as that existing canonical account without another password proof or Account-settings detour; its balance, projects, and one-time grant history are preserved and no second account is created or merged. | Confirmed behavior; real identity-service evidence pending. |
| F02-AC06 | Different-email methods still require Flow 05 fresh proof of both methods; a Google identity already bound to another account remains a no-merge conflict; cancellation, provider failure, invalid/unknown return, manual-linking-required, and conflict states preserve truthful session state and usable recovery. | Confirmed behavior; real provider evidence pending. |
| F02-AC07 | Session reload is resolved from the centralized service and component memory cannot establish authentication. | Confirmed behavior; real service evidence pending. |
| F02-AC08 | Every successful sign-in persists across browser close and expires at the fixed point 30 days after sign-in; activity does not slide the expiry, explicit logout ends it sooner, and no Remember-me control is shown. | Confirmed; requires real service evidence. |
| F02-AC09 | Reauthentication after a project-flow session expiry returns to that same project screen, reconstructs persisted state, and does not replay upload, charging, processing, purchase, deletion, save, recording/capture or acceptance, or result rendering. After Account session expiry, successful sign-in instead opens New dub with no Account return intent (F02-AC23). | Confirmed; requires integration evidence. |
| F02-AC10 | Flow 02 exposes no distinct “valid password but unverified account” branch or verification handoff; invalid credentials use only **Incorrect email or password** / **Неверный email или пароль**, with no account-existence distinction. | Confirmed. |
| F02-AC11 | The form supports keyboard order, Enter behavior, visible focus, associated errors, announced status, autofill/password managers, paste, and non-color-only feedback. | Confirmed behavior; evidence pending. |
| F02-AC12 | Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed. | Contract confirmed; font asset/fallback and rendered visual evidence pending. |
| F02-AC13 | Sign-in never creates a project, uploads media, spends credits, starts processing, accepts a take, or auto-processes a recovered validated-upload draft. | Confirmed. |
| F02-AC14 | Mock evidence is reported as simulation and never as Google, backend, cross-device, session-security, or account-linking proof. | Confirmed. |
| F02-AC15 | Field errors appear beneath their fields; service errors appear above the primary button; failed requests preserve entered values within the active form lifecycle; and password values are not persisted beyond that lifecycle or successful completion. | Confirmed behavior; evidence pending. |
| F02-AC16 | First use without a preference selects Russian for browser `ru` and English otherwise. An explicit pre-sign-in RU/EN choice wins over and updates a different saved account preference; an automatic browser default defers to and does not overwrite that saved preference. | Confirmed behavior; account-persistence evidence pending. |
| F02-AC17 | When Flow 03 email/password registration matches an existing Google-only account, correct email-code verification adds the requested password to that existing canonical account and signs it in without extra Google proof or Account-settings detour; it creates no second account/grant and never overwrites an existing password. Flow 02 accepts only the authoritative resulting session. | Confirmed cross-flow behavior; real identity-service evidence pending. |
| F02-AC18 | Ordinary Sign out resolves the existing unaccepted-candidate guard before logout, leaves the user signed in on recording after save failure or Stay, releases owned recording access after an explicit completed exit, ends only the current session, preserves other-device sessions, and opens the signed-out landing only after authoritative success. Password reset/change other-session revocation and account-deletion all-session revocation remain distinct. | Confirmed behavior; real recording/session integration evidence pending. |
| F02-AC19 | Flow 03 **Account already exists** offers Sign in/Reset password when registration targets an account with an existing password, whether detected at initial registration or after a verification-time race. It installs/overwrites no password and creates no account/grant; Flow 02 and Flow 04 retain their neutral security copy. | Confirmed cross-flow behavior; real identity-service evidence pending. |
| F02-AC20 | Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged. | Confirmed contract; rendered/reduced-motion evidence pending. |
| F02-AC21 | Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed. | Confirmed contract; browser/rendered evidence pending. |
| F02-AC22 | First-time Google registration initiated from Flow 03 creates one verified canonical account, establishes its signed-in session, applies the eligible 120-credit welcome grant exactly once, and opens New dub without an emailed verification-code gate; replay/retry cannot duplicate the account or grant. | Confirmed cross-flow behavior; real provider/identity/grant evidence pending. |
| F02-AC23 | After session expiry on Account, successful sign-in opens New dub; no Account return intent is carried. Expired project-flow sessions retain the existing same-project return exception. | Owner decision, 2026-10-23; route behavior confirmed, exact URLs remain open. |

## 13. Verification plan — not executed

No product check was run for this specification. After implementation and the blocked decisions exist, verify:

1. State tests for anonymous/authenticated/expired/unavailable sessions; password success/rejection/rate-limit/unavailable; pending registration denied session access without a distinct verification branch; and Google already-linked success, first-time canonical-account/session/eligible-grant completion without an email-code step, same-email auto-link/sign-in, different-email manual-linking-required, already-bound conflict, cancellation, failure, and unknown outcomes.
2. Transition tests for landing Sign in, landing Start dubbing to registration followed by an explicit Sign in switch, direct sign-in, Flow 03 on-screen code verification with automatic sign-in/New dub, Flow 03 first-time Google completion to New dub, Flow 04 handoff, Flow 05 different-email/conflict handoffs, same-email sign-in without password/settings detour, already-authenticated entry, session expiry on Account to New dub, session expiry with same-project-screen return, and invalid destination context.
3. Session-clock and sign-out checks proving browser close/reopen preserves the session before the fixed 30-day expiry, activity/reload does not move the anchor, ordinary Sign out ends only the current session and reaches the signed-out landing while other-device sessions remain active, unknown session-ending outcomes reconcile, and no Remember-me control appears.
4. Reauthentication restoration checks proving the same project screen rebuilds persisted state while upload, charging, processing, purchase, deletion, save, recording/capture or acceptance, and rendering do not run automatically.
5. Reload/Back/Forward checks during password pending, provider handoff/return, unknown result reconciliation, success, and expired-session return.
6. Credential-handling review proving passwords do not enter persisted Zustand state, logs, analytics, URLs, visible diagnostics, or localization payloads.
7. Keyboard-only and assistive-technology review for focus order, Enter behavior, validation focus, show/hide state, provider status, live announcements, and language switching.
8. Error-contract tests: field validation directly beneath its field; credential/service errors above the primary button; exact neutral invalid-credential copy in EN/RU; no unknown-account/wrong-password distinction; and entered-value preservation on failure without password persistence beyond the form lifecycle.
9. Locale tests for browser `ru` and non-`ru` first use, saved account reuse, explicit pre-sign-in choice overriding/updating a different saved preference, and browser-derived default deferring without overwriting.
10. Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed. Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.
11. Integration checks with real Google and backend identity/session services for callback reconciliation, authoritative provider email assertion, first-time verified canonical-account/session creation with exactly-once eligible grant and no email-code gate, atomic same-email link/sign-in, different-email Flow 05 handoff, already-bound conflict, fixed expiry, current-session-only Sign out, preservation of other-device sessions, broader reset/change/deletion revocation policies, account-locale persistence, and cross-browser continuity. These cannot be proven by the current specification or a mock.
12. Canonical-account checks prove first-time Google completion creates exactly one account/grant and both same-email directions preserve the original account ID, balance, project library, drafts, and one-time welcome-grant history, create no second account/grant, and remain idempotent under callback/code replay and concurrency.
13. Reverse-link and registration-collision integration checks prove Flow 03 requires correct email-code verification before adding the requested password to an existing Google-only account, needs no extra Google proof/settings detour, and returns one authoritative signed-in canonical account; **Account already exists** can instead arise at initial registration or after a verification-time race, writes no password/account/grant, and offers Sign in/Reset password without changing either flow's neutral messages.
14. Sign-out guard integration checks cover no candidate, Save and leave success/failure, Leave without saving with older accepted take preserved, Stay, recording-ownership release/already-released/unknown, current-session ending success/already-ended/unknown, signed-out landing timing, and proof that other-device sessions remain active.
15. Cross-flow data checks that authenticated account resolution retrieves My projects and account-owned drafts without Flow 02 accepting, processing, or mutating them.

Record procedure or command, result, environment, date, revision/dirty-tree boundary, fixture/account class, and evidence location. Mark simulated and unavailable dependencies explicitly.

## 14. Dependencies

- [Shared frontend contract](00-shared-contract.md)
- [Approved frontend design tokens](design-tokens.md)
- [Flow 01 landing](01-landing.md)
- Flow 03 registration and email verification, including verified password addition to an existing same-email Google-only canonical account and the **Account already exists** Sign in/Reset password collision at initial registration or after a verification-time race, with no overwrite, duplicate grant, or second account
- [Flow 04 password reset](04-password-reset.md)
- Flow 05 manual different-email dual-proof linking and already-bound-identity conflict/recovery; same-email Google entry auto-links through the identity service without a Flow 05 detour
- [Flow 06 New dub](06-new-dub.md)
- [Flow 11 My projects](11-projects.md)
- centralized identity, session, localization, navigation-intent, project, draft/candidate-save, and recording-ownership services
- real Google provider configuration and production backend identity/session implementation
- Mabry Pro asset availability/loading and fallback behavior, browser/rendered proof, and authentication-form geometry not implied by the shared spacing roles

## 15. Authentication constraints and remaining integration gaps

Sessions persist across browser close and expire at a fixed point 30 days after successful sign-in; activity does not slide the expiry, there is no Remember-me choice, and explicit logout ends the session sooner.

After project-flow reauthentication, return to the same project screen with persisted state and do not replay protected work or charges. For Account session expiry: successful sign-in opens New dub, and Account is not a return intent.

Email verification precedes registration completion; valid credentials on an unverified pending registration do not create a sign-in branch. Pending registration stays in Flow 03's code-entry flow; no completed-account access or session exists before verification. The shared form-error contract defines the neutral invalid-credential message and placement without exposing whether an account exists.

Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.  Font asset/loading/fallback, rendered proof, and screen-specific geometry beyond those roles remain evidence gaps rather than owner choices about weight, line height, common spacing, or motion direction.

| Rule | Requirement | Verification ownership |
|---|---|---|
| Session persistence |  fixed 30 days after successful sign-in; survives browser close; activity does not extend it; explicit logout ends it sooner; no Remember me. | Verify F02-AC08 through the authoritative session service. |
| Return after session expiry |  return to the same project screen with persisted state; never replay charges, processing, recording, or rendering. For Account session expiry, successful sign-in opens New dub; Account is not a return intent. | Verify F02-AC09 and the Account-expiry New dub exception. |
| Email/password error policy |  the proposed unverified-account sign-in branch is invalid because registration is incomplete until verification; invalid credentials use the confirmed neutral EN/RU message above the primary action. | Verify F02-AC04 and F02-AC10 through neutral feedback and pre-verification access checks. |
| Reverse registration collision |  after correct email-code verification, add the requested password to the existing same-email Google-only canonical account and sign it in; require no extra Google proof/settings detour, issue no extra grant/account, and never overwrite an existing password. | Verify F02-AC17; Flow 03 and the identity service own the authoritative mutation. |
| Ordinary sign-out scope |  complete the unaccepted-candidate guard and recording-ownership release first; then end only the current session and open the signed-out landing. Other-device sessions remain active; reset/change and deletion revocation stay distinct. | Verify F02-AC18; recording and session integration evidence remains required. |
| Existing-password registration collision |  Flow 03 shows **Account already exists** with Sign in/Reset password, whether detected initially or after a verification-time race; it installs/overwrites no password and creates no account/grant. | Verify F02-AC19; neutral Flow 02/04 security copy remains unchanged. |

The neutral sign-in/reset disclosure constraint remains unchanged by the explicit Flow 03 registration-collision disclosure.

Genuine remaining gaps are limited to exact routes; Google OAuth configuration, callback/proof/token/scopes and provider-specific disclosure; disabled/deleted/rate-limited/unavailable account policy; remaining provider/pending/recovery EN/RU copy; Mabry Pro asset availability/loading and fallback behavior; authentication-form geometry beyond the common spacing roles; browser/rendered proof; and production session/security mechanics that a mock cannot prove. The Regular/Medium roles, approved line heights, shared spacing, semantic component states/focus, and motion direction are resolved; none of the remaining gaps may be silently selected by implementation or claimed as verified by this specification.
