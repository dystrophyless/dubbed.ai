# Implementation Plan: Recording flow on mock services

**Branch**: `restart-claude` (bootstrap worktree; SpecKit feature id `001-recording-flow-mock`) | **Date**: 2026-11-04 |
**Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-recording-flow-mock/spec.md`

## Summary

Make the Gate-4-approved prototypes real: the routes `/new`, `/projects/:id/processing`, `/projects/:id/turns/:n`,
`/projects/:id/result`, `/projects` and the `/projects/:id` redirect, backed by a typed services layer with a mock
implementation that lives in the browser (IndexedDB for projects, takes and results; a simulated clock for preparation and
assembly; real microphone capture; a browser-side mix of the user's takes into the scene, downloaded as WebM). The screens
are ported from the prototypes into feature folders; prototype-only demo state is replaced by TanStack Query over the
services; the prototypes stay as the design reference.

## Technical Context

**Language/Version**: TypeScript (strict) 7, React 19

**Primary Dependencies**: Vite 8, React Router 8, TanStack Query 5 (service data), Zustand 5 (client-only state:
toasts, notify opt-in), react-i18next (EN + RU), Lucide; the existing kit (`components/ui`, `components/layout`,
`components/media`) and shells (`AppShell`, `StudioShell`). New dev dependency: **Vitest** (+ `fake-indexeddb`) for
service unit tests (the carry-over tests are Vitest).

**Storage**: Browser only — IndexedDB (projects, turns, takes as audio Blobs, source video Blob, result versions and
their rendered files) behind the mock adapter; `localStorage` only for the language and the notify opt-in.

**Testing**: Vitest for the services layer (rules: pricing, reserve/settle/refund, slots, state machine, versions);
Playwright + axe for every user story on desktop 1440×900 and phone 390×844, EN + RU, with a fake microphone
(`--use-fake-device-for-media-stream`, `--use-fake-ui-for-media-stream`) and the bundled `scene.mp4` as the upload.

**Target Platform**: Evergreen desktop and mobile browsers (Chrome, Edge, Firefox, Safari 17+); microphone via
`getUserMedia`; WebM recording via `MediaRecorder` (Safari falls back to MP4/AAC in the recorder — the download extension
follows the recorded type).

**Project Type**: Web application — SPA only (`frontend/`); backend later.

**Performance Goals**: recording starts < 0.5 s after Record (SC-005); route changes render from cache with no visible
loading for data already in IndexedDB; the studio keeps 60 fps animations on a mid-range phone.

**Constraints**: tokens-only CSS, kit components only, approved views implemented as-is (constitution II, III); every
string EN + RU; WCAG 2.2 AA; key actions above the fold at 1440×900 and 390×844; no network calls (fully offline demo
except fonts already bundled).

**Scale/Scope**: 1 demo user; ≤ 10 projects; ≤ 40 turns per project; sections ≤ 120 s; 6 routes; ~12 screen states each
already designed in the prototypes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How |
|---|---|---|
| I. Spec-driven delivery | ✅ | spec.md clarified (2026-11-04, no open markers); this plan → `/speckit-design` (after_plan hook) → gate → tasks. |
| II. One design system | ✅ | Screens are ports of the approved prototypes built from kit/media components and tokens; no new visual patterns. The one copy change forced by the demo (Download says WebM) is flagged for owner review in the ui-spec. |
| III. Owner approves design first | ✅ (pending) | The UI was approved at Gate 4 as prototypes; `/speckit-design` writes `ui-spec.md` mapping each screen/state to its approved prototype and asks the owner to approve the real-route version (incl. the WebM copy). Tasks are blocked until then. |
| IV. Every state, e2e-ready, two languages | ✅ | Loading/empty/error/success per screen come from the services; test ids from `design-system/quality.md`; Playwright + axe per user story, EN + RU. |
| V. Verify, then claim | ✅ | build, lint, lint:css, Vitest, e2e, design QA, screenshots at both sizes — reported with real output. |

No violations → Complexity Tracking stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-recording-flow-mock/
├── spec.md              # clarified spec
├── plan.md              # this file
├── research.md          # Phase 0 decisions
├── data-model.md        # entities, state machine, rules
├── quickstart.md        # how to run and validate end to end
├── contracts/
│   └── services.md      # the typed services contract the screens use
├── ui-spec.md           # written by /speckit-design (after_plan hook)
└── tasks.md             # /speckit-tasks (after the design gate)
```

### Source Code

```text
frontend/
├── src/
│   ├── services/                      # NEW — the typed services layer
│   │   ├── contracts.ts               #   ports + DTOs (contracts/services.md)
│   │   ├── index.ts                   #   createServices(adapter) — "mock" only for now; React provider + hooks
│   │   ├── rules/                     #   pure product rules: price, slots, cancel charge, state machine
│   │   ├── media/                     #   re-imported from _carryover: NativeBrowserMedia (capture, peaks, probe),
│   │   │                              #   WebLockCaptureGrants (one recording tab at a time)
│   │   └── mock/                      #   IndexedDB store, simulated clock, demo turns, result mixer, demo controls
│   ├── features/                      # NEW — one folder per screen, ported from src/prototypes/*
│   │   ├── new-dub/                   #   /new
│   │   ├── processing/                #   /projects/:id/processing
│   │   ├── studio/                    #   /projects/:id/turns/:n (StudioShell)
│   │   ├── result/                    #   /projects/:id/result
│   │   └── projects/                  #   /projects + /projects/:id redirect
│   ├── app/router.tsx                 # real routes added; "/" → /projects
│   ├── app/providers.tsx              # ServicesProvider + QueryClient
│   ├── components/…                   # kit/media — reused; small additions only if the port needs them
│   ├── prototypes/…                   # kept unchanged as the approved design reference
│   └── i18n/locales/{en,ru}.ts        # strings move from prototype namespaces to feature namespaces
├── src/services/**/*.test.ts          # Vitest
└── e2e/flow-*.spec.ts                 # Playwright per user story
```

**Structure Decision**: Single SPA in `frontend/`. Services are a separate layer (`src/services`) the features talk to
only through `contracts.ts` + TanStack Query hooks, so the real adapter later replaces `mock/` without touching
`features/`. Prototypes remain untouched as the design source; features copy their view code and drop the demo clocks.

## Complexity Tracking

> No constitution violations.

## Phase 0 → research.md · Phase 1 → data-model.md, contracts/services.md, quickstart.md

Post-design Constitution re-check: ✅ unchanged — the services contract adds no UI, the result mixer is behind the
`ResultPort`, and the only user-visible deviation (WebM) goes to owner review in `/speckit-design`.
