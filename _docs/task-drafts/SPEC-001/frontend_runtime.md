# Run a tested React and Zustand frontend in an isolated mock configuration

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
- Project acceptance coverage: technical/demo foundation only; no standalone production acceptance claim.
- Frontend acceptance coverage: FE-AC-07, FE-AC-09, FE-AC-10.

## Increment and context

Run a tested React and Zustand frontend in an isolated mock configuration. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- Initialize React/Zustand with a repeatable local start, build, static/type and test workflow using explicitly chosen tooling.
- Establish one startup services injection point, test clock/device injection and fail-clear unavailable real mode.
- Keep API implementation, product state rules and feature screens outside this foundation.

- Follow-up owner decisions (2026-10-20): Provide EN/RU message loading/switch infrastructure and named target-browser test configuration without remote dependencies.

## Out of scope

- Adding FastAPI/PostgreSQL dependencies to the mock launch path.
- Implementing a real backend adapter or silently adding unselected UI libraries.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: Frontend package/bootstrap, build/test configuration, composition entry and application test harness.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: none (subject to the common source-review/execution authorization boundary).
- Blocks: [Freeze the frontend facade and enforce its transport boundary](frontend_service_contract.md); [Render the flat visual system and responsive public/account shell](visual_system_shell.md).
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: Build/router/test tooling and versions remain D12; browser target list is confirmed.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: A clean documented frontend environment starts/builds and runs a meaningful bootstrap check.
- [ ] AC-02: Mode selection occurs once and unavailable real mode fails explicitly.
- [ ] AC-03: Runtime needs no backend secrets or process.

- [ ] AC-04: Runtime permits bilingual rendering and records browser/tool versions; no actual-device support is claimed from bootstrap.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Execute the recorded install/start/build/check commands once implemented; an injected service result renders through the shell harness. |
| AC-02 | Test mock/default and unavailable-real configuration; verify no fallback after real-mode failure. |
| AC-03 | Start with backend URLs/credentials absent and outbound APIs denied; bootstrap succeeds without contacting a provider. |

| AC-04 | Build/test both locales with Cyrillic and direct reload; record tool/browser versions and mark physical-device capture not run. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver the scoped artifacts and executed acceptance evidence in the agreed local/test environment. Review the actual diff and source contract; implementation readiness or a green isolated check alone is not product acceptance. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
