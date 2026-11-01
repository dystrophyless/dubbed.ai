# Frontend service lifecycle follow-up

Date: 2026-10-21 (Asia/Qyzylorda). Worktree revision: `2f70ac94d059585f9608df39efbc96be555c3f98` with local uncommitted changes. Scope: mock-service lifecycle regression tests and one response-state correction.

The focused service suite covers the following lifecycle outcomes against the existing deterministic fixture harness:

- Canceling an included retry after it enters `running` consumes the included retry even before any stage completes; the zero-reservation attempt costs zero and returns `retryAvailable: false`.
- Queued paid cancellation returns the full reservation. Running cancellation charges only completed stages and returns the rest; a stage completion invalidates an older cancellation quote. A system failure after a completed stage still releases the full reservation.
- A subsequent ordinary reprocessing after included-retry exhaustion is billed at the quoted cost.
- A failed simulated checkout returns a typed permanent failure and grants no credits.
- Resetting one named IndexedDB workspace leaves another workspace intact; unavailable IndexedDB returns `storage_unavailable` rather than using an in-memory fallback.
- A failed newer export remains terminal while the last finished export stays addressable through the same-browser share target.

The cancellation regression found that the service correctly fenced another retry but returned a restored `PreparationState` with `retryAvailable: true`. The cancel rollback response now derives availability from the persisted project retry flag.

The follow-up audit found paid running cancellation retained the full reservation after only `source_inspection` had completed. The demo policy now exposes an explicitly provisional equal-weight allocation across its five simulated stages, using cumulative floor rounding so charge plus refund always equals the reservation. With the 20-second test quote, one completed stage costs 4 credits and returns 16. This is mock behavior only; it does not resolve production stage allocations or rounding policy.

| Check | Result |
|---|---|
| `npm.cmd run test -- --run src/services/mock/createMockServices.test.ts` from `frontend/` | PASS, 26 tests in one file. |
| `npm.cmd run typecheck` from `frontend/` | PASS (`tsc -b --pretty false`). |

These are fake-IndexedDB service-contract checks, not physical browser storage, payment, or provider evidence. Root will run the integrated suite and final browser checks on the shared worktree.
