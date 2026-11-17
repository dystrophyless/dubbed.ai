# UI spec: Sign-up and sign-in on mock services

**Feature**: `004-auth-mock` · **Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)
**Status**: Approved (2026-11-17)
**Designer**: ui-designer · **Prototype**: `/prototypes/004-auth-mock`

Archetype for every page: **Auth** (`/styleguide/templates/auth`) — no app bar, brand top-left, EN/RU top-right, one
centred panel (form 400): icon tile · optional "Step n of 3" bar · 18px title · one line · form · alternative action behind a
hairline. Landing `/` is out of scope (owner). Nothing is new: kit + layout + media components only.

## 1. Screens

| # | Screen | Route | Shell | Archetype | Reference | Stories |
|---|---|---|---|---|---|---|
| S1 | Sign in | `/sign-in?next=` | none | Auth | `/styleguide/templates/auth` (sign-in) | US2, US3 |
| S2 | Sign up | `/sign-up` | none | Auth (step 1 of 3) | auth (sign-up) | US1, US3 |
| S3 | Email code | `/sign-up/verify` | none | Auth (step 2 of 3) | auth (verify) | US1 |
| S4 | Microphone check | `/sign-up/microphone` | none | Auth (step 3 of 3) | auth (microphone) | US1, US4 |
| S5 | Reset password | `/reset-password` | none | Auth | auth (reset) | US5 |
| S6 | Google stand-in (mock only) | `/auth/google?from=&next=` | none | Auth, Checkout stand-in style | `/prototypes/002-credits-flow-mock/checkout` | US3 |
| S7 | Route guard loading | any guarded route while the session is read | none | Auth (skeleton) | Checkout loading | all |
| S8 | Shell: account menu | every ProductShell page | ordinary | existing AppShell | — | US2 |

Views: `frontend/src/features/auth/views/` (`SignInView`, `SignUpView`, `VerifyView`, `MicrophoneView`,
`ResetPasswordView`, `GoogleStandInView`, `AuthLoadingView`; shared `AuthFrame`, `CodeEntry`). Mocks: `features/auth/mocks.ts`.
Prototype: `prototypes/004-auth-mock.tsx`. Walk-through: sign-up → verify (code 482913 or the one shown) → microphone →
New dub; sign-in with the demo account → My projects; Continue with Google → S6 → back.

## 2. Screen details

Common to S1–S6: i18n keys `features.auth.*`; every form is `<form noValidate>`; the primary action is one full-width `lg`
button that names the action and shows `loading` while submitting (fields disabled, `aria-busy`); a **service error** is a
danger `Alert` at the top of the panel "Couldn't reach Dubbed — Nothing was changed. Check your connection and try again."
with a small secondary **Try again** in the alert, typed values kept; field errors use the kit's `error` (aria-invalid +
describedby); the language switch is in the corner of every page. Passwords and codes never appear in the URL.

### S1 — Sign in
**Goal**: return to My projects (or the page asked for) with email + password or Google.
```
[●] Dubbed                                   EN|RU
 ┌ card 400 ───────────────────────────┐
 │ (icon user) Welcome back             │
 │ Sign in to continue your dubs.       │
 │ [Alert: wrong / locked / Google-only / service error / Google notice]
 │ [G Continue with Google]  secondary lg
 │ ───────── or ─────────
 │ Email · Password (show) · Forgot password? (right)
 │ [Sign in] primary lg
 │ [Alert warning "Demo account" demo@dubbed.test · dubbed-demo  [Fill in]]  demo mode only
 ├──────────────────────────────────────┤
 │ No account yet? Create account       │
 └──────────────────────────────────────┘
```
| State (`?state=`) | What the user sees |
|---|---|
| default | form + demo-account hint |
| no-demo | the same without the demo hint (real adapter) |
| submitting | fields disabled, Sign in shows "Signing in…" and a shimmer |
| field-errors | empty/malformed email, empty password: messages under the fields, nothing sent |
| wrong-credentials | danger Alert "Email or password is wrong" (never says which); email kept, password cleared |
| locked | warning Alert "Too many tries — Signing in with this email is paused. Try again in 0:42." (counts down); Sign in disabled |
| google-only | info Alert "This account uses Google — Continue with Google below, or set a password." (link to reset) |
| service-error | danger Alert + Try again; typed values kept |
| google-cancelled / google-failed | info / danger Alert after returning from S6; nothing changed |

