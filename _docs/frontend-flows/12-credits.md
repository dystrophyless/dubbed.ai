# Flow 12 — Credits, packs, purchase reconciliation, and history

Date: 2026-10-26 (Asia/Qyzylorda).
Status: synchronized specification draft; resolved owner decisions incorporated; no implementation or verification evidence.  
Mode: specifications only.

## 1. Authority and scope

This flow is governed first by [00-shared-contract.md](00-shared-contract.md), including the owner's 2026-10-22 replacements. Unchanged credit, purchase, project-capacity, quote, reservation, and accounting rules come from BR-001 and SPEC-001. Where older documents still describe a Prepare/manual-editing stage or a different zero-turn outcome, the shared contract wins: processing proceeds directly to Record, manual correction is absent, and zero detected turns show `No dialogue found` with eligible reprocessing or another-video recovery without entering Record or Result.

This document specifies the authenticated Credits experience:

- authoritative available credit balance and separately disclosed active reservations;
- one-time USD credit-pack discovery;
- purchase initiation and return/reconciliation;
- pending, success, cancellation, failure, duplicate-delivery, and reload behavior;
- credit/purchase history presentation;
- the permanent project-capacity upgrade after the first verified successful purchase; and
- returning to a durable New dub source/selection context without starting processing.

This flow does not select or implement:

- pack credit amounts, USD prices, margins, discounts, or approximate-minutes claims;
- a payment provider, payment method set, or provider-specific copy or integration mechanics; the provider-hosted same-tab checkout presentation is selected below;
- subscriptions, automatic purchases, or recurring billing;
- processing-stage cost allocation or cancellation rounding;
- database/ledger schema, webhook transport, fraud policy, tax treatment, invoices, or refunds/reversals;
- frontend code, backend code, mockups, dependencies, GitHub changes, or delivery evidence; or
- a Prepare page, manual transcript/timing/speaker editing, or background-audition stage.

Any example value used by a future mock/test is test-only fixture data. It must not appear in this document or implementation as approved commercial configuration.

## 2. Purpose, entry, and exit

### 2.1 User purpose

The screen answers two questions in this order:

1. How many credits are available now?
2. If more are needed, which currently offered one-time pack can the user purchase, and what happened to the purchase?

The primary job is to obtain enough credits for a deliberate later processing authorization. The purchase itself never authorizes or starts processing.

### 2.2 Entry conditions

The user is authenticated and enters by one of these paths:

- the Credits destination in the compact top navigation;
- the visible balance control in the shared shell;
- the action in Flow 06's insufficient-credit dialog, with a durable return context;
- a provider/application return associated with an existing purchase attempt;
- a reload/bookmark while a purchase remains pending or unresolved; or
- a history or purchase-status deep link that the service can authorize for the current account.

Flow 12 must not receive raw media bytes as return context. Flow 06 supplies durable project, source, and selection identity. Account/session ownership is revalidated through centralized services.

### 2.3 Successful exits

Possible successful exits are:

- the user remains on Credits with a refreshed authoritative balance, capacity entitlement, packs, and history;
- a verified successful purchase entered from insufficient credits automatically returns in the same tab to the originating durable New dub context;
- the user deliberately returns to New dub after purchase cancellation/failure or after entering Credits directly; or
- the user chooses another top-navigation destination.

Every return to Flow 06 reloads account entitlements and requests a fresh quote for the preserved source/selection revision. It never reuses a pre-purchase quote as current truth and never authorizes, reserves for, or starts processing automatically. The user must deliberately activate the newly rendered exact-cost `Process for N credits` button; that one click authorizes the fresh quote without a second cost-confirmation modal or checkbox.

## 3. Confirmed product rules

### 3.1 Balance and credit denomination

- Preparation costs one credit per selected source second, rounded up once as `ceil(selectedDurationSeconds)`.
- The quote covers the selected section, not detected speech length, speaker count, language mix, overlap, or runtime complexity.
- An eligible verified account receives exactly 120 welcome credits once.
- Welcome credits do not expire.
- Purchased credits do not expire.
- A verified purchase credits the correct account and pack amount once.
- The main balance is authoritative **available spendable credits after active reservations**, not gross posted credits.
- Active reserved credits are shown separately as `In processing` / `В обработке`; they reduce available spendable credits but are not final posted charges.
- The header, Credits page, processing quote, and insufficient-credit check use the same available-balance meaning and account revision.
- Settlement posts only the authoritative final processing charge. Any unused reservation is released under the confirmed success/failure/cancellation rules.
- The browser cannot calculate or assert the authoritative balance, grant, purchase fulfillment, reservation, settlement, or release.
- Concurrent reservations must not overspend, and UI arithmetic cannot substitute for a refreshed account snapshot.

### 3.2 Packs

- Launch offers one-time credit packs priced in USD.
- There is no subscription, recurring charge, automatic purchase, or periodic free-credit replenishment.
- Exact pack amounts, USD prices, margins, and any value comparison remain unselected until the complete cost base is measured and the owner approves them.
- The UI renders pack amount, price, currency, availability, and purchase eligibility exactly as returned by the centralized service.
- If no approved pack configuration is available, the page shows an unavailable state and does not synthesize offers.
- The page may state the confirmed absence of subscription/recurrence. It must not claim savings, best value, tax inclusion, a refund promise, or processing-minute equivalence unless separately approved and supplied authoritatively.

### 3.3 First-purchase project capacity

- Free accounts have two saved-project slots.
- The first verified successful credit purchase permanently increases that account's capacity to ten slots.
- Duplicate or out-of-order purchase delivery cannot repeat the upgrade.
- A later purchase does not add more slots.
- Purchase reversal effects remain OPEN under SPEC-001 D03/D08; Flow 12 displays only the current authoritative entitlement and must not invent downgrade behavior.

### 3.4 Purchase proof and idempotency

- A client redirect, query parameter, local completion screen, or client-supplied receipt is not proof of successful purchase.
- Only an authoritative verified purchase result may add credits, mark fulfillment successful, or activate the capacity upgrade.
- Before sending a start request, the client creates and retains one stable initiation idempotency identity for that purchase intent. The service binds it to the authenticated account and the exact pack/catalog/amount/currency intent, and uses it to return or find the one canonical purchase attempt.
- The initiation identity is resolvable for that account before the client receives any purchase-attempt identity or checkout redirect. A later attempt identity and an authorized opaque return correlation remain valid alternative lookup identities for the same attempt.
- Duplicate submission, reload, timeout retry, provider callback replay, and out-of-order delivery reconcile to one authoritative attempt and at most one credited purchase.
- Pending, cancelled, failed, forged, mismatched, or unverified returns do not add credits or capacity.
- The UI never retries a timed-out or response-lost initiation blindly. It first resolves the account-bound initiation identity; only an authoritative result that no attempt was created and that reuse/retry of that same initiation identity is safe may reenable start. No reconciliation state grants credits or capacity before verified fulfillment.

These are logical safeguards required by the product contract. This specification allocates no backend mechanism and makes no production security claim.

### 3.5 Processing accounting shown in history

Flow 12 may render only accounting states and outcomes supplied by the authoritative ledger boundary:

- an active reservation as separately labelled `In processing`, never as a posted charge;
- authoritative preparation settlement and unused-reservation release;
- included-retry accounting facts, including a zero-credit attempt where applicable;
- queued cancellation at zero charge;
- running cancellation at the authoritative completed-stage-only amount;
- system-failure release/no-charge outcome;
- later paid reprocessing settlement; and
- purchase and welcome-credit grants.

Flow 12 does not calculate available balance, reserved credits, a cancellation amount, or a final charge from client arithmetic, elapsed time, progress, or a local stage model. Exact production stage allocation and rounding remain unresolved. Project deletion does not itself refund completed processing, and a valid account-level settlement can survive project deletion without resurrecting the project.

### 3.6 Return to New dub

- The preserved context identifies the durable project, validated source revision, canonical selected range, and the route intent required by Flow 06.
- After any purchase return, Flow 06 refreshes balance/capacity and obtains a fresh quote.
- The selected range is preserved when its authoritative source/selection still exists.
- If the quote duration, cost, balance, source, or selection revision differs, the refreshed values are shown before any deliberate processing action.
- When the purchase is authoritatively verified as successful and the user arrived from insufficient credits, Flow 12 automatically returns in the same tab to the preserved Flow 06 video/section context.
- Purchase success never authorizes a quote, reserves credits, starts processing, or auto-clicks/bypasses the Flow 06 `Process for N credits` authorization. The refreshed exact-cost button remains the single authorization action, with no second cost-confirmation modal or checkbox.
- The validated upload remains the same automatically preserved My projects draft; purchase navigation neither creates a replacement project nor removes that draft.
- If the durable source/selection no longer exists or belongs to another account, Flow 12 does not reconstruct it from browser data. It returns only to an authorized safe destination with an actionable explanation.

