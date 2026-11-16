# Implementation Plan: More project slots with every purchase

**Branch**: `003-slots-per-purchase` | **Date**: 2026-11-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-slots-per-purchase/spec.md`

## Summary

Every completed purchase after the first raises the project slot limit by 5, up to 50 (first purchase 2 → 10 as in
002). The rule becomes one pure module (`services/rules/slots.ts`: `slotLimitAfterPurchase`, `slotsOffer`, …); the mock's
existing `pay` transaction applies it next to the balance change and records `slotsBefore` / `slotsAfter` on the
purchase for the success message. The 002 interim dead end ("Delete a project to free a slot" at 10 of 10) becomes a
purchase offer below 50 on New dub and My projects, with a way back to the screen the user came from; Credits gains a
slots line near the packs. No new routes, no storage upgrade.

## Technical Context

**Language/Version**: TypeScript (strict) 7, React 19

**Primary Dependencies**: as 002 — Vite 8, React Router 8, TanStack Query 5, react-i18next, Lucide, the existing kit
(`Alert`, `OptionCards`) and approved views (`CreditsView`, New dub, My projects). No new dependencies.

**Storage**: Browser IndexedDB `dubbed-mock` (version unchanged); the account record's `slotLimit` widens to any
`isSlotLimit` value; `purchases` records gain `slotsBefore` / `slotsAfter` (absent on old records = no slots change).

**Testing**: Vitest — `rules/slots.test.ts` (closed form vs. step for 0…12 purchases, `isSlotLimit`, `slotsOffer`),
mock `credits` tests (completion raises once, declined / cancelled / swept don't, two completions at 45 → 50, demo
`slotLimit` validation). Playwright + axe — `e2e/flow-slots.spec.ts` (US1–US2, EN + RU), existing credits / new-dub /
projects flows updated where 002 asserted the interim text; mobile layout for the changed notices.

**Target Platform**: evergreen desktop and mobile browsers (as 001–002).

**Project Type**: Web application — SPA only (`frontend/`); backend later.

**Performance Goals**: the new limit shows on Credits, My projects and New dub without a reload, in other tabs within
1 s (existing change feed).

**Constraints**: approved screens changed only through `/speckit-design` + owner approval (constitution III); tokens
and kit only; EN + RU with Russian plurals (2 / 5 / 21 forms for slot counts); WCAG 2.2 AA; key actions above the
fold at 1440 × 900 and 390 × 844.

**Scale/Scope**: 1 demo user; limits 2, 10…50; 3 screens touched (Credits, New dub, My projects), no new routes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How |
|---|---|---|
| I. Spec-driven delivery | ✅ | spec clarified 2026-11-16 (no open markers); this plan → `/speckit-design` (after_plan hook) → gate → tasks. |
| II. One design system | ✅ | No new archetype: changes are notices and one text line inside approved Credits, New dub and My projects, built from `Alert` and existing text styles. Routine ui-designer work. |
| III. Owner approves design first | ✅ (pending) | `/speckit-design` writes `ui-spec.md` with the notice variants (free / below cap / at cap), Credits slots line and success wording, with a prototype; tasks blocked until "утверждаю". |
| IV. Every state, e2e-ready, two languages | ✅ | States per limit band (2, 10–45, 45 → 50, 50) for each screen; existing loading / error states unchanged; Playwright + axe per story, EN + RU. |
| V. Verify, then claim | ✅ | build, lint, lint:css, Vitest, e2e quick + full, design QA, screenshots at both sizes — real output reported. |

Post-design re-check (after Phase 1): still no violations — the contract change is additive (`slotLimit` widened,
two nullable purchase fields, one `ReturnTo` field), no new dependency or store. Complexity Tracking stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/003-slots-per-purchase/
├── spec.md              # clarified spec
├── plan.md              # this file
├── research.md          # Phase 0 decisions R1–R6
├── data-model.md        # Account / Purchase changes, invariants
├── quickstart.md        # manual validation scenarios
├── contracts/
│   └── slots.md         # rule functions, type changes, URLs, behaviour by limit
├── ui-spec.md           # /speckit-design (after_plan hook)
└── tasks.md             # /speckit-tasks (after the design gate)
```

### Source Code

```text
frontend/src/
├── services/
│   ├── rules/slots.ts (+ slots.test.ts)     # the rule (R1)
│   ├── contracts.ts                         # Account.slotLimit, Purchase.slotsBefore/After, ReturnTo.slots.from
│   ├── index.tsx                            # demo param slots:<limit> widened (R5)
│   └── mock/
│       ├── credits.ts (+ tests)             # pay(): slotLimitAfterPurchase in the completing transaction (R2, R3)
│       └── index.ts                         # account record type, demo.set validation, reset → 2
├── features/
│   ├── credits/CreditsPage.tsx, views/CreditsView.tsx, mocks.ts   # slots line, notices, way back (R4)
│   ├── new-dub/NewDubPage.tsx (+ its notice view)                 # notice variants by slotsOffer
│   └── projects/ProjectsPage.tsx (+ its view)                     # notice variants, back=projects
├── i18n/locales/en.ts, ru.ts                # new / changed strings with plurals
└── prototypes/…                             # 003 prototype states (ui-designer)
frontend/e2e/flow-slots.spec.ts              # new business flow; 002 flows updated
PRODUCT_BRIEF.md §3                          # rule in force, interim note removed (FR-012)
```

**Structure Decision**: SPA only, inside the existing `frontend/` layout; the rule in `services/rules`, the mock change
in the existing `pay` transaction, UI changes inside the three approved feature folders.

## Complexity Tracking

No violations.
