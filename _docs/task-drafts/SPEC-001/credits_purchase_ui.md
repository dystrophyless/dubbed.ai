# Buy demo credit packs and return to the original preparation quote

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
- Project acceptance coverage: SPEC-001 AC-14, SPEC-001 AC-18, SPEC-001 AC-20, SPEC-001 AC-21, SPEC-001 AC-22.
- Frontend acceptance coverage: FE-AC-02, FE-AC-06, FE-AC-08.

## Increment and context

Buy demo credit packs and return to the original preparation quote. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- Display available/reserved/history, trial and slots without counting reservations as spent or credits as project space.
- Present clearly simulated one-time packs, pending/failure/success/reconciliation and non-expiry messaging from policy.
- Return to preserved source/valid quote after purchase; require separate explicit Prepare action.

- Follow-up owner decisions (2026-10-20): Show selected-duration ceil quotes, 120 non-expiring welcome credits, USD pack offers only after policy measurement, 2-to-10 permanent slots and exactly one retry/project.

## Out of scope

- Card collection, recurring billing, real payments or new production price/slot decisions.
- Optimistic grants or starting AI work on checkout return.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: Credits/account allowance view, one-time simulated checkout and purchase-return UI.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: [Render the flat visual system and responsive public/account shell](visual_system_shell.md); [Simulate credit quotes, reservations and one-time purchases consistently](mock_credit_accounting.md); [Take a demo user from file selection and quote to a usable preview](upload_preparation_ui.md).
- Blocks: [Prove the full backend-free frontend milestone](frontend_mock_integration_gate.md).
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: Measured USD packs/prices/margins/payment provider, D03 reversal treatment; no invented cash exchange rate.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: Amounts/entitlements agree with ledger through pending/success/failure/replay.
- [ ] AC-02: Insufficient-credit purchase returns to selected video without hidden work.
- [ ] AC-03: Credits screens stay readable and operable on narrow/keyboard layouts.

- [ ] AC-04: Mock provisional packs are labeled; purchase never auto-starts processing or replenishes included retry; free/purchased non-expiry is clear.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Drive mock checkout and reload; assert history categories, one grant and permanent profile upgrade. |
| AC-02 | Start from a quote, simulate purchase, return and verify no job until Prepare; stale price requires confirmation. |
| AC-03 | Test stacked history/pack controls/focus, no remote checkout or confidential form fields. |

| AC-04 | Check both locales, quote return, duplicate/pending success, first-purchase upgrade once, extra paid preparation without new included retry and no hidden expiry. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver the scoped artifacts and executed acceptance evidence in the agreed local/test environment. Review the actual diff and source contract; implementation readiness or a green isolated check alone is not product acceptance. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
