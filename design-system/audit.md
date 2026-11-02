# Audit — affect-ui Clean / Light

Every visual value in `frontend/src/styles/tokens.css` comes from this file. Source pack:
`D:\Program\frontend\affect-ui\affectui-free` (free edition). Only **Clean / Light** was measured; Classic and all Dark
blocks were skipped (the dark overrides in each source were excluded by the extraction script).

**Method.** Each component's `components/<name>/Clean/<name>-clean.md` contains the full TSX source with its CSS in a
template string. A script extracted every light-mode declaration with its line number; values were then grouped by
value across components. References below are `<file>:<line>` inside `components/<name>/Clean/` (or `motion/<name>/`).
Screenshots (`Light/*.png`, rendered at 2×) were opened and compared by eye; the canvas colour was sampled from them.

Status legend: **M** measured in source · **P** sampled from the Light PNGs · **D** derived for Dubbed in the Clean
language (not in the pack; needs owner approval at Gate 1).

---

## 1. Canvas and surfaces

| Token | Value | St. | Source |
|---|---|---|---|
| `--color-canvas` | `#fafafa` | P | `button/Clean/Light/01-initial.png` pixel (894, 5) = rgb(250,250,250); same in every Clean Light PNG |
| `--color-surface` | `#ffffff` | M | card in 20 components, e.g. `button-clean.md:297` (`surface`), `filter-menu-clean.md:423` (`card`) |
| `--color-surface-code` | `#fafafa` | M | `tool-call-card-clean.md:691` (`code`) |

The Clean language: a light grey canvas, **white cards with a 10px radius and a hairline shadow** (no borders),
compact 13px type, neutral greys as alpha-black, one blue accent used sparingly.

## 2. Text and icon colours (alpha-black scale)

| Token | Value | St. | Used as | Source (count) |
|---|---|---|---|---|
| `--color-strong` | `#000000` | M | titles, strong text | `strong` ×13, e.g. `filter-menu-clean.md:425`; `button-clean.md:290` (`title`) |
| `--color-ink` | `rgba(0,0,0,0.88)` | M | body text, primary fill | `ink` ×25, e.g. `button-clean.md:291` |
| `--color-text` | `rgba(0,0,0,0.61)` | M | secondary text, ghost label | `text` ×16, e.g. `filter-menu-clean.md:426`; `button-clean.md:292` (`muted`) |
| `--color-muted` | `rgba(0,0,0,0.45)` | M | meta, counters, hints | `muted` ×12, e.g. `filter-menu-clean.md:427` |
| `--color-icon` | `rgba(0,0,0,0.447)` | M | icons | `icon` ×13, e.g. `button-clean.md:293` |
| `--color-faint` | `rgba(0,0,0,0.27)` | M | placeholders, disabled hints | `faint` ×10, e.g. `filter-menu-clean.md:428` |
| `--color-hover-text` | `rgba(0,0,0,0.75)` | M | segmented option hover | `segmented-control-clean.md:535` |
| `--color-on-solid` | `#fcfcfc` | M | text on the dark primary | `on-solid` ×7, e.g. `button-clean.md:296` |

`muted`, `icon` and `faint` are below WCAG AA contrast on white — kept 1:1 (owner decision; axe `color-contrast` is a
documented exception).

## 3. Lines, fills and washes

| Token | Value | St. | Used as | Source (count) |
|---|---|---|---|---|
| `--color-line` | `rgba(0,0,0,0.06)` | M | dividers, hairlines, chip fill, progress track | ×25: `line`/`fill`/`track`, e.g. `filter-menu-clean.md:430-431`, `progress-tracker-clean.md:278` |
| `--color-fill-strong` | `rgba(0,0,0,0.1)` | M | stronger fill, tree lines, bars | ×3, `filter-menu-clean.md:432`, `comment-thread-clean.md:416` |
| `--color-track` | `rgba(0,0,0,0.04)` | M | segmented track, neutral fill | ×2, `segmented-control-clean.md:539`, `change-summary-clean.md:191` |
| `--color-wash` | `rgba(0,0,0,0.03)` | M | hover wash | ×15, e.g. `button-clean.md:300` |
| `--color-wash-soft` | `rgba(0,0,0,0.015)` | M | large-area wash | ×3, `change-summary-clean.md:186`, `tool-call-card-clean.md:689` |
| `--color-ring` | `rgba(0,0,0,0.2)` | M | empty check circle | `progress-tracker-clean.md:277` |
| `--color-box-ring` | `rgba(0,0,0,0.22)` | M | checkbox outline | `filter-menu-clean.md:434` |
| `--color-avatar-ring` | `rgba(0,0,0,0.08)` | M | avatar outline | `comment-thread-clean.md:424` |
| `--color-art` | `rgba(0,0,0,0.07)` | M | decorative line art, grid | `notification-stack-clean.md:320`, `grid-background.md:203` |

