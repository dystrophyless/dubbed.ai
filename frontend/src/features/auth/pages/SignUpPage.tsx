import { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { saveResendDeadline } from "@/features/auth/resend-deadline";
import { SignUpView, type SignUpViewProps } from "@/features/auth/views/SignUpView";
import { useSignUp } from "@/services";
import { isEmail, isPassword } from "@/services/rules/auth";

/*
 * S2 Sign up (feature 004, ui-spec S2). Validates before sending; a service failure keeps the typed values (the View stays
 * mounted and owns them); one request per press. The code page gets the send deadline through router state, never the URL.
 */
const HREFS = { home: "/sign-in", signIn: "/sign-in", reset: "/reset-password" };

type FieldErrors = NonNullable<SignUpViewProps["fieldErrors"]>;

export function SignUpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const signUp = useSignUp();
  const busy = useRef(false);
  const [state, setState] = useState<SignUpViewProps["state"]>("default");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const notice = (location.state as { notice?: SignUpViewProps["notice"] } | null)?.notice;

  const onSubmit = async (v: { email: string; password: string }) => {
    if (busy.current) return;
    const errors: FieldErrors = {};
    if (!v.email.trim()) errors.email = "required";
    else if (!isEmail(v.email.trim())) errors.email = "invalid";
    if (!v.password) errors.password = "required";
    else if (!isPassword(v.password)) errors.password = "short";
    setFieldErrors(errors);
    if (errors.email || errors.password) { setState("default"); return; }

    busy.current = true;
    setState("submitting");
    try {
      const res = await signUp.mutateAsync({ email: v.email.trim(), password: v.password });
      if (res.ok) {
        saveResendDeadline(res.value.email, res.value.resendAt); // the session guard may reach the code page first
        navigate("/sign-up/verify", { state: { resendAt: res.value.resendAt } });
        return;
      }
      if (res.error === "email-taken") setState("email-taken");
      else if (res.error === "invalid-email") { setFieldErrors({ email: "invalid" }); setState("default"); }
      else if (res.error === "weak-password") { setFieldErrors({ password: "short" }); setState("default"); }
      else setState("service-error");
    } catch {
      setState("service-error");
    } finally {
      busy.current = false;
    }
  };

  return (
    <SignUpView
      state={state}
      notice={notice}
      fieldErrors={fieldErrors}
      hrefs={HREFS}
      onSubmit={onSubmit}
      onGoogle={() => navigate("/auth/google?from=sign-up")}
    />
  );
}
