# Flow 01: Landing and Start dubbing entry

Status: synchronized specification draft; not approved  
Date: 2026-10-26 (Asia/Qyzylorda)  
Mode: specification only; no implementation, mockup, browser run, or delivery evidence is authorized or claimed  
Authority: [shared frontend contract](00-shared-contract.md), then the latest owner answers; retained [SPEC-001](../specifications/SPEC-001_dubbed_mvp.md) and [BR-001](../business-requirements/BR-001_custom_video_dubbing.md) apply only where the shared contract has not replaced them

The current owner correction withdraws the sparse-content quota and media/navigation bans. This specification defines purpose and truthful content requirements; header, copy, assets and page composition await the design-first prototype checkpoints. Public-link result sharing remains excluded.

## 1. Purpose and boundary

The public landing page must explain what Dubbed does, make the intended result/value understandable, explain the visitor’s role and effort, interest a casual visitor, and give a clear next step. It includes the truthful eligible one-time 120 free welcome-credit offer and **Start dubbing**.

This flow ends before authentication or file selection:

- a signed-out visitor who chooses **Start dubbing** enters Flow 03 registration;
- an authenticated user who chooses **Start dubbing** enters Flow 06, **New dub**;
- no upload control, browser file picker, project creation, processing job, credit reservation, purchase, recording, or result operation occurs on the landing page.

The page is bilingual in English and Russian and usable on desktop and phone. Useful explanation, explanatory navigation and truthful demonstration/proof may be proposed. No fixed section count, three-card template, or tiny content quota is required.

## 2. Design argument

The page must let a visitor understand the product without coaching. Explain the scene-to-own-performance-to-finished-video journey, the user’s recording effort, the intended output and why it is useful. The 120-credit offer supports that explanation rather than substituting for it.

Truthful demonstration/proof is a design option, not an approved asset or layout. A genuine product-rendered example needs provenance and permission; a synthetic fixture, concept illustration, source clip or mock playback must be identified for what it is and cannot be represented as a custom result assembled from accepted takes. Do not invent testimonials, customers, usage metrics, prices, performance guarantees, AI voice cloning or unsupported capability claims. Preserve the existing download-only, no-translation and own-voice product scope.

Keep **Start dubbing**, locale access, **Sign in** and the public support link to `dystrophyless@gmail.com` discoverable. Guest Start dubbing enters registration; authenticated Start dubbing enters New dub. An explanatory anchor or repeated contextual CTA may be considered in a prototype; neither an extra navigation ban nor a mandated marketing template applies.

Use the owner-selected Affect UI Clean/Light component identity, Mabry Pro and [current tokens](design-tokens.md). Component samples do not select page hierarchy or cap landing explanation. Current heading roles are the baseline, not proof that a 32px application heading is a validated hero. If prototype exploration needs a new type role or token, record that source gap for review rather than silently changing tokens. Final content, media behavior, type hierarchy and responsive geometry remain unapproved until the [design-first checkpoints](../frontend-design-workflow.md).

## 3. Entry, exit, and state ownership

### Entry

- Direct visit to the public landing entry point.
- Brand/home navigation from another area.
- Return from registration or sign-in cancellation when the owning flow supports it.
- Return after ordinary Sign out has completed: Flow 15 has already resolved any unaccepted-recording candidate exit guard, released recording ownership, and terminated only the current session; other-device sessions remain active.
- Return after authoritative account-deletion success: Flow 15 has terminated every session for the deleted account and supplies the validated deleted-account outcome for localized confirmation.
- Authenticated visit is allowed; the page does not force a redirect away.

### Exit

| User state and action | Required destination |
|---|---|
| Signed-out visitor chooses **Start dubbing** | Flow 03 registration. |
| Authenticated user chooses **Start dubbing** | Flow 06 New dub. |
| Signed-out visitor chooses **Sign in** | Flow 02 sign-in; Flow 02 owns the default post-sign-in destination. |

The landing page owns no project, recording, result, credit ledger, or payment state. It may read public configuration, localized content, and the current authentication state through shared service boundaries.

Ordinary sign-out and deletion must arrive as authoritative signed-out states. Landing does not run the candidate-exit guard, release recording ownership, terminate sessions, delete the account, or infer either success from a route/query value.

