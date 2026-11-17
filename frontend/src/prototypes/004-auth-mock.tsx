import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { AppShell } from "@/app/shells/Shells";
import { StateSwitcher } from "@/components/dev/StateSwitcher";
import { useViewState } from "@/components/dev/view-state";
import { Toaster, toast } from "@/components/ui";
import { DEMO_ACCOUNT, DEMO_CODE, GOOGLE_IDENTITIES, MIC_DEVICES, SHELL_USERS, TYPED } from "@/features/auth/mocks";
import { AuthLoadingView } from "@/features/auth/views/AuthLoadingView";
import { GoogleStandInView, type GoogleStandInState } from "@/features/auth/views/GoogleStandInView";
import { MicrophoneView, type MicPhase } from "@/features/auth/views/MicrophoneView";
import { ResetPasswordView, type ResetViewState } from "@/features/auth/views/ResetPasswordView";
import { SignInView, type SignInViewState } from "@/features/auth/views/SignInView";
import { SignUpView, type SignUpViewState } from "@/features/auth/views/SignUpView";
import { VerifyView, type VerifyViewState } from "@/features/auth/views/VerifyView";
import { LIFECYCLE_PROJECTS, demoCancelInfo, prototypeHref } from "@/features/recording-flow-mock/mocks";
import { ProjectsView } from "@/features/recording-flow-mock/views/ProjectsView";

/*
 * Feature 004 — sign-up and sign-in on mock services. Auth archetype, one View per page; every state from the ui-spec
 * is reachable with ?state=. Submits are simulated so the whole path can be walked:
 *   sign-up -> verify (code 482913) -> microphone -> New dub;  sign-in (demo account) -> My projects;
 *   Continue with Google -> /google -> back (continue / cancel);  Forgot password -> reset -> My projects.
 *   /prototypes/004-auth-mock/sign-in?state=default|no-demo|submitting|field-errors|wrong-credentials|locked|google-only|service-error|google-cancelled|google-failed
 *   /prototypes/004-auth-mock/sign-up?state=default|submitting|field-errors|email-taken|service-error|google-cancelled|google-failed
 *   /prototypes/004-auth-mock/verify?state=default|resend-ready|resend-error|no-demo|verifying|wrong-code|attempts|expired|verified|service-error|change-email|change-email-submitting|change-email-taken|change-email-service-error
 *   /prototypes/004-auth-mock/microphone?state=asking|listening|heard|silent|single-device|blocked|missing|finishing|service-error
 *   /prototypes/004-auth-mock/reset?state=email|email-submitting|email-error|email-too-soon|email-service-error|code|code-unknown|no-demo|resend-error|code-verifying|code-wrong|code-attempts|code-expired|code-service-error|password|password-mismatch|password-weak|password-submitting|password-service-error|password-expired
 *   /prototypes/004-auth-mock/google?state=default|submitting|other-email|field-error|failed&from=sign-in|sign-up
 *   /prototypes/004-auth-mock/shell?state=email|google-name   (the account menu; click the avatar)
 *   /prototypes/004-auth-mock/loading
 */
const BASE = "/prototypes/004-auth-mock";
const SIGN_IN = `${BASE}/sign-in`;
const SIGN_UP = `${BASE}/sign-up`;
const PROJECTS = "/prototypes/001-recording-flow-mock/projects";
const NEW_DUB = "/prototypes/new-dub/page";

export const SIGN_IN_STATES = ["default", "no-demo", "submitting", "field-errors", "wrong-credentials", "locked", "google-only", "service-error", "google-cancelled", "google-failed"] as const;
export const SIGN_UP_STATES = ["default", "submitting", "field-errors", "email-taken", "service-error", "google-cancelled", "google-failed"] as const;
export const VERIFY_STATES = ["default", "resend-ready", "resend-error", "no-demo", "verifying", "wrong-code", "attempts", "expired", "verified", "service-error", "change-email", "change-email-submitting", "change-email-taken", "change-email-service-error"] as const;
export const MIC_STATES = ["asking", "listening", "heard", "silent", "single-device", "blocked", "missing", "finishing", "service-error"] as const;
export const RESET_STATES = ["email", "email-submitting", "email-error", "email-too-soon", "email-service-error", "code", "code-unknown", "no-demo", "resend-error", "code-verifying", "code-wrong", "code-attempts", "code-expired", "code-service-error", "password", "password-mismatch", "password-weak", "password-submitting", "password-service-error", "password-expired"] as const;
export const GOOGLE_STATES = ["default", "submitting", "other-email", "field-error", "failed"] as const;
export const SHELL_STATES = ["email", "google-name"] as const;
export const LOADING_STATES = ["default"] as const;

