# Contract anatomy excerpts

Read-time excerpts of active documents. These are not frozen historical contracts; publication/review snapshots linked in the report establish earlier obligations. Line numbers refer to the original file at audit time.

## 01-landing.md

```text
70: ## 4. Page anatomy and copy
71: 
72: ### 4.1 Public header
73: 
74: For a signed-out visitor, the header contains only:
75: 
76: - Dubbed logo/home action;
77: - **RU / EN** language switch;
78: - **Sign in**.
79: 
80: Do not add explanatory anchors, **Start dubbing**, pricing, feature links, or authenticated account controls to the signed-out header. An authenticated visitor uses the shared authenticated navigation contract rather than a signed-out header that pretends the user is anonymous.
81: 
82: ### 4.2 Main content
83: 
84: Proposed English copy:
85: 
86: - Title: **Dub your own scene**
87: - Supporting line: **Upload a video, choose up to two minutes, and record every character in your own voice.**
88: - Primary action: **Start dubbing**
89: - Offer line: **Get 120 free welcome credits once with an eligible verified account.**
90: 
91: Proposed Russian copy:
92: 
93: - Title: **Озвучьте свою сцену**
94: - Supporting line: **Загрузите видео, выберите фрагмент до двух минут и озвучьте всех персонажей своим голосом.**
95: - Primary action: **Начать озвучку**
96: - Offer line: **Получите 120 бесплатных приветственных кредитов один раз для подходящего подтверждённого аккаунта.**
97: 
98: Copy remains proposed pending bilingual editorial review. It must not imply that every account is eligible, that the welcome grant repeats or expires, that a cash price has been chosen, or that arbitrary content is permitted. The signed-out **Start dubbing** action leads to Flow 03 registration; it does not open upload directly.
99: 
100: ### 4.3 Signed-out return status
101: 
102: - After ordinary Sign out succeeds, show the ordinary signed-out landing. Do not show the account-deletion confirmation; sessions on other devices remain outside this page and stay active.
103: - After authoritative account-deletion success, show **Account deleted** / **Аккаунт удалён** as localized status within the ordinary landing. Do not open a standalone deleted-account page, automatically sign in, or automatically recreate an account.
104: - Failure, timeout, pending, or unknown deletion never shows the deletion-success status. The owning flow reconciles those outcomes before navigation.
105: - The normal minimal header and main content remain present. The return status does not add video, account controls, navigation, or a marketing section, and landing itself performs no session/account mutation.
106: 
107: ## 5. Main and alternate transitions
```

## 02-sign-in.md

```text
68: ## 4. Screen anatomy
69: 
70: ### 4.1 Authentication header
71: 
72: Required responsibilities:
73: 
74: - Dubbed wordmark/home action;
75: - English/Russian language control;
76: - no account, project, credits, or upload controls before authentication is established;
77: - no sidebar or empty application chrome around the form.
78: 
79: Changing language updates labels, help, errors, provider status, and accessible names together. It must not clear typed email or password values. Without a saved preference, first use selects Russian for browser language `ru` and English otherwise. An explicit RU/EN choice before sign-in remains active after authentication and updates a different saved account preference. A browser-derived default is not an explicit choice and must defer to, and must not overwrite, an existing account preference.
80: 
81: ### 4.2 Sign-in form
82: 
83: Required controls in logical order:
84: 
85: 1. screen title: **Sign in** / **Войти**;
86: 2. Google action: **Continue with Google** / **Продолжить с Google**;
87: 3. a text separator whose accessible reading does not imply two simultaneous requirements;
88: 4. **Email** / **Электронная почта** field;
89: 5. **Password** / **Пароль** field;
90: 6. password show/hide control with a persistent accessible name and state;
91: 7. primary action: **Sign in** / **Войти**;
92: 8. **Forgot password?** / **Забыли пароль?**;
93: 9. **Create account** / **Создать аккаунт**.
94: 
95: Labels remain visible above fields. Placeholders do not replace labels. Browser autofill, password managers, and paste must work. The form must not log, translate, persist in Zustand, or expose the password.
96: 
97: There is no **Remember me** control. Every successful sign-in uses the confirmed fixed 30-day session rule in section 6.1.
98: 
99: ### 4.3 Pending state
100: 
101: - Disable duplicate submission for the active method, keep the form stable, and expose a concise programmatic status.
102: - Preserve entered email and password values after a failed request within the active form lifecycle; never persist the password beyond that lifecycle or after success.
103: - Do not claim authentication, destination success, or ownership before the service result.
104: - Google pending may identify the provider handoff but must not imitate provider UI inside Dubbed.
105: 
```

## 03-registration.md

