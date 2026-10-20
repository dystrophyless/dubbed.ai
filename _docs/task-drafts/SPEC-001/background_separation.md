# Produce an auditionable music-and-effects background for a source

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
- Project acceptance coverage: SPEC-001 AC-03, SPEC-001 AC-05, SPEC-001 AC-11, SPEC-001 AC-24.

## Increment and context

Produce an auditionable music-and-effects background for a source. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- Run the selected separation stage to remove original speech/character sounds while preserving music/effects as measured.
- Produce a durable source-aligned background and explicit provenance/quality/failure metadata.
- Expose auditionable real output without confusing residual artifacts with intentional original-dialogue mixing.

- Follow-up owner decisions (2026-10-20): Own auditionable background plus original-speaker preview separation so saved A can replace original A while original B remains; preserve one aligned background.

## Out of scope

- Per-character original voice isolation, new voice generation, full export mixing or automatic user quality acceptance.
- Assuming a music-vocals remover always meets cinematic-dialogue requirements.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: Dialogue/nonverbal-removal adapter, background artifact/timebase validation and quality evidence.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: [Deliver durable version-bound media jobs without duplicate publication](processing_job_foundation.md); [Establish the real media pipeline's quality, latency and cost envelope](media_feasibility.md).
- Blocks: [Activate a complete preparation with correct credits and retry behavior](preparation_orchestration.md); [Render a full source-timeline video using current recorded performances](full_video_rendering.md).
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: Real model/provider feasibility, quality/cost and fallback that does not silently erase original B; target behavior accepted, capability unproven.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: Background plays and remains aligned across source duration.
- [ ] AC-02: Quality/limitations are measured for music/effects/overlap/vocal sounds.
- [ ] AC-03: Failure/invalid asset is not represented as usable background.

- [ ] AC-04: Complete background failure is a preparation failure; usable imperfect isolation can be auditioned/accepted without claiming clean separation.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Compare real output sample count/duration/timebase and listen alongside original annotated samples. |
| AC-02 | Retain representative separation artifacts and judgments, including remaining screams/dialogue and damaged effects. |
| AC-03 | Inject model/storage/validation errors; stage returns explicit failure/partial metadata and cannot silently substitute original audio. |

| AC-04 | Real overlapping A/B sample compares saved-A/original-B then both-saved preview; inspect leakage/music artifacts and total alignment. Include total background failure and system-retry preservation. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver the scoped artifacts and executed acceptance evidence in the agreed local/test environment. Review the actual diff and source contract; implementation readiness or a green isolated check alone is not product acceptance. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
