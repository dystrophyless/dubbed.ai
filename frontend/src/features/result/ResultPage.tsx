import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";
import { toast } from "@/components/ui";
import { useNotify } from "@/features/processing/useNotify";
import { LoadError } from "@/features/recording-flow-mock/LoadError";
import { PageSkeleton } from "@/features/recording-flow-mock/PageSkeleton";
import { GuardNavigate } from "@/features/recording-flow-mock/GuardNavigate";
import { guardTarget } from "@/features/recording-flow-mock/guard";
import { ResultView, turnAt, type NewVersion, type ResultPhase, type ResultTurn } from "@/features/recording-flow-mock/views/ResultView";
import { qk, useProject, useResult, useServices, useTurns, useVideoUrl, type ProjectId } from "@/services";
import { loadWithDuration } from "@/services/media/mixer";

/*
 * S4 — Result on the real route. First version: assembling (polled) → the rendered file plays in the player (the same file
 * the user downloads); Download saves it at once as `<Project name>.<webm|mp4>`. A newer version (US3) shows beside the
 * one playing; the chooser opens the studio on the picked turn (re-record mode is US3).
 */
const ALLOWED = ["assembling", "done", "assembly_failed"] as const;

export function ResultPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const services = useServices();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const project = useProject(id);
  const result = useResult(id);
  const turnsQuery = useTurns(id);
  const source = useVideoUrl(id);
  const notify = useNotify(project.data);

  const current = result.data?.current ?? null;
  const pending = result.data?.pending ?? null;
  const currentReady = current?.state === "ready" ? current : null;
  const player = useQuery({
    queryKey: qk.player(id ?? "", currentReady?.number ?? 0),
    queryFn: () => services.result.player(id as ProjectId, currentReady!.number),
    enabled: Boolean(id && currentReady),
    // while the next version loads keep the one on screen (no skeleton flash after "Watch version 2")
    placeholderData: (previous) => previous,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const [chooser, setChooser] = useState(false);
  const [pick, setPick] = useState(0);
  const [sawAssembling, setSawAssembling] = useState(false);
  const playNext = useRef(false);

  // A switch deletes the old version, so its player query can come back empty while the new one loads: keep the last
  // url meanwhile (the page used to drop to the skeleton, remounting the <video>).
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  if (player.data?.url && player.data.url !== lastUrl) setLastUrl(player.data.url);
  const url = player.data?.url ?? lastUrl;
  const phase: ResultPhase | null = currentReady ? "ready" : pending?.state === "failed" || project.data?.state === "assembly_failed" ? "failed" : pending ? "assembling" : null;
  if (phase === "assembling" && !sawAssembling) setSawAssembling(true);

  // true once the page renders the player (not the skeleton): only then does the <video> element exist
  const mounted = Boolean(project.data && project.isFetchedAfterMount && result.data && source.data && phase && (phase !== "ready" || url));
  // a rendered MediaRecorder file has no duration in its header: let the browser learn it (and start a switched version).
  // Depends on `mounted` too: the url can arrive while the skeleton is still shown, when there is no element to load yet.
  useEffect(() => {
    const v = videoRef.current;
    if (!url || !v || !mounted) return;
    let alive = true;
    void loadWithDuration(v).then(() => {
      if (!alive || !playNext.current) return;
      playNext.current = false;
      v.currentTime = 0;
      void v.play().catch(() => undefined);
    });
    return () => {
      alive = false;
    };
  }, [url, mounted]);

  const lang = i18n.resolvedLanguage?.startsWith("ru") ? "ru" : "en";
  const sectionStartMs = project.data?.section.startMs ?? 0;
  const turns: ResultTurn[] = useMemo(
    () =>
      [...(turnsQuery.data ?? [])]
        .sort((a, b) => a.n - b.n)
        .map((tn) => ({ start: (tn.startMs - sectionStartMs) / 1000, end: (tn.startMs - sectionStartMs + tn.windowMs) / 1000, text: tn.text[lang] })),
    [turnsQuery.data, sectionStartMs, lang],
  );

  const redirect = guardTarget(project, null, ALLOWED);
  if (redirect) return <GuardNavigate to={redirect} />;
  if (project.isError || result.isError) return <LoadError width="result" onRetry={() => { void project.refetch(); void result.refetch(); }} />;
  if (!project.data || !project.isFetchedAfterMount || !result.data || !source.data || !phase || (phase === "ready" && !url)) {
    return <PageSkeleton width="result" label={t("features.recordingFlowMock.page.loading")} />;
  }

  const p = project.data;
  const lengthS = (p.section.endMs - p.section.startMs) / 1000;
  const newer: NewVersion | null = currentReady && pending ? { n: pending.number, turns: pending.rerecorded, status: pending.state } : null;
  const progressing = phase === "assembling" ? pending : newer ? pending : null;
  const format = player.data?.format ?? currentReady?.format ?? pending?.format ?? "webm";

  const download = async () => {
    const file = await services.result.file(p.id, currentReady!.number);
    if (!file) {
      toast({ tone: "danger", title: t("features.recordingFlowMock.page.genericError") });
      return;
    }
    const href = URL.createObjectURL(file.blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = file.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 10_000);
  };

  return (
    <ResultView
      phase={phase}
      progress={progressing?.progress ?? 0}
      remainingSeconds={(1 - (progressing?.progress ?? 0)) * lengthS}
      shown={currentReady?.number ?? 1}
      shownTurns={currentReady?.rerecorded ?? []}
      newer={newer}
      name={p.name}
      total={p.turnsTotal}
      lengthS={lengthS}
      turns={turns}
      videoSrc={phase === "ready" ? url! : `${source.data}#t=${p.section.startMs / 1000}`}
      videoRef={videoRef}
      downloadFormat={format}
      chooser={chooser}
      pick={pick}
      notify={notify}
      announceReady={sawAssembling}
      onPick={setPick}
      onOpenChooser={(at) => {
        setPick(turnAt(turns, at));
        setChooser(true);
      }}
      onCloseChooser={() => setChooser(false)}
      onRerecord={() => navigate(`/projects/${p.id}/turns/${pick + 1}?mode=rerecord`)}
      onDownload={() => void download()}
      onSwitch={() => {
        if (!pending) return;
        playNext.current = true;
        void services.result.switchTo(p.id, pending.number).then(() => qc.invalidateQueries({ queryKey: qk.result(p.id) }));
      }}
      onRetry={() => {
        if (pending) void services.result.retry(p.id, pending.number).then(() => result.refetch());
      }}
      onRetryNew={() => {
        if (pending) void services.result.retry(p.id, pending.number).then(() => result.refetch());
      }}
    />
  );
}