```text
61: ## 4. Information architecture and visual anatomy
62: 
63: ### 4.1 Shared frame
64: 
65: - A compact top bar carries product identity, locale access, and the relevant sign-in/register alternative.
66: - There is no sidebar.
67: - The main region has one `h1`, one plain supporting sentence, the active form or status, and only the recovery actions needed for that state.
68: - Use Mabry Pro Regular and Medium only, never Bold: body text is Regular 16 px/24 px, supporting captions are Regular 14 px/20 px, buttons use Mabry Pro Medium 14px/20px for task, secondary and navigation actions and Medium 16px/24px for prominent/landing actions; phone buttons use Mabry Pro Medium 16px/24px with retained 48px targets, field labels are Medium 14 px/20 px, and the page heading is Medium 32 px/40 px desktop and 24 px/32 px phone. Actual font asset availability/loading, approved fallback behavior, and screen-specific geometry not implied by the common spacing roles still require implementation evidence or a shared decision; these weight roles, sizes, line heights, and common spacing scale are resolved.
69: - Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed.
70: - Buttons and single-line inputs use component-specific source geometry. Do not add gradients, glass, glow, unmapped decorative shadows, decorative display faces, all-caps styling, or a wrapper card around every block.
71: - Use 8 px between closely related elements, 16 px between form fields/buttons, 24 px between blocks within the screen, and 32 px between major sections. Existing panel padding is 24 px at and above 768 px and 16 px below 768 px; page gutters remain the separate 32 px/16 px values. Do not add a panel or card merely to apply padding.
72: 
73: ### 4.2 Desktop composition
74: 
75: At 768 CSS px and above, use regular top navigation, 32 px page gutters, approved desktop action roles and separate derived single-line-input geometry, and a registration form no wider than 400 px. The shared working area is capped at 1200 px, but the form remains the narrower focused column. Product identity and locale stay available without competing with the form. There is no floating marketing-card shadow.
76: 
77: ### 4.3 Phone composition
78: 
79: Below 768 CSS px, use mobile navigation, one column, 16 px page gutters, and 48 px standard buttons and single-line inputs. The form uses the available width without exceeding 400 px or overflowing. The primary action follows the fields without a fixed overlay. The keyboard must not cover the focused field, validation message, or submit result. Long addresses wrap or truncate without page-level horizontal scrolling while retaining an accessible full value.
80: 
81: ### 4.4 Form rules
82: 
83: - Every field has a persistent visible label; placeholder text never substitutes for a label.
84: - Registration has one password field, no repeat-password field. It supports paste and password managers, displays the minimum 8 characters, and imposes no mandatory uppercase, digit, or special-character class. Maximum length, Unicode/counting semantics, breached-password handling, and server abuse controls remain OPEN.
85: - The password show/hide control has an accessible name, preserves the value and caret where supported, and never changes the submitted value.
86: - Field-specific errors sit directly beneath the affected field. Service-level errors sit above the current primary action. A failed request preserves all entered values within the active form lifecycle, including the password or code, but does not persist either secret beyond that lifecycle or after success.
87: - On button-submitted forms, Submit remains available for ordinary client-side mistakes so attempted submission can reveal actionable validation; only an active duplicate request may temporarily disable it. Verification-code entry instead follows the changed-complete-value automatic-submission guard in Section 5.4.
88: - Loading preserves form geometry and current entered values needed for correction.
89: 
90: ## 5. Screens and states
91: 
92: ### 5.1 Create account
93: 
94: Required content:
95: 
96: - title and short explanation;
97: - **Continue with Google** / **Продолжить с Google**;
98: - a clear separator expressed in words, not decoration alone;
```

## 04-password-reset.md

```text
59: ## 4. Screen anatomy
60: 
61: ### 4.1 Shared authentication header
62: 
63: - Dubbed wordmark/home action.
64: - English/Russian language control.
65: - **Back to sign in** when it is a valid next action.
66: - No account/project navigation is assumed for an unauthenticated visitor.
67: - An already authenticated user may enter only through an allowed recovery/account path; successful reset still replaces the current-device session and terminates every other session authoritatively.
68: 
69: Changing language must update visible copy, labels, errors, instructions, and accessible names without clearing active-form values. On first use without a saved preference, use Russian when the browser language is `ru`, English otherwise. A manual pre-sign-in choice has priority after reset sign-in and updates the account preference. A browser-derived initial choice is not manual consent to overwrite an existing account preference.
70: 
71: ### 4.2 Request reset email
72: 
73: Required content:
74: 
75: - title: **Reset your password** / **Сброс пароля**;
76: - concise instruction to enter the account email;
77: - visible **Email** / **Электронная почта** label;
78: - one email field with browser autofill support;
79: - primary action: **Send reset email** / **Отправить письмо для сброса**;
80: - secondary action: **Back to sign in** / **Вернуться ко входу**.
81: 
82: The form normalizes only what the shared identity contract explicitly permits. It must not silently rewrite an address into a different identity.
83: 
84: Field-specific validation appears directly below the email field. A request-service error appears above **Send reset email**, preserves the entered email, and offers the applicable retry action.
85: 
86: For every syntactically valid email, the public request state is identical regardless of whether the address maps to an email/password account, Google-only identity, unverified or disabled identity, deleted identity, or no identity. Show **If an account with this email exists, we sent a code** and proceed to code entry. Do not show Account not found, name an identity class, or otherwise branch the request-success presentation on existence. A syntax error remains an email-field error. An actionable transport/service failure remains a service error above **Send reset email**; its copy and retry behavior must be existence-neutral.
87: 
88: ### 4.3 Neutral request response / enter code
89: 
90: This state follows every syntactically valid request that is not stopped by an actionable transport/service failure. It explains the next action without claiming that an account exists, an email was delivered, or the request is eligible to reset a password.
91: 
92: On same-browser reload, an authoritative opaque pending-flow reference restores this code-entry state and the selected email without sending another code. It restores no password and proves no delivery, eligibility, verification, session, or account state. If the code expired, the user may explicitly request a new eligible code under the existing resend rules.
93: 
94: Required responsibilities:
95: 
96: - show exactly the neutral English statement **If an account with this email exists, we sent a code**; localized copy must preserve the same neutral meaning without adding an existence claim;
```

## 05-account-linking.md

