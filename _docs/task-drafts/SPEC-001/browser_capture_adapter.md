# Capture a bounded local microphone take synchronized to reference audio

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
- Project acceptance coverage: SPEC-001 AC-08, SPEC-001 AC-09.
- Frontend acceptance coverage: FE-AC-04, FE-AC-08, FE-AC-10.

## Increment and context

Capture a bounded local microphone take synchronized to reference audio. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- Implement permission/readiness, reference playback, immediate fixed-window capture, auto-stop, interruption and cleanup.
- Return candidate blob/window/revision data without committing it as saved; stop prior take playback before capture.
- Provide deterministic device/clock test injection and actual browser measurement procedure.

- Follow-up owner decisions (2026-10-20): Support early Stop within the maximum window, independent reference volume and recoverable interrupted-candidate audio without automatic replacement.

## Out of scope

- Take persistence, global state ownership, waveform decoration, real AI or a downloadable rendered video.
- Treating fake-device success as phone acoustic/synchronization proof.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: Injectable device capture/playback adapters, media handle/URL lifecycle and timing harness; no feature UI.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: [Freeze the frontend facade and enforce its transport boundary](frontend_service_contract.md); [Provide playable, annotated and permitted dubbing fixtures](demo_media_fixtures.md).
- Blocks: [Record and safely review one durable take per turn](recording_review_ui.md).
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: Capture tolerance, browser versions/codec/device recovery details and actual acoustic evidence D01/D09/D10.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: Ready capture starts without countdown and ends at the declared window under measured demo tolerance.
- [ ] AC-02: Permission/playback denial/interruption yields no false successful candidate.
- [ ] AC-03: Handles/listeners/URLs do not leak or continue after teardown.

- [ ] AC-04: Ordinary shorter recording is valid, cannot exceed window, and reference volume does not change microphone gain; interrupted recoverable audio is distinguishable from durable current take.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Run a known window, including [3,7] mapping to local [0,4], with a timing signal/injected clock and then real browser media. Record actual start/stop/drift and decoded candidate duration against the named demo tolerance, plus acoustic reference leakage separately. No timer-only/fake-device pass proves physical phone synchronization or a production D10 value. |
| AC-02 | Inject unavailable track, permission revoke, backgrounding and stopped reference; assert typed failure and resource cleanup. |
| AC-03 | Repeat start/stop/navigation disposal with fixture devices and browser inspection; no hidden ongoing mic/reference playback. |

| AC-04 | Record one/two seconds in four-second window, auto-stop at four, vary reference volume, revoke device/interruption and inspect recoverable bytes; measure actual target-device sync/leakage. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver the scoped artifacts and executed acceptance evidence in the agreed local/test environment. Review the actual diff and source contract; implementation readiness or a green isolated check alone is not product acceptance. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
