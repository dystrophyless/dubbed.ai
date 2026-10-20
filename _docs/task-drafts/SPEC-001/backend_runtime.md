# Run FastAPI against an isolated PostgreSQL and SQLAlchemy test environment

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

## Increment and context

Run FastAPI against an isolated PostgreSQL and SQLAlchemy test environment. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- Establish reproducible FastAPI/PostgreSQL/SQLAlchemy start/check/test workflow and server-owned configuration/secrets handling.
- Provide real isolated PostgreSQL fixtures, clean teardown and migration-upgrade checks rather than SQLite-only transaction claims.
- Keep business tables/routes and AI/payment/storage adapters out until their contract tasks.

- Follow-up owner decisions (2026-10-20): Retain selected FastAPI/PostgreSQL/SQLAlchemy foundation; include isolated test configuration supporting forthcoming auth/ledger/job lifecycle checks.

## Out of scope

- Running against a user/production database, installing unrelated infrastructure or selecting owner pricing/product policy.
- Assuming a live health endpoint proves application workflows.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: Backend package/runtime/configuration, database connection/session baseline, migrations/test harness and local health checks.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: none (subject to the common source-review/execution authorization boundary).
- Blocks: [Freeze API, timeline and durable data contracts for real integration](backend_contracts_schema.md).
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: D12 driver/session/migration/runtime choices; application stack stays selected.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: A clean environment starts API and reaches only its explicitly isolated database.
- [ ] AC-02: The test database and baseline migration lifecycle are reproducible.
- [ ] AC-03: Secrets/errors and test harness have appropriate boundaries.

- [ ] AC-04: Runtime/migration tests are reproducible in isolated resources without introducing a provider or production deployment by assumption.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Run documented setup/health/test commands and verify actual DB identity/version; absence/misconfiguration fails clearly. |
| AC-02 | Create/upgrade/drop an owned fixture and verify cleanup; failure cannot delete unrelated databases. |
| AC-03 | Exercise invalid config/DB connection failure, redacted error and cleanup path; no product PASS inferred. |

| AC-04 | Record actual commands/versions and run isolated API/database checks; upcoming auth/media/billing behavior remains not run here. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver the scoped artifacts and executed acceptance evidence in the agreed local/test environment. Review the actual diff and source contract; implementation readiness or a green isolated check alone is not product acceptance. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
