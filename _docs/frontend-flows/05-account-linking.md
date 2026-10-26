# Flow 05: Explicit account linking

Status: synchronized draft; owner linking and shared presentation decisions incorporated; technical/security gates OPEN; no implementation or verification evidence  
Date: 2026-10-26 (Asia/Qyzylorda).
Mode: specification only; no implementation or delivery evidence  
Authority: [shared frontend contract](00-shared-contract.md), latest owner answers, then retained [SPEC-001](../specifications/SPEC-001_dubbed_mvp.md) and [BR-001](../business-requirements/BR-001_custom_video_dubbing.md) where not superseded

## 1. Purpose and boundary
This flow defines both the automatic same-email Google-entry exception and explicit manual linking of Google and verified email/password sign-in methods, so both methods open one canonical account with one balance, one project library, and one welcome grant.

When valid Google authentication returns the same authoritative email as an existing email/password account, the identity service automatically links that Google identity to the existing account and signs the user into it. No additional password proof, link-review action, or Account-settings detour is required for this case. A client-entered email or unvalidated provider claim is never sufficient.

This flow covers the user-visible linking transaction, proof states, conflicts, cancellation, interruption, and safe return. For manual different-email linking where the candidate email/password method does not yet exist, it also owns the account-bound candidate-method transaction: password-method candidate creation and email verification remain bound to the selected canonical account and link intent until the final explicit dual-proof link commit. They are not ordinary registration and cannot create an account, grant, or signed-in session. This flow does not define a vendor OAuth API, email delivery, ordinary registration completion, password reset, account settings, account merging, or conflict resolution between two existing account records. Where email/password proof is used, it consumes the shared minimum-8/no-required-character-classes password policy without inventing further password rules.

The MVP supports adding/linking a second method only. Unlinking or removing a method is excluded: no **Disconnect** action, last-method removal flow, or unlink confirmation appears here or in Flow 15.

## 2. Account identity invariant
- A canonical account is identified internally, not by displayed email. Google and email/password are sign-in methods associated with it.
- The identity service is authoritative for method association, email verification, account status, and link eligibility. The automatic exception requires valid Google authentication and an authoritative same-email match to the existing password account; client string equality never proves ownership.
- Success adds one eligible method to the selected canonical account. It does not create another account, copy or sum balances, duplicate projects or purchases, or reassess welcome-credit eligibility.
- If the candidate method is already attached to another canonical account, block linking, explain the conflict without exposing private account data, and offer sign-in or recovery for that account. Never merge the accounts or their balances, libraries, grants, or histories.
- Google and email/password may use different verified email addresses after fresh proof of both methods through the explicit manual flow. They still open one canonical account.
- Adding Google never replaces the existing email/password address used for password reset. A separate primary/contact-email preference remains unselected and is not part of this flow.
- Disabled, deleted, unverified, or otherwise ineligible identities cannot be made eligible by client state.

## 3. Entry and exit
### 3.1 Entry
- Flow 02 submits a valid Google authentication result to the identity service. A same-email existing password account follows the automatic link-and-sign-in path; eligible manual cases receive an authoritative `link_required` continuation.
- Flow 03 code-verifies a requested email/password registration. When that email belongs to an existing Google-only account, the identity service adds the requested password to that existing account and signs the user into it without Google reproof or an Account-settings detour. If that account already has a password, whether detected at initial submission or after a verification-time race, show **Account already exists** with **Sign in** and **Reset password**; never overwrite it.
- Flow 04 performs ordinary password recovery and, after success, returns to a valid persisted project screen or New dub. It never automatically returns to linking. A later manual link attempt must be explicitly entered and freshly prove both methods again.
- Flow 15 lets an authenticated owner select **Link** for an unassociated supported method.
- Reload, Back, Forward, or a later authenticated return may resume only a still-valid server-owned link intent.

Entry context may include an opaque link-operation identifier, intended canonical account, initiating method, candidate method, safe return destination, locale, expiry, and account revision. It must not include provider tokens, passwords, email proof secrets, or private account data in user-visible URLs or logs.

### 3.2 Exit
| Outcome | Exit |
|---|---|
| Automatically linked from Google entry | Establish/reconcile the signed-in session for the existing password account, replace cached account facts with its authoritative snapshot, and follow Flow 02's validated signed-in destination. |
| Password added from same-email registration | After successful purpose-bound code verification and password installation, establish/reconcile the signed-in session for the existing Google-only account, replace cached facts with its authoritative snapshot, and follow Flow 03's validated signed-in destination. |
| Same-email registration finds an existing password | Show **Account already exists** with **Sign in** and **Reset password**. Do not install or overwrite a password and do not present this resolved collision as an OPEN linking choice. |
| Manually linked | Reconcile authoritative account/method state, then return to the validated origin: Flow 02 session entry or Flow 15 Account. |
| Cancelled before mutation | Return to the initiating flow; neither method nor account data changes. |
| Proof denied or failed | Stay in recovery or return to Flow 02/03/04 as appropriate; no link occurs. |
| Link intent expired or revoked | Show restart actions; never reuse cached eligibility. |
| Candidate belongs to another account | Block linking and offer sign-in or recovery for that account without exposing private identity or project data. |
| Session expired or account changed | Stop the transaction and hand off to Flow 02; do not disclose or mutate the previous account. |
| Outcome unknown | Keep a neutral pending/unknown state and reconcile by operation identifier before offering mutation again. |

