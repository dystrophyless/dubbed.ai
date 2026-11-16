# Feature Specification: Credits flow on mock services

**Feature Branch**: `restart-claude` (bootstrap worktree; no separate feature branch — owner rule in `CLAUDE.md`)

**Created**: 2026-11-15

**Status**: Draft (clarified 2026-11-15)

**Input**: User description: "Давай сделаем mock frontend для всего flow кредитов (покупка, история и т.д.)" — a mock
frontend for the whole credits flow: buying, history and the rest.

**Design sources (binding)**: Credits template `/styleguide/templates/credits` (Gate 3, approved 2026-11-03) ·
`design-system/ia.md` (route `/credits`, flow 6, Credits rules, glossary) · `PRODUCT_BRIEF.md` §2.8 and §3 "Accounts,
projects, credits" · feature 001 (`specs/001-recording-flow-mock/spec.md`), whose mock services already reserve, charge
and refund credits. The simulated payment page is new and has no approved design yet.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See my balance and where my credits went (Priority: P1)

A signed-in user opens Credits from the top-bar balance or the account menu. They see how many credits they can spend,
roughly how many minutes of dubbing that is, how many credits are reserved by scenes being prepared right now, and a
history grouped by day: the welcome credits, each purchase, and one row per project run that shows where that run
stands — in reserve, charged, partly charged with the rest returned, or returned after a service failure.

**Why this priority**: Credits become real money. Feature 001 already moves credits; without this page the user cannot
check that the movements were right. It is also the destination of every "Buy credits" link that exists today.

**Independent Test**: With the demo state set to a known history (welcome credits, one finished project, one cancelled
during preparation, one failed and refunded, one being prepared), open `/credits` and compare the balance, the reserve
and every history row with the expected values.

**Acceptance Scenarios**:

1. **Given** a new demo user, **When** they open Credits, **Then** the balance reads 120, "about 2 min of dubbing", no
   reserve, and the history has one row "Welcome credits +120" with its date.
2. **Given** a 73-credit scene is being prepared, **When** the user opens Credits, **Then** the balance shows 47 and
   "73 in reserve", and the history has one row for that project, "73 in reserve"; when the scene becomes ready the same
   row reads "73 charged" without a reload.
3. **Given** a project was cancelled after step 1 with 20 of 73 credits charged, **Then** that project's row reads
   "20 charged, 53 returned", and the balance agrees.
4. **Given** a service failure during preparation, **Then** that run's row reads "Returned — service failure, nothing
   charged"; "Try again" adds a new row for the new run.
5. **Given** more than one page of history, **Then** the user can page through it and the newest rows come first.
6. **Given** the top-bar balance pill, **When** the user is on Credits, **Then** the pill is hidden (the page itself is
   the balance), as in the approved template.

---

### User Story 2 - Buy a credit pack (Priority: P1)

The user picks one of the one-time credit packs (credits, about how many minutes, price in USD, one marked "Best value")
and presses the single primary button that names the choice, e.g. "Buy 1 000 credits · $9". They are taken to a
separate simulated payment page — the way a real payment provider would take them away from Dubbed — that shows the
pack and its price, clearly marked as a demo, with "Pay" and a way back without paying. After paying they return to
Credits; on success the credits are added at once, the purchase appears at the top of the history, and — if it is the
account's first purchase — the project slot limit rises from 2 to 10 and the page says so. On a declined payment or when
the user comes back without paying, nothing is charged and the page says so in plain words.

**Why this priority**: Buying is the only way to continue after the welcome credits; it is half of the user's request.

**Independent Test**: With the demo payment outcome set to success or declined, buy each pack (and once come back
without paying) and check the balance, the history, the slot limit and the message shown.

**Acceptance Scenarios**:

1. **Given** the Credits page, **When** it opens, **Then** the "Best value" pack is preselected and the primary button
   names its credits and price; choosing another pack updates the button.
2. **Given** a pack is chosen, **When** the user presses Buy, **Then** the packs and the button lock, the button shows
   it is busy, a note says the payment continues on a secure checkout page, and the user is taken to the simulated
   payment page; pressing again does nothing.
3. **Given** the simulated payment page, **Then** it shows the pack's credits and price, a visible "Demo payment — no
   real money" label, a primary "Pay $9" and "Back to Dubbed"; it uses no real provider's name or branding and asks for
   no card or personal details.