## 4. Experience direction and component anatomy

### 4.1 Design intent

Credits is a working app screen, not a marketing/pricing page. It uses the confirmed light rehearsal-room direction: white and light-gray surfaces, readable dark text, flat fills, no gradients, no decorative effects, no dark or saturated sidebar, and no persistent sidebar at all. The compact top navigation remains the application shell.

The balance answers the screen's first question clearly without prescribing a dominant oversized figure. Packs and history are supporting working regions. The screen avoids a landing-page hero, oversized money typography, promotional ribbons, invented discount badges, icon-topped cards, sparklines, ornamental charts, and vanity figures.

The shared presentation contract is normative here. [design-tokens.md](design-tokens.md) is authoritative for primitive, semantic and component-state roles; this flow uses semantic names rather than choosing raw shades locally:

| Role | Required value |
|---|---|
| Typeface | Mabry Pro Regular and Medium only; no Bold or synthetic Bold |
| Body / row text | Regular 16px / 24px line height |
| Supporting captions | Regular 14px / 20px line height |
| Buttons / field labels | Desktop task: 40px / Medium14px/20px; prominent/landing: 44px / Medium16px/24px; secondary: 32px / Medium14px/20px; navigation: 36px / Medium14px/20px; medium segmented: 40px /14px/20px desktop and48px /16px/24px phone. Phone buttons use Medium16px/24px with 48px minimum targets; field labels use Medium14px/20px. |
| Page heading | Medium 32px / 40px desktop; 24px / 32px phone |
| Page / existing secondary surface | `page` / `surface` |
| Decorative divider / essential control boundary | `divider.decorative` / `border.control`; never interchange them |
| Primary / secondary text | `text.primary` / `text.secondary` |
| Primary action states | `action.primary.default/hover/pressed` with `action.primary.foreground` |
| Recording / destructive states | `action.destructive.default/hover/pressed` with `action.destructive.foreground`; only for those meanings, not purchase promotion |
| Links / errors / selection / disabled | `link`; `error`; `selected.background/foreground`; `disabled.background/foreground`; apply source opacity only for genuinely disabled controls, with readable reasons and no dimming of focusable busy controls |
| Focus | `focus.light` 2px ring with 2px gap matching the opaque surrounding ground; `focus.media` only on an opaque `media` backing |
| Button / single-line input radius | Source buttons6px; derived ordinary fields6px; component-specific OTP/segmented/menu geometry follows design-tokens.md |
| Button / single-line input height | Desktop action roles: task40px, prominent/landing44px, secondary32px, navigation36px; phone targets at least48px. Single-line inputs use separate derived field geometry. |
| Horizontal page gutters | 32px desktop; 16px phone |
| Shared spacing | 8px related items; 16px fields/buttons; 24px within a screen block; 32px between major sections |
| Existing-panel padding | 24px desktop; 16px phone below 768 CSS px; creates no new panel/card wrapper |
| Responsive boundary | below 768 CSS px phone; 768 CSS px and above desktop navigation/layout |
| Working-content maximum width | 1200px |

Use a plain aligned history table at desktop with sentence-case headers, decorative row dividers, and right-aligned tabular credit and balance figures. Essential controls retain `border.control`; dividers do not substitute for them. Do not use zebra rows, a colored header band, all-caps tracking, unmapped decorative shadows, or a wrapper card around every block. Pack geometry, history rendered row-density conformance, Mabry Pro asset availability/browser loading/fallback/rendered proof, and non-motion screen-specific interaction details remain open; the approved token states, focus, typography, spacing and motion do not.

### 4.2 Persistent top navigation

Use the shared compact top navigation with:

- product mark/name;
- New dub;
- My projects;
- current credit balance / Credits entry;
- account access; and
- locale access according to the shared-shell contract.

Credits is the active destination. There is no sidebar. The shell balance and page balance both show available spendable credits from the same authoritative account snapshot/revision; neither presents gross posted credits as available.

### 4.3 Page header and balance region

The page begins with one noun heading, `Credits` / `Кредиты`. The balance region contains:

- `Available balance` label;
- authoritative available spendable credit amount in tabular figures;
- separately labelled `In processing` reserved-credit amount from the same snapshot, including a real zero when none is reserved;
- non-expiry explanation for welcome/purchased credits without implying that every future adjustment category is a grant;
- load/refresh state and last-known status when relevant;
- project capacity shown as `used of limit` only if the shared entitlement service provides both values; and
- a return-to-dub action before terminal success or after cancellation/failure when a valid origin context exists; verified success from that origin returns automatically.

The UI does not derive available balance by subtracting visible figures; the service supplies coherent posted, reserved, and available facts. Do not repeat the same balance as a separate KPI tile below or present `In processing` as a posted debit. Do not show a chart merely to visualize these numbers.

### 4.4 Pack region

The pack region has its own heading and plain explanation that packs are one-time USD purchases with no subscription or automatic renewal.

Each service-supplied pack exposes, at minimum:

- stable pack identity/version;
- exact credit amount;
- exact USD price and currency code;
- availability/eligibility state;
- optional service-supplied factual note that has owner-approved semantics; and
- one explicit action that starts the purchase attempt for that pack.

Pack entries are semantic list items or peer options, not decorative pricing cards. Numeric values use tabular figures. A pack cannot be purchased while its data is stale or its eligibility is unresolved. While initiation for a pack is unresolved, repeat activation for the same intent is disabled and reconciliation uses the retained account-bound initiation identity, even if no attempt identity or redirect was received, instead of creating another purchase.

Activating a pack follows an opaque service launch instruction to the selected payment provider's secured hosted checkout page in the same browser tab. The provider later returns that tab to the application for authoritative reconciliation. The flow does not use a popup/new tab or an embedded card form. This selects presentation only; provider, methods, pack quantities/prices, and integration mechanics remain unselected.

Mock/prototype scenario controls (simulate success, failure, pending or ledger events) belong in a separate simulation/test surface, not among intended purchase actions. Use one unmistakable mode indicator rather than repeated adapter explanations in every product region. No real payment, provider readiness or production price is implied, and no simulated control authorizes a charge or automatic processing.

### 4.5 Purchase-status region

An active or recently returned purchase is shown near the pack region before history. It includes:

- pack identity expressed as credits and USD amount from the attempt snapshot;
- status: starting, awaiting payment, `Confirming payment`, successful, cancelled, failed, or unresolved;
- concise next action appropriate to the authoritative state;
- the distinction between `returned to app` and `purchase verified`; and
- safe retry/reconcile behavior where permitted.

After checkout returns without authoritative confirmation, show `Confirming payment`, automatically refresh/reconcile at the service-provided cadence, and allow the user to leave. The purchase remains account-authoritative and visible as pending in the unified history. Pending state grants no credits and does not change the two-slot entitlement to ten. Success shows the refreshed credited amount, account balance revision, and capacity entitlement only after verification. Cancellation and failure preserve the user's ability to choose a pack again without losing an origin return context.

### 4.6 History region

The page includes one unified chronological History activity feed. It contains welcome-credit grants, verified pack purchases, final processing charges, credit returns/refunds, and pending purchase confirmations. It is not split into mandatory Purchases and Credit activity tabs, and it is not purchase-only.

On initial load, the feed shows the **20 most recent operations**. When authoritative older operations exist, expose one **Show more** action that appends the next older service-provided records while preserving the already visible feed. The MVP has no history filters, search, export, or download control. Page/cursor mechanics and stable chronological ordering under concurrent updates are service-contract details and must not be guessed independently by frontend adapters.

The feed obeys these rules:

- every visible row comes from an authoritative service record;
- posted balance movements use a signed, right-aligned, tabular amount;
- real zero and missing/not-applicable values are distinct;
- timestamps use the user's locale/time zone while retaining a stable record identity for reconciliation;
- a pending-purchase event is labeled Purchase initiated and shows its related current lifecycle state; optional stored pack/amount/currency facts appear only when captured, with no credit delta or fabricated balance-after value;
- every posted operation shows the authoritative available balance after that operation;
- a project-linked accounting row does not expose a deleted or unauthorized project; and
- no row is generated from a local optimistic balance calculation.

Active processing reservations appear in the balance region as `In processing` and are not posted history charges. Exact row taxonomy beyond the confirmed families, grouping, operational retention, and treatment of authoritative cancelled/failed purchase records remain open. A pending purchase confirmation is required in this feed but cannot appear as a verified purchase or balance change; its stable record may update to the corresponding verified posted purchase after authoritative success.

