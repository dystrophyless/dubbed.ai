# Dubbed: AI-native developer workflow

This workspace contains the reusable development setup adapted from Pin. No product requirements, specifications, tasks, source code, or delivery history have been imported.

## Start here

Read [AGENTS.md](AGENTS.md), [HANDOFF](_docs/HANDOFF.md), the [SDD workflow](_docs/sdd/README.md), and [orchestration](_docs/orchestration.md).

`Requirements / optional BR -> SPEC -> spec review -> individual task drafts -> task grooming -> package review -> authorized GitHub publication -> implementation -> Orchestrator verification -> acceptance -> integration gate -> handoff`

1. Record actual product decisions in the [brief](_docs/PROJECT_BRAINSTORM.md). Write a [BR](_docs/sdd/templates/business-requirements.md) only when needed.
2. Create a [specification](_docs/sdd/templates/specification.md) under `_docs/specifications/`, then use `$spec-task-review` before decomposition.
3. Create one [task draft](_docs/sdd/templates/task-issue.md) per task under `_docs/task-drafts/<spec-id>/`. Groom each with `$spec-task-review`.
4. Use `$task-package-review-loop` on the spec and individual drafts. Resolve blocking contracts and establish dependencies, ownership and final proof.
5. Once the intended repository and publication authority are established, publish reviewed tasks. Reconcile issue bodies/dependencies before replacing drafts with issue-link stubs.
6. Execute ready work using the [orchestration policy](_docs/orchestration.md). Use `$ponytail` full mode. The Orchestrator verifies raw evidence and acceptance criteria directly; no separate implementation Reviewer is mandatory.
7. Record [verification and acceptance evidence](_docs/sdd/templates/issue-evidence.md), complete delivery conditions, and update HANDOFF.

## Useful prompts

- `Plan this Dubbed feature using the local workflow: <outcome>. Review the spec and task package. Keep publication and implementation pending.`
- `Use $spec-task-review to audit <spec or task path>. Return findings only.`
- `Use $task-package-review-loop on <spec path> and its individual task drafts. Fix document inconsistencies within the approved behavior; do not publish or implement.`
- `Implement <outcome> using the full orchestration workflow. Use GPT-6 Luna Executors/Publishers with effort selected per assignment. Publish reviewed in-scope issues, verify the result and close eligible issues under recorded delegated acceptance. Do not commit, push, open PRs, merge or deploy without authorization.`
- `Execute <ready task path or issue> directly, without delegation. Preserve its contracts and supply verification evidence.`

## Installed setup

- Three local skills: [Ponytail](.agents/skills/ponytail/SKILL.md), [spec/task review](.agents/skills/spec-task-review/SKILL.md), [package review](.agents/skills/task-package-review-loop/SKILL.md).
- BR/spec/task/evidence templates and six writing/lifecycle guides under [_docs/sdd/](_docs/sdd/README.md).
- Four GitHub issue forms plus a PR template under `.github/`; they become available remotely only after authorized publication to the intended default branch.
- Project-local `.codex/config.toml` disables Superpowers, matching the source workflow. Shared installations are unchanged.

Local skill definitions are under `.agents/skills/`. A new project session may be needed for skill discovery. Their definitions can also be read by the links above. No Git repository/remote, application stack, test command or product release is configured by this setup.

See [migration provenance](_docs/WORKFLOW_SETUP.md) for the copied inventory and adaptations.
