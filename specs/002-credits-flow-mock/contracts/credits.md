# Contract: credits (services layer)

Additions to `frontend/src/services/contracts.ts` (001 contract: `specs/001-recording-flow-mock/contracts/services.md`).
Expected failures come back as typed `Outcome`s, never as thrown errors. The mock implements it in the browser; a real
HTTP adapter + payment provider implement the same port later without changes to the screens.

## Types

```ts
type Money = { cents: number; currency: "USD" };

type CreditPack = { id: string; credits: number; price: Money; best: boolean };

type ReturnTo =
  | { kind: "new"; projectId: ProjectId; need: number }
  | { kind: "slots" }
  | null;

type PurchaseState = "awaiting" | "completed" | "declined" | "cancelled";

type Purchase = {
  id: PurchaseId;
  pack: CreditPack;              // snapshot at start
  state: PurchaseState;
  returnTo: ReturnTo;
  checkoutUrl: string;           // mock: "/checkout/<id>" (in-app route); real: the provider's page
  firstPurchase: boolean;        // true once completed if it raised the slot limit to 10
  createdAt: number;
  finishedAt: number | null;
};

type RunState = "reserved" | "charged" | "returned" | "partly_charged" | "failed_returned";

type HistoryRow =
  | { id: string; kind: "welcome"; at: number; amount: number }
  | { id: string; kind: "purchase"; at: number; amount: number; pack: CreditPack }
  | { id: string; kind: "adjustment"; at: number; amount: number }            // mock only
  | {
      id: string; kind: "run"; at: number; updatedAt: number; amount: number;
      projectId: ProjectId; projectName: string;
      reserved: number; charged: number; returned: number; state: RunState;
    };

type HistoryPage = { rows: HistoryRow[]; page: number; pages: number };
```

## Port

```ts
interface CreditsPort {
  packs(): Promise<CreditPack[]>;

  /** newest first; page ≥ 1; page size 20 */
  history(page: number): Promise<HistoryPage>;

  /** creates an awaiting purchase; Credits then navigates to purchase.checkoutUrl */
  startPurchase(packId: string, returnTo: ReturnTo): Promise<Outcome<Purchase, "pack" | "storage">>;

  getPurchase(id: PurchaseId): Promise<Outcome<Purchase, "not-found">>;

  /** idempotent: completes or declines only an awaiting purchase; otherwise returns it unchanged */
  pay(id: PurchaseId): Promise<Outcome<Purchase, "not-found" | "storage">>;

  /** awaiting → cancelled; otherwise unchanged */
  cancelPurchase(id: PurchaseId): Promise<Outcome<Purchase, "not-found">>;

  /** called when Credits opens: every awaiting purchase except `keep` → cancelled */
  sweep(keep?: PurchaseId): Promise<void>;
}

interface Services {
  // …001 ports…
  credits: CreditsPort;
}
```

`pay` and `cancelPurchase` live in the port (not in the payment page) so the mock page and a future provider webhook
settle purchases through the same rules. With the real adapter, `pay` is not called by the SPA — the provider confirms
and Credits reads `getPurchase` on return.

## Changes to the 001 contract

- `DemoSettings` += `payment: "success" | "declined"`, `paymentDelayMs: number`.
- `demo.set({ balance })` records an `adjustment` history row for the difference; `demo.reset()` restores the single
  welcome row and no purchases.
- `ChangeEvent.kind` += `"credits"` (balance or history changed) and `"purchase"` (with `purchaseId`). Every 001
  transition that moves money (start, retry, settle, refund, cancel) also emits `"credits"`.
- `Account` unchanged; `slotLimit` becomes 10 when the first purchase completes.

## Query keys and hooks (`services/index.tsx`)

| Key | Hook | Invalidated by |
|---|---|---|
| `["credits", "packs"]` | `usePacks()` | never (static) |
| `["credits", "history", page]` | `useCreditsHistory(page)` | `credits`, `purchase`, `project`, `removed` |
| `["purchase", id]` | `usePurchase(id)` | `purchase` with that id |
| `["account"]` (001) | `useAccount()` | + `credits`, `purchase` |

## Routes

| Route | Shell | Reads | Calls |
|---|---|---|---|
| `/credits?from=new&project=<id>&need=<n>` · `?from=slots` · `?purchase=<id>` | AppShell, balance pill hidden | account, packs, history, purchase | `sweep`, `startPurchase` |
| `/checkout/:purchaseId` | none (stands in for the provider) | purchase | `pay`, `cancelPurchase` |

After `pay` or `cancelPurchase` the payment page replaces its history entry with `/credits?purchase=<id>`, so the
browser back button from Credits never lands on a finished payment page.
