import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui";
import type { EmailIssue } from "@/features/auth/views/AuthFrame";
import { readResendDeadline, saveResendDeadline } from "@/features/auth/resend-deadline";
import { VerifyView, type VerifyViewState } from "@/features/auth/views/VerifyView";
import { qk, useChangeEmail, useResendCode, useServices, useSession, useVerifyEmail } from "@/services";
import { useAlive } from "@/features/auth/use-alive";
import { isEmail } from "@/services/rules/auth";

/*
 * S3 Email code (feature 004, ui-spec S3). The page owns the countdowns (the resend deadline comes from the service:
 * `resendAt` on a send, `until` on too-soon), the wrong-code / attempts / expired mapping and the change-email form.
 * The demo notice reads `services.demo?.lastCode` and is absent on a real adapter (FR-006).
 */
const HREFS = { home: "/sign-in" };

/** whole seconds until `at`, re-rendered every second while `active` */
function useSecondsUntil(at: number, active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return active ? Math.max(0, Math.ceil((at - now) / 1000)) : 0;
}

export function VerifyPage() {
  const { t } = useTranslation();
  const services = useServices();
  const client = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const session = useSession();
  const verify = useVerifyEmail();
  const resend = useResendCode();
  const changeEmail = useChangeEmail();
  const busy = useRef(false);
  const alive = useAlive();

  const [state, setState] = useState<VerifyViewState>("default");
  const [attemptsLeft, setAttemptsLeft] = useState(0);
  const [email, setEmail] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<EmailIssue | undefined>();
  const [version, setVersion] = useState(0);
  const [resendAt, setResendAt] = useState(() => Math.max((location.state as { resendAt?: number } | null)?.resendAt ?? 0, readResendDeadline(session.data?.email ?? "")));
  const [resendError, setResendError] = useState(false);
  /* the resend holds the busy mutex: while it runs the code field, change-email and verify retry are disabled, so no action is silently ignored */
  const [resending, setResending] = useState(false);

  const shownEmail = email ?? session.data?.email ?? "";
  /* keep the deadline across a reload (it also covers the one handed over by sign-up in the navigation state) */
  useEffect(() => { if (shownEmail && resendAt > 0) saveResendDeadline(shownEmail, resendAt); }, [shownEmail, resendAt]);
  const dead = state === "attempts" || state === "expired";
  const newCodeIn = useSecondsUntil(resendAt, dead);

  const demoCode = useQuery({
    queryKey: ["auth", "demo-code", shownEmail, version],
    enabled: !!services.demo && !!shownEmail,
    queryFn: async () => (await services.demo?.lastCode(shownEmail, "verify")) ?? null,
  });

  const guard = async (fn: () => Promise<void>, onFail: () => void) => {
    if (busy.current) return;
    busy.current = true;
    try { await fn(); } catch { if (alive.current) onFail(); } finally { busy.current = false; }
  };

  const sent = (value: { email: string; resendAt: number }) => {
    setEmail(value.email);
    setResendAt(value.resendAt);
    setVersion((n) => n + 1);
    setAttemptsLeft(0);
    setState("default");
    toast({ title: t("features.auth.code.resent") });
  };

  const onVerify = (code: string) => guard(async () => {
    setState("verifying");
    const res = await verify.mutateAsync(code);
    if (!alive.current) return;
    if (res.ok) {
      setState("verified");
      navigate("/sign-up/microphone", { replace: true });
      client.setQueryData(qk.session, res.value);
    } else if (res.error === "wrong-code") { setAttemptsLeft(res.attemptsLeft); setState("wrong-code"); }
    else if (res.error === "attempts") setState("attempts");
    else if (res.error === "expired") setState("expired");
    else setState("service-error");
  }, () => setState("service-error"));

  /* a failed resend keeps the typed code and starts no countdown: the alert's Try again repeats the resend */
  const onResend = () => guard(async () => {
    setResendError(false);
    setResending(true);
    try {
      const res = await resend.mutateAsync({ purpose: "verify" });
      if (!alive.current) return;
      if (res.ok) sent(res.value);
      else if (res.error === "too-soon") { setResendAt(res.until); setVersion((n) => n + 1); }
      else setResendError(true);
    } finally { if (alive.current) setResending(false); }
  }, () => setResendError(true));

  const onChangeEmail = (value: string) => guard(async () => {
    const next = value.trim();
    if (!next || !isEmail(next)) { setFieldError(next ? "invalid" : "required"); setState("change-email"); return; }
    setFieldError(undefined);
    setState("change-email-submitting");
    const res = await changeEmail.mutateAsync(next);
    if (!alive.current) return;
    if (res.ok) sent(res.value);
    else if (res.error === "email-taken") setState("change-email-taken");
    else if (res.error === "invalid-email") { setFieldError("invalid"); setState("change-email"); }
    else setState("change-email-service-error");
  }, () => setState("change-email-service-error"));

  return (
    <VerifyView
      state={state}
      email={shownEmail}
      attemptsLeft={attemptsLeft}
      resendIn={0}
      resendAt={resendAt}
      resendKey={version}
      resendError={resendError}
      resending={resending}
      newCodeIn={newCodeIn}
      demoCode={demoCode.data ?? undefined}
      fieldError={fieldError}
      hrefs={HREFS}
      onVerify={onVerify}
      onResend={onResend}
      onOpenChangeEmail={() => { setFieldError(undefined); setState("change-email"); }}
      onCloseChangeEmail={() => setState("default")}
      onChangeEmail={onChangeEmail}
    />
  );
}