### S2 — Sign up
Same panel, icon sparkles, step bar 1 of 3. The password hint "At least 8 characters." is shown **before** submit; a short
password replaces it with the error. Terms line from the template is **dropped** (no Terms pages exist — open question 1).
States: `default`, `submitting`, `field-errors` (email + password), `email-taken` (warning Alert "An account with this email
already exists" with links **Sign in** · **Reset password**; typed email kept), `service-error`, `google-cancelled`,
`google-failed`. Footer: Already have an account? Sign in.

### S3 — Email code (step 2 of 3)
Icon mail · "Check your email" · "We sent a 6-digit code to **name@…**." · `OtpInput` (6 boxes, separator, paste and
one-time-code autofill, resend countdown "Resend in 0:47" from 60 s) · demo notice · footer link "Use a different email".
| State | What the user sees |
|---|---|
| default | empty boxes, resend countdown, demo notice with the code |
| resend-ready | countdown over: "Resend code" shown |
| no-demo | without the demo notice |
| verifying | boxes shimmer, input locked |
| wrong-code | boxes shake and clear, "That code is wrong. 4 tries left." |
| attempts | danger Alert "Too many wrong codes — This code no longer works. Request a new one." + primary **Send a new code** (disabled with "Send a new code in 0:23" while the 60 s rule applies) |
| expired | warning Alert "This code has expired — Codes work for 10 minutes. Request a new one." + **Send a new code** |
| verified | green pill "Email confirmed", then the microphone step opens |
| service-error | danger Alert + Try again; the typed code stays |
| change-email | panel "Use a different email" · field "New email" · [Send code] · footer link "Back to the code" |
| change-email-submitting / -taken / -service-error | loading; field error "An account with this email already exists. Use another email."; service alert |
Demo notice (warning Alert, demo mode only, FR-006): "Demo only — no email is really sent · Your code is 482 913." The real
adapter passes no code, so it cannot render.

### S4 — Microphone check (step 3 of 3), mandatory, no skip
Icon mic · "Check your microphone" · "Say a few words — you'll record every line with it." · device `Select` (several devices) or
a read-only row (one device) · thin `LevelMeter` · status line · [Finish setup] primary · footer "Headphones recommended"
(recommended, never required).
| State | What the user sees |
|---|---|
| asking | no device row, meter empty, spinner + "Waiting for permission — choose Allow in your browser's prompt." Finish disabled |
| listening | live level; "Say something…"; Finish disabled |
| heard | green "We hear you"; Finish enabled |
| silent | after 10 s without voice: info Alert "We can't hear you yet — Speak a little louder or choose another microphone." (one device: "…check that the microphone isn't muted."); Finish disabled |
| single-device | heard with a read-only device row |
| blocked | red mic-off tile · "Your microphone is blocked" · 3 steps how to allow · [Try again] primary |
| missing | "No microphone found — Connect a microphone or a headset, then try again." · [Try again] |
| finishing | Finish "Finishing…" shimmer, select disabled |
| service-error | danger Alert + Try again (re-runs Finish); microphone stays open |
After Finish: toast "Welcome! 120 credits added" and New dub opens.

### S5 — Reset password
Step 1 (email): icon lock · "Reset your password" · "We'll email you a code to set a new one." · Email · [Send code] · footer
Back to sign in. States `email`, `email-submitting`, `email-error` (field), `email-too-soon` (warning Alert "Wait a moment —
You can ask for another code in 0:28."; button disabled), `email-service-error`.
Step 2 (code only): icon mail · "Check your email" · "If an account exists for **name@…**, we sent a 6-digit code." (the
same sentence for known and unknown emails) · `OtpInput` (checks itself when the 6th digit is entered; paste and autofill work) ·
demo notice · footer link "Use a different email". States `code`, `code-unknown` (demo notice says no account has this email, so
no code was sent), `no-demo`, `code-verifying`, `code-wrong` ("That code is wrong. 4 tries left."), `code-attempts`,
`code-expired` (same dead-code block and "Send a new code" as S3), `code-service-error`. No password field here.
Step 3 (new password, twice) — shown **only after a correct code**: icon lock · "Set a new password" · "Code confirmed. Choose a
new password." · **New password** (hint "At least 8 characters.") · **Repeat new password** · [Set password and sign in]. No demo
notice, no footer. States: `password`, `password-mismatch` (error under the repeat field "The passwords don't match.",
nothing sent), `password-weak` (error under the first field "Use at least 8 characters."), `password-submitting`,
`password-service-error` (danger Alert + Try again, typed passwords kept), `password-expired` (the 10 minutes after the correct
code ran out: warning Alert "This step has expired — More than 10 minutes passed after your code was confirmed. Start the reset
again." + primary **Start again**, which returns to step 1). Sign-up keeps one password field.

### S6 — Google stand-in (mock only)
Outside the product like the Checkout stand-in: brand + language, panel with icon user, "Choose an account · to continue to
Dubbed", warning Alert "Demo page — not the real Google · No real account is used. Pick a demo account or type any email.",
radio group (Alex Rivera, Sam Lee with their `@example.com` emails, "Another email" → email field), [Continue] primary,
footer link Cancel (back to `from` with the S1/S2 notice). The Google logo is not used. States `default`, `submitting`,
`other-email`, `field-error`, `failed` (error panel "Couldn't reach Google" + Try again + Cancel; demo preset `google:fail`).

### S7 — Loading
Skeleton card in the panel's shape, `aria-busy`, h1 "Loading" for screen readers.

### S8 — Shell account menu
`AppShell` unchanged except the user block: the account menu shows the **session's email** as its name, plus the email line
only when a Google name exists (name = Google name, line = email). Avatar initials from the shown name. Sign out is real
(no longer a "demo" toast). Prototype `shell?state=email|google-name` — click the avatar. Phone sheet: email in the footer.
Shell edit: `Shells.tsx` hides the second line when name equals email.

## 3. Copy (EN / RU) — keys under `features.auth.`

| Key | EN | RU |
|---|---|---|
| continueGoogle | Continue with Google | Продолжить через Google |
| or / email / password | or / Email / Password | или / Почта / Пароль |
| service.title / text | Couldn't reach Dubbed / Nothing was changed. Check your connection and try again. | Не удалось связаться с Dubbed / Ничего не изменилось. Проверьте соединение и повторите. |
| googleNotice | Google sign-in was cancelled — You're still signed out. · Couldn't continue with Google — Try again, or continue with your email. | Вход через Google отменён — Вы по-прежнему не вошли. · Не удалось продолжить через Google — Повторите или продолжите по почте. |
| errors.email | Enter your email address. · Enter a full email address, like name@example.com. | Введите адрес почты. · Введите почту полностью, например name@example.com. |
| errors.password | Enter your password. · Create a password. · Use at least 8 characters. | Введите пароль. · Придумайте пароль. · Нужно не меньше 8 символов. |
| signIn | Welcome back · Sign in to continue your dubs. · Sign in / Signing in… · Forgot password? · No account yet? Create account · Email or password is wrong / Check them and try again. · Too many tries / Signing in with this email is paused. Try again in {time}. · This account uses Google / Continue with Google below, or set a password · Demo account · Fill in | С возвращением · Войдите, чтобы продолжить озвучку. · Войти / Входим… · Забыли пароль? · Ещё нет аккаунта? Создать аккаунт · Неверная почта или пароль / Проверьте данные и попробуйте снова. · Слишком много попыток / Вход с этой почтой приостановлен. Повторите через {time}. · Этот аккаунт создан через Google / Продолжите через Google ниже или задайте пароль · Демо-аккаунт · Подставить |
| signUp | Create your account · 120 credits to start — about two minutes of dubbing. · Create account / Creating account… · At least 8 characters. · Already have an account? Sign in · An account with this email already exists · Reset password | Создайте аккаунт · 120 кредитов на старт — около двух минут озвучки. · Создать аккаунт / Создаём аккаунт… · Не меньше 8 символов. · Уже есть аккаунт? Войти · Аккаунт с такой почтой уже есть · Сбросить пароль |
| verify | Check your email · We sent a 6-digit code to {email}. · Use a different email · New email · Send code · Back to the code · An account with this email already exists. Use another email. | Проверьте почту · Мы отправили 6-значный код на {email}. · Указать другую почту · Новая почта · Отправить код · Вернуться к коду · Аккаунт с такой почтой уже есть. Укажите другую. |
| code | Verification code · That code is wrong. {n} try/tries left. · Email confirmed · New code sent · Too many wrong codes / This code no longer works. Request a new one. · This code has expired / Codes work for 10 minutes. Request a new one. · Send a new code / Send a new code in {time} | Код подтверждения · Неверный код. Осталась/Осталось {n} попытка/попытки/попыток. · Почта подтверждена · Новый код отправлен · Слишком много неверных кодов / Этот код больше не действует. Запросите новый. · Срок действия кода истёк / Код действует 10 минут. Запросите новый. · Отправить новый код / Новый код через {time} |
| demoCode | Demo only — no email is really sent · Your code is {code}. · No account has this email, so no code was sent. A real visitor sees the same page. | Только демо — письмо на самом деле не отправляется · Ваш код — {code}. · Аккаунта с такой почтой нет, поэтому код не отправлялся. Обычный посетитель увидит ту же страницу. |
| mic | Check your microphone · Say a few words — you'll record every line with it. · Microphone · Microphone level · Waiting for permission — choose Allow in your browser's prompt. · Say something… · We hear you · We can't hear you yet / Speak a little louder or choose another microphone. · Finish setup / Finishing… · Welcome! 120 credits added · Headphones recommended · Your microphone is blocked / Dubbed needs your microphone to record your voice. · 1 Click the lock icon next to the address bar. 2 Set Microphone to Allow. 3 Come back and press Try again. · No microphone found / Connect a microphone or a headset, then try again. | Проверьте микрофон · Скажите пару слов — с ним вы будете записывать каждую реплику. · Микрофон · Уровень микрофона · Ждём разрешения — выберите «Разрешить» в запросе браузера. · Скажите что-нибудь… · Мы вас слышим · Пока вас не слышно / Говорите чуть громче или выберите другой микрофон. · Завершить настройку / Завершаем… · Добро пожаловать! Начислено 120 кредитов · Лучше в наушниках · Микрофон заблокирован / Dubbed нужен микрофон, чтобы записать ваш голос. · 1 Нажмите на значок замка рядом с адресной строкой. 2 Для «Микрофон» выберите «Разрешить». 3 Вернитесь и нажмите «Повторить». · Микрофон не найден / Подключите микрофон или гарнитуру и повторите. |
| reset | Reset your password · We'll email you a code to set a new one. · Send code / Sending… · Back to sign in · Wait a moment / You can ask for another code in {time}. · Check your email · If an account exists for {email}, we sent a 6-digit code. · Set a new password · Code confirmed. Choose a new password. · New password · Repeat new password · The passwords don't match. · Set password and sign in / Saving… · This step has expired / More than 10 minutes passed after your code was confirmed. Start the reset again. · Start again | Сброс пароля · Мы пришлём на почту код, чтобы задать новый пароль. · Отправить код / Отправляем… · Вернуться ко входу · Подождите немного / Новый код можно запросить через {time}. · Проверьте почту · Если аккаунт с почтой {email} существует, мы отправили на неё 6-значный код. · Новый пароль · Код подтверждён. Придумайте новый пароль. · Новый пароль · Повторите новый пароль · Пароли не совпадают. · Задать пароль и войти / Сохраняем… · Время на этот шаг истекло / После подтверждения кода прошло больше 10 минут. Начните сброс заново. · Начать заново |
| google | Choose an account · to continue to Dubbed · Demo page — not the real Google / No real account is used. Pick a demo account or type any email. · Account · Another email · Continue / Continuing… · Cancel · Couldn't reach Google / Nothing was changed. Try again, or cancel and use your email. | Выберите аккаунт · чтобы продолжить в Dubbed · Демо-страница, а не настоящий Google / Настоящий аккаунт не используется. Выберите демо-аккаунт или введите любую почту. · Аккаунт · Другая почта · Продолжить / Продолжаем… · Отменить · Не удалось связаться с Google / Ничего не изменилось. Повторите или отмените и продолжите по почте. |

Full strings: `frontend/src/i18n/locales/en.ts` / `ru.ts` → `features.auth`.

## 4. Interactions, responsive, test hooks

- Enter submits; Tab order follows the panel; focus rings are the components'. The code boxes accept paste and phone autofill.
- Double submit sends one request (button is `loading`). Wrong-credentials focuses the password field (page job).
- Responsive: one column at every width; panel padding 32/24 → 24/16 below 1024; at 390 the Demo-account "Fill in" wraps under
  the text; inputs 16px; all primary actions are visible at 390 × 844 (verified in screenshots); no horizontal scroll.
- Test hooks: roles and labels first (Email, Password, "Verification code" group, "Microphone level" meter); `data-testid`
  `signin-page` `signup-page` `verify-page` `microphone-page` `reset-page` `google-page` `auth-loading` (each with
  `data-state`), `signin-form` `signup-form` `reset-email-form` `reset-code-form` `verify-change-form` `google-form`,
  `auth-submit` `auth-google` `auth-error` `auth-locked` `auth-google-only` `auth-email-taken` `auth-notice`
  `auth-service-error` `auth-demo-account` `auth-demo-code` `auth-code` `auth-code-dead` `auth-new-code` `mic-finish`
  `mic-retry` `mic-heard` `mic-silent` `mic-how-to` `mic-device` `google-cancel` `google-retry`.

## 5. Components

Kit: `Card`, `IconTile`, `TextField`, `PasswordField`, `OtpInput`, `Select`, `RadioGroup`, `Alert`, `Button`, `TextLink`,
`Spinner`, `SkeletonText`; media `LevelMeter`; shells `Brand`, `LanguageSwitch`. New (feature-local, in `features/auth/views`,
not kit): `AuthFrame` (page frame + `Panel`, copied from the Auth template / Checkout stand-in), `CodeEntry` (OtpInput + dead-code
block), `LinkButton` (a footer action that looks like `TextLink`). No new styleguide section needed; they repeat the
approved template.

## 6. Data contract for views

```ts
SignInViewProps   { state: "default"|"submitting"|"wrong-credentials"|"locked"|"google-only"|"service-error"; notice?; initial?; fieldErrors?; lockedSeconds?; demo?; hrefs; onSubmit; onGoogle }
SignUpViewProps   { state: "default"|"submitting"|"email-taken"|"service-error"; notice?; initial?; fieldErrors?; hrefs; onSubmit; onGoogle }
VerifyViewProps   { state: <verify states>; email; attemptsLeft?; resendIn; newCodeIn?; demoCode?; initialCode?; fieldError?; hrefs; onVerify; onResend; onOpenChangeEmail; onCloseChangeEmail; onChangeEmail }
MicrophoneViewProps { phase: "asking"|"listening"|"heard"|"silent"|"blocked"|"missing"; level; devices; deviceId; onDevice; finishing?; serviceError?; hrefs; onRetry; onFinish }
ResetPasswordViewProps { state: <reset states>; email; fieldErrors? (email); passwordErrors? { password: required|short; repeat: required|mismatch }; tooSoonSeconds?; attemptsLeft?; resendIn; newCodeIn?; demoCode?; demoUnknown?; initial?; hrefs; onSendCode; onResend; onCheckCode(code); onFinish({ password, repeat }); onChangeEmail; onRestart }
GoogleStandInViewProps { state: "default"|"submitting"|"failed"; identities; fieldError?; initialOther?; hrefs; onContinue; onCancel; onRetry }
```
Validation (email format, ≥ 8 characters) is done by the page with `services/rules/auth.ts` and passed as `fieldErrors`; the
views never fetch or read the URL. Seconds (`lockedSeconds`, `newCodeIn`) are counted down by the page.

## 7. Open questions

1. The template's "By creating an account you agree to the Terms and the Privacy policy." was dropped: there are no such pages.
2. The Google stand-in derives the name of a typed email from its local part (the contract needs `name`).
3. `ProductShell` still shows the fixed user until implementation; only the shell's rendering rule changed here.

## 8. Revision log

| Round | Date | Feedback (owner) | Changes made |
|---|---|---|---|
| 1 | 2026-11-16 | — (first review) | — |
| 2 | 2026-11-17 | Reset: the new-password field only after a correct code (separate pages for the code and the password), and the new password entered twice | Reset is now three steps: email -> code only -> new password + repeat. Before: step 2 held the code and the new password together (`code-field-errors`, `code-submitting`). After: S5 step 2 = code only (checks itself on the 6th digit); step 3 (`password`, `password-mismatch`, `password-weak`, `password-submitting`, `password-service-error`, `password-expired`) appears only after a correct code, with New password + Repeat new password and a mismatch error on the repeat field; an expired ticket offers Start again. Sign-up unchanged (one password field). |
| 3 | 2026-11-17 | Design QA round 1: a failed resend was invisible and a reload restarted the 60 s countdown — owner: "давай как лучше" (use the approved common service-error alert) | New state `resend-error` on S3 and S5 step 2: the common danger service alert at the top of the panel, Try again repeats the resend, the typed code stays, the countdown and the "new code" announcement start only after a successful send. The resend countdown is restored from the last send's deadline after a reload; with no known deadline "Resend code" shows at once and the service's too-soon reply starts the real countdown. Toaster mounted on the implemented auth routes. Prototype states `verify?state=resend-error`, `reset?state=resend-error`. |

## 9. Approval

- Approved by the product owner on: 2026-11-17 ("утверждаю" in chat after the localhost review of round 2). Open questions 1–3 stand as designed.
- Screenshots: `specs/004-auth-mock/design/screens/` (every screen × state × 1440 / 390 × EN / RU; 268 files, final round 2 — reset re-snapped in round 2, all other screens unchanged since round 1).
