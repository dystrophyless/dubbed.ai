# Establish the real media pipeline's quality, latency and cost envelope

Local draft: not synchronized. No GitHub issue exists or issue number is allocated.
Created: 2026-10-20 (Asia/Qyzylorda).

## Task kind

Investigation

## Workflow status

draft

## Requirement and specification

- [SPEC-001](../../specifications/SPEC-001_dubbed_mvp.md), revision 0.5, synchronized with the owner follow-up brainstorm.
- [SPEC-002](../../specifications/SPEC-002_frontend.md), revision 0.5, including the confirmed neutral palette, bilingual UI and follow-up contracts.
- [BR-001](../../business-requirements/BR-001_custom_video_dubbing.md), revision 0.2; [brainstorm](../../../brainstorm.md) for decision provenance.
- Project acceptance coverage: SPEC-001 AC-03, SPEC-001 AC-04, SPEC-001 AC-08, SPEC-001 AC-24.

## Increment and context

Establish the real media pipeline's quality, latency and cost envelope. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- Evaluate EN/RU transcription/alignment, speaker overlap, laughter/scream/gasp coverage, dialogue removal and the complete preview preparation time/cost.
- Include single-speaker, noisy/music/effects, overlapping voices, uninterrupted 30-second speech, source-edge margins and phone/desktop reference/capture timing.
- Return candidate/version/hardware evidence and a recommendation or explicit infeasibility/blocker; supply inputs for production policy and pricing.

- Follow-up owner decisions (2026-10-20): Benchmark selected <=120-second preparation from <=10-minute/250 MB originals, mixed EN/RU/nonverbal/overlap and original-speaker preview isolation; test named desktop/mobile browsers and MP4 <=720p.

## Out of scope

- Production application, provider commitment, paid inference or deployment without authority.
- Treating a benchmark PASS as full product readiness or selecting owner policy.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: Bounded media/device experiment and evidence; no product modules.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: none (subject to the common source-review/execution authorization boundary).
- Blocks: [Resolve the production policy baseline needed by dependent implementation](production_policy_baseline.md); [Produce validated timed speaker turns including overlap and character sounds](dialogue_preparation.md); [Produce an auditionable music-and-effects background for a source](background_separation.md).
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: Provider/model/hardware/budget authorization and evidence; confirmed product targets are inputs, not reopened choices.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: Declare reproducible fixture permissions, candidate versions, hardware/load and timing/cost boundaries.
- [ ] AC-02: Report measured coverage, artifacts and end-to-end time/cost rather than model-only timing.
- [ ] AC-03: Characterize capture/reference synchronization and acoustic leakage on proposed devices.

- [ ] AC-04: Report actual quality/latency/cost/sync evidence including retained-original-B preview, short takes and lifetime storage/sharing assumptions; no arbitrary pack prices or stage weights.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Inspect the experiment manifest and run recipe; every measured claim maps to a source/version/environment; absent access is marked not run. |
| AC-02 | Run the declared corpus; compare annotated turns and listen to separated audio; preserve failures and correction burden, with no invented thresholds. |
| AC-03 | Use a declared device/signal protocol and retain recordings/timing observations; distinguish fake-device checks from actual acoustic measurements. |

| AC-04 | Use permitted representative samples and real devices; record stage/full costs including included/failed retries, export/payment overhead/storage/egress and define the one-minute target measurement envelope. Propose cost-backed USD packs/margins/stage allocations separately for owner decision. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver the scoped artifacts and executed acceptance evidence in the agreed local/test environment. Review the actual diff and source contract; implementation readiness or a green isolated check alone is not product acceptance. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
