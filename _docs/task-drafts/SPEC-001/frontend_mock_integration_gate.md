# Prove the full backend-free frontend milestone

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
- Project acceptance coverage: technical/demo foundation only; no standalone production acceptance claim.
- Frontend acceptance coverage: FE-AC-01, FE-AC-02, FE-AC-03, FE-AC-04, FE-AC-05, FE-AC-06, FE-AC-07, FE-AC-08, FE-AC-09, FE-AC-10.

## Increment and context

Prove the full backend-free frontend milestone. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- Run SPEC-002 T01–T10, E01–E07 and architecture/token/import checks with the actual composed facade/mock/UI/device adapters.
- Prove save/reload, failure recovery, capture/take identity, credit flow, latest sample share/deletion, no external API and correct fixture limitations.
- Capture human-reviewed phone/tablet/desktop/zoom/keyboard/contrast/reduced-motion evidence and clean local build/start/reset instructions.

- Follow-up owner decisions (2026-10-20): Integrate all confirmed follow-up behavior in the backend-free journey, including auth simulations, section selection, cancellation, shorter takes, original-speaker fixture preview and account deletion.

## Out of scope

- Implementing missing features inside the gate or demanding a future real adapter.
- Claiming production AI/payment/security/hosting correctness or passing absent actual-device evidence.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: Integrated frontend evidence/visual-accessibility baselines and remaining-defect record; fixes belong to owning tasks.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: [Resume projects and manage honest finished results and public demo links](results_projects_sharing_ui.md); [Buy demo credit packs and return to the original preparation quote](credits_purchase_ui.md).
- Blocks: [Run the existing frontend through the real backend services adapter](frontend_real_adapter.md); [Establish final acceptance and the actual delivery readiness of the MVP](release_acceptance_gate.md).
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: Accepted tooling/visual fixtures and explicit unresolved-edge profiles; real device/provider/security/cost evidence remains separate.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: The report accounts for all ten FE criteria and SPEC-002 T01–T10/E01–E07. Gate PASS requires compatible executed proof for every required criterion/check; missing, failed or blocked proof produces FAIL/BLOCKED even when the report itself is complete.
- [ ] AC-02: Backend-free/no-remote and services-only boundaries are actually enforced.
- [ ] AC-03: Visual/accessibility and physical-device limits are reported honestly.

- [ ] AC-04: Bilingual complete mock journey obeys confirmed policies while cash/stage fixtures and AI/export/global-share limits remain labeled.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Execute documented commands and one coherent persisted sample journey; link each FE-AC and T/E case to expected/actual result, artifact, adapter/profile/device and revision. Repeat actual session entry/sign-out, sample-switch/requote, post-lock missed-line correction, activation/capture race and deletion/attempt-accounting seams through the composed adapters, including deletion replay after reload and independent purchase success during deletion. Exercise retirement/cleanup of rejected preparation, failed/replaced takes and stale exports while retained media remains playable under the named profile. Individual fixture/harness passes alone cannot satisfy these integration claims. |
| AC-02 | Block remote network, run direct route reload and negative architecture fixtures; assert local media/playable blobs and no fallback. |
| AC-03 | Review 360×800, 390×844, 768×1024 and 1440×900 stable baselines with human inspection, keyboard/200% zoom/reduced-motion/actual adjacent contrast and real capture cases. Missing required manual/device access stays BLOCKED; limitations do not waive it. Do not relabel fake-device or sample exports as production proof. |

| AC-04 | Run complete/failure/reload journeys with network denied; verify contract values and section provenance, reset/lock, all-turn guard, same-token link, deletion and independent saved/candidate playback. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver a bounded evidence-backed verdict and full finding accounting, not feature changes hidden inside a verification task. Blocking defects route to their owning draft or an authorized follow-up. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