### 4.7 Insufficient-credit dialog handoff

Flow 06 owns the dialog that explains the current quote and shortage. Its action to open Credits passes:

- authorized account/session context;
- durable project identity;
- source and selection revision/identity;
- the last displayed quote identity and amount for context only;
- the route intent; and
- a stable opaque return-context identity.

Flow 12 may explain why the user arrived, but it must label the old quote as context, not current price. After authoritative verification of success, it automatically returns in the same tab with that durable context; Flow 06 refreshes balance and requotes before showing the exact-cost processing action. After cancellation/failure, the user can still deliberately return with the same durable context, where Flow 06 requotes.

### 4.8 Dialogs and notices

Only action/recovery dialogs are permitted:

- leave an unresolved purchase status view;
- explain an account/session mismatch after return; or
- confirm abandoning a provider-hosted flow when the application can know that state.

Routine success, cancellation, and failure use an inline status region rather than stacking modal acknowledgements. Exact provider-specific copy remains open. Checkout is a secured provider-hosted page in the same tab, not an application dialog.

## 5. Client-visible state model and transitions

### 5.1 Page-level states

| State | Required presentation | Allowed action |
|---|---|---|
| `loading` | Final layout with headings and flat placeholders at final size; no shimmer | Wait; accessible busy status |
| `ready` | Authoritative balance, configured packs, and history | Start purchase, inspect history, navigate/return |
| `partial` | Loaded regions remain usable; failed region explains last known state | Retry only failed region |
| `packs-unavailable` | Balance/history remain visible; no invented pack options | Retry packs; navigate |
| `history-empty` | History frame and one plain sentence | Purchase if configured; navigate |
| `history-loading-older` | Already loaded operations remain visible; `Show more` exposes a busy state without duplicate activation | Wait; continue using other loaded regions |
| `history-older-failed` | Already loaded operations remain authoritative; the older-page failure appears with the history action | Retry `Show more`; continue using other loaded regions |
| `history-complete` | All service-reported history currently available is visible; no `Show more` action remains | Inspect history; navigate/return |
| `reconciling-return` | Prior known facts retained; checkout status is `Confirming payment`; pending history row is `Purchase initiated` with its related current state | Automatic service-directed refresh/reconciliation; user may leave; explicit retry only when safe |
| `session-required` | No private account facts exposed | Reauthenticate, then resolve same context/attempt |
| `fatal-account-mismatch` | Purchase is not applied or disclosed as another account's data | Switch/recover session through auth flow |

### 5.2 Purchase-attempt states

| State | Meaning | UI consequence |
|---|---|---|
| `initiation-pending` | Start request outcome is unknown, including a lost response before any attempt identity or redirect was received | Disable duplicate start for the same intent; reconcile with the retained account-bound initiation idempotency identity |
| `awaiting-payment` | Attempt exists; payment step has not produced an authoritative terminal result | Present provider launch/resume instruction without claiming purchase |
| `returned-unverified` | Browser returned with a claim or opaque result, verification not complete | Show `Confirming payment`; add/update the authoritative pending history event labeled `Purchase initiated` with its related current state; automatically refresh status; grant nothing |
| `pending-verification` | Service reports nonterminal confirmation | Preserve attempt across navigation/reload, allow leaving, and automatically refresh/reconcile according to service instruction; no credit or capacity change |
| `succeeded` | Verified and fulfilled exactly once | Refresh balance, capacity, and history; automatically return in the same tab to a valid insufficient-credit origin, otherwise remain on Credits |
| `cancelled` | Authoritative cancellation/no fulfillment | Show Credits with the safe reason/status, deliberate retry and Return to video when an upload origin exists; preserve that source/range, no credit/capacity change or processing launch |
| `failed` | Authoritative terminal failure/no fulfillment | Explain next action; do not reuse attempt as success |
| `unresolved` | Timeout/transport ambiguity after safe reconciliation attempts | Keep stable attempt identity; offer retry status, not a second blind purchase |
| `superseded-display` | A later authoritative revision makes the local view stale | Replace local status with current account/attempt truth |

### 5.3 Main purchase sequence

1. Load the authoritative account credit/capacity snapshot, available pack configuration, relevant purchase attempts, and unified history.
2. User activates one pack action.
3. Before sending, create and retain one stable initiation idempotency identity for the exact account, pack identity/version, amount, currency, and origin intent. `StartCreditPackPurchase` binds it authoritatively and creates or recovers one purchase attempt.
4. Navigate the same browser tab through the opaque service-provided instruction to the provider's secured hosted checkout page.
5. On return, reload, focus, or service-status signal, resolve the attempt from the service.
6. Treat any redirect/query/client receipt only as correlation input.
7. If pending, show `Confirming payment` as the checkout status and publish/update its non-posted history event as `Purchase initiated` with the related current state; allow navigation away and continue automatic safe reconciliation; do not add credits, fabricate balance-after, or increase capacity.
8. If verified successful, refresh account balance, slot entitlement, attempt, and history from one coherent revision boundary where the service supports it.
9. If the attempt has a valid insufficient-credit origin, automatically return in the same tab to the preserved Flow 06 video/section. Flow 06 refreshes balance and quote, then requires one fresh deliberate activation of `Process for N credits`; purchase success does not reserve or start processing.

### 5.4 Cancellation and failure sequence

1. Preserve the stable purchase attempt and origin return context.
2. Resolve whether the outcome is authoritative cancellation, failure, or still pending.
3. Do not change balance/capacity for cancellation/failure.
4. Show the service-supplied actionable reason only when safe for users; do not expose provider/internal diagnostics.
5. Permit a new deliberate purchase only after the prior attempt is terminal or the service explicitly says another attempt is safe.
6. Permit deliberate return to Flow 06, which may still find insufficient balance after a fresh quote.

### 5.5 Duplicate receipt/callback and concurrent-tab sequence

1. Multiple tabs or returns may present the same purchase attempt.
2. Each resolves the same stable identity; none locally increments credits.
3. A repeated verified receipt yields the same fulfilled purchase record and account revision or a newer compatible revision.
4. The first-purchase capacity upgrade remains one permanent transition.
5. Tabs receiving an older result replace it with current authoritative state.
6. A tab with a stale pack/version must reload offers before starting another attempt.

### 5.6 Reload and closed-browser recovery

- A pending attempt is account-authoritative and discoverable after reload/sign-in where policy permits.
- Browser storage may retain only non-authoritative presentation and correlation data.
- If the browser closes during initiation or checkout, the next Credits load retains/recovers the initiation identity and resolves it for the authenticated account before offering an ambiguous duplicate purchase. Resolution does not require that the lost start response supplied an attempt identity or redirect.
- Leaving Credits does not cancel a pending purchase; the unified history continues to expose its authoritative pending state when the user returns.
- If success occurs while the browser is closed, the next load shows the authoritative updated balance/history/capacity.
- If no attempt can be resolved, the page does not infer success or failure from the URL alone.
- The MVP sends no email or push notification for video-preparation or result-assembly completion. Flow 12 does not imply that navigating away from Credits enables those job-completion alerts; users recheck authoritative preparation/result state in the application. Registration-verification and password-recovery emails are outside this exclusion, and provider transaction-message policy remains part of the unselected provider integration.

### 5.7 Return with changed quote or balance

On return to Flow 06:

- preserve the source/selection identity when still valid;
- discard the old quote as authorization material;
- retrieve a fresh quote bound to the current source/selection revision;
- show any changed duration/cost/balance before processing;
- do not auto-start even when the new balance is sufficient; and
- allow the insufficient-credit path again if the purchase still does not cover the fresh quote.

## 6. Error, cancellation, and recovery matrix

