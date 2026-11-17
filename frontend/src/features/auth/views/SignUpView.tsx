import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Stack } from "@/components/layout";
import { Alert, Button, PasswordField, TextField, TextLink } from "@/components/ui";
import { AuthPage, GoogleButton, GoogleNotice, K, OrDivider, Panel, ServiceAlert, type EmailIssue } from "./AuthFrame";
import s from "./auth.module.css";

export type SignUpViewState = "default" | "submitting" | "email-taken" | "service-error";

export type SignUpViewProps = {
  state: SignUpViewState;
  notice?: "google-cancelled" | "google-failed";
  initial?: { email: string; password: string };
  /** set by the page after submit: nothing is sent while a field has an error */
  fieldErrors?: { email?: EmailIssue; password?: "required" | "short" };
  hrefs: { home: string; signIn: string; reset: string };
  onSubmit: (v: { email: string; password: string }) => void;
  onGoogle: () => void;
};

export function SignUpView(p: SignUpViewProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState(p.initial?.email ?? "");
  const [password, setPassword] = useState(p.initial?.password ?? "");
  const submitting = p.state === "submitting";
  const submit = () => p.onSubmit({ email, password });
  const emailError = p.fieldErrors?.email ? t(`${K}.errors.email.${p.fieldErrors.email}`) : undefined;
  const passwordError = p.fieldErrors?.password ? t(`${K}.errors.password.${p.fieldErrors.password}`) : undefined;

  return (
    <AuthPage testId="signup-page" state={p.state} brandHref={p.hrefs.home}>
      <Panel
        icon="magic"
        step={1}
        title={t(`${K}.signUp.title`)}
        subtitle={t(`${K}.signUp.subtitle`)}
        busy={submitting}
        footer={<>{t(`${K}.signUp.haveAccount`)} <TextLink to={p.hrefs.signIn}>{t(`${K}.signUp.signIn`)}</TextLink></>}
      >
        <form onSubmit={(e) => { e.preventDefault(); if (!submitting) submit(); }} noValidate aria-busy={submitting || undefined} data-testid="signup-form">
          <Stack gap={16}>
            {p.state === "email-taken" && (
              <div data-testid="auth-email-taken">
                <Alert tone="warning" title={t(`${K}.signUp.takenTitle`)}>
                  <span className={s.links}>
                    <TextLink to={p.hrefs.signIn}>{t(`${K}.signUp.signIn`)}</TextLink>
                    <TextLink to={p.hrefs.reset}>{t(`${K}.signUp.resetPassword`)}</TextLink>
                  </span>
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
            <PasswordField
              label={t(`${K}.password`)}
              autoComplete="new-password"
              hint={t(`${K}.signUp.passwordHint`)}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={passwordError}
              disabled={submitting}
            />
            <div className={s.full}>
              <Button type="submit" size="lg" loading={submitting} data-testid="auth-submit">
                {submitting ? t(`${K}.signUp.submitting`) : t(`${K}.signUp.submit`)}
              </Button>
            </div>
          </Stack>
        </form>
      </Panel>
    </AuthPage>
  );
}
