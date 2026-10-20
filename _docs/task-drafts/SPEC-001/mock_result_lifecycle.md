# Simulate finished generations and local share deletion honestly

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
- Project acceptance coverage: SPEC-001 AC-12, SPEC-001 AC-15, SPEC-001 AC-16, SPEC-001 AC-17.
- Frontend acceptance coverage: FE-AC-05, FE-AC-08, FE-AC-09.

## Increment and context

Simulate finished generations and local share deletion honestly. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- Implement pending/failed/finished/stale export records with sample output provenance and frozen input revision.
- Publish latest eligible finished generation to a stable same-browser public demo token, with no raw/private asset leak.
- Coordinate project tombstone/link invalidation with pending export/upload/preparation callbacks; hand immutable pending-attempt identities to the preparation coordinator and its ledger primitives under the named D03/D08 profile. A deletion replay reconciles that handoff without removing account ledger/purchase/entitlement history or rolling back an independent successful purchase.
- Consume repository-owned asset cleanup primitives for canceled/stale exports and deleted projects; preserve live current-take/preparation/result references and apply only the named demo retention profile.

- Follow-up owner decisions (2026-10-20): Simulate all-turn export eligibility, same-token sharing off/on, prior finished target during rerender/failure and account/project deletion fencing.

## Out of scope

- Actual arbitrary-video rendering, globally hosted sharing or backend deletion guarantees.
- Replacing a completed generation with an unfinished or stale fixture job.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: Mock export/result/media-download/share resolution and generation-aware deletion handlers.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: [Persist and restore the demo workspace through the shared facade](mock_workspace_persistence.md); [Provide playable, annotated and permitted dubbing fixtures](demo_media_fixtures.md); [Exercise sample preparation and explicit correction disposition without AI](mock_preparation_lifecycle.md).
- Blocks: [Resume projects and manage honest finished results and public demo links](results_projects_sharing_ui.md).
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: D07 still-zero-turn export, cleanup/cache mechanics; global sharing and real rendered user voice remain outside mock proof.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: Finished sample export returns actual playable/downloadable fixture bytes and provenance.
- [ ] AC-02: Reverse-order/failed exports cannot regress the shared generation.
- [ ] AC-03: Anonymous same-browser view and deletion obey the profile.

- [ ] AC-04: Short valid takes count, timing-invalidated/missing turns block export; re-enabled token matches old token and deletion never resurrects output.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Run export lifecycle and the named D07 incomplete/invalidated-turn eligibility cases; inspect actual media kind/bytes and provenance. The prepared output is not labeled as containing user takes, and an unavailable/ineligible render never becomes a fake finished download. |
| AC-02 | Finish two requests in reverse order under a named profile and resolve token; stale completion cannot win. |
| AC-03 | Sign out then resolve token and attempt private asset access. Delete while preparation/export/upload is pending, reload/replay the deletion and deliver late callbacks; the link stays unavailable, the attempt/reservation reaches the named D03 outcome once, and account monetary provenance survives. Complete an independently pending simulated purchase during deletion; reconcile its one credit/upgrade effect without starting preparation or reviving project access. Check cleanup reference safety under the named retention profile. |

| AC-04 | Test added/timing-edited turn gates, off/on token identity, reverse render completion/failure and deletion during pending preparation with ledger reconciliation. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver the scoped artifacts and executed acceptance evidence in the agreed local/test environment. Review the actual diff and source contract; implementation readiness or a green isolated check alone is not product acceptance. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