| Trigger | Required response | Protected invariant |
|---|---|---|
| Balance request fails | Keep other loaded regions; show scoped retry and last-known timestamp only if clearly labeled | No stale balance represented as current |
| Pack configuration fails | Show no purchasable offers; retry packs | No invented amount or price |
| History fails | Preserve balance/packs; keep History frame with retry | Purchase ability does not imply history truth |
| Purchase initiation times out or its response is lost before attempt/redirect identity arrives | Resolve the retained account-bound initiation identity before reenabling; reuse/retry only when the service authoritatively reports that no attempt was created and the same identity is safe | No blind duplicate purchase, premature credits, or premature capacity upgrade |
| Checkout cannot open | Keep attempt/status and origin context; offer service-approved resume or retry | No local failure promoted to terminal truth |
| Browser returns `success` but service is pending | Show checkout status `Confirming payment` and retain a non-posted `Purchase initiated` history event with related current state; user may leave | Redirect is not proof; no credits, balance-after, or slot upgrade |
| Browser returns `cancel` but service says success | Render verified success | Authoritative fulfillment wins |
| Duplicate/out-of-order receipts | Refresh the one attempt/account revision | Credits and slot upgrade occur at most once |
| Session expires during purchase | Hide private facts, reauthenticate, then reconcile the same attempt/account | No cross-account disclosure or duplicate start |
| Different account signs in on return | Stop origin return and purchase disclosure until authorized resolution | Purchase/account identity cannot be rebound client-side |
| Purchase succeeds after origin project deletion | Keep account credits/capacity; do not recreate project | Account purchase survives; deleted project stays deleted |
| Origin context expired/missing | Show successful purchase on Credits and safe New dub navigation | Purchase never creates or starts processing |
| Preserved selection is stale/changed | Flow 06 reloads authoritative source/selection and requotes | Old quote cannot authorize changed work |
| Quote increases or duration changes | Show fresh quote and require deliberate processing click | No silent larger authorization |
| Account snapshot and history revisions disagree | Keep reconciling; request coherent refresh | No contradictory balance/history claimed final |
| Purchase reversal arrives | Render only chosen authoritative policy; until D03/D08 resolution, affected acceptance remains blocked | No invented refund/downgrade rule |
| Offline during pending status | Show connectivity state and last confirmed fact; retry status after reconnect | No offline success claim |

## 7. Desktop, tablet, phone, keyboard, and assistive behavior

### 7.1 Reading and focus order

The semantic order is:

1. shared top navigation;
2. page heading;
3. balance and return context/status;
4. active purchase status, when present;
5. packs;
6. history; and
7. secondary navigation/help.

Visual reordering must not change keyboard or screen-reader order.

### 7.2 Desktop and tablet

- At 768 CSS px and above use the regular top navigation, 32px horizontal gutters, and a centered working-content canvas no wider than 1200px with one left and right edge.
- Lead with the balance figure and keep pack/history regions dense enough that their headings and first content are visible on a typical desktop first screen.
- Pack count determines the grid/list; no orphan option or stretched empty card.
- History uses an aligned table with 16px body/row text, 14px supporting captions, sentence-case headers, `divider.decorative` row separation, and right-aligned tabular credit/balance figures. A narrow table does not stretch merely to fill the canvas; it may pair with purchase status where the shared layout supports it.
- Pack options reflow without changing service order, and history retains identity, status, amount, and balance-after-or-pending information.

### 7.3 Phone

- Below 768 CSS px use a single column, exact 16px horizontal gutters, 48px buttons/single-line controls, and no horizontal page scroll.
- The signed-in phone header has logo at left and available credit balance plus menu button at right. Its menu contains New dub, My projects, Credits, Account, language, and Sign out. No sidebar remains visible.
- Use the exact 24px phone page heading and make the balance readable without landing-page scale.
- Pack options become full-width rows/blocks in service order.
- History becomes two-line list rows below the table breakpoint: identity/status on the first line, localized date and secondary details on the second, signed credit amount aligned consistently.
- Do not drop amount, status, or time; move secondary fields rather than hiding them.
- Purchase status appears above pack options so pending/success/failure is not pushed below a long history.
- The page never scrolls sideways.

### 7.4 Keyboard and assistive technology

- All pack and navigation actions are native links/buttons with visible focus.
- If a pack requires selection before one shared action, use a labelled radio group; if each row has its own action, do not add a redundant selection state.
- Dialogs trap focus, expose a name/description, close only through defined actions, and restore focus to the invoking control when appropriate.
- Purchase-state changes use a polite live region. Do not repeatedly announce polling with no state change.
- Verified success, authoritative failure/cancellation, and changed balance are announced once.
- Loading exposes `aria-busy` at the affected region, not the whole application when other regions remain usable.
- Table/list headers and signed amounts have accessible labels that do not rely on color or `+`/`-` alone.
- Status uses text plus restrained semantic color. Red remains reserved for errors/recording semantics from the shared direction.
Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.  There is no page-entry, parallax or decorative motion; reduced motion disables the UI transitions. Animation never delays purchase-state reconciliation, save, return or navigation. This screen does not change video/audio playback or playhead behavior owned by media flows.
- Field-specific errors, if an approved in-app field exists, sit directly beneath that field. Service-level errors sit above the affected primary action. A failed request preserves the selected pack and any entered values within the active form lifecycle.

## 8. Visible information and localization contract

### 8.1 Required visible information

The user must be able to determine:

- current confirmed available spendable balance, separately confirmed `In processing` reservations, and freshness/reconciling state;
- that welcome and purchased credits do not expire;
- that packs are one-time USD purchases with no subscription/automatic renewal;
- each configured pack's exact credit amount and exact USD price;
- whether purchase initiation, payment, or fulfillment is pending; the checkout status may be `Confirming payment`, while its pending history event is `Purchase initiated` with the related current state and no posted movement;
- whether a successful result is verified;
- whether the first-purchase capacity upgrade is currently active;
- the unified chronological sequence of posted credit operations and the authoritative balance after each;
- whether a durable New dub return context exists; and
- that returning never starts processing and requires a fresh quote/action.

### 8.2 EN/RU working vocabulary

| Meaning | English | Russian |
|---|---|---|
| Page title | Credits | Кредиты |
| Available balance | Available balance | Доступный баланс |
| One-time purchase | One-time purchase | Разовая покупка |
| No subscription | No subscription or automatic renewal | Без подписки и автопродления |
| Buy/continue action | Buy credits / Continue | Купить кредиты / Продолжить |
| Pending checkout | Confirming payment | Подтверждаем оплату |
| Verified success | Purchase confirmed | Покупка подтверждена |
| Cancelled | Purchase cancelled | Покупка отменена |
| Failure | Couldn't complete purchase | Не удалось завершить покупку |
| History | History | История |
| Welcome grant | Welcome credits | Приветственные кредиты |
| Processing charge | Processing charge | Списание за обработку |
| Reserved credits | In processing | В обработке |
| Credits returned/released | Credits returned | Кредиты возвращены |
| Return action | Return to dub | Вернуться к дубляжу |

This is a vocabulary contract, not final copy. Russian credit nouns and all numeric sentences use locale-aware plural rules. USD and credit amounts must not be concatenated with English-only grammar. Dates/times use the selected locale and user time zone. Provider/server diagnostics are mapped to plain user-facing categories; raw codes remain available only to diagnostics, not visible copy.

Locale precedence is shared and mandatory: an explicit manual RU/EN choice made before sign-in remains active after sign-in and updates a different saved account preference; otherwise an authenticated saved preference applies. On first use with neither an explicit manual nor saved preference, use Russian for browser language `ru` and English otherwise. A browser-derived default is not a manual choice and must not overwrite an account preference.

### 8.3 Copy rules

- Use sentence case, plain verbs, and the same action name through initiation, pending, and result copy.
- Never say `paid`, `confirmed`, `added`, or `unlocked` before authoritative verification.
- Use `Confirming payment` after an unverified return; distinguish it from `Purchase confirmed` and never imply that returning to the app proves payment.
- Do not promise refunds, instant settlement, provider security, or permanent availability without an approved policy and evidence.
- Do not use promotional urgency, countdowns, `best value`, or invented savings.
- Errors say what the user can do next and preserve known-safe facts.
- Place service-level purchase/load errors above the affected primary action; retain the selected pack on failure. Field-specific errors remain directly beneath their field.

## 9. Logical frontend service contracts

All calls go through centralized frontend services with interchangeable mock and future production adapters. React components and Zustand actions do not call payment/backend endpoints directly.

Names below are logical responsibilities, not required endpoint or class names.

### 9.1 `GetCreditAccountSnapshot`

Input:

- current authenticated session/account context; and
- optional known account revision.

Success result:

- account-safe identifier;
- authoritative posted-credit balance;
- active reserved-credit total labelled `In processing`;
- confirmed available spendable balance after active reservations;
- balance revision and observed timestamp;
- welcome-grant state/provenance summary;
- saved-project usage and current limit when available;
- first-purchase-upgrade state;
- pending purchase count/identities safe to show;
- coherence identity covering posted, reserved, and available values; and
- freshness/reconciliation hint.

The service, not the UI, supplies the coherent balance decomposition. The header, quote eligibility, insufficient-credit guard, and Credits main balance consume the returned available value; they do not independently subtract reservations.

Errors distinguish session required, account mismatch/forbidden, retryable unavailable, and unresolved revision conflict.

### 9.2 `ListAvailableCreditPacks`

Input:

- account/locale context; and
- optional known pack-catalog revision.

Success result per pack:

- stable pack identity and catalog revision;
- integer credit amount;
- exact monetary amount in minor units or equivalent exact representation;
- currency code, currently required to be USD for launch;
- availability and eligibility;
- service-approved factual display note, if any; and
- expiration/staleness metadata for purchase initiation.

The UI never derives price-per-credit, savings, tax, minutes, or ranking unless the service supplies an owner-approved field with defined semantics.

### 9.3 `StartCreditPackPurchase`

Input:

- account context;
- pack identity/catalog revision;
- exact displayed amount/currency snapshot;
- stable initiation idempotency identity created and retained before this request, unique for the client purchase intent and presented with authenticated account context;
- origin return-context identity, if present;
- selected locale; and
- application return destination/correlation accepted by the adapter.

Success result:

- the same account-bound initiation identity and its authoritative resolution;
- stable purchase-attempt identity;
- authoritative attempt snapshot;
- opaque same-tab launch/resume instruction for the selected provider's secured hosted checkout page and application return;
- status-refresh instruction; and
- expiration/safe-retry metadata.

The service binds the initiation identity to the authenticated account and exact pack/catalog/amount/currency intent before or atomically with attempt creation. Reusing it returns the same canonical attempt or an authoritative no-attempt/safe-same-identity retry result; it cannot create a second purchase intent. Conflict results include stale pack/catalog, ineligible account, existing compatible attempt, amount/currency mismatch, and session/account mismatch. A lost or unknown start response requires `ResolveCreditPurchase` with the initiation identity, never blind resubmission.

### 9.4 `ResolveCreditPurchase`

Input:

- account context;
- one of: the account-bound initiation idempotency identity created before start, the stable purchase-attempt identity, or an authorized opaque return correlation;
- optional known attempt/account revisions; and
- source event: return, reload, focus, manual refresh, or scheduled reconciliation.

Success result:

- authoritative initiation-resolution state, including the canonical attempt identity when one exists or an explicit no-attempt-created/safe-same-identity retry result;
- authoritative purchase state;
- pack/amount/currency snapshot;
- verification/fulfillment state;
- one credited amount or zero where no fulfillment occurred;
- resulting account/balance revision when fulfilled;
- capacity-upgrade state;
- history reconciliation cursor/revision; and
- next safe action or automatic refresh/reconciliation instruction.

Resolution by initiation identity is account-bound and works before any start response, provider redirect, attempt identity, or return correlation reaches the client. When an attempt exists, every accepted lookup identity converges on that same canonical attempt. For a nonterminal confirmation, the result also identifies or supplies the authoritative pending-history record and no credited amount/capacity upgrade. An explicit no-attempt-created result grants nothing and only permits reuse/retry under the returned safe instruction. Duplicate resolution is stable. The frontend must tolerate a newer account revision than the attempt response by refreshing rather than subtracting/adding locally.

### 9.5 `ListCreditHistory`

#### Backward-compatible mock history metadata (issue #65)

PurchaseState, PurchasePackSnapshot and PurchaseHistorySnapshot are named types. `LedgerEntry.relatedPurchase?: PurchaseHistorySnapshot` is an optional readonly current-lifecycle snapshot resolved by stable `relatedOperationId`. `PurchaseSnapshot.pack?` and `relatedPurchase.pack?` are optional immutable mock pack facts captured when a new attempt starts. Legacy rows without stored pack facts omit amount and credit facts; never infer them from the current catalog. A pending-purchase event is shown as Purchase initiated plus its related current state. In processing remains an active reservation, not a final charge. Ledger kind, delta, availableAfter, reservedAfter, amount ordering and idempotency remain immutable accounting facts. This backward-compatible producer/consumer seam adds no facade method and claims no real payment transport.

Input:

- account context;
- locale/time-zone context;
- no cursor for the initial 20 most recent operations, or the opaque service-issued older-page cursor from the preceding result; and
- optional known history revision.

Result fields for the unified chronological credit and purchase feed:

- stable record identity and revision;
- authoritative record kind: welcome-credit grant, verified pack purchase, final processing charge, credit return/refund, or pending purchase confirmation;
- occurred/recorded timestamps;
- user-facing source descriptor safe for the current account;
- signed credit delta when a posted movement occurred, otherwise explicit not-applicable;
- authoritative available balance after a posted operation, otherwise explicit not-applicable for a pending purchase;
- purchase USD amount/currency/status when applicable;
- project reference only when still authorized;
- settlement/release relation where applicable; and
- whether older operations are available, the opaque continuation cursor when applicable, and reconciliation metadata.

The initial result contains at most the 20 most recent operations. Show more requests the next older service-defined page and appends records by stable identity; the adapter does not invent a cursor, page order, or concurrency merge rule. An active processing reservation is exposed by the account snapshot as In processing, not inserted into history as a final charge. A pending purchase confirmation is present in the feed as pending but has no credit delta or balance-after value until verified fulfillment. The frontend does not derive either state from local arithmetic.

### 9.6 `ResolveCreditReturnContext`

Input:

- account context; and
- opaque return-context identity.

Success result:

- validity/expiry;
- authorized New dub destination;
- durable project/source/selection identity and revisions;
- last quote identity/amount labelled contextual only; and
- reason when the context cannot be resumed.

This service does not return raw local files and does not authorize processing.

## 10. Persistence, ownership, and concurrency boundaries

### 10.1 Browser/UI state

Browser state may retain:

- expanded/collapsed history presentation;
- the currently expanded older-history presentation and opaque continuation cursor only as a recoverable view cache, never as authoritative ordering truth;
- focus/scroll position;
- the stable initiation idempotency identity created before start, retained across reload until authoritatively reconciled, plus any later attempt/return correlation identity; and
- opaque origin return-context identity.

It must not be the only store of purchase truth, the authoritative account-to-initiation binding, pending-history state, credited amount, posted/reserved/available balances, first-purchase upgrade, pack catalog, or durable source/selection identity.

### 10.2 Account-authoritative state

The authoritative boundary owns:

- welcome-credit eligibility and one-time grant;
- posted, actively reserved, and available spendable balances with a coherent revision;
- pack catalog/configuration;
- the account-bound initiation-idempotency mapping, canonical purchase attempt, verification, and fulfillment;
- duplicate/replay handling;
- capacity entitlement;
- reservations, settlements, releases, pending purchase records, and posted history records; and
- durable return context association.

### 10.3 Concurrency

- Balance, capacity, pack catalog, purchase attempt, and history each carry revisions or equivalent freshness identities.
- UI updates use authoritative snapshots/deltas, never `balance += packAmount` or `balance -= quote` as final truth.
- A fulfilled purchase and history update that arrive out of order trigger reconciliation.
- Same-initiation and same-attempt actions are idempotent; resolving a pre-response initiation identity, later attempt identity, or authorized return correlation converges on one account-bound canonical attempt. Different deliberate purchase intents remain distinct and are resolved by services without merging identities.
- Logout/account switch clears private rendered data and requires authorized reload before showing a returned attempt.

## 11. Mock truth and production dependencies

### 11.1 Interchangeable mock scenarios

The mock adapter may deterministically simulate:

- eligible account with one 120-credit welcome grant;
- no duplicate grant after reload, account-link callback replay, or repeated initialization;
- configured pack catalog using explicitly marked test-only fixture values;
- no configured packs;
- purchase initiation pending, timeout, catalog-stale conflict, and a lost start response before any attempt identity/redirect is received, with reload retaining the account-bound initiation identity and reconciliation finding the existing canonical attempt or an explicit no-attempt/safe-same-identity retry result;
- provider/app return followed by pending verification;
- checkout status `Confirming payment` with automatic reconciliation and navigation away, plus a pending unified-history event labeled `Purchase initiated` with related current state and no delta or balance-after;
- verified success, cancellation, failure, and unresolved status;
- duplicate and out-of-order receipt delivery;
- first verified purchase upgrading capacity from two to ten exactly once;
- pending/unverified purchase leaving both credits and the two-slot capacity unchanged;
- later purchases leaving capacity at ten;
- reload/closed-browser recovery for a pending or completed attempt;
- balance/history temporary disagreement followed by coherent refresh;
- more than 20 mixed posted/pending history operations, with the 20 most recent shown initially, one `Show more` action appending older service-ordered records, terminal exhaustion removing that action, and an older-page failure preserving loaded records for retry;
- absence of history filters, search, export, and download actions;
- posted 120, reserved 40, available 80 with the reservation shown only as `In processing`, followed by authoritative settlement/release fixtures;
- missing/expired/mismatched origin return context;
- return to a preserved selection with a changed fresh quote/duration/cost;
- session expiry and cross-account return rejection;
- EN/RU long strings, plural forms, large balances, and narrow phone rows;
- manual pre-sign-in locale precedence over a different saved account preference, plus browser-derived first-use fallback;
- absence of preparation/result completion email or push controls/copy; and
- service/field error placement with the selected pack and active-form values preserved.

