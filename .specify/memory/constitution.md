# Dubbed Constitution

Dubbed is a browser app for dubbing short video scenes with your own voice: the user uploads a clip, the service turns
its dialogue into timed recording turns, the user records every line, and gets the full video back with their voices.
Product rules: `PRODUCT_BRIEF.md`, then each feature's `spec.md`; later explicit owner answers override earlier text.

## Core Principles

### I. Spec-driven delivery
Every feature goes specify → clarify → plan → design → tasks → implement → design QA. No code without an approved
spec; no UI tasks without an approved ui-spec. Scope decisions in `PRODUCT_BRIEF.md` §4 (out of scope) and
`design-system/ia.md` stand until amended there. No product feature code before bootstrap Gates 1–3 (`BOOTSTRAP.md`).

### II. One design system (NON-NEGOTIABLE)
All UI follows `design-system/` — affect-ui **Clean / Light**, measured from the source pack, font **Inter**, light theme
only. Pages are built from a page archetype and its reference template, from kit / layout / media components, with
design tokens only. affect-ui ports are never edited; a necessary deviation is a documented patch the owner approves.
Anything outside the system goes through the NEW-ARCHETYPE escalation (design-architect), not improvisation.

### III. The product owner approves design before it is built
`/speckit-design` produces a ui-spec and a working prototype with every state; the product owner reviews it on
localhost and approves by writing "утверждаю" in chat. Passing checks is not approval. The before_tasks gate blocks UI
tasks until `ui-spec.md` is Approved. The approved views are implemented as-is; any visual change goes back through review.

### IV. Every state designed, every screen e2e-ready, in two languages
Each screen has loading, empty, error (with retry) and success states driven by data, semantic roles and labels, and
the test ids in `design-system/quality.md`. Every user-visible string exists in English and Russian. Each user story
with UI ships with a Playwright test (happy path, error/empty states, axe). Accessibility targets WCAG 2.2 AA, colour contrast included
(the earlier affect-ui contrast exception was withdrawn by the owner on 2026-11-02). Desktop and phone browsers are first-class.

### V. Verify, then claim
Work is done when `npm run build`, `npm run lint`, `npm run lint:css`, the e2e tests and design QA pass — with real
output reported; anything not run is said plainly. Screenshots at 1440 × 900 and 390 × 844 are checked by eye for
every UI change.

## Technology

- Frontend: SPA — Vite, React 19, TypeScript strict, React Router, TanStack Query (server data), Zustand (client state
  only), CSS Modules + design tokens, Inter, Lucide, react-i18next (EN + RU) (`frontend/`). A typed services layer with an
  interchangeable mock implementation. No Tailwind, no shadcn.
- Quality: Playwright + axe, Stylelint tokens-only, oxlint.
- Backend (later): Python, FastAPI, SQLAlchemy, PostgreSQL. Product rules never depend on a particular AI model or vendor.

## Workflow and roles

`design-system/process.md` defines the agents: ui-designer, ui-builder, design-qa (Sonnet) and design-architect (Opus —
new archetypes and critique after two rejections of the same point), and the hooks in `.specify/extensions.yml`
(after_plan design, before_tasks gate, after_implement QA). Keep the process light: SpecKit documents in `specs/`,
git history as the record.

## Governance

This constitution and `design-system/` override ad-hoc preferences. Amendments: edit this file with
`/speckit-constitution`, bump the version (MAJOR: principle removed or redefined; MINOR: principle added; PATCH: wording),
and update dependent templates. Reviews check compliance with principles II–V.

**Version**: 1.0.0 | **Ratified**: 2026-11-02 | **Last Amended**: 2026-11-02
