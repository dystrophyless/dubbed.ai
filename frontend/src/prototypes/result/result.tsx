import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { AppShell } from "@/app/shells/Shells";
import { StateSwitcher } from "@/components/dev/StateSwitcher";
import { useViewState } from "@/components/dev/view-state";
import { togglePlay } from "@/components/media";
import { toast } from "@/components/ui";
import type { ClipShape } from "@/features/recording-flow-mock/views/NewDubView";
import { ResultView, turnAt, type NewVersion, type ResultPhase, type ResultTurn } from "@/features/recording-flow-mock/views/ResultView";
import { useDemoNotify } from "../processing/processing";
import { cancelResultElsewhere, scheduleResultElsewhere, sendResultNotification } from "./ready-elsewhere";

/*
 * Phase 4 — RESULT, HIGH-FI prototype (concept C "watch, then fix", with the video as large as the page allows and full
 * screen). Brief, owner answers and the open assumptions: design-system/result-brief.md.
 * Route: /prototypes/result/page?state=<state>
 *   no state (live)          the first version assembles (~5 s, the demo clock runs 12× faster) → ready
 *                            (the studio's last-turn "Build the result" opens this)
 *   &rerecorded=3,5          with no state: back from the studio's re-record mode — version 1 plays while version 2
 *                            (turns 3 and 5 re-recorded) assembles live → "Watch version 2"
 *   ?state=assembling|ready|chooser|new-version-assembling|new-version-ready|new-version-failed|failed  frozen states
 *                            (Try again / Download / Watch version 2 / Re-record a turn still work)
 *   &turns=N                 how many turns the scene has (default 6) · &name= the project name
 *   &ratio=portrait|16x9     a narrower clip in the 2.35:1 stage (black bars at the sides)
 *   &notify=granted|denied   the "Notify me when it's ready" control after the browser answered (as in processing)
 * "Re-record a turn" → the chooser (the turn under the playhead is selected) → the studio in re-record mode:
 *   /prototypes/studio/turn?mode=rerecord&turn=n&turns=N → "Build the new version" → back here with &rerecorded=.
 * Leaving while it assembles: a toast wherever the user is (+ a browser notification if opted in) — ready-elsewhere.tsx.
 * Real page: /projects/:id/result in AppShell; the version status comes from a TanStack Query poll.
 */
export const RESULT_STATES = [
  "live", "assembling", "ready", "chooser", "new-version-assembling", "new-version-ready", "new-version-failed", "failed",
] as const;
type Preview = (typeof RESULT_STATES)[number];
type Phase = ResultPhase;
type Newer = NewVersion | null;

const CLIP = "/media/scene.mp4";
const CLIP_SECONDS = 13.4;
const PROJECTS = "/styleguide/templates/projects";
const CREDITS = "/styleguide/templates/credits";
const NEW_DUB = "/prototypes/new-dub/page";
const STUDIO = "/prototypes/studio/turn";
const BALANCE = 48; // the demo balance after the 72-credit section was charged; re-recording is free (owner answer 2)

/** The six demo turns inside the demo clip (seconds); other scene lengths split the clip evenly. */
const SIX = [
  { start: 0.3, end: 3.2 }, { start: 3.5, end: 5.9 }, { start: 6.2, end: 8.6 },
  { start: 8.9, end: 10.4 }, { start: 10.6, end: 11.8 }, { start: 12.0, end: 13.3 },
];
const turnsOf = (n: number) =>
  n === SIX.length
    ? SIX
    : Array.from({ length: n }, (_, i) => ({ start: (i * CLIP_SECONDS) / n, end: ((i + 1) * CLIP_SECONDS) / n - 0.1 }));
const LINES = ["line0", "line1", "line2", "line3", "line4", "line5"] as const;

/** Demo estimate for assembling, in seconds (shown rounded, never a countdown); the clock runs 12× faster. */
const ASSEMBLE_S = 60;
const SPEED = 12;
const TICK_MS = 100;

