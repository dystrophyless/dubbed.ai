# Persist revision-safe turn corrections and manually added dialogue

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
- Project acceptance coverage: SPEC-001 AC-05, SPEC-001 AC-06, SPEC-001 AC-07, SPEC-001 AC-12, SPEC-001 AC-13.

## Increment and context

Persist revision-safe turn corrections and manually added dialogue. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- Expose list/update/add missed turn with validated source ranges, speaker/text/sound-caption and provenance.
- Preserve overlap, active preparation revision and defined take disposition before/after recording.
- Coordinate expected revisions with processing activation and candidate commit; never silently mutate captured timing.

- Follow-up owner decisions (2026-10-20): Preserve take validity for text/label edits, invalidate on timing changes while retaining media, and add missed turns after permanent reprocessing lock.

## Out of scope

- General split/merge editor, speech inference, frontend controls or resetting existing takes on an unspecified policy.
- D13 production decision-making inside a request handler.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: Turn/speaker/text/timing correction APIs, authoritative edit revisions and take-compatibility effects.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: [Activate a complete preparation with correct credits and retry behavior](preparation_orchestration.md).
- Blocks: [Authorize recording and commit a compatible durable take safely](recording_commit_backend.md); [Run the existing frontend through the real backend services adapter](frontend_real_adapter.md).
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: Timebase/revision mechanics D12, not unresolved compatibility policy.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: Correct clipped start/text/speaker and add missed turn at valid position.
- [ ] AC-02: Invalid/stale and concurrent activation edits preserve newer truth.
- [ ] AC-03: Editing a recorded turn follows approved take-compatibility contract.

- [ ] AC-04: Changed timing/new turn blocks export until a compatible saved take; text/label corrections do not demand re-recording or unlock AI.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Use real API/DB, reload state and verify source-bounded intervals, overlap and manual provenance. |
| AC-02 | Race correction with reprocessing/other edit; assert revision conflict and no lost correction. |
| AC-03 | Seed five current durable takes, then text/window/speaker edits and a newly missed line after the D05 lock; verify the D06 preserve/flag/invalidate result and reload/export-eligibility metadata without shifted playback or lost unrelated takes. The recording task and final integration gate repeat this with actual committed takes rather than treating seeded state as full journey proof. |

| AC-04 | Concurrent revision checks around text, speaker, bounds and added line with existing takes; retained old media is not falsely export-eligible; stale candidates rejected. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver the scoped artifacts and executed acceptance evidence in the agreed local/test environment. Review the actual diff and source contract; implementation readiness or a green isolated check alone is not product acceptance. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
