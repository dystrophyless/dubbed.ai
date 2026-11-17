import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Stack } from "@/components/layout";
import { Alert, Button, PasswordField, TextField, TextLink } from "@/components/ui";
import { AuthPage, GoogleButton, GoogleNotice, K, OrDivider, Panel, ServiceAlert, clock, type EmailIssue } from "./AuthFrame";
import s from "./auth.module.css";

export type SignInViewState = "default" | "submitting" | "wrong-credentials" | "locked" | "google-only" | "service-error";

export type SignInViewProps = {
  state: SignInViewState;
  /** the Google stand-in was cancelled or failed and sent the user back here */
  notice?: "google-cancelled" | "google-failed";
  /** values kept in the fields (typed before an error, or the email after wrong credentials) */
  initial?: { email: string; password: string };
  /** set by the page after a submit with an empty or malformed email / empty password */
  fieldErrors?: { email?: EmailIssue; password?: "required" };
  /** state "locked": seconds until sign-in works again (the page counts down) */
  lockedSeconds?: number;
  /** demo mode only — the ready demo account; absent on the real adapter */
  demo?: { email: string; password: string };
  hrefs: { home: string; signUp: string; reset: string };
  onSubmit: (v: { email: string; password: string }) => void;
  onGoogle: () => void;
};

export function SignInView(p: SignInViewProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState(p.initial?.email ?? "");
  const [password, setPassword] = useState(p.initial?.password ?? "");
  const submitting = p.state === "submitting";
  const locked = p.state === "locked";
  const submit = () => p.onSubmit({ email, password });
  const emailError = p.fieldErrors?.email ? t(`${K}.errors.email.${p.fieldErrors.email}`) : undefined;
  const passwordError = p.fieldErrors?.password ? t(`${K}.errors.passwordRequired`) : undefined;

  return (
    <AuthPage testId="signin-page" state={p.state} brandHref={p.hrefs.home}>
      <Panel
        icon="user"
        title={t(`${K}.signIn.title`)}
        subtitle={t(`${K}.signIn.subtitle`)}
        busy={submitting}
        footer={<>{t(`${K}.signIn.noAccount`)} <TextLink to={p.hrefs.signUp}>{t(`${K}.signIn.createAccount`)}</TextLink></>}
      >
        <form onSubmit={(e) => { e.preventDefault(); if (!submitting && !locked) submit(); }} noValidate aria-busy={submitting || undefined} data-testid="signin-form">
          <Stack gap={16}>
            {p.state === "wrong-credentials" && (
              <div data-testid="auth-error"><Alert tone="danger" title={t(`${K}.signIn.wrongTitle`)}>{t(`${K}.signIn.wrongText`)}</Alert></div>
            )}
            {locked && (
              <div data-testid="auth-locked">
                <Alert tone="warning" title={t(`${K}.signIn.lockedTitle`)}>{t(`${K}.signIn.lockedText`, { time: clock(p.lockedSeconds ?? 0) })}</Alert>
              </div>
            )}
            {p.state === "google-only" && (
              <div data-testid="auth-google-only">
                <Alert tone="info" title={t(`${K}.signIn.googleOnlyTitle`)}>
                  {t(`${K}.signIn.googleOnlyText`)} <TextLink to={p.hrefs.reset}>{t(`${K}.signIn.setPassword`)}</TextLink>
                </Alert>
              </div>
            )}
            {p.state === "service-error" && <ServiceAlert onRetry={submit} />}
            {p.notice && <GoogleNotice kind={p.notice} />}
            <GoogleButton label={t(`${K}.continueGoogle`)} onClick={p.onGoogle} disabled={submitting} />
            <OrDivider />
            <TextField
              label={t(`${K}.email`)}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={t(`${K}.emailPlaceholder`)}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={emailError}
              disabled={submitting}
            />
            <Stack gap={6}>
              <PasswordField
                label={t(`${K}.password`)}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={passwordError}
                disabled={submitting}
              />
              <div className={s.rowEnd}><TextLink to={p.hrefs.reset}>{t(`${K}.signIn.forgot`)}</TextLink></div>
            </Stack>
            <div className={s.full}>
              <Button type="submit" size="lg" loading={submitting} disabled={locked} data-testid="auth-submit">
                {submitting ? t(`${K}.signIn.submitting`) : t(`${K}.signIn.submit`)}
              </Button>
            </div>
            {p.demo && (
              <div data-testid="auth-demo-account">
                <Alert
                  tone="warning"
                  title={t(`${K}.signIn.demoTitle`)}
                  action={
                    <Button type="button" size="sm" variant="secondary" disabled={submitting} onClick={() => { setEmail(p.demo!.email); setPassword(p.demo!.password); }}>
                      {t(`${K}.signIn.demoFill`)}
                    </Button>
                  }
                >
                  <span className={s.code}>{p.demo.email}</span> · <span className={s.code}>{p.demo.password}</span>
                </Alert>
              </div>
            )}
          </Stack>
        </form>
      </Panel>
    </AuthPage>
  );
}
