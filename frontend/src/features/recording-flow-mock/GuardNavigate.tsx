import { Navigate } from "react-router";

/* Router state set when a project could not be found: My projects shows the D4 toast once (ui-spec S6). */
export type NotFoundState = { projectNotFound: true };

/** A guard's redirect. `/projects` from a guard always means "that project does not exist (any more)". */
export function GuardNavigate({ to }: { to: string }) {
  return <Navigate to={to} replace state={to === "/projects" ? ({ projectNotFound: true } satisfies NotFoundState) : undefined} />;
}
