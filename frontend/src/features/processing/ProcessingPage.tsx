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
import { priceOf } from "@/services/rules/pricing";
import { POLL_MS, useProject, useServices, useVideoUrl, type Project, type ProjectId } from "@/services";
import { refusalFor, refusalOf, toastRefusal } from "./cancelFailure";
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

  // the dialog remembers which action it is, for which project, from which state, and when it was opened
  const [dialog, setDialog] = useState<{ kind: "cancel" | "delete"; id: ProjectId; from: Project["state"] } | null>(null);
  // the route reuses this page for another project: a dialog opened for the previous one is not this page's action
  const active = dialog && dialog.id === id ? dialog : null;
  const cancelOpen = active?.kind === "cancel";
  const deleteOpen = active?.kind === "delete";
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false); // ready while the tab was hidden → wait for the user

  const quote = useQuery({
    queryKey: ["cancel-quote", id],
    queryFn: () => services.projects.cancelQuote(id as ProjectId),
    enabled: cancelOpen && Boolean(id),
    refetchInterval: POLL_MS,
  });
  // the cache is emptied when the dialog opens, so any quote seen here belongs to this opening
  const quoteFresh = Boolean(active && quote.data);

  // the project moved on while the dialog was open: close it and say what happened (never turn cancel into delete)
  const state = project?.state;
  useEffect(() => {
    if (!dialog || busy) return;
    if (dialog.id !== id) {
      // another project's dialog: drop it quietly
      // oxlint-disable-next-line react/set-state-in-effect
      setDialog(null);
      return;
    }
    if (!state) return;
    const same = dialog.kind === "cancel" ? state === "queued" || state === "preparing" : state === dialog.from;
    if (same) return;
    // server state moved on (an external change): close the dialog and say so
    // oxlint-disable-next-line react/set-state-in-effect
    setDialog(null);
    toastRefusal(t, dialog.kind === "cancel" && state === "recording" ? "finished" : "changed");
    void qc.invalidateQueries();
  }, [dialog, id, state, busy, t, qc]);

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
  const q = quoteFresh ? quote.data : undefined;
  const from = project.section.startMs / 1000;
  const to = project.section.endMs / 1000;

  const refused = async (kind: "finished" | "changed" | "generic") => {
    setDialog(null);
    setBusy(false);
    toastRefusal(t, kind);
    await qc.invalidateQueries();
  };
  const confirmCancel = async () => {
    if (active?.kind !== "cancel" || !quoteFresh || busy) return;
    setBusy(true);
    try {
      const result = await services.projects.cancel(active.id);
      if (!result.ok) {
        await refused(await refusalFor(services, active.id, result.error));
        return;
      }
      const charged = result.value.charged;
      void qc.invalidateQueries();
      toast({
        tone: "success",
        title: t("processing.toast.cancelled"),
        description: charged ? t("processing.toast.charged", { count: charged }) : t("processing.toast.free", { count: priceOf(project.section) }),
      });
      navigate("/projects");
    } catch {
      await refused("generic");
    }
  };
  const confirmDelete = async () => {
    if (active?.kind !== "delete" || busy) return;
    setBusy(true);
    try {
      const result = await services.projects.remove(active.id);
      if (!result.ok) {
        await refused(refusalOf(result.error) === "generic" ? "generic" : "changed");
        return;
      }
      void qc.invalidateQueries();
      toast({ tone: "success", title: t("processing.toast.deleted") });
      navigate("/projects");
    } catch {
      await refused("generic");
    }
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
      cancel={{ open: cancelOpen, pending: !q, stepsDone: q?.stepsDone ?? 0, charge: q?.charge ?? 0, back: q?.refund ?? 0 }}
      deleteOpen={deleteOpen}
      busy={busy}
      notify={notify}
      projectsHref="/projects"
      onOpenCancel={() => {
        qc.removeQueries({ queryKey: ["cancel-quote", project.id] });
        setDialog({ kind: "cancel", id: project.id, from: project.state });
      }}
      onCloseCancel={() => setDialog(null)}
      onConfirmCancel={() => void confirmCancel()}
      onOpenDelete={() => setDialog({ kind: "delete", id: project.id, from: project.state })}
      onCloseDelete={() => setDialog(null)}
      onConfirmDelete={() => void confirmDelete()}
      onRetry={() => void retry()}
      onOpenStudio={() => navigate(`/projects/${project.id}/turns/1`)}
      onTryAnother={tryAnother}
    />
  );
}
