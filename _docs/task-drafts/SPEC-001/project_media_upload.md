# Create resumable projects with validated durable source media

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
- Project acceptance coverage: SPEC-001 AC-02, SPEC-001 AC-13, SPEC-001 AC-14, SPEC-001 AC-23.

## Increment and context

Create resumable projects with validated durable source media. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- Implement account-scoped project listing/get/create and authenticated source transfer/resolution with content-based validation and immutable source identity.
- Enforce approved media/duration/capacity policy atomically and retain canonical timing/asset properties.
- Handle interrupted/replayed uploads, unavailable objects and abandoned-source cleanup according to selected policy.
- Supply shared reference-safe asset retirement/cleanup primitives for downstream producers, with idempotent owned-object deletion and D08 retention/lifetime metadata. This owns the reusable storage mechanism; downstream tasks identify their own candidates/stage/generation retirement, and project deletion owns its project-wide coordination.

- Follow-up owner decisions (2026-10-20): Accept validated original <=10 minutes/250 MB MP4/MOV/WebM and selected <=120-second section; occupy 2/10 capacity after upload validation, before AI; retain failed-preparation project.

## Out of scope

- AI preparation, recording commits, final rendering, full project deletion orchestration or payment fulfillment.
- Storing media in PostgreSQL by assumption or exposing raw public storage enumeration.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: Project/source APIs, media storage adapter, validation/timebase metadata and slot-consumption/release primitives.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: [Authenticate account-owned access and initialize eligible accounts once](account_identity.md); [Freeze API, timeline and durable data contracts for real integration](backend_contracts_schema.md).
- Blocks: [Maintain durable trial and preparation credit accounting](credit_reservations.md); [Deliver durable version-bound media jobs without duplicate publication](processing_job_foundation.md); [Authorize recording and commit a compatible durable take safely](recording_commit_backend.md); [Publish only the latest finished result and revoke a deleted project's access](sharing_project_deletion.md).
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: Precise byte/codec/normalization/offset contract and cleanup lifetimes D01/D08, not count/retention policy.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: Allowed source is durably usable and resumable only by its owner.
- [ ] AC-02: Boundary/invalid/corrupt/no-audio/over-capacity and replay paths obey policy.
- [ ] AC-03: Failed/orphan source data is recoverable/cleaned without unrelated deletion.

- [ ] AC-04: Canonical selected timeline maps to original offset; valid upload consumes one slot atomically, failure cannot allocate duplicate slots or spend preparation credits.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Upload known EN/RU fixtures, reload API state, fetch authorized media and compare identity/duration/checksum. |
| AC-02 | Run actual D01 media/duration edges (including exactly the chosen maximum), corrupt/no-audio/wrong-content/oversize inputs, parallel project creation and interrupted/repeated uploads against real isolated storage/PostgreSQL. Validate content and bounded decoding resources; no over-allocation, stale source substitution, accidental charge or private asset access through another account's identifiers/expired URLs. |
| AC-03 | Inject transfer/inspection/finalize failure and validate selected cleanup/slot outcome, preserving prior projects. Exercise cleanup primitives with retained and retired synthetic asset references, replay and crash/restart; they never delete a still-retained source/background/current take/finished result and obey the selected D08 active-reader/URL lifetime. Actual downstream retirement is rechecked by each producer and the integrated gate. |

| AC-04 | Check exact approved byte/time boundaries, content/codec errors and long-source selection with real storage/DB; concurrent capacity at 2/10 and failed-AI resume/delete slot release. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver the scoped artifacts and executed acceptance evidence in the agreed local/test environment. Review the actual diff and source contract; implementation readiness or a green isolated check alone is not product acceptance. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
