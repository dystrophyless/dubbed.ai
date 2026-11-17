# Implementation Plan: Sign-up and sign-in on mock services

**Branch**: `004-auth-mock` | **Date**: 2026-11-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-auth-mock/spec.md`

## Summary

The app stops being one always-signed-in demo user. A new `AuthPort` (contract in `contracts/auth.md`) with a mock in
`services/mock/auth.ts` keeps accounts, email codes, sessions and sign-in throttling in a separate IndexedDB
`dubbed-mock-auth` (R1). Each account gets its own data database — the demo account keeps the existing `dubbed-mock`,
so 001–003 data and code stay as they are (R2); a tab reloads whenever its account changes (R3). Route guards send each
visitor to the page of their stage — guest, `verify`, `microphone`, `active` (R4). Five auth pages are built from the
existing Auth archetype (sign-in, sign-up, code, microphone, reset) plus a mock-only Google stand-in in the Checkout
stand-in style (R7). The microphone check is a live level with "voice heard" detection; the chosen device feeds the
studio's recording (R9). Welcome credits are granted once at activation (R8). `/` redirects by session; the landing
page is a later feature.

## Technical Context

**Language/Version**: TypeScript (strict) 7, React 19

**Primary Dependencies**: as 001–003 — Vite 8, React Router 8, TanStack Query 5, react-i18next, Lucide, the kit
(`OtpInput`, `PasswordField`, `TextField`, `Select`, `Alert`, `Button`, `Card`, `TextLink`) and media (`LevelMeter`).
Web Crypto (`crypto.subtle`, `getRandomValues`), Web Audio `AnalyserNode`, `MediaDevices`. No new dependencies.

**Storage**: IndexedDB — new `dubbed-mock-auth` (stores `accounts`, `codes`, `sessions`, `throttle`, `kv`); data
databases per account (`dubbed-mock` = demo account, `dubbed-mock-<id>` = others; schema unchanged).
localStorage `dubbed.mic.<accountId>` for the chosen microphone; `dubbed.language` unchanged.

**Testing**: Vitest — `rules/auth.test.ts` (email, password, `safeNext`, stage routes), `mock/auth.test.ts`
(sign-up, email taken, codes: wrong / 5 attempts / expired / resend timing, change email, sign-in throttle and
lockout, Google new / existing / Google-only, reset: same reply for unknown email, other sessions revoked, old password
dead, verify → microphone; welcome once under two concurrent `completeMicrophone`; data isolation between two accounts).
Playwright + axe — `e2e/flow-auth-*.spec.ts` per story (EN + RU), smoke per new route, mobile layout for the auth pages;
`e2e/support/flow.ts` adds `signin` so 001–003 flows keep running.

**Target Platform**: evergreen desktop and mobile browsers (as 001–003).

**Project Type**: Web application — SPA only (`frontend/`); backend later.

**Performance Goals**: auth pages interactive at once; a sign-out reaches other tabs within 1 s; the level meter
updates at screen rate.

**Constraints**: Auth archetype, tokens and kit only; EN + RU; WCAG 2.2 AA; key actions above the fold at
1440 × 900 and 390 × 844; passwords and codes never in URLs, logs or the change feed; approved 001–003 screens unchanged
except the shell's user block and Sign out.

**Scale/Scope**: 6 new routes (5 auth + Google stand-in), `/` redirect, 3 guarded route groups; demo: 1 seeded
account + any number created in the browser.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How |
|---|---|---|
| I. Spec-driven delivery | ✅ | Spec clarified 2026-11-16 (3 owner answers, no open markers); this plan → `/speckit-design` → gate → tasks. Landing stays out of scope (owner). |
| II. One design system | ✅ | Auth pages use the existing Auth archetype and its reference template (`/styleguide/templates/auth`, states sign-in · sign-up · verify · microphone · reset). The Google stand-in reuses the Checkout stand-in pattern. No new archetype — routine ui-designer work. |
| III. Owner approves design first | ✅ (pending) | `/speckit-design` writes `ui-spec.md` with every state and a prototype; tasks are blocked until "утверждаю". |
| IV. Every state, e2e-ready, two languages | ✅ | Each page: idle, submitting, field errors, service error with retry, success; code page: wrong / attempts / expired / resend countdown / demo notice; microphone: asking, listening, voice heard, blocked, missing, silent hint. Playwright + axe per story, EN + RU. |
| V. Verify, then claim | ✅ | build, lint, lint:css, Vitest, e2e quick + full, design QA, screenshots at both sizes. |

Post-design re-check (after Phase 1): no violations. The contract change is additive (`Services.auth`,
`ChangeEvent "session"`, `demo.lastCode`); 001–003 ports are unchanged. The one structural change — the data database
name chosen per session (R2) — is internal to `services/mock/db.ts`. Complexity Tracking stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/004-auth-mock/
├── spec.md              # clarified spec
├── plan.md              # this file
├── research.md          # Phase 0 decisions R1–R12
├── data-model.md        # auth entities, stages, invariants
├── quickstart.md        # manual validation scenarios
├── contracts/
│   └── auth.md          # AuthPort, rules, hooks, routes, demo presets
├── ui-spec.md           # /speckit-design (after_plan hook)
└── tasks.md             # /speckit-tasks (after the design gate)
```

### Source Code

```text
frontend/src/
├── services/
│   ├── contracts.ts                  # AuthPort, Session, … ; Services.auth; ChangeEvent "session"; demo.lastCode
│   ├── rules/auth.ts (+ test)        # email/password rules, limits, safeNext, routeForStage
│   ├── index.tsx                     # useSession, auth mutations, R3 reload on session change, new demo presets
│   ├── media/mic-check.ts (+ test)   # live level, devices, voice-heard detection (R9)
│   ├── media/browser-media.ts        # captureFixedWindow uses the chosen device (R9)
│   └── mock/
│       ├── auth-db.ts                # dubbed-mock-auth database (R1)
│       ├── auth.ts (+ tests)         # the AuthPort mock (R5–R8, R11)
│       ├── db.ts                     # data database name from the session (R2)
│       └── index.ts                  # Services.auth wired in; reset → all accounts (R10)
├── app/
│   ├── router.tsx                    # auth routes, `/` redirect, RequireAccount / AuthOnly wrappers (R4)
│   ├── guards.tsx                    # the wrappers
│   └── ProductShell.tsx              # user from the session, real Sign out (R12)
├── features/auth/
│   ├── pages/…                       # SignIn, SignUp, Verify, Microphone, ResetPassword, GoogleStandIn
│   └── views/…                       # presentational views from the approved ui-spec (ui-designer)
├── i18n/locales/en.ts, ru.ts         # auth strings
└── prototypes/…                      # 004 prototype states (ui-designer)
frontend/e2e/
├── flow-auth-*.spec.ts               # US1–US5 business flows
├── smoke.spec.ts, mobile-layout.spec.ts
└── support/flow.ts                   # `signin` preset for 001–003 flows
specs/backend-backlog.md              # server-side auth guarantees (research, last section)
```

**Structure Decision**: SPA only, inside the existing `frontend/` layout: the port and its mock under `services/`, the
pages under a new `features/auth/`, the guards in `app/`. 001–003 feature folders are not touched except
`ProductShell`.

## Complexity Tracking

No violations.
