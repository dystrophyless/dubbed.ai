# Issue 70 accounting QA completion

Date: 2026-10-25 (Asia/Qyzylorda)  
Executor: GPT-6 Luna Max, max effort  
Baseline/current HEAD: `9d286621177200fdb5f61ef963d0b6818ae76774`  
Environment: Windows PowerShell, Node `v22.23.1`, npm `10.9.8`, frontend Vitest/jsdom with fake IndexedDB.  
Worktree: shared and broadly dirty; owner70 added one dedicated service test plus files in this issue's evidence directory. See [worktree boundary](evidence/worktree-boundary.txt).

## Result

No reproducible ledger defect was found. The frozen review's three findings are downstream history or shared-control findings, not evidence of accounting corruption. Existing accounting and identity tests covered the listed service invariants except for an explicit assertion that observational history reads leave backing accounting stores unchanged. Added that single regression in `frontend/tests/services/accounting-invariants.test.ts`; no ledger, purchase, reservation, or UI implementation code changed.

The new test records the raw credit state, ledger rows, and pending purchase before reading history; it calls both `history()` and `historyPage()` twice; it confirms the purchase remains pending with null delta/balance-after and its captured pack facts; then it compares the stored accounting records byte-for-structure with the baseline.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Focused accounting service suite | **PASS — 10 files / 45 tests** | Raw log: [focused-service-suite.log](evidence/focused-service-suite.log) |
| Scope | Includes stale reservation/replay, 1,001 ms single-ceil quote, reservation vs settlement, cancellation/release, zero-turn initial success and one included retry, grant identity, unknown/verified purchase reconciliation, stable and legacy history facts, project/account deletion with late work, plus the new observational-read invariant. | `frontend/tests/services/` |

Command from `frontend/`:

```text
npm.cmd test -- tests/services/accounting-invariants.test.ts tests/services/credit-reservation-concurrency.test.ts tests/services/credits-activity.test.ts tests/services/checkout-simulation.test.ts tests/services/preparation-recovery.test.ts tests/services/core-services.test.ts tests/services/active-project-deletion.test.ts tests/services/account-deletion-late-work.test.ts tests/services/identity-google.test.ts tests/services/identity-linking-recovery.test.ts
```

The run used the local mock and fake IndexedDB only. It did not contact a backend or payment provider. It was not a full suite, build, or global typecheck.

## Canonical QA-70 dispositions

| QA ID | Disposition | Owner and evidence |
| --- | --- | --- |
| QA-70-01 | **Resolved and verified consumed.** History now labels each fact as `Change`, `Available after`, and `Reserved after`; purchase status is joined observationally through its stable operation identity, new attempts carry captured pack facts, and legacy attempts without those facts do not infer them from today's catalog. | Issue65 implements the history consumer and its focused tests. The current row uses `dl`/`dt`/`dd` field associations at `CreditsScreen.tsx:1019–1035`. The new owner70 service regression verifies repeated reads do not change credit state, ledger, or purchase records. See [issue65 receipt](../issue-65/completion.md). |
| QA-70-02 | **Resolved and verified consumed.** Aggregate held credits are labeled `In processing` / `В обработке` and explained as held for active processing, not a final charge. The ledger keeps reservations separate from posted settlement. | Issue65 owns the consumer copy and its rendered evidence. Focused owner70 service tests cover reserved state before authoritative completion, exactly one settled charge, release/failure paths, and retry behavior. See [issue65 receipt](../issue-65/completion.md). |
| QA-70-03 | **Resolved through shared control issue78 and verified consumed.** Credits actions use the shared default `medium` Button role; the screen passes no local size prop. Shared roles are 40px task, 44px prominent, and 48px phone. Credits CSS has no desktop button-height/shrink override; its phone 48px minimum is consistent with the shared role. | Source audit confirmed `medium` is the Button default and Credits actions omit `size`; issue65 measured its checkout/recovery actions at 40px desktop and 48px phone, while issue78 owns shared role implementation and measurements. See [issue65 receipt](../issue-65/completion.md) and [issue78 receipt](../issue-78/completion.md). |

The original review's finding counts remain HIGH 0 / MEDIUM 1 / LOW 2; all three canonical QA IDs above are now resolved by their designated owners. Owner70 created no screenshots. Existing issue65/78 visual artifacts retain their original ownership and are evidence of presentation only, not proof of ledger behavior.

## Limits and delivery boundary

- Evidence is for synthetic local mock accounting. It does not establish production ledger atomicity, payment security, real provider behavior, backend transactions, or an approved commercial/allocation policy.
- No browser capture or screen-reader session was run by owner70. Issue65/78 completion records and the Orchestrator's separately inspected screenshots own the consumer presentation evidence.
- No changes were made to accounting logic, current contracts, shared controls, Credits CSS, or the active #72 mock-preparation/recording/result code.
- No commit, push, GitHub update, issue closure, full suite, build, or global typecheck was performed. Final integration acceptance remains with the Orchestrator and issue #63.
