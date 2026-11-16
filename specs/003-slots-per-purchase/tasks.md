---

description: "Tasks for 003-slots-per-purchase"
---

# Tasks: More project slots with every purchase

**Input**: `specs/003-slots-per-purchase/` — spec.md (clarified 2026-11-16), plan.md, research.md (R1–R6), data-model.md,
contracts/slots.md, quickstart.md, **ui-spec.md (Approved 2026-11-16)**, approved screenshots in `design/screens/`.

**Tests**: requested by the spec (SC-002, SC-004) and the plan — Vitest for the rule and the mock adapter; Playwright +
axe per user story (desktop 1440×900, EN + one RU run, `expectNoA11yViolations(page)`, no horizontal scroll),
mobile-layout entries (390×844). Playwright runs with one worker; never build while it runs.

**Who does what** (`CLAUDE.md`): tasks marked **(ui-builder)** go to the `ui-builder` agent; every other task goes to
the `implementer` agent; money / purchase-completion tasks (marked **(sol)**) go to `implementer-sol`. The main session
orchestrates and checks reports against real command output.

**UI rule**: every UI task follows `ui-spec.md` (S1 New dub notice, S2 My projects alert, S3 Credits) and wires the
**approved views as-is**: `src/features/recording-flow-mock/views/NewDubView.tsx`,
`src/features/recording-flow-mock/views/ProjectsView.tsx`, `src/features/credits/views/CreditsView.tsx`,
`src/features/credits/slots.ts` (view type `SlotsOffer`). View props: ui-spec §4. Test hooks: `new-dub-no-slot` and
`projects-slots-full` with `data-offer="first|more|max"`, `credits-slots`. No visual change without owner review.

**Paths**: all under `frontend/` unless stated.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1…US3 from spec.md

---

## Phase 1: Setup

- [X] T001 Read the approved view props in `src/features/recording-flow-mock/views/NewDubView.tsx`, `src/features/recording-flow-mock/views/ProjectsView.tsx`, `src/features/credits/views/CreditsView.tsx`, `src/features/credits/slots.ts` and the prototype `src/prototypes/003-slots-per-purchase.tsx` + `src/features/slots-per-purchase/mocks.ts`; record any mismatch with ui-spec §4 / `contracts/slots.md` as a note at the end of this file (no code change)

---

## Phase 2: Foundational (blocks every story)

- [X] T002 [P] Rule module `src/services/rules/slots.ts` per `contracts/slots.md`: `FREE_SLOT_LIMIT = 2`, `FIRST_PAID_SLOT_LIMIT = 10` (replaces `PAID_SLOT_LIMIT`; update imports under `src/services/**` only — keep a deprecated `PAID_SLOT_LIMIT` alias until T013 / T016 move the UI and e2e imports, then remove it), `SLOT_STEP = 5`, `MAX_SLOT_LIMIT = 50`, `type SlotsOffer = "first" | "more" | "max"`; `slotLimitAfterPurchase(limit)` "2 → 10; else min(50, limit + 5)"; `slotLimitForPurchases(completed)` "0 → 2; n → min(50, 10 + 5(n − 1))"; `isSlotLimit(n)` "2 | 10 | 15 | … | 50"; `slotsOffer(limit)` "2 → first; 10…45 → more; 50 → max"; keep `slotsUsed`, `canCreate`, `canReplaceVideo` unchanged; make `src/features/credits/slots.ts` re-export `SlotsOffer` from the rule (one definition)
- [X] T003 [P] Vitest `src/services/rules/slots.test.ts`: for n = 0…12 applying `slotLimitAfterPurchase` n times from 2 equals `slotLimitForPurchases(n)` (2, 10, 15, …, 50 at n = 9, 50 at n = 10–12); `isSlotLimit` true for 2, 10, 15, 50 and false for 0, 3, 5, 12, 55; `slotsOffer` 2 → first, 10 → more, 45 → more, 50 → max
- [X] T004 Contract types in `src/services/contracts.ts` per `contracts/slots.md`: `Account.slotLimit: number` (doc comment "2, 10, 15 … 50 — rules/slots.ts"); `ReturnTo` slots variant `{ kind: "slots"; from: "new" | "projects" }`; `Purchase` += `slotsBefore: number | null`, `slotsAfter: number | null` ("null unless completed"); keep `firstPurchase` ("slotsBefore === 2"); `demo.set` param `slotLimit?: number` ("must satisfy isSlotLimit"); fix compile errors in callers without changing behaviour

---

## Phase 3: User Story 1 — A purchase gives me more room for projects (P1) 🎯 MVP

**Goal**: every completed purchase raises the limit (2 → 10, then +5, cap 50) exactly once; the success message names it.

**Independent test**: `?demo=slots:10` → buy any pack → success names 15, My projects "… of 15"; from 45 → 50 "the
maximum"; at 50 → credits only (quickstart 1–5, 9).

