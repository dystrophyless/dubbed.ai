# Shared button busy-state addendum

The shared `Button` component accepts an optional `busy` prop. While busy it exposes `aria-busy="true"` and `aria-disabled="true"`, remains a natively enabled and keyboard-focusable button at normal opacity, and suppresses click, Enter, and Space activation. Existing callers keep their submit/ref guards. A caller can still pass native `disabled` for a genuine safety or validation block.

The selected sign-in, registration, password-reset and account-linking pending actions now use this state where the pending action remains visible. Unknown operations, invalid fields, unavailable resend windows, and other independent blocks remain natively disabled. Existing auth form guards remain in place to block a second submit even when the submit button is focusable.

Verification on the shared local worktree:

- `npm.cmd exec vitest run tests/components/Button.test.tsx tests/auth/SignInScreen.test.tsx tests/auth/RegistrationScreen.test.tsx tests/auth/PasswordResetScreen.test.tsx tests/account-linking/AccountLinkingScreen.test.tsx` — 27 tests passed across 5 files.
- `npm.cmd exec tsc -- --noEmit -p tsconfig.app.json` — passed.
- `npm.cmd exec tsc -- --noEmit -p tsconfig.node.json` — passed.
- `npm.cmd exec -- playwright test e2e/shared-controls.spec.ts --grep "busy Button stays focusable" --workers=1` — 1 browser test passed in local Chromium. English and Russian were checked at 1440px and 390px. The deferred synthetic request stayed in flight for pointer, Enter, Space, implicit Enter, and direct submit attempts; mutation count remained 1, focus stayed visible, computed opacity stayed 1, and the entered draft remained after the synthetic failure.
- In that same browser fixture, the actual verified `OtpInput` Check measured 20×20px and reported viewBox `0 0 24 24`, currentColor stroke, 1.1 stroke width, no fill, rounded caps/joins, and decorative hiding. The Clean/Light reference is a PNG, so this verifies the chosen Lucide treatment and geometry, not exact SVG-path identity with the raster.
- `git diff --check` passed for the scoped source and test paths.

Browser metrics and the four English/Russian desktop/phone captures are in `shared-controls/busy-otp-check/`. The harness uses only a test-only synthetic deferred action; this does not claim a real identity-service, media, or billing request. The separately captured shared-control visual matrix and its destructive-button addendum remain historical evidence.

The visual CSS file remained unchanged at SHA-256 `A449281A33E1063A9A2177FC6EFD1445612BD1EF878BC22B810463DD310C40F7` during this slice.