## 4. Page anatomy and copy

### 4.1 Public header

Required signed-out header capabilities, with final grouping pending prototype validation:

- Dubbed logo/home action;
- **RU / EN** language switch;
- **Sign in**.

Explanatory navigation or a contextual Start dubbing action may be proposed when it helps visitors understand and enter the product. Do not invent commercial terms. An authenticated visitor uses the shared authenticated navigation contract rather than a header that pretends the user is anonymous.

### 4.2 Main content

Working English entry copy, not a complete page content inventory or approved final copy:

- Title: **Dub your own scene**
- Supporting line: **Upload a video, choose up to two minutes, and record every character in your own voice.**
- Primary action: **Start dubbing**
- Offer line: **Get 120 free welcome credits once with an eligible verified account.**

Working Russian entry copy, not a complete page content inventory or approved final copy:

- Title: **Озвучьте свою сцену**
- Supporting line: **Загрузите видео, выберите фрагмент до двух минут и озвучьте всех персонажей своим голосом.**
- Primary action: **Начать озвучку**
- Offer line: **Получите 120 бесплатных приветственных кредитов один раз для подходящего подтверждённого аккаунта.**

Copy remains proposed pending bilingual editorial review. It must not imply that every account is eligible, that the welcome grant repeats or expires, that a cash price has been chosen, or that arbitrary content is permitted. The signed-out **Start dubbing** action leads to Flow 03 registration; it does not open upload directly.

### 4.3 Signed-out return status

- After ordinary Sign out succeeds, show the ordinary signed-out landing. Do not show the account-deletion confirmation; sessions on other devices remain outside this page and stay active.
- After authoritative account-deletion success, show **Account deleted** / **Аккаунт удалён** as localized status within the ordinary landing. Do not open a standalone deleted-account page, automatically sign in, or automatically recreate an account.
- Failure, timeout, pending, or unknown deletion never shows the deletion-success status. The owning flow reconciles those outcomes before navigation.
- Keep the ordinary public page and its next step available around the contextual return status. Landing itself performs no session/account mutation; the status never implies unconfirmed success.

## 5. Main and alternate transitions

### Main guest transition

1. The visitor receives the product explanation, welcome-credit information, and **Start dubbing** action without an account gate or full-page loader.
2. The visitor chooses **Start dubbing**.
3. The client resolves the current session through the shared authentication boundary.
4. For an anonymous session, navigation enters Flow 03 registration.
5. Flow 03 owns registration, verification, cancellation, and its successful post-registration destination.

### Authenticated transition

1. The authenticated visitor chooses **Start dubbing**.
2. Navigation enters Flow 06 New dub directly.
3. The landing page does not upload a previously selected file or create a project implicitly.

### Alternate transitions

- On first use without a saved preference, browser language `ru` selects Russian; every other browser language selects English.
- The **RU / EN** switch updates all landing copy and accessible names as one coherent locale state.
- An explicit manual language choice made before sign-in remains active afterward and updates a different saved account preference.
- A browser-derived first-use default is not an explicit choice: after sign-in it defers to an existing saved account preference and does not overwrite it.
- Browser Back after registration or sign-in cancellation may return to the landing page without changing the current complete locale.
- An expired or changed session is resolved by the shared auth guard at action time; cached UI state alone must not bypass sign-in.
- Ordinary sign-out navigation is accepted only after Flow 15's candidate-exit/recording-ownership prerequisites and current-session termination succeed.
- Account-deletion navigation is accepted only after the account is authoritatively disabled and all of its sessions are terminated; then render the localized deletion status without attempting sign-in or recreation.

## 6. Loading and error behavior

### Initial/session state

- Primary content renders without waiting behind an indefinite session check.
- While session state is unresolved, **Start dubbing** remains one action; activation waits for the authoritative result and does not guess a destination.
- If session resolution fails, stay on the landing page, announce a concise error, and offer Retry. Do not open upload or claim the user is signed out.
- Never derive **Account deleted** from anonymous session state alone. Show it only from a validated authoritative deletion-success outcome; pending/failed/unknown deletion remains with its owning flow and is not rewritten as success here.

Proposed error copy:

- EN: **We couldn't check your session. Try again.**
- RU: **Не удалось проверить сеанс. Попробуйте ещё раз.**

