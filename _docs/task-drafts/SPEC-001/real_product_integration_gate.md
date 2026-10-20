# Prove the complete real-service dubbing journey and failure recovery

Local draft: not synchronized. No GitHub issue exists or issue number is allocated.
Created: 2026-10-20 (Asia/Qyzylorda).

## Task kind

Verification gate

## Workflow status

draft

## Requirement and specification

- [SPEC-001](../../specifications/SPEC-001_dubbed_mvp.md), revision 0.5, synchronized with the owner follow-up brainstorm.
- [SPEC-002](../../specifications/SPEC-002_frontend.md), revision 0.5, including the confirmed neutral palette, bilingual UI and follow-up contracts.
- [BR-001](../../business-requirements/BR-001_custom_video_dubbing.md), revision 0.2; [brainstorm](../../../brainstorm.md) for decision provenance.
- Project acceptance coverage: SPEC-001 AC-01, SPEC-001 AC-02, SPEC-001 AC-03, SPEC-001 AC-04, SPEC-001 AC-05, SPEC-001 AC-06, SPEC-001 AC-07, SPEC-001 AC-08, SPEC-001 AC-09, SPEC-001 AC-10, SPEC-001 AC-11, SPEC-001 AC-12, SPEC-001 AC-13, SPEC-001 AC-14, SPEC-001 AC-15, SPEC-001 AC-16, SPEC-001 AC-17, SPEC-001 AC-18, SPEC-001 AC-19, SPEC-001 AC-20, SPEC-001 AC-21, SPEC-001 AC-22, SPEC-001 AC-23, SPEC-001 AC-24, SPEC-001 AC-25.
- Frontend acceptance coverage: FE-AC-07, FE-AC-09, FE-AC-10.

## Increment and context

Prove the complete real-service dubbing journey and failure recovery. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- Run full eligible account/trial -> real upload/preparation/correction -> original-reference capture -> retry/save/reload -> actual rendered output/download/public share -> re-record/latest link -> deletion.
- Exercise relevant backend DB/worker/storage/client races, insufficient credits/pack sandbox/replayed purchase, stage failure/refund and authorization.
- Reconcile requirement-to-revision-to-proof on one compatible environment and report audio/time/cost/device limitations and unresolved defects.

- Follow-up owner decisions (2026-10-20): Prove the full confirmed follow-up contract with real services, including bilingual verified accounts/linking/deletion, section selection, charging/cancel, short takes, overlap-original preview and latest-share behavior.

## Out of scope

- Implementing missing product behavior within the gate, doing live charges or deployment without authorization.
- Claiming mock-fixture, fake-device or disconnected module PASS proves real end-to-end output/security.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: SPEC-001 AC-01–AC-25 integrated evidence and defect routing; feature corrections stay with owning tasks.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: [Make the application environment reproducible and recoverable](delivery_recovery_environment.md).
- Blocks: [Establish final acceptance and the actual delivery readiness of the MVP](release_acceptance_gate.md).
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: Remaining applicable D01–D03/D07–D12 evidence, actual infrastructure and authorization; no product PASS from mocks.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: The report accounts for all 25 project criteria. Gate PASS requires actual compatible integration proof for every required criterion; any missing, failed or blocked proof yields FAIL/BLOCKED even when evidence accounting is complete.
- [ ] AC-02: Actual microphone takes appear at intended positions in actual downloadable rendered video.
- [ ] AC-03: Failure/monetary/privacy/deletion seams preserve invariants under the integrated environment.
- [ ] AC-04: The timing and cost target are measured rather than asserted.

- [ ] AC-05: End-to-end evidence covers all-turn MP4 output plus failure/recovery/account-access/ledger invariants on declared real browser/device/model versions; unresolved zero-turn/monetary edges stay blocked.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Execute SPEC-001 §12's full criterion/scenario matrix in one compatible environment, including the primary journey and necessary isolated failure variants. Record annotated real fixtures, policy/adapter/model/DB/storage/worker/frontend/backend revisions and browser/device evidence. A collection of unrelated unit or mocked task passes cannot replace the journey. |
| AC-02 | Measure/look/listen to distinct takes, overlap and quiet intervals; compare output provenance/duration and supported-device sync tolerance. |
| AC-03 | Inject §12's replay/timeout/order failures and sandbox purchases; include both actual capture/activation orderings, five durable takes followed by a missed-line/recorded-turn correction, pending-reservation deletion with late workers, successful payment during project deletion, and expired/non-owner asset access. Inspect ledger, retained takes, revisions, links and actual D08 delivery/cache boundaries; no revival, lost independent purchase, double charge or silent correction reset. Rehearse failed/rejected/superseded preparation, candidate/take and render-output retirement with cleanup replay/restart while a project remains active; retained current media, frozen exports and active playback obey the selected D08 reference/lifetime contract. |
| AC-04 | Report full preparation timing boundaries/load/quality/cost and owner disposition of deviations; no PASS if mandatory target/evidence unresolved. |

| AC-05 | Run selected 120-second and mixed-language/overlap sources, 12.4=>13 quote, 120 welcome/2-to-10 slots, once-only retry, reset/lock/edit guards, early/interrupted recording and deletion/cancel races; measure media/sync/quality and file provenance. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver a bounded evidence-backed verdict and full finding accounting, not feature changes hidden inside a verification task. Blocking defects route to their owning draft or an authorized follow-up. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