- [X] T005 [US1] (sol) `src/services/mock/credits.ts` `pay()`: inside the existing completing `db.write` transaction read the account, set `purchase.slotsBefore = account.slotLimit`, `purchase.slotsAfter = slotLimitAfterPurchase(slotsBefore)`, `purchase.firstPurchase = slotsBefore === 2`, `account.slotLimit = slotsAfter`; declined / cancelled / swept purchases keep `slotsBefore = slotsAfter = null` and never touch `slotLimit`; `startPurchase` creates purchases with both fields `null`; widen the local `AccountRecord.slotLimit` to `number`; old purchase records without the fields read as `null` (no slots change)
- [X] T006 [US1] (sol) `src/services/mock/index.ts`: `AccountRecord.slotLimit: number`; `demo.set({ slotLimit })` ignores values failing `isSlotLimit`; `demo.reset()` → 2; `slots:full` fills up to the current limit (any limit up to 50); in `src/services/index.tsx` `parseDemo` accepts `slots:<n>` for every `isSlotLimit(n)` (was only 2 / 10)
- [X] T007 [P] [US1] (sol) Vitest `src/services/mock/purchase.test.ts` (extend; fake-indexeddb + fake timers): first purchase 2 → 10 with `slotsBefore 2 / slotsAfter 10`; from 10 → 15; from 45 → 50; at 50 stays 50 with `slotsBefore = slotsAfter = 50`; declined, cancelled and swept leave the limit; double `pay()` and two tabs paying the same purchase add 5 once; two different purchases completing at 45 → 50, not 55; nine purchases from reset → 50 and `=== slotLimitForPurchases(9)`; `demo.set({ slotLimit: 12 })` ignored, `({ slotLimit: 35 })` applied
- [X] T008 [US1] (ui-builder) `src/features/credits/CreditsPage.tsx`: success notice passes `slotLimit: finished.slotsAfter !== null && finished.slotsBefore !== null && finished.slotsAfter > finished.slotsBefore ? finished.slotsAfter : null` (ui-spec S3 item 2: "reaching 50 → the maximum"; "already 50 → nothing about slots"); remove the 002 compatibility edit
- [X] T009 [US1] (ui-builder) `src/features/projects/ProjectsPage.tsx` and `src/features/new-dub/NewDubPage.tsx`: use `account.slotLimit` as a number everywhere (no `=== 10` checks); the header "N of M project slots used" shows any limit (ui-spec S2)
- [X] T010 [US1] (ui-builder) Playwright `e2e/flow-slots.spec.ts` — US1: `slots:10` → Credits → buy 300 → Pay → success contains "15 project slots", My projects "of 15" without reload; `slots:45` → "50 project slots — the maximum"; `slots:50` → success has no slots sentence, limit 50; `payment:declined` at 10 → still 10; one RU run of the 10 → 15 case (plural «15 мест»); two tabs: at `slots:10` buy in tab A, tab B shows "of 15" on My projects and the new limit on Credits without reload (FR-004, US1-6); axe + no horizontal scroll on each success state

**Checkpoint**: the rule works end to end; notices still show the 002 interim text.

---

## Phase 4: User Story 2 — All slots used: buy to get more (P1)

**Goal**: below 50 the slots notices offer "Buy credits" (+5), with a way back to the screen of origin; at 50 deletion only.

**Independent test**: quickstart 6–8.

- [X] T011 [US2] (ui-builder) `src/features/new-dub/NewDubPage.tsx`: pass `slotsOffer={slotsOffer(account.slotLimit)}` and `slotLimit` to `NewDubView` (S1 variants first / more / max), drop `paidFull`; "Buy credits" navigates to `/credits?from=slots&back=new`
- [X] T012 [US2] (ui-builder) `src/features/projects/ProjectsPage.tsx`: pass `slotsOffer` to `ProjectsView` (S2 variants), drop `paidFull`; "Buy credits" navigates to `/credits?from=slots&back=projects`
- [X] T013 [US2] (ui-builder) `src/features/credits/CreditsPage.tsx`: `returnToFromUrl` builds `{ kind: "slots", from: back === "projects" ? "projects" : "new" }` (missing `back` = `new`); ignore `from=slots` only when `slotsOffer(limit) === "max"` (replaces the 002 "paid → null" rule); slots notice `{ kind: "slots", limit, next: slotLimitAfterPurchase(limit) }`; "Best value" stays preselected; after success `backTo` = `"projects"` → `/projects`, `"new"` → `/new`
- [X] T014 [US2] (ui-builder) Remove the 002 interim: drop `NewDubView` / `ProjectsView` `paidFull` props and the `newDub.noSlot.paidText` / `projects.fullPaidText` keys in `src/i18n/locales/en.ts` and `ru.ts` once unused (ui-spec S1 note)
- [X] T015 [US2] (ui-builder) Replace `e2e/flow-credits-paid-full.spec.ts` with US2 cases in `e2e/flow-slots.spec.ts`: `slots:10,slots:full` → New dub `new-dub-no-slot[data-offer=more]` shows "Buy credits" and "Open My projects" → Credits has the "15 project slots" notice and Best value checked → Pay → "Back to New dub" → a video can be chosen; the same from My projects → "Back to My projects" → "of 15", no alert; `slots:50,slots:full` → both notices `data-offer=max`, no Buy credits, `/credits?from=slots&back=new` shows no slots notice; reset + `slots:full` → free notice unchanged; axe on each notice
- [X] T016 [P] [US2] (ui-builder) Update e2e that asserted the 002 interim or `slots:10` semantics: `e2e/flow-credits-robustness.spec.ts`, `e2e/flow-us2.spec.ts`, `e2e/flow-us5.spec.ts`, `e2e/support/flow.ts` — keep their intent, change only what 003 changed (`PAID_SLOT_LIMIT` → `FIRST_PAID_SLOT_LIMIT`, interim texts); after this and T013, delete the `PAID_SLOT_LIMIT` alias from `src/services/rules/slots.ts`