The mock proves only the frontend contract and state rendering. It does not prove actual payment authorization, fulfillment, ledger atomicity, provider webhook delivery, fraud protection, tax/invoice correctness, production balance concurrency, or real return durability.

### 11.2 Production dependencies and open evidence

Production readiness requires evidence for:

- measured full costs before pack amounts/prices/margins are approved;
- selected provider/payment methods and provider-specific same-tab checkout/return integration evidence;
- exact server-verified amount/currency/account binding;
- idempotent purchase initiation and fulfillment under duplicate/out-of-order delivery, including authoritative account-bound lookup by the presend initiation identity after a lost start response;
- recovery after close, timeout, provider delay, and callback loss;
- coherent posted/reserved/available account balance, pending/posted history, and capacity revisions;
- one-time welcome grant and first-purchase upgrade across linking/replay/concurrency;
- return-context authorization and lifetime;
- purchase reversal, refund eligibility/amounts, chargeback and retained accounting records; account deletion already warns about remaining purchased credits but remains permitted without spending or a prior refund request;
- processing-stage allocation/rounding for history entries involving running cancellation; and
- supported locale, tax, receipt/invoice, accessibility, and device behavior of the selected payment surface.

## 12. Acceptance criteria

### 12.1 Confirmed and unblocked

- **AC-F12-01 — Available and reserved balance:** Credits, the shared shell, quotes, and insufficient-credit checks render the same authoritative available-spendable balance/revision after active reservations. Credits separately shows reserved credits as `In processing`; no client arithmetic derives either value and no reservation is presented as a final posted charge.
- **AC-F12-02 — Welcome grant:** An eligible verified account shows exactly one 120-credit non-expiring welcome grant; reload, replay, linking callback, and duplicate initialization do not add another.
- **AC-F12-03 — One-time packs only:** The page offers only service-configured one-time USD packs and visibly states no subscription/automatic renewal; it renders no offer when approved configuration is absent.
- **AC-F12-04 — No invented commerce:** No unapproved amount, price, discount, margin, minute equivalence, tax/refund statement, payment method, or provider claim appears.
- **AC-F12-05 — Verified fulfillment:** Redirect/query/client receipt alone cannot add credits or unlock capacity; only a verified successful result refreshes those facts.
- **AC-F12-06 — Duplicate and lost-start safety:** Before start, the client retains one account-bound initiation idempotency identity for the exact purchase intent. Duplicate start, a lost start response before attempt/redirect identity, reload, timeout retry, double receipt/callback, out-of-order delivery, and concurrent tabs resolve that initiation identity, any later attempt identity, or authorized return correlation to one canonical attempt and at most one credit grant and one first-purchase upgrade. A new start is allowed only after authoritative no-attempt/safe-same-identity reconciliation, never by blind repurchase.
- **AC-F12-07 — Capacity:** The first verified successful purchase changes saved-project capacity from two to ten once; later purchases do not increase it further.
- **AC-F12-08 — Pending/reload recovery:** A retained initiation identity can be reconciled after reload/close even when the lost start response supplied no attempt identity or redirect. After checkout returns without authoritative confirmation, the UI shows `Confirming payment`, automatically refreshes/reconciles, allows leaving, and keeps a pending unified-history event labeled `Purchase initiated` with the related current state across reload/close. The UI does not infer terminal state from browser data, start a blind replacement purchase, or grant credits/capacity before verified success.
- **AC-F12-09 — No premature fulfillment:** Cancelled, failed, pending, mismatched, and unverified attempts add no credits, create no posted balance-after value, and do not increase capacity from two to ten; they retain safe retry/return paths.
- **AC-F12-10 — Durable return context:** Flow 12 accepts only durable project/source/selection identity, preserves it across purchase where valid, and never depends on raw browser-held media bytes.
- **AC-F12-11 — Automatic return with fresh quote:** After verified success from an insufficient-credit origin, the same tab automatically returns to the preserved Flow 06 video/selection, refreshes entitlement and quote for the current source/selection revision, and shows changed duration/cost/balance before action.
- **AC-F12-12 — One processing authorization:** Purchase success never authorizes, reserves for, or starts processing. Flow 06 requires one fresh deliberate activation of the exact-cost `Process for N credits` button and adds no second cost-confirmation modal or checkbox.
- **AC-F12-13 — Unified honest history:** One chronological feed includes welcome grants, verified purchases, final processing charges, credit returns/refunds, and pending purchase confirmations. It initially shows the 20 most recent operations and exposes one `Show more` action only when older records exist; loading or retrying older records preserves the visible feed. There are no history filters, search, export, or download tools. Every posted operation has authoritative balance-after; a pending purchase has neither a credit delta nor fabricated balance-after. Active processing reservations remain separately labelled `In processing`, not posted charges.
- **AC-F12-14 — Partial failure:** Balance, packs, history, and purchase-status failures are scoped; still-valid regions remain visible, with no stale value represented as current.
- **AC-F12-15 — Shared presentation, responsive, and accessible:** EN/RU keyboard/assistive operation keeps amount/status/time visible and announces only meaningful state changes. Use the [Clean / Light adoption](affect-ui-clean-light-adoption.md) and [current tokens](design-tokens.md): source dark primary, white subtly shadowed secondary, soft-destructive actions, current role sizes in [design-tokens.md](design-tokens.md): desktop task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation 36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop and 48px /16px/24px phone, exact component radii/interiors and bounded functional motion. Keep Mabry, readable body/dialogue, existing layout/navigation and product semantics; phone button labels remain Mabry Pro Medium 16px/24px with retained 48px targets. Apply the explicit readable-text/link/error, essential-boundary, focus, phone-target and disabled-versus-busy adaptations. Verify the exact source variant/state, actual composites, typography/targets, EN/RU rendering, keyboard/focus and reduced motion; no runtime or accessibility pass is claimed. Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.
- **AC-F12-16 — Mock boundary:** Deterministic mocks cover success and material failure/recovery paths, including a lost initiation response resolved after reload from only the retained account-bound initiation identity, convergence with later attempt/return identities, and no premature credits/capacity. The UI and evidence explicitly avoid claiming real payment, ledger, or provider readiness. Simulation controls remain separate from intended purchase UI with an unmistakable mode boundary and no real-payment/automatic-charge claim.
- **AC-F12-17 — Same-tab hosted checkout:** A pack action navigates the current tab to the selected provider's secured hosted checkout page and returns that tab to the application; no popup/new-tab or embedded card-form presentation is used.
- **AC-F12-18 — Verified return guard:** Provider/application return, URL parameters, client receipts, and mock UI state cannot trigger fulfillment or the automatic New dub return as successful; only authoritative verified success can do so.
- **AC-F12-19 — Existing draft continuity:** The preserved validated upload remains the same My projects draft throughout purchase and return; Flow 12 neither recreates it nor changes its saved-project ownership truth.
- **AC-F12-20 — Locale and error contract:** Manual pre-sign-in language overrides a different saved preference and updates it after sign-in; otherwise saved preference, then browser `ru`/English fallback applies. Field errors sit beneath fields, service errors above the affected primary action, and failed requests preserve the selected pack and active-form values.
- **AC-F12-21 — No completion alerts:** Credits makes no claim or control for email/push completion notifications for video preparation or result assembly; users recheck authoritative in-app status.

### 12.2 Blocked on commercial policy or production evidence

- **AC-F12-B04 — Pack configuration:** Real purchase release is blocked until measured full costs support owner-approved pack credit amounts, USD prices, and margins.
- **AC-F12-B05 — Provider/payment evidence:** Real purchase release is blocked until provider/method selection and production/test-mode integration evidence exist.
- **AC-F12-B06 — Remaining reversal/deletion policy:** Reversal, refund/chargeback eligibility/amounts, capacity effects and financial-record retention remain live-release policy gates. The deletion interaction is resolved: warn about remaining purchased credits and allow deletion without spending or a refund request first. Deletion itself emits no refund operation and promises neither refund nor waiver; a new registration restores no prior balance.
- **AC-F12-B07 — Running-cancellation history:** Exact running-cancellation history labels/amount proof remain blocked until stage allocation, integer rounding, and completion/cancellation races are resolved; the UI may display only service-supplied test fixtures in the interim.

## 13. Verification plan — not executed

No checks in this section have been run. Future evidence records must include scenario/command, environment/device/browser, locale, service/mock mode, date, revision/dirty boundary, fixture/account identities, expected/actual result, and limitations.

### 13.1 Contract and state verification