New dub, project, recording, result, credit purchase, and account deletion behavior are outside this flow.

## 4. Design application
Both required design skills are applied as analysis guidance. Owner-approved shared presentation values below are normative; skill defaults do not replace them.

- Treat linking as a sparse identity form with one narrow column, one noun title, and one primary action per state.
- Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed.
- Use the compact top navigation for an authenticated owner and the shared authentication header during proof; never add a sidebar.
- Keep current-account and candidate-method identity, fresh-proof status and final consequences understandable in one coherent context. Completed proof steps may collapse to concise summaries; do not repeat the full identities/consequence block at every step. Required disclosure remains available at final review and on meaningful account changes.
- Google may use its approved provider mark only when brand guidance is available; otherwise the text label **Google** is sufficient.
- Labels sit above fields; placeholders do not replace labels. Field errors sit beneath their field, while service-level errors sit above the affected primary action.
- Use only Mabry Pro Regular and Medium, with no Bold or synthetic Bold. Body and dialogue text use Regular 16px/24px; supporting captions use Regular 14px/20px. Buttons use Mabry Pro Medium 14px/20px for task, secondary and navigation actions and Medium 16px/24px for prominent/landing actions; phone buttons use Mabry Pro Medium 16px/24px with retained 48px targets; field labels use Medium 14px/20px. Page headings use Medium 32px/40px on desktop and Medium 24px/32px on phone. Buttons and single-line inputs use component-specific source geometry and desktop action heights of 40px task, 44px prominent/landing, 32px secondary and 36px navigation, with 48px phone targets. Page gutters are 32px desktop / 16px phone. Working content is at most 1200px, with this sparse proof form constrained to a readable single column inside that canvas.
- Use the shared spacing scale: 8px between closely related elements, 16px between form fields/buttons, 24px between blocks within the screen, and 32px between major sections. An already-required panel uses 24px internal padding on desktop and 16px below 768 CSS px; this does not replace the 32px/16px page gutters or authorize wrapping blocks in new panels/cards.
Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.  There is no page-entry animation, parallax, decorative/looping attention motion, or animation delay before save acknowledgement or navigation; reduced-motion disables interface transitions.
- Pending/loading states keep the approved page, surface and text roles plus an accessible status; they never fabricate progress, use a decorative loop, or rely on color alone.
- Below 768 CSS px use the mobile one-column shell; at 768 CSS px and above use regular top navigation. Mabry Pro asset availability, browser loading and fallback, screen-specific geometry not implied by the shared spacing roles, icons, routes, forced-colors/browser behavior and rendered conformance remain OPEN; approved weights, line heights, common spacing, motion and semantic state/focus roles do not.

## 5. Screen and component anatomy

### 5.1 Shared header
Show the Dubbed wordmark/home action, English/Russian control, a safe back/cancel action, and authenticated product navigation only when the current session may expose it.

On a signed-in phone, the compact header has logo at left and available credit balance plus menu at right. The menu contains New dub, My projects, Credits, Account, language, and Sign out. There is no permanent sidebar. During a proof step that cannot safely expose authenticated navigation, use the shared authentication header rather than leaking account state.

Changing locale updates all visible labels, status, help, errors, dialogs, and accessible names without discarding a valid service-owned link intent.

Locale precedence is shared: an explicit manual RU/EN choice before sign-in remains active after sign-in and updates a different saved account preference. Otherwise use the saved account preference; on first use with neither, use Russian for browser language `ru` and English otherwise. A browser-derived default is not a manual choice and must not overwrite an account preference.

### 5.2 Automatic same-email entry cases

**Google to existing password account:** after valid Google authentication, the UI waits for the identity service to validate the provider identity/email and resolve method ownership. On `auto_linked_existing_password_account`, establish the returned session, replace cached balance/project/grant/method facts with the existing account snapshot, and continue to Flow 02's validated signed-in destination. Do not request the password, show a manual link review, or detour through Account settings.

**Password registration to an account with the same verified email:** the identity service may detect at initial submission that the canonical account already has a password and immediately return **Account already exists** with **Sign in** and **Reset password**, with no code-first requirement and no write. If the account initially appears Google-only, then after the requested password and purpose-bound registration code are valid the service rechecks method state. It installs the password method only when the account still has no password, establishes the returned session, replaces cached facts with the existing account snapshot, and continues to Flow 03's validated signed-in destination without Google proof or an Account-settings detour. A password that appears during the verification-time race produces the same collision. The existing password is never overwritten.

Both automatic cases preserve the existing canonical account, balance, projects, and one welcome-grant history. They create no second account, move or sum no data, and are not account merges. Typed failure/conflict recovery may be shown, but there is no extra linking confirmation. A method already bound to another canonical account still follows the confirmed no-link/no-merge conflict behavior.

### 5.3 Manual link overview
Required information, which may share one concise identity summary across the proof steps rather than repeat full blocks:

- title: **Link sign-in methods** / **Связать способы входа** and one sentence that both methods will open the same account;
- Google and email/password rows with authoritative association, verification, and proof status;
- a statement that the existing balance, projects, and single welcome grant stay with the account;
- **Continue linking** / **Продолжить привязку** when eligible, plus **Cancel** / **Отмена**.

This overview is for an explicit manual link intent, including different-email methods. It must not claim success before the service commits the association or expose whether another private account exists beyond the disclosure policy selected for conflicts. It is not inserted into either automatic same-email entry case.

### 5.4 Current-account proof
For an explicit manual link intent, the user must freshly prove the current account's existing method. A valid 30-day signed-in session by itself is insufficient. This dual-proof rule remains mandatory for manual different-email linking; it does not add password or Google proof to the automatic same-email entry cases in §5.2.

The UI must be able to represent:

- why confirmation is needed and which current account is protected, using only approved disclosure;
- continuation to fresh proof of the current method through its approved Google or email/password mechanism;
- pending, denied, cancelled, expired, rate-limited, and unavailable states;
- a return bound to the same intended account, not merely any successful sign-in.

The service decides whether the returned proof is fresh, purpose-bound, and eligible. The exact freshness window and provider mechanics remain OPEN-F05-T1; the client cannot infer them from session age or a stored boolean.

### 5.5 Candidate-method proof
For Google, **Continue with Google** / **Продолжить с Google** starts fresh provider proof and returns an authoritative result through the identity service.

For an already existing email/password method, fresh proof uses that method's ordinary password authentication and must resolve to the candidate method intended by the link operation. Password entry uses a visible label, password-manager support, paste support, an accessible show/hide control, and no secret retention or logging beyond the active form lifecycle. The selected minimum password length is 8 characters with no mandatory uppercase, digit, or special-character class. Maximum length, Unicode/counting semantics, and abuse controls remain technical policy; Flow 05 does not invent them.

When the different-email candidate password method does not yet exist, use the same approved email/password and six-cell verification interaction as Flow 03 but create a distinct link-bound candidate, not a pending ordinary registration. The candidate request is bound authoritatively to the intended canonical account, active link intent, candidate email, requested password-method creation, proof purpose, and operation identity. Its code is 6 decimal digits, valid for 10 minutes, resendable after 60 seconds with at most 5 sends per hour, and a new code replaces the old one. Successful code verification proves the candidate email for this link intent only. It creates no account, welcome grant, ordinary signed-in session, project library, or independently usable password method before the final explicit dual-proof **Link methods** commit.

Flow 04 remains a separate recovery flow. Successful reset creates the approved current-device session, terminates other sessions, and then follows its valid-project-or-New-dub destination; it does not automatically resume linking or satisfy either fresh proof. The user must later enter the manual link flow explicitly and provide fresh current-account and candidate-method proof. The automatic same-email password-registration case remains separate: successful purpose-bound registration-code verification may add the password under §5.2 without Google reproof, while an existing password may be disclosed at initial registration or after a verification-time race.

### 5.6 Manual final review and submit
Before mutation, show:

- both method families and the canonical account identifier allowed by disclosure policy;
- **Link methods** / **Связать способы** as the final action and **Cancel** / **Отмена**;
- the consequence that both methods open the same existing account, balance, and projects.

The final action submits one operation bound to the intended account, candidate method or verified link-bound method candidate, both fresh proof contexts, expected account revision, and operation identifier. A link-bound password candidate becomes an associated usable login method only in this final atomic commit; failure, cancellation, stale state, or unknown status cannot turn it into an ordinary account, grant, or session.

### 5.7 Success
For manual linking, show **Sign-in methods linked** / **Способы входа связаны**, the resulting association and one next action from the validated origin. Keep retained-resource consequences understandable without repeating every proof card or the entire identity summary. Either automatic same-email case may proceed directly through its normal signed-in destination without a separate linking-success screen.

Do not claim a balance amount, project count, or grant state unless returned by the authoritative account snapshot.

The final explicit commit still requires both fresh proofs and preserves candidate/conflict/unknown semantics. Compact disclosure does not authorize hiding a changed account/method, treating a link-bound password candidate as an account, or committing before the final action. Validate that the next action is discoverable with long identifiers and EN/RU content; final grouping remains a prototype decision.

## 6. Main and alternate transitions

### 6.1 Automatic same-email paths

**Google to password account:**
1. Flow 02 obtains a valid Google authentication result and submits it to the identity service.
2. The service validates the Google identity/email and resolves current method ownership atomically.
3. On an authoritative same-email match to an existing password account, with the Google method not bound elsewhere, the service associates Google with that canonical account and establishes its signed-in session.
4. The client accepts only the authoritative account/session snapshot, replaces cached facts, and follows Flow 02's validated signed-in destination without password proof or an explicit link action.

**Password registration to Google-only account:**
1. Flow 03 collects the requested password and completes purpose-bound email-code verification.
2. The identity service resolves that verified email to an existing Google-only account and confirms that no password is already installed.
3. The service adds the requested password method to that canonical account and establishes its signed-in session without Google proof or a settings detour.
4. The client accepts only the authoritative account/session snapshot, replaces cached facts, and follows Flow 03's validated signed-in destination.

Both paths preserve the existing balance, projects, purchases, and welcome-grant history. Neither creates another account, merges records, moves data, or issues another welcome grant.

