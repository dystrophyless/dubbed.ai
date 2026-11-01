# Root full-gate first attempt

This is an intermediate record, not acceptance. Product source/public/build inputs are frozen at125 files; all commands run from frontend unless otherwise stated, with muted/fake browser media and fresh artifact roots.

| Check | Actual result | Evidence |
|---|---|---|
| Full Vitest | PASS:58 files,307 tests | unit.log |
| Media corpus | PASS:4 tests | media.log |
| Lint | Exit0 with warnings; no clean-warning claim | lint.log |
| Initial build | Exit2: unused page parameter in new issue63 E2E helper | build.log |
| Build after `_page` rename | PASS:TypeScript and Vite mock bundle; chunk-size advisory retained | build-recheck.log |
| Full default E2E first attempt | Exit1:14 failed,149 passed,1 capture-flag skip,164 total,9.0m | e2e-run-1.log |
| Explicit real-adapter-unavailable gate | PASS:4 tests, no real backend/provider proof | real-e2e-run-1.log |

The unused-parameter fix changed only one E2E identifier; product code and unit-test files stayed unchanged. The105-file test freeze retains its predecessor before that rename. Root copied19 failure artifacts to e2e-run-1-failure-results before the real-mode runner cleaned its ordinary test-results directory.

Root and dedicated63 triaged all14 browser failures. Confirmed stale checks cover role heights/fonts, compact Account local padding, normal desktop scroll reachability, the permitted microphone entry gate on Result return, a constructor NotSupportedError incorrectly used to model a retryable microphone test, generation-specific playback copy, independent Watch new during a pending old-generation download, truthful locale rollback, inline password errors, observational purchase history labels, typed read recovery versus adapter-unavailable, and the shared-domain interval rail. No product defect was confirmed from this attempt. Assertions must retain semantics, focus/phone sizes, source identity, retained values, no duplicate mutations and byte-exact generation downloads.

63 is authorized only the affected E2E/harness corrections and one focused affected-case batch, followed by Root review/typecheck and a fresh full E2E run. Any actual product defect must return to its original dedicated owner. No product-source patch, blanket assertion relaxation, historical evidence overwrite, acceptance, commit, push or issue closure is authorized by this intermediate result.
