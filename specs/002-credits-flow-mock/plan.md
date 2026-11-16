# Implementation Plan: Credits flow on mock services

**Branch**: `restart-claude` (bootstrap worktree; SpecKit feature id `002-credits-flow-mock`) | **Date**: 2026-11-15 |
**Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-credits-flow-mock/spec.md`

## Summary

Make `/credits` real (balance, packs, history) on the approved Credits template, add a simulated payment page
(`/checkout/:purchaseId`, outside the product shell) that stands in for a payment provider, and wire the "Buy credits"
links from New dub and the slot-full notices with a way back that keeps the chosen scene. The services layer gains a
`CreditsPort` (packs, history, purchases); the mock adapter gains two IndexedDB stores — `history` (one row per welcome
grant, completed purchase and project run, updated in place in the same transaction that moves the money) and
`purchases` (idempotent, at most one completion). Feature 001's reserve / settle / refund / cancel code writes the
run row alongside the balance change, so the history can never disagree with the balance.

## Technical Context

**Language/Version**: TypeScript (strict) 7, React 19

**Primary Dependencies**: Vite 8, React Router 8, TanStack Query 5 (service data), react-i18next (EN + RU), Lucide; the
existing kit (`OptionCards`, `ListGroup`, `IconTile`, `Pagination`, `Alert`, `NumberTicker` — all already used by the
Credits template) and `AppShell`. No new dependencies.

**Storage**: Browser only — IndexedDB `dubbed-mock` raised to version 2 with stores `history` (keyPath `id`, index
`at`) and `purchases` (keyPath `id`); the account record stays in `kv`. Upgrade from version 1 seeds the history from
the existing state (research R2).

**Testing**: Vitest for `rules/credits.ts` (pack choice, minutes, row text inputs, invariant) and the mock
(`credits.test.ts`: every money transition writes / updates exactly one row; purchase idempotency, double Pay, two
tabs, abandoned purchase, v1 → v2 upgrade). Playwright + axe: `e2e/flow-credits.spec.ts` (US1–US3, desktop, EN + RU),
smoke for `/credits` and `/checkout/:id`, mobile layout for both.

**Target Platform**: Evergreen desktop and mobile browsers (as feature 001).

**Project Type**: Web application — SPA only (`frontend/`); backend and payment provider later.

**Performance Goals**: Credits renders from cache with no visible loading after the first visit; the balance in other
tabs updates within 1 s of a purchase (BroadcastChannel, as 001).

**Constraints**: tokens-only CSS, kit components only, the approved Credits template implemented as-is (constitution
II, III); the payment page uses no real provider's name, branding or card fields (spec FR-006); every string EN + RU
with Russian plurals; WCAG 2.2 AA; key actions above the fold at 1440 × 900 and 390 × 844.

**Scale/Scope**: 1 demo user; ≤ a few hundred history rows; 2 routes (`/credits`, `/checkout/:purchaseId`); 3 packs.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How |
|---|---|---|
| I. Spec-driven delivery | ✅ | spec.md clarified 2026-11-15 (no open markers); this plan → `/speckit-design` (after_plan hook) → gate → tasks. |
| II. One design system | ✅ (watch) | `/credits` is the Gate-3 Credits template. The payment page is new: ui-designer first tries an existing archetype (Status — narrow column, no card; or the auth archetype's centred card); if none fits it is a NEW-ARCHETYPE escalation to design-architect, not improvisation. |
| III. Owner approves design first | ✅ (pending) | `/speckit-design` writes `ui-spec.md` for the real Credits states, the success / declined / first-purchase / shortfall messages and the payment page, with a prototype; tasks are blocked until "утверждаю". |
| IV. Every state, e2e-ready, two languages | ✅ | Credits: loading, empty-history, error + retry, default, purchasing, success, declined; payment page: default, paying, already finished, not found. Test ids per `design-system/quality.md`; Playwright + axe per story, EN + RU. |
| V. Verify, then claim | ✅ | build, lint, lint:css, Vitest, e2e quick + full, design QA, screenshots at both sizes — real output reported. |

No violations → Complexity Tracking stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/002-credits-flow-mock/
├── spec.md              # clarified spec
├── plan.md              # this file
├── research.md          # Phase 0 decisions
├── data-model.md        # entities, states, invariant
├── quickstart.md        # how to run and validate end to end
├── contracts/
│   └── credits.md       # CreditsPort + changes to the 001 contract
├── ui-spec.md           # written by /speckit-design (after_plan hook)
└── tasks.md             # /speckit-tasks (after the design gate)
```

### Source Code

```text
frontend/
├── src/
│   ├── services/
│   │   ├── contracts.ts               # + CreditsPort, CreditPack, Purchase, HistoryRow; DemoSettings + payment outcome
│   │   ├── index.tsx                  # + qk.credits.*, useCreditsHistory / usePacks / usePurchase hooks, invalidation
│   │   ├── rules/credits.ts           # NEW — pack for a shortfall, minutes, run-row state from money, invariant
│   │   └── mock/
│   │       ├── db.ts                  # DB_VERSION 2: stores history, purchases; v1 → v2 seeding
│   │       ├── credits.ts             # NEW — CreditsPort mock (packs, history paging, purchases, sweep)
│   │       └── index.ts               # start / retry / settle / refund / cancel write the run row in the same tx
│   ├── features/
│   │   ├── credits/                   # NEW — /credits page (container) + views ported from the template
│   │   └── checkout/                  # NEW — /checkout/:purchaseId simulated payment page
│   ├── features/new-dub/NewDubPage.tsx    # Buy credits → /credits?from=new&project=<id>&need=<n>
│   ├── features/projects/ProjectsPage.tsx # Buy credits (slots) → /credits?from=slots
│   ├── app/router.tsx                 # + /credits (AppShell), + /checkout/:purchaseId (no product shell)
│   ├── app/ProductShell.tsx           # balance pill hidden on /credits
│   └── i18n/locales/{en,ru}.ts        # credits.*, checkout.* namespaces with plurals
├── src/services/**/*.test.ts          # Vitest
└── e2e/flow-credits.spec.ts           # Playwright (+ smoke, mobile-layout entries)
```

**Structure Decision**: Same single SPA as 001. Credits talk to the services only through `contracts.ts` + TanStack
Query hooks. The payment page is its own feature folder because the real adapter will replace it with a redirect to
the provider (contracts: `Purchase.checkoutUrl`) — Credits never knows which.

## Complexity Tracking

> No constitution violations.

## Phase 0 → research.md · Phase 1 → data-model.md, contracts/credits.md, quickstart.md

Post-design Constitution re-check: ✅ unchanged. The only new visual surface (payment page, new messages) goes through
`/speckit-design`; the history and purchase rules live in the services layer and are unit-tested; money keeps one
transaction per change (backend backlog guarantee 1).
