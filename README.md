# Dubbed

Dubbed is a planned browser application for recording your own dialogue over short video scenes.

The frontend implementation has been removed at the owner's request. No runnable frontend remains; the specifications and development workflow are retained.

## Start here

Read [AGENTS.md](AGENTS.md), [HANDOFF](_docs/HANDOFF.md), the [SDD workflow](_docs/sdd/README.md), [orchestration](_docs/orchestration.md), and the [frontend design-first workflow](_docs/frontend-design-workflow.md).

`Backend/technical: requirements -> optional BR -> SPEC/review -> task drafts/grooming -> package review -> authorized publication -> implementation -> verification/acceptance -> integration gate -> handoff`

`Meaningful frontend: user purpose/invariants -> brief + runnable low-fi -> independent UX review/revision -> owner checkpoint 1 -> high-fi/review/revision -> owner checkpoint 2 -> synchronize affected specs/tasks -> independent contract/package review -> production integration -> verification/acceptance -> integration gate -> handoff`

1. Record actual product decisions in the [brief](_docs/PROJECT_BRAINSTORM.md). Write a [BR](_docs/sdd/templates/business-requirements.md) only when needed. Meaningful frontend work may begin with design before exhaustive specification; backend and other non-frontend work retain specification-first planning.
2. For meaningful frontend work, complete the design workflow's two explicit owner checkpoints, then synchronize and review the affected [specification](_docs/sdd/templates/specification.md) before decomposition. For other work, create the specification under `_docs/specifications/` and use `$spec-task-review` before decomposition.
3. Create one [task draft](_docs/sdd/templates/task-issue.md) per task under `_docs/task-drafts/<spec-id>/`. Groom each with `$spec-task-review`.
4. Use `$task-package-review-loop` on the spec and individual drafts. Resolve blocking contracts and establish dependencies, ownership and final proof.
5. Once the intended repository and publication authority are established, publish reviewed tasks. Reconcile issue bodies/dependencies before replacing drafts with issue-link stubs.
6. Execute ready work using the [orchestration policy](_docs/orchestration.md). Use `$ponytail` full mode. The Orchestrator verifies raw evidence and acceptance criteria directly; meaningful frontend work also uses the design workflow's independent reviews.
7. Record [verification and acceptance evidence](_docs/sdd/templates/issue-evidence.md), complete delivery conditions, and update HANDOFF.

## Useful prompts

- `Plan this Dubbed feature using the local workflow: <outcome>. Review the spec and task package. Keep publication and implementation pending.`
- `Use $spec-task-review to audit <spec or task path>. Return findings only.`
- `Use $task-package-review-loop on <spec path> and its individual task drafts. Fix document inconsistencies within the approved behavior; do not publish or implement.`
- `Implement <outcome> using the full orchestration workflow. For meaningful frontend work, follow the design-first guide with a GPT-6.1 Sol High design lead/reviewer and GPT-6 Luna Max production executor; wait for the owner's explicit checkpoints. For other work, use the default role/effort policy. Use GPT-6 Luna Low Publisher only for authorized mechanical lifecycle updates. Publish reviewed in-scope issues, verify the result and record delegated acceptance. Only after acceptance, commit the accepted in-scope changes, then push and verify remote delivery before closing completed issues. An explicit review/no-commit hold blocks commit, push and closure until lifted. Do not open PRs, merge or deploy without authorization.`
- `Execute <ready task path or issue> directly, without delegation. Preserve its contracts and supply verification evidence.`

## Installed setup

- Three local skills: [Ponytail](.agents/skills/ponytail/SKILL.md), [spec/task review](.agents/skills/spec-task-review/SKILL.md), [package review](.agents/skills/task-package-review-loop/SKILL.md).
- BR/spec/task/evidence templates and six writing/lifecycle guides under [_docs/sdd/](_docs/sdd/README.md).
- Four GitHub issue forms plus a PR template under `.github/`; they become available remotely only after authorized publication to the intended default branch.
- Project-local `.codex/config.toml` disables Superpowers, matching the source workflow. Shared installations are unchanged.

Local skill definitions are under `.agents/skills/`. A new project session may be needed for skill discovery. Their definitions can also be read by the links above. Current repository and application entry points are recorded in HANDOFF.

