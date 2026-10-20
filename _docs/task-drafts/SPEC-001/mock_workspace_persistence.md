# Persist and restore the demo workspace through the shared facade

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
- Project acceptance coverage: SPEC-001 AC-06, SPEC-001 AC-10, SPEC-001 AC-13, SPEC-001 AC-14.
- Frontend acceptance coverage: FE-AC-08, FE-AC-09, FE-AC-10.

## Increment and context

Persist and restore the demo workspace through the shared facade. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- Implement adapter-owned browser persistence for project records/media blobs, stable IDs, session/demo ownership and pending operation reconciliation.
- Own executable current-take candidate/commit and text/speaker/window/add-turn mutations with expected revisions and named D05/D06 profiles; retain the previous saved take until a durable compatible replacement commits. Expose one shared authoritative recording/activation guard for the preparation adapter, rather than independent UI locks.
- Add isolated deterministic seed/reset and quota/missing-asset/stale/replayed-operation scenarios; no component storage calls.
- Own shared asset reference/retirement/cleanup primitives and candidate/current-take storage lifetime under a named D08 demo profile. Preparation/result owners request retirement through these primitives rather than independently deleting repository blobs; protect retained current takes, active preparation, prior finished result and an already active saved-take playback as required by its media-handle contract.

- Follow-up owner decisions (2026-10-20): Persist selected-section mapping, lock history, one-retry/project history, shorter accepted takes and account lifecycle under services-owned local storage.

## Out of scope

- AI/preparation jobs, payment ledger and result publication, which have separate owners.
- Global/cross-device sharing or claiming browser-local simulation is server security.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: Mock repository, session/projects/assets/turns/recordings state, seed/reset, revisions and deletion tombstones.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: [Freeze the frontend facade and enforce its transport boundary](frontend_service_contract.md); [Provide playable, annotated and permitted dubbing fixtures](demo_media_fixtures.md).
- Blocks: [Simulate credit quotes, reservations and one-time purchases consistently](mock_credit_accounting.md); [Exercise sample preparation and explicit correction disposition without AI](mock_preparation_lifecycle.md); [Simulate finished generations and local share deletion honestly](mock_result_lifecycle.md); [Record and safely review one durable take per turn](recording_review_ui.md).
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: Browser quota/candidate-recovery mechanics and financial-retention edge policy; never claim local mock security/global hosting.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: Saved project/turn/take blobs survive reload with recreated playable URLs.
- [ ] AC-02: Conflicts, failed saves and replay cannot destroy the current saved state.
- [ ] AC-03: Seeds/reset/session boundary behave deterministically without touching unrelated data.

- [ ] AC-04: Reload preserves immutable lock/retry history and valid shorter takes; account deletion disables demo identity and fences later project writes.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Create/edit/save through facade, close/reopen repository and play restored assets; no durable blob URL string dependency. |
| AC-02 | Inject quota/association failure, concurrent revisions, duplicate commit and operation-ID reuse with changed inputs; verify the old take/current revision and explicit errors. Exercise anonymous/non-owner fixture access, expired session and a late previous-account read; no new-session state may be populated from stale work. Retire a failed candidate/replaced take and replay cleanup; retained references and already active saved-take playback remain valid for the declared lifetime. These are adapter behavior checks, not browser-owner security. |
| AC-03 | Use isolated stores and a neighboring sentinel store; reset owned data only, stop listeners/capture hooks and avoid duplicate trial initialization. |

| AC-04 | Reload after failed first save, successful save then deletion of takes, short-take commit and account disable; reconcile once without duplicate trial. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver the scoped artifacts and executed acceptance evidence in the agreed local/test environment. Review the actual diff and source contract; implementation readiness or a green isolated check alone is not product acceptance. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
