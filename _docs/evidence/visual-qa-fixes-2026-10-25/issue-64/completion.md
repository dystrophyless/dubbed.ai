# Original task 64 correction completion

Status: implemented and locally verified. The new issue-64 evidence and focused test are uncommitted. No commit, push, GitHub update, or issue status change was made.

## Findings

| Finding | Result | Evidence |
| --- | --- | --- |
| QA-64-01 | **Resolved by issue 69's consumer change.** A missing `MediaRecorder` now produces localized local-recording-unavailable guidance; recoverable `media-invalid` retains retry guidance; denied microphone permission has separate connection guidance. Optional-test availability does not gate Continue. | `../issue-69/completion.md`, `../issue-69/capture.cjs`, `../issue-69/metrics.json`, `../issue-69/screenshot-manifest.json`, and opened EN desktop ready/unavailable screenshots. The new `frontend/tests/microphone/browser-media-capability-issue64.test.ts` asserts that the underlying service returns `unsupported` for a live fake track when `MediaRecorder` is absent. |
| QA-64-02 | **Reconciled by the dated addendum.** The historical report remains unchanged; the current owner-approved `< 1,000 ms` reject / exact `1,000 ms` accept rule and rejected-replacement state preservation are linked to active Flow 06. | [addendum.md](addendum.md), active `00-shared-contract.md`, Flow 06 AC-F06-02B, and the issue-61 correction receipt. OPEN-F06-T02 still covers technical alignment/serialization and transient field behavior. |
| QA-64-03 | **Addressed by issue 69 using the shared action roles.** Desktop Refresh is 32 px, connect/test are 40 px, Continue is 44 px; phone controls are 48 px below 768 px. | Issue-69 metrics, 21-image manifest, and opened ready/unsupported desktop screenshots. No WCAG violation is claimed. |

## Verification

| Command or artifact | Result |
| --- | --- |
| `npm.cmd test -- tests/microphone/browser-media-capability-issue64.test.ts tests/microphone/browser-media.test.ts tests/microphone/MicrophoneScreen.test.tsx` from `frontend/` | **PASS:** 3 files, 25 tests, Vitest 5.0.5, Windows host with Node v22.23.1, 2026-10-25. |
| `Select-String -LiteralPath 'frontend/tests/microphone/browser-media-capability-issue64.test.ts','_docs/evidence/visual-qa-fixes-2026-10-25/issue-64/addendum.md','_docs/evidence/visual-qa-fixes-2026-10-25/issue-64/completion.md','_docs/evidence/visual-qa-fixes-2026-10-25/issue-64/summary.json' -Pattern '[ \t]+$'` | **PASS:** no trailing spaces or tabs in the new untracked test/evidence files. |
| `Get-FileHash -Algorithm SHA256` on the six accepted issue-64 source artifacts | **PASS:** every current hash matches the frozen values listed below. |
| Scoped `git status --short` readback | The four issue-64-owned files are the only new issue-64 paths. Issue 69's three already-modified microphone files and issue 72's two untracked fixture generators remain visible; the existing `browser-media.test.ts` has no status entry. |
| Issue-69 current local browser evidence | **Inspected, not rerun:** capture source, completion, metrics, manifest, log, ready desktop image, and unsupported-recorder desktop image. Existing run reports 21 screenshots, 5 assertions, 0 page errors, local Chromium 156.0.8078.4, fake media/UI, muted audio, port 4569. |

## Frozen artifact hash preservation

| Accepted artifact | Frozen and current SHA-256 |
| --- | --- |
| `media/investigation-report.md` | `34062d4690ab3a22618d523723cd54e53d76c547d603a5141e5999c99656edfa` |
| `media/criterion-evidence.json` | `0ee69ab4dc1bf6f511ce9e3bdb403ac798dfe9d2234e8db36708212b029baf41` |
| `media/browser-media-matrix.json` | `c6b0218014f58624c95b1e4be15cf1baa04fa1df28347e58ed48f11625946938` |
| `media/orchestrator-native-capture.json` | `68642c1363b0bac6427e26fe10ab9b4bf05a1fcc45f06336bf529aa3c4278fce` |
| `media/orchestrator-asset-integrity.json` | `dd64572fd6be728a9ae50e98c08fd9f94d527bb985ef87ab4cb1d5cb4c711af5` |
| `issue-64-acceptance.md` | `950c7a6b092c512873ac51b83b3088eb4c14dd059ed7e75e59dfe0189b6f6468` |

## Worktree boundary and limitations

Base revision: `9d286621177200fdb5f61ef963d0b6818ae76774`. The shared worktree was dirty before this task. Its scoped baseline had the three issue-69 microphone consumer files already modified and issue-72's two portrait fixture generators untracked; the issue-64 output folder and new regression file were absent. Final scoped `git status --short` shows only these four issue-64-owned files plus those same pre-existing issue-69/72 paths. This task added only:

- `frontend/tests/microphone/browser-media-capability-issue64.test.ts`
- `_docs/evidence/visual-qa-fixes-2026-10-25/issue-64/addendum.md`
- `_docs/evidence/visual-qa-fixes-2026-10-25/issue-64/completion.md`
- `_docs/evidence/visual-qa-fixes-2026-10-25/issue-64/summary.json`

No existing service/media test, active-flow corpus, issue-69 product file, issue-72 portrait fixture/generator/registry path, or historical issue-64 report was edited. Existing current decisions for original-source minimum, zero-turn retry, and one capturing tab are referenced in the addendum; this task did not reopen or alter them.

Not run: full unit suite, typecheck/build, all-63 E2E matrix, fresh browser capture, fresh Firefox/WebKit matrix, physical microphone/speaker/phone/Bluetooth, native permission UI, backend/provider/storage/billing/production behavior, or GitHub/commit/push actions. Legacy E2Es were skipped because they target the frozen 2026-10-23 evidence-output root; the current issue-69 consumer capture was inspected. The local injected browser and service tests do not certify real browser/device support.
