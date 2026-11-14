import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitch } from "@/app/shells/LanguageSwitch";
import { Brand } from "@/app/shells/Shells";
import { StateSwitcher } from "@/components/dev/StateSwitcher";
import { useViewState } from "@/components/dev/view-state";
import { Icon, type IconName } from "@/components/icons";
import { Stack } from "@/components/layout";
import { LevelMeter } from "@/components/media";
import { Alert, Button, Card, IconTile, OtpInput, PasswordField, Select, Text, TextField, TextLink, Toaster, toast, type OtpStatus } from "@/components/ui";
import { DEMO_DEVICES, DEMO_USER } from "./mocks";
import s from "./templates.module.css";

export const AUTH_STATES = ["sign-in", "sign-up", "submitting", "error", "verify", "verify-error", "microphone", "microphone-blocked", "reset"] as const;

/*
 * Auth — /styleguide/templates/auth. No app bar: brand top-left, EN/RU top-right.
 * One panel in the Clean language (otp-input reference): icon tile · step · title · one line — the form — and the
 * alternative action in the panel's footer behind a hairline. Sign-up = account → email code → microphone (mandatory).
 */
export function AuthTemplate() {
  const state = useViewState(AUTH_STATES);
  return (
    <div className={s.auth}>
      <div className={s.authTop}>
        <Brand to="/styleguide/templates" />
        <LanguageSwitch />
      </div>
      <main className={s.authMain} id="main">
        {state === "sign-in" || state === "error" ? <SignIn error={state === "error"} />
          : state === "sign-up" || state === "submitting" ? <SignUp submitting={state === "submitting"} />
          : state === "verify" || state === "verify-error" ? <Verify failed={state === "verify-error"} />
          : state === "microphone" || state === "microphone-blocked" ? <Microphone blocked={state === "microphone-blocked"} />
          : <Reset />}
      </main>
      <Toaster />
      <StateSwitcher states={AUTH_STATES} />
    </div>
  );
}

function Panel({ icon, step, title, subtitle, children, footer }: { icon: IconName; step?: number; title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <Card padding="none" className={s.authCard}>
      <div className={s.authBody}>
        <div className={s.authHead}>
          <span className={s.authIcon}><IconTile icon={icon} tone={icon === "micOff" ? "danger" : "accent"} size={40} /></span>
          {step && (
            <span className={s.stepBar} role="img" aria-label={t("tpl.auth.step", { n: step, total: 3 })}>
              {[1, 2, 3].map((n) => <span key={n} className={s.stepSeg} data-done={n <= step ? "" : undefined} />)}
            </span>
          )}
          <h1 className={s.authTitle}>{title}</h1>
          {subtitle && <p className={s.authSubtitle}>{subtitle}</p>}
        </div>
        {children}
      </div>
      {footer && <div className={s.authFooter}>{footer}</div>}
    </Card>
  );
}

function Google({ label }: { label: string }) {
  return (
    <div className={s.full}>
      <Button variant="secondary" size="lg" icon={<img className={s.googleMark} src="/brand/google.svg" alt="" />} onClick={() => toast({ tone: "info", title: label })}>
        {label}
      </Button>
    </div>
  );
}

function SignIn({ error }: { error: boolean }) {
  const { t } = useTranslation();
  return (
    <Panel
      icon="user"
      title={t("tpl.auth.signInTitle")}
      subtitle={t("tpl.auth.signInSubtitle")}
      footer={<>{t("tpl.auth.noAccount")} <TextLink to="/styleguide/templates/auth?state=sign-up">{t("tpl.auth.createAccount")}</TextLink></>}
    >
      <form onSubmit={(e) => { e.preventDefault(); toast({ title: t("tpl.auth.signedIn") }); }}>
        <Stack gap={16}>
          {error && <Alert tone="danger" title={t("tpl.auth.wrongCredentials")} />}
          <Google label={t("tpl.auth.google")} />
          <div className={s.or}>{t("tpl.auth.or")}</div>
          <TextField label={t("tpl.auth.email")} type="email" autoComplete="email" defaultValue={error ? DEMO_USER.email : ""} placeholder="name@example.com" />
          <Stack gap={6}>
            <PasswordField label={t("tpl.auth.password")} autoComplete="current-password" defaultValue={error ? "wrong-pass" : ""} />
            <div className={s.rowEnd}><TextLink to="/styleguide/templates/auth?state=reset">{t("tpl.auth.forgot")}</TextLink></div>
          </Stack>
          <div className={s.full}><Button type="submit" size="lg">{t("tpl.auth.signIn")}</Button></div>
        </Stack>
      </form>
    </Panel>
  );
}

