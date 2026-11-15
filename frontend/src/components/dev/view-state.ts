import { useSearchParams } from "react-router";

/*
 * Every template and prototype renders all its states from one URL param:
 *   ?state=default | loading | empty | error  (plus template-specific ones)
 * so reviewers, QA and Playwright can open any state directly.
 * The floating StateSwitcher is added in Phase 1 on top of the kit's segmented control.
 */
export type ViewState = "default" | "loading" | "empty" | "error" | (string & {});

export function useViewState<T extends string>(states: readonly T[]): T {
  const [params] = useSearchParams();
  const s = params.get("state") as T | null;
  return s && states.includes(s) ? s : states[0];
}
