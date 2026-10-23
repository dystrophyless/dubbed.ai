# Frontend dependency cohort manifest draft

Candidate for root review. No files have been staged, committed, pushed, or published from this manifest. Prepared 2026-10-24 against `main` at `35d122949ad0e07a7e365bcbd4c1ec69202796c3` in a shared dirty worktree. Root has recorded delegated acceptance for #67/#68/#70/#73; delivery and final path review remain pending.

## Cohort and dependency rule

The foundation cohort is #67 (runtime/test harness), #68 (shared Services facade), #70 (mock credits/ledger), and #73 (persistent mock workspace). The source ownership slices below remain separate even though they need one integration delivery: `src/main.tsx` imports `App`; `App` statically imports the current feature screens; `services/index.ts` composes the service modules. `tsconfig.app.json` includes all of `src` plus `tests/**/*.ts` and `tests/**/*.tsx`, and Vitest runs tests in `src` and `tests`. Therefore the current build/unit-check closure requires the current `frontend/src/**` and `frontend/tests/**` source trees, even where a screen's behavior belongs to another issue. Including a dependency path here does not accept that issue's product behavior.

## Issue-owned paths

### #67 — runtime and test harness

- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/.env.mock`
- `frontend/.gitignore`
- `frontend/.oxlintrc.json`
- `frontend/README.md`
- `frontend/index.html`
- `frontend/vite.config.ts`
- `frontend/tsconfig.json`
- `frontend/tsconfig.app.json`
- `frontend/tsconfig.node.json`
- `frontend/src/vite-env.d.ts`
- `frontend/playwright.config.ts`
- `frontend/playwright.real.config.ts`
- `frontend/src/main.tsx`
- `frontend/src/app/RuntimeFailure.tsx`
- `frontend/src/services/bootstrap.ts`
- `frontend/src/test/setup.ts`
- `frontend/e2e/runtime-smoke.spec.ts`
- `frontend/e2e/helpers/diagnostics.ts`
- `frontend/e2e-real/adapter-unavailable.spec.ts`

`frontend/src/i18n/messages.ts` is a shared integration path: runtime-failure copy lives beside broad product copy. Keep it in the full source closure rather than treating unrelated translations as standalone #67 ownership.

### #68 — facade contract and enforcement

- `frontend/src/services/contracts.ts`
- `frontend/src/services/index.ts`
- `frontend/tests/services/adapter-contract.ts`
- `frontend/tests/services/adapter-contract.test.ts`
- `frontend/tests/services/title-and-boundary.test.ts`
- `frontend/tests/services/test-support.ts`

### #70 — mock ledger, credits, and reservations

- `frontend/src/services/mock-ledger.ts`
- `frontend/src/services/mock-credits.ts`
- `frontend/src/services/mock-identity.ts` (eligible welcome grant and verified-purchase entitlement facts)
- `frontend/src/services/mock-preparation.ts` (reservation/release/settlement integration)
- `frontend/src/services/mock-store.ts` (credit and reservation records)
- `frontend/tests/services/credits-activity.test.ts`
- `frontend/tests/services/credit-reservation-concurrency.test.ts`
- `frontend/tests/services/checkout-simulation.test.ts`
- `frontend/tests/services/registration-client-binding.test.ts`
- `frontend/tests/services/preparation-recovery.test.ts` (shared #70/#74 failure-release boundary)

`CreditsScreen.tsx` and its CSS are required by the current statically imported `App`, but UI presentation remains owned by its screen issue; their inclusion is a build dependency only.

### #73 — persistent mock workspace

- `frontend/src/services/indexeddb.ts`
- `frontend/src/services/mock-workspace.ts`
- `frontend/src/services/mock-store.ts`
- `frontend/src/services/mock-operations.ts`
- `frontend/src/services/mutations.ts`
- `frontend/tests/services/core-services.test.ts`
- `frontend/tests/services/default-client-persistence.test.ts`
- `frontend/tests/services/workspace-write-failures.test.ts`
- `frontend/tests/services/recording-results.test.ts` (durable source/take/result references)
- `frontend/tests/services/active-project-deletion.test.ts` (stale event after deletion)
- `frontend/tests/services/account-deletion-late-work.test.ts` (owner approved the test; root verified it **1/1**, the service suite **78/78**, and the full unit suite **210/210**)

`mock-store.ts` is shared with #70. The factory in #68 composes the workspace and every service module, so retain ownership boundaries while delivering these imports together.
The focused verification receipt is `_docs/evidence/frontend-implementation-2026-10-23/account-deletion-late-work-root-verification.md` (root-reported SHA-256 `4023237EA6D6C77266855C69A44D81C65E1FD38F9FC333F0BDD1B38A8E73A6AA`). This owner authorization supersedes the earlier report-only hold.

## Required current app, test, and asset closure

- `frontend/src/**` — all current production source, component/feature CSS, app shell, screens, current in-source tests, and assets included by the existing app TypeScript project. `App` and the facade factory use this shared closure.
- `frontend/tests/**` — all current unit/service tests included by the app TypeScript project and Vitest, including the now-approved late-work test.
- `frontend/public/favicon.svg`
- `frontend/public/icons.svg`
- `frontend/public/fonts/MabryPro-Regular.woff2`
- `frontend/public/fonts/MabryPro-Medium.woff2`
- `frontend/public/media/fixture-manifest.json`
- `frontend/public/media/no-audio-track.mp4`
- `frontend/public/media/recording-take-a.wav`
- `frontend/public/media/recording-take-b.wav`
- `frontend/public/media/result-generation-001-master.wav`
- `frontend/public/media/result-generation-001.mp4`
- `frontend/public/media/result-generation-002-master.wav`
- `frontend/public/media/result-generation-002.mp4`
- `frontend/public/media/short-source.mp4`
- `frontend/public/media/source-dialogue-master.wav`
- `frontend/public/media/source-dialogue.mp4`
- `frontend/public/media/usable-partial.mp4`
- `frontend/public/media/valid-silence.mp4`
- `frontend/public/media/valid-silence.wav`

These media files are local test fixtures, not real user media.

The `frontend/src/i18n/messages.ts` file above is shared. Keep all product source/tests/assets with their issue owners; this manifest records import and validation dependencies and does not assert acceptance of auth, credits presentation, Processing, Recording, Result, Projects, New Dub, or Account screens.

## Browser cases included in the current integration cohort

Root's current combined validation passed the browser cases listed in `root-delivery-browser.log`. The `test:full` script composes the current unit, media, default Playwright, and real-unavailable commands. Include the exact current `frontend/e2e/**`, `frontend/e2e-real/**`, and Playwright config inventory, with only the unfinished workspace-state and Result-delivery-state harness sets excluded below. This retains the stable specs and their shared helpers/harnesses used by Root92; do not stage only the runtime/auth/Processing subset.

The exact frontend path membership and per-file SHA-256 values are recorded in `frontend-cohort-file-hashes.json`. The candidate includes the current frontend tracked and untracked files, including all current screen suites and their helpers/harnesses, with only generated outputs and the unfinished workspace-state harness excluded. The root browser log lists the 13 suites and 92 cases that passed; it does not list `frontend/e2e/shell-evidence.spec.ts`, which is present in this current inventory and is therefore included without claiming that the root92 run exercised it. Auth's final source/test capture-readiness edit was made after root92: the focused current-proof case passed 1/1 and its screenshot was recaptured, while the other 92-case functional result remains unchanged. The current auth spec SHA is recorded in the JSON manifest. Fixtures use permitted local/synthetic data; browser media remains muted where applicable. Processing screenshots and metrics remain in `_docs/evidence/frontend-implementation-2026-10-23/processing-ui/` as separate #74 evidence.

## Explicit exclusions and open boundaries

- Exclude `frontend/node_modules/**`, `frontend/dist/**`, Vite caches, Playwright reports/results, and generated test results.
- Exclude `frontend/e2e/workspace-state-visual.spec.ts`, `frontend/e2e/harness/workspace-state-visual.html`, `frontend/e2e/harness/workspace-state-visual.tsx`, and `frontend/playwright.workspace-visual.config.ts` (unfinished workspace-state harness).
- Exclude `frontend/e2e/result-delivery-state.spec.ts`, `frontend/e2e/harness/result-delivery-state.html`, `frontend/e2e/harness/result-delivery-state.tsx`, and `frontend/playwright.result-state.config.ts` (unfinished Result-delivery-state harness).
- Exclude unrelated initial dirty `_docs/` content. This draft and the `processing-ui` receipt are evidence references, not permission to include broad documentation changes in a source delivery.
- Do not include generated `node_modules`, `dist`, Vite caches, Playwright reports/results, or test-result output.

## Issue #67 and #73 evidence paths

- `_docs/evidence/frontend-implementation-2026-10-23/runtime-clean-install-2026-10-24/receipt.md`
- `_docs/evidence/frontend-implementation-2026-10-23/runtime-clean-install-2026-10-24/manifest.json`
- Every current log under `_docs/evidence/frontend-implementation-2026-10-23/runtime-clean-install-2026-10-24/logs/`
- `_docs/evidence/frontend-implementation-2026-10-23/account-deletion-late-work-root-verification.md`
- `_docs/evidence/frontend-implementation-2026-10-23/foundation-cohort-acceptance.md`
- `_docs/evidence/frontend-implementation-2026-10-23/acceptance-evidence-map.md` (updated to map the accepted cohort and its narrow evidence)
- `_docs/evidence/frontend-implementation-2026-10-23/root-delivery-freeze-before.json` and `root-delivery-freeze-after.json`
- `_docs/evidence/frontend-implementation-2026-10-23/root-delivery-unit.log`, `root-delivery-typecheck.log`, and `root-delivery-browser.log`
- `_docs/evidence/frontend-implementation-2026-10-23/root-frozen-cohort-unit.log`, `root-frozen-cohort-build.log`, and `root-frozen-cohort-lint.log`
- `_docs/evidence/frontend-implementation-2026-10-23/root-cohort-real-unavailable.log`
- `_docs/evidence/frontend-implementation-2026-10-23/root-privacy-and-history-services.log`, `root-privacy-cohort-unit.log`, `root-privacy-cohort-typecheck.log`, and `root-privacy-cohort-media.log`
- `_docs/evidence/frontend-implementation-2026-10-23/controlled-mount-regression-after-origin-fix.json`

The clean-install folder paths and exact per-file hashes are enumerated in `frontend-cohort-file-hashes.json`.

## Delivery notes

The #67/#68 audit records an earlier snapshot. The clean-install receipt and supporting logs link the recorded #67 startup/build/browser checks. On 2026-10-24, root reported the integrated current run at **92/92 browser cases**, **44/44 files and 210/210 unit tests**, typecheck PASS, mock build PASS (893.54 kB advisory), real-unavailable **1/1**, and media fixtures **3/3**, plus the late-work case **1/1** and service suite **78/78**. I did not rerun those root-owned checks. The audit's earlier browser-failure observation is superseded by the newer root receipt. Root's delegated acceptance is recorded in `foundation-cohort-acceptance.md`; delivery remains pending and issue closure is not authorized until successful commit/push/remote verification. `frontend-cohort-file-hashes.json` is the exact current candidate path/hash inventory. The focused auth recapture passed 1/1 after root92 and is explicitly separated from that aggregate run. The base Playwright config now pins one worker to match the verified arrangement; after that bounded #67 config/doc edit, typecheck and default-config `--list` passed, but the full browser suite was not rerun. The `--list` output included the unfinished workspace-state suite, which is excluded from this candidate. The manifest does not claim Root92 covered the current `shell-evidence.spec.ts`. Read back the issue state before any delivery mutation.
