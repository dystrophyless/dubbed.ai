# Simulate credit quotes, reservations and one-time purchases consistently

Local draft: not synchronized. No GitHub issue exists or issue number is allocated.
Created: 2026-10-20 (Asia/Qyzylorda).

## Task kind

Technical foundation

## Workflow status

draft

## Requirement and specification

- [SPEC-001](../../specifications/SPEC-001_dubbed_mvp.md), revision 0.5, synchronized with the owner follow-up brainstorm.
- [SPEC-002](../../specifications/SPEC-002_frontend.md), revision 0.5, including the confirmed neutral palette, bilingual UI and follow-up contracts.
- [BR-001](../../business-requirements/BR-001_custom_video_dubbing.md), revision 0.2; [brainstorm](../../../brainstorm.md) for decision provenance.
- Project acceptance coverage: SPEC-001 AC-14, SPEC-001 AC-18, SPEC-001 AC-19, SPEC-001 AC-20, SPEC-001 AC-21, SPEC-001 AC-22.
- Frontend acceptance coverage: FE-AC-06, FE-AC-08, FE-AC-09.

## Increment and context

Simulate credit quotes, reservations and one-time purchases consistently. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- Implement service-authoritative demo policy, trial grant, quote/reserve/settle/release and history with idempotent operation identities.
- Provide pending/failed/verified/replayed simulated pack checkout and permanent first-purchase demo slot upgrade.
- Expose included/additional retry accounting primitives for preparation orchestration without charging UI actions.

- Follow-up owner decisions (2026-10-20): Default mock uses ceil(section seconds), 120 one-time non-expiring credits, 2/10 slots and normal-price extra runs; simulate cancellation stages with explicitly provisional weights.

## Out of scope

- Real payments, production pricing/refunds/chargeback policy or preparation processing.
- Automatically starting a job when a pack is purchased.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: Mock policy/credit ledger/checkout/slot entitlements and deterministic accounting scenarios.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: [Persist and restore the demo workspace through the shared facade](mock_workspace_persistence.md).
- Blocks: [Exercise sample preparation and explicit correction disposition without AI](mock_preparation_lifecycle.md); [Buy demo credit packs and return to the original preparation quote](credits_purchase_ui.md).
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: Real USD packs/stage allocations and remaining D03 cancellation races/reversal policy; demo offers labeled provisional.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: Quotes, available/reserved balances and trial fit the selected profile.
- [ ] AC-02: Repeated/concurrent grant/reserve/settle/release operations preserve ledger invariants.
- [ ] AC-03: Purchase success grants/upgrades once; pending/failure grants nothing.

- [ ] AC-04: Quotes/grants/entitlements match confirmed values and exactly one included retry/project; delivered/failed/canceled/deleted outcomes reconcile once.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Exercise varied source durations/rounding, outstanding reservations and maximum-length trial plus included retry. Reopen and replay/concurrently initialize eligibility; the named profile grants one trial and one baseline slot entitlement. Changed source/policy or expired quote cannot be used as the old authorization. |
| AC-02 | Use deterministic concurrency/replay/failure scenarios; no negative availability or both settled-and-released reservation. |
| AC-03 | Exercise pending, failed, successful, duplicate and out-of-order simulated receipts, including lost responses/reload; verify one persisted credit/slot effect and no preparation created by purchase. Time advancement does not expire purchased demo credits. |

| AC-04 | Assert 12.4=>13, 120=>120, verified-account grant replay, no expiry, queued zero/running completed-stage charge, system/background failure release and successful deleted-project settlement; do not adopt sample stage prices. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver the scoped artifacts and executed acceptance evidence in the agreed local/test environment. Review the actual diff and source contract; implementation readiness or a green isolated check alone is not product acceptance. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