4. **Given** the user presses Pay and the payment succeeds, **Then** they return to Credits, the balance increases by
   exactly the pack's credits, the history gains "Credit pack · 1 000 credits · $9 +1 000" at the top, and a success
   message confirms it.
5. **Given** it is the first purchase on a free account (2 slots), **Then** the success message also says the account
   now has 10 project slots, and My projects / New dub show 10.
6. **Given** the payment is declined, **Then** the user returns to Credits, the balance and history do not change, and
   the page says the payment did not go through and nothing was charged, with the pack still chosen so the user can try
   again.
7. **Given** the user presses "Back to Dubbed" or the browser back button on the payment page, **Then** they return to
   Credits, nothing changes and the page is in its default state without an error.
8. **Given** a purchase succeeded, **When** the user reloads, **Then** the new balance, history row and slot limit are
   still there and the pack is not bought twice.

---

### User Story 3 - Buy credits without losing my scene (Priority: P2)

On New dub the user has chosen a video and a section that costs more than their balance; Start is disabled with
"N more credits needed" and "Buy credits" beside it. "Buy credits" opens Credits with a pack that covers the shortfall
preselected and a line saying what the credits are needed for. After a successful purchase the page offers "Back to New
dub", which returns to the same video and section with Start now enabled at the same price. The same return works from
the "No free project slot" notice on New dub and My projects.

**Why this priority**: It is the moment the user is most likely to pay (owner flow 6, 2026-11-02); losing the chosen
scene here would lose the sale. It builds on stories 1–2.

**Independent Test**: Set the demo balance to 40, choose a 72-credit section on New dub, press "Buy credits", buy a pack
and return; the same video and section are shown and Start reads "Start dubbing · 72 credits" and is enabled.

**Acceptance Scenarios**:

1. **Given** a 32-credit shortfall on New dub, **When** the user presses "Buy credits", **Then** Credits opens with the
   smallest pack that covers 32 credits preselected and a line "You need 32 more credits for <project name>".
2. **Given** the purchase succeeds (through the payment page), **Then** the success message on Credits has a primary
   "Back to New dub"; pressing it shows the same video, section and price with Start enabled.
3. **Given** the user returns without buying (browser back or the link), **Then** New dub still shows the chosen video
   and section with the shortfall unchanged.
4. **Given** the slot-full notice, **When** the user buys their first pack, **Then** the success message names the new
   limit of 10 and "Back to New dub" lets them choose a video.

---

### User Story 4 - Know where I stand before I run out (Priority: P3)

Wherever the balance is shown it stays truthful: the top-bar pill updates after every reserve, charge, refund and
purchase in this tab and in other open tabs. A low or zero balance is never shown as an error: at 0 the balance tile
says "Buy a pack to dub your next scene" and the packs follow.

**Why this priority**: Consistency polish over stories 1–3; the rules are already enforced by the services.

**Independent Test**: Open Credits in two tabs, buy in one, and check that the other tab's balance, history and top-bar
pill change without a reload.

**Acceptance Scenarios**:

1. **Given** two tabs, **When** a purchase succeeds in one, **Then** the other shows the new balance and history row
   without a reload.
2. **Given** a balance of 0 and no reserve, **Then** Credits shows 0 with the "Buy a pack" line and no error styling.

---

### Edge Cases

- History is empty apart from the welcome credits → the history panel shows that one row, not an empty state; a truly
  empty history (no rows at all, only possible in the demo) shows the approved `empty-history` state.
- Credits fails to load → the approved `error` state with "Try again"; the top bar keeps the last known balance.
- The user reloads the payment page, or closes it and opens Credits later → the purchase is either completed (credits
  added once, row present) or counted as cancelled and not charged; it is never shown as pending forever and never added
  twice. Pressing Pay twice pays once.
- The user opens the payment page of a purchase that is already completed or cancelled → it says so and offers "Back to
  Dubbed"; it never charges again.
- Two purchases started from two tabs at once → each is either completed once or reported as not charged; the balance
  equals what was actually bought.
- A reserve is settled or refunded while Credits is open → the balance, reserve and that run's row update in place.
- A project is deleted → its history row stays, with the project name as it was.
- The shortfall changes before the user returns (e.g. a scene being prepared elsewhere was refunded) → New dub shows the
  price and shortfall from the current balance.