### 6.2 Manual different-email path
1. An originating flow receives an authoritative `link_required` result for an eligible explicit manual link.
2. The link overview loads the current operation and account-method snapshot.
3. The user explicitly chooses to continue.
4. The user freshly proves both the current method and the method being added; the 30-day session or new-method proof alone substitutes for neither proof.
5. The client reloads eligibility and the expected account revision.
6. The user activates **Link methods**.
7. The service atomically associates the existing candidate method, or creates and associates the verified link-bound password candidate, with the one canonical account or returns a typed non-success result. No separate account, grant, or pre-commit session is created.
8. On success, the client replaces cached account/method/balance/library facts with the authoritative snapshot and follows the validated return destination.

### 6.3 Cancel and denial
- Cancel before final submission performs no link and consumes no grant.
- Provider-window cancellation, denied consent, or abandoned manual password proof returns to recovery without claiming success. Failed or invalid authentication/code proof never falls back to a client-reported email match.
- **Use another sign-in method** hands off to Flow 02 and preserves the intent only when its service status allows it.

### 6.4 Expired, used, or revoked proof
- After proof expires, is used/revoked, or binds to another account, clear secrets and do not submit linking.
- **Try again** starts fresh proof. An expired intent offers **Back to sign in** or **Back to Account** and never silently creates another intent.

### 6.5 Existing association and conflict
- If both methods already belong to the intended account, reconcile to success without another mutation or grant.
- If the candidate belongs to another account, block linking, explain the conflict, and offer entry or recovery for that account without revealing its private data. Never merge accounts, balances, libraries, purchases, grants, or histories.
- If the two freshly proved methods use different verified emails, linking remains eligible. Preserve the existing email/password recovery address and do not invent a primary/contact-email setting.
- If valid Google authentication resolves to the same email as an existing password account and the Google method is not bound elsewhere, use automatic association/sign-in rather than manual proof or settings.
- If purpose-bound registration-code verification resolves to an existing Google-only account with no password, add the requested password automatically. Never overwrite an existing password.
- If that same-email account already has a password, whether detected at initial registration or after a verification-time race, show **Account already exists** with **Sign in** and **Reset password**. This outcome is selected and is not governed by OPEN conflict-copy policy.

### 6.6 Stale state, concurrency, and unknown outcome
- A stale revision reloads the snapshot; another active account invalidates continuation.
- Prevent duplicate local activation and require service idempotency. After timeout or response loss, query status before another final submission.
- If status is unavailable, say linking could not yet be confirmed. Reconcile a late success only to an authorized active session.

### 6.7 Reload and resume
- Reload reconstructs from the server-owned operation and authoritative session, not component memory.
- Resume requires the intended account, unexpired intent, and still-valid proof; passwords and provider tokens are never restored.
- Back/Forward after success cannot restore final submit; Flow 03 returns recheck eligibility. Flow 04 success follows its own project/New dub destination and never returns automatically; any later manual link entry requires fresh dual proof.
- Link-intent lifetime, same-device versus cross-device resume, and cleanup of abandoned intents or uncommitted link-bound candidates remain OPEN-F05-T2.

## 7. Loading, validation, and failure states

Field-specific validation errors appear directly beneath the affected field. Service-level proof/linking errors appear above the active primary button. A failed request preserves the selected method and entered values within the active form lifecycle so the user can correct or retry; passwords/proof secrets are cleared when that lifecycle ends and are never placed in durable browser state.

| State | Visible behavior | Protection |
|---|---|---|
| Loading/proof pending | Stable final structure and plain progress on the active action | No guessed facts or competing final action |
| Invalid input/provider denied | Associated error, focus, Retry or Cancel | No echoed secret, link, or account disclosure |
| New different-email password method needs verification | Keep the link-bound candidate inside Flow 05 and use the approved six-cell code interaction | No ordinary registration, account, grant, session, or usable method before final dual-proof commit |
| Existing password method needs recovery | Enter Flow 04 as an independent reset; after its approved project/New dub destination, require a later explicit manual link entry and fresh dual proof | No automatic link return or reuse of reset session as linking proof |
| Rate limited/unavailable | Service-supplied guidance and Retry | No fabricated countdown, success, or blind retry |
| Expired/conflict | Restart expired proof; for another-account conflict offer its sign-in/recovery path | No cached proof reuse, merge, disclosure, or data movement |
| Code-verified registration email already has a password | Show **Account already exists** with **Sign in** and **Reset password** | No password overwrite, new account, merge, or second grant |
| Outcome unknown | State that status is being checked | Reconcile before resubmit |

## 8. Responsive, keyboard, and accessibility behavior

### Desktop, tablet, and phone
- At 768 CSS px and above, use regular compact top navigation, 32px page gutters, and a bounded single-column form inside the 1200px maximum working canvas; no sidebar, promotional rail, or unrelated data.
- Below 768 CSS px, use the approved mobile navigation, exact 16px gutters, 48px phone control targets, one column, and no horizontal scrolling at 390px or with long Russian copy.
- The page heading is Mabry Pro Medium 32px/40px on desktop and Medium 24px/32px on phone; body and dialogue text are Regular 16px/24px, captions are Regular 14px/20px, buttons use Mabry Pro Medium 14px/20px for task, secondary and navigation actions and Medium 16px/24px for prominent/landing actions; phone buttons use Mabry Pro Medium 16px/24px with retained 48px targets, and field labels are Medium 14px/20px.
- Provider return, errors, and actions remain usable above safe areas and the software keyboard.

