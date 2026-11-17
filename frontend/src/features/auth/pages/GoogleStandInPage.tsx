import { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { EmailIssue } from "@/features/auth/views/AuthFrame";
import { GoogleStandInView, type DemoIdentity, type GoogleStandInState } from "@/features/auth/views/GoogleStandInView";
import { qk, useGoogle } from "@/services";
import { useAlive } from "@/features/auth/use-alive";
import { authUrl, isEmail, routeForStage, safeNext, signInUrl } from "@/services/rules/auth";

/*
 * S6 Google stand-in (feature 004, ui-spec S6; mock only — a real adapter would redirect to Google). Two demo identities and
 * "Another email" (the name comes from the local part of the typed address). Continue signs in or creates the account;
 * Cancel returns to the page the user came from (`from`) with a notice in router state.
 */
const HREFS = { home: "/sign-in" };
const IDENTITIES: DemoIdentity[] = [
  { id: "alex", name: "Alex Rivera", email: "alex.rivera@example.com" },
  { id: "sam", name: "Sam Lee", email: "sam.lee@example.com" },
];

export function GoogleStandInPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const client = useQueryClient();
  const google = useGoogle();
  const busy = useRef(false);
  const alive = useAlive();
  const last = useRef<{ email: string; name: string } | null>(null);
  const [state, setState] = useState<GoogleStandInState>("default");
  const [fieldError, setFieldError] = useState<EmailIssue | undefined>();

  const from = params.get("from") === "sign-up" ? "sign-up" : "sign-in";
  const next = safeNext(params.get("next"));

  const leave = (notice: "google-cancelled" | "google-failed") => {
    navigate(from === "sign-in" ? (next ? signInUrl(next) : "/sign-in") : authUrl("/sign-up", next), { state: { notice }, replace: true });
  };

  const run = async (identity: { email: string; name: string }) => {
    if (busy.current) return;
    busy.current = true;
    last.current = identity;
    setState("submitting");
    try {
      const res = await google.mutateAsync(identity);
      if (!alive.current) return;
      if (res.ok) {
        navigate(routeForStage(res.value.stage) ?? next ?? "/projects", { replace: true });
        client.setQueryData(qk.session, res.value);
        return;
      }
      setState("failed");
    } catch {
      if (alive.current) setState("failed");
    } finally {
      busy.current = false;
    }
  };

  const onContinue = (v: { email: string; name: string }) => {
    const email = v.email.trim();
    if (!email) { setFieldError("required"); return; }
    if (!isEmail(email)) { setFieldError("invalid"); return; }
    setFieldError(undefined);
    void run({ email, name: v.name || email.split("@")[0] });
  };

  return (
    <GoogleStandInView
      state={state}
      identities={IDENTITIES}
      fieldError={fieldError}
      hrefs={HREFS}
      onContinue={onContinue}
      onCancel={() => leave(state === "failed" ? "google-failed" : "google-cancelled")}
      onRetry={() => { if (last.current) void run(last.current); else setState("default"); }}
    />
  );
}