### Public configuration and content failure

- The page must not replace unavailable or inconsistent configured facts with invented values.
- The product explanation and **Start dubbing** path remain available when non-routing public content fails.
- Any degraded offer/content state must identify what could not be loaded and offer a retry where the shared service supports one; final localized wording remains part of OPEN-06.

### Localization failure

- Never show mixed-language fragments as a successful locale switch.
- Preserve the last complete locale that loaded and announce the failure.
- The browser-language default, explicit manual switch, and signed-in account preference reconcile by the confirmed precedence above; no locale-precedence choice remains open.

## 7. Desktop, phone, keyboard, and accessibility

- The same description, credit fact, signed-out header controls, and primary action are available on desktop and phone.
- DOM order follows reading and keyboard order; visual rearrangement must not change meaning.
- All actions use native semantic controls with visible focus and descriptive accessible names.
- No required interaction depends on hover, precise pointer movement, or motion.Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged. 
- Language changes update the document language and the control's current-state announcement.
- Reduced-motion disables interface transitions while preserving content and functionality. It does not disable video playback or synchronized audio-playhead function in flows that own media.
- Mabry Pro uses only Regular and Medium, never Bold: body text is Regular 16px/24px, supporting captions are Regular 14px/20px, buttons use Mabry Pro Medium 14px/20px for task, secondary and navigation actions and Medium 16px/24px for prominent/landing actions; phone buttons use Mabry Pro Medium 16px/24px with retained 48px targets, field labels are Medium 14px/20px, and page headings are Medium 32px/40px desktop / 24px/32px phone.
- Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed.
- Below 768 CSS px, use one column, 16px horizontal gutters, current heading baseline and 48px standard controls; keep logo, **RU / EN**, **Sign in**, description, offer, and primary action in a clear sequence without clipping or horizontal overflow.
- At and above 768 CSS px, use the regular desktop layout, 32px horizontal gutters, current heading baseline and approved desktop action roles in design-tokens.md.
- Working content is capped at 1200px. The separate 400px maximum applies to sign-in/registration forms in their owning flows, not to the landing main-content column.
- Buttons and single-line inputs use component-specific source geometry and desktop action heights of 40px task, 44px prominent/landing, 32px secondary and 36px navigation, with 48px phone targets.
- Use 8px between closely related elements, 16px between fields/buttons, 24px between within-screen blocks, and 32px between major sections. Existing panel padding is 24px on desktop and 16px below 768px; page gutters remain the separate 32px/16px values, and this rule adds no panel or card wrapper.
- Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed.
- The phone composition keeps the logo, language switch, **Sign in**, description, offer, and primary action in a clear reading sequence without clipping or horizontal overflow.
- Use flat surfaces and source component rounding at every supported width. Mapped source component shadows are permitted; gradients and repeated card wrappers are prohibited.

Mabry Pro asset availability/loading and fallback behavior, flow-specific geometry not implied by the shared rhythm, and browser/rendered proof remain unverified. Regular/Medium weights, approved line heights, semantic component states/focus, common spacing scale, motion direction, breakpoint, maximum widths, gutters, radius, and control heights above are settled.

## 8. Logical service contracts

All access goes through the shared centralized services boundary. Names below describe responsibilities, not finalized TypeScript or API names.

| Boundary | Input | Success result | Relevant failures |
|---|---|---|---|
| Authentication session | Current browser/session context | Anonymous or authenticated account summary sufficient for header and routing | Pending, unavailable, expired/changed session |
| Signed-out return status | Validated navigation outcome from Flow 15 (`ordinary-sign-out` or authoritative `account-deleted`) plus effective locale | Ordinary signed-out landing with no deletion claim, or ordinary signed-out landing with **Account deleted** / **Аккаунт удалён** | Missing/invalid/failed/pending/unknown outcome produces no deletion-success claim and requires owning-flow reconciliation |
| Public product configuration | Requested locale/version | Confirmed welcome-credit amount and eligibility wording | Unavailable or inconsistent configuration |
| Landing content/localization | Browser language; anonymous locale plus explicit-choice/browser-default provenance; optional saved account locale after authentication | One complete EN or RU copy set and accessible labels; explicit pre-sign-in choice remains effective and requests account-preference update; browser-derived default defers to and does not overwrite a saved preference | Missing key, incomplete locale, failed switch, account-preference update unavailable |
| Navigation intent | Auth state plus `start-dubbing` or `sign-in` intent | Flow 03 registration, Flow 06 New dub, or Flow 02 sign-in as applicable | Invalid/expired intent, unavailable destination |

