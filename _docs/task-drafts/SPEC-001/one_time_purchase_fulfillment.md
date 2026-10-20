# Fulfill verified one-time credit purchases and the permanent slot upgrade once

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
- Project acceptance coverage: SPEC-001 AC-14, SPEC-001 AC-18, SPEC-001 AC-21, SPEC-001 AC-22, SPEC-001 AC-23.

## Increment and context

Fulfill verified one-time credit purchases and the permanent slot upgrade once. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- Create an explicitly requested one-time checkout from server-controlled offer/account identity, with no subscription or automatic purchase.
- Verify provider success/amount/currency and reconcile receipts before granting credits and permanent slot upgrade.
- Handle pending/failure/duplicate/out-of-order/missing-browser-return and approved reversal rules with durable identities.

- Follow-up owner decisions (2026-10-20): Fulfill one-time USD credit packs and permanent 2-to-10 upgrade once; free/purchased credits non-expiring, purchase does not replenish retry or start AI.

## Out of scope

- Real card charges/live purchases, owner pricing decisions, preparation job startup or custom client-granted balances.
- Treating mocked callback handling as payment-provider integration proof.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: Checkout/provider adapter, purchase receipts/reconciliation, ledger purchase grants and first-purchase entitlement transaction.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: [Maintain durable trial and preparation credit accounting](credit_reservations.md); [Authenticate account-owned access and initialize eligible accounts once](account_identity.md).
- Blocks: [Run the existing frontend through the real backend services adapter](frontend_real_adapter.md).
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: Measured pack sizes/USD prices/provider and reversal/account-deletion financial treatment.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: Provider test-mode success credits correct account/offer and upgrades once.
- [ ] AC-02: Forged/replayed/wrong-amount/pending/out-of-order/missing-response paths cannot double-credit.
- [ ] AC-03: Purchase is separate from processing and purchased credit non-expiry is preserved.

- [ ] AC-04: Verified successful receipt grants configured credits/upgrade once regardless of callbacks/account linking; pending/failed receipts grant nothing.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Run chosen provider sandbox/test flow; inspect verified receipt plus real PostgreSQL ledger/entitlement. |
| AC-02 | Exercise raw receipt validation and concurrent reconciliation; failed verification grants nothing; approved reversal outcome explicit. |
| AC-03 | Close the browser around provider success, or delete the originating project while payment is pending, then reconcile/reload the account. The successful purchase and permanent upgrade remain reconcilable once, independent of project failure/deletion; no preparation is created. Exercise approved reversals separately; time/policy changes cannot silently expire purchased credits. |

| AC-04 | Provider test-mode receipt duplicates/out-of-order verification, first/repeat purchase, linked identity balance/library and no new retry or automatic processing. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver the scoped artifacts and executed acceptance evidence in the agreed local/test environment. Review the actual diff and source contract; implementation readiness or a green isolated check alone is not product acceptance. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