- Large balances and amounts use grouped digits in both languages ("1 000" / «1 000»); Russian plurals are correct for
  every amount («1 кредит», «3 кредита», «5 кредитов»).
- Phone width: packs stack, the Buy and Pay buttons are full width and reachable without horizontal scroll.

## Requirements *(mandatory)*

### Functional Requirements

**Route and layout**

- **FR-001**: Credits MUST live on `/credits` in the ordinary shell, reachable from the top-bar balance and the account
  menu, and MUST follow the approved Credits template (three panels Balance · Buy credits · History, narrow column, its
  states `default`, `loading`, `empty-history`, `error`, `purchasing`); any visual change or new state goes back through
  owner review. The simulated payment page and the success / declined messages are new and MUST be designed and
  approved through `/speckit-design` before they are built.
- **FR-002**: The top-bar balance pill MUST be hidden on `/credits` and shown on every other ordinary-shell page.

**Balance**

- **FR-003**: The Balance panel MUST show the spendable credits, an estimate "about N min of dubbing" (1 credit =
  1 second, rounded down to whole minutes, "less than a minute" below 60) and, when non-zero, "N in reserve" with the
  projects holding it.

**Buying**

- **FR-004**: The page MUST offer the one-time credit packs from the services (credits, approximate minutes, USD price,
  at most one "Best value"); prices are placeholders until the owner sets them (brief §5) and the page says they are
  demo prices.
- **FR-005**: Exactly one primary action MUST name the chosen pack's credits and price; pressing it MUST create one
  purchase, lock the packs and the action, and take the user to the simulated payment page; a repeated press MUST NOT
  start a second purchase.
- **FR-006**: The simulated payment page MUST be a separate page outside the product's navigation (as a provider's page
  would be) showing the pack, its price, a visible demo label, "Pay <price>" and "Back to Dubbed"; it MUST NOT use any
  real payment provider's name or branding and MUST NOT ask for card or personal details. Pay and Back both return the
  user to Credits with the outcome (owner, 2026-11-15).
- **FR-007**: A successful purchase MUST add exactly the pack's credits once, add a history row, and on the account's
  first purchase raise the slot limit from 2 to 10; the success message MUST state the credits added and, on the first
  purchase, the new slot limit.
- **FR-008**: A declined or cancelled payment MUST change nothing and MUST say in plain words that nothing was charged
  (declined) or simply return to the default state (cancelled).
- **FR-009**: The outcome of a purchase MUST be durable: after a reload, in another tab, or when the payment page is
  abandoned, it is either completed once or counted as cancelled and not charged — never pending forever, never
  duplicated; a payment page for a finished purchase never charges again.

**History**

- **FR-010**: History MUST show, newest first, grouped by day, paginated: the welcome credits, each completed purchase,
  and **one row per project run** (owner, 2026-11-15) that changes in place as the run moves on: "N in reserve" →
  "N charged" (ready or "No dialogue found") / "X charged, Y returned" (cancelled after a step) / "N returned"
  (cancelled while waiting) / "Returned — service failure, nothing charged". "Try again" after a failure starts a new run
  and a new row. Each row shows its kind (its own icon), the amount with sign (additions in green), time, and the
  project name for runs. Declined and cancelled payments add no row.
- **FR-011**: Balance + reserved MUST always equal welcome credits + completed purchases − credits charged in the history
  rows (every scripted demo case).

**Return to New dub**

- **FR-012**: "Buy credits" from New dub's shortfall MUST open Credits with the smallest pack covering the shortfall
  preselected and a line naming the shortfall and the project; after success a primary "Back to New dub" MUST restore
  the same video and section; leaving without buying MUST restore them too (owner flow 6, 2026-11-02). The trip through
  the payment page MUST NOT lose this context.
- **FR-013**: "Buy credits" from a "No free project slot" notice MUST open Credits with a line explaining that the first
  purchase raises the limit to 10 projects, and offer the way back to where the user came from after success.

**Consistency, mock and demo**

- **FR-014**: Balance, reserve, slot limit and history MUST update without a reload after any reserve, charge, refund or
  purchase, in this tab and in other open tabs.