function SignUp({ submitting }: { submitting: boolean }) {
  const { t } = useTranslation();
  return (
    <Panel
      icon="magic"
      step={1}
      title={t("tpl.auth.signUpTitle")}
      subtitle={t("tpl.auth.signUpSubtitle")}
      footer={<>{t("tpl.auth.haveAccount")} <TextLink to="/styleguide/templates/auth">{t("tpl.auth.signIn")}</TextLink></>}
    >
      <form onSubmit={(e) => e.preventDefault()} aria-busy={submitting || undefined}>
        <Stack gap={16}>
          <Google label={t("tpl.auth.googleSignUp")} />
          <div className={s.or}>{t("tpl.auth.or")}</div>
          <TextField label={t("tpl.auth.email")} type="email" autoComplete="email" placeholder="name@example.com" defaultValue={submitting ? DEMO_USER.email : ""} disabled={submitting} />
          <PasswordField label={t("tpl.auth.password")} autoComplete="new-password" hint={t("tpl.auth.passwordHint")} defaultValue={submitting ? "correct horse" : ""} disabled={submitting} />
          <div className={s.full}><Button type="submit" size="lg" loading={submitting}>{t("tpl.auth.createAccount")}</Button></div>
          <Text size="sm" tone="muted" className={s.center}>{t("tpl.auth.terms")}</Text>
        </Stack>
      </form>
    </Panel>
  );
}

function Verify({ failed }: { failed: boolean }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<OtpStatus>(failed ? "error" : "idle");
  return (
    <Panel
      icon="email"
      step={2}
      title={t("tpl.auth.verifyTitle")}
      subtitle={<>{t("tpl.auth.verifySubtitlePre")} <strong className={s.strong}>{DEMO_USER.email}</strong></>}
      footer={<TextLink to="/styleguide/templates/auth?state=sign-up">{t("tpl.auth.changeEmail")}</TextLink>}
    >
      <Stack gap={12}>
        <OtpInput
          length={6}
          separator
          align="center"
          autoFocus
          status={status}
          defaultValue={failed ? "111111" : ""}
          label={t("tpl.auth.code")}
          errorMessage={t("tpl.auth.codeError")}
          successLabel={t("tpl.auth.verified")}
          onChange={() => status === "error" && setStatus("idle")}
          onComplete={(code) => { setStatus("verifying"); window.setTimeout(() => setStatus(code === "482913" ? "success" : "error"), 900); }}
          onResend={() => toast({ title: t("tpl.auth.codeSent") })}
        />
        <Text size="sm" tone="muted" className={s.center}>{t("tpl.auth.demoCode")}</Text>
      </Stack>
    </Panel>
  );
}

function Microphone({ blocked }: { blocked: boolean }) {
  const { t } = useTranslation();
  const [device, setDevice] = useState<string>("default");
  const [level, setLevel] = useState(0);
  const [heard, setHeard] = useState(false);
  useEffect(() => {
    if (blocked) return;
    let n = 0;
    const id = window.setInterval(() => {
      n += 1;
      // demo only: a voice-like level so the meter can be judged; real pages read the microphone
      setLevel(n % 14 < 9 ? 0.35 + Math.random() * 0.3 : Math.random() * 0.08);
      if (n === 18) setHeard(true);
    }, 90);
    return () => window.clearInterval(id);
  }, [blocked, device]);
  if (blocked) {
    return (
      <Panel icon="micOff" step={3} title={t("tpl.auth.micBlockedTitle")} subtitle={t("tpl.auth.micBlockedText")}>
        <Stack gap={16}>
          <ol className={s.steps}>
            <li>{t("tpl.auth.micStep1")}</li>
            <li>{t("tpl.auth.micStep2")}</li>
            <li>{t("tpl.auth.micStep3")}</li>
          </ol>
          <div className={s.full}><Button size="lg" icon={<Icon name="retry" />} onClick={() => toast({ tone: "info", title: t("tpl.auth.micAsking") })}>{t("kit.retry")}</Button></div>
        </Stack>
      </Panel>
    );
  }
  return (
    <Panel icon="record" step={3} title={t("tpl.auth.micTitle")} subtitle={t("tpl.auth.micSubtitle")} footer={<span className={s.footHint}><Icon name="headphones" size={14} />{t("tpl.auth.micHeadphonesShort")}</span>}>
      <Stack gap={16}>
        <Select label={t("tpl.auth.micDevice")} value={device} onChange={setDevice} options={DEMO_DEVICES.map((d) => ({ value: d.value, label: d.label }))} />
        <Stack gap={8}>
          <LevelMeter level={level} label={t("tpl.auth.micLevel")} />
          {heard ? (
            <span className={s.heard} role="status"><Icon name="success" size={14} />{t("tpl.auth.micHeard")}</span>
          ) : (
            <Text size="sm" tone="muted">{t("tpl.auth.micSay")}</Text>
          )}
        </Stack>
        <div className={s.full}><Button size="lg" disabled={!heard} onClick={() => toast({ title: t("tpl.auth.welcome") })}>{t("tpl.auth.micContinue")}</Button></div>
      </Stack>
    </Panel>
  );
}

function Reset() {
  const { t } = useTranslation();
  return (
    <Panel
      icon="password"
      title={t("tpl.auth.resetTitle")}
      subtitle={t("tpl.auth.resetSubtitle")}
      footer={<TextLink to="/styleguide/templates/auth">{t("tpl.auth.backToSignIn")}</TextLink>}
    >
      <form onSubmit={(e) => { e.preventDefault(); toast({ title: t("tpl.auth.codeSent") }); }}>
        <Stack gap={16}>
          <TextField label={t("tpl.auth.email")} type="email" autoComplete="email" placeholder="name@example.com" />
          <div className={s.full}><Button type="submit" size="lg">{t("tpl.auth.sendCode")}</Button></div>
        </Stack>
      </form>
    </Panel>
  );
}
