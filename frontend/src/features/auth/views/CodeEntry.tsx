import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Stack } from "@/components/layout";
import { Alert, Button, OtpInput, type OtpStatus } from "@/components/ui";
import { K, clock } from "./AuthFrame";
import s from "./auth.module.css";

export type CodeStatus = "idle" | "verifying" | "wrong" | "attempts" | "expired" | "verified";

/*
 * The 6-digit code field shared by the sign-up code page and the password reset. OtpInput does the boxes, paste and
 * one-time-code autofill, the wrong-code shake and the resend countdown; a dead code (5 wrong tries, or 10 minutes)
 * swaps the field for an explanation and one "Send a new code" button.
 */
export function CodeEntry({
  status, attemptsLeft = 0, resendIn, resendAt, resendKey = 0, newCodeIn = 0, value, onChange, onComplete, onResend, onNewCode, autoFocus, disabled,
}: {
  /** a resend is in flight: the field, its resend button and the new-code button are off until it returns */
  disabled?: boolean;
  status: CodeStatus;
  /** changes after every successful send: the countdown restarts from `resendIn` (see CodeBoxes) */
  resendKey?: number;
  /** wrong tries left, shown with the wrong-code message */
  attemptsLeft?: number;
  /** seconds until "Resend code" is possible (the 60 s rule); OtpInput counts down itself */
  resendIn: number;
  /** the absolute deadline (ms): every new code field counts from it, whatever `resendIn` says */
  resendAt?: number;
  /** status attempts / expired: seconds until a new code may be requested (0 = now); the page counts down */
  newCodeIn?: number;
  value: string;
  onChange: (code: string) => void;
  /** the last digit was entered: the verify page checks it at once; the reset page just waits for the password */
  onComplete?: (code: string) => void;
  onResend: () => void;
  onNewCode: () => void;
  autoFocus?: boolean;
}) {
  const { t } = useTranslation();
  if (status === "attempts" || status === "expired") {
    return (
      <Stack gap={12}>
        <div data-testid="auth-code-dead" data-kind={status}>
          <Alert tone={status === "attempts" ? "danger" : "warning"} title={t(`${K}.code.${status}Title`)}>{t(`${K}.code.${status}Text`)}</Alert>
        </div>
        <div className={s.full}>
          <Button type="button" size="lg" disabled={newCodeIn > 0 || disabled} onClick={onNewCode} data-testid="auth-new-code">
            {newCodeIn > 0 ? t(`${K}.code.newCodeIn`, { time: clock(newCodeIn) }) : t(`${K}.code.newCode`)}
          </Button>
        </div>
      </Stack>
    );
  }
  const otp: OtpStatus = status === "wrong" ? "error" : status === "verifying" ? "verifying" : status === "verified" ? "success" : "idle";
  return (
    <div data-testid="auth-code" data-status={status}>
      <CodeBoxes
        key={resendKey}
        otp={otp}
        disabled={disabled}
        autoFocus={autoFocus}
        value={value}
        onChange={onChange}
        onComplete={onComplete}
        errorMessage={t(`${K}.code.wrong`, { count: attemptsLeft })}
        resendIn={resendIn}
        resendAt={resendAt}
        onResend={onResend}
      />
    </div>
  );
}

/*
 * The port starts its resend countdown (and announces "A new code is on its way") the moment "Resend code" is clicked,
 * before the service has answered. So once the countdown is over this passes `resendIn = 0` — a click then restarts
 * nothing — and mutes the port's own announcement. A successful send changes `resendKey`: the port remounts with the
 * real remaining time and counts down from there; a failed send leaves "Resend code" as it was.
 */
function CodeBoxes({
  otp, autoFocus, value, onChange, onComplete, errorMessage, resendIn, resendAt, onResend, disabled,
}: {
  disabled?: boolean; otp: OtpStatus; autoFocus?: boolean; value: string; onChange: (code: string) => void; onComplete?: (code: string) => void;
  errorMessage: string; resendIn: number; resendAt?: number; onResend: () => void;
}) {
  const { t } = useTranslation();
  /* every new field starts from the absolute deadline, never from a value that was current when it was last set */
  const [initial] = useState(() => (resendAt === undefined ? resendIn : Math.max(0, Math.ceil((resendAt - Date.now()) / 1000))));
  const [over, setOver] = useState(initial <= 0);
  const [announce, setAnnounce] = useState("");
  useEffect(() => {
    if (over) return;
    const id = window.setTimeout(() => { setOver(true); setAnnounce(t("kit.otp.canResend")); }, initial * 1000);
    return () => window.clearTimeout(id);
  }, [over, initial, t]);
  return (
    <>
    <OtpInput
      length={6}
      separator
      align="center"
      autoFocus={autoFocus}
      status={otp}
      disabled={disabled}
      value={value}
      onChange={onChange}
      onComplete={onComplete}
      label={t(`${K}.code.label`)}
      errorMessage={errorMessage}
      successLabel={t(`${K}.code.verified`)}
      resendIn={over ? 0 : initial}
      labels={{ sent: "" }}
      onResend={onResend}
    />
    <span className="sr-only" role="status" aria-live="polite">{announce}</span>
    </>
  );
}
