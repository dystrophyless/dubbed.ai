# Resolve the production policy baseline needed by dependent implementation

Local draft: not synchronized. No GitHub issue exists or issue number is allocated.
Created: 2026-10-20 (Asia/Qyzylorda).

## Task kind

Investigation

## Workflow status

draft

## Requirement and specification

- [SPEC-001](../../specifications/SPEC-001_dubbed_mvp.md), revision 0.5, synchronized with the owner follow-up brainstorm.
- [SPEC-002](../../specifications/SPEC-002_frontend.md), revision 0.5, including the confirmed neutral palette, bilingual UI and follow-up contracts.
- [BR-001](../../business-requirements/BR-001_custom_video_dubbing.md), revision 0.2; [brainstorm](../../../brainstorm.md) for decision provenance.
- Project acceptance coverage: SPEC-001 AC-02, SPEC-001 AC-06, SPEC-001 AC-07, SPEC-001 AC-12, SPEC-001 AC-14, SPEC-001 AC-16, SPEC-001 AC-17, SPEC-001 AC-18, SPEC-001 AC-19, SPEC-001 AC-20, SPEC-001 AC-21, SPEC-001 AC-22, SPEC-001 AC-24, SPEC-001 AC-25.

## Increment and context

Resolve the production policy baseline needed by dependent implementation. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- Preserve confirmed media/browser targets, credit/trial/slot values, recording/edit/export and D13 reset policy. Present options/evidence only for remaining scoped questions in SPEC-001 §15.
- Record retention/sharing/deletion/content/support and release policy; distinguish technical D12 choices from owner product policy.
- Amend affected contracts with decision provenance and explicit remaining blockers; prevent mock profile numbers from becoming production values. Preserve confirmed success-after-project-deletion charging and included account deletion. Resolve only remaining stage/race/financial/retention details; account identity owns disable/access fencing and the sharing/deletion task owns project/media cleanup.

- Follow-up owner decisions (2026-10-20): Use confirmed brainstorm answers as inputs, not questions to reopen. Resolve remaining stage allocations, prices, reservation/race/reversal/account-balance, cleanup/content/abuse and still-zero-turn-export policy from evidence.

## Out of scope

- Automatically approving specs or silently selecting prices, refunds, take deletion or legal policy.
- Creating executable tasks/issues beyond this package, making purchases or implementing checkout.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: Decision records and affected shared spec/BR policy sections; no application implementation.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: [Establish the real media pipeline's quality, latency and cost envelope](media_feasibility.md).
- Blocks: [Freeze API, timeline and durable data contracts for real integration](backend_contracts_schema.md); [Establish final acceptance and the actual delivery readiness of the MVP](release_acceptance_gate.md).
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: Remaining owner/evidence decisions only; no whole-document approval inferred from saving the brainstorm.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: Every relevant decision has a recorded owner answer or an explicit scoped blocker with affected task/AC and resume condition. A completed investigation report may retain blockers; it does not approve policy or unblock all consumers.
- [ ] AC-02: Cross-document policies agree and preserve explicit chat choices.
- [ ] AC-03: Production release/support limits are stated without unsupported promises.

- [ ] AC-04: Decision register distinguishes resolved D04/D05/D06/D13 from partially open decisions and assigns each remaining blocker to an affected consumer.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Audit D01–D13 against the source decision log and impacted tasks; unresolved work is not marked ready. |
| AC-02 | Trace each adopted answer through BR/spec clauses and AC; check trial maximum-video coverage, retry accounting and correction activation consistency. |
| AC-03 | Inspect policy/cost/retention/support record; evidence-backed claims and unmet release requirements remain distinguishable. |

| AC-04 | Trace brainstorm §17 through BR/specs/tasks; reject arbitrary USD prices, 20/30 stage weights or claimed tested browser/AI support; record scoped resume conditions. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver the scoped artifacts and executed acceptance evidence in the agreed local/test environment. Review the actual diff and source contract; implementation readiness or a green isolated check alone is not product acceptance. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
