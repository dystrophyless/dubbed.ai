# Activate a complete preparation with correct credits and retry behavior

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
- Project acceptance coverage: SPEC-001 AC-02, SPEC-001 AC-03, SPEC-001 AC-05, SPEC-001 AC-07, SPEC-001 AC-18, SPEC-001 AC-19, SPEC-001 AC-20, SPEC-001 AC-23.

## Increment and context

Activate a complete preparation with correct credits and retry behavior. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- Coordinate real turn/background jobs into one complete validated preview contract and expose progress/readiness/retry capability.
- Apply initial/included/additional attempt policy and settlement/release identity without billing internal retries. Use the shared recording/activation guard and reconcile timeout, deletion and cancellation with the ledger; activation, provider success and settlement are separate policy-defined events.
- Activate successful replacement with exact correction/manual-turn disposition and expected revision/confirmation; retain old active work on decline/unset/conflict/failure.
- Identify failed/rejected/superseded preparation artifacts for shared reference-safe cleanup under D08, preserving active/retained preparation, takes and previous finished-result inputs. The storage foundation executes cleanup; stage callbacks cannot erase currently referenced assets.

- Follow-up owner decisions (2026-10-20): Coordinate complete delivery charging, reset-warning consent/expected revision, permanent first-save lock, one retry/project, cancellation stages and post-project-deletion charge.

## Out of scope

- Manual turn editing API ownership, changing speech/separation engines, or choosing owner preserve/reset rules.
- Returning ready after just one stage or treating provider HTTP success as settlement proof.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: Preparation APIs/coordinator, source-bound attempt orchestration, ready contract, D13 activation/confirmation and charge coordination.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: [Produce validated timed speaker turns including overlap and character sounds](dialogue_preparation.md); [Produce an auditionable music-and-effects background for a source](background_separation.md); [Maintain durable trial and preparation credit accounting](credit_reservations.md).
- Blocks: [Persist revision-safe turn corrections and manually added dialogue](preparation_corrections.md).
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: D03 remaining stage/race mechanics and D10 providers; D05/D06/D13 policy is confirmed.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: Usable ready state requires the approved full artifact contract and quoted accounting.
- [ ] AC-02: Replay/restart/capture-lock races cannot double-charge or overwrite recorded work.
- [ ] AC-03: Successful reprocessing respects existing manual work and confirmation.

- [ ] AC-04: No-turn success with background is delivered/charged; missing required background fails free; failure preserves old edits; paid reruns never replenish included retry.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Run successful and stage-partial real jobs; compare source/turn/background revision and reserved/settled/released ledger. |
| AC-02 | Exercise parallel initial/included/additional requests, callback replay, partial/no-turn/background failure, timeout and uncertain settlement with real DB/job adapters. Apply D03 entitlement consumption and terminal credit rules once. Prove the D05 guard with an inert capture consumer here; the recording task and real integration gate must repeat both orderings through the actual begin-capture and preparation endpoints before claiming integrated race safety. |
| AC-03 | Preload corrections/added turn through contract fixtures, exercise accepted/declined/conflicting/unset D13 and inspect exact activated revision and separate D03 outcome. Replay artifact retirement for rejected/superseded attempts and verify retained active preparation and finished-result references remain valid under D08. |

| AC-04 | Run real stage success/failure/zero-turn, confirmed reset/manual additions, failed first save then successful lock, deletion-of-takes lock persistence, cancel and deleted-project-completion races under selected stage policy. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver the scoped artifacts and executed acceptance evidence in the agreed local/test environment. Review the actual diff and source contract; implementation readiness or a green isolated check alone is not product acceptance. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
