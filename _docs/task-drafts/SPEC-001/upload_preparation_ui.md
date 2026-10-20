# Take a demo user from file selection and quote to a usable preview

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
- Project acceptance coverage: SPEC-001 AC-01, SPEC-001 AC-02, SPEC-001 AC-05, SPEC-001 AC-18, SPEC-001 AC-20.
- Frontend acceptance coverage: FE-AC-02, FE-AC-03, FE-AC-06, FE-AC-08.

## Increment and context

Take a demo user from file selection and quote to a usable preview. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- Connect picker/inspection/quote/capacity/insufficient-credit states to services; selecting a file or buying a pack never starts processing.
- Show real mock stages/error/accounting state and full-video Original/background audition with simultaneous subtitle/list highlights.
- Separate editor selection/focus from playback following, handle reload/expired session and sample switch honestly. Wire the shell's demo entry, return destination and sign-out to the executable session facade, clearing account-owned caches/observers and stopping active device work on session teardown.

- Follow-up owner decisions (2026-10-20): Show 10-minute/250 MB MP4/MOV/WebM limits and <=120-second section selector, mixed EN/RU, selected-duration quote, cancellation cost confirmation and deletion charge warning.

## Out of scope

- Turn correction forms, actual AI, real checkout and active microphone recording.
- Local transport/business-rule duplication in components or Zustand actions.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: New dub/processing/Prepare player-list feature screens and Zustand orchestration through services.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: [Render the flat visual system and responsive public/account shell](visual_system_shell.md); [Exercise sample preparation and explicit correction disposition without AI](mock_preparation_lifecycle.md).
- Blocks: [Correct prepared turns and add a missed line without losing saved work](turn_correction_ui.md); [Buy demo credit packs and return to the original preparation quote](credits_purchase_ui.md).
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: Exact codec/normalization limits and D03 stage/race mechanics; section selection is now included scope.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: The complete selection/quote/start/ready flow is service-authoritative.
- [ ] AC-02: Invalid/capacity/insufficient-credit/processing failure states recover without fake ready state.
- [ ] AC-03: Preview highlights overlapping lines without stealing selected editor focus.

- [ ] AC-04: User selection controls canonical preview/quote; credit/capacity explanations match 120 welcome, 1 credit/second ceil and 2/10 slots.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Use the executable mock adapter from demo entry through explicit preparation; assert correct account/amount, protected-destination reload and return behavior. On custom-to-sample identity change or stale price, reject the prior quote and require confirmation of the new quote; purchase/file selection alone starts no work. |
| AC-02 | Inject each named scenario and inspect visible action/reason, persisted operation and ledger result. |
| AC-03 | Play annotated sample, switch Original/background at the same source position, and manually select/scroll; verify simultaneous highlights, editor focus and restored follow action. Render hostile caption markup as text; failure/unavailable background is never silently replaced with original dialogue. |

| AC-04 | UI-test longer input selection, invalid bounds, 12.4=>13, selection retention through checkout, queued/running cancel and failure with old preparation preserved; fixture switch remains explicit. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver the scoped artifacts and executed acceptance evidence in the agreed local/test environment. Review the actual diff and source contract; implementation readiness or a green isolated check alone is not product acceptance. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
