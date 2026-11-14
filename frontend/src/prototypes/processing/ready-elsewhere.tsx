import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import i18n from "@/i18n";
import { ProjectsTemplate } from "@/pages/styleguide/templates/Projects";
import { Button, toast, useToasts } from "@/components/ui";

/*
 * Prototype only — what happens when preparing finishes while the user is NOT on the processing page
 * (owner 2026-11-03, answer 7): an in-app toast "“Kitchen scene” is ready" with "Open the studio" wherever they are in
 * the app, plus a browser notification when they opted in ("Notify me when it's ready") and the tab is in the background.
 * The real app gets "ready" from the job poll / a server event; here a module-level timer stands in for it.
 */
export const STUDIO = "/prototypes/studio/turn?turn=1";
export const PROCESSING_PAGE = "/prototypes/processing/page";

let notifyOn = false; // the user's opt-in, kept while they move around the app
let timer: number | undefined;

export const isNotifyOn = () => notifyOn;
export const setNotifyOn = (on: boolean) => {
  notifyOn = on;
};

/** A browser notification — only after the user opted in and the browser granted permission (never auto-prompted). */
export function sendReadyNotification(name: string) {
  if (!notifyOn || typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
  const n = new Notification(i18n.t("processing.notify.title", { name }), { body: i18n.t("processing.notify.body"), tag: "dubbed-ready" });
  n.onclick = () => {
    window.focus();
    n.close();
    window.location.assign(STUDIO);
  };
}

function OpenStudioAction({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Button
      size="sm"
      onClick={() => {
        onDone();
        navigate(STUDIO);
      }}
    >
      {t("processing.openStudio")}
    </Button>
  );
}

/** The in-app toast; stays until the user acts or dismisses it (a finished job is worth not missing). */
export function showReadyToast(name: string, turns: number) {
  let id = 0;
  id = toast({
    tone: "success",
    title: i18n.t("processing.notify.title", { name }),
    description: i18n.t("processing.found.ready", { count: turns }),
    action: <OpenStudioAction onDone={() => useToasts.getState().dismiss(id)} />,
    duration: 0,
  });
}

/** The user left the processing page during a live run: finish the demo job in the background. */
export function scheduleReadyElsewhere(ms: number, name: string, turns: number) {
  cancelReadyElsewhere();
  timer = window.setTimeout(() => {
    timer = undefined;
    if (window.location.pathname.startsWith(PROCESSING_PAGE)) return; // the page shows ready itself
    showReadyToast(name, turns);
    if (document.visibilityState === "hidden") sendReadyNotification(name);
  }, ms);
}

export function cancelReadyElsewhere() {
  if (timer !== undefined) window.clearTimeout(timer);
  timer = undefined;
}

/** Preview: My projects with the "ready" toast — /prototypes/processing/ready-elsewhere */
export function ReadyElsewherePrototype() {
  const shown = useRef(false);
  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    showReadyToast(i18n.t("processing.name"), 12);
  }, []);
  return <ProjectsTemplate />;
}