## 4. Primary (solid) and accent

| Token | Value | St. | Source |
|---|---|---|---|
| `--color-solid` | `rgba(0,0,0,0.88)` | M | primary button `button-clean.md:294` (`solid` ×7) |
| `--color-solid-hover` | `rgba(0,0,0,0.8)` | M | `button-clean.md:295` (×5) |
| `--color-accent` | `rgba(0,96,226,0.765)` | M | checked box, progress bar, active marks; `accent` ×13, e.g. `progress-tracker-clean.md:280` |
| `--color-accent-soft` | `rgba(0,96,226,0.08)` | M | accent tag background `segmented-control-clean.md:543`, `smart-recommendation-clean.md:299` |
| `--color-accent-wash` | `rgba(0,96,226,0.05)` | M | selected row / own reaction `reaction-bar-clean.md:258` (×3) |
| `--color-focus` | `rgba(0,96,226,0.35)` | M | focus ring in 17 components, e.g. `button-clean.md:306` |
| `--color-shine` | `rgba(255,255,255,0.82)` | M | loading sweep `button-clean.md:304` (×6) |

The primary action is the **dark chip**, not blue. Blue is for state (checked, progress, focus, "new").

## 5. Status colours

| Token | Value | St. | Source |
|---|---|---|---|
| `--color-danger` | `#e5484d` | M | `button-clean.md:301`, `otp-input-clean.md:612`, `change-summary-clean.md:189` |
| `--color-danger-soft` | `rgba(229,72,77,0.08)` | M | destructive fill `button-clean.md:302` (×3) |
| `--color-danger-soft-hover` | `rgba(229,72,77,0.12)` | M | `button-clean.md:303` |
| `--color-success` | `#1a9a52` | M | `ok`/`good`/`success` ×8, e.g. `otp-input-clean.md:613` |
| `--color-success-soft` | `rgba(26,154,82,0.08)` | M | ×6, e.g. `otp-input-clean.md:615` |
| `--color-warning` | `#e8a20c` | M | `decision-inbox-clean.md:260`, `smart-recommendation-clean.md:304` |
| `--color-warning-text` | `#b47a06` | M | `email-draft-clean.md:520` |
| `--color-warning-soft` | `rgba(232,162,12,0.12)` | M | `email-draft-clean.md:521` |
| `--color-badge` | `#e11d48` | M | notification badge `profile-menu-clean.md:326` |
| `--color-alt` | `#5b5bd6` | M | alternative / "lit" signal `smart-recommendation-clean.md:300`, `tool-call-card-clean.md:699` |

Dubbed: **recording and destructive actions use `--color-danger`** (brief §3 Interface). The Clean destructive button is
a soft red fill with red text (`button-clean.md:417-423`).

## 6. Shadows

| Token | Value | St. | Source |
|---|---|---|---|
| `--shadow-card` | `0 0 0 0.5px rgba(0,0,0,0.06), 0 1px 1px -1px rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.05)` | M | ×14: cards, secondary button, e.g. `button-clean.md:298`, `filter-menu-clean.md:439` |
| `--shadow-card-hover` | `0 0 0 0.5px rgba(0,0,0,0.1), 0 1px 1px -1px rgba(0,0,0,0.12), 0 1px 3px 0 rgba(0,0,0,0.07)` | M | ×5, `button-clean.md:299` |
| `--shadow-pop` | `0 0 0 0.5px rgba(0,0,0,0.08), 0 12px 28px -10px rgba(0,0,0,0.16), 0 1px 2px 0 rgba(0,0,0,0.05)` | M | popovers/menus ×4, `profile-menu-clean.md:329` |
| `--shadow-lift` | `0 1px 1px -1px rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.05)` | M | input box lift `otp-input-clean.md:617` |
| `--shadow-hairline-inset` | `inset 0 0 0 0.5px var(--color-line)` | M | inset hairline on chips/fields `tips-panel-clean.md:300`, `email-draft-clean.md:628` |
| `--shadow-focus` | `0 0 0 0.5px var(--color-accent), 0 0 0 2px var(--color-focus)` | M | focused input `otp-input-clean.md:682` |

Focus outline on buttons: `outline: 2px solid var(--color-focus); outline-offset: 1px` (`button-clean.md:431-433`).

## 7. Radii

