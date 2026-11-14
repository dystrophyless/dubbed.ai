import type { UseQueryResult } from "@tanstack/react-query";
import type { Project, ProjectState } from "@/services";
import { redirectTarget } from "@/services/rules/lifecycle";

/*
 * Each routed page guards its own route (ia.md redirect table): when the project is in a state the page cannot show,
 * where should the user be instead? Returns null while the answer is not known yet — a cached project from before
 * this page opened is never trusted (it may be stale right after Start / Build), only a fetch made after mount.
 */
export function guardTarget(
  query: Pick<UseQueryResult<Project | null>, "data" | "isFetchedAfterMount" | "isError">,
  firstTurnWithoutTake: number | null,
  allowed: readonly ProjectState[],
): string | null {
  if (!query.isFetchedAfterMount || query.isError) return null;
  const project = query.data;
  if (!project) return "/projects";
  if (allowed.includes(project.state)) return null;
  // a recording project opens on its first turn without a take
  const first = firstTurnWithoutTake ?? Math.min(project.takesDone + 1, Math.max(1, project.turnsTotal));
  return redirectTarget(project.id, project.state, first);
}
