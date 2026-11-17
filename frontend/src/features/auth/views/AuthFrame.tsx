import type { ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
import { LanguageSwitch } from "@/app/shells/LanguageSwitch";
import { Brand } from "@/app/shells/Shells";
import type { IconName } from "@/components/icons";
import { Alert, Button, Card, IconTile } from "@/components/ui";
import s from "./auth.module.css";

export const K = "features.auth" as const;

/** "0:42" — the clock used by every countdown on the auth pages */
export const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

/** "482913" -> "482 913" */
export const spaced = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`;

/*
 * The Auth archetype's frame: no app bar — brand top-left, EN/RU top-right, one centred panel (form 400).
 * Used by every auth page and by the mock Google stand-in.
 */
export function AuthPage({ testId, state, brandHref, children }: { testId: string; state: string; brandHref: string; children: ReactNode }) {
  return (
    <div className={s.page} data-testid={testId} data-state={state}>
      <header className={s.top}>
        <Brand to={brandHref} />
        <LanguageSwitch />
      </header>
      <main className={s.main} id="main">
        {children}
      </main>
    </div>
  );
}

/** icon tile · optional "Step n of 3" bar · title (18px) · one line · the form · alternative action behind a hairline */
export function Panel({
  icon, tone = "accent", step, title, subtitle, children, footer, busy, testId,
}: {
  icon: IconName; tone?: "accent" | "success" | "danger"; step?: 1 | 2 | 3; title: ReactNode; subtitle?: ReactNode;
  children?: ReactNode; footer?: ReactNode; busy?: boolean; testId?: string;
}) {
  const { t } = useTranslation();
  return (
    <Card padding="none" className={s.card} aria-busy={busy || undefined} data-testid={testId}>
      <div className={s.body}>
        <div className={s.head}>
          <span className={s.icon}><IconTile icon={icon} tone={tone} size={40} /></span>
          {step && (
            <span className={s.stepBar} role="img" aria-label={t(`${K}.step`, { n: step, total: 3 })}>
              {[1, 2, 3].map((n) => <span key={n} className={s.stepSeg} data-done={n <= step ? "" : undefined} />)}
            </span>
          )}
          <h1 className={s.title}>{title}</h1>
          {subtitle && <p className={s.subtitle}>{subtitle}</p>}
        </div>
        {children}
      </div>
      {footer && <div className={s.footer}>{footer}</div>}
    </Card>
  );
}

export function GoogleButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <div className={s.full}>
      <Button type="button" variant="secondary" size="lg" disabled={disabled} icon={<img className={s.googleMark} src="/brand/google.svg" alt="" />} onClick={onClick} data-testid="auth-google">
        {label}
      </Button>
    </div>
  );
}

export function OrDivider() {
  const { t } = useTranslation();
  return <div className={s.or}>{t(`${K}.or`)}</div>;
}

/** The service error every page shares: what happened, that nothing changed, Try again (typed values stay in the fields) */
export function ServiceAlert({ onRetry, disabled }: { onRetry: () => void; disabled?: boolean }) {
  const { t } = useTranslation();
  return (
    <div data-testid="auth-service-error">
      <Alert
        tone="danger"
        title={t(`${K}.service.title`)}
        action={<Button type="button" size="sm" variant="secondary" disabled={disabled} onClick={onRetry}>{t("kit.retry")}</Button>}
      >
        {t(`${K}.service.text`)}
      </Alert>
    </div>
  );
}

/** Notice after the Google stand-in was cancelled or failed (sign-in and sign-up) */
export function GoogleNotice({ kind }: { kind: "google-cancelled" | "google-failed" }) {
  const { t } = useTranslation();
  return (
    <div data-testid="auth-notice" data-kind={kind}>
      <Alert tone={kind === "google-failed" ? "danger" : "info"} title={t(`${K}.googleNotice.${kind === "google-failed" ? "failedTitle" : "cancelledTitle"}`)}>
        {t(`${K}.googleNotice.${kind === "google-failed" ? "failedText" : "cancelledText"}`)}
      </Alert>
    </div>
  );
}

/** Demo-only notice on the code pages (FR-006). The real adapter never passes `code`, so it cannot appear there. */
export function DemoCodeNotice({ code, unknownEmail }: { code?: string; unknownEmail?: boolean }) {
  const { t } = useTranslation();
  if (!code && !unknownEmail) return null;
  return (
    <div data-testid="auth-demo-code">
      <Alert tone="warning" title={t(`${K}.demoCode.title`)}>
        {unknownEmail ? t(`${K}.demoCode.unknown`) : (
          <Trans i18nKey={`${K}.demoCode.text`} values={{ code: spaced(code ?? "") }} components={{ b: <span className={s.code} /> }} />
        )}
      </Alert>
    </div>
  );
}

export type EmailIssue = "required" | "invalid";

/** A footer action that is not a route (back to the code, use a different email, cancel). */
export function LinkButton({ onClick, disabled, children, testId }: { onClick: () => void; disabled?: boolean; children: ReactNode; testId?: string }) {
  return <button type="button" className={s.linkButton} onClick={onClick} disabled={disabled} data-testid={testId}>{children}</button>;
}
