# Issue #71 proactive visual QA corrections

Date: 2026-10-25 (Asia/Qyzylorda)  
Executor model/effort: GPT-6 Luna / Max  
Source revision: `9d286621177200fdb5f61ef963d0b6818ae76774`; work remained uncommitted in the shared dirty worktree.

## Scope and implementation

- Added independent localized Show/Hide controls to both password fields in [PasswordResetScreen.tsx](../../../../frontend/src/features/auth/PasswordResetScreen.tsx). Each control has a stable accessible name, `aria-pressed`, and retains the same input element and value when toggled. No shared auth CSS or OTP files were changed.
- Removed the repeated code instruction from the code-phase body. The instruction remains in the AuthLayout heading; the neutral response and local-mock delivery disclaimer remain.
- Kept the existing `routeForSignInIntent` behavior. After a successful completion or authoritative completed reconciliation, the screen now requires a fresh signed-in identity and successful navigation before carrying the typed `password-reset-completed` hint.
- Added the narrow `NavigateOptions.destinationNotice` contract and App history-state handoff. The app-level [DestinationNotice.tsx](../../../../frontend/src/app/DestinationNotice.tsx) validates and consumes the marker once, removes only that property via history replacement, preserves unrelated route state, and keeps localized status copy visible until dismissal or route exit. The hint contains no account, email, password, reset secret, or operation ID; it is not put in the URL or storage. No interstitial or extra continuation step was added.
- The destination message follows Flow 04 §4.6 exactly: “Password changed. You’re signed in on this device. Other sessions were signed out.” / “Пароль изменён. На этом устройстве выполнен вход. Остальные сеансы завершены.” It is emitted only after the successful service outcome and signed-in refresh. The mock reset service clears prior sessions before creating the current session; no production revocation claim was tested.
- Reset submit actions explicitly use the shared `medium` task role from #78. Shared button styling and #82 OTP implementation remain owned by their existing owners.

## QA finding dispositions

| QA ID | Disposition | Evidence |
|---|---|---|
| QA-71-01 | Fixed and exercised | Independent reveal/hide, stable names/pressed state, same DOM fields and values, and keyboard focus assertions in `PasswordResetScreen.test.tsx` and the browser capture. Screenshots: `en-desktop-password-visible.png`, `ru-phone390-password-visible.png`; the screenshots show only the deliberate synthetic sample value `sample-pass-71`. |
| QA-71-02 | Fixed and exercised | `DestinationNotice` uses transient typed router state; notice appears only after completion plus signed-in refresh, is removed with `replace`, preserves other state, dismisses, and clears on route exit. The focused screen and consumer tests cover New dub and project-return intent/state behavior. Native mock journeys reached New dub in EN and RU. Screenshots: `en-desktop-success-destination.png`, `en-short-success-destination.png`, `ru-desktop-success-destination.png`, `ru-phone390-success-destination.png`. |
| QA-71-03 | Fixed by consuming #78 | Reset primary action rendered **350×40 px, Mabry Pro 14/20** at 1440px and **292×48 px, 16/24** at 390px. At 767px the action was **366×48 px**; at 768px it was **350×40 px**. The compact desktop mismatch is no longer present. Measurements: `metrics.json`; screenshots: `en-desktop-request.png`, `ru-phone390-password-visible.png`, `code-en-767.png`, `code-en-768.png`. |
| QA-71-04 | Verified consumption of #82 fix; no duplicate patch | Invalid-code OTP rendered **40×44 px cells with Mabry Pro 15/24 digits** at desktop, phone, 767px and 768px. Native capture asserted retained invalid code selection `[0,6]` and the shared typography. Screenshots: `en-desktop-invalid-code.png`, `ru-phone390-invalid-code.png`, `code-en-767.png`, `code-en-768.png`. |
| QA-71-05 | Fixed and exercised | Removed the body duplicate; browser capture asserted exactly one code instruction on all four native journeys. Screenshots: `en-desktop-code.png`, `ru-desktop-code.png`, `ru-phone390-code.png`. |