```text
67: ## 5. Screen and component anatomy
68: 
69: ### 5.1 Shared header
70: Show the Dubbed wordmark/home action, English/Russian control, a safe back/cancel action, and authenticated product navigation only when the current session may expose it.
71: 
72: On a signed-in phone, the compact header has logo at left and available credit balance plus menu at right. The menu contains New dub, My projects, Credits, Account, language, and Sign out. There is no permanent sidebar. During a proof step that cannot safely expose authenticated navigation, use the shared authentication header rather than leaking account state.
73: 
74: Changing locale updates all visible labels, status, help, errors, dialogs, and accessible names without discarding a valid service-owned link intent.
75: 
76: Locale precedence is shared: an explicit manual RU/EN choice before sign-in remains active after sign-in and updates a different saved account preference. Otherwise use the saved account preference; on first use with neither, use Russian for browser language `ru` and English otherwise. A browser-derived default is not a manual choice and must not overwrite an account preference.
77: 
78: ### 5.2 Automatic same-email entry cases
79: 
80: **Google to existing password account:** after valid Google authentication, the UI waits for the identity service to validate the provider identity/email and resolve method ownership. On `auto_linked_existing_password_account`, establish the returned session, replace cached balance/project/grant/method facts with the existing account snapshot, and continue to Flow 02's validated signed-in destination. Do not request the password, show a manual link review, or detour through Account settings.
81: 
82: **Password registration to an account with the same verified email:** the identity service may detect at initial submission that the canonical account already has a password and immediately return **Account already exists** with **Sign in** and **Reset password**, with no code-first requirement and no write. If the account initially appears Google-only, then after the requested password and purpose-bound registration code are valid the service rechecks method state. It installs the password method only when the account still has no password, establishes the returned session, replaces cached facts with the existing account snapshot, and continues to Flow 03's validated signed-in destination without Google proof or an Account-settings detour. A password that appears during the verification-time race produces the same collision. The existing password is never overwritten.
83: 
84: Both automatic cases preserve the existing canonical account, balance, projects, and one welcome-grant history. They create no second account, move or sum no data, and are not account merges. Typed failure/conflict recovery may be shown, but there is no extra linking confirmation. A method already bound to another canonical account still follows the confirmed no-link/no-merge conflict behavior.
85: 
86: ### 5.3 Manual link overview
87: Required content:
88: 
89: - title: **Link sign-in methods** / **Связать способы входа** and one sentence that both methods will open the same account;
90: - Google and email/password rows with authoritative association, verification, and proof status;
91: - a statement that the existing balance, projects, and single welcome grant stay with the account;
92: - **Continue linking** / **Продолжить привязку** when eligible, plus **Cancel** / **Отмена**.
93: 
94: This overview is for an explicit manual link intent, including different-email methods. It must not claim success before the service commits the association or expose whether another private account exists beyond the disclosure policy selected for conflicts. It is not inserted into either automatic same-email entry case.
95: 
96: ### 5.4 Current-account proof
97: For an explicit manual link intent, the user must freshly prove the current account's existing method. A valid 30-day signed-in session by itself is insufficient. This dual-proof rule remains mandatory for manual different-email linking; it does not add password or Google proof to the automatic same-email entry cases in §5.2.
98: 
99: The UI must be able to represent:
100: 
101: - why confirmation is needed and which current account is protected, using only approved disclosure;
102: - continuation to fresh proof of the current method through its approved Google or email/password mechanism;
103: - pending, denied, cancelled, expired, rate-limited, and unavailable states;
104: - a return bound to the same intended account, not merely any successful sign-in.
```

## 06-new-dub.md

```text
156: ## 4. Experience direction and component anatomy
157: 
158: ### 4.1 Design intent
159: 
160: This is a working app screen, not a marketing page. Its product-specific material is the user's actual video, selected timeline interval, and exact quote. The validated preview is therefore the main visual object after upload; decoration, stock imagery, abstract gradients, KPI tiles, and an illustrated empty state would obscure the task.
161: 
162: Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed.
163: 
164: Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.  There is no page-entry animation, parallax, decorative or looping attention motion. System reduced-motion disables interface transitions. Video playback and its time-synchronized audio/playhead movement remain functional. Capture, save acknowledgement and navigation never wait for an animation to finish.
165: 
166: Pending/loading states keep the approved page, surface and text roles plus an accessible status; they never fabricate progress, use a decorative loop, or rely on color alone.
167: 
168: Below 768 CSS px the screen uses the mobile shell and a single working column; at 768 CSS px and above it uses regular top navigation and desktop dimensions. Mabry Pro asset availability, browser loading/fallback, forced-colors behavior, rendered conformance and screen-specific geometry not implied by the common spacing roles remain unverified; the approved weights, line heights, shared spacing, semantic component states/focus treatments, tokens and dimensions above are not OPEN.
169: 
170: The screen must keep one primary action at a time and use the actual video/selection/quote hierarchy instead of a row of generic cards. The action that authorizes paid work is visually distinct from navigation to Credits.
171: 
172: ### 4.2 Persistent shell region
173: 
174: Required information and controls:
175: 
176: - product identity and compact primary navigation from the shared contract;
177: - current available credits balance after active reservations, with loading/error handling rather than a guessed value;
178: - account access;
179: - current locale; and
180: - saved/pending status once a durable project exists, without implying cross-device recovery before durable account association completes.
181: 
182: On phone, the header places the logo at left and the available balance plus menu button at right. The menu contains New dub, My projects, Credits, Account, language, and Sign out. Desktop uses the regular top navigation. There is no permanent sidebar at either width.
183: 
184: ### 4.3 Empty source state
185: 
186: Required anatomy:
187: 
188: - one clear source-selection action backed by a native file input;
189: - concise supported-container, maximum-duration, and maximum-size information available before selection;
190: - current project-capacity information or a visible entitlement-loading/error state;
191: - an accessible explanation that the file is validated after selection; and
192: - a capacity-blocked route to Flow 11 when no slot is available.
193: 
```

## 07-processing.md

