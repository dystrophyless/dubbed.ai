# Foundation cohort: delegated acceptance

Decision: the Orchestrator accepts the bounded mock-runtime and services increments in issues #67, #68, #70, and #73 on 2026-10-24 (Asia/Qyzylorda), subject to delivering the exact reviewed dependency cohort. The acceptance source is the owner's full-cycle implementation/closure request and the standing rule-based acceptance delegation in AGENTS.md. This is not human visual approval of the other screen issues.

Delivery is still pending. These issues must remain open until their in-scope changes are committed, pushed successfully, and verified on the intended remote branch. The delivery receipt must supply the actual commit and remote verification; this document does not assert either happened.

## Verified boundary

Checkout: `D:\Program\python\Dubbed`, `main`, base HEAD `35d122949ad0e07a7e365bcbd4c1ec69202796c3`, plus the active frontend working tree. Node 22.23.1, npm 10.9.8, Windows, local mock services. `root-delivery-freeze-before.json` records 124 production-source and unit/service-test files. `root-delivery-freeze-after.json` confirms all 124 unchanged through verification at 03:54:17 +05:00.

- `npm.cmd test`: 44 files / 210 tests passed, 44.95 seconds; `root-delivery-unit.log`.
- `npm.cmd run typecheck`: passed; `root-delivery-typecheck.log`.
- `npm.cmd run build`: passed at the same production-source hashes; `root-frozen-cohort-build.log`. The only subsequent change inside the 124-file boundary was the tested AccountLinking unit-test readiness barrier before the final freeze. Vite emitted its advisory warning for a 893.54 kB JavaScript chunk.
- `npm.cmd run lint`: exit 0 with warnings; `root-frozen-cohort-lint.log`. This is not a warning-free claim.
- The 13 stable mock browser suites passed together: 92 / 92, no skips, 3.3 minutes; exact command/output in `root-delivery-browser.log`. They include native registration-to-recording-to-result/download, identity/account recovery, microphone lifecycle, shared controls, auth states, and Processing states.
- `npm.cmd run test:e2e:real`: 1 / 1 passed; `root-cohort-real-unavailable.log`. Explicit real mode displays unavailable and makes no external service request in the tested path.
- `npm.cmd run test:media`: 3 / 3 passed; `root-privacy-cohort-media.log`.
- Independent current services run: 21 files / 78 tests passed; `root-privacy-and-history-services.log`.

Browser output was muted and capture used fake devices. No physical microphone, production credentials, backend, payment provider, or real renderer was used.

After that 92-case functional run, the auth visual spec gained a test-only inline-error geometry assertion and two-frame paint barrier. Its focused proof case passed 1/1 and its Russian screenshot was recaptured/inspected; final spec SHA-256 is `9EEECF4CB8C9B3E5108F5C183C7F367B58DE0150CF3C965F7A1B78C7D6337FFC`. Product source did not change. The earlier transient screenshot is not visual proof of the error text; the later focused receipt supersedes it. The complete 92-case run was not repeated solely for that capture-readiness assertion.

## Criterion decisions

| Issue | Accepted criteria and evidence |
| --- | --- |
| #67 | AC-01: `runtime-clean-install-2026-10-24/receipt.md`, its manifest/logs, and the current build prove the recorded clean install and backend-free mock runtime. The clean-install snapshot is dated separately; the package lock is unchanged. AC-02: current unit/browser results plus the preserved controlled broken-mount failure/restored-pass receipt (`controlled-mount-regression-after-origin-fix.json`). AC-03: directly reviewed `src/test/setup.ts`, injected IndexedDB/namespace isolation, and reproducible tests. AC-04: explicit unavailable-real browser check. Runtime/tooling readiness is recorded in `frontend/README.md` and the lockfile; this resolves the technical prerequisite. |
| #68 | AC-01/02: the public typed Services contract, composition, ownership/revision/idempotency/unknown outcomes, and passing adapter/domain tests. AC-03: the architecture test detects representative forbidden UI requests and direct adapter imports while browser media has a separate facade port. This is a representative guard, not a universal network sandbox. AC-04: reusable mock/narrow-fake contract harness and explicit unavailable-real behavior; no real adapter is claimed. |
| #70 | AC-01–04: current service tests cover once-only welcome/purchase/entitlement/reservation effects, coherent available/reserved/history facts, concurrent stale quotes without overspending, selected-duration boundaries, cancellation quote binding, failure release, and no fabricated refunds or pending-purchase fulfillment. In particular, the concurrency, checkout, preparation-recovery, ledger activity, and deletion suites passed together. The specified 120-credit welcome allowance is preserved. Paid pack prices/currencies and execution outcomes remain synthetic fixtures, not approved commerce or production accounting. |
| #73 | AC-01: reload/persistence and source/take/result-reference tests. AC-02: account/client isolation, revision and same-operation recovery, project-deletion races, and the explicitly owner-authorized `account-deletion-late-work.test.ts`; its independent receipt is `account-deletion-late-work-root-verification.md`. AC-03: namespaced mock reset/scenarios and fail-closed adapter construction. AC-04: quota/partial-write rollback tests preserve committed records and report honest recoverable outcomes. All passed in the current service/full-unit runs. |

The earlier foundation audit's missing clean-install receipt and browser failures are superseded by the linked clean-install receipt and current successful checks. The older report-only restriction on the privacy test was explicitly lifted by the owner's reply “Да, добавить тест”; it is part of the accepted source/test boundary.

## Necessary dependency cohort and limits

`main.tsx`, App, and the service factory statically import the screens/domain modules. Deliver the necessary frontend source, assets, configuration, and stable tests together so a clean checkout remains runnable. Their inclusion preserves their individual issue ownership and does not accept their outstanding UI criteria. Exclude generated dependencies/build/results, unrelated pre-existing dirty documents, and unfinished workspace/Result-state harnesses. The reviewed explicit delivery inventory supplies the actual path/hash boundary.

Other screen issues, their remaining menu/focus/target-size/state gaps, and the final integration issue remain open pending their own acceptance. #76 remains a separate blocked real-service follow-up unless the owner explicitly changes that scope. Production security, accounting, worker durability, storage erasure/retention, real rendering/media delivery, and physical-device/Safari behavior are not established by this acceptance.
