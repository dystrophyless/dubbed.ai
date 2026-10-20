# Establish final acceptance and the actual delivery readiness of the MVP

Local draft: not synchronized. No GitHub issue exists or issue number is allocated.
Created: 2026-10-20 (Asia/Qyzylorda).

## Task kind

Verification gate

## Workflow status

draft

## Requirement and specification

- [SPEC-001](../../specifications/SPEC-001_dubbed_mvp.md), revision 0.5, synchronized with the owner follow-up brainstorm.
- [SPEC-002](../../specifications/SPEC-002_frontend.md), revision 0.5, including the confirmed neutral palette, bilingual UI and follow-up contracts.
- [BR-001](../../business-requirements/BR-001_custom_video_dubbing.md), revision 0.2; [brainstorm](../../../brainstorm.md) for decision provenance.
- Project acceptance coverage: SPEC-001 AC-25.
- Frontend acceptance coverage: FE-AC-10.

## Increment and context

Establish final acceptance and the actual delivery readiness of the MVP. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- Reconcile full BR/spec/task-to-proof coverage including real pipeline and separately useful backend-free frontend milestone.
- Confirm required policies, usage/quality messaging, payment/credit/project/link support, reproducible recovery and actual delivery state.
- Return an evidence-backed accept/blocked verdict with exact revisions, residual risk, delivery conditions and next action; do not close nonexistent issues.

- Follow-up owner decisions (2026-10-20): Reassess the synchronized revision 0.5 package and measured capability/cost policies before any release verdict; preserve confirmed owner choices.

## Out of scope

- Merge/deployment/store publication, owner-approval fabrication or redefining incomplete AC as out of scope.
- Hidden feature implementation or unapproved legal conclusions.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: Final product/operational acceptance record, requirement coverage, support/release checklist and concise handoff; no deployment or feature implementation.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: [Prove the complete real-service dubbing journey and failure recovery](real_product_integration_gate.md); [Prove the full backend-free frontend milestone](frontend_mock_integration_gate.md); [Resolve the production policy baseline needed by dependent implementation](production_policy_baseline.md).
- Blocks: none.
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: Whole-document/task readiness and final independent review of changed contracts, measured costs/quality, remaining owner policies and actual delivery authority.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: Every required outcome has compatible verified evidence and accepted decision provenance.
- [ ] AC-02: Operational/support and public claims match the actual environment and approved limits.
- [ ] AC-03: Acceptance explicitly covers revision, evidence, delivery and residual risks.

- [ ] AC-04: No stale earlier review is treated as review of new contracts; missing provider/device/cost/content/retention evidence is a named blocker, not accepted risk by default.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Audit BR R01–R22, project AC-01–AC-25, FE-AC-01–FE-AC-10, prior gate verdicts and open defects against compatible revisions. A completed report with FAIL/BLOCKED is not a passing prerequisite. Missing owner decisions, unresolved mandatory checks or blocking proof yields BLOCKED, not accepted. |
| AC-02 | Walk trial/billing/deletion/permission/error support and recovery documentation; distinguish local/hosted/deployed evidence. |
| AC-03 | Record actual human or valid delegated acceptance and fulfilled conditions; no final product-complete claim before those are met. |

| AC-04 | Trace all confirmed decisions to owner/proof and actual integrated results; check USD pack/stage policy, original-speaker isolation, browser versions, account cleanup and user-visible truthful limits. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver a bounded evidence-backed verdict and full finding accounting, not feature changes hidden inside a verification task. Blocking defects route to their owning draft or an authorized follow-up. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
