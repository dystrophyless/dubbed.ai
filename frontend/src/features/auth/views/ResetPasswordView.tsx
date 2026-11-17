import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Stack } from "@/components/layout";
import { Alert, Button, PasswordField, TextField, TextLink } from "@/components/ui";
import { AuthPage, DemoCodeNotice, K, LinkButton, Panel, ServiceAlert, clock, type EmailIssue } from "./AuthFrame";
import { CodeEntry, type CodeStatus } from "./CodeEntry";
import s from "./auth.module.css";

export type ResetViewState =
  | "email" | "email-submitting" | "email-too-soon" | "email-service-error"
  | "code" | "code-verifying" | "code-wrong" | "code-attempts" | "code-expired" | "code-service-error"
  | "password" | "password-submitting" | "password-service-error" | "password-expired";

export type ResetPasswordViewProps = {
  state: ResetViewState;
  /** the address typed on step 1; named on step 2 (the same sentence whether or not an account exists) */
  email: string;
  /** step 1 */
  fieldErrors?: { email?: EmailIssue };
  /** step 3: the first field "short" / "required"; the repeat field "required" / "mismatch" (set by the page, nothing is sent) */
  passwordErrors?: { password?: "required" | "short"; repeat?: "required" | "mismatch" };
  /** state email-too-soon: seconds until another code may be requested */
  tooSoonSeconds?: number;
  attemptsLeft?: number;
  /** seconds until "Resend code" (60 s rule) */
  resendIn: number;
  /** the absolute deadline (ms) of the cooldown; a code field that remounts counts from it */
  resendAt?: number;
  /** changes after every successful send so the countdown restarts */
  resendKey?: number;
  /** the last "Resend code" could not reach the service: the service alert offers Try again for the resend */
  resendError?: boolean;
  /** a resend request is in flight: the code field, change email and Try again are disabled until it returns */
  resending?: boolean;
  /** states code-attempts / code-expired: seconds until a new code may be requested */
  newCodeIn?: number;
  /** demo mode only: the code that was "sent", or `demoUnknown` when no account has this email */
  demoCode?: string;
  demoUnknown?: boolean;
  /** typed values kept across errors */
  initial?: { code?: string; password?: string; repeat?: string };
  hrefs: { home: string; signIn: string };
  onSendCode: (email: string) => void;
  onResend: () => void;
  /** step 2: the 6th digit was entered */
  onCheckCode: (code: string) => void;
  /** step 3 */
  onFinish: (v: { password: string; repeat: string }) => void;
  /** step 2 footer: back to the email field */
  onChangeEmail: () => void;
  /** step 3 expired: start the reset again (back to step 1) */
  onRestart: () => void;
};

const CODE_STATUS: Partial<Record<ResetViewState, CodeStatus>> = {
  "code-verifying": "verifying", "code-wrong": "wrong", "code-attempts": "attempts", "code-expired": "expired",
};