```text
182: ## 6. Screen structure and anatomy
183: 
184: ### 6.1 Shared workspace
185: 
186: Processing is an interim state in the project workspace under the shared compact top navigation and common project header/status area. There is no permanent sidebar and no Prepare stage. Successful automatic processing hands through applicable microphone readiness to Record only when its matching operation/project Processing screen is still current; a background completion after the user navigates elsewhere updates status without redirect. Result remains downstream of recording.
187: 
188: Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed.
189: 
190: Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.  There is no page-entry animation, parallax, animated decorative recording effect or looping attention motion. System reduced-motion disables interface transitions. Video playback and time-synchronized audio/playhead movement remain functional. Capture, save acknowledgement and navigation never wait for animation completion.
191: 
192: Pending/loading states keep the approved page, surface and text roles plus an accessible status; they never fabricate progress, use a decorative loop, or rely on color alone.
193: 
194: During initial preparation, Record is the pending destination. During reprocessing, the header identifies that the current automatic preparation is retained until a replacement activates. Record and Result availability come from authoritative project readiness, not from a locally completed progress animation.
195: 
196: Exact routing and whether the Processing state has its own URL or a project-workspace substate are OPEN.
197: 
198: ### 6.2 Main processing surface
199: 
200: The first viewport contains, in logical reading order:
201: 
202: 1. project identity and selected-section context sufficient to distinguish the attempt;
203: 2. one noun/action title for the current state;
204: 3. the current authoritative status and, where available, the last confirmed update time;
205: 4. authoritative queued/running presentation: **Queued** while queued; the current stage name while running; and, only when trusted service percentage exists, exactly one overall bar with its numeric percentage;
206: 5. billing and retry facts relevant to this attempt;
207: 6. the primary available action, normally cancellation while eligible or retry/recovery after failure; and
208: 7. a short statement of what is preserved if the attempt fails or is cancelled.
209: 
210: The progress surface is the screen's largest working block. It is not a hero, illustration, decorative animation, card grid, detailed stage checklist, or fake dashboard. While the service authoritatively reports `queued`, show **Queued**. While it authoritatively reports `running`, show the current authoritative stage name even when no trusted overall percentage exists. When a trusted percentage exists for the current attempt revision, show exactly one overall progress bar, its numeric percentage, and that current stage name. Never fabricate `0%`, an indeterminate percentage, stage advancement, or running state from an elapsed client clock. No ETA, elapsed-time simulation, invented percentage or stage, queue position, cost split, completion time, or production stage allocation may be shown.
211: 
212: ### 6.3 Billing and preservation summary
213: 
214: The summary uses plain language and server facts:
215: 
216: - initial/paid attempt: authorized total quote and current reservation/terminal result;
217: - available spendable balance after reservations, with any reserved amount separately labelled **In processing** rather than shown as posted spending;
218: - included retry: included status and whether the allowance remains available or is consumed;
219: - running cancellation entry: a promise to calculate the current cancellation cost before confirmation, not a guessed number;
```

## 09-record.md

```text
64: ## 3. Experience principles
65: 
66: The screen's first question is: **What do I say now, and can I perform it against the scene?** The moving video is therefore the dominant and largest element. The current target line follows it in a smaller but plainly readable text block, followed by the playable audio timeline and the recording controls.
67: 
68: This is a focused work screen inside the shared project shell, not a dashboard or landing page. It uses the approved shared light rehearsal-room treatment:
69: 
70: - a white page ground, light-gray dividers, dark text and a black video stage;
71: - the authoritative [approved design-token system](design-tokens.md): use semantic `page`, `surface`, `media`, `text.primary`, `text.secondary` and `divider.decorative` roles rather than selecting raw shades in this flow;
72: - component states also come from that token system: essential control boundaries use `border.control`, never `divider.decorative`; primary and recording/destructive actions use their default/hover/pressed families with the approved foreground; links, errors, selections and disabled controls use `link`, `error`, `selected.*` and `disabled.*`, with source opacity only for genuinely disabled controls, with readable reasons and no dimming of focusable busy controls. Light UI uses `focus.light` (2px ring with 2px gap matching the opaque surrounding ground), while media controls use `focus.media` only on an opaque `media` backing rather than against changing frames;
73: - Mabry Pro Regular and Medium only, with no Bold or synthetic Bold: body/dialogue Regular 16px/24px, supporting captions Regular 14px/20px; desktop actions use task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, and navigation 36px / Medium 14px/20px; medium segmented controls use 40px / Medium 14px/20px desktop and 48px / Medium 16px/24px phone; phone text actions retain 48px targets; field labels use Medium 14px/20px; page headings use Medium 32px/40px desktop and 24px/32px phone. No decorative display face or all-caps treatment is used;
74: - button and single-line input radius from the mapped source component; standard control height role-sized desktop controls in design-tokens.md and 48px phone targets;
75: - horizontal page gutters 32px desktop / 16px phone;
76: - shared spacing uses 8px between closely related items, 16px between fields/buttons, 24px within an existing screen block, and 32px between major sections; existing panels use 24px padding at 768 CSS pixels and above and 16px below 768px. These values do not introduce a new panel or card wrapper;
77: - flat controls and quiet surface separation, without gradients or glows; mapped source component shadows apply;
78: - no card wrapper around every block; group the stage, target, timeline and controls according to their work rather than boxing each region separately;
79: - no oversized hero heading, KPI cards, ornamental badges or repeated icon tiles;
80: - the project identity, current workspace step and save state remain visible through the shared shell;
81: - font-file availability, browser loading, fallback stack and rendered proof remain shared specification/verification dependencies; the approved Regular/Medium weights, line heights and common spacing scale do not. Below 768 CSS pixels the single-column phone layout applies, at 768 CSS pixels and above the regular desktop navigation/layout applies, and working content is capped at 1200px. At 768px and above, playback/capture/navigation controls sit directly below the waveform in normal document flow and scroll with the page; they are not sticky or fixed. Controls must scroll fully into view, remain keyboard reachable, and never be clipped by hidden overflow; being below the initial fold alone is not occlusion.
82: 
83: ## 4. Screen anatomy
84: 
85: ### 4.1 Microphone check screen
86: 
87: The separate check screen remains inside authenticated Flow 09 and uses the shared project shell. It contains:
88: 
89: 1. **Purpose and readiness state**
90:    - states that this check prepares the current device for recording and does not create a dialogue take;
91:    - shows permission, selected-input and usable-input readiness separately;
92:    - permission success never starts a test recording or timed dialogue take automatically.
93: 2. **Microphone selection**
94:    - lists only inputs the browser actually exposes and identifies the selected input;
95:    - unavailable device enumeration is shown honestly rather than populated with invented devices.
96: 3. **Input-level indicator**
97:    - gives live feedback from the selected input when permission allows;
98:    - no numeric or visual level threshold is a mandatory completion gate.
99: 4. **Optional test controls**
100:    - `Record test` begins a microphone test only after explicit activation;
101:    - `Stop` ends that test and `Listen` auditions the completed test;
```

