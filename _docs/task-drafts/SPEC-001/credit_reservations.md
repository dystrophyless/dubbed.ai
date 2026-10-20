# Maintain durable trial and preparation credit accounting

Local draft: not synchronized. No GitHub issue exists or issue number is allocated.
Created: 2026-10-20 (Asia/Qyzylorda).

## Task kind

Product increment

## Workflow status

draft

## Requirement and specification

- [SPEC-001](../../specifications/SPEC-001_dubbed_mvp.md), revision 0.5, synchronized with the owner follow-up brainstorm.
- [SPEC-002](../../specifications/SPEC-002_frontend.md), revision 0.5, including the confirmed neutral palette, bilingual UI and follow-up contracts.
- [BR-001](../../business-requirements/BR-001_custom_video_dubbing.md), revision 0.2; [brainstorm](../../../brainstorm.md) for decision provenance.
- Project acceptance coverage: SPEC-001 AC-18, SPEC-001 AC-19, SPEC-001 AC-20, SPEC-001 AC-21, SPEC-001 AC-23.

## Increment and context

Maintain durable trial and preparation credit accounting. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- Quote by validated source duration/policy and expose available/reserved/history through the agreed API.
- Consume durable eligibility to initialize trial once; reserve/settle/release one attempt identity with transaction-safe availability and explicit uncertain-state reconciliation. Own terminal recovery for expiry/cancellation/deletion under the adopted D03 policy; media deletion cannot erase or fabricate monetary history.
- Keep performance/manual/reopen actions free of preparation charges and provide attempt/receipt provenance for worker/payment consumers.

- Follow-up owner decisions (2026-10-20): Own ceil(section seconds), 120 verified welcome grant/non-expiry, one included retry/project and account-level ledger after project deletion; reserve/settle/release completed-stage cancellation.

## Out of scope

- Real payment checkout fulfillment, media work or deciding business refund policy.
- Replacing real PostgreSQL concurrency proof with in-memory or SQLite-only tests.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: PostgreSQL credit ledger/balance, trial grant, quote/reservation/settlement/release APIs and accounting reconciliation.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: [Authenticate account-owned access and initialize eligible accounts once](account_identity.md); [Freeze API, timeline and durable data contracts for real integration](backend_contracts_schema.md); [Create resumable projects with validated durable source media](project_media_upload.md).
- Blocks: [Activate a complete preparation with correct credits and retry behavior](preparation_orchestration.md); [Fulfill verified one-time credit purchases and the permanent slot upgrade once](one_time_purchase_fulfillment.md).
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: Measured stage allocations/rounding, cancellation-confirm races, reservation expiry, reversals/account-deletion balance; no production monetary defaults.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: Exact quote/trial and terminal accounting follow approved policy.
- [ ] AC-02: Parallel/replayed reservations cannot overspend or settle-and-release the same amount.
- [ ] AC-03: System failure and internal retry preserve the correct charge outcome.

- [ ] AC-04: Delivery/no-turn success settles; system/background failure releases; queued cancel zero, running cancel completed stages only; successful processing after project deletion remains charged once.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Run varied durations/rounding/max-video trial plus included retry with a known policy revision; replay/concurrently deliver eligibility across a restart and check one durable trial grant. Reject an expired/changed-source/changed-policy quote without hidden repricing; preserve historic quotes/settlements and non-expiring purchased balances. |
| AC-02 | Use real DB concurrent transactions and duplicate/timed-out settlement; verify conserved amounts/operation uniqueness. |
| AC-03 | Inject uncertain/failed/partial attempt completion, expiry/cancellation and project deletion before/after the chosen completion boundary. Reconcile exactly one terminal outcome under D03, including any separate authorized reversal entry; no second charge for internal delivery retry, no settle-and-release, and no project cleanup of account monetary provenance. |

| AC-04 | Real DB concurrency/recovery checks for 12.4=>13/120=>120, once-only grants, no overspend, all retry outcomes, cancel-confirm race under adopted stage policy and deleted-project completion; historical charges are not refunded by deletion. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver the scoped artifacts and executed acceptance evidence in the agreed local/test environment. Review the actual diff and source contract; implementation readiness or a green isolated check alone is not product acceptance. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
