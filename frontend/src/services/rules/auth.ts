import type { AuthStage } from "../contracts";

export const CODE_TTL_MS = 600_000;
export const RESEND_MS = 60_000;
export const MAX_CODE_ATTEMPTS = 5;
export const MAX_SIGNIN_WRONG = 5;
export const LOCK_MS = 60_000;
export const RESET_TICKET_MS = 600_000;

export const AUTH_ROUTES = ["/sign-in", "/sign-up", "/sign-up/verify", "/sign-up/microphone", "/reset-password", "/auth/google"] as const;

export const normaliseEmail = (s: string) => s.trim().toLowerCase();
export const isEmail = (s: string) => /^[^@\s]+@[^@\s.]+(?:\.[^@\s.]+)+$/.test(s);
export const isPassword = (s: string) => s.length >= 8;

export function safeNext(path: string | null): string | null {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.includes("\\") || [...path].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) return null;
  try {
    const url = new URL(path, "https://example.invalid");
    if (url.origin !== "https://example.invalid" || AUTH_ROUTES.some((route) => url.pathname === route || url.pathname.startsWith(`${route}/`))) return null;
    return path;
  } catch {
    return null;
  }
}

export function signInUrl(location: string): string {
  let destination: string | null = null;
  try {
    const url = new URL(location, "https://example.invalid");
    if (location.startsWith("/") && !location.startsWith("//") && url.origin === "https://example.invalid") {
      const isAuth = AUTH_ROUTES.some((route) => url.pathname === route || url.pathname.startsWith(`${route}/`));
      destination = safeNext(isAuth ? url.searchParams.get("next") : location);
      if (destination) {
        const nextUrl = new URL(destination, "https://example.invalid");
        nextUrl.searchParams.delete("demo");
        destination = safeNext(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
      }
    }
  } catch {
    // Invalid locations have no return destination.
  }
  return destination ? `/sign-in?next=${encodeURIComponent(destination)}` : "/sign-in";
}

export function routeForStage(stage: AuthStage): string | null {
  if (stage === "verify") return "/sign-up/verify";
  if (stage === "microphone") return "/sign-up/microphone";
  return null;
}
