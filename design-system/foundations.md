# Foundations

Values live in `frontend/src/styles/tokens.css`; where each comes from is in `audit.md`. This file says **how to use them**.

## Colour

| Role | Tokens | Use |
|---|---|---|
| Canvas | `--color-canvas` (#fafafa) | page background |
| Surface | `--color-surface` | cards, popovers, fields, the audio track |
| Text | `--color-strong` titles · `--color-ink` body · `--color-text` secondary · `--color-muted` meta · `--color-faint` placeholders | never put essential information only in muted / faint |
| Lines and fills | `--color-line` dividers, chips, tracks · `--color-wash` hover · `--color-track` segmented track · `--color-fill-strong` stronger fill, original waveform | |
| Primary + accent (indigo #5b5bd6, PATCH 4) | `--color-solid` / `--color-accent` (+ `-strong` for text on tints, `-soft`, `-wash`, `--color-focus`) | the one primary action; checked, selected, progress, links, focus ring, saved take |
| Danger (red) | `--color-danger`, `-soft` | **recording** and destructive actions, errors |
| Success / warning | `--color-success(-soft)`, `--color-warning(-soft, -text)` | small signals only (saved, low balance) |

Neutral first: colour is a signal, never decoration. Light theme only.

## Type — Inter Variable

| Token | Size / line | Weight | Use |
|---|---|---|---|
| `--text-display` | 28 / 36, −0.02em | 500 | landing hero, balance numbers |
| `--text-h1` | 22 / 30, −0.015em | 500 | page title (one per page) |
| `--text-h2` | 18 / 26, −0.01em | 500 | section titles on long pages; the turn's line in the studio |
| `--text-lg` | 15 / 24 | 500 | card titles, dialog titles |
| `--text-md` | 13 / 20 | 400 body · 500 labels and buttons | **the base size** |
| `--text-sm` | 12 / 16 | 400–500 | meta, hints, small buttons |
| `--text-sm2` / `--text-xs` | 11 / 16 · 10 / 16 caps | 500 | badges, overlines |
| `--text-input` | 16 | — | real inputs on touch |

Display / h1 / h2 are derived (the pack stops at 15–16px) and approved by the owner (2026-11-02). Only weights 400 and 500.
Numbers that change or align (time, credits, counters) use `font-variant-numeric: tabular-nums`.

## Layout

- One breakpoint: **1024px** (`Show`, `TwoColumn`, shells). Check 390, 1024, 1440.
- Containers: content 1120 · narrow 720 · form 400; side gutters 16 (phone) / 32.
- Page rhythm: 24–32 between sections, 12–16 inside cards; spacing scale 2 · 4 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 24 · 32 · 48 · 64.
- Primitives: `Stack`, `Cluster`, `Grid`, `Container`, `Section`, `TwoColumn`, `StickyBar`, `Show`.

## Shape and depth

- Radii: card 10 · segmented track 8 · control 6 · chip 5 · checkbox 4 · full for avatars and the record disc.
  Nested shapes stay concentric (inner radius = outer − inset).
- Depth by shadow, not borders: `--shadow-card` (cards, secondary buttons), `--shadow-card-hover`, `--shadow-pop`
  (menus, dialogs, toasts), `--shadow-field` (inputs), `--shadow-focus` / `--shadow-invalid`. Dividers are 0.5px
  hairlines (`--hairline`). The audio track's outline is the one deliberate 1px outline (`--shadow-outline`).

## Controls

Heights 24 / 28 / 32 on desktop; 32 / 36 / 36 and 44px rows on touch. One toolbar = one height.
The record disc is 56px (64px on touch) — the largest control by design.

## Icons

Lucide only, through `<Icon name>` and the semantic dictionary (`components/icons/Icon.tsx`): 16px (14px in small
controls), absolute 1.3px stroke, `currentColor` in `--color-icon`, darkening to ink on hover. Icon-only buttons need an
`aria-label`; icons are `aria-hidden`. Add a dictionary entry rather than importing Lucide directly.

## Motion

- Ease `--ease-out` (cubic-bezier(0.22, 1, 0.36, 1)) for almost everything; `--ease-spring` for ticks; `--ease-segment`
  for the segmented thumb.
- 140ms colour/shadow · 160ms press · 220ms small moves · 300ms panels/dialogs · 480ms width morph.
- Press = scale 0.97. Changed labels blur in. Loading = a light band sweeping across the label; skeleton shimmer 2.2s.
- `prefers-reduced-motion`: animations off, transitions 1ms (every kit component does this).
- No motion that delays recording or playback.
