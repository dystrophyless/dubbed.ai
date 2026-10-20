# Resume projects and manage honest finished results and public demo links

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
- Project acceptance coverage: SPEC-001 AC-12, SPEC-001 AC-13, SPEC-001 AC-14, SPEC-001 AC-15, SPEC-001 AC-16, SPEC-001 AC-17.
- Frontend acceptance coverage: FE-AC-02, FE-AC-05, FE-AC-08.

## Increment and context

Resume projects and manage honest finished results and public demo links. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- List actual mock projects/slots/progress, resume correct stage, revisit turns and request a new finished generation.
- Show rendering/failed/stale/current states, fixture output labeling, actual sample download and same-browser share limitation.
- Implement anonymous public result route plus named delete warning/confirmation, failure and late-job behavior.

- Follow-up owner decisions (2026-10-20): Expose all-turn export guards, MP4/720p selected-section output, same-link sharing off/on, 2/10 slots, no inactivity expiry and confirmed account/project deletion consequences.

## Out of scope

- Globally hosted links, actual local encoder, public gallery or hidden incomplete-export audio fallback.
- Pretending a fixture export contains the latest recorded user take.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: My projects, Result, public share and deletion UX features through services.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: [Record and safely review one durable take per turn](recording_review_ui.md); [Simulate finished generations and local share deletion honestly](mock_result_lifecycle.md); [Render the flat visual system and responsive public/account shell](visual_system_shell.md).
- Blocks: [Prove the full backend-free frontend milestone](frontend_mock_integration_gate.md).
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: Zero-turn export, exact cleanup/cache and delivery limits; actual backend/media proof is later.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: Result/download/share refer to the same declared finished fixture identity.
- [ ] AC-02: Resume/re-record/out-of-order exports preserve a coherent latest finished view.
- [ ] AC-03: Delete/cancel/failure and late completion have truthful accessible states.

- [ ] AC-04: Previous finished video remains during rerender/failure; missing/timing-invalid turns prevent new export and short valid takes do not.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Download/read media bytes and compare generation/provenance; public route is playable after sign-out in same storage. |
| AC-02 | Run persistent sample, fail/reverse replacement exports and verify no pending/stale output is labeled latest. |
| AC-03 | Exercise focus/confirmation, cancel and backend-like failure; confirmed deletion invalidates link and late event cannot resurrect it. |

| AC-04 | Test added/timing-edited turns, early valid take, retained previous result, off/on identical link, delete while processing warning and no refund copy; verify EN/RU states. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver the scoped artifacts and executed acceptance evidence in the agreed local/test environment. Review the actual diff and source contract; implementation readiness or a green isolated check alone is not product acceptance. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
