# Bootstrap plan — restart with a design system and a light SpecKit workflow (Codex / ChatGPT)

The restart reuses the workflow proven in `D:\Program\python\Novio` (built with Claude Code), adapted for Codex.
Read first:

1. `PRODUCT_BRIEF.md` — what Dubbed is (decisions in force).
2. `D:\Program\affect-ui-project-playbook.md` — the full playbook: steps, rules learned from review rounds, pitfalls,
   what to copy from Novio. Its section 4 "Classic → Clean" applies here.
3. `D:\Program\python\Novio` — the working example: `design-system/`, `.claude/agents/`, `.claude/skills/`,
   `.specify/extensions.yml`, `.specify/templates/ui-spec-template.md`, `.specify/memory/constitution.md`, `CLAUDE.md`,
   `frontend/` (tokens, kit, layout, styleguide, reference templates, prototypes, quality gates).
4. `_carryover/README.md` — what is reusable from the archived Dubbed version.

## Why the previous attempt's design failed (do not repeat)

- Process outweighed product: ~1.3 MB of process/evidence docs, 100 KB+ per screen spec, issue-lifecycle ceremony,
  A/B candidates, layered owner corrections. Agents spent effort on procedure, not on design.
- No design system as **parts**: rules and measurements existed, but no shared kit, no tokens-only lint, no page
  archetypes or reference templates. Every screen was a bespoke HTML/CSS prototype later copied into React, so the style
  was re-invented per screen and drifted.

## Target workflow (same as Novio)

```
$speckit-specify → $speckit-clarify → $speckit-plan
   └ after_plan  (mandatory) → $speckit-design        ui-designer role: ui-spec + prototype + screenshots → owner review on localhost → "approve"
$speckit-tasks
   └ before_tasks (mandatory) → $speckit-design-gate  no tasks until ui-spec is Approved (or the feature has no UI)
$speckit-implement                                     backend in the main session; tasks marked (ui-builder) → ui-builder role
   └ after_implement (mandatory) → $speckit-design-qa design-qa role: checklist + screenshot comparison → report → fixes
```

No GitHub issue lifecycle, no evidence packets, no A/B tracks. SpecKit files in `specs/<NNN>/` are the only planning
documents; git history is the record.

## Claude Code → Codex mapping

| Novio (Claude Code) | Dubbed (Codex) |
|---|---|
| `CLAUDE.md` | `AGENTS.md` |
| `.claude/skills/<name>/SKILL.md` | `.agents/skills/<name>/SKILL.md`, invoked as `$<name>` |
| `.claude/agents/<role>.md` (subagents with a model) | role skills `.agents/skills/role-ui-designer`, `role-ui-builder`, `role-design-qa`, `role-design-architect`; the orchestrator spawns a Codex subagent and tells it to follow the role skill. **Check in Codex how to pin a model per subagent** (the archive used GPT-6.1 Sol for planning/review and GPT-6 Luna for execution). |
| SpecKit `--ai claude`, commands `/speckit-*` | SpecKit initialised for Codex (`specify init --here`, choose the Codex integration, PowerShell scripts, sequential numbering); commands become `$speckit-*` |
| `.specify/extensions.yml` hooks | identical — the SpecKit command text reads the file and runs the hook commands itself, so it works in Codex |
| `/model` switch to Sonnet before implement | use the execution model (e.g. GPT-6 Luna) for `$speckit-implement`; the planning model (e.g. GPT-6.1 Sol) for specify / plan / tasks and escalations |
| `.codex/config.toml` | kept: Superpowers stays disabled for this project |

## Bootstrap steps for Dubbed

1. **SpecKit**: initialise for Codex; copy Novio's `.specify/extensions.yml` and `.specify/templates/ui-spec-template.md`.
2. **Stack** (confirm with the owner): SPA — Vite + React 19 + TypeScript, React Router, TanStack Query (server data),
   Zustand (client state only), CSS Modules + design tokens (no Tailwind, no shadcn), Lucide icons via an `<Icon name>`
   wrapper, Playwright + axe, Stylelint tokens-only, oxlint. Backend later: FastAPI + PostgreSQL + SQLAlchemy.
3. **Research the pack (Clean only)**: components, icons (Lucide, stroke recipe), font (owner question: Mabry Pro vs
   Inter), motion, shadows, radii. Measure from `affectui-free\components\*\Clean\` and record every value in
   `design-system/audit.md` (start from `_carryover/affect-ui-clean/design-tokens.md`, re-verify each value).
4. **`design-system/`** — the ten documents as in Novio (README with golden rules, ia, templates, components, patterns,
   foundations, content, quality, process, audit), written for Dubbed. Put the playbook's "review-round rules" into
   `patterns.md` from day one.
5. **IA** (`design-system/ia.md`) from `PRODUCT_BRIEF.md`: routes, ordinary pages with the top navigation vs focused
   Record / Result pages with Exit only, flows, glossary (turn, take, candidate, accepted take, credits, slot).
6. **Frontend foundation**: tokens.css, ported Clean components (button, OTP, segmented control, profile menu, filter
   menu, notification stack, progress tracker, tips panel, thinking loader…), our own kit in the same style (fields,
   select/listbox, dialog, toast, upload/drop zone, progress, menus), layout primitives, `/styleguide`, `/prototypes`
   with `?state=`.
7. **Page archetypes and reference templates for Dubbed** (each with loading / empty / error / success states):
   - `auth` (sign in, sign up, verify code, reset) — like Novio's;
   - `onboarding` (microphone check step) — wizard;
   - `new-dub` (upload → preview → section selector → quote button) — **new**, design first;
   - `processing` (progress with cancel) — status page;
   - `studio` (Record: video stage, current line, waveform, Replay / Record / Your take, Previous / Next, Exit) —
     **new and the most important; design and approve it before anything else**. Owner question: start fresh or from
     archived layout A / B;
   - `player` (Result: playback, new-version notice, Download, back to turns);
   - `browse-list` (My projects), `ledger` (Credits: balance, packs, history), `settings` (Account, microphone),
     `landing`.
   New archetypes (new-dub, studio) are where the strongest model is worth using (design-architect role).
8. **Quality gates**: Stylelint tokens-only, oxlint, Playwright + axe (no-horizontal-scroll check against the viewport
   width at 390 px), screenshot scripts at 1440 / 390.
9. **Roles, skills, constitution**: port Novio's four agent definitions into role skills, the three design skills
   (`speckit-design`, `speckit-design-gate`, `speckit-design-qa`) and the design-system skill; write
   `.specify/memory/constitution.md` (five principles as in Novio, Clean, Dubbed stack) and complete `AGENTS.md`.
10. **Review rounds**: the owner reviews every reference template on localhost with screenshots; each remark becomes a
    general rule. Commit the design system.
11. **First feature through the pipeline**: authentication (as Novio 001) or — if the owner prefers to prove the core
    first — the Record → Result slice on the mock services, reusing `_carryover/frontend-services/`.

## Ground rules during bootstrap

- No product feature code before the design system and reference templates are approved by the owner.
- affect-ui ports are not edited; any unavoidable deviation is a documented "patch" with its reason, approved by the owner.
- Never print or commit `.env` contents; demo data never uses the owner's real email.
- Every "done" comes with real command output (build, lint, lint:css, e2e).