### Keyboard and assistive technology
- Order: header, title/instruction, method statuses, proof controls, final action, secondary actions.
- Controls have visible focus and persistent names. Enter submits only the eligible form and never skips review.
- Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed.
- Announce state changes without repeated focus theft; associate field/summary errors with their step.
- Provider cancellation returns focus. Any later dialog supports naming, focus containment, Escape/Cancel, and focus return.
- Color is never the only signal. System reduced-motion disables interface transitions; every state change remains perceivable without animation.

## 9. Visible copy and localization

| English | Russian |
|---|---|
| Link sign-in methods | Связать способы входа |
| Continue linking | Продолжить привязку |
| Continue with Google | Продолжить с Google |
| Email and password | Электронная почта и пароль |
| Verify email | Подтвердить почту |
| Reset password | Сбросить пароль |
| Account already exists | Аккаунт уже существует |
| Sign in | Войти |
| Link methods | Связать способы |
| Sign-in methods linked | Способы входа связаны |
| Nothing has been linked yet | Способы входа пока не связаны |
| Linking could not be confirmed | Не удалось подтвердить привязку |
| This method belongs to another account | Этот способ входа связан с другим аккаунтом |
| Sign in to that account | Войти в тот аккаунт |
| Recover access | Восстановить доступ |
| Try again | Повторить |
| Back to sign in | Вернуться ко входу |
| Back to Account | Вернуться в аккаунт |
| Cancel | Отмена |

Final security-neutral wording for a method bound to another account and provider-proof wording require review under OPEN-F05-T3. That OPEN does not apply to the resolved code-verified same-email/password-present result: **Account already exists** with **Sign in** and **Reset password**. Different verified emails remain eligible and must be identified accurately without inventing a primary-contact selection. Google remains the provider product name in both locales.

The manual/saved/browser locale precedence in section 5.1 applies throughout this flow, including provider-return, conflict, expired-intent, and success states. Switching locale does not validate, refresh, or consume proof by itself.

## 10. Logical service flow

These names describe responsibilities and result categories, not approved endpoints, schemas, libraries, or vendor APIs.

| Logical operation | Inputs | Required results |
|---|---|---|
| `resolveGoogleEntry` | validated Google authentication result, origin, locale, stable operation identity | signed in to existing Google account; automatically linked and signed in to same-email existing password account with authoritative account/session snapshot; method-owned-elsewhere conflict; invalid/denied/expired; unknown; unavailable |
| `completePasswordRegistrationAssociation` | purpose-bound successful registration-code proof, requested password-installation result, expected identity/account revision, stable operation identity | password added and signed in to same-email existing Google-only account with authoritative snapshot; `password_already_exists` with **Account already exists**, **Sign in**, and **Reset password**, with no write; conflict; stale; unknown; unavailable |
| `startLinkIntent` | authenticated/session context, origin, desired method, locale | eligible intent, fresh current-method proof required, unverified, conflict, denied, unavailable |
| `loadLinkIntent` | opaque operation identity and current session | current snapshot, expired, revoked, wrong account, completed, unavailable |
| `proveCurrentAccount` | intent and fresh existing-method proof | verified, denied, expired, rate limited, unavailable |
| `proveCandidateMethod` | intent and fresh Google or verified email/password proof | verified with method email, unverified, denied, expired, already associated here/elsewhere, unavailable |
| `startPasswordMethodCandidate` | intended canonical account, active manual link intent, different candidate email, requested password secret, locale, stable operation identity | link-bound pending candidate and code-send/expiry/resend facts; existing method requires ordinary fresh proof; method-owned-elsewhere conflict; validation, rate limit, unavailable, unknown; never an account, grant, or session |
| `verifyPasswordMethodCandidate` | same canonical account/link intent/candidate identity, changed complete 6-digit code, stable verification identity | verified link-bound candidate; invalid, expired, replaced, used, mismatched, conflict, unavailable/unknown; never ordinary registration completion or a signed-in method before commit |
| `commitMethodLink` | manual intent, both required fresh proof results, existing candidate method or verified link-bound password candidate, expected account revision, idempotency identity | linked snapshot with any candidate password method created/associated atomically; already linked here; stale; conflict; expired/revoked; unknown; unavailable; no separate account/grant/session |
| `getLinkStatus` | operation identity and authorized session | pending, linked snapshot, not linked, conflict, expired/revoked, unavailable |

The centralized service boundary is interchangeable. Zustand may coordinate display state but is not authority for identity, proof validity, same-email matching, association, canonical account selection, balance, project library, grant eligibility, password-existence state, or operation outcome. Automatic association and session establishment must be one authoritative, idempotently reconcilable service outcome; client navigation is not proof that either succeeded.

Locale passed to a logical operation controls user-facing presentation only; it cannot weaken proof or change account identity. Validation/service errors returned by the adapter include a safe field association or service-level category so the UI can apply the approved beneath-field/above-primary-action placement without exposing raw provider diagnostics.

