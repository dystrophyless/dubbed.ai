---

description: "Tasks for 002-credits-flow-mock"
---

# Tasks: Credits flow on mock services

**Input**: `specs/002-credits-flow-mock/` — spec.md (clarified 2026-11-15), plan.md, research.md (R1–R9), data-model.md,
contracts/credits.md, quickstart.md, **ui-spec.md (Approved 2026-11-15)**, approved screenshots in `design/screens/`.

**Tests**: requested by the spec (SC-002, SC-005) and the plan — Vitest for the rules and the mock adapter; Playwright +
axe per user story (desktop 1440×900, EN + one RU run, `expectNoA11yViolations(page)`, no horizontal scroll), one smoke
per new route, mobile-layout entries (390×844). Playwright runs with one worker; never build while it runs.

**Who does what** (`CLAUDE.md`): tasks marked **(ui-builder)** go to the `ui-builder` agent; every other task goes to
the `implementer` agent; money / purchase-idempotency tasks (marked **(sol)**) go to `implementer-sol`. The main
session orchestrates and checks reports against real command output.

**UI rule**: every UI task follows `ui-spec.md` (S1 Credits, S2 payment page) and wires the **approved views as-is**:
`src/features/credits/views/CreditsView.tsx`, `src/features/checkout/views/CheckoutView.tsx`, `src/features/credits/format.ts`.
No visual change without owner review. Test hooks and roles: ui-spec §2 "Test hooks".