| Token | Value | St. | Used for | Source (count) |
|---|---|---|---|---|
| `--radius-xs` | `2px` | M | tiny marks | `profile-menu-clean.md:460` |
| `--radius-sm` | `4px` | M | checkbox, kbd | `filter-menu-clean.md:509` (×3) |
| `--radius-chip` | `5px` | M | chips, tags, inner items | ×11, e.g. `change-summary-clean.md:272` |
| `--radius-control` | `6px` | M | buttons, inputs, menu items | ×39 + button `button-clean.md:316` |
| `--radius-segment` | `8px` | M | segmented track, OTP box ≈ size×0.2 | `segmented-control-clean.md:560` (×6) |
| `--radius-card` | `10px` | M | cards, panels, popovers | ×14 in 11 components, e.g. `filter-menu-clean.md:447` |
| `--radius-full` | `50%` / `999px` | M | avatars, dots | `comment-thread-clean.md:515` |

Nested shapes keep concentric radii (e.g. `tool-call-card-clean.md:943` `0 0 7.5px 7.5px` inside 10px with ~2.5px inset).

## 8. Typography

Family (all 17 components): `"Inter", "InterVariable", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
(`button-clean.md:329`). Dubbed self-hosts Inter Variable (`@fontsource-variable/inter`, Latin + Cyrillic).

| Token | Size / line | Weight | St. | Used for | Source (count) |
|---|---|---|---|---|---|
| `--text-xs` | 10px / 16px | 500 | M | overline, tiny tags (`letter-spacing: 0.5px`, uppercase) | `email-draft-clean.md:682-684` |
| `--text-sm2` | 11px / 16px | 500 | M | badges, counters | `profile-menu-clean.md:432` (×5) |
| `--text-sm` | 12px / 16px | 400–500 | M | small button, meta, captions | ×17, `button-clean.md:353` |
| `--text-md` | 13px / 20px | 400 body · 500 labels/titles | M | **the base size**: body, buttons, titles of cards | ×48, `button-clean.md:313` |
| `--text-lg` | 15px / 24px | 500 | M | larger card title, email body | ×4, `email-draft-clean.md:590-592` |
| `--text-input` | 16px | — | M | real `<input>` text on touch (iOS no-zoom) | `otp-input-clean.md:706` |
| `--text-display-*` | — | — | **D** | page titles (h1/h2) — **not in the pack** (largest is 16px in `illustrations/model-wheel`) | see below |

Weights in the pack: **400 and 500 only** in components (600 appears only in `illustrations/cover-flow` and
`blocks/testimonial-wall`). Letter-spacing: 0 for UI text; `-0.01em … -0.025em` on larger illustration/marquee text
(`illustrations/layer-stack`, `blocks/logo-marquee`); `-0.003em` on the loader label (`thinking-loader-clean.md:311`).

**Derived (D) — page title scale for Dubbed**, proposed in the Clean language (weight 500, negative tracking as the pack
does on larger text): `--text-h3` 15/24 (= `text-lg`), `--text-h2` 18/26 −0.01em, `--text-h1` 22/30 −0.015em,
`--text-display` 28/36 −0.02em (landing only). **Approved by the owner 2026-11-02.**

## 9. Spacing and sizes

Spacing values used in the sources (gap / padding, counts across components): **2, 4, 6, 8, 10, 12, 14, 16**, rarely
5, 3, 28, 32. Most frequent: padding 10 (35), 8 (20), 12 (20), 6 (19), 16 (19), 4 (18); gap 8 (18), 6 (15), 10 (7), 12 (6).
Scale: `--space-0_5` 2 · `--space-1` 4 · `--space-1_5` 6 · `--space-2` 8 · `--space-2_5` 10 · `--space-3` 12 ·
`--space-3_5` 14 · `--space-4` 16 · plus **D** page-level steps 20 · 24 · 32 · 48 · 64 for layout between cards
(the pack shows one component per canvas, so page rhythm is derived).

Control heights (M): button sm/md/lg **24 / 28 / 32** (`button-clean.md:310,350,359`), segmented control 28
(`segmented-control-clean.md:547`), reaction/chip rows 28, loader pill 32 / 26 (`thinking-loader-clean.md:293,316`),
OTP box 40 (`otp-input-clean.md:597`), icon 16 (14 in sm). Card max-widths 340–480 (single components) and 760 (tips panel).
Card padding: typically 14–16px; progress tracker `14px 6px 6px` with 10px inner rows (`progress-tracker-clean.md:294`).

## 10. Touch rules (`@media (pointer: coarse)`, M)

| Element | Desktop | Touch | Source |
|---|---|---|---|
| Buttons in cards | 28 | **34–36** | `notification-stack-clean.md:469`, `decision-inbox-clean.md:437`, `tips-panel-clean.md:390` |
| Icon buttons / close | 24–28 | **32–36** | `message-actions-clean.md:891`, `notification-stack-clean.md:468` |
| List options / menu rows | 28–32 | **40–44** | `filter-menu-clean.md:653-654`, `profile-menu-clean.md:506` |
| Segmented option | 28 | **≥ 40** | `segmented-control-clean.md:718-722` (doc: "at least 40px tall") |
| Chips | 24 | **32** (remove ×: 26) | `filter-menu-clean.md:651-652` |
| Checkbox | 16 | **18** (radius 5) | `filter-menu-clean.md:655` |
| Text inputs | 28 | **34–38**, 16px text | `message-actions-clean.md:895`, `otp-input-clean.md:706` |
| Card headers | — | min **48–52** | `smart-recommendation-clean.md:540`, `tool-call-card-clean.md:1099` |

Rule for Dubbed: every interactive element follows the touch column under `(pointer: coarse)`; keyboard hints are hidden
on touch (`filter-menu` doc); hover-only affordances must have a touch equivalent (`message-actions` doc).

## 11. Motion

| Token | Value | St. | Source |
|---|---|---|---|
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | M | the shared easing in 17 sources, e.g. `button-clean.md:307` |
| `--ease-morph` | `cubic-bezier(0.25, 1, 0.5, 1)` | M | width morph / blur-in `button-clean.md` (Morph) |
| `--ease-segment` | `cubic-bezier(0.25, 0.9, 0.3, 1)` | M | segmented thumb `segmented-control-clean.md:545` |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | M | checkbox tick `filter-menu-clean.md:441` |
| `--ease-in-out` | `cubic-bezier(0.85, 0, 0.15, 1)` | M | `reaction-bar-clean.md:261` |
| `--ease-reveal` | `cubic-bezier(0.2, 0.7, 0.2, 1)` | M | `motion/text-reveal/text-reveal.md:191` |
| `--duration-fast` | `140ms` | M | colour/shadow transitions (×33) |
| `--duration-base` | `160ms` | M | press scale, small moves (×62 — most common) |
| `--duration-medium` | `220ms` | M | (×24) |
| `--duration-slow` | `300ms` | M | panels (×18) |
| `--duration-morph` | `480ms` | M | width morph `button-clean.md` |
| `--duration-spin` | `900ms` | M | spinner rotation |
| `--duration-shimmer` | `2.2s` | M | skeleton shimmer `motion/shimmer-loader/shimmer-loader.md:183` |

Patterns (M): press = `scale(0.97)` (`button-clean.md:429`); content change = blur-in (`blur(3px)` + `translateY(25%)`);
loading = light band sweeping across the label; skeleton = `#ececec` base with `rgba(255,255,255,0.9)` glow
(`shimmer-loader.md:179-180`); every component honours `prefers-reduced-motion` (animations off, transitions 1ms).