- Load ready, partial, packs-unavailable, history-empty, session-required, and account-mismatch states.
- Verify loaded regions remain usable when one service fails.
- Verify shell/page balance share one authoritative revision and reconcile when one view is stale.
- With 120 posted and 40 actively reserved, verify the shell/page/quote/insufficient-credit guard all use 80 available while Credits separately shows 40 `In processing`; no history row presents that reservation as a final charge.
- Settle part/all of a reservation and release unused credits; verify available, `In processing`, and the final posted charge update only from coherent authoritative snapshots.
- Verify zero, missing, large, signed, pending, and non-applicable values render distinctly.

### 13.2 Grant and entitlement verification

- Initialize one eligible verified account and observe exactly one 120-credit grant.
- Repeat initialization, reload, auth callback, and allowed account-link scenarios; balance remains unchanged after the first grant.
- Complete the first verified purchase and prove capacity moves from two to ten once.
- Complete a later purchase and replay the first purchase result; capacity remains ten.

### 13.3 Purchase lifecycle verification

- For every configured test pack, bind initiation to pack/catalog revision and exact amount/currency.
- Exercise initiation success, timeout, duplicate submit, stale catalog, ineligible account, and compatible-existing-attempt recovery.
- Drop the start response before any attempt identity or redirect reaches the client, reload, and resolve using only the retained account-bound initiation identity. Prove it returns the existing canonical attempt, or an explicit no-attempt-created/safe-same-identity retry result, without a blind second purchase, credit grant, posted history movement, or capacity upgrade.
- Exercise pending, verified success, authoritative cancellation, failure, and unresolved outcomes.
- After same-tab checkout return without confirmation, verify checkout status `Confirming payment`, automatic service-directed refresh/reconciliation, leave-and-return recovery, and one pending unified-history event labeled `Purchase initiated` with the related current state and no credit delta/balance-after.
- Verify a pending or unverified first purchase leaves credits and project capacity at two; only authoritative verified success grants credits and changes capacity to ten once.
- Return with forged/edited `success`, amount, currency, pack, account, and receipt values; no client claim changes credit/capacity.
- Deliver the same receipt/callback twice and out of order; prove one fulfillment/history identity.
- Close/reload at initiation, checkout, returned-unverified, and pending-verification stages; reconcile the same canonical attempt. At initiation, retain and use the presend initiation identity before any attempt/return identity exists; after later identities arrive, verify all alternatives converge on that attempt.
- Run two tabs against one attempt and against two deliberate attempts; prove stable identities and authoritative final balance.

### 13.4 History/accounting verification

- Verify one unified chronological feed with a welcome grant, pending purchase confirmation, verified purchase, final processing charge, credit return/refund, settlement, release, system-failure no-charge, queued cancellation, running-cancellation fixture, included retry, and paid reprocessing records.
- Verify no mandatory Purchases/Credit activity split and no purchase-only history.
- Seed more than 20 authoritative operations; verify initial load renders exactly the 20 most recent, `Show more` appends older service-ordered records without duplicates or loss, disappears when no older records remain, and preserves loaded records with retry when the older-page request fails.
- Verify history exposes no filter, search, export, or download control.
- Reconcile every visible signed delta and displayed balance-after-operation against the authoritative ordered records and account snapshot.
- Verify a pending history event is labeled `Purchase initiated` with its related current state, not as a verified purchase or posted balance change; cancelled, failed, and unverified attempts likewise create no posted movement.
- Verify active processing reservations are visible only through the separately labelled `In processing` balance fact until authoritative settlement posts the final charge.
- Verify deleted/unauthorized project references expose no private project data while account-level accounting remains.
- Verify stale/out-of-order history and account revisions remain reconciling rather than claiming contradictory final values.
- Do not accept cancellation-stage fixtures as proof of production allocation.

### 13.5 Return-to-New-dub verification

- Enter from insufficient-credit Flow 06 context and preserve durable project/source/selection identity through success, cancellation, failure, reload, and delayed verification.
- On authoritative verified success, verify automatic same-tab return to the preserved Flow 06 video/selection; cancellation, failure, pending state, URL claims, client receipts, and unverified mock state must not take this success path.
- On every Flow 06 return, replace the old quote with a fresh quote and require one explicit `Process for N credits` activation, with no second cost-confirmation modal or checkbox.
- Change quote duration/cost or balance between departure and return; show refreshed facts and no auto-start.
- Verify purchase success performs no processing reservation and creates no processing attempt before that fresh exact-cost activation.
- Verify the validated upload remains the same saved My projects draft rather than being recreated during purchase/return.
- Delete the origin project during purchase; credits/capacity survive verified purchase, and the project is not recreated.
- Expire/mismatch the return context; stay on a safe authorized surface with an actionable route.

### 13.6 Same-tab checkout verification

- From each configured test pack, verify the current browser tab navigates to the selected provider's secured hosted test checkout and returns to the application in that same tab.
- Verify no popup/new-tab or embedded card-form path is exposed.
- Close/reopen or reload around the hosted handoff and prove the presend initiation identity, later attempt identity, and authorized return correlation each reconcile the same stable attempt without a duplicate grant, premature capacity upgrade, or blind resubmission.
- Treat the hosted surface and return navigation as interaction evidence only; independently prove authoritative verification before credits, capacity, history, or automatic origin return change.

### 13.7 Responsive, accessibility, and localization review

- Review final rendering at desktop, tablet, and 390px phone widths after implementation.
- Verify every approved semantic/component mapping: decorative divider versus essential control border, primary/destructive default-hover-pressed foregrounds, link, error, selected, disabled source opacity only for genuinely disabled controls, with readable reasons and no dimming of focusable busy controls, `focus.light` geometry and `focus.media` only on opaque media backing. Keep static token calculations separate from browser rendering, forced-colors and accessibility evidence.
- Verify Mabry Pro Regular/Medium only with role-specific Mabry Pro Medium desktop labels from design-tokens.md and Medium 14px/20px field labels, component-specific source geometry, current desktop action-role dimensions in design-tokens.md, 48px phone controls, 32px/16px gutters, 8/16/24/32px shared spacing, 24px desktop / 16px phone padding only on existing panels, 1200px maximum content width, and the below/at-768 layout switch; confirm spacing creates no new panel/card wrapper and verify font assets/loading, fallback and rendered output separately.
- Verify desktop history table alignment, sentence-case headers, row dividers, and right-aligned tabular figures; verify the phone two-line list preserves pending status and balance-after-or-not-applicable.
- Confirm no sidebar, gradient, ornamental pricing treatment, clipped amount/status/time, horizontal page scroll, or under-44px phone target.
- Verify the signed-in phone header shows logo left and available balance/menu right, with New dub, My projects, Credits, Account, language, and Sign out in the menu.
- Complete the flow with keyboard only; verify focus visibility, dialog focus handling, return focus, and no focus loss across reconciliation updates.
- Inspect screen-reader names, region headings, table/list relationships, busy state, and one-time live announcements.
- Test EN/RU plural forms, long errors, locale dates/times, tabular figures, currency formatting, and account time zone.
- Verify manual pre-sign-in language wins over a different saved preference and updates it; absent a manual choice, verify saved account preference, then browser `ru`/English first-use fallback without browser default overwriting the account.
- Trigger field and service failures; verify beneath-field versus above-primary-action placement and preservation of selected pack/active-form values.
- Verify no preparation/result completion email or push option/copy is present and leaving does not promise such an alert.
- Check high zoom/text enlargement without hiding controls or status.Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged. 

### 13.8 Production evidence gate

- Use only the selected provider's permitted test environment and approved non-production payment fixtures.
- Record provider-return, delayed verification, duplicate/out-of-order delivery, close/reload, and account mismatch evidence.
- Record server-side balance/history/capacity reconciliation independently of visible UI.
- Treat a mock pass as frontend-contract evidence only.

## 14. Dependencies and cross-flow handoffs

| Dependency | Supplies to Flow 12 | Flow 12 supplies back |
|---|---|---|
| Shared shell / Flow 01 | Top navigation, locale/account entry and responsive shell; [design-tokens.md](design-tokens.md) supplies semantic/component-state, typography, spacing, focus and motion roles | Current authoritative balance/credits destination state |
| Flows 02–05 | Authenticated account, verification, linking, reauthentication | Safe reconciliation continuation after auth; no account rebinding |
| Flow 06 — New dub | Insufficient-credit reason and durable project/source/selection return context | Refreshed balance/capacity, verified purchase outcome, preserved return context; never auto-authorization |
| Flow 07 — Processing | Authoritative reservation/settlement/release/cancellation outcomes | Balance/history presentation only; no processing-state control |
| Flow 11 — My projects | Current project usage/capacity display and deleted-project truth | Permanent first-purchase capacity entitlement and account-level purchase independence |
| Flow 15 — Account settings/deletion | Account deletion flow and final policy | Balance/purchase facts required by the selected deletion policy |
| Credit/purchase services | Pack catalog, purchase identity/verification, account balance, history, capacity | Idempotent user intent and reconciliation requests |
| Selected payment integration | Opaque launch/return/status inputs after future selection | No client assertion treated as fulfillment proof |

