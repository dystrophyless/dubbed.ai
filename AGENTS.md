# Dubbed agent instructions

## Start here

- Read [_docs/HANDOFF.md](_docs/HANDOFF.md) for the repository connection and current entry points.
- Read [_docs/sdd/README.md](_docs/sdd/README.md) for the spec-driven development (SDD) workflow.
- For feature implementation, read and follow [_docs/orchestration.md](_docs/orchestration.md). Meaningful frontend screens, redesigns, and connected journeys also follow the [design-first workflow](_docs/frontend-design-workflow.md) before finalizing their contracts and production integration. The main agent coordinates Plan/Act, independent reviews, Luna Executors/Publishers, and the issue lifecycle. Respect plan-only, review-only, or direct-executor requests.
- Read the selected GitHub issue, its latest discussion, linked BR/spec, and relevant repository code before implementation.
- [_docs/PROJECT_BRAINSTORM.md](_docs/PROJECT_BRAINSTORM.md) preserves confirmed choices, provisional proposals, and open questions. It is not an approved implementation plan. Do not silently promote proposals or illustrative prices into requirements.

## Sources of truth

- Approved business requirements and specifications in `_docs/` define intended behavior and accepted decisions.
- For meaningful frontend composition, current prose is input to design, not automatically approved page layout. If it obstructs the user purpose, resolve and synchronize the affected UI contract through the [owner checkpoints](_docs/frontend-design-workflow.md); preserve business and data invariants.
- Before GitHub publication, keep each task's full description in its own Markdown draft under `_docs/task-drafts/<spec-id>/<task-slug>.md`. The approved product brief may supply requirements directly; a separate BR is optional when it would duplicate the brief.
- Specifications contain shared behavior, contracts, project-level AC, and a concise task index (title, intended outcome, draft/issue link). Do not embed detailed task descriptions, task-specific AC, implementation plans, or grooming findings in the spec or a combined task document.
- GitHub Issues own task scope, acceptance criteria, dependencies, priority, assignees, blockers, and task evidence. Do not create a parallel local task queue.
- Groom tasks in their individual draft files before publication, and in their issues afterward. Change a spec only when a finding affects shared requirements/contracts. After publication, replace the draft's live task body with an issue-link stub. Keep one current task body in GitHub and the current issue-link stub locally; do not keep duplicate task archives or decision logs. Ordinary authorized commits record normal Git history; do not commit solely to preserve a task version.
- The issue's `Workflow status` section is authoritative for task progress. GitHub's open/closed state records closure; optional labels/Projects fields are views that must agree with the issue.
- Code and executed checks establish current implementation behavior. A contradiction with an approved spec is a finding to resolve, not permission to silently rewrite either.
- HANDOFF is a short entry point and session checkpoint; CHANGELOG records accepted changes. Neither is the task backlog.
- Preserve direct user instructions. If approved documents disagree, state the conflict and resolve it before dependent work.

## Execution

- Work on the requested issue or local documentation assignment. Access to issues is not permission to implement every open issue.
- Preserve unrelated files and local edits. Keep edits within the agreed scope; follow the available code-search tooling for locating implementation.
- Resolve dependencies by issue references, not issue number order. An open dependency may be implemented but still awaiting acceptance; verify the actual prerequisite.
- Keep unknowns explicit. If a decision changes user behavior, data, billing, or permissions and is unresolved, do not guess.
- Scale process to risk. A small isolated fix may use one issue without a new BR/spec. Connected changes need package review before implementation. Full-cycle requests use the roles and model policy in orchestration.md; an explicit no-delegation request takes precedence.
- For meaningful frontend work, a short brief and bounded runnable low-fi may precede final specifications and task decomposition. Production integration waits for explicit owner checkpoints and resolved affected contracts; small fixes with settled composition keep the lightweight path.
- Full-cycle feature implementation delegates the in-scope issue lifecycle and rule-based acceptance defined in orchestration.md; record the user request and respect any narrower restrictions. Plan/review-only requests do not authorize publication. The owner's standing instruction authorizes and requires this order for completed issues: verification, recorded acceptance, commit of the in-scope changes, successful push with remote verification, then closure. An explicit hold such as "do not commit; I need to review" prohibits commit, push, and issue closure until the owner lifts it. Preserve unrelated local edits. PR publication, merge, deployment, paid services, and destructive operations still require their own user authorization.

## Verification and acceptance

