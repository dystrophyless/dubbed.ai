# Correct prepared turns and add a missed line without losing saved work

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
- Project acceptance coverage: SPEC-001 AC-05, SPEC-001 AC-06, SPEC-001 AC-07.
- Frontend acceptance coverage: FE-AC-03, FE-AC-10.

## Increment and context

Correct prepared turns and add a missed line without losing saved work. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- Implement text/speaker edits, draggable bounded ranges with time-input/keyboard alternatives, and Add missed line.
- Expose saving/validation/stale revision/pending-edit navigation and no general split/merge controls.
- Present AI retry disposition/confirmation, retain active work on decline/unset/conflict and show recording-lock reason from services.

- Follow-up owner decisions (2026-10-20): Explain confirmed reset-on-success, permanent first-save lock and text/label versus timing compatibility.

## Out of scope

- Changing production correction policy, automatic voice/text generation or destructive reset without disposition.
- Reimplementing preparation state or pricing in a component.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: Prepare turn editor/timeline/accessibility controls and D13 confirmation interaction. The mock workspace/preparation owners supply domain mutations; route missing contract behavior to them rather than introducing a second correction or activation implementation here.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: [Take a demo user from file selection and quote to a usable preview](upload_preparation_ui.md).
- Blocks: [Record and safely review one durable take per turn](recording_review_ui.md).
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: Detailed access/readiness UI and technical revision mechanics; D05/D06/D13 product policy resolved.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: A clipped word and entirely missed line can be repaired and reloaded.
- [ ] AC-02: Invalid/stale/canceled edits cannot erase saved data.
- [ ] AC-03: Retry activation displays and applies only the advertised disposition.

- [ ] AC-04: Timing changes retain old media but require replacement before export; text/label changes preserve take; new missed turn is unrecorded.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Edit range/text/speaker, add timed line, save and reopen; assert revision and valid source range. Seed five saved takes, then add the entirely missed line after the named recording lock; corrections remain available, existing takes follow D06 and whole-video AI remains locked according to D05. No split/merge control is introduced. |
| AC-02 | Use keyboard/drag boundaries, conflicting edit and navigation cancellation; correct inline errors/focus and old state remain. |
| AC-03 | Save corrections plus added turn, accept/decline named profile, unset policy and concurrent edit; check exact preserved/reset set. |

| AC-04 | Change text/label then bounds with saved take, add missed line, assert guards and revision-safe confirmed AI reset/failure. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver the scoped artifacts and executed acceptance evidence in the agreed local/test environment. Review the actual diff and source contract; implementation readiness or a green isolated check alone is not product acceptance. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
