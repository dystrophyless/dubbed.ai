# Issue 73 QA correction

Date: 2026-10-25, Asia/Qyzylorda. Executor: GPT-6 Luna Max. Baseline HEAD: `9d286621177200fdb5f61ef963d0b6818ae76774`. Worktree remained dirty; this receipt covers only the task-owned service changes and issue-73 evidence listed below. No commit, push, issue update, or closure was performed.

## Change

- `frontend/src/services/index.ts`: made the workspace database connection a lazy cached promise. A rejected open is normalized to `MockWorkspaceUnavailableError` and evicted; the next read through the same service context opens again. A throwing `globalThis.indexedDB` getter is caught and surfaced as the same typed storage-unavailable error.
- `frontend/src/services/mock-store.ts`: documented the retryable `StoreContext.database` cache contract. The active account/client and recording actor fields remain in the same context while only the failed database promise is cleared.
- `frontend/tests/services/indexeddb-open-retry.test.ts`: added a transient-open recovery case that reads a previously registered account/session through the same service and preserves service object identity, plus a throwing-global-getter type check.

No `Services`/`contracts.ts` or UI/bootstrap API was added. `identity.current()` already waits for the store and returns a typed `storage-unavailable` result, so issue 67 can use that existing call for readiness and handle the failure in its bootstrap layer. On the actual protected-route Retry, its next identity read reaches the fresh open promise.

## QA dispositions

| Finding | Disposition | Evidence |
|---|---|---|
| QA-73-01 — Retry reuses a rejected database-open promise | **Fixed and verified.** A one-shot open failure followed by the actual Retry reaches Sign in after exactly one new open; the service test confirms the saved account/session remain available through the same facade. | `retry-proof.json`, `before-retry.png`, `after-retry.png`, `frontend/tests/services/indexeddb-open-retry.test.ts` |
| QA-73-02 — desktop resume action is undersized | **Duplicate routed to issue 78**, which owns shared control density and targets. No Projects or shared presentation files changed here. | Execution packet ownership map; issue-73 review finding |
| QA-73-03 — read/open failure says a save failed | **Duplicate routed to issue 68**, which owns generic notice/error copy. The fresh before screenshot still shows the old write-oriented wording; this receipt does not claim that copy finding is resolved. | `before-retry.png`, `retry-proof.json`; execution packet ownership map |
| QA-67-01 — denied storage/open failure lacks reliable startup handling | **Shared service seam fixed here; bootstrap/readiness UI remains owned by issue 67.** The typed getter test and browser Retry proof cover the service boundary. | `indexeddb-open-retry.test.ts`, `retry-proof.json`; root coordination message |

## Verification

- `npm.cmd test -- tests/services/indexeddb-open-retry.test.ts` — PASS, 1 file / 2 tests, 3.26s.
- `npm.cmd test -- tests/services/indexeddb-open-retry.test.ts tests/services/default-client-persistence.test.ts` — PASS, 2 files / 3 tests, 2.21s. The second file confirms existing default-client/session persistence behavior still passes.
- `node _docs/evidence/visual-qa-fixes-2026-10-25/issue-73/retry-proof.cjs` — PASS on Windows with Vite 8.3.5 mock mode at `http://127.0.0.1:4573`. Chromium received a synthetic first-open `InvalidStateError`; the actual Retry button then opened IndexedDB a second time and reached Sign in. The browser client ID remained stable, with no page errors, console errors, or external requests. The 1440×900 document stayed 1440px wide. Mabry Pro regular and medium were loaded. Both screenshots were opened and visually inspected. The owned Vite server was stopped after capture.
- `git diff --check -- frontend/src/services/index.ts frontend/src/services/mock-store.ts frontend/tests/services/indexeddb-open-retry.test.ts` — PASS; Git emitted only its LF-to-CRLF advisory for the two edited source files.

Evidence files: `retry-proof.cjs`, `retry-proof.json`, `screenshot-manifest.json`, `before-retry.png`, and `after-retry.png` in this directory.

## Limits

This proves recovery from a controlled transient open fault and preserved mock account/session data in the same isolated browser context. It does not simulate a real browser permission denial or quota event. The full suite and typecheck were not run while other task writers are active; root owns integrated checks after source freeze. QA-73-02 and QA-73-03 remain with their designated shared owners, and issue 67 still needs to consume the existing typed readiness result in bootstrap/UI behavior.