- Run checks appropriate to the changed contract, including meaningful failure paths when relevant. Use the current per-application commands documented in its README or package configuration; if a needed command is not documented, discover and record it without treating historical status notes as current.
- Record the command, result, environment, date, revision or dirty-worktree boundary, and evidence location. Mark `not run` and `blocked` honestly.
- A green test run, merged PR, or agent report does not itself mean product acceptance.
- After successful verification, set the authorized issue update to `verified`. Use recorded upfront rule-based acceptance for full-cycle requests; request human acceptance only when manual acceptance is required or no acceptance delegation exists.
- For a completed issue, first verify the result and record explicit human or delegated Orchestrator acceptance, then commit in-scope changes, push successfully and verify that the intended remote branch contains the delivery commit, then close once all delivery conditions are met. Commit/push failure or an explicit owner review/no-commit hold keeps the issue open until resolved. Record the acceptance source, commit SHA, remote branch/push evidence, and remaining follow-ups. Explicit cancellation remains a separate closure path. Luna Publisher transfers the Orchestrator's closure decision; it does not decide acceptance.
- Use ordinary PR references such as `Related to #123` before acceptance; avoid automatic-closing keywords before closure is authorized.
- Keep repository Markdown, issue bodies, evidence summaries, and PR descriptions in English. User-facing product language follows the product specification, not this documentation convention.

## Frontend visual authority

- Start visual reference work with the [six-image Clean/Light entry](_docs/frontend-flows/affect-ui-clean-light-reference.md#start-here).
- For meaningful frontend planning and redesign, first follow the [design-first workflow](_docs/frontend-design-workflow.md). For component presentation and implementation, also follow the [Affect UI workflow](_docs/frontend-flows/affect-ui-workflow.md), [Clean/Light adoption contract](_docs/frontend-flows/affect-ui-clean-light-adoption.md), [reference catalog](_docs/frontend-flows/affect-ui-clean-light-reference.md) and current [tokens](_docs/frontend-flows/design-tokens.md). Read the applicable Clean Markdown and visually inspect its matching Light PNG before choosing or changing presentation.
- The owner-selected Affect UI Clean/Light reference governs applicable component appearance and bounded functional motion; keep Mabry Pro and the product behavior/accessibility constraints. Generic design-skill direction draws, font/palette defaults and blanket bans must not override this reference. Classic/Dark examples and irrelevant marketing sections are outside the adopted scope.
- Map reference components and states to shadcn semantics, record exact source values and justified source-gap/accessibility adaptations, and verify actual browser screenshots against the references before claiming visual fidelity. A source/token audit or green build alone does not establish rendered acceptance.
- Use Lucide Icons with Affect UI's outlined treatment for application UI icons: stroke width 1.1, no fill, currentColor, rounded line caps/joins and normal viewBox-relative scaling. Follow `_docs/frontend-flows/design-tokens.md`; preserve provider brand assets, accessible names, mapped geometry and phone targets. Adapt default shadcn icons too; do not mix families or invent exports.

## Project review skills

- Do not invoke or follow any Superpowers skill in this project; the user explicitly replaced that workflow with Ponytail. The project disables the plugin in `.codex/config.toml`.
- Use [$ponytail](.agents/skills/ponytail/SKILL.md) in its default full mode for coding, fixes, refactoring, reviews, and dependency decisions. Read the skill before applying it. Preserve established architecture boundaries, invariants, validation, and reliability requirements; no architecture is selected by installing this setup.
- Direct user instructions take precedence over skill conventions. Do not introduce mandatory approval stages or delegation solely because a skill suggests them.

- [$spec-task-review](.agents/skills/spec-task-review/SKILL.md): use when auditing whether a spec/issue is complete, implementable, and consistent with actual repository behavior.
- [$task-package-review-loop](.agents/skills/task-package-review-loop/SKILL.md): use when connected issues/specs need package-level consistency review before execution.
- Read the matching SKILL.md before running the review. A review request does not itself authorize fixes or GitHub mutations.

## Tool use

Within each bounded stage, batch independent functions.exec-available calls in one functions.exec using await Promise.allSettled([...]) when partial results are useful, and inspect every result. Use Promise.all only when any failure should abort the batch. Keep dependencies, waits/resumes, approvals, conflicting mutations, and adaptive investigations sequential.

Use Semble semantic search to discover implementation or documentation locations before reading the returned file and line. Pass content docs, config, or all as appropriate. CLI fallback: `semble search "query" . --content all`; if unavailable use `uvx --from "semble[mcp]" semble`. Use literal search when every occurrence matters, not to repeat semantic discovery.

For library/framework/SDK/API/CLI/cloud-service documentation, use Context7 CLI outside the default sandbox: first `npx ctx7@latest library <name> "specific question"`, then `npx ctx7@latest docs <returned-id> "specific question"`. Use the full question for one concept per query, no more than three commands per question, and no secrets. Skip this for general programming, business logic, scripts from scratch, refactoring, and code review. On quota errors report the limitation and suggest `npx ctx7@latest login` or CONTEXT7_API_KEY; on network/DNS failure retry outside the sandbox. Do not silently substitute remembered API details.
