# Render a full source-timeline video using current recorded performances

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
- Project acceptance coverage: SPEC-001 AC-11, SPEC-001 AC-12, SPEC-001 AC-16, SPEC-001 AC-23.

## Increment and context

Render a full source-timeline video using current recorded performances. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- Freeze current source/background/turn/take inputs, enforce approved incomplete-project policy and render full original visuals/timing.
- Mix actual new takes at original positions including overlap with one continuous background; no time-stretch or duplicated background.
- Persist valid output/provenance and reject stale/failed/deleted-project completion, leaving previous finished result identifiable.
- Own retirement requests for failed/stale render outputs and superseded generation/input references through the shared storage lifecycle. Keep the published/prior finished result and frozen inputs retained for their D08 lifetime; publication/deletion owns target switching and project-wide cleanup coordination.

- Follow-up owner decisions (2026-10-20): Render entire canonical selected section using valid saved takes for every turn, including shorter takes; MP4 <=720p/no upscale/orientation and no added subtitles.

## Out of scope

- Publishing share links, fixture-only outputs claimed as real renders, UI player or deployment.
- Inventing original-dialogue/silence fallback for unrecorded turns.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: Export request/eligibility/input snapshot, render worker/media validation and completed-generation records.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: [Authorize recording and commit a compatible durable take safely](recording_commit_backend.md); [Produce an auditionable music-and-effects background for a source](background_separation.md).
- Blocks: [Publish only the latest finished result and revoke a deleted project's access](sharing_project_deletion.md).
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: Encoder/codec/timebase/quality D01/D10, and still-zero-turn export D07.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: Rendered video contains actual submitted takes and unchanged source visual timeline.
- [ ] AC-02: Eligibility and edit-after-snapshot follow explicit policies.
- [ ] AC-03: Render/storage failure and late callback preserve prior work.

- [ ] AC-04: Missing/timing-invalid turn blocks render; shorter saved take ends naturally with background/other voices continuing and no original fallback.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Use distinct original/new voice signals, quiet/overlap/margin fixtures and actual submitted takes; inspect output frames/duration/audio positions, one continuous background and no intentionally added original-dialogue/nonverbal layer. Report separation remnants against accepted background quality; do not treat them as evidence of an intentional fallback or silently promise zero leakage. |
| AC-02 | Attempt incomplete export, revise take after request and complete out of order; check frozen inputs and stale/current designation. |
| AC-03 | Inject worker/output validation/persistence failures and deletion; no corrupt asset marked finished or lost saved takes. Retire failed/stale/superseded outputs and frozen inputs under D08, replay cleanup/restart, and verify the published/prior finished result and all retained take/background references remain usable. |

| AC-04 | Decode resulting bytes, verify original selection/offset/duration, portrait/low-resolution cases, overlapping take alignment, short remainder and no burned added captions; test all-turn guard. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver the scoped artifacts and executed acceptance evidence in the agreed local/test environment. Review the actual diff and source contract; implementation readiness or a green isolated check alone is not product acceptance. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