## Checkout cancellation/failure return — confirmed interaction

Authoritatively cancelled or failed checkout returns to Credits rather than automatically navigating to the video. Show the safe provider/service reason, a deliberate purchase-retry action and Return to video when a preserved New dub origin exists. Preserve its source and selected range. This does not change verified-success automatic return or pending/unknown reconciliation. A retry after known failure/cancellation creates a new deliberate purchase attempt; unknown initiation/fulfillment still resolves through its existing account-bound identity before any replacement attempt. No credits, project-capacity fulfillment or preparation launch follows failure/cancellation. Do not promise external monetary reversal without provider evidence.

Acceptance and planned verification: cover cancelled, known failed, pending and unknown checkout returns with and without upload origin; assert correct Credits destination, restored source/range only after Return to video, safe error/retry actions, no automatic processing and no duplicate/unverified purchase. Verified success must retain its distinct automatic upload return. Browser/provider checks are not yet run.

## 15. Current contract, OPEN policy and evidence gaps

### 15.1 Current cross-flow requirements

- **OPEN-F12-01 resolved — Post-success navigation:** authoritative verified success from an insufficient-credit origin automatically returns in the same browser tab to the preserved New dub video/selection. Flow 06 refreshes balance and quote, then waits for one deliberate exact-cost processing click; there is no automatic authorization, reservation, or processing start.
- **OPEN-F12-02 resolved — Checkout presentation:** a pack action uses the selected provider's secured hosted checkout page in the same browser tab and returns that tab to the application. Popup/new-tab and embedded-card-form presentations are excluded; provider and integration mechanics remain open.
- **OPEN-F12-03 resolved — History model:** one chronological activity feed includes welcome grants, verified purchases, final processing charges, credit returns/refunds, and pending purchase confirmations. Every posted operation has authoritative balance-after; pending confirmation has no delta or fabricated balance-after. Mandatory separate activity/purchase tabs and purchase-only history are excluded.
- **History disclosure resolved:** initial history shows the 20 most recent operations and exposes `Show more` when older operations exist. Filters, search, history export, and history download are excluded from the MVP. Service-defined cursor/page mechanics and stable ordering during concurrent updates remain technical policy.
- **Balance/reservation display resolved:** the main balance is available spendable credits after active reservations; reserved credits appear separately as `In processing` and are not posted charges. Settlement posts the final charge and releases unused reservation.
- **Pending confirmation resolved:** checkout return without authoritative confirmation shows checkout status `Confirming payment`, automatically reconciles, permits leaving, and keeps a non-posted unified-history event labeled `Purchase initiated` with related current state until verified success; no delta/balance-after or two-to-ten slot upgrade occurs before verification.
- **Shared presentation resolved:** [design-tokens.md](design-tokens.md) is normative for primitive, semantic and component-state roles, including divider/control-border separation, action families, link/error/selected/disabled mappings and focus geometry.Use the catalogued functional source motion in [design-tokens.md](design-tokens.md), including reversible 140/160ms button response and eligible selection/content/width recipes. Reduced motion makes UI changes immediate; a functional spinner requires real pending work and a readable static equivalent. No page-entry/parallax/decorative background loop or invented progress; capture/save/payment/navigation never wait for animation. Functional media/playhead timing is unchanged.  Font assets/loading, fallback and rendered proof remain evidence gaps.
- **Shared token states resolved:** Components select semantic roles rather than arbitrary primitives. Disabled controls use `disabled.*`; apply source opacity only for genuinely disabled controls, with readable reasons and no dimming of focusable busy controls; media focus is used only on opaque media backing; static contrast evidence does not establish rendered accessibility acceptance.

### 15.2 Deferred commercial/product decisions — OPEN

- exact pack credit amounts, USD prices, margins, and catalog ordering;
- provider and payment methods;
- tax, invoice/receipt, refund eligibility/amounts, chargeback, reversal, and retained financial records; the owner-approved support destination is `dystrophyless@gmail.com` and does not resolve financial policy; account deletion warning/nonblocking behavior is already resolved;
- whether any owner-approved factual pack comparison is displayed; and
- history retention and grouping.

**Account-deletion balance interaction resolved:** Flow15 displays the service-authoritative remaining purchased credits and permits deletion without spending or a refund-first gate. Refund requests are separate; no automatic refund, waived rights or refund guarantee follows from deletion. The service must distinguish purchased remainder from trial credits/reservations rather than letting the client derive it from total available balance. Planned cross-flow fixtures cover positive/zero purchased remainder, no automatic refund command and no restoration on re-registration. Real refund policy and retained-record evidence remain separate.

### 15.3 Accounting-display and technical policy — OPEN

- exact row taxonomy within the four confirmed history families and treatment of authoritative zero-delta adjustments, if any;
- provider-specific return, close, reload, accessibility, device, and recovery mechanics within the selected same-tab hosted presentation;
- purchase reversal effects on credits/capacity and the display of refunds, chargebacks, or other provider reversals;
- opaque history-cursor/page semantics, stable chronological ordering and reconciliation when new operations arrive while older records are being loaded;
- exact pack layout, history density and other screen-specific geometry, Mabry Pro asset availability/browser loading/fallback/rendered proof, final copy and non-motion screen-specific interaction details within the resolved shared visual contract; common component states, focus, spacing, existing-panel padding and motion direction are settled; and
- operational retention/deletion policy for purchase and accounting records.

### 15.4 Technical and production evidence

- atomic/idempotent grant, purchase fulfillment, capacity upgrade, reservation, settlement, and release behavior;
- account linking/replay and cross-account return protections;
- durable pending-attempt discovery and return-context lifetime;
- coherent balance/history/capacity revision contract;
- provider accessibility, browser/device return behavior, and delayed callback recovery; and
- exact processing-stage allocation/rounding used only as authoritative history facts.

## 16. Design-skill application and evidence boundary

Both requested skills were applied to this specification:

- `.agents/skills/design-taste-frontend/SKILL.md` was applied through its app-screen guidance: Credits is treated as a wallet/billing work screen with a no-sidebar top shell, a noun heading, available balance as the lead figure, separately disclosed reservations, flat light surfaces, restrained status color, honest pending/posted states, aligned tabular numbers, responsive list conversion, and no promotional pricing-page devices.
- `.agents/skills/frontend-design/SKILL.md` was applied by grounding the screen in Dubbed's actual credit/quote/return objects, making every structural element carry information, keeping copy active and consistent, and reserving visual choices that the owner has not approved.

No direction draw, visual mockup, browser inspection, screenshot critique, implementation, or test run was performed. Therefore this document makes no rendered-font, visual-fidelity, accessibility-pass, payment-readiness, or production-readiness claim. Exact copy, screen-specific geometry, font-asset/loading/fallback/rendering details, pack layout, history density/grouping and non-motion screen-specific interaction details remain OPEN unless explicitly constrained above; approved component states/focus, typography, spacing, panel padding, motion, semantic palette roles, control geometry, gutters, maximum width, responsive boundary, phone-header contract and history disclosure controls are resolved.

## Payment and refund contact

The 2026-10-22 decision selected one ordinary support-email link using the same destination as the other owning flow: Credits for signed-in users and the signed-out landing for everyone, including after account deletion. No embedded chat, request form or ticket system. At that time the address had not yet been supplied; the 2026-10-23 owner update below supplies it. Do not imply message delivery or refund approval from opening the link.

This confirmed functional contact is an exception to prior minimal-landing wording that excludes all additional links: it adds no marketing section, video, permanent sidebar or additional public navigation. The unchanged approved design-token contract governs link/focus states.

Acceptance and verification: the link is present in this flow in English/Russian, uses `mailto:dystrophyless@gmail.com`, works by keyboard and remains accessible without an account on Landing. Verify that account deletion does not remove the public contact and that no automatic message, support ticket or refund operation is created by page load or account deletion. These are planned checks, not executed browser/mail-client evidence.

### Support destination

The approved `mailto` destination is `dystrophyless@gmail.com` for the signed-out landing and Credits. This supplies the address requested above without approving refund or financial policy. Opening the link does not prove message delivery and must not send a message automatically. Verify the exact destination and keyboard access; these checks are not rendered browser or email-delivery evidence.