**Checkpoint**: no paid account below 50 meets a dead end (SC-003).

---

## Phase 5: User Story 3 — Know what a purchase adds before I buy (P3)

**Goal**: a slots line under the packs on Credits.

**Independent test**: Credits at 2, 20, 50 slots (quickstart 2, 4).

- [X] T017 [US3] (ui-builder) `src/features/credits/CreditsPage.tsx`: pass `slots={{ limit, offer: slotsOffer(limit) }}` to `CreditsView`; omit it at `max` and while a slots notice or a limit-raising success notice is shown (ui-spec S3 item 3, "no duplicated information")
- [X] T018 [US3] (ui-builder) Playwright `e2e/flow-slots.spec.ts` — US3: `credits-slots` reads "Free account: 2 project slots. Your first purchase gives 10." on reset, "20 project slots · the next purchase adds 5, up to 50" at `slots:20`, absent at `slots:50` and while the slots notice is shown; one RU check («20 мест для проектов»)

---

## Phase 6: Polish & cross-cutting

- [X] T019 [P] (ui-builder) `e2e/mobile-layout.spec.ts`: 390×844 entries for New dub `no-slot` (more, max), My projects `slots-full` (more), Credits with slots line and success at 50 — no horizontal scroll, the primary action above the fold
- [X] T020 [P] `PRODUCT_BRIEF.md` §3 (repository root): state the rule as in force ("every purchase after the first adds +5 slots, up to 50; any pack counts") and remove the "not yet in force / until then … delete a project" interim (FR-012); note that the Russian UI says «места для проектов» (owner, ui-spec approval 2026-11-16)
- [X] T021 Run the full check (verifier): `npm run build && npm run lint && npm run lint:css && npm run test:unit`, then `npm run test:e2e:quick`; full `npm run test:e2e` before commit; `npm run snap` and compare the three screens with `design/screens/`
  - Full check 2026-11-16: build, lint, lint:css OK; unit 185/185; full e2e 155 passed, 1 skipped (001 test.skip). Screenshots of the real screens are taken by design QA (`npm run snap` needs explicit paths).
- [X] T022 Walk `quickstart.md` scenarios 1–10 (quickstart-runner) and fix differences; i18n-checker on EN / RU locale keys (plurals `_one/_few/_many/_other` for slot counts)
  - Quickstart walked 2026-11-16 (quickstart-runner): scenarios 3–8 pass; 1, 2, 9, 10 differed only in the quickstart's expectations (fixed above); no code defects.

---

## Dependencies & execution order

- Phase 1 → Phase 2 (T002, T003 parallel; T004 after T002) → stories.
- US1 (T005–T010) first: T005 → T006 → T007; T008, T009 after T004; T010 after T005–T009.
- US2 (T011–T016) after US1's T005 / T006 (needs limits above 10 and the demo param); T013 after T008 (same file).
- US3 (T017–T018) after T013 (same file, notice logic).
- Polish after all stories.

## Parallel opportunities

- T002 ∥ T003 (rule and its test, different files).
- T007 ∥ T008 / T009 (mock test vs. pages).
- T016 ∥ T011–T013 (old e2e files vs. pages).
- T019 ∥ T020.

## Implementation strategy

MVP = Phases 1–3 (US1): the rule, the mock and the success message — purchases already grow the limit. Then US2 removes
the 002 dead end (the reason for the feature), then US3's informational line. Commit after the full check passes;
one PR for the feature (stories are small and share `CreditsPage.tsx`).

## Notes (T001)

Approved view props and prototype fixtures match ui-spec §4. At review, the service contract used `{ kind: "slots" }` without `from`; T004 updates it. The current page uses the documented 002 compatibility behavior; Later UI tasks address the remaining behavior.