```text
83: ## 4. Screen anatomy
84: 
85: ### 4.1 Microphone check screen
86: 
87: The separate check screen remains inside authenticated Flow 09 and uses the shared project shell. It contains:
88: 
89: 1. **Purpose and readiness state**
90:    - states that this check prepares the current device for recording and does not create a dialogue take;
91:    - shows permission, selected-input and usable-input readiness separately;
92:    - permission success never starts a test recording or timed dialogue take automatically.
93: 2. **Microphone selection**
94:    - lists only inputs the browser actually exposes and identifies the selected input;
95:    - unavailable device enumeration is shown honestly rather than populated with invented devices.
96: 3. **Input-level indicator**
97:    - gives live feedback from the selected input when permission allows;
98:    - no numeric or visual level threshold is a mandatory completion gate.
99: 4. **Optional test controls**
100:    - `Record test` begins a microphone test only after explicit activation;
101:    - `Stop` ends that test and `Listen` auditions the completed test;
102:    - recording or listening to a test is optional and never creates a candidate, accepted take, credit charge or whole-section reprocessing lock.
103: 5. **Continue and recovery**
104:    - `Continue to dubbing` is available once microphone access and a usable input are ready, without requiring a completed or listened-to test;
105:    - permission denial and unavailable/busy/lost input expose recovery actions and do not pretend readiness;
106:    - microphone-test audio is temporary browser-local data, is deleted when the user leaves this screen, is never uploaded or account-persisted, and is never recoverable as a project candidate; every later visit starts without the previous test recording;
107:    - device-local first-entry bookkeeping is distinct from microphone-test audio and from account-owned dialogue drafts.
108: 
109: ### 4.2 Record turn screen
110: 
111: The Record screen contains the following semantic regions in reading order. Below 768 CSS pixels it uses the approved single-column phone layout; at 768 CSS pixels and above it uses the regular navigation/layout. Working content is capped at 1200px. Desktop controls sit directly below the waveform in normal document flow, scroll with the page, and are neither sticky nor fixed; they must be fully scroll-reachable and keyboard reachable without hidden overflow. Phone pinning remains distinct and settled below.
112: 
113: 1. **Shared project shell**
114:    - compact global navigation;
115:    - project identity and Record / Result workspace context;
116:    - authoritative save status;
117:    - no permanent sidebar;
118:    - on signed-in phone screens, logo at left and credit balance plus menu button at right; the menu contains New dub, My projects, Credits, Account, language selection and Sign out.
119: 2. **Turn context**
120:    - current turn position (`Turn 3 of 12`) and separate accepted progress (`Recorded 2 of 12`), plus enough speaker identity to distinguish the target;
```

## 10-result.md

