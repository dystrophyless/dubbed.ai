# Data Model: More project slots with every purchase

Extends `specs/002-credits-flow-mock/data-model.md`; only the changes are listed.

## Account (services contract)

| Field | Type | Change | Rule |
|---|---|---|---|
| `slotLimit` | number | widened from `2 \| 10` | always `isSlotLimit`: 2, 10, 15, 20, …, 50 |
| `slotsUsed` | number | unchanged | projects in any state except cancelled |

Derived in the UI from `slotLimit` via `slotsOffer(slotLimit)`:

| `slotLimit` | `slotsOffer` | Next completed purchase |
|---|---|---|
| 2 | `first` | → 10 |
| 10 … 45 | `more` | → `slotLimit + 5` |
| 50 | `max` | stays 50 |

Closed form (FR-001): `slotLimitForPurchases(n) = n === 0 ? 2 : min(50, 10 + 5 × (n − 1))` — 50 is reached at the
9th completed purchase.

## Purchase

| Field | Type | Change | Rule |
|---|---|---|---|
| `slotsBefore` | number \| null | new | account limit read inside the completing transaction; `null` unless `completed` |
| `slotsAfter` | number \| null | new | `slotLimitAfterPurchase(slotsBefore)`; `null` unless `completed` |
| `firstPurchase` | boolean | kept | `slotsBefore === 2` |
| `returnTo` | ReturnTo | slots variant gains `from` | `{ kind: "slots"; from: "new" \| "projects" }` |

State transitions are unchanged from 002 (`awaiting → completed | declined | cancelled`, at most once). Only the
`awaiting → completed` transition touches `slotLimit`, in the same transaction as the balance and the history row.

## Invariants

- `slotLimit` never decreases (no purchase refunds; deleting projects frees slots, it does not lower the limit).
- `slotLimit ≤ 50` after any interleaving of completions (each completion applies `min(50, limit + 5)` atomically).
- For a demo state built only by purchases: `slotLimit === slotLimitForPurchases(completed purchases)`.
- Declined, cancelled and swept purchases leave `slotLimit` unchanged.
- Demo reset → `slotLimit = 2`.
