# Authorize recording and commit a compatible durable take safely

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
- Project acceptance coverage: SPEC-001 AC-07, SPEC-001 AC-08, SPEC-001 AC-09, SPEC-001 AC-10, SPEC-001 AC-13, SPEC-001 AC-23.

## Increment and context

Authorize recording and commit a compatible durable take safely. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- Bind recording authorization to source/turn/window revision and enforce preparation-lock rules atomically.
- Persist validated candidate media, then replace current association only after durable compatible commit; retain old take through failure.
- Expose authoritative saved-take identity/progress/media to browser resumption/review and handle stale candidate commits by D06. Use the preparation coordinator's shared D05 guard; completing this task includes real producer/consumer race proof and recorded-turn correction/re-recording recovery.
- Register failed/unassociated candidates and replaced take assets for shared reference-safe retirement under D08; preserve the previous current take until commit and honor retained export inputs/active playback lifetimes. Do not turn temporary candidate cleanup into a multi-take library.

- Follow-up owner decisions (2026-10-20): Commit valid shorter takes within maximum window; record permanent first-successful-save lock; safely distinguish recovered candidate from current take.

## Out of scope

- Browser device capture or displaying countdown/video, multiple-take history or full rendering.
- Treating completed browser capture/object upload alone as committed success.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: Capture permit/lock, candidate upload/validation/current-take commit APIs and recording progress.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: [Persist revision-safe turn corrections and manually added dialogue](preparation_corrections.md); [Create resumable projects with validated durable source media](project_media_upload.md).
- Blocks: [Render a full source-timeline video using current recorded performances](full_video_rendering.md); [Run the existing frontend through the real backend services adapter](frontend_real_adapter.md).
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: Capture tolerance/codec/window validation and recovery durability; product lock/short-take rules selected.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: Valid recorded candidate becomes the one current playable durable take.
- [ ] AC-02: Candidate/store/association/response failure preserves old take and reconciles replay.
- [ ] AC-03: Stale/deleted/reprocessed/revised capture cannot commit against incompatible truth.

- [ ] AC-04: Failed first capture/save never locks; first successful save locks forever. Timing-incompatible candidates do not replace old current; text/label-only changes preserve compatibility.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Upload known bounded capture, commit and reload/play through the owner API; decoded media type/duration and window identity match the permit under D01/D10. Reject corrupt, wrong-duration, unready or cross-account candidates with bounded validation; candidate upload alone never enables saved playback. |
| AC-02 | Crash/inject each boundary on isolated real storage/DB; no double-current or old-take deletion before success. Replay candidate/replaced-take cleanup after commit and verify retained current/export references and already active old-take playback remain valid for the declared D08 lifetime; subsequent explicit playback resolves the new current take. |
| AC-03 | Through actual endpoints, race begin-capture/commit against preparation activation in both orders, stale permit/window, correction and deletion. Assert only D05/D06-allowed serialized outcomes with explicit conflict/unavailability otherwise. Commit five takes, edit a recorded turn/add a missed turn, and re-record; retain unrelated takes and prove the reported compatibility/lock state after reload. |

| AC-04 | Real media/DB commits at short/max/over-window boundaries, interrupted recoverable acceptance, failed-save replay, concurrent edit/reset and later deletion of all takes; verify one durable current and no unlocked reprocessing. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver the scoped artifacts and executed acceptance evidence in the agreed local/test environment. Review the actual diff and source contract; implementation readiness or a green isolated check alone is not product acceptance. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