```text
65: ## 3. Experience principle and visual hierarchy
66: 
67: The screen's first question is: **Is my dub ready, and what can I do with it?**
68: 
69: When a current finished generation exists, the full video answers that question and is the largest element. During the first assembly, truthful job status occupies the same principal region so the layout does not jump from an unrelated dashboard to a player. During replacement assembly, show authoritative progress for the new render first and place the playable prior finished result below it, labeled `Previous version` / `Предыдущая версия`. A validated latest-authorized replacement becomes authoritative atomically, independently of the player's presented generation: if the previous result is playing, preserve that playback and show `New version ready` / `Watch new`; otherwise replace the displayed asset without autoplay. Download always follows the displayed identity.
70: 
71: The visual direction follows the shared light rehearsal room:
72: 
73: - compact top navigation and project header, with Record / Result context and authoritative save/job status;
74: - Mabry Pro Regular and Medium only, with no Bold or synthetic Bold: Regular 16px/24px body and dialogue text, Regular 14px/20px supporting captions, role-specific Mabry Pro Medium desktop labels from design-tokens.md, Medium 14px/20px field labels, and a Medium 32px/40px desktop / 24px/32px phone page heading;
75: - Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed.
76: - component-specific source geometry; desktop action roles in design-tokens.md and 48px phone targets;
77: - 8px between closely related elements, 16px between fields/buttons, 24px between blocks within the screen and 32px between major sections; 24px desktop/16px phone padding only for already-required panels;
78: - 32px desktop / 16px phone horizontal gutters, a 1200px maximum working-content width, one column below 768 CSS px and regular top navigation/layout from 768 CSS px;
79: - panel padding remains distinct from page gutters and introduces no new wrapper panel/card; no permanent sidebar, hero marketing treatment, KPI row, decorative card grid, gradient, glow, decorative shadow, all-caps styling or automatic wrapper card around every block;
80: Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged. 
81: - flat action controls, quiet grouping and one filled primary action at most in a state; the red destructive role is reserved for recording/destructive semantics and is not general Result decoration;
82: - progress uses text and state semantics, never animation or color alone;
83: - pending/loading presentation keeps the approved page, surface and text roles plus an accessible status; it never fabricates progress or uses a decorative loop;
84: - Mabry Pro asset availability, browser loading/fallback, browser/forced-colors behavior, rendered conformance and Result-specific progress/action geometry not implied by the common spacing roles remain unverified or open as named in §17; weights, line heights, the shared spacing scale and semantic component-state/focus treatments are resolved.
85: 
86: Conceptual composition, with no implied measurements:
87: 
88: ```text
89: Desktop
90: ┌ compact global navigation ─────────────────────────────────────────┐
91: │ project identity · Record / Result · authoritative state           │
92: ├─────────────────────────────────────────────────────────────────────┤
93: │                                                                     │
94: │      truthful assembly progress or black finished-result stage      │
95: │                                                                     │
96: ├─────────────────────────────────────────────────────────────────────┤
97: │ previous-version player below progress, when one exists             │
98: │ play/pause · seek · time · volume · fullscreen                      │
99: │ Download MP4 · Return to recording                                  │
100: └─────────────────────────────────────────────────────────────────────┘
101: 
102: Phone
```

```text
119: ## 4. Screen anatomy
120: 
121: The Result screen contains these semantic regions in reading order.
122: 
123: 1. **Shared project shell**
124:    - compact global navigation: New dub, My projects, credits balance and account;
125:    - project identity and Record / Result workspace context;
126:    - authoritative project save/result state;
127:    - no permanent sidebar.
128: 2. **Result heading and generation status**
129:    - identifies the Result workspace without an oversized landing-page title;
130:    - distinguishes `assembling`, `validating`, `ready`, `failed`, `outdated` and `recordings incomplete` in plain language;
131:    - identifies a previous finished result as previous when current work has not produced a replacement;
132:    - does not expose internal worker/provider vocabulary.
133: 3. **Assembly progress**
134:    - reflects the authoritative Result assembly operation, separate from Flow 07 preparation progress and current-stage presentation;
135:    - before the service supplies a trustworthy percentage, shows `Assembling video…` / `Собираем видео…`, with no progress bar, numeric value or estimated remaining time;
136:    - when the service supplies a trustworthy percentage, shows one progress bar and that numeric percentage; it never derives progress from elapsed client time;
137:    - does not reuse Flow 07 preparation stages as Result assembly stages; any additional Result-specific stage label remains **OPEN-10-05**;
138:    - reconnecting or refreshing preserves the same operation identity rather than starting duplicate work.
139: 4. **Principal stage**
140:    - black media stage preserving the output's orientation without cropping it to a decorative ratio;
141:    - shows the latest valid finished generation, except that active previous-version playback is preserved when a newer authoritative generation becomes ready;
142:    - during replacement assembly, sits below the new render's progress and labels the playable prior result `Previous version` / `Предыдущая версия`;
143:    - after successful replacement, active previous playback keeps that label and offers `New version ready` / `Watch new`; paused or inactive presentation switches to the new asset without autoplay;
144:    - otherwise keeps the stage footprint while showing assembly, validation, empty or recovery information;
145:    - never substitutes the source upload, a sample clip or a partial render for the finished result.
146: 5. **Playback controls**
147:    - expose native or equivalent accessible play/pause, seeking, time, volume and fullscreen for the full selected-section output;
148:    - operate only on a validated finished asset;
149:    - expose no source/take or audio-track selector, subtitle controls, export settings or editing controls;
150:    - preserve full selected-section duration, including pauses and scenes outside turns.
151: 6. **Output facts**
152:    - may show only authoritative facts useful to the owner, such as duration and current/previous status;
153:    - must not claim 720p when the preserved source is lower resolution, imply upscaling, or describe a sample fixture as the user's render;
154:    - exact metadata shown is **OPEN-10-05**.
155: 7. **Actions**
156:    - beneath the finished player, `Download MP4` requests the exact displayed finished generation and `Return to recording` follows the established first-turn handoff;
```

## 11-projects.md

```text
143: ## 4. Experience direction and screen anatomy
144: 
145: ### 4.1 Design intent
146: 
147: My projects is a worked-in list screen for casual creators returning to a scene. Its product-specific material is the scene thumbnail and honest saved progress. The strongest visual rhythm is therefore a sequence of compact project rows, not a dashboard of metrics, a marketing hero, or a grid of decorative cards.
148: 
149: The approved [design-token system](design-tokens.md) is normative for the light treatment. Use its semantic roles for page/surface/text/divider rather than selecting raw shades in this flow. Essential input/control boundaries use `border.control`, never `divider.decorative`; primary and destructive controls use their approved default/hover/pressed families and foregrounds; links, errors, selected rows/controls and disabled states use `link`, `error`, `selected.*` and `disabled.*`; apply source opacity only for genuinely disabled controls, with readable reasons and no dimming of focusable busy controls. Light UI uses the approved `focus.light` 2 px ring with 2px gap matching the opaque surrounding ground; any media control uses `focus.media` only on an opaque `media` backing. Hover, selected, invalid and disabled states never erase focus. Use Mabry Pro Regular and Medium only, with no Bold or synthetic Bold: body/dialog text is Regular 16 px/24 px, supporting captions are Regular 14 px/20 px, and buttons use Mabry Pro Medium 14px/20px for task, secondary and navigation actions and Medium 16px/24px for prominent/landing actions; phone buttons use Mabry Pro Medium 16px/24px with retained 48px targets, field labels use Medium 14 px/20 px, and page headings use Medium 32 px/40 px on desktop and 24 px/32 px on phone. Buttons and single-line inputs use component-specific source geometry and the exact mapped source desktop geometry and retained 48px phone targets. Horizontal page gutters are 32 px at 768 px or more and 16 px below it; working content is at most 1200 px wide. Shared spacing is 8 px between closely related items, 16 px between fields/buttons, 24 px within an existing screen block, and 32 px between major sections. Existing panels use 24 px padding at 768 CSS px and above and 16 px below 768 px; these values do not create a new panel or card wrapper. The shared 400 px maximum applies to sign-in/registration forms, not to this list or its inline title field. Use source component rounding. Mapped source component shadows are permitted; gradients and card wrappers around every block are prohibited. There is no permanent sidebar. Font assets/loading/fallback/rendered proof, rendered row-density conformance, rendered dialog conformance, final copy and rendered focus/accessibility evidence remain gaps; common token/state/focus direction is resolved.
150: 
151: The list should feel like a work queue without turning projects into operational tickets: the thumbnail identifies the scene, the title identifies the project, progress explains saved state, and Continue provides the one frequent action. Capacity is a truthful limit line, not a KPI tile.
152: 
153: ### 4.2 Persistent top navigation
154: 
155: Use the shared compact navigation containing:
156: 
157: - product identity;
158: - New dub;
159: - My projects as the current destination;
160: - authoritative **available** spendable credit balance after active reservations, or its loading/error state; and
161: - account and locale access.
162: 
163: The navigation does not duplicate project capacity or fold reserved credits into the main balance. Capacity belongs in the page content where a full-account action can be explained; Flow 12 shows any reserved amount separately as **In processing**.
164: 
165: ### 4.3 Page header and capacity region
166: 
167: Required anatomy:
168: 
169: - one Mabry Pro Medium noun title at 32 px/40 px desktop and 24 px/32 px phone: **My projects** / **Мои проекты**;
170: - one concise capacity statement using authoritative used and maximum values;
171: - a true-ratio usage indicator when a visual indicator is used, with the same values available as text;
172: - one New dub action when the action is valid; and
173: - a capacity-full explanation that points to deliberate project deletion rather than implying automatic cleanup.
174: 
175: The capacity region is one quiet light-gray-divided line or flat strip on the white ground, not a row of metric cards. It must distinguish:
176: 
177: - available capacity;
178: - full capacity;
179: - capacity loading;
180: - capacity unavailable; and
```

## 12-credits.md

```text
140: ## 4. Experience direction and component anatomy
141: 
142: ### 4.1 Design intent
143: 
144: Credits is a working app screen, not a marketing/pricing page. It uses the confirmed light rehearsal-room direction: white and light-gray surfaces, readable dark text, flat fills, no gradients, no decorative effects, no dark or saturated sidebar, and no persistent sidebar at all. The compact top navigation remains the application shell.
145: 
146: The balance is the largest figure because it answers the screen's first question. Packs and history are supporting working regions. The screen avoids a landing-page hero, oversized money typography, promotional ribbons, invented discount badges, icon-topped cards, sparklines, ornamental charts, and vanity figures.
147: 
148: The shared presentation contract is normative here. [design-tokens.md](design-tokens.md) is authoritative for primitive, semantic and component-state roles; this flow uses semantic names rather than choosing raw shades locally:
149: 
150: | Role | Required value |
151: |---|---|
152: | Typeface | Mabry Pro Regular and Medium only; no Bold or synthetic Bold |
153: | Body / row text | Regular 16px / 24px line height |
154: | Supporting captions | Regular 14px / 20px line height |
155: | Buttons / field labels | Desktop task: 40px / Medium14px/20px; prominent/landing: 44px / Medium16px/24px; secondary: 32px / Medium14px/20px; navigation: 36px / Medium14px/20px; medium segmented: 40px /14px/20px desktop and48px /16px/24px phone. Phone buttons use Medium16px/24px with 48px minimum targets; field labels use Medium14px/20px. |
156: | Page heading | Medium 32px / 40px desktop; 24px / 32px phone |
157: | Page / existing secondary surface | `page` / `surface` |
158: | Decorative divider / essential control boundary | `divider.decorative` / `border.control`; never interchange them |
159: | Primary / secondary text | `text.primary` / `text.secondary` |
160: | Primary action states | `action.primary.default/hover/pressed` with `action.primary.foreground` |
161: | Recording / destructive states | `action.destructive.default/hover/pressed` with `action.destructive.foreground`; only for those meanings, not purchase promotion |
162: | Links / errors / selection / disabled | `link`; `error`; `selected.background/foreground`; `disabled.background/foreground`; apply source opacity only for genuinely disabled controls, with readable reasons and no dimming of focusable busy controls |
163: | Focus | `focus.light` 2px ring with 2px gap matching the opaque surrounding ground; `focus.media` only on an opaque `media` backing |
164: | Button / single-line input radius | Source buttons6px; derived ordinary fields6px; component-specific OTP/segmented/menu geometry follows design-tokens.md |
165: | Button / single-line input height | Desktop action roles: task40px, prominent/landing44px, secondary32px, navigation36px; phone targets at least48px. Single-line inputs use separate derived field geometry. |
166: | Horizontal page gutters | 32px desktop; 16px phone |
167: | Shared spacing | 8px related items; 16px fields/buttons; 24px within a screen block; 32px between major sections |
168: | Existing-panel padding | 24px desktop; 16px phone below 768 CSS px; creates no new panel/card wrapper |
169: | Responsive boundary | below 768 CSS px phone; 768 CSS px and above desktop navigation/layout |
170: | Working-content maximum width | 1200px |
171: 
172: Use a plain aligned history table at desktop with sentence-case headers, decorative row dividers, and right-aligned tabular credit and balance figures. Essential controls retain `border.control`; dividers do not substitute for them. Do not use zebra rows, a colored header band, all-caps tracking, unmapped decorative shadows, or a wrapper card around every block. Pack geometry, history rendered row-density conformance, Mabry Pro asset availability/browser loading/fallback/rendered proof, and non-motion screen-specific interaction details remain open; the approved token states, focus, typography, spacing and motion do not.
173: 
174: ### 4.2 Persistent top navigation
175: 
176: Use the shared compact top navigation with:
177: 
```

## 15-account.md

```text
50: ## 4. Screen anatomy and visual contract
51: ### 4.1 Shared shell
52: Use the confirmed compact top navigation with product identity, New dub, My projects, credits balance/entry, and Account.
53: Account is the active destination. There is no permanent sidebar.
54: At widths below 768 CSS px, use the signed-in phone header: logo on the left and balance plus menu on the right; the menu contains New dub, My projects, Credits, Account, language, and Sign out. At 768 CSS px and above, use the regular desktop top navigation.
55: The account snapshot and the top-navigation balance must use the same authoritative account revision; the Account page does not invent a second balance.
56: ### 4.2 Content order
57: 
58: 1. `Account` noun title and one short scope sentence.
59: 2. Language.
60: 3. Sign-in methods.
61: 4. Session action: Sign out.
62: 5. Destructive action: Delete account, last and visually separate.
63: The destructive section cannot appear before the account-access controls in visual, DOM, focus, or screen-reader order.
64: ### 4.3 Settings rows
65: On wide screens, each area uses a label/description column beside one flat working panel.
66: On narrow screens, the label stacks above its panel.
67: Existing panels use the mapped source 10px white/tone-step treatment and exact restrained shadow where that source component calls for it. QA62-06 allows one bounded derivative content card in Account settings; it does not add per-block card wrappers.
68: The approved [design-token system](design-tokens.md) is normative. Use `page`, `surface`, `text.primary`, `text.secondary` and `divider.decorative` by meaning rather than choosing raw shades in this flow. Essential field/control boundaries use `border.control`, never the decorative divider. Primary and destructive controls use their approved default/hover/pressed families and foregrounds; links, errors, selections and disabled states use `link`, `error`, `selected.*` and `disabled.*`; apply source opacity only for genuinely disabled controls, with readable reasons and no dimming of focusable busy controls. Light UI uses `focus.light` with its 2 px ring and 2px gap matching the opaque surrounding ground; any media control uses `focus.media` only on opaque `media` backing. Hover, selected, invalid and disabled states never erase focus. Use Mabry Pro Regular and Medium only, with no Bold or synthetic Bold: body/dialog text is Regular 16 px/24 px, supporting captions are Regular 14 px/20 px, and buttons use Mabry Pro Medium 14px/20px for task, secondary and navigation actions and Medium 16px/24px for prominent/landing actions; phone buttons use Mabry Pro Medium 16px/24px with retained 48px targets, field labels use Medium 14 px/20 px, and page headings use Medium 32 px/40 px desktop and 24 px/32 px phone.
69: Use component-specific source geometry for buttons and single-line inputs. Controls are sized to the mapped source component on desktop and 48 px high on phone. The content uses 32 px desktop gutters, 16 px phone gutters, one column below 768 CSS px, and a working maximum width of 1200 px.
70: Use 8 px between closely related items, 16 px between fields/buttons, 24 px within an existing screen block, and 32 px between major sections. Existing panels retain the shared 24 px desktop / 16 px phone padding unless a bounded screen-specific exception is stated below.
71: 
72: QA62-06 Account settings density exception: `.account-screen` uses 16px 0 64px body padding on desktop and 32px 0 56px on phone; shared App main-area sizing and gutters stay unchanged. Desktop sections use 8px vertical padding with a 24px gap; the single derivative content card uses 10px vertical / 16px horizontal padding and a 10px gap. Phone sections use 22px vertical padding with a 16px gap, and cards use 16px padding. The shared 24px desktop / 16px phone panel padding remains the default elsewhere. The owner authorized correction of poor small sizing; the exact density values were selected by the Orchestrator under delegation and were not separately human pixel-approved. This bounded source-gap exception retains Clean/Light, Mabry Pro, mapped radii and control geometry, and 48px phone targets; it establishes no new universal panel default.
73: Use flat surfaces with only mapped source component shadows. Gradients, glass, glow, decorative illustration, vanity metrics, charts, icon-topped cards, decorative type, all-caps headings and wrapper cards around every block are prohibited.
74: Font-asset availability, browser loading, fallback, rendered proof, forced-colors behavior and screen-specific interaction evidence remain implementation-validation gaps rather than permission to substitute other values above. The approved component states/focus, Regular/Medium weights, line heights, common spacing and motion are resolved.
75: ### 4.4 Product-specific substance
76: The screen shows the real current locale, method-specific verified identifier where required by its row, and the real association state of Google and email/password. Method labels do not invent a primary email or profile identity.
77: It does not show sample identities, fabricated account age, security scores, or invented usage figures.
78: 
79: ## 5. Language control
80: The Language area contains one mutually exclusive English / Russian control with an accessible group name.
81: Selecting a language updates navigation, headings, actions, dialog content, status, loading text, and errors as one locale; mixed-language states are invalid.
82: The control must not change audio-language detection or project media.
83: An explicit manual pre-sign-in language choice wins over a different saved account preference after authentication and updates the account preference. A browser-derived default never overwrites a saved account preference. On first use with neither an explicit choice nor a saved preference, select Russian for browser locale `ru` and English otherwise.
84: Changing Language on Account is an explicit account-preference update. While it is pending, expose a truthful saving state. On failure, preserve or restore the last authoritative locale, keep the rest of Account intact, and offer Retry.
85: 
86: ## 6. Sign-in methods
87: ### 6.1 Method rows
```
