import { Outlet } from "react-router";
import { ReadyWatcher } from "@/features/processing/ReadyWatcher";

/* Layout of the studio route: no chrome (the page renders the focused shell) — it only keeps ReadyWatcher alive here (R8). */
export function StudioRoot() {
  return (
    <>
      <ReadyWatcher />
      <Outlet />
    </>
  );
}
