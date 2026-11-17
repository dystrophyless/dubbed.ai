import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Stack } from "@/components/layout";
import { Button, TextField } from "@/components/ui";
import { AuthPage, DemoCodeNotice, K, LinkButton, Panel, ServiceAlert, type EmailIssue } from "./AuthFrame";
import { CodeEntry, type CodeStatus } from "./CodeEntry";
import s from "./auth.module.css";

export type VerifyViewState =
  | "default" | "verifying" | "wrong-code" | "attempts" | "expired" | "verified" | "service-error"
  | "change-email" | "change-email-submitting" | "change-email-taken" | "change-email-service-error";

export type VerifyViewProps = {
  state: VerifyViewState;
  /** the address the code was sent to (named on the page) */
  email: string;
  /** wrong tries left (state wrong-code) */
  attemptsLeft?: number;
  /** seconds until a resend is possible (60 s rule) */
  resendIn: number;
  /** the absolute deadline (ms) of the cooldown; a code field that remounts counts from it */
  resendAt?: number;
  /** changes after every successful send so the countdown restarts */
  resendKey?: number;
  /** the last "Resend code" could not reach the service: the service alert offers Try again for the resend */
  resendError?: boolean;
  /** a resend request is in flight: the code field, change email and Try again are disabled until it returns */
  resending?: boolean;
  /** states attempts / expired: seconds until a new code may be requested */
  newCodeIn?: number;
  /** demo mode only: the code that was "sent"; absent on the real adapter */
  demoCode?: string;
  /** typed values kept across errors */
  initialCode?: string;
  fieldError?: EmailIssue;
  hrefs: { home: string };
  onVerify: (code: string) => void;
  onResend: () => void;
  /** opens the change-email form / goes back to the code */
  onOpenChangeEmail: () => void;
  onCloseChangeEmail: () => void;
  onChangeEmail: (email: string) => void;
};

const STATUS: Partial<Record<VerifyViewState, CodeStatus>> = {
  verifying: "verifying", "wrong-code": "wrong", attempts: "attempts", expired: "expired", verified: "verified",
};

export function VerifyView(p: VerifyViewProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState(p.initialCode ?? "");
  const [newEmail, setNewEmail] = useState("");
  const changing = p.state.startsWith("change-email");
  const changingBusy = p.state === "change-email-submitting";

  if (changing) {
    const error = p.fieldError ? t(`${K}.errors.email.${p.fieldError}`) : p.state === "change-email-taken" ? t(`${K}.verify.changeTaken`) : undefined;
    return (
      <AuthPage testId="verify-page" state={p.state} brandHref={p.hrefs.home}>
        <Panel
          icon="email"
          step={2}
          title={t(`${K}.verify.changeTitle`)}
          subtitle={t(`${K}.verify.changeSubtitle`)}
          busy={changingBusy}
          footer={<LinkButton disabled={changingBusy} onClick={p.onCloseChangeEmail}>{t(`${K}.verify.backToCode`)}</LinkButton>}
        >
          <form onSubmit={(e) => { e.preventDefault(); if (!changingBusy) p.onChangeEmail(newEmail); }} noValidate aria-busy={changingBusy || undefined} data-testid="verify-change-form">
            <Stack gap={16}>
              {p.state === "change-email-service-error" && <ServiceAlert onRetry={() => p.onChangeEmail(newEmail)} />}
              <TextField
                label={t(`${K}.verify.newEmail`)}
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                placeholder={t(`${K}.emailPlaceholder`)}
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                error={error}
                disabled={changingBusy}
              />
              <div className={s.full}>
                <Button type="submit" size="lg" loading={changingBusy} data-testid="auth-submit">{t(`${K}.verify.sendCode`)}</Button>
              </div>
            </Stack>
          </form>
        </Panel>
      </AuthPage>
    );
  }

  const status: CodeStatus = STATUS[p.state] ?? "idle";
  const done = status === "verified" || status === "verifying";
  return (
    <AuthPage testId="verify-page" state={p.state} brandHref={p.hrefs.home}>
      <Panel
        icon="email"
        step={2}
        title={t(`${K}.verify.title`)}
        subtitle={<Trans i18nKey={`${K}.verify.subtitle`} values={{ email: p.email }} components={{ b: <strong className={s.strong} /> }} />}
        busy={status === "verifying"}
        footer={<LinkButton disabled={done || p.resending} onClick={p.onOpenChangeEmail}>{t(`${K}.verify.changeEmail`)}</LinkButton>}
      >
        <Stack gap={16}>
          {p.state === "service-error" ? <ServiceAlert disabled={p.resending} onRetry={() => p.onVerify(code)} /> : p.resendError && <ServiceAlert onRetry={p.onResend} />}
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
            onComplete={p.onVerify}
            onResend={p.onResend}
            onNewCode={p.onResend}
            autoFocus
          />
          <DemoCodeNotice code={p.demoCode} />
        </Stack>
      </Panel>
    </AuthPage>
  );
}

