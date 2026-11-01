# Account integration verification receipt

Date: 2026-10-23 (Asia/Qyzylorda, UTC+05:00)

## Change boundary

This receipt covers the account revision synchronization and identity/account browser journeys only. The service revision fence remains authoritative. The locale provider and password screen use the app's existing account-update callback; the app accepts an update only for the signed-in account, when the snapshot is not deleted and its revision is not older than the current snapshot. A successful password mutation or recovered committed operation updates the in-memory account without refreshing identity, preserving the success notice and current-device session. Pending reconciliation keeps the operation marker and entered values; only a valid committed snapshot clears them.

The reset-code locator now matches the exact visible field. The linking journey follows the rendered “Add Google” action and confirms sign-out through the header, where the page also exposes a session-panel sign-out action. The runtime smoke check derives its allowed origin from Playwright's `baseURL` fixture.

## Verification

Environment: Windows, Node/npm workspace under `D:\Program\python\Dubbed\frontend`; Vite mock adapter; Playwright Chromium launched with `--mute-audio`, `--use-fake-device-for-media-stream`, and `--use-fake-ui-for-media-stream`. The temporary Playwright config bound the mock server to `http://127.0.0.1:4175`, used `reuseExistingServer: false`, and was removed after the run.

- `npm.cmd run test -- tests/account/AccountScreen.test.tsx src/App.test.tsx` — exit 0; 2 files, 9 tests passed. Coverage includes a password operation remaining pending with both entered values retained, then resolving committed in place with the success notice and account callback; it also checks that identity snapshot updates ignore an older revision and a late snapshot from account A after switching to account B, while preserving the active session.
- `npm.cmd run test:e2e -- --config .codex-account-e2e-temp-20261023.config.ts e2e/identity-account-journey.spec.ts e2e/runtime-smoke.spec.ts --workers=1 --reporter=line` — exit 0; 4 tests passed on port 4175. This covered neutral incorrect-credential feedback and mock OTP reset followed by reauthentication; EN→RU→EN account locale changes followed by wrong-password value retention, successful password change, dual-proof simulated Google linking after review, and sign-in with the new password; deletion, protected-route denial, same-email re-registration without a repeat welcome grant; and runtime smoke with no external requests.
- `npm.cmd run typecheck` — currently blocked by the concurrently edited, out-of-scope `tests/result/ResultScreen.test.tsx(208,22): Property 'paused' does not exist on type 'HTMLElement'.` No type errors from the account/App changes were reported in that run.

Earlier focused browser runs exposed and corrected three test/runtime integration failures: the reset field name was ambiguous; the account screen submitted a stale revision after locale saves and then lost its success notice during `refreshIdentity()` remount; and the journey used a button label absent from the rendered Google-link screen, followed by an ambiguous sign-out locator. The final four-test run above passed after those corrections.

## Dirty-worktree boundary and limits

At verification time, `git status --short --untracked-files=normal` showed broad concurrent repository edits and an untracked `frontend/` tree plus the untracked evidence tree. These changes were not staged or committed. The owned source paths for this receipt are `frontend/src/App.tsx`, `frontend/src/App.test.tsx`, `frontend/src/app/context.tsx`, `frontend/src/app/FeatureRoute.tsx`, `frontend/src/app/screen-contract.ts`, `frontend/src/features/account/AccountScreen.tsx`, `frontend/tests/account/AccountScreen.test.tsx`, `frontend/e2e/identity-account-journey.spec.ts`, and `frontend/e2e/runtime-smoke.spec.ts`.

Evidence is limited to the local mock adapter and simulated provider/account data. It does not establish production-service behavior, real email delivery, a real Google OAuth round trip, cross-device session revocation against a server, or full acceptance of frontend issues 61–82. The generated Playwright report/context files are local test artifacts, not acceptance evidence by themselves.

## Frozen source SHA-256

```text
5dbbef8d492cfc81fe632bc4ada432c70802224bb8b236c6fbcd98fa8fbf6fbc  frontend/src/App.tsx
ce3bf7705ef28812bd1b8a22e6d7b46c84748fc12836a1949abbf2e0bea1ae46  frontend/src/App.test.tsx
d2b1b5660a7b850e28a279282e827dca5b5e4cf7c9ea11bc0737a3f1370eef65  frontend/src/app/context.tsx
69f0835a1d103fdbde6df87f1d92515291dcef382823188efc24d9c75b05a58b  frontend/src/app/FeatureRoute.tsx
e12ac4789f0f49ee99f02c482eee43e194b91be3f238efd7a1354c4641312528  frontend/src/app/screen-contract.ts
acf9d20f652a55af844fb44e8a40c6a15fcfb94f2e77d1c9e004f6a646da78e2  frontend/src/features/account/AccountScreen.tsx
914ed8e8881620f90c4c8ab608c48f7470daf78e2364e5d6b338141bf05236d5  frontend/tests/account/AccountScreen.test.tsx
9ac6b029e2f2cdd4f016b4a08360ef46cc147be2acaa5041849dec3722893ef3  frontend/e2e/identity-account-journey.spec.ts
f4a894e1eb4547cf52839455f9b7bad56556fa0421fba5a79ec86b491a7b2a37  frontend/e2e/runtime-smoke.spec.ts
```
