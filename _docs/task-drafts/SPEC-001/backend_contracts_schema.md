# Freeze API, timeline and durable data contracts for real integration

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
- Project acceptance coverage: SPEC-001 AC-02, SPEC-001 AC-06, SPEC-001 AC-07, SPEC-001 AC-10, SPEC-001 AC-11, SPEC-001 AC-13, SPEC-001 AC-14, SPEC-001 AC-16, SPEC-001 AC-17, SPEC-001 AC-18, SPEC-001 AC-19, SPEC-001 AC-23.
- Frontend acceptance coverage: FE-AC-09.

## Increment and context

Freeze API, timeline and durable data contracts for real integration. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- Align real FastAPI requests/results/error/capability shapes with the frontend facade and explicit production policies.
- Specify canonical time units/normalization, operation/revision IDs, durable assets, candidates/current takes, preparation activation and result generations. Define one authoritative D05 recording/activation serialization contract and the D03/D08 deletion-to-attempt accounting handoff; consumers cannot implement incompatible guards.
- Introduce only foundation schema/constraints required by consumers; document transaction boundaries/outbox/job and storage compatibility without implementing all features.
- Allocate one shared asset lifecycle contract: the upload/storage foundation supplies reference-safe retirement/cleanup primitives; job, preparation, recording and render owners identify their failed/orphan/superseded outputs; project deletion coordinates the whole project; recovery configures/rehearses execution. Record D08 retention and active-reader/issued-URL boundaries without inventing durations or erasure promises.

- Follow-up owner decisions (2026-10-20): Define selected-source offset, verified identity/link/disable, once-only grant, permanent lock, retry history, timing eligibility, short candidates, cancellation stage/quote and same-token lifecycle contracts.

## Out of scope

- Changing accepted product rules, pretending all frontend mock semantics are production values.
- Implementing feature handlers or a complete media/payment pipeline within the foundation.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: Shared API/schema contract documents, initial domain migrations/models and compatibility/transaction design; feature owners extend only their slices.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: [Run FastAPI against an isolated PostgreSQL and SQLAlchemy test environment](backend_runtime.md); [Freeze the frontend facade and enforce its transport boundary](frontend_service_contract.md); [Resolve the production policy baseline needed by dependent implementation](production_policy_baseline.md).
- Blocks: [Authenticate account-owned access and initialize eligible accounts once](account_identity.md); [Create resumable projects with validated durable source media](project_media_upload.md); [Maintain durable trial and preparation credit accounting](credit_reservations.md); [Deliver durable version-bound media jobs without duplicate publication](processing_job_foundation.md).
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: D12 architecture and remaining D03/D07/D08 policies; do not invent byte precision/stage weights.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: A canonical contract covers every facade operation and required media/error/revision field.
- [ ] AC-02: Foundation schema migration and invariants work on real PostgreSQL.
- [ ] AC-03: Consumer handoff explicitly identifies owners and compatibility rules.

- [ ] AC-04: Shared API/data revisions represent every confirmed rule without frontend-only authority; account disable is separate from physical cleanup and billing retention.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Validate contract examples with shared/generated types or equivalent compatibility checks, including D13 and saved/candidate identity. |
| AC-02 | Upgrade clean fixture and verify key/ownership/revision/operation uniqueness constraints; preserve migration provenance. |
| AC-03 | Review operation/asset/timebase examples across mock facade, API and worker boundaries; no ambiguous units or duplicate authoritative balance. Name the producer/consumer of each session, baseline-slot, trial, attempt/credit, capture-lock, correction-disposition, asset-retirement/cleanup and publication/deletion transition. Assign the single writer and extension handoff for shared API/schema/migrations/ledger/storage contracts; feature owners extend their assigned slice sequentially or use explicitly disjoint files. Record which contracts can be frozen and which stay unavailable for scoped unresolved policy; completion of a policy investigation is not blanket approval. |

| AC-04 | Contract/migration checks cover selected-time mapping, consent/edit revision, take/candidate identity, cancel quote race handling and account-deleted callback fencing. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver the scoped artifacts and executed acceptance evidence in the agreed local/test environment. Review the actual diff and source contract; implementation readiness or a green isolated check alone is not product acceptance. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