const int = (v: string | null) => {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) ? n : null;
};
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** `format`: the real file format of the download. Approved prototype = "mp4" (backend); feature 001 demo = "webm" (MP4 on Safari). */
export type DownloadFormat = "mp4" | "webm";
export function ResultPrototype({ format = "mp4", showFormat = false }: { format?: DownloadFormat; showFormat?: boolean } = {}) {
  const preview = useViewState(RESULT_STATES);
  const [params] = useSearchParams();
  const total = clamp(int(params.get("turns")) ?? SIX.length, 1, 60);
  const raw = params.get("rerecorded");
  const list = (raw ?? "3").split(",").map((v) => int(v)).filter((v): v is number => v !== null && v >= 1 && v <= total);
  const rerecorded = Array.from(new Set(list.length ? list : [Math.min(3, total)])).sort((a, b) => a - b);
  const back = preview === "live" && raw !== null; // back from the studio's re-record mode
  const shape: ClipShape = params.get("ratio") === "portrait" ? "portrait" : params.get("ratio") === "16x9" ? "16x9" : "scope";
  return (
    <>
      <Result
        key={`${preview}-${back}-${rerecorded.join(",")}-${total}-${shape}`}
        preview={preview}
        back={back}
        rerecorded={rerecorded}
        total={total}
        shape={shape}
        showFormat={showFormat}
        format={params.get("format") === "mp4" || params.get("format") === "webm" ? (params.get("format") as DownloadFormat) : format}
      />
      <StateSwitcher states={RESULT_STATES} />
    </>
  );
}

/* ---------------- Demo state (the real page polls the version status with TanStack Query) ---------------- */

