# Freeze the frontend facade and enforce its transport boundary

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
- Project acceptance coverage: SPEC-001 AC-23.
- Frontend acceptance coverage: FE-AC-07, FE-AC-09, FE-AC-10.

## Increment and context

Freeze the frontend facade and enforce its transport boundary. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- Define typed session/policy/projects/sources/preparation/turns/recordings/media/credits/exports/sharing operations from SPEC-002 with stable operation IDs and expected revisions.
- Specify media provenance, D13 dispositions, capture permits, pending/failure semantics and capability reason codes.
- Enforce services-only backend transport/persistence and explicit native-media/device exceptions, including Zustand actions and hooks.

- Follow-up owner decisions (2026-10-20): Extend the common facade for verified registration/reset/linking/account deletion, section selection, cancellation quote/confirm, permanent lock/retry state, recoverable short candidates and sharing enable/disable.

## Out of scope

- Implementing all facade methods, backend routes or actual payment/security behavior.
- Making fake real-adapter conformance a prerequisite for the mock milestone.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: Public services contracts, adapter composition rules, architecture checks and shared facade contract test harness.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: [Run a tested React and Zustand frontend in an isolated mock configuration](frontend_runtime.md).
- Blocks: [Provide playable, annotated and permitted dubbing fixtures](demo_media_fixtures.md); [Persist and restore the demo workspace through the shared facade](mock_workspace_persistence.md); [Capture a bounded local microphone take synchronized to reference audio](browser_capture_adapter.md); [Freeze API, timeline and durable data contracts for real integration](backend_contracts_schema.md).
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: Transport/data mechanics D12 and remaining scoped D03/D07/D08 policies; selected product behaviors are not open defaults.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: All consumers can depend on one complete public facade without adapter imports.
- [ ] AC-02: Architecture checks catch transport/persistence bypasses without banning valid media/device use.
- [ ] AC-03: Contract suite distinguishes replay/conflict/pending and unavailable policy.

- [ ] AC-04: Typed mock/future-real contracts expose the selected policies and structured localized-error keys without feature transport bypasses.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Compile a consumer/adapter contract harness including every specified operation and pending/error/capability shape. |
| AC-02 | Introduce negative fixtures for component/hook/store fetch, SDK, dynamic-import and direct storage access; allow the documented service/device paths. |
| AC-03 | Exercise observable replay of identical input, conflicting reuse of an operation ID, pending reconciliation, stale revisions and policy-unset results through minimal deterministic adapters. Assert typed distinctions and unchanged state on rejection; separately verify unavailable real mode never returns fixture success. These are harness checks, not conformance proof for unimplemented domain adapters. |

| AC-04 | Contract-test all added request/result fields, expected-revision consent, candidate versus current identity, and adapter substitution/import boundary. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver the scoped artifacts and executed acceptance evidence in the agreed local/test environment. Review the actual diff and source contract; implementation readiness or a green isolated check alone is not product acceptance. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
