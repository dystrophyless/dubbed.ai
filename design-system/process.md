# Design process: roles, documents, steps

How a feature goes from spec to approved, implemented UI. SpecKit drives it; three hooks plug design in
(`.specify/extensions.yml`). The product owner approves designs only by writing **"утверждаю"** in chat after looking at
localhost — passing checks is not approval. Chat with the owner is in Russian; documents are in English.

```
/speckit-specify → /speckit-clarify → /speckit-plan
   └ after_plan  (mandatory) → /speckit-design        ui-designer: ui-spec + prototype + screenshots → review loop → Approved
/speckit-tasks
   └ before_tasks (mandatory) → /speckit-design-gate  stop unless ui-spec is Approved (or the feature has no UI)
/speckit-implement                                     ui-builder: real pages from the approved views + e2e
   └ after_implement (mandatory) → /speckit-design-qa design-qa: checklist + screenshot comparison → report / fixes
```

## Roles

| Role | Model | Reads | Writes |
|---|---|---|---|
| **ui-designer** (`.claude/agents/ui-designer.md`) | Sonnet | spec.md, plan.md, `design-system/*` (README first), reference templates | `specs/<NNN>/ui-spec.md`, views + prototype, screenshots |
| **ui-builder** (`.claude/agents/ui-builder.md`) | Sonnet | approved ui-spec, views, `quality.md`, plan.md (service contracts) | page containers, data hooks, e2e tests |
| **design-qa** (`.claude/agents/design-qa.md`) | Sonnet | ui-spec, approved screenshots, `quality.md` checklist | `specs/<NNN>/design/qa-report.md` |
| **design-architect** (`.claude/agents/design-architect.md`) | Opus | everything above + `studio-brief.md` | new archetypes (Phase 4: new-dub, processing, studio, result); critique after 2 rejected rounds |
| **Product owner** | — | prototype on localhost + screenshots | "утверждаю" or change requests in chat |

## Step 1 — ui-spec (ui-designer)

Copy `.specify/templates/ui-spec-template.md` to `specs/<NNN>/ui-spec.md`: screens → route, shell, **archetype**, layout
regions → components, exact copy **EN and RU**, state matrix, interactions, responsive notes, test ids, new components.
No archetype fits → `Status: NEW-ARCHETYPE`, stop and report.

## Step 2 — prototype (ui-designer)

Code that will not be thrown away:
```
frontend/src/features/<feature>/
  views/<Screen>View.tsx      ← presentational: props in (data + state + callbacks), JSX out; inside the right shell
  views/<screen>.module.css   ← only if layout primitives are not enough; tokens only
  mocks.ts                    ← mock data for every state
frontend/src/prototypes/<NNN-feature>.tsx   ← renders each View with mocks; useViewState() + <StateSwitcher/>
frontend/src/prototypes/registry.ts         ← { id: "<NNN-feature>", screens: {...} }
```
Route `/prototypes/<NNN-feature>/<screen>?state=<state>`. Views never fetch or read the URL; all strings via i18n.
Self-check: `npm run build`, `npm run lint`, `npm run lint:css`, snapshots of every screen × state × 1440/390 (+ RU),
look at them, fix what breaks `quality.md` and the page-quality rules in `README.md`.

## Step 3 — review loop (`/speckit-design` in the main session)

1. Show the owner: screens and states, localhost links (`cd frontend && npm run dev` → `http://localhost:5174/prototypes/…`),
   the key screenshots, the decisions worth a look.
2. The owner answers in chat: "утверждаю" or change requests.
3. Changes → the same ui-designer agent (SendMessage) revises; each round goes into the ui-spec Revision log.
   **Every remark also becomes a general rule** in `README.md` / `patterns.md` / `content.md`, not a one-off fix.
4. The same point rejected twice → design-architect (Opus) critique and proposal.
5. "утверждаю" → ui-spec `Status: Approved (date)`, final screenshots in `specs/<NNN>/design/screens/`.

## Step 4 — implementation (ui-builder, inside `/speckit-implement`)

Tasks marked `(ui-builder)` go to the ui-builder agent; backend tasks stay in the main session. Page containers
(`<Screen>Page.tsx`) wire the approved View to the typed services layer (real or mock behind one contract —
`_carryover/frontend-services` is the starting point for recording); routes go into `app/router.tsx` in the right
shell. The View's look does not change; a needed change goes back to the designer and the owner.

## Step 5 — design QA (design-qa, after implement)

Runs the checklist, snapshots the implemented routes with mocks, compares with the approved screenshots, writes
`qa-report.md` (PASS / PASS WITH NOTES / FAIL + `file:line` fixes). Failures go back to ui-builder.

## Escalation: NEW-ARCHETYPE

When nothing in `templates.md` fits, the designer stops. design-architect designs the archetype once: 3–4 low-fi concepts →
the owner picks one → high-fi reference template in `/styleguide/templates`, a section in `templates.md`, any new pattern
or component. The owner approves it like a feature design; every later feature reuses it.
