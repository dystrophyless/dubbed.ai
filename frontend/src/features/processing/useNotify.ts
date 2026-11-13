import { useState } from "react";
import { useServices, type Project } from "@/services";
import type { NotifyProps } from "@/features/recording-flow-mock/views/NotifyControl";

/*
 * "Notify me when it's ready" for Processing and Result. The opt-in lives on the project (`notify`); the browser is asked
 * for permission only when the button is pressed (research R8). Without the Notification API the control is not shown.
 * The watcher that fires the notification wherever the user is comes with US4.
 */
export function useNotify(project: Pick<Project, "id" | "notify"> | null | undefined): NotifyProps | null {
  const services = useServices();
  const [, force] = useState(0);
  if (!project || typeof window === "undefined" || !("Notification" in window)) return null;
  const denied = Notification.permission === "denied";
  const state = denied ? "denied" : project.notify && Notification.permission === "granted" ? "on" : "off";
  const ask = async () => {
    const answer = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
    if (answer === "granted") await services.projects.setNotify(project.id, true);
    force((n) => n + 1);
  };
  return { state, onAsk: () => void ask(), onTurnOff: () => void services.projects.setNotify(project.id, false) };
}
