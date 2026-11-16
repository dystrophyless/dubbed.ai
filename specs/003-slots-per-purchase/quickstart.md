# Quickstart: More project slots with every purchase

Validates spec US1–US3 on the mock services. Contract details: [contracts/slots.md](./contracts/slots.md); rules and
invariants: [data-model.md](./data-model.md).

## Prerequisites

```sh
cd frontend
npm run dev          # http://localhost:5174
```

Demo state is set with URL parameters (002 syntax): `?demo=reset`, `?demo=slots:<limit>`, `?demo=slots:full`,
`?demo=payment:success|declined`, `?demo=paydelay:0`. Each scenario starts with `?demo=reset`.

## Scenarios

1. **First purchase unchanged (US1-1).** Reset; Credits → buy any pack → Pay. Expect "…now has 10 project slots";
   My projects shows "… of 10". The project slots used line appears only when at least one project exists; check the limit on Credits' slots line or create a project first.
2. **Second purchase +5 (US1-2).** `?demo=slots:10` → Credits shows "10 project slots · the next purchase adds 5" →
   buy the 300-credit pack → Pay. Expect the success message to name 15; My projects shows "… of 15" without reload. The project slots used line appears only when at least one project exists; check Credits' slots line or create a project first.
3. **Reaching the cap (US1-3).** `?demo=slots:45` → buy → Pay. Expect 50 and the "maximum" wording.
4. **At the cap (US1-4, US3-2).** `?demo=slots:50` → Credits has no slots line; buy → Pay. Success mentions credits only;
   limit stays 50.
5. **Declined / back (US1-5).** `?demo=slots:10&demo=payment:declined` → buy → Pay → limit stays 10. Then buy →
   "Back to Dubbed" → limit stays 10.
6. **Notice offers a purchase (US2-1…4).** `?demo=slots:10&demo=slots:full` → New dub shows the slots notice with
   "Buy credits" and "Open My projects" → Buy credits → Credits opens with "Best value" preselected and the "+5 slots"
   line → Pay → "Back to New dub" → a video can be chosen. Repeat from My projects: the way back opens My projects
   showing "… of 15".
7. **Cap notice (US2-5).** `?demo=slots:50&demo=slots:full` → New dub and My projects say "Delete a project to free a
   slot", no Buy credits; `/credits?from=slots&back=new` shows no slots line.
8. **Free notice unchanged (US2-6).** Reset, `?demo=slots:full` → the 002 free notice.
9. **Two tabs (US1-6).** Start at `?demo=slots:10`; buy and Pay in tab A. With Credits or My projects open in tab B, expect the new limit 15 without reload. Pressing Pay twice or pressing Pay on a finished purchase adds nothing. Two purchases completing at 45 yield 50, not 55; this guarantee is covered by the unit test in `src/services/mock/purchase.test.ts` (T007).
10. **Both languages.** Repeat 2, 6 and 7 in Russian (language switch): check «10 мест», «15 мест», «20 мест» and «50 мест»; the free line says «2 места».

## Checks

```sh
npm run build && npm run lint && npm run lint:css && npm run test:unit
npm run test:e2e:quick      # then the full npm run test:e2e before commit
npm run snap                # 1440 × 900 and 390 × 844
```
