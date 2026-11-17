/*
 * The deadline of the last "send code" (the service's `resendAt`), kept per email in this tab so a reload counts the
 * real remaining time instead of a fresh minute. Storage can be unavailable: a missing or unreadable value means 0
 * ("no cooldown known" -> "Resend code"; the service answers too-soon with its own deadline if that is wrong).
 */
const key = (email: string) => `dubbed:auth:resend-at:${email.trim().toLowerCase()}`;

export function readResendDeadline(email: string): number {
  try {
    const n = Number(window.sessionStorage.getItem(key(email)));
    return Number.isFinite(n) ? n : 0;
  } catch { return 0; }
}

export function saveResendDeadline(email: string, at: number) {
  try { window.sessionStorage.setItem(key(email), String(at)); } catch { /* the cooldown is just not kept */ }
}
