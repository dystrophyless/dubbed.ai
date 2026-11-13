# Dubbed

Dubbed is a browser app for dubbing short video scenes with your own voice (see `PRODUCT_BRIEF.md`).

## Current phase: bootstrap

Follow `BOOTSTRAP.md` **phase by phase**. Each phase after Phase 0 ends with an owner gate ("утверждаю" in chat after
looking at localhost); do not start the next phase before its gate. No product features before Gates 1–3.

## Sources of truth

- Product: `PRODUCT_BRIEF.md`, then each feature's `specs/<NNN>/spec.md` once SpecKit runs. Later explicit owner answers
  override earlier text.
- UI: `design-system/` (built in Phases 1–2) — affect-ui **Clean / Light**, measured from
  `D:\Program\frontend\affect-ui\affectui-free`, font **Inter**; tokens only, kit components only, page archetypes from
  `design-system/templates.md`.
- Workflow reference: `D:\Program\python\Novio` (structure and process only — it uses the Classic variant) and
  `D:\Program\affect-ui-project-playbook.md`.
- `_carryover/` is non-visual input material, not authority.
- **Never use git tags/branches `archive/*`, `attempt/*` or `restart` (another agent's work in progress) as input.**
  All screens are designed from scratch.

## Owner decisions so far

- Stack: React 19 + TypeScript + Vite, React Router, TanStack Query, Zustand (client state only), CSS Modules + tokens,
  Lucide; Playwright + axe, Stylelint tokens-only, oxlint. No Tailwind, no shadcn. Backend later (FastAPI, PostgreSQL).
- Font: Inter. Light theme only. UI in English and Russian.
- Contrast: WCAG AA (owner, 2026-11-02 — "контраст слишком низкий"). The measured affect-ui colours stay as the record;
  higher-contrast runtime values live in DUBBED PATCH 3 (`tokens.css`); axe `color-contrast` is ON.
- Accent colour (owner, 2026-11-03 — "нет акцентного цвета; чёрный — не Primary"): the pack's own indigo #5b5bd6
  is the primary button, selection, progress, links and focus (DUBBED PATCH 4). Red = recording / destructive.
- UI boundaries (button and card edges, fields, tracks, selected controls) keep the kit's values; the ≥ 3:1
  boundary rule is not applied (owner, 2026-11-12 — "верни границы как было"). Text contrast stays WCAG AA.
- Waveforms are normalised for display so quiet audio stays readable; the audio itself is never changed (owner, 2026-11-12).
- One recording-studio design — no A/B test (withdrawn 2026-11-02). Studio layout decisions: `design-system/studio-brief.md`.
- In the studio, moving to the next turn requires a take for the current one.

## Layout

- `frontend/` — Vite + React 19 SPA (`npm run dev` → http://localhost:5174). Routes: `/styleguide`,
  `/styleguide/templates/<id>?state=`, `/prototypes/<feature>/<screen>?state=`. i18n: react-i18next, EN + RU.
- Workflow: SpecKit 1.2.5 (`.specify/`, skills `/speckit-*`), constitution in `.specify/memory/constitution.md`,
  hooks in `.specify/extensions.yml` (after_plan → `/speckit-design`, before_tasks → `/speckit-design-gate`,
  after_implement → `/speckit-design-qa`).

## UI work — always

Any frontend design or code follows `design-system/` (start with `design-system/README.md`; the `dubbed-design-system`
skill is the short version). Feature UI goes through `/speckit-design` (ui-spec + prototype + owner approval) before it is
implemented.

Verify with real output: `cd frontend && npm run build && npm run lint && npm run lint:css && npm run test:unit`, then
`npm run test:e2e:quick` (desktop business flows, ~7 min) after each change and the full `npm run test:e2e` (~8 min)
before a commit. E2E tests are business cases (`e2e/flow-*`), one smoke per route (`e2e/smoke.spec.ts`) and mobile
layout only (`e2e/mobile-layout.spec.ts`); rules go into Vitest. Playwright runs with one worker; never build while it
runs. Screenshots: `npm run snap` (1440 × 900 and 390 × 844).

## Agents and models

- Subagents in `.claude/agents/` (as in Novio): `ui-designer`, `ui-builder` on **Sonnet**; `design-qa` on **Sol**
  (medium; owner, 2026-11-12 after a trial against Sonnet and Terra — it returns its report, the main session saves it);
  `design-architect` on **Opus** — used for new archetypes (Phase 4 concepts, above all the studio) and for critique
  after the owner rejects the same point twice.
- Non-design work is delegated to ChatGPT-model subagents to keep Claude usage low (owner, 2026-11-11):
  `spec-reviewer`, `code-reviewer`, `test-triage`, `quickstart-runner` on **Sol** (quickstart-runner: medium; owner,
  2026-11-13); `implementer`, `unit-test-writer`, `explorer-qa` on **Terra**; `verifier`, `i18n-checker`, `docs-sync` on **Luna**. Design roles stay on Claude models.
- During `/speckit-implement`, the main session does not implement tasks itself: tasks marked `(ui-builder)` go to the
  `ui-builder` agent, every other task goes to the `implementer` agent. The main session orchestrates, checks the
  agents' reports against real command output, and asks the owner. A task `implementer` fails twice, or one about
  money or locking, goes to `implementer-sol` (the same role on Sol).
- The feature's `quickstart.md` is walked by `quickstart-runner` (Browser Use CLI in
  `D:\Program\python\tools\browser-use`), full check runs by `verifier`.
- Spawn agents only where the workflow calls for them.

## Working rules

- Keep the process light: SpecKit documents in `specs/`, git history as the record. No issue lifecycle or evidence packets.
- Ask the owner when a decision changes user-visible behaviour, money, data or permissions; do not guess.
- Never mark a design approved without the owner's explicit "утверждаю" after localhost review; passing checks is not approval.
- Report real command output; say plainly what was not run.
- Never print or commit secrets (`.env`); demo data never contains the owner's real email or IDs.
- Commit only when asked; push only when asked. Releases: SemVer 0.x — a feature raises the minor, fixes the patch;
  update `CHANGELOG.md` and `frontend/package.json`, tag `vX.Y.Z`, GitHub release from the changelog.
- Repository documents in English; chat with the owner in Russian; product UI in English and Russian.
- This folder is a git worktree of `D:\Program\python\Dubbed` on branch `restart-claude`; do not switch branches here and
  do not touch the main `Dubbed` folder. Use port **5174** for the dev server (5173 may be used by the other run).
