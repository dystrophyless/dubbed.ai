# Dubbed — agent instructions

Dubbed is a browser app for dubbing short video scenes with your own voice (see `PRODUCT_BRIEF.md`).

## Current phase: bootstrap

Follow `BOOTSTRAP.md` **phase by phase**. Each phase ends with an owner gate ("утверждаю" in chat after looking at
localhost); do not start the next phase before the gate. No product features before Gates 1–3.

## Sources of truth

- Product: `PRODUCT_BRIEF.md`, then each feature's `specs/<NNN>/spec.md` once SpecKit runs. Later explicit owner answers
  override earlier text.
- UI: `design-system/` (built in Phases 1–2) — affect-ui **Clean / Light**, measured from
  `D:\Program\frontend\affect-ui\affectui-free`, font **Inter**; tokens only, kit components only, page archetypes from
  `design-system/templates.md`.
- Workflow reference: `D:\Program\python\Novio` (structure and process only — it uses the Classic variant) and
  `D:\Program\affect-ui-project-playbook.md`.
- `_carryover/` is non-visual input material, not authority.
- **Never use git tags/branches `archive/*` or `attempt/*` as design input.** All screens are designed from scratch.

## Owner decisions so far

- Stack: React 19 + TypeScript + Vite, React Router, TanStack Query, Zustand (client state only), CSS Modules + tokens,
  Lucide; Playwright + axe, Stylelint tokens-only, oxlint. No Tailwind, no shadcn. Backend later (FastAPI, PostgreSQL).
- Font: Inter. Light theme only. UI in English and Russian.
- affect-ui's own low-contrast colours are kept; axe `color-contrast` is a documented exception — do not change source
  colours to silence it.
- Two distinct recording-studio designs are wanted for a future A/B test.
- In the studio, moving to the next turn requires a take for the current one.

## Models and roles

- `ui-designer`, `design-qa`, `design-architect`: **gpt-6.1-sol, xhigh**. `ui-builder`: **gpt-6-luna, max**.
- Roles are Codex custom agents (`.codex/agents/<role>.toml`) with instructions in `.agents/skills/role-<role>/`.
- During `$speckit-implement`, tasks marked `(ui-builder)` go to the `ui-builder` agent; other tasks stay in the main session.

## Working rules

- Keep the process light: SpecKit documents in `specs/`, git history as the record. No issue lifecycle or evidence packets.
- Ask the owner when a decision changes user-visible behaviour, money, data or permissions; do not guess.
- Never mark a design approved without the owner's explicit "утверждаю" after localhost review; passing checks is not approval.
- Report real command output; say plainly what was not run.
- Never print or commit secrets (`.env`); demo data never contains the owner's real email or IDs.
- Commit only when asked; push only when asked.
- Repository documents in English; chat with the owner in Russian; product UI in English and Russian.
- Superpowers skills are disabled for this project (`.codex/config.toml`).
