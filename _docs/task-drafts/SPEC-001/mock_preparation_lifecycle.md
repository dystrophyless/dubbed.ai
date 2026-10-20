# Exercise sample preparation and explicit correction disposition without AI

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
- Project acceptance coverage: SPEC-001 AC-02, SPEC-001 AC-03, SPEC-001 AC-04, SPEC-001 AC-06, SPEC-001 AC-07, SPEC-001 AC-18, SPEC-001 AC-20.
- Frontend acceptance coverage: FE-AC-03, FE-AC-08, FE-AC-09.

## Increment and context

Exercise sample preparation and explicit correction disposition without AI. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- Inspect/preview custom files locally and explicitly switch identity to the sample for simulated AI; never apply fixture timings to unrelated video.
- Drive deterministic queued/running/validating/ready/failure stages using mock accounting and validated fixture output.
- Handle successful retry disposition/confirmation/decline/conflict/unset policy and capture-lock races through the repository's shared guard; keep old active work on unsuccessful activation. Expose the deletion-to-attempt reconciliation consumer for the result/deletion owner, using immutable attempt identities and mock ledger primitives under the named D03/D08 profile; a late completion cannot activate tombstoned work. Retire rejected/superseded preparation assets through repository cleanup primitives only after retained active references are protected.

- Follow-up owner decisions (2026-10-20): Apply confirmed reset warning/consent, preserve old preparation on failure, permanent first-successful-save lock and one retry/project.

## Out of scope

- Real transcription/separation, actual backend capture authorization or stage runtime claims.
- Editing/resetting manual work without the adapter's explicit profile and confirmation.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: Mock source inspection/sample selection/preparation jobs and activation/correction-disposition service handlers.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: [Persist and restore the demo workspace through the shared facade](mock_workspace_persistence.md); [Simulate credit quotes, reservations and one-time purchases consistently](mock_credit_accounting.md); [Provide playable, annotated and permitted dubbing fixtures](demo_media_fixtures.md).
- Blocks: [Take a demo user from file selection and quote to a usable preview](upload_preparation_ui.md); [Simulate finished generations and local share deletion honestly](mock_result_lifecycle.md).
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: Only unresolved technical stage/zero-turn-export cases need profiles; D05/D06/D13 no longer await product selection.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: Sample and arbitrary-upload paths have truthful distinct source identity.
- [ ] AC-02: Initial/included/additional attempts reconcile stage and credit outcome once.
- [ ] AC-03: Manual corrections/added turn survive declined/unset/stale replacement activation.

- [ ] AC-04: Manual edits/additions reset only on revision-safe successful replacement; failed first recording never locks and later deleting takes never unlocks.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Inspect a custom file then choose a differently timed sample; assert an explicit identity change, a fresh source-bound quote and renewed confirmation before preparation. Reject the old quote; matching subtitles/background belong only to the sample. |
| AC-02 | Drive initial/included/additional attempts, partial/no-turn/background failure, replay/reload and deletion during an attempt under named D03 profiles. Reconcile entitlement/reservation once; internal retries are not new attempts. Race activation and begin-capture through the shared repository guard; only profile-allowed serialized outcomes may commit. |
| AC-03 | Save edits/add line, request successful retry and exercise accept/decline/conflict/profile-unset; exact advertised disposition only on valid confirmation. |

| AC-04 | Confirm/decline retry after corrections/addition; inject failure/concurrent edit; test successful no-turn output, failed background and paid rerun without renewed retry. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver the scoped artifacts and executed acceptance evidence in the agreed local/test environment. Review the actual diff and source contract; implementation readiness or a green isolated check alone is not product acceptance. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