**Paths**: all under `frontend/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1…US4 from spec.md

---

## Phase 1: Setup

- [X] T001 Read the approved views' props (`CreditsViewProps`, `CheckoutViewProps`, `HistoryItem` in `src/features/credits/views/CreditsView.tsx` and `src/features/checkout/views/CheckoutView.tsx`) and the prototype `src/prototypes/002-credits-flow-mock.tsx`; record any mismatch with `contracts/credits.md` as a note at the end of this file before Phase 2 (no code change)

---

## Phase 2: Foundational (blocks every user story)

**Contract and rules**

- [X] T002 Extend `src/services/contracts.ts` exactly as `contracts/credits.md`: `Money { cents; currency: "USD" }`, `CreditPack { id; credits; price: Money; best }`, branded `PurchaseId`, `ReturnTo` (`{kind:"new"; projectId; need} | {kind:"slots"} | null`), `PurchaseState = "awaiting" | "completed" | "declined" | "cancelled"`, `Purchase` (pack snapshot, state, returnTo, checkoutUrl, firstPurchase, createdAt, finishedAt), `RunState = "reserved" | "charged" | "returned" | "partly_charged" | "failed_returned"`, `HistoryRow` union (welcome | purchase | adjustment | run with `projectId, projectName, reserved, charged, returned, state, updatedAt`), `HistoryPage { rows; page; pages }`, `CreditsPort` (packs, history(page) "page ≥ 1; page size 20", startPurchase, getPurchase, pay, cancelPurchase, sweep), `Services.credits`; `DemoSettings` += `payment: "success" | "declined"` (default `"success"`), `paymentDelayMs` (default 1 200); `ChangeEvent.kind` += `"credits"`, `"purchase"` (+ optional `purchaseId`)
- [X] T003 [P] Pure rules in `src/services/rules/credits.ts`: `PACKS` placeholders "300 · 300 cents, 1 000 · 900 cents (best), 3 000 · 2 400 cents, USD"; `minutesOf(credits) = floor(credits / 60)`; `packForNeed(packs, need)` = smallest pack with credits ≥ need, else the largest, and with no need the `best` pack (R6); `runAfter(event, price, charge?)` returning `{reserved, charged, returned, state}` per the data-model run table (start / settle / cancel-waiting / cancel-after-steps / failure); `runAmount(row) = −(reserved + charged)`; `balanceFromHistory(rows) = Σ amount` (invariant, data-model)
- [X] T004 [P] Vitest `src/services/rules/credits.test.ts`: `packForNeed(9)` → 300, `(32)` → 300, `(301)` → 1 000, `(5 000)` → 3 000, `()` → 1 000; minutes 59 → 0, 983 → 16; every row of the data-model run table (e.g. price 73, cancel after a step with charge 20 → `{0, 20, 53, "partly_charged"}`, amount −20; failure → `{0,0,73,"failed_returned"}`, amount 0); the worked invariant example "welcome 120, Start 73 → balance 47"

**Mock storage (money — (sol))**

- [X] T005 (sol) `src/services/mock/db.ts`: raise `DB_VERSION` to 2; add stores `history` (keyPath `id`, index `at`) and `purchases` (keyPath `id`); in the upgrade from v1 seed history per research R2: a welcome row (+120, at the earliest project's `createdAt` or now), one run row per existing project with `reserved > 0` or `charged > 0` (state from its money, `projectName` = current name), then one `adjustment` row if `balance ≠ Σ amount`; a fresh database gets only the welcome row
- [X] T006 (sol) `src/services/mock/index.ts`: add `runId` to `ProjectRecord`; in the **same `db.write` transaction** that moves the money, write the history: `start` and `retry` create a new run row (`state "reserved"`, `projectName` = name at Start, `at = now`) and set `p.runId`; settle (ready / no dialogue) → `charged`; refund on failure → `failed_returned`; `cancel` → `returned` when nothing charged else `partly_charged`; the row update and the balance change commit together or not at all; emit `{kind:"credits"}` alongside the existing events; deleting or renaming a project never changes its rows
- [X] T007 (sol) `src/services/mock/index.ts` demo controls: `demo.set({balance})` writes an `adjustment` row for the difference (R3); `demo.reset()` clears `history` and `purchases` and writes the welcome row; parse `?demo=payment:success|declined` and `?demo=paydelay:<ms>` into `DemoSettings` alongside the existing parameters
- [X] T008 (sol) Vitest `src/services/mock/credits-history.test.ts` (fake-indexeddb + fake timers): after each 001 transition — start, ready, no dialogue, cancel while queued, cancel after step 1, failure + Try again (two rows), demo balance preset — exactly one row is created or updated and `account.balance === Σ amount` and `balance + reserved === welcome + purchases ± adjustments − Σ charged` (FR-011, SC-002); a deleted project keeps its row and name; v1 → v2 upgrade on a database holding a ready project and a failed one yields a consistent history

**Services wiring**

- [X] T009 `src/services/index.tsx`: query keys `["credits","packs"]`, `["credits","history",page]`, `["purchase",id]`; hooks `usePacks()`, `useCreditsHistory(page)`, `usePurchase(id)`; invalidate history on `credits`, `purchase`, `project`, `removed` and `["account"]` on `credits`, `purchase` (contracts "Query keys and hooks"); `Services.credits` from the mock adapter

**Checkpoint**: `npm run build && npm run lint && npm run test:unit` green; the 001 e2e still pass (`npm run test:e2e:quick`).

---

## Phase 3: User Story 1 — See my balance and where my credits went (P1) 🎯 MVP

**Goal**: `/credits` shows the balance, minutes, reserve with linked projects and the per-run history, live.
**Independent test**: with demo history (welcome, a ready project, one cancelled after a step, one failed, one preparing) the balance, reserve and every row match (spec US1).

- [X] T010 [US1] `src/services/mock/credits.ts`: `packs()` from `PACKS`; `history(page)` newest first by `at`, page size 20, `pages = max(1, ceil(n / 20))`; register as `services.credits` in `src/services/mock/index.ts`
- [X] T011 [P] [US1] Vitest in `src/services/mock/credits.test.ts`: paging (45 rows → 3 pages, page 1 newest), an empty store → `{rows: [], pages: 1}`
- [X] T012 [US1] (ui-builder) `src/features/credits/CreditsPage.tsx`: container for ui-spec S1 wiring `CreditsView` to `useAccount`, `usePacks`, `useCreditsHistory(page)`; states `loading` / `error` (Try again refetches) / `empty-history` / default per the ui-spec state table; reserve projects from `projects.list()` with `reserved > 0`, each `href` = `/projects/<id>/processing`; run rows in reserve link to Processing; zero-balance line at balance 0; times through `timeFormatter()` from `src/features/credits/format.ts` (hour cycle from the browser locale, words from the UI language — owner 2026-11-15)
- [X] T013 [US1] (ui-builder) `src/app/router.tsx`: route `/credits` → `CreditsPage` inside the ordinary shell; `src/app/ProductShell.tsx`: hide the balance pill when the location is `/credits` (FR-002), visible elsewhere
- [X] T014 [US1] (ui-builder) e2e `e2e/flow-credits-us1.spec.ts`: `?demo=reset` → balance 120, "About 2 min of dubbing", one row "Welcome credits +120", pill hidden on `/credits` and shown on `/projects`; upload `scene.mp4` + Start → Credits shows 106, "14 credits in reserve for Scene", the run row "14 in reserve" turns "14 charged" without a reload (`?demo=speed:4`); `?demo=outcome:failed@2` run → "Returned — service failure, nothing charged" and Try again adds a new row; one RU run checks «кредита/кредитов» plurals; axe + no horizontal scroll
- [X] T015 [P] [US1] (ui-builder) `e2e/smoke.spec.ts` + `e2e/mobile-layout.spec.ts`: add `/credits` (renders `credits-balance`; at 390×844 no horizontal scroll, Buy visible)

**Checkpoint**: US1 independently demoable.

---

## Phase 4: User Story 2 — Buy a credit pack (P1)

**Goal**: Buy → simulated payment page → back to Credits with success / declined / cancelled, never twice.
**Independent test**: with `?demo=payment:success|declined`, buy each pack and once come back without paying; check balance, history, slot limit, message (spec US2).

- [X] T016 [US2] (sol) `src/services/mock/credits.ts`: `startPurchase(packId, returnTo)` creates an `awaiting` purchase with a pack snapshot and `checkoutUrl = "/checkout/<id>"` (`"pack"` error for an unknown id); `getPurchase`; `pay(id)` — only an `awaiting` purchase moves, after `paymentDelayMs`, in **one transaction**: `completed` (balance += credits, a `purchase` history row, `slotLimit` 10 and `firstPurchase = true` if it was 2) or `declined` (nothing else changes), per `DemoSettings.payment`; any other state returns the purchase unchanged; `cancelPurchase` awaiting → cancelled; `sweep(keep)` every `awaiting` except `keep` → `cancelled` (R5); emit `{kind:"purchase", purchaseId}` and `{kind:"credits"}`
- [X] T017 [P] [US2] (sol) Vitest `src/services/mock/purchase.test.ts`: success adds exactly the pack's credits and one row; first purchase raises the limit to 10, the second keeps 10 and `firstPurchase` false; declined and cancelled change nothing and add no row; `pay` twice in parallel and from two adapter instances (two tabs) completes once; `pay` after `cancelPurchase` / `sweep` never charges; reload (fresh adapter) keeps the result; invariant holds after each case
- [X] T018 [US2] (ui-builder) `src/features/credits/CreditsPage.tsx`: pack choice (default `best`), Buy → `startPurchase` → `purchasing` state (cards locked, repeated press ignored) → `location.assign(checkoutUrl)` / router navigate for the mock route; on open call `sweep(purchaseParam)`; with `?purchase=<id>` show the notice from the purchase: completed → success (credits, new balance, + 10 slots line when `firstPurchase`), declined → declined with the same pack kept, cancelled → no notice (ui-spec S1 states)
- [X] T019 [US2] (ui-builder) `src/features/checkout/CheckoutPage.tsx` + route `/checkout/:purchaseId` in `src/app/router.tsx` **outside** the product shell (brand + language only, ui-spec S2): `usePurchase(id)` → `default` (awaiting) / `completed` / `cancelled` (also declined) / `not-found` / `loading` / `error`; Pay → `paying` (repeat ignored, Back disabled) → `pay(id)` → `returning` → `navigate("/credits?purchase=<id>", {replace: true})`; "Back to Dubbed" and the browser back button → `cancelPurchase(id)` then `/credits` (replace); no provider name, no card / personal fields
- [X] T020 [US2] (ui-builder) e2e `e2e/flow-credits-us2.spec.ts`: "Best value" preselected, Buy label "Buy 1,000 credits · $9"; Buy → `/checkout/<id>` shows "Demo payment — no real money" and "Pay $9"; Pay → Credits +1 000, top row "Pack · 1,000 credits", notice names 10 project slots; reload → no double; `?demo=payment:declined` → declined notice, balance unchanged, pack kept; Buy → "Back to Dubbed" → default Credits, no row; reopening a finished `/checkout/<id>` shows "already complete" / "cancelled" and Pay is absent; axe on both pages; one RU run
- [X] T021 [P] [US2] (ui-builder) `e2e/smoke.spec.ts` + `e2e/mobile-layout.spec.ts`: add `/checkout/:id` (create a purchase first; at 390×844 the whole panel and Pay fit without scrolling)

**Checkpoint**: US1 + US2 = the full credits page with buying.

---

## Phase 5: User Story 3 — Buy credits without losing my scene (P2)

**Goal**: shortfall / slot-full → Credits with context → buy → back to New dub with the same scene.
**Independent test**: `?demo=reset,balance:5`, `scene.mp4` (14 credits) → Buy credits → pack 300 preselected → Buy → Pay → "Back to New dub" → Start enabled at 14 (quickstart step 7).

- [X] T022 [US3] (ui-builder) `src/features/new-dub/NewDubPage.tsx`: "Buy credits" → `/credits?from=new&project=<draftId>&need=<price − balance>`; `src/features/projects/ProjectsPage.tsx` and the New dub slot-full notice: "Buy credits" → `/credits?from=slots` (FR-012, FR-013)
- [X] T023 [US3] (ui-builder) `src/features/credits/CreditsPage.tsx`: read `from/project/need`; `shortfall` notice "You need N more credits for <project>" with `packForNeed(need)` preselected (project name from `projects.get`); `slots` notice; pass `returnTo` to `startPurchase`; on a completed purchase with `returnTo` show the success notice with primary "Back to New dub" (Buy drops to secondary — ui-spec decision) → `/new?project=<id>` for `kind:"new"`, `/new` for `kind:"slots"`
- [X] T024 [US3] (ui-builder) e2e `e2e/flow-credits-us3.spec.ts`: the independent test above, plus: leave Credits with browser back without buying → New dub keeps video, section and the shortfall; `?demo=slots:full` on New dub → Buy credits → slots notice → buy → notice names 10 slots → Back to New dub lets the user choose a video; axe

---

## Phase 6: User Story 4 — Know where I stand (P3)

**Goal**: balance, pill and history stay truthful across tabs; zero balance is never an error.
**Independent test**: two tabs on Credits; buy in one → the other updates without a reload (spec US4).

- [X] T025 [US4] (ui-builder) e2e `e2e/flow-credits-us4.spec.ts`: two pages in one context; purchase in page A → page B's `credits-balance`, top history row and (on `/projects`) the top-bar pill update without reload; `?demo=balance:0` → "Buy a pack to dub your next scene", no error styling; axe
- [X] T026 [US4] If T025 fails on cross-tab updates, fix the invalidation in `src/services/index.tsx` (BroadcastChannel `credits` / `purchase` events → invalidate `["account"]`, `["credits","history",*]`, `["purchase",id]`) — no other change

---

## Phase 7: Polish & cross-cutting

- [X] T027 [P] `i18n-checker` agent: EN/RU key parity for `features.credits.*` and `features.checkout.*`, Russian plurals one/few/many/other, no hard-coded strings in `src/features/credits/**` and `src/features/checkout/**`
- [X] T028 [P] `src/features/credits/format.test.ts` (unit-test-writer): `timeFormatter("en")` with browser locale en-US → "06:20 PM", en-GB → "18:20"; `timeFormatter("ru")` on en-US → 12-hour with RU words; money "$9" in both languages; credits "1 000" (RU) / "1,000" (EN) — credits digit grouping is formatted inside the approved CreditsView (not in format.ts), so it is covered by the RU e2e runs, not this unit test
- [X] T029 [P] `design-system/templates.md` Credits entry: add the new states (success, success-first, success-return, declined, shortfall, slots, zero-balance), the per-run row and the payment page (Auth archetype) — documentation only, pointing to `specs/002-credits-flow-mock/ui-spec.md`
- [X] T030 [P] `specs/backend-backlog.md`: add server guarantees from this feature — purchase completes at most once (idempotent provider webhook), history row and balance in one transaction, abandoned checkout expiry owned by the provider session (R5)
- [X] T031 `code-reviewer` sweep of the whole diff (money, purchase idempotency, races, contract handling) before the PR; fix in-scope findings by class
- [X] T032 `verifier`: `npm run build && npm run lint && npm run lint:css && npm run test:unit`, then `npm run test:e2e` (full), `npm run snap`; report real output
- [X] T033 `quickstart-runner`: walk `specs/002-credits-flow-mock/quickstart.md` steps 1–9 in a real browser and report differences — partial, 2026-11-16 (Edge): steps 1, 2, 4, 6, 7 pass; two findings fixed with e2e (stale balance in the success notice, Back to an old outcome); steps 3, 8, 10 and RU plurals 1/3 not walkable in the controlled browser, covered by e2e and unit tests
- [X] T034 Release on the owner's word: `CHANGELOG.md` + `frontend/package.json` minor bump (0.2.0), tag, GitHub release

---

## Dependencies & execution order

- Phase 1 → Phase 2 (T002 first; T003/T004 parallel; T005 → T006 → T007 → T008; T009 after T002) → user stories.
- US1 (T010–T015) needs Phase 2. US2 (T016–T021) needs T010 (same `credits.ts`) and T012 (page). US3 needs US2
  (purchase + success notice). US4 needs US2. Polish after the stories it covers.
- Same-file sequences: `src/services/mock/index.ts` T006 → T007 → T010; `src/services/mock/credits.ts` T010 → T016;
  `CreditsPage.tsx` T012 → T018 → T023; `router.tsx` T013 → T019; `smoke.spec.ts` / `mobile-layout.spec.ts` T015 → T021.

## Parallel examples

- Phase 2: T003 + T004 (rules) alongside T005 (db) — different files.
- US1: T011 (Vitest) alongside T012 (page) once T010 is in.
- US2: T017 (purchase Vitest) alongside T019 (checkout page) once T016 is in.
- Polish: T027, T028, T029, T030 together.

## Implementation strategy

1. **MVP = Phase 2 + US1**: the history is correct and live for everything feature 001 already does — the riskiest
   part (money and history in one transaction) is proven first.
2. **+ US2**: buying through the simulated payment page.
3. **+ US3**: the shortfall round trip (the moment users pay).
4. **+ US4** and polish; full check, design QA (`/speckit-design-qa`, after_implement hook), quickstart walk, PR.

## Notes (T001)

- Views flatten `CreditPack.price.cents` to `priceCents`; the container maps pack snapshots and catalog packs, omitting USD currency and unused pack fields in checkout.
- Purchase history view items flatten `pack.credits` and `pack.price.cents`; run items rename `state` to `runState`, omit `updatedAt` and `projectId`, and derive `projectHref` from `projectId` only while reserved.
- The views need derived account reserve project links, notices, selection, loading/error/busy states, pagination callbacks, current time and navigation callbacks; the container supplies these from account, projects, purchase/return context and query state. Checkout maps awaiting to default and declined to cancelled; prototype-only scenario data and timers are replaced by services and navigation.
