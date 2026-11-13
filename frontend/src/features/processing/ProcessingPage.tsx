import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";
import { toast } from "@/components/ui";
import { LoadError } from "@/features/recording-flow-mock/LoadError";
import { PageSkeleton } from "@/features/recording-flow-mock/PageSkeleton";
import { GuardNavigate } from "@/features/recording-flow-mock/GuardNavigate";
import { guardTarget } from "@/features/recording-flow-mock/guard";
import { ProcessingView, type ProcessingPhase } from "@/features/recording-flow-mock/views/ProcessingView";
import { POLL_MS, useProject, useServices, useVideoUrl, type Project, type ProjectId } from "@/services";
import { useNotify } from "./useNotify";

/*
 * S2 — Processing on the real route. `['project', id]` is polled while queued / preparing. Ready while the tab is visible:
 * "Ready — opening the studio", then studio turn 1 after ~1.5 s; in a hidden tab the page waits with "Open the studio".
 * Cancel (US2 shows the money rules in e2e), Try again, Delete and "Try another video" use the service as they are.
 */
const OPEN_DELAY_MS = 1500;
const ALLOWED = ["queued", "preparing", "failed", "no_dialogue", "recording"] as const;

function phaseOf(p: Project): ProcessingPhase {
  switch (p.state) {
    case "queued": return "queued";
    case "preparing": return "running";
    case "failed": return "failed";
    case "no_dialogue": return "no-dialogue";
    default: return "ready";
  }
}

export function ProcessingPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const services = useServices();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const query = useProject(id);
  const project = query.data ?? null;
  const video = useVideoUrl(id);
  const notify = useNotify(project);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false); // ready while the tab was hidden → wait for the user

  const quote = useQuery({
    queryKey: ["cancel-quote", id],
    queryFn: () => services.projects.cancelQuote(id as ProjectId),
    enabled: cancelOpen && Boolean(id),
    refetchInterval: POLL_MS,
  });

  // ready (preparing finished): a visible tab opens the studio by itself after a moment; a hidden one waits
  const ready = project?.state === "recording";
  useEffect(() => {
    if (!ready || !id || waiting || cancelOpen) return;
    if (document.visibilityState === "hidden") {
      const wait = window.setTimeout(() => setWaiting(true), 0);
      return () => window.clearTimeout(wait);
    }
    const timer = window.setTimeout(() => navigate(`/projects/${id}/turns/1`), OPEN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [ready, id, waiting, cancelOpen, navigate]);

  // a project that already has takes is past this page: straight to its first turn without a take
  const redirect = guardTarget(query, null, (query.data?.takesDone ?? 0) > 0 ? ALLOWED.filter((x) => x !== "recording") : ALLOWED);
  if (redirect) return <GuardNavigate to={redirect} />;
  if (query.isError || video.isError) return <LoadError width="stage" onRetry={() => { void query.refetch(); void video.refetch(); }} />;
  if (!project || !query.isFetchedAfterMount || !video.data) return <PageSkeleton width="stage" label={t("features.recordingFlowMock.page.loading")} />;

  const phase = phaseOf(project);
  const current = phase === "queued" ? 0 : phase === "ready" ? 3 : project.step ?? 0;
  const settled = phase === "ready" || phase === "no-dialogue";
  const cost = settled ? project.charged || project.price : project.price;
  const q = quote.data;
  const from = project.section.startMs / 1000;
  const to = project.section.endMs / 1000;

  const confirmCancel = async () => {
    setBusy(true);
    const result = await services.projects.cancel(project.id);
    const charged = result.ok ? result.value.charged : 0;
    void qc.invalidateQueries();
    toast({
      tone: "success",
      title: t("processing.toast.cancelled"),
      description: charged ? t("processing.toast.charged", { count: charged }) : t("processing.toast.free", { count: project.price }),
    });
    navigate("/projects");
  };
  const confirmDelete = async () => {
    setBusy(true);
    await services.projects.remove(project.id);
    void qc.invalidateQueries();
    toast({ tone: "success", title: t("processing.toast.deleted") });
    navigate("/projects");
  };
  // "Try another video": the project keeps its slot (credits already charged stay charged); New dub swaps the video in it
  const tryAnother = () => navigate("/new", { state: { replace: project.id } });
  const retry = async () => {
    const outcome = await services.projects.retry(project.id);
    if (!outcome.ok) toast({ tone: "danger", title: t("features.recordingFlowMock.page.genericError") });
    void query.refetch();
  };

  return (
    <ProcessingView
      phase={phase}
      current={current}
      fraction={phase === "ready" ? 1 : project.stepProgress}
      remainingSeconds={project.secondsLeft ?? 0}
      turnsFound={project.turnsFound}
      cost={cost}
      name={project.name}
      from={from}
      to={to}
      videoSrc={video.data}
      opening={!waiting}
      cancel={{ open: cancelOpen, stepsDone: q?.stepsDone ?? 0, charge: q?.charge ?? 0, back: q?.refund ?? project.price }}
      deleteOpen={deleteOpen}
      busy={busy}
      notify={notify}
      projectsHref="/projects"
      onOpenCancel={() => setCancelOpen(true)}
      onCloseCancel={() => setCancelOpen(false)}
      onConfirmCancel={() => void confirmCancel()}
      onOpenDelete={() => setDeleteOpen(true)}
      onCloseDelete={() => setDeleteOpen(false)}
      onConfirmDelete={() => void confirmDelete()}
      onRetry={() => void retry()}
      onOpenStudio={() => navigate(`/projects/${project.id}/turns/1`)}
      onTryAnother={tryAnother}
    />
  );
}
