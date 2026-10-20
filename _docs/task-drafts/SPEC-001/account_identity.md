# Authenticate account-owned access and initialize eligible accounts once

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
- Project acceptance coverage: SPEC-001 AC-01, SPEC-001 AC-21, SPEC-001 AC-23.

## Increment and context

Authenticate account-owned access and initialize eligible accounts once. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- Implement chosen sign-in/session/sign-out and server-owned account identity, permissions and supported recovery/account lifecycle contract.
- Expose policy/session capabilities and an idempotent account eligibility event consumed by the credit-ledger trial grant. Initialize the approved free project-slot entitlement once as account state; purchase fulfillment owns the later permanent upgrade. Do not grant preparation credits in the identity handler.
- Enforce cross-account/unauthenticated boundaries for subsequent project/resource consumers.

- Follow-up owner decisions (2026-10-20): Own Google and email/password authentication, registration email verification, password reset, explicit verified linking and confirmed account disable/delete initiation. Identity owns sessions/access fencing; downstream lifecycle task owns project/media cleanup.

## Out of scope

- Crediting payments/trial balance directly in the auth controller or pretending browser redirect proves identity/payment.
- Unselected social providers or collaboration roles.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: Backend identity/session/authentication, account eligibility and authorization boundary; not credit-ledger settlement.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: [Freeze API, timeline and durable data contracts for real integration](backend_contracts_schema.md).
- Blocks: [Create resumable projects with validated durable source media](project_media_upload.md); [Maintain durable trial and preparation credit accounting](credit_reservations.md); [Fulfill verified one-time credit purchases and the permanent slot upgrade once](one_time_purchase_fulfillment.md).
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: Session/provider/security configuration, trial-recreation abuse and account-deletion financial/retention policy remain; selected auth/deletion launch scope is settled.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: Configured sign-in/session flow returns the same durable account and handles expiration/sign-out.
- [ ] AC-02: Unauthorized or cross-account access is denied without asset/account leakage.
- [ ] AC-03: Duplicate initialization yields one eligible account/grant signal identity.

- [ ] AC-04: Unverified password registration cannot finish; linking proves ownership and keeps one account/library/balance/grant; confirmed deletion disables sessions and private/public account access immediately through common auth guards.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Use chosen provider test/local-auth environment; verify server session and expired/forged credentials. |
| AC-02 | Exercise two isolated accounts and anonymous requests at shared auth/resource checks. |
| AC-03 | Replay/concurrently handle identity callback and restart after account/event persistence; inspect one durable account, baseline free-slot entitlement and reconcilable eligibility event. The ledger consumer proves the trial credit once; an emitted event alone is not grant fulfillment. |

| AC-04 | Test verify/reset expired/replayed tokens and forged/duplicate linking with two accounts; concurrent callbacks create one eligibility signal; account disable blocks owner/share access and emits idempotent cleanup identity. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver the scoped artifacts and executed acceptance evidence in the agreed local/test environment. Review the actual diff and source contract; implementation readiness or a green isolated check alone is not product acceptance. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
