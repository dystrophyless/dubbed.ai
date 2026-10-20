# Publish only the latest finished result and revoke a deleted project's access

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
- Project acceptance coverage: SPEC-001 AC-13, SPEC-001 AC-14, SPEC-001 AC-15, SPEC-001 AC-16, SPEC-001 AC-17, SPEC-001 AC-23.

## Increment and context

Publish only the latest finished result and revoke a deleted project's access. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- Expose one stable unlisted viewer link without sign-in that resolves only permitted finished output and advances atomically to latest eligible generation.
- Warn-compatible deletion API revokes owner/public/media access, fences pending writers and coordinates idempotent cleanup/released slots under policy. Use the storage foundation's shared reference-safe cleanup; producer-owned retirement in active projects remains with their tasks, not a deletion-only mechanism.
- Handle invalid token, old export completion, concurrent media transfer and declared cache/backup expiry accurately. Hand pending preparation identities to their coordinator/ledger for the adopted D03 terminal outcome; deleting a project must not roll back an independent successful account purchase.

- Follow-up owner decisions (2026-10-20): Own same-token sharing disable/re-enable, previous-finished target while rerender/failure, project deletion and account-wide project/media cleanup after identity disable. Consume identity tombstone and existing storage cleanup mechanism; do not own authentication or ledger pricing.

## Out of scope

- Public gallery, private source/take access through a public link or claiming deletion retracts downloads.
- Authentication/identity disabling and financial pricing policy; this task owns downstream account-wide project/media cleanup after identity disable.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: Share token/public result resolution, publication generation switch, project deletion/tombstones and media/job cleanup coordination.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: [Render a full source-timeline video using current recorded performances](full_video_rendering.md); [Create resumable projects with validated durable source media](project_media_upload.md).
- Blocks: [Run the existing frontend through the real backend services adapter](frontend_real_adapter.md).
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: Physical backup/CDN/URL lifetimes and financial-retention policy, bounded delivery limits; account deletion launch scope and sharing behavior confirmed.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: Anonymous viewer sees only latest eligible finished video, not project/private assets.
- [ ] AC-02: Confirmed project deletion stops link/project access and late work cannot resurrect it.
- [ ] AC-03: Cleanup/slot release is idempotent and matches declared retention rather than fake immediate erasure.

- [ ] AC-04: Disabled/deleted account/project blocks all links immediately; current work retained without inactivity expiry; cleanup is idempotent and cannot erase retained live references or revive output. Successful pending preparation remains billable through coordinator/ledger.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Exercise valid/invalid/non-owner token and reverse export order using real API/storage; inspect resolved asset generation. |
| AC-02 | Delete during upload/commit/render/preparation, replay callbacks and read through the declared delivery/cache path, including already-issued media URLs. Assert no new access/association/publication after the D08 boundary and reconcile pending reservation/attempt outcomes under D03. Cached/in-flight bytes and physical cleanup have only the approved guarantee; an API deletion response is insufficient proof. Purchase-during-deletion reconciliation is repeated by the purchase owner and integration gate. |
| AC-03 | Run repeat cleanup/crash recovery on owned assets and verify exact objects/tombstone/slot state, with backup/cache limitations recorded. |

| AC-04 | Test same-token off/on, concurrent viewer/render/delete, account disable plus all-project cleanup, crash/replay/late callback, slot release and success-after-delete settlement handoff; verify adopted cache/backup reader lifetimes. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver the scoped artifacts and executed acceptance evidence in the agreed local/test environment. Review the actual diff and source contract; implementation readiness or a green isolated check alone is not product acceptance. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