### Mock-truth boundary
A mock may deterministically simulate valid Google authentication automatically linking/signing into a same-email existing password account; code-verified registration automatically adding the requested password/signing into a same-email existing Google-only account; preservation of the existing account/balance/projects/grant history in both cases; `password_already_exists` at initial submission or after a verification-time race showing **Account already exists**, **Sign in**, and **Reset password** with no overwrite; a link-intent-bound different-email password candidate whose code proof creates no ordinary account, grant, session, or usable method before final dual-proof commit; existing different-email methods with both fresh proofs; Flow 04 recovery completing to its approved project/New dub destination without automatic link return, followed by a later explicit manual link with fresh proof; session-only/new-method-only rejection for manual linking; minimum-8/no-character-class password validation; all proof results; delay, denial, expiry, stale revision, another-account conflict, duplicate submit, unknown outcome, successful reconciliation, no-unlink presentation, manual/saved/browser locale precedence, long RU/EN copy, and field/service error placement with active-form value preservation.

A mock cannot prove:

- live Google identity or provider consent;
- mailbox or password ownership;
- token integrity, audience, nonce, replay resistance, expiry, or revocation;
- real account uniqueness, atomic linking, idempotency, or concurrent-write protection;
- preservation of production balances, projects, purchases, grants, sessions, or audit records;
- real automatic same-email association, password installation without overwrite, or session establishment;
- account-enumeration resistance, abuse prevention, or provider availability.

Every mock Google/email interaction and UI check must be labeled simulation, not backend, provider, production-data, or security evidence.

## 11. Privacy and persistence boundaries

- Passwords, provider tokens, proof secrets, security claims, and recovery artifacts never appear in URLs, analytics, user-visible logs, or persisted client stores.
- Persist only the minimum opaque operation context needed by the approved resume contract.
- Link audit data and proof retention belong to the future security/backend contract; this draft does not set duration.
- Private account existence, method state, email, balance, projects, and grant eligibility must not leak through public errors. The selected **Account already exists** result may be returned by the authoritative registration service at initial submission or after a verification-time account-state race; it is confined to the explicit registration context and does not change neutral Flow 02 invalid-credential or Flow 04 reset-request copy.
- Cached private snapshots are cleared or replaced when the session expires, the active account changes, or authoritative linking succeeds. Different method emails remain method identities; adding Google never rewrites the email/password reset destination.
- Linking does not alter project, recording-draft, result, credit-expiry, or account-deletion retention rules.

## 12. Acceptance criteria

All criteria are unexecuted. The owner has resolved both same-email automatic entry directions; remaining OPEN items are technical/security gates, not permission to weaken the selected behavior.

- [ ] **F05-AC01 — Manual explicit intent:** manual linking, including different-email methods, performs no association before explicit final action and fresh proof of both methods. This criterion does not insert manual confirmation into either approved automatic same-email entry case.
- [ ] **F05-AC02 — Unique canonical account:** success associates Google and verified email/password with exactly one canonical account and returns its one balance, project library, and welcome-grant state without duplication.
- [ ] **F05-AC03 — Fresh proof for manual linking:** manual different-email linking requires fresh eligible proof of the current method and the added method; a 30-day session or new-method proof alone is insufficient. Pending, denial, cancellation, expiry, rate-limit, and unavailable states remain safe. Automatic same-email entry follows AC16/AC17 instead.
- [ ] **F05-AC04 — Existing-account conflict:** a method already associated elsewhere is not linked or merged; the UI explains the conflict and offers that account's sign-in/recovery path without exposing private data.
- [ ] **F05-AC05 — Different verified emails:** differently addressed methods may link after both fresh proofs, keep one canonical account/balance/library/grant history, and do not replace the email/password recovery identity or invent a primary contact setting.
- [ ] **F05-AC06 — Cancel and expiry:** cancellation, denial, expired proof, and expired intent perform no link and return through a safe stated path.
- [ ] **F05-AC07 — Concurrency:** duplicate clicks, stale revisions, account switching, already-linked races, timeout, reload, and late results reconcile one idempotent operation without a blind retry.
- [ ] **F05-AC08 — Resume:** only the same authorized account can resume a valid intent; secrets are never restored, and completed history cannot restore the final-submit form. Exact intent lifetime/resume/cleanup remains OPEN-F05-T2.
- [ ] **F05-AC09 — Handoffs:** Flow 02 Google entry/reauthentication and Flow 03 verification/password installation preserve the intended canonical account and reconcile authoritative eligibility/outcome. Flow 04 recovery completes to its approved valid-project or New dub destination, never automatically resumes linking, and a later manual link starts explicitly with fresh proof of both methods. Flow 15 returns only after an authoritative Flow 05 outcome.
- [ ] **F05-AC10 — Bilingual accessibility, locale and motion:** Complete EN/RU states work at desktop/tablet/390px, keyboard/screen-reader/200% zoom and short viewports without clipped actions or mixed language. A manual pre-sign-in locale choice overrides/updates a different saved preference; otherwise saved then browser fallback applies. Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.
- [ ] **F05-AC11 — Privacy:** secrets and private account existence stay out of URLs, analytics, persisted client state, and disclosure beyond the approved policy.
- [ ] **F05-AC12 — Honest evidence:** mock states are identified as simulation and never presented as proof of Google, email/password, backend security, atomicity, or production-data preservation.
- [ ] **F05-AC13 — Shared visual contract:** Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed.
- [ ] **F05-AC14 — Error placement and preservation:** field errors sit beneath their fields, service errors above the affected primary action, and a failed request preserves selected method/entered values only within the active form lifecycle; secrets never enter durable storage.
- [ ] **F05-AC15 — Add-only method policy:** the flow exposes Link for an eligible second method and no unlink/remove/Disconnect action. Email/password proof applies minimum 8 characters with no mandatory character classes; it does not invent maximum length, primary/contact-email semantics, or proof TTL.
- [ ] **F05-AC16 — Automatic Google-to-password association:** valid Google authentication whose authoritative email matches an existing password account automatically associates Google and signs into that existing account without password proof, manual link review, or Account-settings detour. It returns the same canonical account, balance, projects, and one welcome-grant history, creates/merges no account, and still blocks a Google method already bound to another account.
- [ ] **F05-AC17 — Same-email password-registration resolution:** after purpose-bound registration-code verification, registration using the email of an existing Google-only account adds the requested password method and signs into that existing account without Google proof or an Account-settings detour. It preserves the canonical account, balance, projects, and grant history, creates/merges no account, and issues no new welcome grant. If the account already has a password at initial submission or because of a verification-time race, it shows **Account already exists** with **Sign in** and **Reset password**, writes nothing, and never overwrites the existing password.
- [ ] **F05-AC18 — Link-bound password candidate:** creating a different-email password method during manual linking binds the candidate to the intended canonical account, active link intent, candidate identity, and proof purpose. Code verification proves only that candidate; it creates no ordinary account, welcome grant, session, project library, or usable login method. Only the final explicit action with both fresh proofs atomically creates and associates the method.

