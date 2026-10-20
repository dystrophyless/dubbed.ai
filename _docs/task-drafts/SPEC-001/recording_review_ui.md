# Record and safely review one durable take per turn

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
- Project acceptance coverage: SPEC-001 AC-06, SPEC-001 AC-08, SPEC-001 AC-09, SPEC-001 AC-10, SPEC-001 AC-13.
- Frontend acceptance coverage: FE-AC-02, FE-AC-04, FE-AC-08.

## Increment and context

Record and safely review one durable take per turn. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- Implement original audition, immediate Record with video hidden/text visible/full reference audio, progress and auto-stop.
- Persist via services, remain on current turn and provide explicit Play my take/Retry/Next with one current take.
- During saving/failure play labeled old saved take or disable if absent; commit changes next playback only; restore saved media/progress after reload.

- Follow-up owner decisions (2026-10-20): Provide optional audition, early Stop, separate recoverable-attempt review/accept/retry and saved-versus-original per-character context preview.

## Out of scope

- Multiple-take history, countdown, visible video while capturing, automatic replay/next, time stretching.
- Actual exported video generation or introducing direct persistence/network calls.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: Record feature view/Zustand orchestration, candidate persistence integration and saved-take local preview.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: [Correct prepared turns and add a missed line without losing saved work](turn_correction_ui.md); [Capture a bounded local microphone take synchronized to reference audio](browser_capture_adapter.md); [Persist and restore the demo workspace through the shared facade](mock_workspace_persistence.md).
- Blocks: [Resume projects and manage honest finished results and public demo links](results_projects_sharing_ui.md).
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: Exact recoverable-candidate UI/durability and real speaker-isolation/sync quality; no fixed-minimum recording duration.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: Recorded interaction matches the chosen source decisions.
- [ ] AC-02: Failed replacement preserves take identity and playback labels.
- [ ] AC-03: Saved take preview and resume use durable actual recorded media.

- [ ] AC-04: Use saved A plus original B until B is saved, then both takes/background; user can hear/accept imperfect isolation. Short saved take is valid; safe replacement/lock semantics remain intact.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Browser-test current text/reference/video-hidden/no-countdown/fixed-stop and explicit post-take controls with actual mock services. |
| AC-02 | Create A then saving/failed B with/without A; verify old playback/disabled absence, no auto-switch, successful B only on next play. |
| AC-03 | Reload/reopen after save and failed save; compare asset/window/revision and hear actual captured voice plus one processed background aligned to visible source video, using saved voices for recorded characters and original voices only for unrecorded characters. Test user audition of imperfect original-speaker isolation; final export has no intended original dialogue. Label injected/simulated capture, verify saved playback is stopped before a new reference starts, and preserve the exact active playback identity until an explicit next play. |

| AC-04 | Exercise original-B fallback and both-saved overlap, short take and recoverable interruption, failed save then commit and text/timing invalidation. Test on named target devices; fixture isolation is not real model proof. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver the scoped artifacts and executed acceptance evidence in the agreed local/test environment. Review the actual diff and source contract; implementation readiness or a green isolated check alone is not product acceptance. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
