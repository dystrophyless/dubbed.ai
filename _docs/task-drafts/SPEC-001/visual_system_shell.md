# Render the flat visual system and responsive public/account shell

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
- Project acceptance coverage: SPEC-001 AC-01.
- Frontend acceptance coverage: FE-AC-01, FE-AC-02, FE-AC-10.

## Increment and context

Render the flat visual system and responsive public/account shell. Deliver the outcome bounded below; this is one local unpublished task contract, not permission to implement the package now.

## Scope

- Implement SPEC-002 exact flat tokens/type/spacing/control/focus states without gradients/blur/glow/shimmer or fake activity.
- Build public landing with the playable permitted example, labeled demo entry, responsive signed-in navigation and shared loading/error/dialog primitives. The entry consumes the session facade; the upload/preview task wires it to the executable mock session.
- Provide phone/desktop/long Cyrillic/zoom/reduced-motion accessible layouts; injectable session data until facade wired by screen tasks.

- Follow-up owner decisions (2026-10-20): Use neutral white/gray/blue with red recording/error states; provide EN/RU switch and public/account verification/reset/link/deletion screen shells.

## Out of scope

- Feature-specific project/media/credit behavior or building a real backend sign-in.
- Invented testimonials/stats, dark-mode theme framework or unrelated design expansion.
- No GitHub issue publication/number allocation, commits, pushes, paid calls, live payments or deployment without their own authorization.

## Implementation anchors and invariants

No application implementation exists at decomposition time. The anchor is the source contracts above; module/file ownership below is proposed, not a claim that those modules already exist. Read actual code introduced by prerequisites before implementation.

Responsibility: Design tokens/shared controls/layout, landing/demo sign-in, app navigation and route-state shell.

Preserve React/Zustand and FastAPI/PostgreSQL/SQLAlchemy; frontend backend access remains in the services boundary, including Zustand actions. Capture has no countdown, hides video, plays original reference, allows shorter takes and auto-stops at the maximum window, and preserves a previous saved take until durable replacement. Demo fixtures/profiles are not production policies or real AI/payment/hosting proof. Workers must preserve other contributors' edits and stay within assigned ownership; shared contracts need a coordinated owner.

## Dependencies and ownership

- Depends on: [Run a tested React and Zustand frontend in an isolated mock configuration](frontend_runtime.md); [Provide playable, annotated and permitted dubbing fixtures](demo_media_fixtures.md).
- Blocks: [Take a demo user from file selection and quote to a usable preview](upload_preparation_ui.md); [Resume projects and manage honest finished results and public demo links](results_projects_sharing_ui.md); [Buy demo credit packs and return to the original preparation quote](credits_purchase_ui.md).
- Owner: unassigned; assignment must name the responsibility above.
- Priority: unset; proposed dependency-based order is in the [package index](README.md).
- Blocking decisions: Exact hex/layout and rendered acceptance plus tooling; direction/locales/auth methods are selected.
- Common readiness boundary: sources remain drafts; confirm the affected spec revision/decisions, individual grooming and package readiness before marking this task ready. An unresolved blocker is not an accepted assumption.

## Acceptance criteria

- [ ] AC-01: Token/control states render consistently and meet actual adjacent-color/focus requirements.
- [ ] AC-02: Navigation/deep links/keyboard shell work at the specified widths.
- [ ] AC-03: Landing/demo entry is truthful and usable without remote fonts/media.

- [ ] AC-04: All shell states switch locale and use the revised flat tokens; navigation reaches auth/account recovery and deletion confirmation.

## Verification plan

| Criterion | Scenario / expected proof |
|---|---|
| AC-01 | Review selected viewport screenshots and computed contrast, including yellow actions/red recording states and disabled reasons. |
| AC-02 | Exercise routes, focus-return dialogs, keyboard/200% zoom/long text with no covered action or page overflow. |
| AC-03 | Run the shell with remote traffic denied; visual examples use permitted local content and no invented proof claims. |

| AC-04 | Rendered checks in both locales, keyboard/focus/mobile overflow and computed contrast on revised blue/gray states; demo auth is explicitly simulated. |

No application test commands exist yet. Foundation tasks establish actual commands; record and run the applicable ones when this task is executed, alongside the scenarios above. Capture environment/device, source/tool/policy versions, revision or dirty-worktree boundary, actual result and evidence path. Distinguish unit/mock/real-adapter/browser/acoustic/hosted proof. Use permitted synthetic media, isolated owned DB/storage/test accounts and payment test mode; never use real user/production data. Failures or missing access remain FAIL/NOT RUN/BLOCKED, not a fabricated pass.

## Delivery conditions

Deliver the scoped artifacts and executed acceptance evidence in the agreed local/test environment. Review the actual diff and source contract; implementation readiness or a green isolated check alone is not product acceptance. No merge, public deployment, live charge, or remote task closure is implicit. Acceptance must identify actual evidence/revision and authorized owner/delegation. No issue exists to close.

## Completion and review record

Not implemented or verified. Independently groomed as local documentation on 2026-10-20; see the [task grooming report](../../specifications/SPEC-001_task_grooming_review.md) for findings, per-task accounting, frozen revisions and evidence limits. This review does not mark the task ready or accept implementation. Preserve all findings and later rechecks using the [evidence format](../../sdd/templates/issue-evidence.md). This file owns its unpublished scope/AC/dependencies; the specs and package index contain only links/summary order, not a second editable copy of its body.


### Follow-up baseline synchronization

This task was updated to SPEC-001/002 revision 0.5 and BR-001 revision 0.2 after the confirmed owner answers in brainstorm §17. Previous independent reviews cover their frozen earlier bodies, not this changed contract. Scope/AC/proof above are documentation only; implementation, tests, owner assignment and readiness remain pending.
