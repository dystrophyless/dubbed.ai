# Bootstrap — build the design system first, then the pages

How to set Dubbed up before any product feature. Work through the phases **in order**; each phase ends with a **gate**
that only the owner can pass by writing "утверждаю" in chat after looking at it on localhost.

Read first: `PRODUCT_BRIEF.md`, then `D:\Program\affect-ui-project-playbook.md` (sections 3–5 and 7–9; section 4 =
Clean), then the working example `D:\Program\python\Novio` (`design-system/`, `.claude/agents/`, `.claude/skills/`,
`.specify/`, `CLAUDE.md`, `frontend/`). Novio uses the **Classic** variant — copy its structure and process, never its
visual values.

**Do not look at the git tags or branches `archive/*` and `attempt/*` for anything visual.** Dubbed's screens are
designed from scratch.

---

## Phase 0 — Workflow and tooling (no gate)

1. **SpecKit for Codex**: `specify init --here`, Codex integration, PowerShell scripts, sequential numbering. Copy Novio's
   `.specify/extensions.yml` (after_plan → `speckit.design`, before_tasks → `speckit.design.gate`, after_implement →
   `speckit.design.qa`) and `.specify/templates/ui-spec-template.md`.
2. **Roles** as Codex custom agents (`.codex/agents/<role>.toml`, model and reasoning effort pinned) with their
   instructions in role skills (`.agents/skills/role-<role>/SKILL.md`):
   - `ui-designer`, `design-qa`, `design-architect` → **gpt-6.1-sol, xhigh**;
   - `ui-builder` → **gpt-6-luna, max**.

   Port the three design skills (`speckit-design`, `speckit-design-gate`, `speckit-design-qa`) and a
   `dubbed-design-system` skill from Novio. Write `.specify/memory/constitution.md` (Novio's five principles, Clean,
   Inter, Dubbed stack, EN+RU) and complete `AGENTS.md`.
3. **Frontend scaffold** with the owner-confirmed stack (`PRODUCT_BRIEF.md` §6): Vite + React 19 + TS, React Router,
   TanStack Query, Zustand, CSS Modules, Lucide, Playwright + axe, Stylelint tokens-only, oxlint, screenshot script at
   1440 × 900 and 390 × 844. Routes: `/styleguide`, `/styleguide/templates/<id>?state=`, `/prototypes/<feature>/<screen>?state=`.

## Phase 1 — Adopt affect-ui Clean → **Gate 1: styleguide approved**

The goal: every building block exists in the Clean style and the owner has approved how it looks **before** any page is
designed.

1. **Audit** `D:\Program\frontend\affect-ui\affectui-free` — **Clean / Light only**: all 17 components, motion, icons,
   type, colours, shadows, radii, spacing, touch rules. Every value goes into `design-system/audit.md` with its source
   file and line. Open the Light PNGs and compare by eye.
2. **Tokens** (`frontend/src/styles/tokens.css`) from the audit only.
3. **Port every Clean component** that has a use in Dubbed, deterministically (colours/shadows/easing/fonts → tokens;
   sizes untouched). Ports are never edited afterwards; a necessary deviation is a documented patch the owner approves.
4. **Build the rest of the kit in the Clean language** — only from Clean's own shapes, edges, shadows, type and motion:
   - **base:** text field, password, textarea, select / listbox (no native pickers), checkbox / radio / switch, dialog,
     toast, alert, empty state, skeleton, progress, tooltip, menus, tags / badges, avatar, pagination;
   - **media (Dubbed-specific; affect has none, so design them with extra care):** video stage (any aspect ratio, poster,
     loading / error), play / pause and scrubber, waveform, timeline with turn segments and a playhead, a **record
     control** with its idle / recording / saved states, a level meter, a volume control, turn navigation, upload
     drop-zone, section-range selector on a timeline, a credit-cost button.
5. **Layout primitives** (stack, cluster, grid, container, section, two-column, sticky bar, show-at-breakpoint) and the
   app shells: the ordinary shell with top navigation, and the **focused shell** (no global navigation, only Exit).
6. **`/styleguide`** shows every component in every state (hover, focus, disabled, loading, error), EN and RU, desktop and
   phone. Every control works.
7. **Owner review rounds** on the styleguide with screenshots. Each remark becomes a general rule in `design-system/`.
   → **Gate 1**: owner writes "утверждаю" for the styleguide.

## Phase 2 — Design-system documents and IA → **Gate 2: IA approved**

1. `design-system/` — the ten documents as in Novio (README with golden rules, ia, templates, components, patterns,
   foundations, content, quality, process, audit), written for Dubbed and Clean. Include the page-quality rules below.
2. `design-system/ia.md` from `PRODUCT_BRIEF.md`: routes, which pages use the ordinary vs the focused shell, flows,
   glossary (turn, take, unaccepted take, accepted take, credits, reservation, slot).
   → **Gate 2**: owner approves the IA.

## Phase 3 — Calibrate on simple pages → **Gate 3: simple templates approved**

Reference templates with every state (loading, empty, error, success), built **only** from the approved kit:
`auth` (sign in, sign up, verification code, reset), `projects` (list), `settings` (account, microphone), `credits`
(balance, packs, history). These show whether the Clean style holds on whole pages — fix the kit, not the page, when it
does not. Owner review rounds → **Gate 3**.

## Phase 4 — New archetypes through design exploration → **Gate 4 per archetype**

For `new-dub`, `processing`, `studio` and `result` (in that order of importance: **studio** first):

1. **Design brief from the user's goal**, not from any previous screen. For the studio: the user follows the moving
   scene, reads the line, sees when it is spoken and how long it lasts, hears the original, records, hears the take in
   the scene and moves on — on a laptop and on a phone, with headphones or without.
2. **3–4 genuinely different concepts** as quick low-fi wireframes (structure and hierarchy only). Each concept states
   its idea in one sentence and its trade-offs. The owner picks — for the studio, **two** for the future A/B test.
3. **High-fi** of the chosen concepts from the approved kit, with every state, EN/RU, 1440 and 390.
4. Owner review rounds → **Gate 4**.

This is design-architect work (gpt-6.1-sol, xhigh). Do not jump to high-fi before the owner has picked a concept.

## Phase 5 — Commit, then the first feature

Commit the design system after the gates (only when the owner asks). First feature through the SpecKit pipeline:
authentication, or — if the owner prefers to prove the core first — the recording flow on the mock services, reusing
`_carryover/frontend-services/`.

---

## Page-quality rules (from earlier review rounds — apply from day one)

- **One primary action per view**, unmistakable; the most frequent action (e.g. Record) is never a pale or tiny control.
- **No duplicated information** on one screen (the same counter, status or hint twice).
- **Key actions are visible without scrolling** at 1440 × 900 and 390 × 844.
- Buttons in one row have the same size; controls in one toolbar have the same height.
- Every control works; no native browser pickers; neighbouring sections share their header shape.
- Navigation actions (previous / next) look like actions, not like disabled text.
- Media is shown at its own aspect ratio without heavy letterbox frames or labels covering the picture.
- Phone: no horizontal scroll; touch targets per the Clean touch rules; text readable without zoom.

## Ground rules

- No product feature code before Gates 1–3; no studio high-fi before its concept is picked.
- Never print or commit `.env` contents; demo data never contains the owner's real email or IDs.
- Every "done" comes with real command output (build, lint, lint:css, e2e); what was not run is said plainly.
- Approval is only the owner's explicit "утверждаю" in chat after looking at localhost — passing checks is not approval.