The landing page reads only the boundaries listed above and invokes navigation intent only after a user action; it performs no workflow mutation.

## 9. Mock truth and production dependencies

An interchangeable mock may provide:

- deterministic anonymous, authenticated, pending-session, and session-error states;
- ordinary current-session sign-out return and authoritative account-deleted return, including absence of the deletion message for failure/pending/unknown outcomes;
- the confirmed public configuration;
- complete EN/RU content, browser-language defaulting, explicit-versus-automatic anonymous locale provenance, saved-account preference reconciliation, and explicit content/configuration failure states;
- deterministic valid and invalid navigation-intent results.

Mock behavior proves only the frontend state handling exercised against that facade. It does not prove candidate-exit handling, recording-ownership release, current-session-only sign-out, all-session account-deletion revocation, real account deletion, real sign-in, persisted account-language updates, account eligibility, welcome-credit grant, production localization, or New dub availability.

Production readiness depends on:

- Flow 02 sign-in entry;
- Flow 03 registration entry;
- Flow 06 authenticated New dub entry;
- shared authentication/session, product-configuration, localization, and navigation behavior;
- licensed/available Mabry Pro assets or an approved fallback contract;
- browser/rendered verification of the approved semantic component states/focus plus any flow-specific geometry not implied by the common spacing roles; the approved states/focus, typography weights/line heights, spacing scale, motion direction, breakpoint, and maximum widths do not remain dependencies to choose.

Former deleted frontend assets, fixtures, screenshots, and historical test results are not evidence for this flow.

## 10. Acceptance criteria

| ID | Acceptance criterion | Status |
|---|---|---|
| F01-AC01 | In EN and RU, a visitor can understand the product, truthful intended result/value, own recording role/effort, and next step; the eligible one-time 120 free welcome-credit offer is accurate. | Required purpose; final copy/content and comprehension evidence pending prototype validation. |
| F01-AC02 | Logo/home, RU / EN and Sign in remain discoverable; final header grouping and useful explanatory navigation are validated in the prototype rather than restricted to a closed inventory. | Capabilities retained; composition pending. |
| F01-AC03 | A signed-out visitor choosing **Start dubbing** enters Flow 03 registration before any upload. | Confirmed. |
| F01-AC04 | **Sign in** enters Flow 02, while an authenticated user choosing **Start dubbing** enters Flow 06 New dub. | Confirmed. |
| F01-AC05 | Useful explanatory content or truthful demonstration is not rejected by a sparse-content/media ban. Any proof asset has permission/provenance and an accurate representation label; fixtures are never claimed as genuine user-rendered results. No invented testimonials, metrics, prices or unsupported capabilities appear. | Truth requirements confirmed; exact assets and presentation pending. |
| F01-AC06 | No landing interaction creates a project, selects a local file, reserves or spends credits, buys a pack, records media, or generates/downloads a result. | Confirmed. |
| F01-AC07 | First use without a preference selects RU for browser language `ru` and EN otherwise. An explicit pre-sign-in RU/EN choice remains effective after authentication and updates a different saved account preference; a browser-derived default defers to and does not overwrite that saved preference. | Confirmed; account-persistence evidence pending. |
| F01-AC08 | Anonymous, authenticated, pending, expired, and failed session states do not bypass the selected registration/sign-in destinations or strand the visitor behind a full-page loader. | Confirmed behavior; requires integration evidence. |
| F01-AC09 | Desktop and phone preserve the approved content, header controls, action priority, logical order, keyboard access, and readable focus/error states. | Confirmed behavior; visual evidence pending. |
| F01-AC10 | Retain Mabry Pro Regular/Medium and current component/token roles with accessible text/targets. Current application heading sizes are a baseline, not an approved hero hierarchy; any proposed new type role requires explicit design/token review. | Existing visual identity retained; final hierarchy, font/fallback and rendered evidence pending. |
| F01-AC11 | Rendered colors use the approved shared role values and flat surfaces. Mapped source component shadows are permitted; gradients and card wrappers around each block are prohibited. | Confirmed contract; rendered evidence pending. |
| F01-AC12 | Retain shared gutters, responsive shell, working-width baseline and accessible phone targets without horizontal overflow; validate complete landing content/asset hierarchy on desktop, phone and short screens. | Component baseline retained; composition remains pending prototype approval. |
| F01-AC13 | The shared 400px maximum remains specific to the Flow 02/03 authentication forms reached from landing and is not misapplied as a new landing main-content constraint. | Confirmed cross-flow geometry boundary. |
| F01-AC14 | After ordinary Sign out has resolved any candidate-exit guard, released recording ownership, and authoritatively terminated the current session, the user reaches the ordinary signed-out landing; the landing performs none of those mutations, shows no deletion claim, and other-device sessions remain active. | Confirmed cross-flow behavior; real session/recording evidence pending. |
| F01-AC15 | After authoritative account deletion has terminated every account session, the ordinary signed-out landing shows **Account deleted** / **Аккаунт удалён**. Pending/failure/unknown never shows success; there is no standalone deleted-account page, automatic sign-in, automatic account recreation, or unconfirmed mutation by Landing. | Confirmed cross-flow behavior; real deletion/session evidence pending. |
| F01-AC16 | The landing uses the shared 8px related / 16px field-button / 24px within-screen-block / 32px major-section rhythm. Any existing panel has 24px desktop / 16px phone internal padding, distinct from the unchanged 32px/16px page gutters; no panel or card wrapper is added to satisfy spacing. | Confirmed contract; rendered evidence pending. |
| F01-AC18 | Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed. | Confirmed contract; browser/rendered evidence pending. |
| F01-AC17 | Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged. | Confirmed contract; rendered/reduced-motion evidence pending. |