/** the URL state, overridden by what the user does on the page until the URL state changes */
function useLocalState<T extends string>(url: T) {
  const [o, setO] = useState<{ url: T; v: T } | null>(null);
  const v = o && o.url === url ? o.v : url;
  return [v, (n: T) => setO({ url, v: n })] as const;
}

function useLater() {
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  return (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
}

/** counts a number of seconds down to 0 (the pages' own countdowns: lockout, new code) */
function useCountdown(from: number) {
  const [left, setLeft] = useState(from);
  useEffect(() => {
    if (left <= 0) return;
    const id = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [left]);
  return left;
}

const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/* ---------------- sign in ---------------- */

export function SignInPrototype() {
  const urlState = useViewState(SIGN_IN_STATES);
  const [state, setState] = useLocalState(urlState);
  const navigate = useNavigate();
  const later = useLater();
  const locked = useCountdown(42);
  const [errors, setErrors] = useState<{ email?: "required" | "invalid"; password?: "required" }>(urlState === "field-errors" ? { email: "invalid", password: "required" } : {});
  const view: SignInViewState = state === "no-demo" || state === "field-errors" || state === "google-cancelled" || state === "google-failed" ? "default" : state;
  const typed = ["wrong-credentials", "service-error", "submitting", "field-errors"].includes(state);
  return (
    <>
      <SignInView
        key={`${urlState}:${state}`}
        state={view}
        notice={state === "google-cancelled" || state === "google-failed" ? state : undefined}
        initial={state === "field-errors" ? { email: "mia.carter@", password: "" } : state === "google-only" ? { email: "alex.rivera@example.com", password: TYPED.password } : typed ? { email: TYPED.email, password: state === "wrong-credentials" ? "" : TYPED.password } : undefined}
        fieldErrors={state === "field-errors" ? errors : undefined}
        lockedSeconds={locked}
        demo={state === "no-demo" ? undefined : DEMO_ACCOUNT}
        hrefs={{ home: SIGN_IN, signUp: SIGN_UP, reset: `${BASE}/reset` }}
        onSubmit={(v) => {
          const e = !v.email.trim() ? "required" : !validEmail(v.email) ? "invalid" : undefined;
          const pw = v.password ? undefined : "required";
          if (e || pw) { setErrors({ email: e, password: pw }); setState("field-errors"); return; }
          setState("submitting");
          later(() => {
            if (v.email.trim().toLowerCase() === DEMO_ACCOUNT.email && v.password === DEMO_ACCOUNT.password) navigate(PROJECTS);
            else setState("wrong-credentials");
          }, 900);
        }}
        onGoogle={() => navigate(`${BASE}/google?from=sign-in`)}
      />
      <StateSwitcher states={SIGN_IN_STATES} />
      <Toaster />
    </>
  );
}

/* ---------------- sign up ---------------- */

export function SignUpPrototype() {
  const urlState = useViewState(SIGN_UP_STATES);
  const [state, setState] = useLocalState(urlState);
  const navigate = useNavigate();
  const later = useLater();
  const [errors, setErrors] = useState<{ email?: "required" | "invalid"; password?: "required" | "short" }>(urlState === "field-errors" ? { email: "invalid", password: "short" } : {});
  const view: SignUpViewState = state === "field-errors" || state === "google-cancelled" || state === "google-failed" ? "default" : state;
  return (
    <>
      <SignUpView
        key={`${urlState}:${state}`}
        state={view}
        notice={state === "google-cancelled" || state === "google-failed" ? state : undefined}
        initial={state === "field-errors" ? { email: "mia.carter@", password: "secret" } : ["submitting", "email-taken", "service-error"].includes(state) ? { email: state === "email-taken" ? DEMO_ACCOUNT.email : TYPED.email, password: TYPED.password } : undefined}
        fieldErrors={state === "field-errors" ? errors : undefined}
        hrefs={{ home: SIGN_IN, signIn: SIGN_IN, reset: `${BASE}/reset` }}
        onSubmit={(v) => {
          const e = !v.email.trim() ? "required" : !validEmail(v.email) ? "invalid" : undefined;
          const pw = !v.password ? "required" : v.password.length < 8 ? "short" : undefined;
          if (e || pw) { setErrors({ email: e, password: pw }); setState("field-errors"); return; }
          setState("submitting");
          later(() => {
            if (v.email.trim().toLowerCase() === DEMO_ACCOUNT.email) setState("email-taken");
            else navigate(`${BASE}/verify?email=${encodeURIComponent(v.email.trim())}`);
          }, 900);
        }}
        onGoogle={() => navigate(`${BASE}/google?from=sign-up`)}
      />
      <StateSwitcher states={SIGN_UP_STATES} />
      <Toaster />
    </>
  );
}

/* ---------------- verify ---------------- */

export function VerifyPrototype() {
  const { t } = useTranslation();
  const urlState = useViewState(VERIFY_STATES);
  const [params] = useSearchParams();
  const [state, setState] = useLocalState(urlState);
  const [left, setLeft] = useState(4);
  const [code, setCode] = useState(DEMO_CODE);
  const navigate = useNavigate();
  const later = useLater();
  const email = params.get("email") ?? TYPED.email;
  const view: VerifyViewState = state === "resend-ready" || state === "resend-error" || state === "no-demo" ? "default" : state;
  const dead = useCountdown(state === "attempts" ? 23 : 0);
  return (
    <>
      <VerifyView
        key={`${urlState}:${state}`}
        state={view}
        email={email}
        attemptsLeft={left}
        resendIn={state === "resend-ready" ? 0 : urlState === "default" || urlState === "no-demo" ? 48 : 0}
        resendError={state === "resend-error"}
        newCodeIn={dead}
        demoCode={state === "no-demo" ? undefined : code}
        initialCode={state === "wrong-code" ? "111111" : state === "verifying" || state === "verified" || state === "service-error" || state === "resend-error" ? code : undefined}
        hrefs={{ home: SIGN_IN }}
        onVerify={(c) => {
          if (c === code) {
            setState("verifying");
            later(() => { setState("verified"); later(() => navigate(`${BASE}/microphone?state=listening`), 900); }, 700);
          } else if (left <= 1) setState("attempts");
          else { setLeft((n) => n - 1); setState("wrong-code"); }
        }}
        onResend={() => {
          setCode(String(100000 + Math.floor(Math.random() * 900000)));
          setLeft(4);
          setState("default");
          toast({ title: t("features.auth.code.resent") });
        }}
        onOpenChangeEmail={() => setState("change-email")}
        onCloseChangeEmail={() => setState("default")}
        onChangeEmail={(v) => {
          if (!validEmail(v)) { toast({ tone: "danger", title: t("features.auth.errors.email.invalid") }); return; }
          setState("change-email-submitting");
          later(() => { setState("default"); toast({ title: t("features.auth.code.resent") }); }, 900);
        }}
        fieldError={undefined}
      />
      <StateSwitcher states={VERIFY_STATES} />
      <Toaster />
    </>
  );
}

/* ---------------- microphone ---------------- */

/** a stand-in for the analyser: a voice-like level so the meter can be judged; real pages read the microphone */
function useFakeLevel(mode: "off" | "quiet" | "voice") {
  const [level, setLevel] = useState(0);
  useEffect(() => {
    if (mode === "off") return;
    let n = 0;
    const id = window.setInterval(() => {
      n += 1;
      setLevel(mode === "voice" ? (n % 14 < 9 ? 0.35 + Math.random() * 0.3 : Math.random() * 0.08) : Math.random() * 0.05);
    }, 90);
    return () => window.clearInterval(id);
  }, [mode]);
  return mode === "off" ? 0 : level;
}

export function MicrophonePrototype() {
  const urlState = useViewState(MIC_STATES);
  const [state, setState] = useLocalState(urlState);
  const [device, setDevice] = useState("default");
  const navigate = useNavigate();
  const later = useLater();
  const { t } = useTranslation();
  const phase: MicPhase = state === "single-device" || state === "finishing" || state === "service-error" ? "heard" : state;
  const level = useFakeLevel(phase === "heard" ? "voice" : phase === "listening" || phase === "silent" ? "quiet" : "off");
  return (
    <>
      <MicrophoneView
        phase={phase}
        level={level}
        devices={state === "single-device" ? MIC_DEVICES.slice(0, 1) : MIC_DEVICES}
        deviceId={device}
        onDevice={setDevice}
        finishing={state === "finishing"}
        serviceError={state === "service-error"}
        hrefs={{ home: BASE + "/sign-in" }}
        onRetry={() => { setState("asking"); later(() => setState("listening"), 1200); }}
        onFinish={() => {
          setState("finishing");
          later(() => { toast({ title: t("features.auth.mic.welcome") }); later(() => navigate(NEW_DUB), 900); }, 900);
        }}
      />
      <StateSwitcher states={MIC_STATES} />
      <Toaster />
    </>
  );
}

/* ---------------- reset password: email -> code -> new password (twice) ---------------- */

export function ResetPrototype() {
  const { t } = useTranslation();
  const urlState = useViewState(RESET_STATES);
  const [state, setState] = useLocalState(urlState);
  const [email, setEmail] = useState(TYPED.email);
  const [unknown, setUnknown] = useState(false);
  const [left, setLeft] = useState(4);
  const [errors, setErrors] = useState<{ password?: "required" | "short"; repeat?: "required" | "mismatch" }>(
    urlState === "password-mismatch" ? { repeat: "mismatch" } : urlState === "password-weak" ? { password: "short" } : {},
  );
  const navigate = useNavigate();
  const later = useLater();
  const tooSoon = useCountdown(28);
  const dead = useCountdown(state === "code-attempts" ? 23 : 0);
  const view: ResetViewState =
    state === "email-error" ? "email"
    : state === "code-unknown" || state === "no-demo" || state === "resend-error" ? "code"
    : state === "password-mismatch" || state === "password-weak" ? "password"
    : state;
  const passwordStep = view.startsWith("password");
  return (
    <>
      <ResetPasswordView
        key={urlState}
        state={view}
        email={view.startsWith("email") ? (state === "email-error" ? "mia.carter@" : TYPED.email) : email}
        fieldErrors={state === "email-error" ? { email: "invalid" } : undefined}
        passwordErrors={passwordStep ? errors : undefined}
        tooSoonSeconds={tooSoon}
        attemptsLeft={left}
        resendIn={state === "code" || state === "code-unknown" || state === "no-demo" ? 48 : 0}
        resendError={state === "resend-error"}
        newCodeIn={dead}
        demoCode={state === "no-demo" || state === "code-unknown" || unknown ? undefined : DEMO_CODE}
        demoUnknown={state === "code-unknown" || unknown}
        initial={
          state === "code-wrong" ? { code: "111111" }
          : state === "code-verifying" || state === "code-service-error" || state === "resend-error" ? { code: DEMO_CODE }
          : state === "password-mismatch" ? { password: TYPED.password, repeat: "correct horse battery stapl" }
          : state === "password-weak" ? { password: "secret", repeat: "secret" }
          : state === "password-submitting" || state === "password-service-error" ? { password: TYPED.password, repeat: TYPED.password }
          : undefined
        }
        hrefs={{ home: SIGN_IN, signIn: SIGN_IN }}
        onSendCode={(v) => {
          if (!validEmail(v)) { setState("email-error"); return; }
          setState("email-submitting");
          later(() => { setEmail(v.trim()); setUnknown(v.trim().toLowerCase() !== DEMO_ACCOUNT.email); setState("code"); }, 900);
        }}
        onResend={() => { setLeft(4); setState("code"); toast({ title: t("features.auth.code.resent") }); }}
        onCheckCode={(c) => {
          if (c === DEMO_CODE && !unknown) {
            setState("code-verifying");
            later(() => { setErrors({}); setState("password"); }, 800);
          } else if (left <= 1) setState("code-attempts");
          else { setLeft((n) => n - 1); setState("code-wrong"); }
        }}
        onFinish={(v) => {
          const e = {
            password: !v.password ? "required" as const : v.password.length < 8 ? "short" as const : undefined,
            repeat: !v.repeat ? "required" as const : v.repeat !== v.password ? "mismatch" as const : undefined,
          };
          if (e.password || e.repeat) { setErrors(e); setState(e.password ? "password-weak" : "password-mismatch"); return; }
          setState("password-submitting");
          later(() => navigate(PROJECTS), 900);
        }}
        onChangeEmail={() => setState("email")}
        onRestart={() => setState("email")}
      />
      <StateSwitcher states={RESET_STATES} />
      <Toaster />
    </>
  );
}

/* ---------------- Google stand-in ---------------- */

export function GooglePrototype() {
  const urlState = useViewState(GOOGLE_STATES);
  const [params] = useSearchParams();
  const from = params.get("from") === "sign-up" ? "sign-up" : "sign-in";
  const [state, setState] = useLocalState(urlState);
  const navigate = useNavigate();
  const later = useLater();
  const view: GoogleStandInState = state === "other-email" || state === "field-error" ? "default" : state;
  return (
    <>
      <GoogleStandInView
        key={`${urlState}:${state}`}
        state={view}
        identities={GOOGLE_IDENTITIES}
        initialOther={state === "other-email" ? "" : state === "field-error" ? "mia.carter@" : undefined}
        fieldError={state === "field-error" ? "invalid" : undefined}
        hrefs={{ home: SIGN_IN }}
        onContinue={(v) => {
          if (!validEmail(v.email)) { setState("field-error"); return; }
          setState("submitting");
          later(() => navigate(from === "sign-up" ? `${BASE}/microphone?state=listening` : PROJECTS), 900);
        }}
        onCancel={() => navigate(`${BASE}/${from}?state=google-cancelled`)}
        onRetry={() => { setState("submitting"); later(() => setState("default"), 900); }}
      />
      <StateSwitcher states={GOOGLE_STATES} />
    </>
  );
}

/* ---------------- shell: the account menu (R12) ---------------- */

export function ShellPrototype() {
  const { t } = useTranslation();
  const state = useViewState(SHELL_STATES);
  const navigate = useNavigate();
  return (
    <>
      <AppShell
        credits={120}
        user={state === "google-name" ? SHELL_USERS.google : SHELL_USERS.email}
        links={{ home: PROJECTS, credits: "/styleguide/templates/credits", settings: "/styleguide/templates/settings" }}
        onSignOut={() => navigate(`${SIGN_IN}?state=no-demo`)}
        nav={[
          { to: PROJECTS, label: t("tpl.nav.projects"), icon: "projects" },
          { to: NEW_DUB, label: t("tpl.nav.newDub"), icon: "add" },
        ]}
      >
        <ProjectsView
          state="default"
          projects={LIFECYCLE_PROJECTS.slice(0, 3)}
          slotsTotal={2}
          slotsOffer="first"
          hrefOf={prototypeHref}
          cancelInfo={demoCancelInfo}
          onRename={() => undefined}
          onDelete={() => undefined}
          onNewDub={() => undefined}
          onBuyCredits={() => undefined}
          onRetry={() => undefined}
        />
      </AppShell>
      <StateSwitcher states={SHELL_STATES} />
    </>
  );
}

export function LoadingPrototype() {
  return (
    <>
      <AuthLoadingView brandHref={SIGN_IN} />
      <StateSwitcher states={LOADING_STATES} />
    </>
  );
}
