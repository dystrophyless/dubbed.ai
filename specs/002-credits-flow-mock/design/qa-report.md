# Feature 002 design QA — FAIL → PASS after recheck (2026-11-16)

Date: 2026-11-16 · Agent: design-qa · Scope: `/credits` (all states), `/checkout/:purchaseId` (all states), New dub
`no-slot-paid`, My projects `slots-full-paid`. Screenshots: `specs/002-credits-flow-mock/design/qa/` (128 files; real
routes carry a `real-` prefix).

**Visual implementation matches the approved compositions in the inspected comparisons. The failure is semantic
accessibility against the design-system checklist, not a visual redesign request.** WCAG-tagged automated tests pass,
including contrast. A broader axe scan exposes two moderate best-practice issues those tests do not include
(`frontend/e2e/support/a11y.ts:10–15` filters axe to WCAG A/AA tags).

## Top fixes

1. **Skipped heading level on Credits.** The page goes from `h1` to `h3` for "Buy credits" (and History); the error
   view goes from `h1` to the EmptyState `h3`. Violates `design-system/quality.md:9` ("headings in order").
   Fix: let `frontend/src/components/ui/kit/Card.tsx:22–25` take a semantic heading level (styling unchanged); use
   level 2 at `frontend/src/features/credits/views/CreditsView.tsx:149,187`. Same for
   `frontend/src/components/ui/kit/Feedback.tsx:145` and the Credits error at `CreditsView.tsx:103`. Do not edit
   affect ports. Inherited kit/template behaviour, observable on the real route.
2. **Checkout brand/language row outside a landmark.** `frontend/src/features/checkout/views/CheckoutView.tsx:41–44`:
   replace the top-level generic div with `header` (same class). Unfiltered axe reports `region` in every checkout
   state.

## Checks

| Checklist item | Result | Evidence |
|---|---|---|
| Credits archetype, narrow column, three panels | PASS | `design/qa/credits-default.desktop.en.png` |
| Checkout Auth composition, own shell, centred panel | PASS | `design/qa/real-checkout-pay-error.desktop.en.png` vs `design/screens/checkout-pay-error.desktop.en.png` |
| Kit composition, affect ports untouched | PASS | `git diff --stat -- src/components/ui/affect` empty |
| Tokens / no raw values | PASS | `npm run lint:css` exit 0; no raw colours or inline styles in new views |
| Build / lint | PASS | `npm run build`, `npm run lint` exit 0 (existing chunk-size warning) |
| EN/RU copy, selection, USD | PASS | `design/qa/credits-success-return.mobile.ru.png`, `design/qa/real-checkout-pay-error.mobile.ru.png`; 33 feature e2e pass |
| Buy/Pay failure alerts (round 3) | PASS | `design/qa/real-buy-error.mobile.ru.png`; robustness tests C/D/E pass |
| Paid-full behaviour (round 4) | PASS | `design/qa/real-newdub-paid-full.mobile.ru.png`, `design/qa/real-projects-paid-full.mobile.ru.png`; 4 paid-full e2e pass |
| One primary | PASS | `CreditsView.tsx:94,174,231` |
| Mobile layout / key actions | PASS | `e2e/mobile-layout.spec.ts`: 14 passed; 44-state mobile scan, no horizontal overflow |
| Text contrast, WCAG a11y | PASS | feature e2e 33 passed; 44 prototype scans, no `color-contrast` |
| Heading sequence | **FAIL (moderate)** | unfiltered axe `heading-order` on `/credits` and all 26 Credits state scans |
| Checkout landmarks | **NOTE (moderate)** | unfiltered axe `region` on all 18 checkout state scans |
| Unit regression | PASS | 14 files, 165 tests |

## Differences from approved screenshots (no fix needed)

1. Real My projects uses the demo preset's projects instead of the curated reference list — fixture content.
2. History dates/times and day grouping follow live timestamps and the approved browser-hour-cycle rule.
3. Real-route captures have no prototype state switcher.
4. Payment error panel aligns with the approved image; mobile RU fits 844 px.

## Not covered

Every transient/error/empty state through the real service route (covered via the shared-view prototypes + 33 e2e);
a 1024 px pass; a full keyboard-only sweep; the unrelated e2e suite.

## Recheck 2026-11-16 — PASS

Both fixes applied (CardHeader / EmptyState `level` prop, default 3; Credits uses level 2; checkout top row is a
`header`; guard spec `e2e/flow-credits-semantics.spec.ts`). Recheck:

- `heading-order` + `region`, unfiltered: 56 axe scans (13 Credits + 9 checkout prototype states at desktop EN / mobile
  RU, real Credits default/error, real checkout default/completed/cancelled/not-found) — 0 violations.
- Checkout pixel parity vs the first QA captures: 0 differing pixels (`qa/recheck-real-checkout-default.*`).
- Credits pixel parity: differences only in the live history timestamp and the NumberTicker area; 0 elsewhere
  (`qa/recheck-real-default.*`).
- Other consumers keep `h3` and look unchanged: My projects, New dub, the Credits reference template
  (`qa/recheck-projects.*`, `qa/recheck-new.*`, `qa/recheck-template-credits.*`).
