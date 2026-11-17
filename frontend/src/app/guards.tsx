import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation, useSearchParams } from "react-router";
import { Toaster } from "@/components/ui";
import { AuthLoadingView } from "@/features/auth/views/AuthLoadingView";
import { routeForStage, safeNext, signInUrl } from "@/services/rules/auth";
import { useSession } from "@/services";

/*
 * Route guards (feature 004, research R4, ui-spec S7). The session is read through `useSession()`; while it loads the
 * guards show the loading skeleton, never the guarded page, so no private data renders for a guest or a half-made account.
 */

const SIGN_IN = "/sign-in";

/** Wraps the product routes: guest → sign-in (remembering the page), unfinished sign-up → its step. */
export function RequireAccount({ children }: { children?: ReactNode }) {
  const session = useSession();
  const { pathname, search } = useLocation();
  if (session.isPending) return <AuthLoadingView brandHref={SIGN_IN} />;
  const data = session.data ?? null;
  if (!data) return <Navigate to={signInUrl(`${pathname}${search}`)} replace />;
  const stageRoute = routeForStage(data.stage);
  if (stageRoute) return <Navigate to={stageRoute} replace />;
  return <>{children ?? <Outlet />}</>;
}

/**
 * Wraps an auth page. `stage` is the session state the page is for: "guest" (sign in, sign up, reset, Google) or an
 * onboarding stage. An active session leaves for `next` or My projects; another stage goes to its own route; a guest on an
 * onboarding page goes to sign-in.
 */
export function AuthOnly({ stage, children }: { stage: "guest" | "verify" | "microphone"; children: ReactNode }) {
  const session = useSession();
  const [params] = useSearchParams();
  if (session.isPending) return <AuthLoadingView brandHref={SIGN_IN} />;
  const data = session.data ?? null;
  /* the auth pages have no shell, so this boundary hosts their toasts ("New code sent"); prototypes mount their own */
  const page = <>{children}<Toaster /></>;
  if (!data) return stage === "guest" ? page : <Navigate to={SIGN_IN} replace />;
  const stageRoute = routeForStage(data.stage);
  // finishing the microphone step opens New dub (ui-spec S4); any other auth page opens My projects
  if (!stageRoute) return <Navigate to={safeNext(params.get("next")) ?? (stage === "microphone" ? "/new" : "/projects")} replace />;
  if (data.stage === stage) return page;
  return <Navigate to={stageRoute} replace />;
}

/** `/` — the landing page is a later feature: redirect by session. */
export function RootRedirect() {
  const session = useSession();
  if (session.isPending) return <AuthLoadingView brandHref={SIGN_IN} />;
  const data = session.data ?? null;
  if (!data) return <Navigate to={SIGN_IN} replace />;
  return <Navigate to={routeForStage(data.stage) ?? "/projects"} replace />;
}