## 13. Verification plan — not executed

1. Review the flow against the shared contract, SPEC-001, BR-001, and resolved owner answers.
2. Contract-test every result category, including automatic Google-to-password same-email association/sign-in, automatic code-verified password addition/sign-in to a Google-only account, `password_already_exists` at initial submission and after a verification-time race with the exact message/actions and no write, creation and verification of a link-intent-bound different-email password candidate with no pre-commit account/grant/session/usable method, fresh proof of each method for manual linking, rejection of session-only/new-method-only manual proof, same-account already-linked, other-account conflict, different verified emails, stale revision, and unknown outcome.
3. Component-test main, cancel, denial, expiry, unavailable, conflict, reload, and success states with deterministic fixtures in English and Russian.
4. Exercise Flow 02/03/04/15 handoffs, including valid Google authentication into an existing same-email password account; code-verified registration into an existing same-email Google-only account; registration where a password already exists initially or appears during the verification race and only **Sign in**/**Reset password** are offered; the selected 6-digit/10-minute/60-second/5-per-hour replacement-code rules for a link-bound password candidate; Flow 04 recovery reaching its approved valid-project/New dub destination with no automatic link return, followed by a later explicit manual link requiring fresh dual proof; post-reset session effects; expired session; and a different active account.
5. Exercise duplicate final activation, response loss before/after commit, reload while pending, late provider return, and another-device association.
6. Verify that client-entered email equality or an unvalidated provider claim never invokes association. Verify each authoritative same-email automatic path uses its required Google/code proof, preserves the existing canonical account/resources/grant history, and requires no extra opposite-method proof or settings detour; verify different verified emails can succeed only through manual dual proof; verify conflicts never move or combine balances, libraries, purchases, or grants and expose only safe recovery actions.
7. Verify no Disconnect/unlink/remove-method action appears; verify an 8-character email/password proof is not rejected for lacking uppercase, digits, or special characters, while shorter input follows the shared validation source.
8. Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed. Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.
9. Verify the signed-in phone header contains logo left, available balance/menu right, and New dub, My projects, Credits, Account, language, and Sign out; verify proof states that cannot expose authenticated navigation use the safe authentication header.
10. Verify manual pre-sign-in locale wins over a different saved preference and updates it; absent manual choice, verify saved account preference, then browser `ru`/English first-use fallback without browser default overwriting the account.
11. Trigger field and service failures; verify beneath-field versus above-primary-action placement, active-form value preservation, and secret clearing at lifecycle end.
12. Run keyboard-only and screen-reader checks for status announcements, field errors, provider-return focus, cancellation, and success navigation.
13. Inspect URLs, storage, logs, analytics payloads, and error copy for password/provider/proof secrets and private-account disclosure.
14. With real services only, verify authoritative Google claims, purpose-bound registration-code proof, automatic same-email association in both directions, exact password-present collision routing at initial submission and after a race with no overwrite, session establishment, manual dual fresh proof, link-bound different-email password-candidate creation and verification with no pre-commit account/grant/session/usable method, replay/expiry handling, Flow 04's independent destination and later fresh-link proof, different-email linking, conflict recovery, atomic candidate creation/association, account uniqueness, idempotency, concurrency, and production-data preservation.
15. Record command, environment, date, revision or dirty-worktree boundary, result, and evidence location; mark blocked or not run honestly.

No verification, browser run, provider request, email delivery, backend call, or security test was executed by this specification authoring pass.

## 14. Dependencies and handoffs

| Dependency | Responsibility |
|---|---|
| Shared contract / Flow 01 | Product identity, compact navigation, locale precedence, responsive shell, and approved presentation values |
| Approved design tokens | Semantic color roles, component states, focus treatments, typography, spacing, geometry and motion defined in `design-tokens.md` |
| Flow 02 — Sign in | Valid Google authentication, authoritative same-email resolution, automatic association/session outcome for an existing password account, reauthentication, safe signed-in destination |
| Flow 03 — Registration and verification | Requested password plus purpose-bound code interaction reused for a link-bound candidate without ordinary registration completion; automatic password addition/session outcome for an existing same-email Google-only account; when a password exists initially or appears in a verification-time race, **Account already exists** plus **Sign in**/**Reset password** and no write; no duplicate account/grant |
| Flow 04 — Password reset | Independent recovery whose approved destination is a valid project return or New dub; no implicit or automatic link return, and later manual linking requires fresh proof |
| Flow 15 — Account | Authoritative method rows, Link entry, and reconciled return; no unlink/remove-method control in the MVP |
| Identity/account service | Canonical account, link-intent-bound password candidate, proof eligibility, final atomic candidate creation/association, operation status, conflict result, revision fencing |
| Balance/project/grant services | Authoritative unchanged account snapshot and safeguards against duplication or movement |
| Security/privacy policy | Freshness windows, proof purpose binding, intent lifetime/resume/cleanup, conflict disclosure, audit/retention, abuse and rate-limit mechanics |

