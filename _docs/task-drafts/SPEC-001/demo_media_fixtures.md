# Provide playable, annotated and permitted dubbing fixtures

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
- Project acceptance coverage: SPEC-001 AC-03, SPEC-001 AC-04.
- Frontend acceptance coverage: FE-AC-08, FE-AC-10.

## Increment and context

Provide playable, annotated and permitted dubbing fixtures. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- Supply local video/original audio/background/finished sample with matching EN/RU turns, overlap, nonverbal captions and a long speech case.
- Bind each fixture to stable media identity/timebase and validation annotations.
- Make fixture result provenance explicit: prepared sample output is not a render of arbitrary user takes.

- Follow-up owner decisions (2026-10-20): Include mixed EN/RU, permitted original-speaker stems for overlapping A/B preview, a longer original with a selected section, and early/short-take examples.

## Out of scope

- Scraped movie/game assets, required remote media, live AI preparation or production quality claims.
- Passing arbitrary upload metadata as matching a fixture transcript.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: Bundled local demo media, annotations, fixture provenance and validation helpers.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: [Freeze the frontend facade and enforce its transport boundary](frontend_service_contract.md).
- Blocks: [Render the flat visual system and responsive public/account shell](visual_system_shell.md); [Persist and restore the demo workspace through the shared facade](mock_workspace_persistence.md); [Exercise sample preparation and explicit correction disposition without AI](mock_preparation_lifecycle.md); [Simulate finished generations and local share deletion honestly](mock_result_lifecycle.md); [Capture a bounded local microphone take synchronized to reference audio](browser_capture_adapter.md).
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: Permitted assets and exact technical fixture envelope; real separation feasibility remains unproven.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: Every demo media asset plays and matches its annotations.
- [ ] AC-02: Fixture permissions and output identity are auditable.
- [ ] AC-03: Mock journey works without external media fetching.

- [ ] AC-04: Fixture identities/time mappings support saved-A/original-B then both-saved preview with one background and honest export labels.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Inspect/check duration, frame/audio availability, bounded intervals and overlap; play assets in the chosen browser harness. |
| AC-02 | Validate manifest/source permission notes; prepared export includes explicit fixture provenance. |
| AC-03 | Run media checks with only bundled/local asset access; missing fixture failure is recoverable, not a silent remote replacement. |

| AC-04 | Play/check each stem and selected offset; verify captions align, final sample has no added subtitles and no unrelated-upload subtitle substitution. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver the scoped artifacts and executed acceptance evidence in the agreed local/test environment. Review the actual diff and source contract; implementation readiness or a green isolated check alone is not product acceptance. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
