import { describe, expect, it } from "vitest";
import { AUTH_ROUTES, CODE_TTL_MS, LOCK_MS, MAX_CODE_ATTEMPTS, MAX_SIGNIN_WRONG, RESET_TICKET_MS, RESEND_MS, isEmail, isPassword, normaliseEmail, routeForStage, safeNext, signInUrl } from "./auth";

describe("auth rules", () => {
  it("normalises and validates emails", () => {
    expect(normaliseEmail(" A@B.Co ")).toBe("a@b.co");
    expect(isEmail("a@b.co")).toBe(true);
    for (const value of ["a@b", "a b@c.d", "a@@b.c", "", "@b.co", "a@.co", "a@b."]) expect(isEmail(value)).toBe(false);
  });
  it("requires eight password characters", () => {
    expect(isPassword("1234567")).toBe(false);
    expect(isPassword("12345678")).toBe(true);
  });
  it("accepts only safe non-auth local destinations", () => {
    expect(safeNext("/projects/x?y=1")).toBe("/projects/x?y=1");
    for (const value of ["//evil.com", "https://x", "/sign-in", "/sign-up/verify", "", null, "/\\evil.com", "/x/../sign-in?x=1", ...AUTH_ROUTES]) expect(safeNext(value)).toBeNull();
  });
  it("builds idempotent sign-in URLs with safe destinations and no demo presets", () => {
    const url = signInUrl("/credits");
    expect(url).toBe("/sign-in?next=%2Fcredits");
    expect(signInUrl(url)).toBe(url);
    expect(signInUrl(signInUrl(url))).toBe(url);
    expect(signInUrl("/sign-up/verify")).toBe("/sign-in");
    expect(signInUrl("/credits?demo=reset&tab=history&demo=signin")).toBe("/sign-in?next=%2Fcredits%3Ftab%3Dhistory");
    expect(signInUrl("/sign-in?next=%2Fcredits%3Fdemo%3Dreset%26tab%3Dhistory&demo=signin")).toBe("/sign-in?next=%2Fcredits%3Ftab%3Dhistory");
    for (const value of ["//evil.com", "/sign-in?next=%2Fsign-up", "/x/../sign-in", "/\\\\evil.com"]) expect(signInUrl(value)).toBe("/sign-in");
  });
  it("maps all account stages", () => {
    expect(routeForStage("verify")).toBe("/sign-up/verify");
    expect(routeForStage("microphone")).toBe("/sign-up/microphone");
    expect(routeForStage("active")).toBeNull();
  });
  it("defines the auth timing and attempt limits", () => {
    expect([CODE_TTL_MS, RESEND_MS, MAX_CODE_ATTEMPTS, MAX_SIGNIN_WRONG, LOCK_MS, RESET_TICKET_MS]).toEqual([600_000, 60_000, 5, 5, 60_000, 600_000]);
  });
});