All 33 screenshots have SHA-256 entries in [screenshot-manifest.json](screenshot-manifest.json); 15 were individually opened and inspected. `metrics.json` records viewport/page bounds, font readiness, controls, focus, OTP dimensions/selection, completion state, and overflow. No captured viewport had horizontal page overflow. The completion dismiss target measured **40×40 px desktop and 48×48 px phone**.

The visual source mapping used the owner-selected Affect UI Clean/Light BTN, OTP and notification references. Button action hierarchy consumes #78's shared task role; OTP state/typography consumes #82's implementation; the completion feedback uses a compact localized status notice with an icon dismiss control. No sample marketing copy or other domain content was imported.

| Frozen reference | SHA-256 |
|---|---|
| `_docs/evidence/affect-ui-clean-light/source/components/button/Clean/button-clean.md.txt` | `87E82CD57239270F22C106C40E77D005E310F7AA7A6EDDBFCA0019568B9BD5E6` |
| `_docs/evidence/affect-ui-clean-light/source/components/button/Clean/Light/01-initial.png` | `11FDC40389E7A7C18BFA7BE5F2AFE7A08CE3486AA9CBE0199D3CEC2D799881C6` |
| `_docs/evidence/affect-ui-clean-light/source/components/otp-input/Clean/otp-input-clean.md.txt` | `B5649E4A8B06738A9BECBDA399E8BC248AF2CD5E1AF0A8D97811A27965C6162C` |
| `_docs/evidence/affect-ui-clean-light/source/components/otp-input/Clean/Light/03-invalid-code.png` | `6B10F59548A5633042A065503DE217D47538E093DC28C7BCC1ECCDBD7E87840B` |
| `_docs/evidence/affect-ui-clean-light/source/components/notification-stack/Clean/notification-stack-clean.md.txt` | `C2C61D0819011A9D1A699D4C5692E38B9D5BCB8D6EAB1595841317961E4AC4CC` |
| `_docs/evidence/affect-ui-clean-light/source/components/notification-stack/Clean/Light/01-initial.png` | `9B133935B2162A3833D8A0A1DB5E8531F467257C08F1AE6C253CF310491D978B` |

## Verification

- `npm.cmd exec -- vitest run tests/auth/PasswordResetScreen.test.tsx tests/app/destination-notice.test.tsx` — **2 files and 11 tests passed**. These are focused regressions; the full suite was not run.
- `node .\_docs\evidence\visual-qa-fixes-2026-10-25\issue-71\capture.cjs` — **33 fresh screenshots, 11 recorded scenario events, 0 page errors**. Vite mock mode used port 4571 and was stopped after capture. Browser: Playwright 1.64.1 / Chromium 156.0.8078.4; audio muted and fake media flags enabled.
- Browser capture asserted successful EN/RU journeys, exact-one code instruction, invalid-code correction selection, OTP 15/24 typography, independent visibility/focus/value behavior, no horizontal overflow, localized destination confirmation and marker removal. Controlled harness screenshots are explicitly labeled `controlled-*`; they are not natural service failures.
- `git diff --check` for owned implementation paths — exit 0; only line-ending conversion warnings were reported.

Raw commands and results are in [commands.txt](commands.txt) and [capture.log](capture.log); screenshots are in [evidence/](evidence/). The capture seeded synthetic identities through the centralized mock facade, signed them out before reset, and used local mock codes only. It did not send email. A native browser success journey was run to New dub; project-return destination selection and status-state consumption are covered by focused component tests, not a second native project fixture.

## Boundaries and limitations

- No backend, real adapter, real email, physical device, screen reader, forced-colors, or native 200% browser zoom was exercised. UI/session claims in screenshots are local mock behavior only.
- No full test suite, build, or global typecheck was run; root owns the later integrated source-freeze gate. Focused Vitest and the actual browser-module capture passed.
- `App.tsx` and `screen-contract.ts` already carried unrelated #67 retry/bootstrap edits in the shared tree. Those hunks were preserved; this task added only the approved transient-notice plumbing in those files. No commit, push, or GitHub update was made.