export function ResetPasswordView(p: ResetPasswordViewProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState(p.email);
  const [code, setCode] = useState(p.initial?.code ?? "");
  const [password, setPassword] = useState(p.initial?.password ?? "");
  const [repeat, setRepeat] = useState(p.initial?.repeat ?? "");

  if (p.state.startsWith("email")) {
    const busy = p.state === "email-submitting";
    const send = () => p.onSendCode(email);
    return (
      <AuthPage testId="reset-page" state={p.state} brandHref={p.hrefs.home}>
        <Panel
          icon="password"
          title={t(`${K}.reset.title`)}
          subtitle={t(`${K}.reset.subtitle`)}
          busy={busy}
          footer={<TextLink to={p.hrefs.signIn}>{t(`${K}.reset.backToSignIn`)}</TextLink>}
        >
          <form onSubmit={(e) => { e.preventDefault(); if (!busy) send(); }} noValidate aria-busy={busy || undefined} data-testid="reset-email-form">
            <Stack gap={16}>
              {p.state === "email-too-soon" && (
                <div data-testid="auth-too-soon">
                  <Alert tone="warning" title={t(`${K}.reset.tooSoonTitle`)}>{t(`${K}.reset.tooSoonText`, { time: clock(p.tooSoonSeconds ?? 0) })}</Alert>
                </div>
              )}
              {p.state === "email-service-error" && <ServiceAlert onRetry={send} />}
              <TextField
                label={t(`${K}.email`)}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder={t(`${K}.emailPlaceholder`)}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={p.fieldErrors?.email ? t(`${K}.errors.email.${p.fieldErrors.email}`) : undefined}
                disabled={busy}
              />
              <div className={s.full}>
                <Button type="submit" size="lg" loading={busy} disabled={p.state === "email-too-soon"} data-testid="auth-submit">
                  {busy ? t(`${K}.reset.sending`) : t(`${K}.reset.sendCode`)}
                </Button>
              </div>
            </Stack>
          </form>
        </Panel>
      </AuthPage>
    );
  }

  if (p.state.startsWith("code")) {
    const status: CodeStatus = CODE_STATUS[p.state] ?? "idle";
    const busy = status === "verifying";
    return (
      <AuthPage testId="reset-page" state={p.state} brandHref={p.hrefs.home}>
        <Panel
          icon="email"
          title={t(`${K}.reset.codeTitle`)}
          subtitle={<Trans i18nKey={`${K}.reset.codeSubtitle`} values={{ email: p.email }} components={{ b: <strong className={s.strong} /> }} />}
          busy={busy}
          footer={<LinkButton disabled={busy || p.resending} onClick={p.onChangeEmail}>{t(`${K}.verify.changeEmail`)}</LinkButton>}
        >
          <Stack gap={16}>
            {p.state === "code-service-error" ? <ServiceAlert disabled={p.resending} onRetry={() => p.onCheckCode(code)} /> : p.resendError && <ServiceAlert onRetry={p.onResend} />}
            <CodeEntry
              status={status}
              disabled={p.resending}
              attemptsLeft={p.attemptsLeft}
              resendIn={p.resendIn}
              resendAt={p.resendAt}
              resendKey={p.resendKey}
              newCodeIn={p.newCodeIn}
              value={code}
              onChange={setCode}
              onComplete={p.onCheckCode}
              onResend={p.onResend}
              onNewCode={p.onResend}
              autoFocus
            />
            <DemoCodeNotice code={p.demoCode} unknownEmail={p.demoUnknown} />
          </Stack>
        </Panel>
      </AuthPage>
    );
  }

  /* step 3 — shown only after a correct code */
  const busy = p.state === "password-submitting";
  const expired = p.state === "password-expired";
  const finish = () => p.onFinish({ password, repeat });
  return (
    <AuthPage testId="reset-page" state={p.state} brandHref={p.hrefs.home}>
      <Panel
        icon="password"
        title={t(`${K}.reset.passwordTitle`)}
        subtitle={expired ? undefined : t(`${K}.reset.passwordSubtitle`)}
        busy={busy}
      >
        {expired ? (
          <Stack gap={12}>
            <div data-testid="auth-ticket-expired">
              <Alert tone="warning" title={t(`${K}.reset.expiredTitle`)}>{t(`${K}.reset.expiredText`)}</Alert>
            </div>
            <div className={s.full}>
              <Button type="button" size="lg" onClick={p.onRestart} data-testid="auth-restart">{t(`${K}.reset.restart`)}</Button>
            </div>
          </Stack>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); if (!busy) finish(); }} noValidate aria-busy={busy || undefined} data-testid="reset-password-form">
            <Stack gap={16}>
              {p.state === "password-service-error" && <ServiceAlert onRetry={finish} />}
              <PasswordField
                label={t(`${K}.reset.newPassword`)}
                autoComplete="new-password"
                autoFocus
                hint={t(`${K}.signUp.passwordHint`)}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={p.passwordErrors?.password ? t(`${K}.errors.password.${p.passwordErrors.password}`) : undefined}
                disabled={busy}
              />
              <PasswordField
                label={t(`${K}.reset.repeatPassword`)}
                autoComplete="new-password"
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
                error={p.passwordErrors?.repeat ? t(`${K}.errors.repeat.${p.passwordErrors.repeat}`) : undefined}
                disabled={busy}
              />
              <div className={s.full}>
                <Button type="submit" size="lg" loading={busy} data-testid="auth-submit">
                  {busy ? t(`${K}.reset.saving`) : t(`${K}.reset.save`)}
                </Button>
              </div>
            </Stack>
          </form>
        )}
      </Panel>
    </AuthPage>
  );
}