- **FR-015**: All of it MUST come from the typed services layer: packs, purchase (start, payment page data, outcome),
  history and the existing balance / reserve / slot data; the mock implementation persists in the browser with the rest
  of the demo state, can be reset, and lets tests choose the outcome of "Pay" (success or declined) and its delay.
  Swapping in the real backend and payment provider MUST NOT change the Credits screen.
- **FR-016**: The runs already produced by feature 001 (reserve at Start, charge on delivery and no dialogue, partial
  charge on cancel, refund on failure, Try again reserving again) MUST appear and update in the history from the moment
  they happen; the demo reset starts from the welcome credits row.
- **FR-017**: Every string MUST exist in English and Russian with correct plurals; Credits and the payment page MUST
  meet WCAG 2.2 AA (axe clean, contrast included) at 1440 × 900 and 390 × 844.

### Key Entities

- **Account credits**: spendable balance, reserved credits, slot limit (2 or 10), whether a purchase has been made.
- **Credit pack**: id, credits, approximate minutes, USD price (placeholder), "Best value" flag.
- **Purchase**: pack, price, state (awaiting payment, completed, declined, cancelled), started / finished time, where
  the user came from (for the way back); completes at most once.
- **History row**: kind (welcome, purchase, project run), time, signed amount; for a run — the project id and its name
  at that moment, reserved, charged and returned credits and its state (in reserve, charged, partly charged, returned,
  returned after a failure); for a purchase — the pack and price.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user with a shortfall on New dub can buy a pack and be back on New dub with the same scene and an
  enabled Start in under 1 minute and at most 4 presses (Buy credits · Buy · Pay · Back to New dub).
- **SC-002**: In 100 % of scripted demo cases (start, ready, no dialogue, cancel while waiting, cancel after a step,
  failure + Try again, purchase, declined, back from the payment page, reload on the payment page, two tabs) balance +
  reserve agrees with the history (FR-011), and no purchase is counted twice.
- **SC-003**: A user can tell, for any project run, how many credits it cost and whether any came back, from its single
  history row, in both languages.
- **SC-004**: The balance and the Buy action, and on the payment page the price and Pay, are visible without scrolling
  at 1440 × 900 and 390 × 844, in English and Russian, with no horizontal scroll.
- **SC-005**: Every state of Credits and the payment page passes the automated accessibility check and the end-to-end
  tests on desktop and phone sizes.

## Assumptions

- A demo user is always signed in (as in feature 001); real payment, taxes, receipts / invoices and refunds of
  purchases are out of scope and come with the backend and a payment provider. The demo payment is a separate simulated
  page of Dubbed itself that stands in for the provider's checkout (owner, 2026-11-15); the real provider later replaces
  it without changing Credits.
- Placeholder packs follow the approved template: 300 credits · $3, 1 000 credits · $9 ("Best value"), 3 000 credits ·
  $24 — values to be replaced by the owner (brief §5, open question 1).
- The "N in reserve" projects are linked to their Processing pages.
- Welcome credits are granted once per verified account; in the demo the reset re-creates that single row.
- Subscriptions, promo codes, gifting and credit expiry do not exist (brief §3–4).
- A purchase left on the payment page counts as cancelled when the user next opens Credits.
- `_carryover/frontend-services/` is non-visual input: reused where it fits, never as authority.

## Clarifications

### Session 2026-11-15

- Q: History — one row per credit movement or one row per project run? → A: One row per project run that changes in
  place (in reserve → charged / partly charged with the rest returned / returned after a failure); Try again is a new
  run (FR-010).
- Q: Demo checkout — in place on Credits or a separate simulated payment page? → A: A separate simulated payment page
  the user is taken to and returns from, as with a real provider (FR-006); it needs design and owner approval.
- Q (code review): a failed Buy or Pay was silent — what should the user see? → A: an inline error, the pack stays
  chosen, the same button retries; "Couldn't start the payment. Nothing was charged — try again." (Credits) and "The
  payment didn't go through. Nothing was charged — try again." (payment page), with RU.
- Q (code review): a paid account with 10 of 10 slots was offered a purchase that cannot add slots → A: more slots are a
  new rule for feature 003 (each purchase after the first +5 slots, cap 50 — `PRODUCT_BRIEF.md` §3). In 002, at
  10 of 10 New dub and My projects show "Open My projects" and "Delete a project to free a slot" (RU «Удалите проект,
  чтобы освободить место») without "Buy credits", and Credits shows no slots notice when the limit is already 10.
