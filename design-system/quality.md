# Quality: accessibility, e2e-readiness, visual checks

## Accessibility (target: WCAG 2.2 AA, with one deliberate exception)

- **Colour contrast is checked** (owner, 2026-11-02): text >= 4.5:1, large text and UI boundaries (inputs, checkboxes,
  card edges) >= 3:1, on white and on the canvas. The values come from DUBBED PATCH 3 in `tokens.css`; axe runs with
  `color-contrast` ON. A visual "real text" placeholder (e.g. a Select with nothing chosen) uses `--color-muted`, not
  `--color-faint` (`--color-faint` is only for `::placeholder` and disabled hints).
- Semantic HTML first: `button` for actions, `a` for navigation, `form` + `label`, one `h1` per page, headings in order.
- Every control has an accessible name. Icon-only buttons: `aria-label`. Avatar / initials buttons: name from `sr-only`
  text, never an `aria-label` that contradicts visible text (axe `label-content-name-mismatch`).
- Keyboard: everything reachable with Tab, visible focus ring, Escape closes overlays and returns focus, menus and
  listboxes use arrows, sliders use arrows / Home / End.
- Targets ≥ 24px everywhere (WCAG 2.5.8); touch sizes per `foundations.md` → Controls. Tiny visual items (e.g. short
  marks on a track) are drawn inside one larger control instead of being separate targets.
- Errors: `aria-invalid` + `aria-describedby` + `role="alert"` (the kit's fields do it).
- Live updates: toasts `role=status` (danger: `alert`); the record control's time is `aria-live="polite"`.
- Media: video has an accessible label; the recording state is announced (Record / Stop names change).
- Motion: `prefers-reduced-motion` respected (kit does it).
- Language: `<html lang>` follows the UI language (i18n does it).

## E2E-ready UI

A screen is e2e-ready when a Playwright test can drive every state without sleeping or guessing selectors.

**Selectors, in order:** role + accessible name → label → `data-testid` for containers and repeated items.
**`data-testid`:** kebab-case `<area>-<thing>`: `project-card` (+ `data-state="recording"`), `projects-list`,
`studio-stage`, `turn-line`, `audio-track`, `record-control`, `turn-nav`, `cost-button`, `upload-dropzone`, `toaster`,
`language-switch`, `state-switcher`.
**States:** every screen renders all states from data (loading skeleton with `aria-busy`, empty, error with retry,
success). Prototypes expose them via `?state=`; real pages derive them from TanStack Query.
**Media in tests:** use `_carryover/media` fixtures (`/media/scene.mp4`); fake microphone via Chrome flags
(`--use-fake-device-for-media-stream`) when recording is tested.

**Tests per feature** (`frontend/e2e/<feature>.spec.ts`, by ui-builder): the happy path of each user story; each
error / empty state through mocks; `expectNoA11yViolations(page)` on each screen; one RU run where copy is longer; the
no-horizontal-scroll check against `page.viewportSize().width` (never the document width).

## Visual checks

- **Approved screens:** `specs/<NNN>/design/screens/*.png` — every screen × state × desktop 1440 / phone 390 (+ RU where
  copy differs in length). The reference for design QA.
- **Snapshots:** `npm run snap -- --base http://localhost:4175 --out <dir> --viewport both <paths…>`
  (after `npm run build && npx vite preview --port 4175`); `npm run snap:styleguide` for the styleguide sections.
- On Windows Git Bash prefix with `MSYS_NO_PATHCONV=1` so `/prototypes/...` paths are not rewritten.

## Lint gates

- `npm run build` — TypeScript strict + bundle.
- `npm run lint` — oxlint, 0 warnings; a suppression needs a one-line reason next to it.
- `npm run lint:css` — Stylelint tokens-only (no raw colours, radii, shadows, font sizes/weights, line heights, easing).
- `npm run test:e2e` — Playwright + axe. On this machine memory is tight: run with `--workers=1` if workers crash.

## Design QA checklist (design-qa runs this)

1. Archetype matches the ui-spec; structure matches the reference template.
2. Only kit / layout / media components; no ad-hoc components without a ui-spec entry; ports untouched.
3. Tokens only (lint:css clean); no inline styles with raw values.
4. Copy matches the ui-spec in EN and RU and `content.md`; glossary terms; no speaker identity.
5. All states present and reachable; skeletons match the content shape.
6. 1440, 1024, 390 look right; no horizontal scroll; key actions above the fold.
7. One primary action per view; red only for recording / destructive; destructive confirmed.
8. Page-quality rules from `README.md` (no duplicated info, equal button sizes per row, navigation looks like actions).
9. a11y: axe clean (contrast included), keyboard path works, focus visible.
10. Screenshots match the approved ones; differences listed with `file:line` fixes.
