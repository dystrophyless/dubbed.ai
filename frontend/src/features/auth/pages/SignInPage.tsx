import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { SignInView, type SignInViewProps } from "@/features/auth/views/SignInView";
import { qk, useServices, useSignIn } from "@/services";
import { isEmail, routeForStage, safeNext } from "@/services/rules/auth";

/*
 * S1 Sign in (feature 004, ui-spec S1). Validates before sending; one request per press. Wrong credentials keep the email,
 * clear and focus the password (the view is remounted with `initial`); a lock counts down from the service's `until`.
 * The password never reaches the URL; `next` is read through `safeNext`.
 */
const HREFS = { home: "/sign-in", signUp: "/sign-up", reset: "/reset-password" };
const DEMO = { email: "demo@dubbed.test", password: "dubbed-demo" };

type FieldErrors = NonNullable<SignInViewProps["fieldErrors"]>;

export function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const client = useQueryClient();
  const services = useServices();
  const signIn = useSignIn();
  const busy = useRef(false);
  const [state, setState] = useState<SignInViewProps["state"]>("default");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [lockedUntil, setLockedUntil] = useState(0);
  const [lockedSeconds, setLockedSeconds] = useState(0);
  const [kept, setKept] = useState<{ email: string; password: string } | undefined>();
  const [round, setRound] = useState(0);
  const notice = (location.state as { notice?: SignInViewProps["notice"] } | null)?.notice;

  useEffect(() => {
    if (state !== "locked") return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
      setLockedSeconds(left);
      if (left === 0) setState("default");
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [state, lockedUntil]);

  useEffect(() => {
    if (round === 0) return;
    document.querySelector<HTMLInputElement>('[data-testid="signin-form"] input[autocomplete="current-password"]')?.focus();
  }, [round]);

  const onSubmit = async (v: { email: string; password: string }) => {
    if (busy.current) return;
    const email = v.email.trim();
    const errors: FieldErrors = {};
    if (!email) errors.email = "required";
    else if (!isEmail(email)) errors.email = "invalid";
    if (!v.password) errors.password = "required";
    setFieldErrors(errors);
    if (errors.email || errors.password) { setState("default"); return; }

    busy.current = true;
    setState("submitting");
    try {
      const res = await signIn.mutateAsync({ email, password: v.password });
      if (res.ok) {
        client.setQueryData(qk.session, res.value);
        navigate(routeForStage(res.value.stage) ?? safeNext(params.get("next")) ?? "/projects", { replace: true });
        return;
      }
      if (res.error === "wrong-credentials") {
        setKept({ email, password: "" });
        setRound((n) => n + 1);
        setState("wrong-credentials");
      } else if (res.error === "locked") {
        setKept({ email, password: "" });
        setRound((n) => n + 1);
        setLockedUntil(res.until);
        setState("locked");
      } else if (res.error === "google-only") {
        setKept({ email, password: "" });
        setRound((n) => n + 1);
        setState("google-only");
      } else setState("service-error");
    } catch {
      setState("service-error");
    } finally {
      busy.current = false;
    }
  };

  return (
    <SignInView
      key={kept ? `kept-${round}` : "fresh"}
      state={state}
      notice={notice}
      initial={kept}
      fieldErrors={fieldErrors}
      lockedSeconds={lockedSeconds}
      demo={services.demo ? DEMO : undefined}
      hrefs={HREFS}
      onSubmit={onSubmit}
      onGoogle={() => {
        const next = safeNext(params.get("next"));
        navigate(`/auth/google?from=sign-in${next ? `&next=${encodeURIComponent(next)}` : ""}`);
      }}
    />
  );
}
