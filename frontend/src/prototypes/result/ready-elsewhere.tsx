import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import i18n from "@/i18n";
import { ProjectsTemplate } from "@/pages/styleguide/templates/Projects";
import { Button, toast, useToasts } from "@/components/ui";
import { isNotifyOn } from "../processing/ready-elsewhere";

/*
 * Prototype only — the result is assembled while the user is NOT on the result page (owner 2026-11-04, answer 8: the
 * same notifications as processing): an in-app toast "“Kitchen scene” is ready to watch" with "Watch the result" wherever
 * they are in the app, plus a browser notification when they opted in ("Notify me when it's ready") and the tab is in the
 * background. A new version says "Version 2 of “Kitchen scene” is ready". The real app gets this from the job poll / a
 * server event; here a module-level timer stands in for it.
 */
export const RESULT_PAGE = "/prototypes/result/page";

let timer: number | undefined;

export type ReadyKind = { version: number; rerecorded: number[] };

const where = (k: ReadyKind) =>
  k.version > 1
    ? `${RESULT_PAGE}?state=new-version-ready&rerecorded=${k.rerecorded.join(",")}`
    : `${RESULT_PAGE}?state=ready`;

const title = (name: string, k: ReadyKind) =>
  k.version > 1 ? i18n.t("result.notify.titleVersion", { name, n: k.version }) : i18n.t("result.notify.title", { name });

/** A browser notification — only after the user opted in and the browser granted permission (never auto-prompted). */
export function sendResultNotification(name: string, k: ReadyKind) {
  if (!isNotifyOn() || typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
  const n = new Notification(title(name, k), { body: i18n.t("result.notify.body"), tag: "dubbed-result" });
  n.onclick = () => {
    window.focus();
    n.close();
    window.location.assign(where(k));
  };
}

function WatchAction({ to, onDone }: { to: string; onDone: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Button
      size="sm"
      onClick={() => {
        onDone();
        navigate(to);
      }}
    >
      {t("result.notify.watch")}
    </Button>
  );
}

/** The in-app toast; stays until the user acts or dismisses it (as processing's). */
export function showResultToast(name: string, k: ReadyKind) {
  let id = 0;
  id = toast({
    tone: "success",
    title: title(name, k),
    description: i18n.t("result.notify.body"),
    action: <WatchAction to={where(k)} onDone={() => useToasts.getState().dismiss(id)} />,
    duration: 0,
  });
}

/** The user left the result page while it was assembling: finish the demo job in the background. */
export function scheduleResultElsewhere(ms: number, name: string, k: ReadyKind) {
  cancelResultElsewhere();
  timer = window.setTimeout(() => {
    timer = undefined;
    if (window.location.pathname.startsWith(RESULT_PAGE)) return; // the page shows it itself
    showResultToast(name, k);
    if (document.visibilityState === "hidden") sendResultNotification(name, k);
  }, ms);
}

export function cancelResultElsewhere() {
  if (timer !== undefined) window.clearTimeout(timer);
  timer = undefined;
}

/** Preview: My projects with the "ready to watch" toast — /prototypes/result/ready-elsewhere */
export function ResultReadyElsewherePrototype() {
  const shown = useRef(false);
  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    showResultToast(i18n.t("result.name"), { version: 1, rerecorded: [] });
  }, []);
  return <ProjectsTemplate />;
}
