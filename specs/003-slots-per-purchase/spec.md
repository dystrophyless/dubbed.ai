# Feature Specification: More project slots with every purchase

**Feature Branch**: `003-slots-per-purchase`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "Фича 003: каждая покупка после первой добавляет +5 слотов проектов, максимум 50" — every
purchase after the first adds 5 project slots, up to 50.

**Sources (binding)**: `PRODUCT_BRIEF.md` §3 "Accounts, projects, credits" (owner, 2026-11-15: "every purchase after
the first adds +5 slots, up to 50") · feature 002 (`specs/002-credits-flow-mock/spec.md`: purchase flow, first purchase
2 → 10, the interim "Delete a project to free a slot" notice at 10 of 10 that this feature replaces) · the approved
Credits, New dub and My projects screens from 001–002.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A purchase gives me more room for projects (Priority: P1)

A paying user buys another credit pack. On success, besides the credits, their project slot limit grows by 5 (10 → 15,
15 → 20, … up to 50), the success message says so, and My projects and New dub show the new limit at once. The very
first purchase still raises a free account from 2 to 10 slots, as today. At 50 slots a purchase adds credits only and
says nothing about slots.

**Why this priority**: It is the rule itself; without it a paying user who has used all 10 slots can only delete work.

**Independent Test**: With a demo account that has already bought once (10 slots), buy any pack and check that the
success message names 15 slots and My projects shows "N of 15". Repeat from 45 (→ 50) and from 50 (stays 50, no slots
line).

**Acceptance Scenarios**:

1. **Given** a free account with 2 slots, **When** its first purchase succeeds, **Then** the limit becomes 10 and the
   success message says "Your account now has 10 project slots" (unchanged from 002).
2. **Given** a paid account with 10 slots, **When** another purchase succeeds, **Then** the limit becomes 15 and the
   success message says the account now has 15 project slots.
3. **Given** a paid account with 45 slots, **When** a purchase succeeds, **Then** the limit becomes 50 and the success
   message names 50 and says this is the maximum.
4. **Given** an account with 50 slots, **When** a purchase succeeds, **Then** the limit stays 50 and the success message
   mentions credits only.
5. **Given** a declined payment or the user coming back without paying, **Then** the slot limit does not change.
6. **Given** a successful purchase, **When** the user reloads or looks in another open tab, **Then** the new limit is
   shown and was added exactly once.

---

### User Story 2 - All slots used: buy to get more (Priority: P1)

A paying user whose slots are all used (10 of 10 up to 45 of 45) tries to start a new dub or looks at My projects. Instead
of being told only to delete a project, the notice offers both: buy credits to get 5 more slots, or delete a project.
"Buy credits" opens Credits with a line explaining that a purchase adds 5 project slots; after success the way back
returns them to where they came from with a free slot. Only at 50 of 50 is the user told to delete a project, with no
purchase offered.

**Why this priority**: This is where the user meets the limit; it replaces the 002 interim dead end and is the reason
for the feature.

**Independent Test**: Set the demo account to 10 of 10 used; on New dub and on My projects the notice offers "Buy
credits"; buy a pack, return, and start a new dub. Set the account to 50 of 50; the notice offers deletion only.

**Acceptance Scenarios**:

1. **Given** a paid account with 10 of 10 slots used, **When** the user opens New dub, **Then** the "No free project slot"
   notice says a purchase adds 5 slots, offers "Buy credits" and "Open My projects", and does not suggest that buying
   is the only way.
2. **Given** the same account, **When** the user opens My projects, **Then** the "All project slots are used" notice
   offers "Buy credits" with the same explanation.
3. **Given** the user pressed "Buy credits" from either notice, **Then** Credits opens with the "Best value" pack preselected and a line saying a purchase adds
   5 project slots (and to what limit), and after a successful purchase the success message offers the way back to
   where they came from.
4. **Given** they return to New dub after the purchase, **Then** they can choose a video; My projects shows "N of 15".
5. **Given** a paid account with 50 of 50 slots used, **Then** New dub and My projects show "Delete a project to free a
   slot" without "Buy credits", and Credits shows no slots line.
6. **Given** a free account with 2 of 2 slots used, **Then** the notice is unchanged from 002 (the first purchase gives
   10 slots).

---

### User Story 3 - Know what a purchase adds before I buy (Priority: P3)

On Credits, a paying user below the cap sees, near the packs, how many project slots they have now and that the next
purchase adds 5 (up to 50). A free account sees that the first purchase gives 10. At 50 the line is not shown.

**Why this priority**: Helps the user value a purchase, but stories 1–2 work without it.

**Independent Test**: Open Credits as a free account, at 10, at 45 and at 50 slots and compare the slots line with the
expected text.

**Acceptance Scenarios**:

1. **Given** a paid account with 20 slots, **When** the user opens Credits, **Then** a line says they have 20 project
   slots and the next purchase adds 5.
2. **Given** an account at 50 slots, **Then** no line promises more slots.

