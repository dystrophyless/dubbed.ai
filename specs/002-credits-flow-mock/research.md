# Research: Credits flow on mock services

No open `NEEDS CLARIFICATION` in the spec or the technical context. Decisions below settle the "how" questions the spec
leaves to the plan.

## R1. Where the history comes from

- **Decision**: A stored `history` store with one row per welcome grant, completed purchase and project run. A run row
  is created on Start / Try again and updated **in the same IndexedDB transaction** that moves the money (settle,
  refund, cancel). `ProjectRecord` gains `runId` pointing at its current row.
- **Rationale**: Cancelled projects are deleted (ia.md lifecycle) and deleted projects disappear, so the history cannot
  be derived from projects. Writing the row with the money makes FR-011 hold by construction and matches the backend
  backlog guarantee "money and state are decided in one transaction".
- **Alternatives**: an append-only movement log rendered as one row per run (rejected — the owner chose per-run rows;
  a log would still need folding and the mock gains nothing); deriving from projects (impossible after deletion).

## R2. Existing demo data (IndexedDB v1 → v2)

- **Decision**: On upgrade, seed a welcome row (+120, at the earliest project's `createdAt` or now) and one run row per
  existing project with `reserved > 0` or `charged > 0` (state from its money); then, if balance + reserved ≠ 120 −
  charged, add one `adjustment` row for the difference. `demo.reset()` clears both stores and writes the welcome row.
- **Rationale**: Owner and testers have demo state from 0.1.x; the page must not open with an impossible history.
- **Alternatives**: wipe the demo on upgrade (loses the owner's test projects).

## R3. Demo balance presets

- **Decision**: `demo.set({ balance })` writes an `adjustment` row ("Demo adjustment" / «Корректировка (демо)») for the
  difference. The kind exists only in the mock; the real adapter never returns it.
- **Rationale**: Tests (spec US3: "set the demo balance to 40") must keep the invariant; a visible row is honest.
- **Alternatives**: silently change the balance (breaks FR-011 and SC-002).

## R4. Purchase and the simulated payment page

- **Decision**: `credits.startPurchase(packId, returnTo)` creates a `Purchase` (`awaiting`) and returns its
  `checkoutUrl` — in the mock `/checkout/<id>`; the real adapter will return the provider's URL. The payment page calls
  `getPurchase`, `pay` and `cancelPurchase`. `pay` is idempotent: it completes or declines only an `awaiting`
  purchase; any other state returns the purchase unchanged. Completion adds the credits, the history row and (first
  purchase) slotLimit 10 in one transaction. Outcome and delay of Pay come from `DemoSettings.payment`
  (`"success" | "declined"`, default success) and `paymentDelayMs` (default 1 200 ms).
- **Rationale**: Mirrors a hosted checkout (Stripe-style redirect + return URL) without naming any provider, so the
  later swap changes only the adapter. Idempotent Pay covers double clicks and two tabs.
- **Alternatives**: in-page simulation (rejected by the owner, 2026-11-15).

## R5. Abandoned purchases

- **Decision**: "Back to Dubbed" and the browser back button on the payment page call `cancelPurchase`. Opening
  Credits calls `credits.sweep(keep?)`, which turns every `awaiting` purchase into `cancelled` except the one named in
  `?purchase=<id>`. A payment page whose purchase is no longer `awaiting` shows "This payment was already completed" /
  "This payment was cancelled" with "Back to Dubbed" and never charges.
- **Rationale**: Exactly the spec rule ("counted as cancelled when the user next opens Credits"); nothing is ever
  pending on screen; one simple rule to test. A payment page left open in another tab then honestly says it was
  cancelled — acceptable for a demo. The real provider owns expiry later (backend backlog).
- **Alternatives**: a heartbeat from open payment pages so they are not swept (more mock machinery for a corner case);
  expiry by age only (leaves a purchase pending until it expires).

## R6. Return to where the user came from

- **Decision**: Credits reads `?from=new&project=<id>&need=<n>` or `?from=slots`; it stores `returnTo` on the
  Purchase, so the payment page sends the user back to `/credits?purchase=<id>` and Credits rebuilds the context from
  the purchase. "Back to New dub" → `/new?project=<id>` (the draft keeps video and section — feature 001). Pack
  preselection: smallest pack with credits ≥ need, else the largest; with no need the "Best value" pack.
- **Rationale**: URL state survives reloads and the round trip; the draft is already durable.
- **Alternatives**: Zustand / sessionStorage (lost across the provider redirect on a real backend).

## R7. Messages after the payment

- **Decision**: The outcome message is driven by `?purchase=<id>` and the purchase state: completed → success Alert
  (credits added, + "You now have 10 project slots" on the first purchase, + "Back to New dub" primary when `returnTo`
  says so); declined → warning Alert "The payment didn't go through. Nothing was charged." with the pack kept;
  cancelled → no message. Exact layout and copy come from the ui-spec.
- **Rationale**: Reload-safe and testable; one source of truth (the purchase).

## R8. Live updates and the top bar

- **Decision**: New `ChangeEvent` kinds `credits` (balance / history) and `purchase` (with `purchaseId`); every money
  transition in 001 already emits `project` — it additionally invalidates `qk.credits.history`. `ProductShell` hides
  the balance pill when the location is `/credits`.
- **Rationale**: Reuses the 001 BroadcastChannel invalidation; no polling.

## R9. Money formatting and plurals

- **Decision**: `Intl.NumberFormat(lang)` for credits (grouped digits; RU uses a narrow no-break space) and
  `Intl.NumberFormat(lang, { style: "currency", currency: "USD", maximumFractionDigits: 0 })` for prices; plurals via
  i18next `_one/_few/_many/_other`. Placeholder packs: 300 · $3, 1 000 · $9 (best), 3 000 · $24 (template `DEMO_PACKS`).
- **Rationale**: Matches the template and the Credits copy in `content.md`.
