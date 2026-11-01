# Issue #75 and Projects QA68-02 consumer completion

Date: 2026-10-25, Asia/Qyzylorda  
Executor: GPT-6 Luna Max (`gpt-6-luna`, `max`)  
Base HEAD: `9d286621177200fdb5f61ef963d0b6818ae76774` (`9d28662`)

## Scope and worktree boundary

Changed only `frontend/src/features/projects/ProjectsScreen.tsx`, its local CSS and test file, plus this issue's evidence directory. The shared worktree already contained unrelated edits from other owners; they were preserved. No shared styles, services, other feature screens, frozen review files, GitHub issues, commits or pushes were changed by this executor.

## QA-75 finding dispositions

| Finding | Status and evidence |
| --- | --- |
| QA-75-01 — long titles overflow and obscure lifecycle state | Fixed. The row content and title can shrink within the available width; the visible heading ellipsizes while its full text remains in the DOM, `title`, and accessible name. Native mock projects with exactly 100 visible Latin and Cyrillic characters were captured in EN/RU at 1440×900, 1440×700, 390×844, 767×844, and 768×844. All 46 capture metrics have no horizontal overflow; all title labels match their full text and every state badge remains within the viewport. |
| QA-75-02 — missing scene thumbnail or unavailable fallback | Fixed with the truthful unavailable fallback because the existing `OwnedProject` descriptor has no thumbnail or preview field. The visible EN/RU fallback is exposed as a named image region. No fake photo, thumbnail service, descriptor extension, or backend was added. The native mock screenshots show the fallback in each project row. |
| QA-75-03 — active-processing deletion warning is incomplete | Fixed for `preparing` projects. The localized warning explains that deletion does not cancel queued/running processing, work may continue after deletion, and a completed run may still be charged. The general description retains slot release only after completion, no refund for completed processing, irreversibility, and no physical-erasure promise. The warning remains visible in the unknown-result dialog and the slot is not reported free. The active state and unknown result are synthetic harness responses, not a real running job. |
| QA-75-04 — phone rename target is undersized | Fixed. The rename icon target measures 48×48px at 390px and 767px; its glyph treatment is unchanged. |
| QA-75-05 — frequent desktop Continue action is too small | Fixed to the authorized task size. Continue measures 40px high at 768px and desktop widths, and 48px high at 390px and 767px. |
| QA-75-06 — full capacity does not direct deliberate deletion | Fixed. A nonempty list at capacity explains that the owner can choose a project to delete to free a slot. No automatic deletion is performed. Focused tests cover 2/2 and 10/10; the six-state visual fixture shows 6/6. |
| QA-75-07 — empty state contains extra instructions | Fixed. The empty-list region now contains only its localized title and New dub action. EN/RU screenshots cover all five requested viewport sizes. The ordinary page heading and capacity count remain outside that empty-list region. |

## QA68-02 Projects consumer integration

Projects stores the full typed service error, including its retry directive, and passes it to `serviceRecoveryAction(problem, context)`. Only the code is reduced for `ServiceNotice` copy. List reads, Continue's project read, and deletion-impact reads use `context="read"`; write failures keep write context. The screen presents direct sign-in for unauthenticated errors, safe observation retry when the helper permits it, same-operation retry only when the directive permits it, and reconciliation before repeating an unknown mutation.

Focused regressions prove: list read-context retry and localized copy; Continue read recovery rereads before `recordOpened`; adapter-unavailable and `retry:none` do not surface a retry or allow another Continue mutation; unauthenticated list errors navigate to the sign-in route; rename same-operation retry reuses its ID; unknown Continue rechecks the original operation and only retries after `not-started` with the same ID; unknown delete checks status without issuing another delete. The unknown Continue path retains its original `ContinueAttempt` and blocks the primary Continue control until resolved.

This receipt verifies the Projects consumer only. It does not claim that every #68 consumer, a real expired session, or global application acceptance has passed.

## Verification

| Command | Result |
| --- | --- |
| `node node_modules/vitest/vitest.mjs run src/features/projects/ProjectsScreen.test.tsx` (`frontend`) | PASS — 1 file, 21 tests. |
| `npm.cmd run lint -- src/features/projects/ProjectsScreen.tsx src/features/projects/ProjectsScreen.css src/features/projects/ProjectsScreen.test.tsx` (`frontend`) | Exit 0. One existing `react(set-state-in-effect)` warning remains on the list-loading effect; this effect was not changed here. |
| `git diff --check -- frontend/src/features/projects/ProjectsScreen.tsx frontend/src/features/projects/ProjectsScreen.css frontend/src/features/projects/ProjectsScreen.test.tsx` | PASS. |
| `node --check _docs/evidence/visual-qa-fixes-2026-10-25/issue-75/capture.cjs` | PASS. |
| `node _docs/evidence/visual-qa-fixes-2026-10-25/issue-75/capture.cjs empty` | PASS — 10 empty-state captures. |
| `node _docs/evidence/visual-qa-fixes-2026-10-25/issue-75/capture.cjs dialogs` | PASS — refreshed 10 active-delete dialogs and 6 unknown-delete dialogs as viewport captures. |

The first broad capture reached all title and mixed-state screenshots, then stopped because the capture helper waited for a project row in the intentionally empty fixture. The helper was corrected to wait for the empty region, and the empty matrix was captured. Dialogs were then refreshed as viewport-sized screenshots so fixed overlays do not leave below-viewport full-page content undimmed. `rendered-metrics.json` contains 46 unique final screenshots; every named PNG exists. All 46 PNGs were opened and visually inspected. Mabry Pro loaded in all captures; there are no page errors, horizontal overflow, inaccessible title labels, or out-of-bounds badges. The metrics record 40×40 desktop rename/menu targets, 40px desktop Continue height, 48×48 phone rename/menu targets, and 48px phone Continue height.

One application-wide TypeScript check was attempted: `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false`. It reported TS2345 at `src/app/FeatureRoute.tsx:114` because the active shared `ServiceRecoveryProblem` type did not yet accept the `unknown-operation` / `unexpected` metadata union consumed there. This file is outside this assignment and the #68 owner is correcting that shared typing. No second global typecheck or full test suite was run; root should rerun integrated typecheck after the shared fix.

## Evidence files and limits

- `capture.cjs` — reproducible Playwright capture using Vite on `127.0.0.1:4575`.
- `rendered-metrics.json` — viewport, overflow, title, badge, control-size, dialog, font, action, and runtime-error evidence for 46 captures.
- `screenshots/` — native 100-character titles, six-state mixed list, active and unknown deletion dialogs, and empty states in EN/RU across 1440×900, 1440×700, 390×844, 767×844, and 768×844 where applicable.
- `summary.json` — machine-readable issue, finding, test, and limitation summary.

The native title screenshots use the existing mock facade and repository MP4 fixture. Mixed lifecycle rows, active processing state, and unknown delete outcomes use the existing visual harness and are explicitly synthetic. No real adapter, billing provider, physical deletion, active job, native 10-slot account, full suite, 200% zoom, assistive technology, or production behavior was exercised. No commit, push, remote verification, issue update, or closure was performed.
