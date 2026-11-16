# Quickstart: validate the credits flow on mock services

Contracts: [contracts/credits.md](./contracts/credits.md) · rules and states: [data-model.md](./data-model.md).

## Prerequisites

- `cd frontend && npm install` (no new dependencies).
- Chrome or Edge for the manual run.

## Run

```bash
cd frontend
npm run dev            # http://localhost:5174
```

Demo controls (mock only, as in 001; parameters combine with commas): `?demo=reset`, `?demo=balance:40`
(records a "Demo adjustment" row), `?demo=slots:full`, `?demo=outcome:failed@2`, `?demo=speed:4`, and new:
`?demo=payment:success|declined`, `?demo=paydelay:3000` (ms Pay stays busy), `?demo=startdelay:3000` (ms before a purchase is created),
`?demo=fail:start|pay|none` (forces Buy / Pay to fail), and `?demo=slots:10` (paid limit).

## Manual end-to-end check (≈ 5 min)

1. **Balance and history (US1)** — `/credits?demo=reset`: balance 120, "about 2 min of dubbing", no reserve; history has
   one row "Welcome credits +120". The top-bar balance pill is hidden here and visible on `/projects`.
2. **Run rows** — `/new?demo=speed:4` → upload `public/media/scene.mp4` → Start (14 credits) → open `/credits` in a
   second tab while it prepares: balance 106, "14 in reserve", one row "Scene · 14 in reserve"; when it becomes ready
   the row reads "14 charged" without a reload.
3. **Failure and cancel** — `?demo=outcome:failed@2` + a new dub → Credits row "Returned — service failure, nothing
   charged", balance back; Try again → a new row in reserve. Cancel another project after step 1 → its row reads
   "c charged, r returned" with the quoted amounts.
4. **Buy (US2)** — on Credits the "Best value" pack (1 000 · $9) is preselected; Buy → button busy → the payment page
   `/checkout/<id>`: pack, "$9", "Demo payment — no real money", "Pay $9", "Back to Dubbed"; no provider name, no card
   fields. Pay → back on Credits: +1 000, history row title "Pack · 1,000 credits" (RU «Пакет · 1 000 кредитов»),
   subtitle "$9 · Demo payment · <time>"; time follows the browser locale's 12/24-hour cycle and words follow the UI
   language. Success: "1,000 credits added" / "Your balance is now N." (+ "Your account now has 10 project slots."
   on first purchase). Bought pack stays selected. Reload → nothing doubles.
5. **Declined / back** — `?demo=payment:declined` → Buy → Pay → Credits says the payment didn't go through and nothing
   was charged; pack still chosen. Buy → on the payment page press browser back → Credits in default state, no row.
6. **Abandoned** — Buy → close the payment tab → open `/credits` → no pending state; reopening the old `/checkout/<id>`
   says the payment was cancelled and never charges.
7. **Back to New dub (US3)** — `/new?demo=reset,balance:5` → choose `scene.mp4` (14 credits) → Start disabled,
   "9 more credits needed" → Buy credits → Credits says "You need 9 more credits for Scene", 300-credit pack
   preselected → Buy → Pay → "Back to New dub" → same video and section, "Start dubbing · 14 credits" enabled.
   (The spec's 72-credit example needs a clip longer than 72 s; any local MP4 works the same way.)
8. **Two tabs (US4)** — Credits open in two tabs; buy in one → the other tab's balance, history and (on another page)
   top-bar pill update without a reload.
9. Switch to RU on Credits and the payment page: plurals («1 кредит», «3 кредита», «5 кредитов»), «1 000», "$9".
10. **Buy / Pay errors** — `?demo=fail:start`: Buy shows "Couldn't start the payment. Nothing was charged — try again."; the danger-tone inline error keeps the pack chosen and Buy retries. Retry succeeds once. `?demo=fail:pay`: Pay shows "The payment didn't go through. Nothing was charged — try again."; the danger-tone inline error keeps the pack chosen and Pay retries. Retry succeeds once.
11. **Paid 10/10 slots** — `?demo=slots:10,slots:full`: New dub shows "No free project slot · Delete a project to free a slot" and only "Open My projects"; My projects shows the slots-full alert with "Delete a project to free a slot" and no "Buy credits"; `/credits?from=slots` shows no slots notice.

## Automated

```bash
cd frontend
npm run build && npm run lint && npm run lint:css && npm run test:unit   # incl. rules/credits + mock/credits tests
npm run test:e2e:quick                                                   # incl. e2e/flow-credits.spec.ts
npm run test:e2e                                                         # before a commit (smoke + mobile layout)
MSYS_NO_PATHCONV=1 node scripts/snap-pages.mjs --base http://localhost:5174 --out <dir> "/credits?demo=reset" "/projects"  # under Git Bash
```

Expected: all green; axe clean on `/credits` (every state) and `/checkout/:id`; the invariant test passes for every
scripted transition (SC-002).
