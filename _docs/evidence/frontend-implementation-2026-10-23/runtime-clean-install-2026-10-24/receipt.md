# Runtime clean-install and focused browser verification

This receipt records a clean install, mock-mode build, focused browser smoke checks, and direct test-isolation source review for frontend issue #67. Results apply to the timestamped source snapshot below. They do not establish acceptance of later edits in the live worktree.

## Frozen source boundary

- Captured: 2026-10-23 21:42:25.3720590 UTC / 2026-10-24 02:42:25.3789834 +05:00.
- Checkout: D:\Program\python\Dubbed, branch main, HEAD 35d122949ad0e07a7e365bcbd4c1ec69202796c3; frontend files were untracked in the dirty worktree at capture.
- Snapshot: 180 files, aggregate SHA-256 4da1bd26e427d835cb727feba6d11de977a3dd449f96777a0efe3ecbbf1fcf00.
- Isolated copy: C:\Users\roman\AppData\Local\Temp\dubbed-runtime-cleaninstall-2028a7faea094c9ca36a50a838559f93\frontend. Source-before, source-after, and copied-tree hashes matched before install.
- The copy excluded node_modules, dist, test-results, playwright-report, and .git. Public media, fonts, and fixtures remained present. No existing temporary verification directory was reused or removed.
- package.json SHA-256: f221dbda6b21c536e58aef323fd71263c9a3ee211757c02a7c299f7447eafad0.
- package-lock.json SHA-256: a3e01f276aca67381da961c88ab165758faa5c7cb97d8ab6a2e64e48ac00748f.
- A prior source copy had drifted before any checks began. It was preserved with no install or tests run; the snapshot above was then freshly copied and hash-checked. See logs/source-drift-preinstall.json and logs/source-freeze.txt.

## Environment and outcomes

| UTC | Command or inspection | Result |
| --- | --- | --- |
| 21:42:58–21:43:25 | npm.cmd ci --no-audit --no-fund | PASS, exit 0; 158 packages installed in the isolated copy. The lock hash was unchanged. |
| 21:43:53–21:44:05 | npm.cmd run build | PASS, exit 0; typecheck and Vite mock-mode build completed, with dist/index.html produced. Lock hash unchanged. |
| 21:45:26–21:45:34 | npm.cmd run test:e2e -- --config=runtime-mock.verify.config.mjs | PASS, 1 existing landing smoke test. |
| 21:47:09–21:47:18 | npm.cmd run test:e2e:real | PASS, 1 existing real-adapter-unavailable test. |
| 21:48:30 | AC-03 source review | PASS as direct source confirmation; no duplicate test was added. |

Runtime was Node v22.23.1 and npm 10.9.8. No backend or database service and no production credentials were supplied to these commands.

The mock landing smoke used dedicated port 4287 and the existing e2e/runtime-smoke.spec.ts. It checked the landing heading and support mail link, followed the Start action to the registration route, and observed no page/console errors or off-origin requests. Chromium used muted audio and fake media-device/permission flags; no physical microphone was accessed.

The real-unavailable smoke used the unchanged playwright.real.config.ts on port 4174 because the existing test asserts same-origin against that port. No listener was present before or after the run, and Playwright had reuseExistingServer=false. The test checked the unavailable state, absence of the mock landing, no external HTTP request, and no page error. The prepared 4288 config was unused. No unrelated process was reused or terminated.

The frozen src/test/setup.ts directly confirms per-test history reset, local/session storage clearing, a fresh fake IndexedDB factory before each test, and Testing Library cleanup plus storage clearing after each test. Existing service construction also accepts deterministic scenario and fake IndexedDB options. The review is recorded in logs/ac03-test-storage-source-review.txt.

## Limits

This receipt closes the durable clean-install/build evidence gap for the recorded snapshot and records the focused runtime checks above. It is not a claim about source changed after the freeze. Final-source validation is separate.

The full unit/browser suites and a controlled broken-mount regression were not run as part of this receipt. The build emitted Vite's advisory warning that the 886.64 kB JavaScript chunk exceeds its 500 kB advisory limit; the build still exited successfully. No Git or GitHub mutation was performed.

## Evidence files

Detailed terminal output and provenance are in the sibling logs directory: npm-ci.txt, mock-build.txt, mock-landing-browser-smoke.txt, real-unavailable-browser-smoke.txt, ac03-test-storage-source-review.txt, source-freeze.txt, and post-run-port-state.txt. manifest.json contains the full per-file snapshot manifest, verification command records, and SHA-256 hashes for this receipt and its logs.