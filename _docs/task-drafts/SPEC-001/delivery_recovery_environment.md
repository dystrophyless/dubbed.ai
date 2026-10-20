# Make the application environment reproducible and recoverable

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
- Project acceptance coverage: SPEC-001 AC-13, SPEC-001 AC-17, SPEC-001 AC-19, SPEC-001 AC-23, SPEC-001 AC-25.

## Increment and context

Make the application environment reproducible and recoverable. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- Document and configure reproducible API/worker/PostgreSQL/storage/frontend startup and declared limits without embedding secrets.
- Provide version-compatible rollout/rollback and isolated backup/restore rehearsal preserving media references, ledger and pending operations.
- Declare supported environment, redacted diagnostics/support and cache/deletion configuration; use local isolated deployment if no hosted action authorized.

- Follow-up owner decisions (2026-10-20): Preserve current project/take retention until deletion, confirmed account/link access removal, account-level billing after project deletion and selected browser/output target reporting.

## Out of scope

- Unapproved cloud resources, production migration/restore/deploy, live payment/inference or claiming local results are hosted proof.
- Adding monitoring dashboards/operational features unrelated to the specified recovery obligations.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: Environment/deployment configuration, migration/startup/health/worker configuration, backup/restore/rollback runbooks and operational diagnostics.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: [Run the existing frontend through the real backend services adapter](frontend_real_adapter.md).
- Blocks: [Prove the complete real-service dubbing journey and failure recovery](real_product_integration_gate.md).
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: Deployment/storage/recovery configuration, retention mechanics and billing/data obligations; no inactivity expiry may be introduced.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: Clean documented environment starts compatible app/worker/schema and fails clearly when configuration is wrong.
- [ ] AC-02: Backup/restore/rollback rehearsal preserves current takes, ledger and generation/operation references.
- [ ] AC-03: Recovery/support/cache/deletion evidence is sufficient for the declared delivery boundary.

- [ ] AC-04: Rollback/backup/recovery does not restore deleted access, duplicate welcome grants or lose saved compatible takes/ledger history; retained records match declared policy.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Run exact commands on an owned environment; inspect versions/config identity and health, no real secret in artifacts. |
| AC-02 | Use exact owned DB/media fixture; verify restored integrity and no replayed charges, drop only declared disposable targets. |
| AC-03 | Inject worker/DB/storage/version failures and exercise runbook; label local/test/staging scope and remaining release gaps. |

| AC-04 | Exercise restore/migration/worker replay under tombstones and retained references; record actual backup/CDN/cache/URL expiration bounds and cost assumptions for ongoing retention. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver the scoped artifacts and executed acceptance evidence in the agreed local/test environment. Review the actual diff and source contract; implementation readiness or a green isolated check alone is not product acceptance. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
