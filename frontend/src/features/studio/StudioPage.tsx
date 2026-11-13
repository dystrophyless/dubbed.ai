import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation, useNavigate, useParams } from "react-router";
import type { TurnDir } from "@/components/media";
import { toast } from "@/components/ui";
import { GuardNavigate } from "@/features/recording-flow-mock/GuardNavigate";
import { guardTarget } from "@/features/recording-flow-mock/guard";
import { StudioView, type Playing, type RecordBlock, type StudioViewProps } from "@/features/recording-flow-mock/views/StudioView";
import { applyDisplayGain, displayGain } from "@/services/rules/waveform";
import { qk, useProject, useResult, useServices, useTakes, useTurns, useVideoUrl, type Project, type Take, type Turn } from "@/services";

/*
 * S3 — the recording studio on the real route /projects/:id/turns/:n (StudioShell).
 * Original plays the source video from the turn's start for its window (unmasked by the volume control); My take plays the
 * same fragment muted plus the saved take; while recording the scene plays muted. Next needs a saved take; the last turn's
 * Next is "Build the result". Space / R / ← / → are handled by the view. Re-record mode (US3) and the exit rules beyond
 * "stop or discard a running take" (US4) are seams.
 * Re-record mode (US3): /projects/:id/turns/:n?mode=rerecord on a done project. Every turn has a take, ‹ › move freely,
 * "Build the new version" appears once a turn has a take that is not in any version yet, and Exit then asks first.
 * One StudioTurn stays mounted across turns (so the header's TurnDots animate); its per-turn state resets when the turn changes.
 */
const noop = () => undefined;
type Clip = "none" | Exclude<Playing, "none"> | "record";
type Session = "idle" | "recording" | "saving";

export function StudioPage() {
  const { id, n } = useParams();
  const project = useProject(id);
  const turns = useTurns(id);
  const takes = useTakes(id);
  const video = useVideoUrl(id);
  const result = useResult(id);
  const { search } = useLocation();
  const wantsRerecord = new URLSearchParams(search).get("mode") === "rerecord";

  const redirect = guardTarget(project, null, wantsRerecord ? ["recording", "done"] : ["recording"]);
  if (redirect) return <GuardNavigate to={redirect} />;
  const rerecord = wantsRerecord && project.data?.state === "done";
  // re-recording is blocked while a version assembles: back to the Result, which says so
  if (rerecord && result.data?.pending?.state === "assembling") return <Navigate to={`/projects/${id}/result`} replace />;

  const list = turns.data ? [...turns.data].sort((a, b) => a.n - b.n) : null;
  const index = Number.parseInt(n ?? "", 10) - 1;
  if (list && list.length > 0 && !(index >= 0 && index < list.length)) {
    return <Navigate to={`/projects/${id}/turns/${Math.min(Math.max(index + 1, 1), list.length)}${rerecord ? "?mode=rerecord" : ""}`} replace />;
  }
  if (!project.data || !project.isFetchedAfterMount || !list || list.length === 0 || !takes.data || !video.data) {
    return <StudioLoading />;
  }
  return <StudioTurn project={project.data} turns={list} takes={takes.data} sourceUrl={video.data} index={index} rerecord={rerecord} />;
}

function StudioLoading() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  return (
    <StudioView
      loading
      title=""
      index={0} total={1} dir="none" isDone={() => false} lineText="" rec="idle" elapsed={0} windowSeconds={1}
      playing="none" hasTake={false} live={false} rerecord={false} freshCount={0} canPrev={false} canNext={false}
      originalPeaks={[]} takePeaks={[]} videoSrc="" videoRef={videoRef}
      volume={0.8} onVolume={noop} recordBlock={null} onRetryRecordBlock={noop} settingsHref="/settings"
      askLeave={false} askBuild={false}
      onExit={() => navigate("/projects")}
      onStay={noop} onLeaveNoSave={noop} onLeaveSave={noop} onCloseAskBuild={noop} onLeaveNoBuild={noop} onBuild={noop}
      onRecord={noop} onStop={noop} onPlay={noop} onPrev={noop} onNext={noop}
    />
  );
}

