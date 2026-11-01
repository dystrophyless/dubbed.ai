# Issue 65 implementation receipt

Date: 2026-10-25  
Environment: local mock frontend on `http://127.0.0.1:4565`; Windows; no payment provider or backend.  
Worktree boundary: shared dirty repository; only the task-owned Credits, mock-credit contract/service, return-intent helper/tests, and this evidence directory were changed. No commit, push, or GitHub update was made.

## Finding dispositions

| Finding | Disposition | Evidence and limit |
| --- | --- | --- |
| QA-65-01 | Implemented | A known pending purchase is reconciled automatically while mounted by stable initiation ID, with a manual status check retained. The focused test promotes a pending purchase to verified and confirms one apply without pressing the simulation control. No real provider was exercised. |
| QA-65-02 | Implemented | The pending purchase is present in history immediately. Its ledger row keeps its identity while the related purchase state changes. New attempts persist an immutable mock pack snapshot; legacy attempts without a snapshot omit unavailable historical amounts/credits rather than reading the current catalog. Catalog-change and legacy-record regressions pass. |
| QA-65-03 | Implemented | A validated saved-source context exposes “Return to video” after failure/cancellation, and the action reopens the source with the saved selection. It never submits processing. See desktop source-return capture and `trace.json`. |
| QA-65-04 | Producer seam implemented; consumer pending | Credits writes a one-use, account-scoped `refresh-credit-quote` session hint before returning. It is only routing intent, not authority; the consumer must revalidate context and request a fresh quote. Source/range restoration and the hint are verified. Automatic fresh-quote behavior is **not claimed** until task 81 integrates and proves the consumer. |
| QA-65-05 | Implemented | Checkout and recovery actions use the shared default medium Button role. Fresh measurements show 40px desktop and 48px phone controls. Credits CSS has no local button shrinking. |
| QA-65-06 | Implemented | History uses explicit `dt`/`dd` labels and a stacked phone layout. Fresh English and Russian phone captures measure history labels at 14px/20px with no horizontal overflow at 390px. |
| QA-68-01 (owned duplicate) | Implemented | An unresolved start keeps its initiation and operation IDs through repeat click and remount. Only after resolving the original operation as `not-started` does retry occur, using the exact same IDs. |
| QA-70-01 (owned duplicate) | Implemented | History amounts are explicitly labeled “Change”, “Available after”, and “Reserved after” (Russian equivalents in the Russian UI). Ledger accounting values remain unchanged. |
| QA-70-02 (owned duplicate) | Implemented | Aggregate reserved credits are labeled “In processing” / “В обработке”, with explanatory copy that the credits are held for active processing and are not a final charge. |
| QA-70-03 (shared control duplicate) | Consumed by shared task 78 | Credits uses the shared medium default; no local control-size override was added. |

## Contract and storage notes

- `LedgerEntry.relatedPurchase` is optional observational lifecycle metadata joined by stable `relatedOperationId`. Ledger `kind`, `delta`, `availableAfter`, and `reservedAfter` stay immutable accounting facts.
- New mock purchases persist an optional `PurchasePackSnapshot` at initiation. The service exposes it through the purchase snapshot and related history metadata. Legacy records without a snapshot do not inherit current catalog values.
- The return helper exports `readCreditsReturnIntent(accountId)`, `writeCreditsReturnIntent(intent)`, and `removeCreditsReturnIntent(accountId, expected?)`. Its payload is version 1 with `intent: 'refresh-credit-quote'`, account/project/source identifiers, source revision, canonical selection revision/range, and optional purchase ID. Matching ignores volatile project activity revision. Removal requires the expected marker; the helper is account-scoped and has no invented TTL.
- If the quote-hint key write fails while the separate `.new-project` pointer remains writable, Credits can navigate to the validated source and leaves the original return context available for manual quote recovery. Global session-storage denial also blocks the project-pointer write; Return is then blocked with the existing warning notice. This is not a global-denial navigation-success claim, and neither failure mode was injected in the browser run.

## Verification

| Command / run | Result |
| --- | --- |
| `npm.cmd run typecheck` (`frontend`) | PASS — `tsc -b --pretty false`. |
| `npm.cmd test -- src/app/credit-return-intent.test.ts src/features/credits/CreditsScreen.test.tsx tests/services/credits-activity.test.ts` (`frontend`) | PASS — 3 files, 18 tests. Includes pending-to-verified reconciliation, unknown-start persistence/remount/retry IDs, history labels/status, immutable new-pack snapshot across catalog change, and honest legacy fallback. |
| `node _docs/evidence/visual-qa-fixes-2026-10-25/issue-65/capture-issue65.cjs` | PASS — fresh Playwright flow on port 4565 using a synthetic local account/video and mock checkout only. The script asserts saved source/range restoration, one-time hint presence, no processing action, readable phone labels, and no 390px horizontal overflow. No page errors were recorded. |

Fresh captures: `01-en-desktop-failed-history.png`, `02-en-desktop-pending-history.png`, `03-en-desktop-returned-source.png`, `04-en-phone-pending-history.png`, and `05-ru-phone-pending-history.png`. Supporting files: `metrics.json`, `trace.json`, and `capture-issue65.cjs`. The browser setup directly seeded the mock available balance from 120 to 2 credits only to reach the insufficient-credit return flow; it is documented as synthetic setup, not a ledger or payment outcome.

The local server was stopped after capture. Verification establishes local mock behavior only; task 81 must still consume the return hint and prove the fresh quote path.

## 2026-10-25 integration follow-up — QA-65-04

The preceding QA-65-04 disposition records the original receipt boundary. Task 81 has since completed the native consumer integration. Current status: **producer and consumer integrated and verified in the local mock flow**.

The task 81 receipt reports the owned NewDub test command `npm.cmd test -- src/features/new-dub/NewDubScreen.test.tsx` passing **10 tests**. Its native verified-return journey wrote one return hint, matched the restored account/project/source revision/selection, removed that exact hint after one fresh quote, and left processing for an explicit user action. The recorded project quote row and quote operation each increased from 1 to 2; processing-start operations, preparations, and reservations each remained at 0. No automatic process start or reservation occurred.

Evidence: [task 81 Completion.md](../issue-81/Completion.md), [task 81 summary.json](../issue-81/summary.json), [task 81 browser-metrics.json](../issue-81/browser-metrics.json), and the [native verified-purchase return capture](../issue-81/evidence/07-en-native-verified-purchase-return-current-quote.png). This is local mock evidence, not production billing evidence.
