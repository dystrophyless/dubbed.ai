# Run the existing frontend through the real backend services adapter

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
- Project acceptance coverage: SPEC-001 AC-01, SPEC-001 AC-02, SPEC-001 AC-05, SPEC-001 AC-06, SPEC-001 AC-07, SPEC-001 AC-08, SPEC-001 AC-09, SPEC-001 AC-10, SPEC-001 AC-12, SPEC-001 AC-13, SPEC-001 AC-14, SPEC-001 AC-15, SPEC-001 AC-16, SPEC-001 AC-17, SPEC-001 AC-18, SPEC-001 AC-20, SPEC-001 AC-21, SPEC-001 AC-22, SPEC-001 AC-23.
- Frontend acceptance coverage: FE-AC-07, FE-AC-09.

## Increment and context

Run the existing frontend through the real backend services adapter. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- Implement every facade operation/transport in services only, including authenticated assets/signed transfers, polling/events, errors and pending reconciliation.
- Select real adapter once without per-screen forks; bind actual FastAPI behavior to the existing React/Zustand flow.
- Run applicable shared adapter contracts and demonstrate representative real media/credits/project journey using isolated backend/payment test mode.

- Follow-up owner decisions (2026-10-20): Map every confirmed facade operation, including verified auth/link/reset/delete, section selection, cancel quote/confirm, short candidate commit and share toggles, to real backend services only.

## Out of scope

- Reimplementing business policy/client balance authorization, feature redesign or altering mock acceptance requirements.
- Implementing backend domains inside the adapter or silently returning fixtures after real errors.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: services/http implementation, API/asset/transport mapping, session/progress integration and adapter conformance; feature UI only for genuine contract mismatches.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: [Prove the full backend-free frontend milestone](frontend_mock_integration_gate.md); [Persist revision-safe turn corrections and manually added dialogue](preparation_corrections.md); [Authorize recording and commit a compatible durable take safely](recording_commit_backend.md); [Publish only the latest finished result and revoke a deleted project's access](sharing_project_deletion.md); [Fulfill verified one-time credit purchases and the permanent slot upgrade once](one_time_purchase_fulfillment.md).
- Blocks: [Make the application environment reproducible and recoverable](delivery_recovery_environment.md).
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: Dependent backend deliveries plus remaining scoped monetary/media/recovery decisions; previous mock proof cannot substitute.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: Existing screens work with real and mock adapters using one public contract.
- [ ] AC-02: Network/media/session/progress flow respects boundary and identity.
- [ ] AC-03: Representative UI actions produce real backend state/output rather than fixture success.

- [ ] AC-04: Existing bilingual screens use real authoritative decisions without mock fallback or new transport bypasses.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Run shared tests against real services, including errors/replay/capability/asset provenance; no mode conditionals in features. |
| AC-02 | Exercise real signed/media transfers, expired session, observer teardown and stale responses; architecture tests stay green. |
| AC-03 | Perform correction/capture/save/result/purchase-test/share flow against isolated backend; compare API/DB/assets to displayed revision and ledger. |

| AC-04 | Run shared contract tests and real isolated auth/media/ledger/deletion journeys; verify typed denial for remaining unavailable policies, no simulated export/auth/AI claim. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver the scoped artifacts and executed acceptance evidence in the agreed local/test environment. Review the actual diff and source contract; implementation readiness or a green isolated check alone is not product acceptance. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
