# Deliver durable version-bound media jobs without duplicate publication

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
- Project acceptance coverage: SPEC-001 AC-07, SPEC-001 AC-16, SPEC-001 AC-19, SPEC-001 AC-23.

## Increment and context

Deliver durable version-bound media jobs without duplicate publication. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- Persist version-bound operation/job state and deliver work with stable identity, stage/error evidence and safe restart/retry.
- Reject stale/superseded/deleted-project completions and distinguish UI observation cancellation from stopping actual work.
- Exercise generic worker/storage/DB failure seams with inert/local fixtures before real AI adapters.
- Register unassociated outputs from failed, stale or interrupted stage delivery for the shared storage cleanup primitive; downstream coordinators decide retention of still-referenced outputs under D08. A late worker may not independently delete an asset retained by another accepted revision.

- Follow-up owner decisions (2026-10-20): Support queued/running cancellation with durable completed-stage evidence and post-project-deletion billing reconciliation without publication.

## Out of scope

- Actual speech/separation models, product charge-settlement decisions or deploying a production queue.
- Declaring exactly-once external delivery without idempotent state protection.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: Job queue/delivery adapter, durable attempts/stages, lease/retry/callback/observability foundation and inert media-job test consumer.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: [Create resumable projects with validated durable source media](project_media_upload.md); [Freeze API, timeline and durable data contracts for real integration](backend_contracts_schema.md).
- Blocks: [Produce validated timed speaker turns including overlap and character sounds](dialogue_preparation.md); [Produce an auditionable music-and-effects background for a source](background_separation.md).
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: D03 stage/race contract and D12 queue/storage mechanics; successful-completion charging after project deletion is confirmed.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: Worker restart and duplicate delivery produce one authoritative operation outcome.
- [ ] AC-02: Version/deletion fence blocks stale work from association.
- [ ] AC-03: Job progress and diagnostics are truthful and sanitized.

- [ ] AC-04: Cancel state is distinct from UI observer disposal or project deletion; replay/crash cannot duplicate stage settlement, retry consumption or revive access.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Crash/restart between DB/delivery/callback phases on isolated queue/DB; reconcile pending state and no duplicate publication. |
| AC-02 | Supersede/delete project during inert job then deliver late completion; inspect retained tombstone and no resurrection. Reconcile stale/unassociated output retirement through shared cleanup, including a crash between object creation and association; retained references remain playable and cleanup replay has no unrelated effect. |
| AC-03 | Inject stage failures/timeouts; API exposes actual state/operation IDs without raw private media, transcript or credentials. |

| AC-04 | Inject queued/running cancel and worker completion races, deletion then success/failure, restart/replay and ensure ledger handoff identity survives project tombstone. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver the scoped artifacts and executed acceptance evidence in the agreed local/test environment. Review the actual diff and source contract; implementation readiness or a green isolated check alone is not product acceptance. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
