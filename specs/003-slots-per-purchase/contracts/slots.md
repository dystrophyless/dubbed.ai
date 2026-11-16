# Contract changes: slots per purchase

Changes to `frontend/src/services/contracts.ts` and `services/rules/slots.ts` (002 contract: `specs/002-credits-flow-mock/contracts/credits.md`).

## Rules (`services/rules/slots.ts`)

```ts
export const FREE_SLOT_LIMIT = 2;
export const FIRST_PAID_SLOT_LIMIT = 10;   // replaces PAID_SLOT_LIMIT
export const SLOT_STEP = 5;
export const MAX_SLOT_LIMIT = 50;
export type SlotsOffer = "first" | "more" | "max";

slotLimitAfterPurchase(limit: number): number      // 2 → 10; else min(50, limit + 5)
slotLimitForPurchases(completed: number): number   // 0 → 2; n → min(50, 10 + 5(n − 1))
isSlotLimit(n: number): boolean                    // 2 | 10 | 15 | … | 50
slotsOffer(limit: number): SlotsOffer              // 2 → first; 10…45 → more; 50 → max
```

Existing `slotsUsed`, `canCreate`, `canReplaceVideo` are unchanged.

## Types (`services/contracts.ts`)

```ts
type Account  = { …; slotLimit: number; … }                       // was 2 | 10
type ReturnTo = { kind: "new"; projectId; need } | { kind: "slots"; from: "new" | "projects" } | null;
type Purchase = { …; firstPurchase: boolean; slotsBefore: number | null; slotsAfter: number | null; … };
demo.set(p: … & { slotLimit?: number; fillSlots?: boolean })      // slotLimit must satisfy isSlotLimit
```

`CreditsPort` methods are unchanged. `pay(id)` on success now also sets `slotsBefore` / `slotsAfter` and raises the
account's `slotLimit` with `slotLimitAfterPurchase`, in its existing single transaction; on `declined` it changes
neither. `startPurchase(packId, returnTo)` stores the new `returnTo` shape as given.

## Routes and URL parameters

| URL | Meaning |
|---|---|
| `/credits?from=slots&back=new` | from New dub's slots notice; "Best value" preselected; success → back to `/new` |
| `/credits?from=slots&back=projects` | from My projects' notice; success → back to `/projects` |
| `/credits?from=slots` (no `back`) | treated as `back=new` (002 links) |
| demo `?demo=slots:<2\|10\|15…50>` | sets the account's limit (existing demo param syntax, widened) |

At `slotsOffer === "max"` Credits ignores `from=slots` (no slots line, no notice).

## Behaviour by limit

| Limit | New dub / My projects when all used | Credits slots line | Success message |
|---|---|---|---|
| 2 | 002 free notice (unchanged) | "first purchase gives 10" | "…now has 10 project slots" |
| 10 – 45 | Buy credits (+5) and Open My projects / delete | "N slots · next purchase adds 5" | "…now has N+5 project slots" (+ "maximum" at 50) |
| 50 | "Delete a project to free a slot", no Buy | none | credits only |