---

### Edge Cases

- Two purchases complete close together (two tabs): each adds 5 once; the limit never goes above 50.
- A purchase at 45 slots completes while another one is still on the payment page: the first takes the limit to 50, the
  second adds credits only and its message does not mention slots.
- Deleting projects never lowers the limit; a freed slot is reused.
- A purchase is never refunded in this product version, so the limit never decreases.
- Declined, cancelled or abandoned payments add no slots.
- The demo reset returns the account to 2 slots.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The project slot limit MUST follow from the account's completed purchases: no purchase → 2; one → 10; each
  further completed purchase → +5; never more than 50 (10, 15, 20, …, 50 after 1, 2, 3, …, 9 purchases).
- **FR-002**: Every completed purchase MUST count, whatever pack was bought — the smallest pack included (owner,
  2026-11-16); declined, cancelled and abandoned purchases
  MUST NOT count. A purchase counts once, even after a reload, in another tab, or when two purchases finish together.
- **FR-003**: The purchase success message MUST name the new slot limit whenever the purchase raised it, and say when the
  new limit is the maximum (50); when the limit was already 50, it MUST mention credits only.
- **FR-004**: The new limit MUST appear on Credits, My projects and New dub without a reload, in this tab and in other
  open tabs.
- **FR-005**: When a paid account below 50 has all slots used, New dub's "No free project slot" notice and My projects'
  "All project slots are used" notice MUST offer "Buy credits" and explain that a purchase adds 5 slots, while still
  offering the way to My projects / deleting a project. This replaces the 002 interim text "Delete a project to free a
  slot" for limits 10–45.
- **FR-006**: At 50 of 50 those notices MUST say "Delete a project to free a slot" and MUST NOT offer a purchase.
- **FR-007**: "Buy credits" from a slots notice MUST open Credits with a line stating that a purchase adds 5 project slots
  and the limit it leads to (for a free account: 10 as in 002), with the "Best value" pack preselected as on a plain
  visit to Credits (owner, 2026-11-16), and after success MUST offer the way back to where the
  user came from (as 002 does for New dub).
- **FR-008**: Credits MUST show, for an account below 50, how many project slots it has and what the next purchase adds;
  it MUST NOT promise more slots at 50.
- **FR-009**: The free-account behaviour from 002 (2 slots, first purchase → 10, its notices and messages) MUST stay as it is.
- **FR-010**: The rule MUST live in the services layer as one shared rule; the mock persists the slot limit with the rest of
  the demo state and raises it once per completed purchase, so it always equals the FR-001 value for the number of
  completed purchases; the demo can be set to any slot limit and number of used slots, and
  swapping in the real backend MUST NOT change the screens.
- **FR-011**: Every new or changed string MUST exist in English and Russian with correct plural forms; changed screens
  MUST meet WCAG 2.2 AA (axe clean) at 1440 × 900 and 390 × 844.
- **FR-012**: `PRODUCT_BRIEF.md` §3 MUST be updated to state the rule as in force and drop the 002 interim note.

### Key Entities

- **Account credits** (from 002): spendable balance, reserved credits, slot limit (2, 10, 15, …, 50) — always the FR-001
  value for the number of completed purchases.
- **Purchase** (from 002): on completion, records the slot limit before and after, so the success message can name it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A paying user with all 10 slots used can buy a pack and start a new dub in under 1 minute and at most
  4 presses from the slots notice (Buy credits · Buy · Pay · Back to New dub).
- **SC-002**: In 100 % of scripted demo cases (first purchase, 2nd–9th purchases, purchase at 50, declined, cancelled,
  reload on the payment page, two tabs, two purchases finishing together) the slot limit equals the FR-001 value for the
  number of completed purchases and never exceeds 50.
- **SC-003**: No paid account below 50 slots meets a slots notice without a way to get more slots; at 50 every notice
  offers deletion only.
- **SC-004**: Every changed state of Credits, New dub and My projects passes the automated accessibility check and the
  end-to-end tests on desktop and phone sizes, in English and Russian.

## Assumptions

- Pack prices and sizes stay the 002 placeholders.
- The rule counts all completed purchases, so an account that bought several packs before this feature gets the limit
  the rule gives (in the demo, only the demo state is affected).
- Slots are not sold separately and have no price of their own; refunds of purchases and account deletion are out of
  scope.
- The way back after a purchase from the My projects notice returns to My projects; from New dub, to New dub with its
  chosen state (002 behaviour).
- Layout and wording of the changed notices and lines are designed in `/speckit-design` and approved by the owner; the
  texts quoted above state the meaning, not the final copy.
- `_carryover/` is non-visual input only.

## Clarifications

### Session 2026-11-16

- Q: Does every pack add 5 slots, the smallest ($3) included? → A: Yes — any completed purchase adds +5 slots (FR-002).
- Q: Which pack is preselected when Credits opens from a "slots full" notice? → A: The "Best value" pack, as on a plain
  visit to Credits (FR-007).
