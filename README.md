# Dubbed

Dub short video scenes with your own voice. Upload a clip, the service prepares its dialogue as timed turns, you record
every line in a studio, and get the whole scene back with your voices in it.

**Version 0.1.1** — the full recording flow runs in the browser on mock services; there is no backend yet.
See [CHANGELOG.md](CHANGELOG.md).

## What works today

| Screen | Route | What it does |
|---|---|---|
| My projects | `/projects` | Every project with its state, rename, delete, sort; two project slots |
| New dub | `/new` | Pick a video (MP4 / MOV / WebM, up to 10 min and 250 MB), check it, see the section and its price in credits |
| Processing | `/projects/:id/processing` | Queue and three preparation steps; cancel with an exact charge / refund quote; failures refund |
| Studio | `/projects/:id/turns/:n` | Record each turn against the muted scene, play your take, re-record; one recording tab at a time |
| Result | `/projects/:id/result` | Your dubbed scene in a player, fullscreen, download (WebM); re-record a turn and build version 2 |

The interface is in English and Russian, light theme only, WCAG AA contrast.

### Mock services

All server work is simulated in the browser behind a typed `services` layer, so a real backend can replace it without
touching the screens:

- data (projects, takes, balance, charges) lives in IndexedDB;
- preparation runs on timers; turns are cut on a fixed plan;
- recording is real (your microphone); the result is mixed in the browser with MediaRecorder;
- credits follow the spec's money rules but no payment exists;
- the recording lock between tabs uses Web Locks.

Demo controls go in the URL: `?demo=reset` (fresh account: 120 credits, 2 slots), `balance:N`, `slots:full`,
`outcome:no-dialogue|failed@2|assembly-failed`, `turns:N`, `turnms:N`, `speed:N`; combine them with commas,
e.g. `/new?demo=reset,speed:4`.

## Run it

Requires Node 22 and a local Chrome (used by Playwright).

```bash
cd frontend
npm install
npm run dev            # http://localhost:5174 (when 5173 is taken)
```

Then open `/new?demo=reset` and choose `frontend/public/media/scene.mp4`.

## Checks

```bash
cd frontend
npm run build          # TypeScript + Vite
npm run lint           # oxlint
npm run lint:css       # stylelint, design tokens only
npm run test:unit      # Vitest: money rules, turn planning, mock adapter, capture
npm run test:e2e:quick # Playwright, desktop business flows (~7 min) — after each change
npm run test:e2e       # everything: flows, one smoke per route, mobile layout (~8 min) — before a commit
```

E2E tests are business cases (`e2e/flow-us1…5`), one smoke per route with axe (`e2e/smoke.spec.ts`) and mobile layout
at 390 × 844 in EN and RU (`e2e/mobile-layout.spec.ts`). Playwright runs with one worker: the flows record and render
in real time.

## Stack

React 19, TypeScript (strict), Vite, React Router, TanStack Query, Zustand (client state only), CSS Modules with design
tokens, Lucide icons, react-i18next. Playwright + axe, Vitest, oxlint, stylelint. Planned backend: FastAPI and
PostgreSQL.

The UI is built on affect-ui **Clean / Light** with the Inter font: tokens only, kit components only, page archetypes
from the design system. Living styleguide: `/styleguide`; approved prototypes: `/prototypes`.

## Repository layout

| Path | Contents |
|---|---|
| `frontend/` | The SPA: `src/features` (pages), `src/components` (kit and media), `src/services` (contracts, rules, mock), `e2e/` |
| `design-system/` | Foundations, components, patterns, templates, studio and screen briefs, quality checklist |
| `specs/001-recording-flow-mock/` | Feature spec, UI spec, plan, data model, contracts, tasks, quickstart, design QA |
| `.specify/`, `.claude/` | SpecKit workflow, agent roles and skills |
| `PRODUCT_BRIEF.md` | What the product is and why |
| `BOOTSTRAP.md` | How the project was set up, phase by phase |
| `CLAUDE.md` | Working rules and owner decisions |

## How work is done

Features go through SpecKit: specify → plan → design (UI spec and prototype, approved by the owner on localhost) →
tasks → implement → design QA. Releases follow [Semantic Versioning](https://semver.org/) (0.x while the product is
in development): each feature raises the minor version, fixes raise the patch; every release is a `vX.Y.Z` tag with a
GitHub release whose notes come from the changelog.
