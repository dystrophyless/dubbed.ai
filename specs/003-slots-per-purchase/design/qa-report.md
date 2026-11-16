# Design QA — 003-slots-per-purchase

**Date**: 2026-11-16 · **Agent**: design-qa · **Verdict: PASS** — no fixes.

Real routes `/new`, `/projects`, `/credits` (with `from=slots&back=new|projects` and every purchase outcome) checked
against the approved `ui-spec.md` (2026-11-16), the 80 approved screenshots in `design/screens/`, the reference
templates and the design-system checklist. Real-route captures: `design/qa-screens/` (87 PNGs: 21 states × 1440×900 /
390×844 × EN/RU, plus three RU captures at 1024).

| Check | Result | Evidence |
|---|---|---|
| Build, oxlint, Stylelint | PASS | all exit 0; no raw colours or inline px in feature files |
| Kit composition, affect-ui ports untouched | PASS | `git diff --stat -- src/components/ui/affect` empty; existing components only |
| Archetypes and hierarchy | PASS | Credits: notice → Balance → Buy credits → History |
| EN/RU copy, offers first / more / max | PASS | all through i18n; plurals correct |
| Purchase outcomes and Back destinations | PASS | 2→10, 10→15, 45→50, already 50; Back to New dub / My projects |
| One primary action, no repeated slots info | PASS | ≤ 1 visible primary in all 84 captures; slots line hidden when a notice states the limit and at 50 |
| Responsive | PASS | scrollWidth = viewport in all captures; key actions above the fold |
| Accessibility (WCAG A/AA, contrast on) | PASS | axe on all 84 captures: 0 violations; keyboard pack choice and Buy work |
| Feature e2e | PASS | `flow-slots.spec.ts`: 12 passed |
| Approved screenshot comparison | PASS | layout, hierarchy, spacing, copy, actions, mobile stacking match |

## Differences from approved screenshots (data, not design)

1. Project rows: the `slots:full` demo preset creates draft projects with placeholder thumbnails (prototype fixtures
   used mixed states and video frames). The 50-slot list is tall because it has 50 rows.
2. Balance and history: `demo=reset` starts at 120 credits, so a purchase shows 1,120 (fixtures showed 14 / 1,014).
3. `success-first` on the real route has "Back to New dub" because it was entered from a slots notice; the fixture had
   no back context. Buy correctly turns secondary.
4. Prototype state switchers are absent on real routes.

## Not covered here

Unchanged loading / error / empty states were reviewed in source, not re-captured. Full e2e (155 passed, 1 skipped)
and unit tests (185) were run separately in T021.
