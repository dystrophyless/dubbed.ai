import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import { Button, toast } from "@/components/ui";
import { useProjects, useServices, type ProjectId, type ProjectSummary } from "@/services";

/*
 * Research R8 — tells the user a project they asked about is ready, wherever they are in the app (ProductShell and the
 * studio's focused shell mount it). It watches `['projects']` (which polls while the server works), and when a project
 * with "Notify me when it's ready" on becomes ready to record or to watch:
 *   - an in-app toast with an action ("Open the studio" / "Watch the result") unless the user is already on that project's pages;
 *   - a browser Notification only when the tab is hidden and permission was granted (it is asked only by the Notify button).
 * The first read of the list is the baseline: nothing that was already ready is announced.
 */
type Seen = { state: ProjectSummary["state"]; pendingAssembling: boolean; pendingVersion: number | null };
const seen = new Map<string, Seen>(); // survives remounts when the user moves between shells

export function ReadyWatcher() {
  const { t } = useTranslation();
  const services = useServices();
  const projects = useProjects();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const where = useRef(pathname);
  useEffect(() => {
    where.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const list = projects.data;
    if (!list) return;
    for (const p of list) {
      const before = seen.get(p.id);
      seen.set(p.id, { state: p.state, pendingAssembling: p.pendingAssembling, pendingVersion: p.pendingVersion });
      if (!before) continue; // first sight of a project is its baseline
      const toRecord = (before.state === "queued" || before.state === "preparing") && p.state === "recording";
      const firstResult = before.state === "assembling" && p.state === "done";
      const newVersion = p.state === "done" && before.pendingAssembling && !p.pendingAssembling && p.pendingVersion !== null;
      if (!toRecord && !firstResult && !newVersion) continue;
      void (async () => {
        const full = await services.projects.get(p.id as ProjectId);
        if (!full?.notify) return;
        let version: number | null = null;
        if (newVersion) {
          const r = await services.result.get(p.id as ProjectId);
          if (r.pending?.state !== "ready") return; // a failed assembly is not "ready"
          version = r.pending.number;
        }
        const target = toRecord ? `/projects/${p.id}/turns/1` : `/projects/${p.id}/result`;
        const onItsPages = where.current.startsWith(`/projects/${p.id}/`);
        const title = toRecord
          ? t("processing.notify.title", { name: p.name })
          : version !== null
            ? t("result.notify.titleVersion", { name: p.name, n: version })
            : t("result.notify.title", { name: p.name });
        const body = toRecord ? t("processing.notify.body") : t("features.recordingFlowMock.result.notifyBody");
        const label = toRecord ? t("processing.openStudio") : t("result.notify.watch");
        if (!onItsPages) {
          toast({
            tone: "success",
            title,
            description: body,
            action: (
              <Button size="sm" variant="secondary" onClick={() => navigate(target)}>
                {label}
              </Button>
            ),
          });
        }
        if (document.visibilityState === "hidden" && "Notification" in window && Notification.permission === "granted") {
          const n = new Notification(title, { body });
          n.onclick = () => {
            window.focus();
            navigate(target);
            n.close();
          };
        }
      })();
    }
  }, [projects.data, services, navigate, t]);

  return null;
}
