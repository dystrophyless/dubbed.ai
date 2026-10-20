# Produce validated timed speaker turns including overlap and character sounds

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
- Project acceptance coverage: SPEC-001 AC-03, SPEC-001 AC-04, SPEC-001 AC-06, SPEC-001 AC-23, SPEC-001 AC-24.

## Increment and context

Produce validated timed speaker turns including overlap and character sounds. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- Implement selected speech pipeline for EN/RU transcript/alignment/speakers, simultaneous turns and detected laughter/screams/gasps.
- Group connected speech, retain uninterrupted long speech, bound margins and produce provenance-linked proposed turns against canonical source.
- Validate malformed/missing timings and partial/no-turn outputs as explicit pipeline outcomes.

- Follow-up owner decisions (2026-10-20): Process selected section with mixed English/Russian and independent overlapping/nonverbal turns; retain uninterrupted 30-second speech.

## Out of scope

- Background separation, accepting manual correction disposition, billing, UI or guaranteeing perfect coverage.
- Converting dominant-speaker diarization into a false claim that all overlapped speech was recovered.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: Speech/transcription/alignment/diarization/nonverbal adapters and turn segmentation/validation worker outputs.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: [Deliver durable version-bound media jobs without duplicate publication](processing_job_foundation.md); [Establish the real media pipeline's quality, latency and cost envelope](media_feasibility.md).
- Blocks: [Activate a complete preparation with correct credits and retry behavior](preparation_orchestration.md).
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: Models/quality/margins/pause parameters and normalization D01/D10; no claim perfect detection.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: Known corpus yields valid timebase-consistent labeled proposals and honest coverage results.
- [ ] AC-02: Grouping/margins preserve long speech and source bounds.
- [ ] AC-03: Bad/partial output cannot be published as complete preparation.

- [ ] AC-04: Zero detected turns is a valid detected-empty result for orchestration to charge when complete, not fabricated dialogue; source mapping remains section-relative.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Run actual selected model/version on annotated permitted samples; compare words/speakers/overlap/sounds and retain misses. |
| AC-02 | Check connected sentences, pause/speaker change, 30-second monologue, source-edge and simultaneous fixtures. |
| AC-03 | Inject malformed/absent timing/speaker results and model failure; inspect typed stage outcome and no active malformed turn references. |

| AC-04 | Representative mixed EN/RU/overlap/laugh/scream samples with word/speaker timings and selected offset; include real no-dialogue sample and invalid model outputs. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver the scoped artifacts and executed acceptance evidence in the agreed local/test environment. Review the actual diff and source contract; implementation readiness or a green isolated check alone is not product acceptance. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