function useResultDemo(preview: Preview, back: boolean, rerecorded: number[], total: number, format: DownloadFormat) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const name = params.get("name") || t("result.name");
  const turns = turnsOf(total);
  const isNew = back || preview.startsWith("new-version");

  const [phase, setPhase] = useState<Phase>(
    (preview === "live" && !back) || preview === "assembling" ? "assembling" : preview === "failed" ? "failed" : "ready",
  );
  const [progress, setProgress] = useState(preview === "assembling" ? 0.35 : 0);
  const [shown, setShown] = useState(1); // the version on screen
  const [shownTurns, setShownTurns] = useState<number[]>([]); // what the version on screen re-recorded
  const [newer, setNewer] = useState<Newer>(
    isNew
      ? {
          n: 2,
          turns: rerecorded,
          status: preview === "new-version-ready" ? "ready" : preview === "new-version-failed" ? "failed" : "assembling",
        }
      : null,
  );
  const [newProgress, setNewProgress] = useState(preview === "new-version-assembling" ? 0.5 : 0);
  const [running, setRunning] = useState(preview === "live");
  const [chooser, setChooser] = useState(preview === "chooser");
  const [pick, setPick] = useState(() => (preview === "chooser" ? rerecorded[0] - 1 : 0));

  // the demo clock: the first version, or the new version behind the one playing
  useEffect(() => {
    if (!running) return;
    const step = ((TICK_MS / 1000) * SPEED) / ASSEMBLE_S;
    const id = window.setInterval(() => {
      if (phase === "assembling") {
        setProgress((p) => {
          const n = Math.min(1, p + step);
          if (n >= 1) window.setTimeout(() => { setPhase("ready"); setRunning(false); }, 0);
          return n;
        });
      } else if (newer?.status === "assembling") {
        setNewProgress((p) => {
          const n = Math.min(1, p + step);
          if (n >= 1) {
            window.setTimeout(() => {
              setNewer((v) => (v ? { ...v, status: "ready" } : v));
              setRunning(false);
            }, 0);
          }
          return n;
        });
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [running, phase, newer?.status]);

  // ready while the tab is in the background: a browser notification (if the user opted in)
  const firstReady = useRef(phase === "ready");
  useEffect(() => {
    if (phase !== "ready" || firstReady.current) return;
    firstReady.current = true;
    if (document.visibilityState === "hidden") sendResultNotification(name, { version: 1, rerecorded: [] });
  }, [phase, name]);
  const newReady = useRef(newer?.status === "ready");
  useEffect(() => {
    if (newer?.status !== "ready" || newReady.current) return;
    newReady.current = true;
    if (document.visibilityState === "hidden") sendResultNotification(name, { version: newer.n, rerecorded: newer.turns });
  }, [newer, name]);

  // leaving while it assembles: the job goes on and says "ready" wherever the user is (owner answer 8)
  const remaining = (phase === "assembling" ? 1 - progress : 1 - newProgress) * ASSEMBLE_S;
  const latest = useRef({ running, phase, newer, remaining });
  latest.current = { running, phase, newer, remaining };
  useEffect(() => {
    cancelResultElsewhere();
    return () => {
      // read at unmount on purpose: where the job is when the user leaves
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const { running: r, phase: p, newer: nv, remaining: left } = latest.current;
      if (!r) return;
      const ms = (left / SPEED) * 1000;
      if (p === "assembling") scheduleResultElsewhere(ms, name, { version: 1, rerecorded: [] });
      else if (nv?.status === "assembling") scheduleResultElsewhere(ms, name, { version: nv.n, rerecorded: nv.turns });
    };
  }, [name]);

  return {
    phase, progress, remaining, shown, shownTurns, newer, chooser, pick, name, turns, total,
    setPick,
    openChooser: (at: number) => {
      // the turn under the playhead (or the last one before it) is selected
      setPick(turnAt(turns, at));
      setChooser(true);
    },
    closeChooser: () => setChooser(false),
    rerecord: () => navigate(`${STUDIO}?mode=rerecord&turn=${pick + 1}&turns=${total}`),
    /** owner answer 6: the MP4 is ready when assembling finishes — the download is instant, named after the project */
    download: () => {
      const a = document.createElement("a");
      a.href = CLIP;
      a.download = `${name}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    },
    /** owner answer 3: after switching only the new version is kept; answer 4: it plays from the start (the page seeks). */
    switchToNew: () => {
      if (newer?.status !== "ready") return;
      setShown(newer.n);
      setShownTurns(newer.turns);
      setNewer(null);
    },
    /** owner answer 7: the server already retried once; Try again is free */
    retry: () => {
      setPhase("assembling");
      setProgress(0);
      setRunning(true);
    },
    retryNew: () => {
      setNewer((v) => (v ? { ...v, status: "assembling" } : v));
      setNewProgress(0);
      setRunning(true);
    },
  };
}

/* ---------------- The page ---------------- */

function Result({ preview, back, rerecorded, total, shape, format, showFormat }: { preview: Preview; back: boolean; rerecorded: number[]; total: number; shape: ClipShape; format: DownloadFormat; showFormat: boolean }) {
  const { t } = useTranslation();
  const r = useResultDemo(preview, back, rerecorded, total, format);
  const notify = useDemoNotify();
  const videoRef = useRef<HTMLVideoElement>(null);
  const ready = r.phase === "ready";

  // the chooser preview: the playhead sits in the selected turn, as if paused there
  useEffect(() => {
    const v = videoRef.current;
    if (preview !== "chooser" || !v) return;
    const at = r.turns[r.pick]?.start ?? 0;
    const seek = () => {
      v.currentTime = at + 0.4;
    };
    if (v.readyState >= 1) seek();
    else v.addEventListener("loadedmetadata", seek, { once: true });
    // the preview only — later picks must not move the playhead
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview]);

  const turns: ResultTurn[] = r.turns.map((tn, k) => ({ ...tn, text: t(`studio.lines.${LINES[k % LINES.length]}`) }));
  return (
    <AppShell
      credits={BALANCE}
      user={{ name: "Alex Morgan", email: "alex@example.com" }}
      links={{ home: PROJECTS, credits: CREDITS, settings: "/styleguide/templates/settings" }}
      onSignOut={() => toast({ tone: "info", title: t("tpl.common.signedOut") })}
      nav={[
        { to: PROJECTS, label: t("tpl.nav.projects"), icon: "projects" },
        { to: NEW_DUB, label: t("tpl.nav.newDub"), icon: "add" },
      ]}
    >
      <ResultView
        phase={r.phase}
        progress={r.phase === "assembling" ? r.progress : 0}
        remainingSeconds={r.remaining}
        shown={r.shown}
        shownTurns={r.shownTurns}
        newer={r.newer}
        name={r.name}
        total={r.total}
        turns={turns}
        videoSrc={CLIP}
        videoRef={videoRef}
        shape={shape}
        downloadFormat={showFormat ? format : null}
        chooser={r.chooser}
        pick={r.pick}
        notify={notify}
        announceReady={ready && preview === "live"}
        onPick={r.setPick}
        onOpenChooser={r.openChooser}
        onCloseChooser={r.closeChooser}
        onRerecord={r.rerecord}
        onDownload={r.download}
        onSwitch={() => {
          r.switchToNew();
          // owner answer 4: the new version plays from the start
          const v = videoRef.current;
          if (v) {
            v.currentTime = 0;
            togglePlay(v.paused ? v : null);
          }
        }}
        onRetry={r.retry}
        onRetryNew={r.retryNew}
      />
    </AppShell>
  );
}
