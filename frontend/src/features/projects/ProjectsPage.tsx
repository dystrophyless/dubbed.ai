import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import { toast } from "@/components/ui";
import { ProjectsView, type ProjectItem, type ProjectState as ItemState } from "@/features/recording-flow-mock/views/ProjectsView";
import { POLL_MS, projectId, qk, useAccount, useProjects, useServices, type ProjectSummary } from "@/services";
import { cancelCharge } from "@/services/rules/money";
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
  // live cancel quotes for the running rows (polled, so the dialog's charge follows the preparation steps)
  const running = list.filter((p) => p.state === "queued" || p.state === "preparing");
  const quotes = useQueries({
    queries: running.map((p) => ({
      queryKey: ["cancel-quote", p.id],
      queryFn: () => services.projects.cancelQuote(p.id),
      refetchInterval: POLL_MS,
    })),
  });
  const quoteOf = new Map(running.map((p, i) => [p.id as string, quotes[i]?.data]));
  const byId = new Map(list.map((p) => [p.id as string, p]));
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
      onDelete={(id) => {
        const p = byId.get(id);
        const isRunning = p?.state === "queued" || p?.state === "preparing";
        const price = p ? Math.round((p.section.endMs - p.section.startMs) / 1000) : 0;
        void (async () => {
          if (isRunning) {
            const result = await services.projects.cancel(projectId(id));
            const charged = result.ok ? result.value.charged : 0;
            toast({
              tone: "success",
              title: t("processing.toast.cancelled"),
              description: charged ? t("processing.toast.charged", { count: charged }) : t("processing.toast.free", { count: price }),
            });
          } else {
            await services.projects.remove(projectId(id));
            toast({ title: t("features.recordingFlowMock.projects.deleted") });
          }
          void qc.invalidateQueries();
        })();
      }}
      cancelInfo={(p) => {
        const q = quoteOf.get(p.id);
        if (q) return { stepsDone: q.stepsDone, charge: q.charge, reserved: p.seconds };
        const stepsDone = p.stage ? p.stage.n - 1 : 0;
        return { stepsDone, charge: p.state === "preparing" ? cancelCharge(p.seconds, stepsDone) : 0, reserved: p.seconds };
      }}
      onNewDub={() => navigate("/new")}
      onBuyCredits={() => navigate("/credits")}
      onRetry={() => void projects.refetch()}
    />
  );
}
