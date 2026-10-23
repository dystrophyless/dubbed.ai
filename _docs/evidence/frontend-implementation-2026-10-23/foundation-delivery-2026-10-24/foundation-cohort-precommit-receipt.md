# Foundation cohort delivery receipt (precommit)

Captured: 2026-10-24 (Asia/Qyzylorda)
Repository: `https://github.com/dystrophyless/dubbed.ai.git`
Branch/base: `main` at `35d122949ad0e07a7e365bcbd4c1ec69202796c3`
Working tree: existing unrelated documentation and unfinished frontend work remain dirty and outside this delivery.

## Scope and acceptance

This receipt covers only issues #67, #68, #70, and #73. The Orchestrator recorded delegated acceptance on 2026-10-24 in [foundation-cohort-acceptance.md](../foundation-cohort-acceptance.md), SHA-256 `B65985BC005E4229055B6A2705574D523324763EAF82A9862126DD417EE33E9A`. The decision covers the bounded mock-runtime and services increments against the verified worktree and the exact dependency cohort. It does not accept the remaining screen issues or the integration gate.

The approved inventory is [frontend-cohort-file-hashes.json](../frontend-cohort-file-hashes.json), SHA-256 `AF4A8F91B8356D7A87DC75CDE7B073FBF67F795888B0A61BDFEAD348AFCEB9EE`: 189 frontend files and 32 narrow evidence files. All 221 entries are unique, present, and match their recorded byte length and SHA-256. The manifest itself is also in scope. The eight exact unfinished harness exclusions in the manifest are: `frontend/e2e/workspace-state-visual.spec.ts`, `frontend/e2e/harness/workspace-state-visual.html`, `frontend/e2e/harness/workspace-state-visual.tsx`, `frontend/playwright.workspace-visual.config.ts`, `frontend/e2e/result-delivery-state.spec.ts`, `frontend/e2e/harness/result-delivery-state.html`, `frontend/e2e/harness/result-delivery-state.tsx`, and `frontend/playwright.result-state.config.ts`. The candidate also contains `frontend/e2e/shell-evidence.spec.ts`; it is not listed in the root 92-case browser run and that run does not claim to cover it.

The pre-update GitHub readback is [issue-readback-preupdate.json](issue-readback-preupdate.json): all four target issues were open and had zero comments. The workflow status is being advanced to `verified` with the accepted AC and evidence mapping; issues remain open until remote delivery is confirmed.

## Verification evidence

The Orchestrator verification record is the linked acceptance document. Its supporting local evidence includes the clean-install receipt and logs, unit and browser logs, typecheck/build/lint logs, real-unavailable/media checks, services checks, and the AccountLinking capture-readiness receipt.

- `npm.cmd test`: 44 files / 210 tests passed (44.95 seconds).
- `npm.cmd run typecheck`: passed.
- `npm.cmd run build`: passed at the frozen production-source hashes; Vite reported an advisory 893.54 kB JavaScript chunk.
- `npm.cmd run lint`: exit 0 with warnings. jsdom pause notices remain; this is not a zero-warning claim.
- Thirteen stable mock browser suites: 92 / 92 passed, no skips, 3.3 minutes.
- `npm.cmd run test:e2e:real`: 1 / 1 passed; the tested real mode reports unavailable and makes no external request.
- `npm.cmd run test:media`: 3 / 3 passed.
- Services: 21 files / 78 tests passed.
- The later auth capture-readiness assertion passed 1 / 1 and its Russian screenshot was inspected. The complete 92-case run was not repeated solely for that test-only capture change.
- The clean-install receipt is dated separately; the package lock is unchanged. The controlled broken-mount failure/restored-pass receipt is retained.

The 124 production-source and unit/service-test files stayed unchanged through the main verification run. Browser output was muted and capture used fake devices. No physical microphone, production credentials, backend, payment provider, or real renderer was used.

## Limits

This proves local mock behavior and the recorded frontend contracts. It does not establish production security, accounting, worker durability, storage erasure or retention, real rendering/media delivery, physical-device or Safari behavior, or real service integration. Synthetic commerce fixtures are not approved prices or production accounting. The real adapter remains unavailable. Other screen issues and the integration gate remain open.

## Delivery state at capture

The index was empty before this scoped stage. No commit or push is claimed by this precommit receipt. The issues must remain open until the accepted files are committed, pushed to `origin/main`, and remote containment is verified.

## Git staging checks

- `git -c core.whitespace=-blank-at-eof diff --cached --check -- frontend`: exit 0; no other frontend whitespace diagnostics.
- `git diff --cached --check`: exit 2. It reports blank-at-EOF lines in `_docs/evidence/frontend-implementation-2026-10-23/acceptance-evidence-map.md:277`, `root-delivery-typecheck.log:4`, `root-delivery-unit.log:19`, `root-frozen-cohort-unit.log:918`, `root-privacy-and-history-services.log:17`, `root-privacy-cohort-unit.log:307`, `runtime-clean-install-2026-10-24/logs/preinstall-drift.txt:6`, `frontend/src/App.css:762`, `frontend/src/App.tsx:464`, `frontend/src/app/FeatureRoute.tsx:145`, `frontend/src/index.css:111`, and `frontend/tests/services/adapter-contract.ts:101`.
- It reports trailing whitespace only on the captured Vite reporter line `[plugin builtin:vite-reporter] ` in `_docs/evidence/frontend-implementation-2026-10-23/root-frozen-cohort-build.log:18` and `runtime-clean-install-2026-10-24/logs/mock-build.txt:37`. Those log bytes preserve command output.
- The accepted files were retained byte-for-byte. The whitespace finding is recorded; no application check or acceptance evidence is inferred from this Git hygiene check.