## 12. Icons

The pack draws icons inline as SVG: 25 on a **16×16** grid, 11 on 24×24, 3 on 12×12. Stroke widths on the 16 grid:
1.1–1.65 (most 1.1–1.4); CSS strokes 1.1–1.8. Icons are `currentColor` in `--color-icon`, darkening to ink on hover.
**Dubbed uses Lucide** (owner stack), drawn at 16px (14px in sm) with `absoluteStrokeWidth` **1.3px** — the median
of the Clean strokes at 16px. Icon-only controls need `aria-label`; the SVG is `aria-hidden`.

## 13. Components (17) — use in Dubbed

Screenshots reviewed by eye (Light): all `01-initial.png`, plus the state PNGs of the ported components.

| Component | Ported | Dubbed use | Notes |
|---|---|---|---|
| button | **yes** | all actions | variants primary / secondary / ghost / destructive; 24/28/32 |
| otp-input | **yes** | email verification code | container-query sizing; 16px input text |
| segmented-control | **yes** | language switch, view switches, state switcher | variants: pill (track), card, underline |
| progress-tracker | **yes** | processing stages | checklist with bar |
| notification-stack | **yes** | toasts / in-app notices | stacked cards |
| filter-menu | **yes** | menus, listbox language, checkbox look | checkbox + chips source |
| profile-menu | **yes** | account menu in the top bar | popover with `shadow-pop` |
| thinking-loader | **yes** | waiting / processing pill | phases label |
| tips-panel | **yes** | onboarding tips, help | grid of tip cards |
| change-summary | no | — (AI-chat) | measured only |
| comment-thread | no | — | measured only (avatar ring, inputs) |
| decision-inbox | no | — | measured only (touch buttons) |
| email-draft | no | — | measured only (type 10/15px, warn colours) |
| message-actions | no | — | measured only (touch rules) |
| reaction-bar | no | — | measured only |
| smart-recommendation | no | — | measured only (pop shadow, option rows) |
| tool-call-card | no | — | measured only (mono, code surface) |

Motion pack: `shimmer-loader` (**ported** — skeletons), `number-ticker` (**ported** — credit balance), `text-reveal`
and `grid-background` (not ported; no current use).
