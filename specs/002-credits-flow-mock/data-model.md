# Data model: Credits flow on mock services

Extends `specs/001-recording-flow-mock/data-model.md`. Amounts are whole credits (int ≥ 0); times are epoch ms.

## Account (unchanged shape)

| Field | Rule |
|---|---|
| `balance` | spendable credits |
| `reserved` | sum of `reserved` over projects (derived) |
| `slotLimit` | 2; becomes 10 in the transaction that completes the **first** purchase; never goes back |
| `slotsUsed` | as 001 |

## CreditPack

| Field | Rule |
|---|---|
| `id` | `"s" \| "m" \| "l"` in the mock |
| `credits` | 300 · 1 000 · 3 000 (placeholders, brief §5) |
| `priceCents` + `currency` | 300 · 900 · 2 400, `"USD"` |
| `best` | true for exactly one pack (`m`) |
| `minutes` | derived: `floor(credits / 60)` |

## Purchase

| Field | Rule |
|---|---|
| `id` | opaque string |
| `packId`, `credits`, `priceCents`, `currency` | copied from the pack at start (later price changes don't affect it) |
| `state` | `awaiting` → `completed` \| `declined` \| `cancelled` (terminal; one transition only) |
| `returnTo` | `{ kind: "new", projectId, need } \| { kind: "slots" } \| null` |
| `checkoutUrl` | mock: `/checkout/<id>`; real: the provider's URL |
| `firstPurchase` | set on completion: true when it raised slotLimit to 10 |
| `createdAt`, `finishedAt` | |

Transitions:

- `startPurchase` → new `awaiting`.
- `pay` on `awaiting` → after `paymentDelayMs`, `completed` (balance += credits, history row `purchase`, slotLimit 10 if
  first) or `declined` (nothing else changes), per `DemoSettings.payment`. On any other state → returns it unchanged.
- `cancelPurchase` on `awaiting` → `cancelled`; otherwise unchanged.
- `sweep(keep)` → every `awaiting` except `keep` → `cancelled` (R5).

## HistoryRow

| Field | Rule |
|---|---|
| `id` | opaque; for runs = `runId` |
| `kind` | `welcome` \| `purchase` \| `run` \| `adjustment` (mock-only, demo presets / upgrade) |
| `at` | creation time (runs: Start / Try again time); sorting newest first by `at` |
| `updatedAt` | last change (runs) |
| `amount` | signed effect on spendable + reserved: welcome +120, purchase +credits, adjustment ±n, run −(reserved + charged) |
| `purchase` | for `purchase`: `{ packId, credits, priceCents, currency }` |
| `run` | for `run`: `{ projectId, projectName, reserved, charged, returned, state }` |

Run state (from the run's own money, set in the transaction that moves it):

| Event (001) | `reserved` | `charged` | `returned` | `state` | shown (EN) |
|---|---|---|---|---|---|
| Start / Try again | price | 0 | 0 | `reserved` | "N in reserve" |
| ready / no dialogue (settle) | 0 | price | 0 | `charged` | "N charged" |
| cancel while waiting | 0 | 0 | price | `returned` | "N returned" |
| cancel after k steps | 0 | c | price − c | `partly_charged` | "c charged, price − c returned" |
| service failure (refund) | 0 | 0 | price | `failed_returned` | "Returned — service failure, nothing charged" |

- Try again after a failure creates a **new** run row; the failed run's row stays `failed_returned`.
- `projectName` is the name at Start; renames and deletion don't change the row.
- Declined / cancelled purchases create no row.

## Invariant (FR-011)

Two equivalent forms, both checked by Vitest after every scripted transition and by the e2e flow (spec SC-002):

- `balance = Σ amount` over all history rows (a run's amount −(reserved + charged) is what left the spendable balance);
- `balance + reserved = welcome + Σ completed purchases ± adjustments − Σ run.charged` (the spec's wording).

Example: welcome 120, Start 73 → balance 47, reserved 73, run −73: 47 = 120 − 73 and 47 + 73 = 120 − 0.

## DemoSettings (additions)

| Field | Default | Purpose |
|---|---|---|
| `payment` | `"success"` | outcome of Pay: `"success" \| "declined"` |
| `paymentDelayMs` | 1 200 | time Pay is busy |

`demo.set({ balance })` writes an `adjustment` row for the difference; `demo.reset()` clears `history` and `purchases`
and writes the welcome row.
