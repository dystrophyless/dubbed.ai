import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui";
import type { EmailIssue } from "@/features/auth/views/AuthFrame";
import { ResetPasswordView, type ResetPasswordViewProps, type ResetViewState } from "@/features/auth/views/ResetPasswordView";
import { qk, useCheckResetCode, useFinishReset, useResendCode, useServices, useStartReset } from "@/services";
import { useAlive } from "@/features/auth/use-alive";
import { isEmail, isPassword, normaliseEmail, routeForStage, safeNext, signInUrl } from "@/services/rules/auth";

/*
 * S5 Reset password (feature 004, ui-spec S5 revision 2): email -> code only -> new password twice. The email and the reset
 * ticket live in page state only (never the URL, never storage); the repeat field is compared here and never sent.
 * Countdowns are counted by the page from the deadlines the service returns (`resendAt`, `until`).
 */
type Step = "email" | "code" | "password";
type PasswordErrors = NonNullable<ResetPasswordViewProps["passwordErrors"]>;

/** whole seconds until `at`, re-rendered every second while `active` */
function useSecondsUntil(at: number, active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const first = window.setTimeout(() => setNow(Date.now()), 0);
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { window.clearTimeout(first); window.clearInterval(id); };
  }, [active, at]);
  return active ? Math.max(0, Math.ceil((at - now) / 1000)) : 0;
}

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const services = useServices();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const startReset = useStartReset();
  const resend = useResendCode();
  const checkCode = useCheckResetCode();
  const finishReset = useFinishReset();
  const busy = useRef(false);
  const alive = useAlive();
  const next = safeNext(params.get("next"));
  const signInHref = next ? signInUrl(next) : "/sign-in";

  const [step, setStep] = useState<Step>("email");
  const [state, setState] = useState<ResetViewState>("email");
  const [email, setEmail] = useState("");
  const [ticket, setTicket] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<EmailIssue | undefined>();
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [attemptsLeft, setAttemptsLeft] = useState(0);
  const [resendAt, setResendAt] = useState(0);
  const [tooSoonUntil, setTooSoonUntil] = useState(0);
  const [version, setVersion] = useState(0);
  const [round, setRound] = useState(0);
  const [resendError, setResendError] = useState(false);
  /* the resend holds the busy mutex: while it runs the code field, change-email and verify retry are disabled, so no action is silently ignored */
  const [resending, setResending] = useState(false);

  const dead = state === "code-attempts" || state === "code-expired";
  const newCodeIn = useSecondsUntil(resendAt, dead);
  const tooSoonSeconds = useSecondsUntil(tooSoonUntil, state === "email-too-soon");

  /* the too-soon notice clears itself once its countdown is over */
  const shownState: ResetViewState = state === "email-too-soon" && tooSoonSeconds === 0 ? "email" : state;

  const demoCode = useQuery({
    queryKey: ["auth", "demo-code", "reset", email, version],
    enabled: !!services.demo && step === "code" && !!email,
    queryFn: async () => (await services.demo?.lastCode(email, "reset")) ?? null,
  });

  const guard = async (fn: () => Promise<void>, onFail: () => void) => {
    if (busy.current) return;
    busy.current = true;
    try { await fn(); } catch { if (alive.current) onFail(); } finally { busy.current = false; }
  };

  const onSendCode = (value: string) => guard(async () => {
    const typed = value.trim();
    if (!typed || !isEmail(typed)) { setEmailError(typed ? "invalid" : "required"); setState("email"); return; }
    setEmailError(undefined);
    setState("email-submitting");
    const res = await startReset.mutateAsync(typed);
    if (!alive.current) return;
    if (res.ok) {
      setEmail(normaliseEmail(res.value.email));
      setResendAt(res.value.resendAt);
      setVersion((n) => n + 1);
      setAttemptsLeft(0);
      setResendError(false);
      setStep("code");
      setState("code");
    } else if (res.error === "too-soon") {
      setTooSoonUntil(res.until);
      setState("email-too-soon");
    } else if (res.error === "invalid-email") { setEmailError("invalid"); setState("email"); }
    else setState("email-service-error");
  }, () => setState("email-service-error"));

  const onCheckCode = (code: string) => guard(async () => {
    setState("code-verifying");
    const res = await checkCode.mutateAsync({ email, code });
    if (!alive.current) return;
    if (res.ok) {
      setTicket(res.value.ticket);
      setStep("password");
      setState("password");
    } else if (res.error === "wrong-code") { setAttemptsLeft(res.attemptsLeft); setState("code-wrong"); }
    else if (res.error === "attempts") setState("code-attempts");
    else if (res.error === "expired") setState("code-expired");
    else setState("code-service-error");
  }, () => setState("code-service-error"));

  /* a failed resend keeps the typed code and starts no countdown: the alert's Try again repeats the resend */
  const onResend = () => guard(async () => {
    setResendError(false);
    setResending(true);
    try {
      const res = await resend.mutateAsync({ purpose: "reset", email });
      if (!alive.current) return;
      if (res.ok) {
        setResendAt(res.value.resendAt);
        setVersion((n) => n + 1);
        setAttemptsLeft(0);
        setState("code");
        toast({ title: t("features.auth.code.resent") });
      } else if (res.error === "too-soon") { setResendAt(res.until); setVersion((n) => n + 1); }
      else setResendError(true);
    } finally { if (alive.current) setResending(false); }
  }, () => setResendError(true));

  const onFinish = (v: { password: string; repeat: string }) => guard(async () => {
    const errors: PasswordErrors = {};
    if (!v.password) errors.password = "required";
    else if (!isPassword(v.password)) errors.password = "short";
    if (!v.repeat) errors.repeat = "required";
    else if (v.repeat !== v.password) errors.repeat = "mismatch";
    setPasswordErrors(errors);
    if (errors.password || errors.repeat) { setState("password"); return; }
    if (!ticket) { setState("password-expired"); return; }

    setState("password-submitting");
    const res = await finishReset.mutateAsync({ ticket, password: v.password });
    if (!alive.current) return;
    if (res.ok) {
      navigate(routeForStage(res.value.stage) ?? next ?? "/projects", { replace: true });
      client.setQueryData(qk.session, res.value);
    } else if (res.error === "expired") { setTicket(null); setState("password-expired"); }
    else if (res.error === "weak-password") { setPasswordErrors({ password: "short" }); setState("password"); }
    else setState("password-service-error");
  }, () => setState("password-service-error"));

  const backToEmail = () => {
    setTicket(null);
    setPasswordErrors({});
    setEmailError(undefined);
    setStep("email");
    setState("email");
  };

  const lookedUp = demoCode.isSuccess;
  return (
    <ResetPasswordView
      key={round}
      state={shownState}
      email={email}
      fieldErrors={{ email: emailError }}
      passwordErrors={passwordErrors}
      tooSoonSeconds={tooSoonSeconds}
      attemptsLeft={attemptsLeft}
      resendIn={0}
      resendAt={resendAt}
      resendKey={version}
      resendError={resendError}
      resending={resending}
      newCodeIn={newCodeIn}
      demoCode={demoCode.data ?? undefined}
      demoUnknown={!!services.demo && lookedUp && demoCode.data === null && !dead}
      hrefs={{ home: "/sign-in", signIn: signInHref }}
      onSendCode={onSendCode}
      onResend={onResend}
      onCheckCode={onCheckCode}
      onFinish={onFinish}
      onChangeEmail={backToEmail}
      onRestart={() => { backToEmail(); setRound((n) => n + 1); }}
    />
  );
}
