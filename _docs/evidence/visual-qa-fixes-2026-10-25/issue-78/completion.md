# Issue 78 completion

**Model:** GPT-6 Luna Max (`gpt-6-luna`, max effort)  
**Date:** 2026-10-25  
**Baseline:** `9d286621177200fdb5f61ef963d0b6818ae76774`  
**Worktree:** Shared dirty worktree; this delivery changed only the owned shared controls, header, focused test fixture, and this issue’s evidence. No commit, push, or GitHub mutation was made.

## Result

Updated the shared button size roles, header navigation and locale affordance, phone interaction targets, screen-reader-only utility, and landing support link. The native locale select remains keyboard- and screen-reader-operable and now has a visible Lucide disclosure icon. The existing segmented-control tray and selected state are preserved; its medium ergonomic sizing is available through `.ui-segmented-control--medium` on the wrapper and `.ui-segmented-control__option` on each option.

Button API remains backward-compatible: omitted `size` still means `medium`.

| Role | Desktop | Phone |
| --- | --- | --- |
| `medium` (default task action) | 40px high, 14/20 text | 48px high, 16/24 text |
| `large` (prominent action) | 44px high, 16/24 text | 48px high, 16/24 text |
| `small` | 32px high, 14/20 text | 48px high, 16/24 text |
| `navigation` | 36px high, 14/20 text | 48px high, 16/24 text |
| `icon` | 40×40px target, 16px glyph | 48×48px target, 16px glyph |
| Segmented option (`medium`) | 40px high, 14/20 text | 48px high, 16/24 text |

The landing page primary CTA renders at 44px on desktop and 48px on phone. The phone brand, locale/sign-in controls, support link, menu trigger, sheet close, and menu rows all meet the 48px minimum. The Russian signed-in header remains a single regular-navigation row at 768px: 65px header height, 768px inner client and scroll widths, 36px navigation links, and a 95×28px credit balance. At 767px the phone menu treatment is active.

## QA-78 dispositions

| Finding | Disposition | Evidence |
| --- | --- | --- |
| QA-78-01 | Fixed | Fresh EN/RU phone screenshots show a 48px brand/header control row, 48px support link, 48px menu trigger and close button, and 48px sheet navigation/locale rows. Escape returns focus to the menu trigger in the tested EN/RU breakpoint cases. See `metrics.json`, `screenshot-manifest.json`, and `evidence/landing-en-phone.png`, `evidence/landing-ru-phone.png`, `evidence/shell-en-390-menu.png`, `evidence/shell-ru-390-menu.png`. |
| QA-78-02 | Fixed | Shared button roles and the medium segmented-control role match the authorized desktop/phone sizes. The focused shared-control Playwright spec passed 4/4. See `playwright-results/` and the E2E screenshots under `evidence/`. |
| QA-78-03 | Duplicate; deferred to issue 82 | OTP input/cell geometry remains owned by issue 82. No OTP/auth CSS was changed and this finding is not claimed resolved here. |
| QA-78-04 | Fixed | The native EN/RU locale selector has a visible 16px Lucide chevron (`strokeWidth={1.1}`) and an accessible label. It is 36px high on desktop and 48px in the phone sheet. See desktop and phone shell screenshots and `metrics.json`. |

## Verification

| Check | Result |
| --- | --- |
| `node capture.cjs` from this issue folder, against the mock Vite app at `127.0.0.1:4578` | PASS — 22 EN/RU screenshots and 19 geometry/behavior checks; 0 page errors. Chromium 156.0.8078.4. |
| `npm.cmd run test:e2e -- --config=../_docs/evidence/visual-qa-fixes-2026-10-25/issue-78/playwright.config.cjs` from `frontend/` | PASS — 4 shared-control tests. |
| `node --check` on `capture.cjs` and `playwright.config.cjs` | PASS. |
| `git diff --check` on the six owned source/test files | PASS; Git printed only existing line-ending conversion warnings. |
| `npm.cmd run typecheck` | Not repeated by task 78. Root reported the latest shared-tree typecheck was green after the issue 65 cleanup. |

The capture run used the local mock app and browser-local fixture account; no email was sent, and fake media flags/muted audio were used. The browser screenshots were visually inspected in EN/RU desktop, short desktop, phone, and 768px shell layouts. The RU 768px header fits in one row without horizontal overflow.

## Limits

The run did not exercise 200% native browser zoom, assistive technology, a live account preference, production services, real support email delivery, or physical microphone/speaker devices. QA-78-03 remains with issue 82. Task 78 did not independently repeat the shared-tree typecheck.

## Evidence files

- `capture.cjs` — reproducible local browser capture and assertions.
- `playwright.config.cjs` — focused test config pinned to task port 4578.
- `metrics.json` and `screenshot-manifest.json` — measured geometry, check results, and capture paths.
- `evidence/` — 22 fresh screenshots; `playwright-results/` — focused E2E run artifacts.
- `summary.json` — machine-readable task summary.
