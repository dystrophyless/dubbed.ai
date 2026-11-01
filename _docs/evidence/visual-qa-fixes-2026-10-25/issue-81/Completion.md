# Issue 81 visual QA fixes

Date: 2026-10-25 (Asia/Qyzylorda). Executor: GPT-6 Luna Max. Baseline HEAD: `9d286621177200fdb5f61ef963d0b6818ae76774`. This executor changed only the three issue-81-owned frontend files and this issue-81 evidence directory. The shared checkout remains dirty from other owners; nothing was staged or committed.

## Changes

- **QA-81-01 — fixed:** both native handles use the full source domain (`0..sourceEndMs`, 1 ms step). The selected interval is drawn on that one timeline with visible start/end values, source endpoints, accessible names/value text, and linked duration text. Text fields, timeline values, selected duration, and saved millisecond values stay synchronized. The 1,000 ms and 120,000 ms interval boundaries remain enforced.
- **QA-81-02 — fixed:** desktop source, selection, and quote compose in three bounded columns at 1101 px and above; 768–1100 px uses two columns; phones keep one column. The source summary and success notice are compact on desktop. Fresh 1440×900 and 1440×700 screenshots show the preview, interval fields, four quote facts, and paid action together.
- **QA-81-03 — fixed:** the scoped processing action uses the existing large Button role. Browser measurement is 44 px on desktop and 48 px on phone; its exact-credit label and dark primary style remain visible.
- **QA-81-04 — fixed:** quote facts use a deliberate 2×2 desktop/tablet grid with row and column separators; 390 px uses a single-column stack.
- **QA-81-05 — fixed:** actual video and empty-preview stages use opaque black backing; the unavailable-state text remains white and visible outside the media stage.
- **FIX-R81-01 — fixed:** the “Section saved. Request a fresh quote before processing.” notice now clears only after the quote matches the active project/source/selection revisions and interval. It remains visible while a fresh quote is unavailable. A focused regression covers failure, current quote, and no automatic processing.
- **QA-65-04 consumer evidence:** after an owner navigates to Credits, starts the local mock checkout, and simulates verified payment, the native app returns to New dub. The written return intent matched account, project, source/revision, and selection; the NewDub consumer removed that exact marker and created one fresh quote. It created no preparation/start operation or reservation. The enabled Process action remained a deliberate next step.

The return consumer reads the existing `readCreditsReturnIntent`, uses the restored account-owned project/source and its latest loaded project revision, validates the selection against the source, waits for playable media, requests one quote, and removes only the exact consumed intent. A stale intent is cleared without quoting. No marker-only project load, automatic process action, reservation, purchase, or new return route was added.

## Verification

| Check | Result | Environment/evidence |
|---|---|---|
| `npm.cmd test -- src/features/new-dub/NewDubScreen.test.tsx` | PASS — 1 file, 10 tests | Windows, Node v22.23.1; includes notice persistence through quote failure and clearing only for a matching current quote, with no start operation. |
| `node --check _docs/evidence/visual-qa-fixes-2026-10-25/issue-81/browser-proof.cjs` | PASS | Browser proof syntax check. |
| `node _docs/evidence/visual-qa-fixes-2026-10-25/issue-81/browser-proof.cjs` — complete run | PASS at `2026-10-25T13:13:08.031Z` | Chromium 156.0.8078.4, local mock Vite `127.0.0.1:4581`, DPR 1. All 14 screenshots completed; every current-quote and native Credits-return shot waited for decoded 640×360 video and a presented `requestVideoFrameCallback` frame. The full-run measurements are retained in `browser-metrics.json`. |
| Later optional capture retry | PARTIAL at `2026-10-25T13:16:02.655Z` | Nine EN/native image paths were refreshed after their frame checks. The retry stopped before RU/error-state captures when the seeded RU harness quote button remained disabled; two 500 resource errors were logged while issue #72 was actively changing mocks. The prior full-run RU/error screenshots remain. `browser-metrics.partial.json` and `browser-proof.log` preserve this retry; `screenshot-manifest.json` records per-file UTC timestamps, hashes, and which run produced each image. Root directed no further captures. |
| Native timeline interaction | PASS | Chromium keyboard moved start/end by 1 ms; pointer drag moved the end; start/end fields, selected band, and stored selection stayed synchronized. Source duration was 8,625 ms; a fixed 1,000 ms start retained `11.5942%` source position while the opposite edge moved. |
| Responsive screenshots | PASS | EN actual local-app screens at 1440×900, 1440×700, 768×844, 767×844, and 390×844; RU seeded workspace-harness screens at 1440×900, 1440×700, and 390×844. All full-run captures reported no horizontal overflow. The 14 complete-run images were opened and visually inspected. Root also reopened the EN short desktop and confirmed the stale instruction was gone with the decoded scene visible. The later nine EN/native replacements were taken after the same positive frame checks; RU and error images remain from the complete run. |
| Native Credits return | PASS | Before/after mock IndexedDB evidence in `browser-metrics.json`: project quote rows and `preparation.quote` operations each increased by exactly one; `preparation.start`, preparations, and reservations stayed unchanged. One explicit synthetic purchase was recorded; the intent marker was written once, matched the saved project, then was removed. |
| Failed replacement | PASS | Rejected short replacement preserved the prior project title, source ID, selection values, quote record, and post-purchase capacity in the actual local mock app. |
| `git diff --check -- <owned files>` | PASS | No whitespace errors; Git reported only its existing LF-to-CRLF normalization warnings. |

Screenshots and details are indexed in [screenshot-manifest.json](screenshot-manifest.json), which records byte counts, SHA-256, per-file UTC timestamps, capture-run attribution, and frame metadata where a video was present. The executable local proof is [browser-proof.cjs](browser-proof.cjs); the combined full-run/partial-refresh ledger is [browser-metrics.json](browser-metrics.json), the unmodified partial-run measurements are [browser-metrics.partial.json](browser-metrics.partial.json), and [browser-proof.log](browser-proof.log) preserves the later retry's two resource errors and disabled RU quote control. Source/evidence hashes are listed in `summary.json`.

## Evidence limits

- Credits checkout and the account/project store are local mock services; the verified result uses synthetic test currency and collects no payment. It is not production billing evidence.
- EN responsive and purchase-return captures use the ordinary local app. RU responsive captures, preview error, and browser quote-error screenshots use the existing synthetic workspace-state harness. Matching-return quote failure is also covered directly by the owned component test with a failing service stub.
- No full frontend suite/build, production service, payment provider, physical mobile device, screen reader, or cross-browser run was performed. The processing CTA was verified as available but was not activated.
- The later partial retry is not a product-failure finding: it stopped at the seeded RU harness while issue #72 mock writers were active. It did not replace RU or error-state images or invalidate the completed 14-image run; the manifest attributes each current image to the run that produced it.

## Scope boundary and delivery state

Product edits stayed within `NewDubScreen.tsx`, `NewDubScreen.css`, and `NewDubScreen.test.tsx`. The return flow consumes the existing #65 intent contract. No Credits screen, return-intent producer, shared App/notice, service facade/store, authentication, or #72 media asset/service files were edited. All quote, checkout, source, and purchase facts in this browser run are backend-free local-mock/synthetic evidence. No full suite, global typecheck, build, commit, push, issue update, or closure was performed; Root owns integrated verification and acceptance.
