# Issue 68 QA correction

Date: 2026-10-25, Asia/Qyzylorda. Executor: GPT-6 Luna Max. Baseline and current HEAD: `9d286621177200fdb5f61ef963d0b6818ae76774`. Worktree was already dirty in unrelated files and shared with other task owners; only the #68 shared error/message files, focused tests, and this issue evidence directory were changed. No commit, push, GitHub update, or issue closure was performed.

## Change

- Added `serviceRecoveryAction(problem, context)` in `frontend/src/i18n/service-errors.ts`. It preserves the typed service retry directive and returns `none`, `read-again`, `retry-same-operation`, `reconcile-first`, or `sign-in`.
- `adapter-unavailable`, a missing retry directive, and `retry: 'none'` do not authorize Retry. `unauthenticated` maps to sign-in. A read with `reconcile-first` may retry its observation; a write with `reconcile-first` remains a reconciliation action. `unknown-operation` always stays on reconciliation, independent of context.
- Added `context?: 'read' | 'write'` to `ServiceNotice`. The default remains `write`, preserving existing callers. Read-context `storage-unavailable` now uses separate English/Russian open/read copy; existing write wording is unchanged.
- Widened `ServiceRecoveryProblem` structured metadata to accept every `ServiceProblemCode` with a `RetryDirective`, including identity aliases `unknown-operation` and `unexpected`. A typed `unknown-operation` with `retry: 'none'` still maps to reconciliation.
- Corrected the shared `accountPreferenceUnavailable` English/Russian copy for QA-62-03. It now says the language change could not be saved and the account's saved language was restored. No LocaleProvider, AppHeader, or AccountScreen behavior changed; #62 owns the account flow and its rendered verification.
- No shared `AsyncState` component was found. No Credits, Projects, FeatureRoute, bootstrap, or services-store files were changed; consumers retain their route/refresh callbacks and will use this API in their assigned tasks.

## Finding dispositions

| Finding | Disposition | Evidence and limit |
| --- | --- | --- |
| QA-68-01 — unknown checkout can start a fresh mutation | Duplicate owned by #65; fixed there. | The frozen review's pre-fix trace recorded operation/initiation pairs `aabe1705-4553-4096-9607-c965898054d1` / `5e859bf2-7a34-42d5-89b1-c8444003b8b5`, then `028d4bc0-e470-43a9-b8b6-dce26ef6ecad` / `35b60bac-5cc3-428a-932a-62bf87de6191`, without a resolve call between starts. That trace remains historical pre-fix evidence. Current #65 proof is its completion receipt and focused test: the first IDs persist through repeat click and remount; a retry occurs only after resolving the original operation as `not-started`, with the exact same IDs. The #65 owner reports 3 files / 18 tests passing; #68 did not rerun that Credits command. See `../issue-65/completion.md` and `frontend/src/features/credits/CreditsScreen.test.tsx`. No real payment or duplicate charge is claimed. |
| QA-68-02 — recovery actions discard retry/auth facts and read failure says save failed | Shared mapping and read-context copy implemented; consumer integration pending. | Focused tests cover unavailable/non-retryable suppression, direct sign-in mapping, read refresh, same-operation retry, write reconciliation, and unknown-operation reconciliation. Fresh controlled `ServiceNotice` screenshots and metrics cover English/Russian desktop/phone copy. #67 must wire startup read recovery, #75 must retain the complete read error and use the helper for Projects actions, and #80 must wire unauthenticated sign-in through its safe intent resolver. Those screen actions and a real session-expiry flow are not verified by this receipt. |
| QA-68-03 — important desktop recovery controls are undersized | Duplicate routed to shared controls owner #78; downstream control consumption remains pending. | #68 added no button sizing or consumer markup. #78 owns the shared 40px task and 48px phone role; #67/#75/#80 still need to consume and verify it in their recovery states. No new size finding is claimed as resolved by the #68 screenshots. |

## Cross-task shared copy follow-up — QA-62-03

The two `accountPreferenceUnavailable` translations now describe the actual rollback: the requested language change was not saved, and the language saved in the account was restored. `messages.test.ts` asserts both current-locale variants. This fixes the shared-copy seam only; #62 still owns pending/success/failure behavior, retry, live announcement behavior, and account-flow screenshots.

## Verification

| Command / run | Result |
| --- | --- |
| `node node_modules/vitest/vitest.mjs run src/i18n/service-errors.test.ts src/components/ui/notice.test.tsx src/i18n/messages.test.ts` (`frontend`) | PASS — 3 files, 9 focused tests, including the typed alias-metadata regression and EN/RU restored-language copy. |
| `npm.cmd run lint -- src/components/ui/notice.tsx src/components/ui/notice.test.tsx src/i18n/service-errors.ts src/i18n/service-errors.test.ts src/i18n/messages.ts src/i18n/messages.test.ts` (`frontend`) | PASS — assigned shared files only. |
| `node node_modules/typescript/bin/tsc --ignoreConfig --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --jsx react-jsx --strict --skipLibCheck --types vitest/globals src/i18n/service-errors.ts src/i18n/service-errors.test.ts src/components/ui/notice.tsx src/components/ui/notice.test.tsx` (`frontend`) | PASS — selected helper/component/test graph only. The initial narrow invocation omitted `--ignoreConfig` and TypeScript 6 rejected it with TS5112 before checking files; the corrected command above passed. |
| `npm.cmd run typecheck` (`frontend`) | PASS — one global `tsc -b --pretty false` run after the type widening; it also confirms the reported FeatureRoute alias-metadata TS2345 is resolved in the current tree. |
| `node _docs/evidence/visual-qa-fixes-2026-10-25/issue-68/capture-service-notice.cjs` | PASS — 4 fresh Chromium captures at 1440×900 and 390×844 in EN/RU. The controlled page mounts the actual shared `ServiceNotice` module with synthetic `storage-unavailable`, `context='read'`. Mabry Pro loaded in all captures, no page errors or horizontal overflow were measured; all four PNGs were opened and visually inspected. |
| `git diff --check -- frontend/src/components/ui/notice.tsx frontend/src/i18n/service-errors.ts frontend/src/i18n/messages.ts` | PASS — only normal Windows LF-to-CRLF warnings. |

Screenshots: `en-desktop.png`, `ru-desktop.png`, `en-phone.png`, `ru-phone.png`. Machine-readable layout/font/overflow evidence: `service-notice-captures.json`. These captures cover the shared service notice; no account-locale screenshot was added for QA-62-03. The Vite server used only `127.0.0.1:4568` and was stopped after capture.

## Limits

The screenshots prove localized rendering of the shared notice, not Projects/bootstrap/auth consumer behavior. No real expired session, actual IndexedDB denial, service adapter, payment provider, or full suite was run. #67, #75, and #80 still need to consume the recovery API and verify their screen-specific safe action and button sizing. #62 still needs to verify locale rollback and retry through the Account flow. Root owns the integrated freeze and acceptance decision.
