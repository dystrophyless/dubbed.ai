# Dubbed — agent instructions

Dubbed is a browser app for dubbing short video scenes with your own voice (see `PRODUCT_BRIEF.md`).
The project restarted on 2026-11-02 from a clean base; the previous version is archived at tag `archive/chatgpt-v1`.

## Current phase: bootstrap

Follow `BOOTSTRAP.md`. Until the owner approves the design system and its reference templates, do not build product
features. This file will be completed in bootstrap step 9 (stack, design-system rule, role delegation).

## Sources of truth

- Product decisions: `PRODUCT_BRIEF.md`, then each feature's `specs/<NNN>/spec.md` once SpecKit runs. Later explicit
  owner answers override earlier text.
- UI: `design-system/` (once written) — affect-ui **Clean / Light**, copied faithfully; tokens only, kit components only,
  page archetypes from `design-system/templates.md`.
- Workflow reference: `D:\Program\python\Novio` and `D:\Program\affect-ui-project-playbook.md`.
- `_carryover/` is input material, not authority.

## Working rules

- Keep the process light: SpecKit documents in `specs/`, git history as the record. No GitHub issue lifecycle, no
  evidence folders, no parallel A/B tracks unless the owner asks.
- Ask the owner when a decision changes user-visible behaviour, money, data or permissions; do not guess.
- The owner approves every design in chat after viewing it on localhost; never mark a design approved without that.
- Report results with real command output; say plainly what was not run.
- Never print or commit secrets (`.env`); demo data never contains the owner's real email or IDs.
- Commit only when asked; push only when asked.
- Repository documents in English; chat with the owner in Russian; product UI in English and Russian.
- Superpowers skills are disabled for this project (`.codex/config.toml`).