## 11. Verification plan (not executed)

No product verification has been run for this document. After implementation exists, verify:

1. **Source/content review:** trace the short service description and 120-credit claim to the shared contract; bilingual editorial review confirms equivalent meaning and avoids unsupported promises.
2. **Purpose/content review:** validate product/result/value/effort comprehension and a discoverable next step in EN/RU. Review useful explanatory navigation and any proof assets against their permission/provenance/representation; do not enforce an obsolete closed content inventory.
3. **Routing/state tests:** exercise anonymous, authenticated, pending, expired, and failed session states; verify signed-out **Start dubbing** -> Flow 03, **Sign in** -> Flow 02, authenticated **Start dubbing** -> Flow 06, and absence of landing-side workflow mutations. Verify ordinary logout arrives only after current-session termination and carries no deletion status; verify deletion success arrives only after all-session revocation and carries the validated deleted-account outcome.
4. **Localization tests:** verify browser `ru` -> RU, all other browser languages -> EN, complete manual switching, explicit pre-sign-in choice overriding/updating a different saved account preference, browser-derived default deferring without overwrite, and no mixed-language success state.
5. Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed.
6. **Responsive visual review:** inspect below and at 768 CSS px plus a wide desktop; verify one column below the breakpoint, regular desktop layout at and above it, 1200px working-content maximum, truthful product/result/value/effort explanation, discoverable entry, logical reading order, action priority, flat component treatment, no per-block card wrappers/gradients/unmapped decorative shadows, and no clipping or overflow. Confirm the 400px auth-form maximum is exercised only in the destination Flow 02/03 form, not imposed on the landing main content. Specification prose is not a screenshot pass.
7. **Accessibility and motion review:** complete keyboard-only, focus-order, screen-reader-name/state, language-switch, contrast, zoom, touch-target, reduced-motion, and error-announcement checks on the supported browser/device evidence set.Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged. 
8. **Dependency review:** confirm licensed/available Mabry Pro assets or the approved fallback, shared interaction/focus states, production localization/configuration, and the three destination flows before release.
9. **Signed-out return review:** simulate ordinary logout, deletion pending/failure/unknown, and authoritative deletion success. Assert only success shows localized **Account deleted**, all states retain the ordinary public page and discoverable entry, no standalone page appears, no automatic sign-in/recreation occurs, and the mock is not reported as proof of candidate save, ownership release, session revocation, or deletion.

