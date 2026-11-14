import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import { toast } from "@/components/ui";
import { ProjectsView, type ProjectItem, type ProjectState as ItemState } from "@/features/recording-flow-mock/views/ProjectsView";
import { POLL_MS, projectId, qk, useAccount, useProjects, useServices, type ProjectSummary } from "@/services";
import { priceOf } from "@/services/rules/pricing";
import { refusalFor, refusalOf, toastRefusal } from "@/features/processing/cancelFailure";
import { redirectTarget } from "@/services/rules/lifecycle";

/*
 * S5 — My projects on the real route: the approved ProjectsView over `['projects']` + `['account']`.
 * Row targets follow the ui-spec S5 table (redirectTarget); Delete on Queued / Preparing is the Processing cancel dialog
 * with the live `cancelQuote` (charges what the quote says); other states use the plain delete (no charge).
 */
const STATE: Record<ProjectSummary["state"], ItemState> = {
  draft: "draft", queued: "queued", preparing: "preparing", recording: "recording", assembling: "assembling",
  done: "done", no_dialogue: "no-dialogue", failed: "failed", assembly_failed: "failed",
};

export function ProjectsPage() {
  const { t } = useTranslation();
  const services = useServices();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const projects = useProjects();
  const account = useAccount();
  const [now] = useState(Date.now);

  // /projects/:id for an unknown or deleted project lands here with a toast (D4); the router state is cleared so a reload stays quiet
  const notFound = (location.state as { projectNotFound?: boolean } | null)?.projectNotFound === true;
  const toasted = useRef(false);
  useEffect(() => {
    if (!notFound || toasted.current) return;
    toasted.current = true;
    toast({
      tone: "info",
      title: t("features.recordingFlowMock.projects.notFoundTitle"),
      description: t("features.recordingFlowMock.projects.notFoundText"),
    });
    navigate(location.pathname, { replace: true, state: null });
  }, [notFound, t, navigate, location.pathname]);

  const list = projects.data ?? [];
  // each row's thumbnail is the first frame of its own section: the project's video (the services own the blob URL's
  // lifetime — one URL per video, revoked when the video changes or the project is removed)
  const videos = useQueries({
    queries: list.map((p) => ({
      queryKey: qk.videoUrl(p.id),
      queryFn: () => services.projects.videoUrl(p.id),
      staleTime: Infinity,
    })),
  });
  const items: ProjectItem[] = list.map((p, i) => ({
    frame: { src: videos[i]?.isPending ? undefined : videos[i]?.data ?? null, at: p.section.startMs / 1000 },
    id: p.id,
    name: p.name,
    state: STATE[p.state],
    seconds: Math.round((p.section.endMs - p.section.startMs) / 1000),
    turns: p.turnsTotal > 0 ? { done: p.takesDone, total: p.turnsTotal } : undefined,
    stage: p.step ? { n: p.step, of: 3 } : undefined,
    newVersion: p.state === "done" && p.pendingAssembling,
    changedMinutes: Math.max(0, Math.round((now - p.changedAt) / 60_000)),
  }));
  // the open dialog: which action, for which project, from which state (the quote cache is emptied on open: no quote of an earlier opening)
  const [dialog, setDialog] = useState<{ id: string; kind: "cancel" | "delete"; from: ProjectSummary["state"] | undefined } | null>(null);
  const [closeToken, setCloseToken] = useState(0);
  const quote = useQuery({
    queryKey: ["cancel-quote", dialog?.id],
    queryFn: () => services.projects.cancelQuote(projectId(dialog?.id ?? "")),
    enabled: dialog?.kind === "cancel",
    refetchInterval: POLL_MS,
  });
  const byId = new Map(list.map((p) => [p.id as string, p]));
  const dialogState = byId.get(dialog?.id ?? "")?.state;
  const settled = projects.data !== undefined;
  useEffect(() => {
    if (!dialog || !settled) return;
    const same = dialog.kind === "cancel" ? dialogState === "queued" || dialogState === "preparing" : dialogState === dialog.from;
    if (same) return;
    // server state moved on (an external change): close the dialog and say so
    // oxlint-disable-next-line react/set-state-in-effect
    setDialog(null);
    setCloseToken((n) => n + 1);
    toastRefusal(t, dialog.kind === "cancel" && dialogState === "recording" ? "finished" : "changed");
    void qc.invalidateQueries();
  }, [dialog, dialogState, settled, t, qc]);
  const slotsTotal = account.data?.slotLimit ?? 2;
  const state = projects.isPending ? "loading" : projects.isError ? "error" : items.length === 0 ? "empty" : items.length >= slotsTotal ? "slots-full" : "default";

  return (
    <ProjectsView
      state={state}
      projects={items}
      slotsTotal={slotsTotal}
      hrefOf={(p) => {
        const s = byId.get(p.id);
        return s ? redirectTarget(s.id, s.state, Math.min(s.takesDone + 1, Math.max(1, s.turnsTotal))) : "/projects";
      }}
      onRename={(id, name) => {
        void services.projects.rename(id as never, name).then(() => {
          void qc.invalidateQueries();
          toast({ title: t("features.recordingFlowMock.projects.renamed") });
        });
      }}
      onDialogChange={(d) => {
        if (d?.kind === "cancel") qc.removeQueries({ queryKey: ["cancel-quote", d.id] });
        setDialog(d ? { ...d, from: byId.get(d.id)?.state } : null);
      }}
      closeDialogToken={closeToken}
      onDelete={(id) => {
        const p = byId.get(id);
        if (!p) return;
        const isRunning = p.state === "queued" || p.state === "preparing";
        void (async () => {
          try {
            if (isRunning) {
              const result = await services.projects.cancel(projectId(id));
              if (!result.ok) {
                toastRefusal(t, await refusalFor(services, projectId(id), result.error));
              } else {
                const charged = result.value.charged;
                toast({
                  tone: "success",
                  title: t("processing.toast.cancelled"),
                  description: charged ? t("processing.toast.charged", { count: charged }) : t("processing.toast.free", { count: priceOf(p.section) }),
                });
              }
            } else {
              const result = await services.projects.remove(projectId(id));
              if (result.ok) toast({ title: t("features.recordingFlowMock.projects.deleted") });
              else toastRefusal(t, refusalOf(result.error) === "generic" ? "generic" : "changed");
            }
          } catch {
            toastRefusal(t, "generic");
          }
          void qc.invalidateQueries();
        })();
      }}
      cancelInfo={(p) => {
        const q = dialog?.id === p.id && dialog.kind === "cancel" && quote.data ? quote.data : null;
        // the quote is the source of truth: reserved = what is charged now + what goes back (never the rounded display seconds)
        return q ? { stepsDone: q.stepsDone, charge: q.charge, reserved: q.charge + q.refund } : null;
      }}
      onNewDub={() => navigate("/new")}
      onBuyCredits={() => navigate("/credits")}
      onRetry={() => void projects.refetch()}
    />
  );
}
