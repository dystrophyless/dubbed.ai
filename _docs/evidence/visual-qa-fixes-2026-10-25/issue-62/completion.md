# Issue 62 QA fixes — completion receipt

Date: 2026-10-25. Executor assignment: GPT-6 Luna, Max. Baseline checkout revision: 9d286621177200fdb5f61ef963d0b6818ae76774. Work took place in a shared dirty worktree; this task did not stage or commit changes.

## Review comparison

The earlier independent review report (local copy removed) recorded 4 medium findings and 2 low findings. Compared with its baseline screenshots and measurements:

- QA-62-01: wrong current-password rejection said the session had ended. The current-password field now receives the error only after a read-only identity observation confirms the same unexpired account; both entered values remain, while proven expiry stays a separate outcome.
- QA-62-02: the confirmation surface did not name the account. It now names the current account email in the accessible dialog description. A long synthetic email wraps at 390 px without horizontal overflow.
- QA-62-03: a held locale save had no pending state and the rollback wording could claim a change that was restored. The selector stays focusable with aria-busy while saving, duplicate changes are guarded, retry is available, and Account copy names the locale still selected. The coordinated issue-68 shared announcement now says the saved language was restored; the English failure body confirms this text and neither locale body contains the stale “changed here” wording.
- QA-62-04: consequence and credit/refund disclosure computed to 14 px / 21 px. Both now compute to Mabry Pro 16 px / 24 px in EN and RU.
- QA-62-05: desktop security actions were 28 px and the Delete control was at y=1189 in the review baseline. The compact layout uses 40 px default actions, 44 px large actions and 48 px phone actions. At 1440×900 the Delete control is 44 px high at y=853 and fits in the viewport. At 1440×700 it remains at y=853, so vertical scrolling is still required to reach it; no navigation or new panel was added.
- QA-62-06: the baseline password inputs differed by 23 px at 1440 px. Their top edges now match at 768 px, with a measured difference of 0 px.

## Verification

- Focused command from the frontend directory: npm.cmd run test -- src/features/account/AccountScreen.test.tsx — PASS, 1 file and 4 tests. Coverage distinguishes wrong password from expiry, checks field-value retention, confirms the deletion identity, and holds/fails locale saves while checking pending and rollback behavior.
- Native local mock capture: node _docs/evidence/visual-qa-fixes-2026-10-25/issue-62/capture-native.cjs — PASS, 12 screenshots, zero page errors. The script asserts desktop Delete visibility at 900 px, one-column 390 px layout, 16 px phone gap, 22 px phone section padding, no horizontal overflow, and password-state results.
- Controlled fixture capture: node _docs/evidence/visual-qa-fixes-2026-10-25/issue-62/capture-fixtures.cjs — PASS, 6 screenshots, zero page errors. It asserts held locale aria-busy/focusability, restored-locale copy in EN/RU, corrected shared English announcement, absence of stale rollback wording, and deletion error/unknown presentation.
- Scoped git diff --check over Account source, tests and evidence scripts — PASS. Git emitted only its existing LF-to-CRLF working-copy notices.
- Browser: headless Playwright Chromium 156.0.8078.4 on 127.0.0.1:4562. Native registration/deletion used only the disposable local mock identity qa62-account-owner-with-long-mobile-display@example.invalid. The mock reached its ordinary signed-out landing. Controlled error/unknown states were synthetic facade results.

The full application suite and global typecheck were not rerun by this executor while neighboring owners were editing; root owns the integration gate. No real account, email, identity provider, payment, microphone, or external service was used. No GitHub operation, commit, or push occurred.

## Final evidence

All 18 final PNG paths and SHA-256 hashes, plus source hashes, are recorded in [screenshot-manifest.json](screenshot-manifest.json). Native and fixture measurements are in [native-browser-metrics.json](native-browser-metrics.json) and [fixture-browser-metrics.json](fixture-browser-metrics.json). Representative final screenshots were opened for visual inspection:

- [EN desktop, full page, 1440×900](screenshots/account-en-full-1440x900.png)
- [EN desktop, short viewport, 1440×700](screenshots/account-en-short-1440x700.png)
- [RU desktop, 1440×900](screenshots/account-ru-desktop-1440x900.png)
- [RU phone, 390×844](screenshots/account-ru-phone390x844.png)
- [EN password error](screenshots/password-error-en-desktop-1440x900.png)
- [RU long-identity deletion dialog, 390×844](screenshots/delete-dialog-ru-long-identity-phone390x844.png)
- [EN deletion error, 390×844](screenshots/fixture-delete-error-en-phone390.png)
- [RU deletion error, 390×844](screenshots/fixture-delete-error-ru-phone390.png)
- [EN locale failure and rollback](screenshots/fixture-locale-failure-en-restored-desktop.png)
- [RU locale failure and rollback, 390×844](screenshots/fixture-locale-failure-ru-restored-phone390.png)

The shared EN/RU announcement correction and its localization test belong to the coordinated issue-68 change; this task changed only AccountScreen source/CSS/tests and its local evidence. The issue-68 changes were included in the fresh browser proof but are not attributed to this executor.