Record command or procedure, result, environment, date, revision/dirty-tree boundary, and evidence location. Mark unavailable production dependencies and unrun checks honestly.

## 12. Dependencies

- [Shared frontend contract](00-shared-contract.md)
- [Approved frontend design tokens](design-tokens.md)
- Flow 02: sign-in and session entry
- Flow 03: registration and email verification
- Flow 06: authenticated New dub entry
- Flow 09: unaccepted-candidate exit guard and recording-ownership release before ordinary logout may reach landing
- Flow 15: current-session-only ordinary sign-out and all-session account-deletion success with validated localized deletion status
- Shared authentication/session, localization, public product configuration, and navigation-intent services
- Mabry Pro asset availability/loading and fallback contract, browser/rendered proof, and flow-specific geometry not implied by the shared spacing roles

## 13. Open, resolved, and withdrawn decisions

### Still open

| ID | Decision | Impact |
|---|---|---|
| OPEN-06 | Approve final EN/RU service description, offer, session/configuration error, and accessible-label copy. | Editorial readiness; header content, 120-credit fact, and destinations do not reopen. |
| OPEN-07 | Specify exact route paths; verify Mabry Pro files/loading and approve fallback behavior; define any flow-specific geometry not implied by the shared spacing roles. | Implementation consistency and rendered evidence; approved semantic component states/focus, Regular/Medium weights, line heights, 8/16/24/32 spacing scale, panel padding, motion direction, colors, sizes, gutters, radius, control heights, 768 CSS px breakpoint, 1200px working-content maximum and 400px auth-form maximum do not reopen. |

These are the remaining material Flow 01 questions. They must not be filled from design-skill defaults or deleted frontend artifacts.

### Decision disposition after the 2026-10-26 correction

| Former ID | Withdrawn question | Status |
|---|---|---|
| OPEN-01 | Demonstration/proof content. | Earlier withdrawal superseded: truthful proof may be proposed; a demonstration is not mandatory, and selected content needs provenance/representation review. |
| OPEN-02 | Media position and first-screen hierarchy. | Earlier no-media restriction superseded; validate any chosen treatment in the prototype. |
| OPEN-03 | Public-header grouping/navigation. | Logo/home, locale and Sign in capabilities remain; final grouping and explanatory navigation await prototype validation. |
| OPEN-04 | Selected demonstration assets/rights/captions/hosting. | No asset is selected by this correction. If media is proposed, establish permission, provenance, representation and accessible controls before acceptance. |
| OPEN-05 | Anonymous/account language reconciliation. | **RESOLVED**: an explicit pre-sign-in choice wins and updates a different saved account preference; a browser-derived default defers and does not overwrite. |
| OPEN-08 | Public support/footer access. | Support mailto dystrophyless@gmail.com is resolved; the former additional-navigation ban is superseded, and final grouping awaits prototype validation. |

The unchanged locale/support decisions remain settled. Newly permitted content/assets and header hierarchy are prototype decisions, not questions to settle through unseen layout prose in this specification-only pass.

## 14. Payment and refund contact

Provide the ordinary support-email link at mailto:dystrophyless@gmail.com on Credits and on the signed-out landing, accessible without sign-in and after account deletion. No embedded chat, request form or ticket system. Opening the link proves neither message delivery nor refund approval.

The public contact remains discoverable within the purpose-led page. Useful truthful explanation, permitted demonstration/proof and explanatory navigation may be proposed without a content quota; their final composition and assets await prototype approval. The current design-token contract governs link/focus states.

Acceptance and verification: the link is present in this flow in English/Russian, uses `mailto:dystrophyless@gmail.com`, works by keyboard and remains accessible without an account on Landing. Verify that account deletion does not remove the public contact and that no automatic message, support ticket or refund operation is created by page load or account deletion. These are planned checks, not executed browser/mail-client evidence.

### Support destination and safety

The approved `mailto` destination is `dystrophyless@gmail.com` for the signed-out landing and Credits. This supplies the address requested above without approving refund or financial policy. Opening the link does not prove message delivery and must not send a message automatically. Verify the exact destination, keyboard access, and that account deletion leaves the public contact available; these checks are not rendered browser or email-delivery evidence.
