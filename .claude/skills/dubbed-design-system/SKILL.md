---
name: dubbed-design-system
description: Dubbed UI rules (affect-ui Clean / Light, Inter, EN + RU). Use for ANY frontend work in this repo — designing or building pages, components, prototypes, styles, copy — and when reviewing UI. Gives the read order, golden rules, archetype choice and checklists.
paths:
  - "frontend/**"
  - "design-system/**"
---

# Dubbed design system — working rules

Source of truth: `design-system/` (start with `design-system/README.md`). Live reference: `/styleguide` and
`/styleguide/templates` (`cd frontend && npm run dev` → `http://localhost:5174`). This skill is the short version;
when in doubt, open the doc. Product rules: `PRODUCT_BRIEF.md` and the feature's `spec.md`.

## Before you design or build anything

1. Read `design-system/README.md`, then the docs your task touches:
   page → `templates.md` + `ia.md`; components → `components.md`; behaviour → `patterns.md`; copy → `content.md`;
   tests / a11y → `quality.md`; workflow → `process.md`; where a value comes from → `audit.md`.
2. Pick the **archetype** (decision tree in `templates.md`) and open its reference source
   `frontend/src/pages/styleguide/templates/<id>.tsx`. Copy its structure; change content, not layout.
3. If no archetype fits — stop and report `NEW-ARCHETYPE` with why. Do not improvise a layout.

## Golden rules

1. Compose from `@/components/ui`, `@/components/layout`, `@/components/media`, `@/app/shells`; icons only via
   `<Icon name>` from `@/components/icons` (Lucide + semantic dictionary).
2. Tokens only (`frontend/src/styles/tokens.css`). No raw hex/rgb, px radii, shadows, font sizes or weights in CSS or
   inline styles. Spacing through `gap` props or `--space-*`.
3. affect-ui Clean ports (`frontend/src/components/ui/affect/*`) are never edited or restyled; a necessary deviation is a
   documented `DUBBED PATCH` approved by the owner (`components.md`).
4. One primary action per view, unmistakable; the most frequent action (e.g. Record) is never pale or tiny.
   Recording and destructive actions are red; destructive actions are confirmed or undoable.
5. No duplicated information on one screen (the same counter, status or hint twice).
6. Key actions are visible without scrolling at 1440 × 900 and 390 × 844.
7. Buttons in one row have the same size; controls in one toolbar have the same height; navigation actions
   (previous / next) look like actions, not disabled text; neighbouring sections share their header shape.
8. Every screen has loading (skeleton in content shape), empty, error (retry) and success states.
9. Media at its own aspect ratio, no heavy letterbox frames, no labels covering the picture.
10. Phone: no horizontal scroll; Clean touch-target rules; text readable without zoom.
11. Every control does something real; no browser-native pickers (own listbox / menus).
12. Copy: EN + RU for every string through i18n keys; sentence case; verbs on buttons; glossary terms from `content.md`
    (turn, take, credits…). Never show speaker names or numbered speakers.
13. E2E-ready: roles + labels first, `data-testid` as in `quality.md`; views get data and state via props.
14. Light theme only. Contrast: WCAG AA through the tokens (DUBBED PATCH 3, owner 2026-11-02) — text >= 4.5:1,
    UI boundaries >= 3:1; axe `color-contrast` is ON. Never hard-code a lighter grey to look "more Clean".
15. Shells: ordinary pages use the shell with top navigation; the recording studio uses the focused shell (only Exit).

## Feature code layout

```
frontend/src/features/<feature>/views/<Screen>View.tsx   presentational, props in → JSX out (designer)
frontend/src/features/<feature>/mocks.ts                 mock data per state (designer)
frontend/src/features/<feature>/<Screen>Page.tsx         data hooks + route → View (builder)
frontend/src/prototypes/<NNN-feature>.tsx + registry.ts  prototype screens with ?state= (designer)
frontend/e2e/<feature>.spec.ts                           Playwright + axe (builder)
```

## Verify before you say "done"

```bash
cd frontend
npm run build          # TypeScript strict + bundle
npm run lint           # oxlint
npm run lint:css       # tokens-only check
npm run preview        # in the background (port 5174), then:
npm run snap -- --out ../specs/<NNN>/design/screens --viewport both /prototypes/<NNN-feature>/<screen> "/prototypes/<NNN-feature>/<screen>?state=empty"
```
Open the screenshots and check them against the reference template and `quality.md` → "Design QA checklist".
On Windows Git Bash prefix the snap command with `MSYS_NO_PATHCONV=1` so `/prototypes/...` paths are not rewritten.
Report the real command output; say plainly what was not run.