## 15. Current contract and remaining technical gates
Current requirements: valid Google authentication automatically links/signs into an existing same-email password account without password proof or a settings detour; purpose-bound code-verified password registration automatically adds the requested password/signs into an existing same-email Google-only account without Google proof or a settings detour; neither case creates/merges an account, duplicates a grant, moves data, or overwrites an existing password. Fresh proof of both methods remains mandatory for explicit manual different-email linking. A new different-email password method remains a canonical-account/link-intent-bound candidate until the final explicit dual-proof commit and creates no ordinary account, grant, session, or usable login method beforehand. Flow 04 recovery returns to its approved project/New dub destination and never automatically resumes linking; a later manual attempt starts explicitly with fresh proof. A method owned by another account is blocked with that account's sign-in/recovery and no merge; different verified emails may link while the email/password recovery identity remains unchanged; the MVP has no unlink/remove-method action; and email/password surfaces use minimum 8 characters with no mandatory character classes. The shared presentation, locale, and error contracts listed above are also resolved.

The automatic same-email decisions supersede the earlier blanket dual-fresh-proof rule only for their two stated entry cases. Registration against an account that already has a password, whether detected at initial submission or after a verification-time race, is resolved: show **Account already exists** with **Sign in** and **Reset password**, and never overwrite the password. It is not an OPEN disclosure/collision choice and is not password replacement.
| ID | Technical/security detail still OPEN | Impact |
|---|---|---|
| OPEN-F05-T1 | Exact acceptable freshness window, purpose/audience binding, provider mechanics, nonce/replay handling, and proof-artifact exchange | Proof validity and real-service verification |
| OPEN-F05-T2 | Link-intent lifetime, same-device/cross-device resume, abandoned-intent and uncommitted link-bound-candidate cleanup, and audit retention | Resume, expiry, privacy, operational cleanup |
| OPEN-F05-T3 | Exact security-neutral conflict disclosure and safe routing into the other account's sign-in/recovery without enumeration | Conflict copy, privacy, supportability |

Shared Mabry Pro Regular/Medium weights, body/dialogue/caption/page-heading sizes and line heights, role-specific Mabry Pro Medium desktop button labels from design-tokens.md and Medium 14px/20px field-label roles, 8/16/24/32px spacing roles, 24px desktop/16px phone existing-panel padding, restrained motion direction, approved semantic color/component-state/focus roles, control radius/heights, separate page gutters, 1200px maximum width, 768px responsive boundary, signed-in phone header, locale precedence, and error placement are resolved and normative above. Font asset availability, browser loading/fallback, forced-colors behavior, rendered conformance, screen-specific geometry not implied by the common scale, routes, and remaining microinteraction mechanics remain OPEN. Unlinking/removing login methods and account merging are excluded from this MVP. Primary/contact-email semantics remain unselected and must not be inferred from differing method emails.

## 16. Design-skill application and evidence boundary

The author applied `.agents/skills/design-taste-frontend/SKILL.md`, its app-screen and forms guidance, and `.agents/skills/frontend-design/SKILL.md`.

They informed the sparse form hierarchy, noun title, flat surfaces, restrained status color, plain method rows, one primary action, honest loading/error states, phone stacking, visible focus, and direct action/result copy. The confirmed Dubbed direction overrides generic or randomly dealt style choices.

The skills do not approve product behavior or visual values. Owner answers, not skill defaults, select both automatic same-email association cases, manual different-email dual proof, no-merge conflict handling, add-only method management, password minimum/composition, and the shared presentation contract. No style draw, mockup, product code, screenshot, browser inspection, live provider flow, email delivery, account mutation, or backend/security evidence was produced.