type TurnProps = { project: Project; turns: Turn[]; takes: Take[]; sourceUrl: string; index: number; rerecord: boolean };

function StudioTurn({ project, turns, takes, sourceUrl, index, rerecord }: TurnProps) {
  const { t, i18n } = useTranslation();
  const services = useServices();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const turn = turns[index]!;
  const total = turns.length;
  const last = index === total - 1;
  const take = takes.find((k) => k.n === turn.n) ?? null;
  const hasTake = take !== null;
  const startS = turn.startMs / 1000;
  const windowS = turn.windowMs / 1000;
  const dir = ((location.state as { dir?: TurnDir } | null)?.dir ?? "none") as TurnDir;
  const lang = i18n.resolvedLanguage?.startsWith("ru") ? "ru" : "en";

  const videoRef = useRef<HTMLVideoElement>(null);
  const [clip, setClip] = useState<Clip>("none");
  const [session, setSession] = useState<Session>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [livePeaks, setLivePeaks] = useState<number[]>([]);
  const [acted, setActed] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [block, setBlock] = useState<RecordBlock>(null);
  // the take being recorded is the turn's first: its controls (My take, Next) appear once it is saved, not while it is being saved
  const [firstTake, setFirstTake] = useState(false);
  const [askLeave, setAskLeave] = useState(false);
  const [askBuild, setAskBuild] = useState(false);
  const [shownTurn, setShownTurn] = useState(turn.n);
  // a new turn starts clean (this component is not remounted per turn)
  if (shownTurn !== turn.n) {
    setShownTurn(turn.n);
    setClip("none");
    setElapsed(0);
    setLivePeaks([]);
    setActed(false);
    setBlock(null);
  }
  const freshCount = rerecord ? takes.filter((k) => k.inVersion === null).length : 0;
  const resultPath = `/projects/${project.id}/result`;
  const takeUrl = useQuery({ queryKey: qk.takeUrl(project.id, turn.n), queryFn: () => services.studio.takeUrl(project.id, turn.n), enabled: hasTake });

  const busy = session !== "idle";
  const abortRec = useRef<AbortController | null>(null);
  const stopRec = useRef<AbortController | null>(null);
  const leaving = useRef<"none" | "after-save" | "discard">("none");
  const building = useRef(false);
  const volumeRef = useRef(volume);

  useEffect(() => {
    volumeRef.current = volume;
    const v = videoRef.current;
    if (v) v.volume = volume;
  }, [volume]);

  /* ---- the scene: Original / My take / recording (muted), driven by the video's own clock ---- */
  useEffect(() => {
    const v = videoRef.current;
    if (!v || clip === "none") return;
    let cancelled = false;
    let audio: HTMLAudioElement | null = null;
    const run = async () => {
      if (v.readyState < 1) await new Promise<void>((resolve) => v.addEventListener("loadedmetadata", () => resolve(), { once: true }));
      if (cancelled) return;
      v.currentTime = startS;
      v.muted = clip !== "original";
      v.volume = volumeRef.current;
      if (clip === "take" && takeUrl.data) audio = new Audio(takeUrl.data);
      try {
        await v.play();
      } catch {
        // the browser refused sound: play the picture silently instead
        v.muted = true;
        await v.play().catch(() => undefined);
      }
      if (cancelled) return;
      if (audio) void audio.play().catch(() => undefined);
    };
    void run();
    const timer =
      clip === "record"
        ? 0
        : window.setInterval(() => {
            const e = v.currentTime - startS;
            if (e >= windowS - 0.02 || v.ended) setClip("none");
            else setElapsed(Math.max(0, e));
          }, 50);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      v.pause();
      audio?.pause();
      try {
        v.currentTime = startS;
      } catch {
        /* not seekable yet */
      }
      setElapsed(0);
    };
  }, [clip, startS, windowS, takeUrl.data]);

  // arrival on a turn without a take: the fragment plays once by itself (studio-brief 14)
  const arrivedAt = useRef<number | null>(null);
  useEffect(() => {
    if (arrivedAt.current === turn.n || hasTake) return;
    arrivedAt.current = turn.n;
    setClip("original");
  }, [hasTake, turn.n]);

  // another tab holds the recording lock: the notice clears itself when it lets go (D2)
  useEffect(() => {
    if (block !== "other-tab") return;
    const controller = new AbortController();
    void services.studio.whenCaptureFree(project.id, controller.signal).then(() => {
      if (!controller.signal.aborted) setBlock(null);
    });
    return () => controller.abort();
  }, [block, services, project.id]);

  useEffect(() => () => abortRec.current?.abort(), []);

  /* ---- actions ---- */
  const goTo = (to: number, direction: TurnDir) => navigate(`/projects/${project.id}/turns/${to}${rerecord ? "?mode=rerecord" : ""}`, { state: { dir: direction } });

  const play = (what: Exclude<Playing, "none">) => {
    if (busy) return;
    if (what === "take" && !takeUrl.data) return;
    setActed(true);
    setClip((c) => (c === what ? "none" : what));
  };

  const record = async () => {
    if (busy || block || abortRec.current) return; // a start already in progress
    // set before the first await: closing the studio during start-up cancels it
    const abort = new AbortController();
    abortRec.current = abort;
    setActed(true);
    setClip("none");
    // a blocked microphone is the more useful thing to tell: it wins over the lock notice (D2)
    const mic = await navigator.permissions?.query({ name: "microphone" as PermissionName }).catch(() => null);
    if (abort.signal.aborted) return;
    if (mic?.state === "denied") {
      abortRec.current = null;
      setBlock("microphone");
      return;
    }
    const lease = await services.studio.acquireCapture(project.id);
    if (!lease.ok) {
      abortRec.current = null;
      setBlock("other-tab");
      return;
    }
    if (abort.signal.aborted) {
      await lease.value.release(); // the studio was closed: let go of the lock, don't record
      return;
    }
    const stop = new AbortController();
    stopRec.current = stop;
    setFirstTake(!hasTake);
    setSession("recording");
    setElapsed(0);
    setLivePeaks([]);
    const outcome = await services.studio.record(lease.value, turn.n, {
      windowMs: turn.windowMs,
      signal: abort.signal,
      stop: stop.signal,
      onStarted: () => setClip("record"),
      onProgress: ({ elapsedMs, peaks }) => {
        setElapsed(elapsedMs / 1000);
        setLivePeaks(peaks);
        if (elapsedMs >= turn.windowMs - 60) setSession("saving");
      },
    });
    await lease.value.release();
    abortRec.current = null;
    stopRec.current = null;
    setSession("saving");
    setClip("none");
    if (outcome.ok) {
      // the same turn recorded again has a new file: the cached URL of the old take must go
      await Promise.all([qc.refetchQueries({ queryKey: qk.takes(project.id) }), qc.invalidateQueries({ queryKey: qk.takeUrl(project.id, turn.n) })]);
    } else if (outcome.error === "assembling") navigate(resultPath, { replace: true });
    else if (outcome.error === "mic-blocked" || outcome.error === "mic-missing") setBlock("microphone");
    else if (leaving.current === "none") toast({ tone: "danger", title: t("features.recordingFlowMock.studio.interrupted") });
    setSession("idle");
    setFirstTake(false);
    setElapsed(0);
    if (leaving.current === "after-save") {
      leaving.current = "none";
      if (rerecord) setAskBuild(true);
      else navigate("/projects");
    }
  };

  const stop = () => {
    if (session !== "recording") return;
    stopRec.current?.abort();
    setSession("saving");
  };

  const retryBlock = async () => {
    if (block === "other-tab") {
      const lease = await services.studio.acquireCapture(project.id);
      if (!lease.ok) return;
      await lease.value.release();
    }
    setBlock(null);
  };

  const build = async () => {
    if (building.current) return;
    building.current = true;
    const outcome = await services.studio.buildResult(project.id);
    if (!outcome.ok) {
      building.current = false;
      toast({ tone: "danger", title: t("features.recordingFlowMock.page.genericError") });
      return;
    }
    // the Result page must not trust a project read from before the build
    await Promise.all([qc.refetchQueries({ queryKey: qk.project(project.id) }), qc.refetchQueries({ queryKey: qk.result(project.id) })]);
    navigate(`/projects/${project.id}/result`);
  };

  const buildNew = async () => {
    if (building.current) return;
    building.current = true;
    const outcome = await services.studio.buildNewVersion(project.id);
    if (!outcome.ok && outcome.error !== "assembling") {
      building.current = false;
      setAskBuild(false);
      toast({ tone: "danger", title: t("features.recordingFlowMock.page.genericError") });
      return;
    }
    await Promise.all([
      qc.refetchQueries({ queryKey: qk.project(project.id) }),
      qc.refetchQueries({ queryKey: qk.result(project.id) }),
      qc.refetchQueries({ queryKey: qk.takes(project.id) }),
    ]);
    navigate(resultPath);
  };

  const next = () => {
    if (!hasTake || busy) return;
    if (rerecord) {
      if (!last) goTo(turn.n + 1, "next");
    } else if (last) void build();
    else goTo(turn.n + 1, "next");
  };
  const prev = () => {
    if (index > 0 && !busy) goTo(turn.n - 1, "prev");
  };

  const exit = () => {
    if (busy) setAskLeave(true);
    else if (rerecord && freshCount > 0) setAskBuild(true);
    else navigate(rerecord ? resultPath : "/projects");
  };

  const rec = session !== "idle" ? session : hasTake ? "saved" : "idle";
  const playing: Playing = clip === "original" || clip === "take" ? clip : "none";

  const props: StudioViewProps = {
    loading: false,
    title: project.name,
    index,
    total,
    dir,
    isDone: (i) => takes.some((k) => k.n === turns[i]?.n),
    lineText: turn.text[lang],
    rec,
    elapsed,
    windowSeconds: windowS,
    playing,
    hasTake: hasTake && !(busy && firstTake),
    live: acted,
    rerecord,
    freshCount,
    canPrev: index > 0 && !busy,
    canNext: rerecord ? !last && !busy : hasTake && !busy,
    // display only (owner 2026-11-12): the whole clip shares one gain, so quiet audio stays readable and turns stay comparable
    originalPeaks: applyDisplayGain(turn.originalPeaks, displayGain(turns.map((x) => x.originalPeaks))),
    takePeaks: busy ? livePeaks : (take?.peaks ?? []),
    videoSrc: `${sourceUrl}#t=${startS}`,
    videoRef,
    volume,
    onVolume: setVolume,
    recordBlock: block,
    onRetryRecordBlock: () => void retryBlock(),
    settingsHref: "/settings",
    askLeave,
    askBuild,
    onExit: exit,
    onStay: () => {
      // "Stay" keeps what was recorded: the running take is stopped and saved
      setAskLeave(false);
      stop();
    },
    onLeaveNoSave: () => {
      leaving.current = "discard";
      abortRec.current?.abort();
      navigate(rerecord ? resultPath : "/projects");
    },
    onLeaveSave: () => {
      leaving.current = "after-save";
      setAskLeave(false);
      stop();
    },
    onCloseAskBuild: () => setAskBuild(false),
    onLeaveNoBuild: () => navigate(resultPath), // the new takes are kept; the result is unchanged
    onBuild: () => void buildNew(),
    onRecord: () => void record(),
    onStop: stop,
    onPlay: play,
    onPrev: prev,
    onNext: next,
  };
  return <StudioView {...props} />;
}
