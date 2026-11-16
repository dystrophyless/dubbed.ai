# Research: More project slots with every purchase

All spec questions were answered in `/speckit-clarify` (2026-11-16); the decisions below cover how the rule is carried
in the existing 002 code.

## R1 — Where the rule lives

- **Decision**: One pure rule module `services/rules/slots.ts`: `FREE_SLOT_LIMIT = 2`, `FIRST_PAID_SLOT_LIMIT = 10`,
  `SLOT_STEP = 5`, `MAX_SLOT_LIMIT = 50`, `slotLimitAfterPurchase(limit)` (2 → 10, otherwise `min(50, limit + 5)`),
  `isSlotLimit(n)` (2, 10, 15, …, 50), `slotsOffer(limit)` → `"first" | "more" | "max"` (what the next purchase does),
  `slotLimitForPurchases(count)` (0 → 2, n → `min(50, 10 + 5·(n−1))`, used by tests and the demo).
- **Rationale**: FR-010 asks for one shared rule; the UI (notices, Credits line) and the mock (purchase completion) read
  the same functions, and Vitest covers them exhaustively (0…12 purchases).
- **Alternatives**: computing in each screen (duplicated, drifts); storing only a purchase counter (see R2).

## R2 — What the mock stores

- **Decision**: keep the account record's `slotLimit` as the stored value (type widened from `2 | 10` to `number`) and
  raise it with `slotLimitAfterPurchase` inside the same IndexedDB transaction that completes the purchase (the 002
  `pay` transaction). No counter, no schema upgrade.
- **Rationale**: applying the step once per completed purchase is equivalent to FR-001's "limit follows from the number
  of completed purchases" (`slotLimitForPurchases` is the closed form, checked by tests); existing demo data with 2 or
  10 stays valid; the 002 transaction already guarantees a purchase completes once (FR-002, two tabs, double Pay), so
  each completion adds at most 5 and the `min(50, …)` keeps the cap under any interleaving.
- **Alternatives**: a `completedPurchases` counter with the limit derived on read — needs a v2 → v3 upgrade and a
  backfill for no user-visible gain; recounting the `purchases` store on every read — slower and couples reads to
  purchase history.

## R3 — What the purchase remembers for its success message

- **Decision**: `Purchase` gets `slotsBefore: number | null` and `slotsAfter: number | null` (set on completion; `null`
  while awaiting / declined / cancelled). `firstPurchase` stays as a derived boolean for the existing 002 code paths
  (`slotsBefore === 2`). The success notice shows the slots sentence when `slotsAfter > slotsBefore`, and the "maximum"
  wording when `slotsAfter === 50`.
- **Rationale**: FR-003 needs the limit this purchase produced, not the account's current one (a later purchase in
  another tab may already have raised it). Old 002 purchases without the fields read as "no slots change".

## R4 — The way back from a slots notice

- **Decision**: `ReturnTo` `{ kind: "slots" }` gains `from: "new" | "projects"`; the notices link to
  `/credits?from=slots&back=new|projects`; after success the notice's primary action returns to `/new` or `/projects`.
  Credits keeps the "Best value" pack preselected (owner, 2026-11-16). The slots context is dropped only at 50
  (`slotsOffer === "max"`), replacing 002's "paid → no context" rule.
- **Rationale**: spec US2 / FR-007 ("back to where they came from"); 002 always returned to `/new`.

## R5 — Demo and tests

- **Decision**: demo param `slots=<limit>` accepts every `isSlotLimit` value (2, 10, 15, …, 50) instead of only 2 / 10;
  `slots=full` keeps filling up to the current limit. `services.demo.set({ slotLimit })` validates with `isSlotLimit`.
- **Rationale**: SC-002's scripted cases (45 → 50, at 50, 10 of 10) must be reachable in e2e without nine purchases.

## R6 — Screens touched

- **Decision**: no new routes or archetypes. Changes inside approved screens: New dub "No free project slot" notice and
  My projects "All project slots are used" notice (three variants: free / below cap / at cap), Credits slots notice
  and success notice wording, and a slots line near the packs (US3). They go through `/speckit-design`
  (ui-designer, routine — not design-architect) for owner approval.
