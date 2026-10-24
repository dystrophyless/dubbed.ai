# Recording tab ownership verification

Captured 2026-10-25 for the mock frontend implementation of recording tab exclusion.

## Scope and source boundary

- Baseline: `0c9b9d6069fcf625c1d54a2709ea16e8f0cbb2d2`.
- Adapter: mock only. No external backend, real adapter, or production behavior was exercised.
- This executor changed only the following six source and test paths:
  - `frontend/src/services/index.ts`
  - `frontend/src/services/mock-store.ts`
  - `frontend/src/services/mock-recording.ts`
  - `frontend/tests/services/recording-results.test.ts`
  - `frontend/e2e/full-journey.spec.ts`
  - `frontend/e2e/recording-viewport.spec.ts`
- The working tree had unrelated documentation, evidence, and skill changes before this slice. They were preserved.
- No commit, push, GitHub issue, or specification mutation was made.

Frozen working-tree blob hashes (`git hash-object`):

| Path | Blob hash |
| --- | --- |
| `frontend/src/services/index.ts` | `5ef3ccb262c71c508985c7c952fa06c5020121da` |
| `frontend/src/services/mock-store.ts` | `a31042e6e8288dedfcabe4863dabd307709cee3e` |
| `frontend/src/services/mock-recording.ts` | `d1d53017010ed3a1446ef3f8952828f4bb864642` |
| `frontend/tests/services/recording-results.test.ts` | `e41b71f3a210a8fb53d5bc1db39f0319cf874e06` |
| `frontend/e2e/full-journey.spec.ts` | `d968b8ecef7e183b1a714e8eb10c37d000b17ae7` |
| `frontend/e2e/recording-viewport.spec.ts` | `aa5cf4973815214d97e7276aa2439d56dc47b1d1` |

## Implemented behavior

- A runtime recording actor is shared by service facades in the same JavaScript realm and differs across tabs. The durable authentication `clientId` remains in its existing `localStorage` path; no auth identity or `sessionStorage` behavior changed.
- Acquire, renew, release, draft persistence, acceptance, and leave-resolution mutations are fenced by the recording actor. Their operation fingerprints include that actor, so replaying another tab's acquisition operation ID returns an intent conflict instead of another tab's grant.
- A live legacy grant with no actor remains unavailable to other actors until its existing lease expires. Explicit reacquisition after expiry creates a new fence token and leaves saved drafts recoverable.
- Save and leave now retains a draft already persisted under the same candidate ID instead of inserting a duplicate row. Final-gap acceptance remains ahead of this branch.
- Native browser coverage uses Playwright Chromium with `VITE_SERVICE_ADAPTER=mock`, muted audio, and fake microphone device/UI flags from `frontend/playwright.config.ts`.

## Checks

Commands were run from `D:\Program\python\Dubbed\frontend` in PowerShell.

| Command | Result |
| --- | --- |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd test -- tests/services/recording-results.test.ts` | PASS, 9 tests |
| `npm.cmd run test:e2e -- full-journey.spec.ts -g "registers, saves a millisecond selection"` | PASS, 1 native test |
| `npm.cmd run test:e2e -- recording-viewport.spec.ts -g "recording transport stays"` | PASS, 1 native test |
| `git diff --check -- frontend/src/services/index.ts frontend/src/services/mock-store.ts frontend/src/services/mock-recording.ts frontend/tests/services/recording-results.test.ts frontend/e2e/full-journey.spec.ts frontend/e2e/recording-viewport.spec.ts` | PASS |

The two-page native journey used pages in the same browser context. The owner remained able to capture and accept a take. The second page showed the acquisition alert, had disabled Record and Next line controls, and its acquire, renew, release, persist-draft, and accept calls returned `lease-held`. Replaying the owner's acquisition operation ID returned `intent-conflict`. After the owner explicitly released the grant, reopening the blocked page acquired access.

The journey then saved a non-final draft through the visible Save and leave UI, reopened the project, and verified that the RecordingScreen restored the draft. A new JavaScript realm did not silently take over the previous live grant. The test read the held grant's actual IndexedDB `expiresAt`, polled browser `Date.now()` to that boundary, and explicitly reopened after expiry. This was real wall-clock browser time of approximately 45 seconds, not a test-clock advance. The existing 45-second mock lease policy was unchanged.

Unit coverage separately checks same-realm multi-facade renewal and stale-revision rejection, explicit release and expiry reacquisition with draft preservation, and a legacy row missing its actor. The legacy test advances the unit harness clock by 45,001 ms; this is a harness-clock check, not physical time.

`recording-viewport.spec.ts` changes locale through the visible selector within the same realm so its visual checks do not accidentally simulate a new recording actor. The viewport screenshots produced by the passing run are available at:

- `_docs/evidence/frontend-implementation-2026-10-23/record-redesign/recording-en-1440x900.png`
- `_docs/evidence/frontend-implementation-2026-10-23/record-redesign/recording-en-1440x700.png`
- `_docs/evidence/frontend-implementation-2026-10-23/record-redesign/recording-ru-390x844.png`
- `_docs/evidence/frontend-implementation-2026-10-23/record-redesign/recording-en-capturing-1440x900.png`
- `_docs/evidence/frontend-implementation-2026-10-23/record-redesign/recording-en-candidate-1440x900.png`
- `_docs/evidence/frontend-final-policy-2026-10-25/recording-tab/held-elsewhere-en.png` is captured by the same-context two-page test after the loser alert and disabled controls are asserted. The parent combined browser gate will generate this new screenshot.

`historical-failures.md` preserves the initial Save and leave failure and the old viewport reload setup failure. The transient Playwright `test-results` error-context files were no longer present after the successful reruns, so the dated note records the observed terminal trace and state instead of claiming to copy files that had been cleaned.
