import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { StateSwitcher } from "@/components/dev/StateSwitcher";
import { useViewState } from "@/components/dev/view-state";
import { demoPeaks, type RecordState, type TurnDir } from "@/components/media";
import type { ClipShape } from "@/features/recording-flow-mock/views/NewDubView";
import { StudioView, type Playing } from "@/features/recording-flow-mock/views/StudioView";

/*
 * Phase 4 — recording studio, HIGH-FI prototype (concept A, Previous in the action row; studio-brief.md 11–16).
 * Route: /prototypes/studio/turn?state=<state>&turn=1..N&turns=N&ratio=portrait
 *   ?state=  every state below (the first is the default); a preview opens frozen at a telling moment
 *            (e.g. "1.5 s left") — any click or shortcut makes it live.
 *   ?turn=   the turn to open on (default 3); ?turns= how many turns the scene has (default 12; > 16 → smaller dots)
 *   ?ratio=portrait | 16x9  a 9:16 or 16:9 clip in the 2.35:1 stage (simulated by cropping the demo clip)
 *   ?mode=rerecord  opened from the result's "Re-record a turn" (owner 2026-11-04, result-brief answer 1): every turn
 *            already has a take; ‹ / › move between turns; once a turn has a new take the primary button is
 *            "Build the new version" (instead of Next) → the result with the new version assembling. Exit → the result,
 *            unchanged. Previews: the default = just opened (the old take); `saved` = the turn re-recorded.
 * The last turn's "Build the result" opens the result page (assembling): /prototypes/result/page?turns=N.
 * Real page: /projects/:id/turns/:n in StudioShell; the demo clock, takes and microphone become real hooks.
 */
export const STUDIO_STATES = [
  "no-take", "arrival", "recording", "saving", "saved", "playing-take", "last", "exit-unsaved", "mic-blocked", "recording-elsewhere", "loading",
] as const;
type Preview = (typeof STUDIO_STATES)[number];

const CLIP = "/media/scene.mp4";
/* each turn's fragment inside the demo clip: where it starts and how long the turn's window is (seconds) */
const FRAGMENTS = [
  { start: 0.4, window: 3.2 }, { start: 3.8, window: 2.6 }, { start: 6.6, window: 4.4 },
  { start: 9.2, window: 3.8 }, { start: 1.8, window: 2.9 }, { start: 5.0, window: 4.1 },
] as const;
const LINES = ["line0", "line1", "line2", "line3", "line4", "line5"] as const;
const SAVE_MS = 700;
const LEAVE_TO = "/prototypes/studio";
const RESULT = "/prototypes/result/page";

const int = (v: string | null) => {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) ? n : null;
};
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function StudioPrototype() {
  const preview = useViewState(STUDIO_STATES);
  const [params] = useSearchParams();
  const total = clamp(int(params.get("turns")) ?? 12, 1, 60);
  const turn = preview === "last" ? total : clamp(int(params.get("turn")) ?? 3, 1, total);
  const shape: ClipShape = params.get("ratio") === "portrait" ? "portrait" : params.get("ratio") === "16x9" ? "16x9" : "scope";
  const rerecord = params.get("mode") === "rerecord";
  return (
    <>
      <StudioTurn key={`${preview}-${turn}-${total}-${rerecord}`} preview={preview} turn={turn} total={total} shape={shape} rerecord={rerecord} />
      <StateSwitcher states={STUDIO_STATES} />
    </>
  );
}

/* ---------------- Demo state (the real page gets this from TanStack Query + the recorder) ---------------- */

function useStudioDemo(preview: Preview, turn: number, total: number, onBuild: (fresh: number[]) => void, rerecord: boolean) {
  const reDone = preview === "saved" || preview === "playing-take" || preview === "last";
  // re-record mode: every turn of the scene already has a take
  const takeHere = reDone || (rerecord && preview !== "recording" && preview !== "exit-unsaved" && preview !== "saving");
  const first = FRAGMENTS[(turn - 1) % FRAGMENTS.length];
  const [index, setIndex] = useState(turn - 1);
  const [dir, setDir] = useState<TurnDir>("none");
  // every turn before the opening one has a saved take (re-record mode: every turn)
  const [takes, setTakes] = useState<Set<number>>(() => new Set(Array.from({ length: rerecord ? total : takeHere ? turn : turn - 1 }, (_, i) => i)));
  // re-record mode: the turns that got a new take in this visit (they go into the new version)
  const [fresh, setFresh] = useState<Set<number>>(() => new Set(rerecord && reDone ? [turn - 1] : []));
  const [rec, setRec] = useState<RecordState>(
    preview === "recording" || preview === "exit-unsaved" ? "recording" : preview === "saving" ? "saving" : takeHere ? "saved" : "idle",
  );
  const [elapsed, setElapsed] = useState(() =>
    preview === "recording" || preview === "exit-unsaved" ? first.window - 1.5
    : preview === "saving" ? first.window
    : preview === "arrival" ? first.window * 0.35
    : preview === "playing-take" ? first.window * 0.5
    : 0,
  );
  const [playing, setPlaying] = useState<Playing>(preview === "arrival" ? "original" : preview === "playing-take" ? "take" : "none");
  // previews open frozen; the first real action makes the clock run
  const [live, setLive] = useState(false);
  const [ask, setAsk] = useState(preview === "exit-unsaved");
  const [micBlocked, setMicBlocked] = useState(preview === "mic-blocked");
  // feature 001 delta: the single recording lock is held by another tab (same bottom notice, own copy)
  const [lockedElsewhere, setLockedElsewhere] = useState(preview === "recording-elsewhere");
  const noRecord = micBlocked || lockedElsewhere;
  const frag = FRAGMENTS[index % FRAGMENTS.length];
  const win = frag.window;

  // the clock: recording stops by itself at the end of the window; playback plays the fragment once
  useEffect(() => {
    const running = live && !ask && (rec === "recording" || playing !== "none");
    if (!running) return;
    const t0 = performance.now();
    const id = window.setInterval(() => {
      const e = (performance.now() - t0) / 1000;
      if (e < win) return setElapsed(e);
      window.clearInterval(id);
      if (rec === "recording") {
        setElapsed(win);
        setRec("saving");
      } else {
        setElapsed(0);
        setPlaying("none");
      }
    }, 50);
    return () => window.clearInterval(id);
  }, [live, ask, rec, playing, win]);

  // saving → saved (the upload of the take)
  useEffect(() => {
    if (rec !== "saving" || !live || ask) return;
    const id = window.setTimeout(() => {
      setRec("saved");
      setElapsed(0);
      setTakes((t) => new Set(t).add(index));
      if (rerecord) setFresh((f) => new Set(f).add(index));
    }, SAVE_MS);
    return () => window.clearTimeout(id);
  }, [rec, live, ask, index, rerecord]);

  const hasTake = takes.has(index);
  const busy = rec === "recording" || rec === "saving";
  const last = index >= total - 1;
  const canPrev = index > 0 && !busy;
  // re-record mode: › moves on without a new take (every turn has one); there is no Next on the last turn
  const canNext = rerecord ? !last && !busy : hasTake && !busy;
  const build = () => {
    if (busy) return;
    onBuild(Array.from(fresh).sort((a, b) => a - b).map((i) => i + 1));
  };

  const go = (to: number) => {
    const has = takes.has(to);
    setLive(true);
    setDir(to > index ? "next" : "prev");
    setIndex(to);
    setRec(has ? "saved" : "idle");
    // arrival on a turn without a take: the fragment plays once by itself (studio-brief 14)
    setPlaying(has ? "none" : "original");
    setElapsed(0);
  };

  return {
    index, total, dir, takes, rec, elapsed, playing, live, ask, micBlocked, lockedElsewhere, noRecord, frag, win, hasTake, busy, last, canPrev, canNext,
    rerecord, fresh, build,
    lineKey: LINES[index % LINES.length],
    record: () => {
      if (noRecord || busy) return;
      setLive(true);
      setPlaying("none");
      setElapsed(0);
      setRec("recording");
    },
    stop: () => {
      if (rec !== "recording") return;
      setLive(true);
      setRec("saving");
    },
    play: (what: Exclude<Playing, "none">) => {
      if (busy) return;
      setLive(true);
      setElapsed(0);
      setPlaying((p) => (p === what ? "none" : what));
    },
    prev: () => canPrev && go(index - 1),
    next: () => {
      if (!canNext) return;
      if (rerecord) go(index + 1);
      else if (last) onBuild([]);
      else go(index + 1);
    },
    /** Exit: with a take still recording or saving, ask first (patterns.md → leaving the studio) */
    exit: (leave: () => void, askBuild: () => void) =>
      busy ? setAsk(true) : rerecord && fresh.size > 0 ? askBuild() : leave(),
    stay: () => {
      setAsk(false);
      setLive(true);
      if (rec === "recording") setRec("saving");
    },
    retryMic: () => setMicBlocked(false),
    retryLock: () => setLockedElsewhere(false),
  };
}

type Demo = ReturnType<typeof useStudioDemo>;

/* ---------------- The screen ---------------- */

function StudioTurn({ preview, turn, total, shape, rerecord }: { preview: Preview; turn: number; total: number; shape: ClipShape; rerecord: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // re-record mode came from the result: Exit goes back there, unchanged
  const leave = () => navigate(rerecord ? `${RESULT}?state=ready&turns=${total}` : LEAVE_TO);
  // "Build the result" (last turn) → the result, assembling; "Build the new version" → the result, version 2 assembling
  const onBuild = (fresh: number[]) =>
    navigate(rerecord ? `${RESULT}?rerecorded=${fresh.join(",")}&turns=${total}` : `${RESULT}?turns=${total}`);
  const st = useStudioDemo(preview, turn, total, onBuild, rerecord);
  // re-record mode: leaving with new takes that are not built yet asks first (owner 2026-11-04, result-brief)
  const [askBuild, setAskBuild] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const videoRef = useDemoVideo(st, volume);
  const original = useMemo(() => demoPeaks(160, 7 + st.index * 3), [st.index]);
  const take = useMemo(() => demoPeaks(160, 31 + st.index * 5), [st.index]);

  return (
    <StudioView
      loading={preview === "loading"}
      title={t("studio.project")}
      index={st.index}
      total={st.total}
      dir={st.dir}
      isDone={(i) => st.takes.has(i)}
      lineText={t(`studio.lines.${st.lineKey}`)}
      rec={st.rec}
      elapsed={st.elapsed}
      windowSeconds={st.win}
      playing={st.playing}
      hasTake={st.hasTake}
      live={st.live}
      rerecord={st.rerecord}
      freshCount={st.fresh.size}
      canPrev={st.canPrev}
      canNext={st.canNext}
      originalPeaks={original}
      takePeaks={take}
      videoSrc={`${CLIP}#t=${st.frag.start}`}
      videoRef={videoRef}
      shape={shape}
      volume={volume}
      onVolume={setVolume}
      recordBlock={st.micBlocked ? "microphone" : st.lockedElsewhere ? "other-tab" : null}
      onRetryRecordBlock={st.micBlocked ? st.retryMic : st.retryLock}
      // prototype stand-in for /settings (Microphone)
      settingsHref="/styleguide/templates/settings"
      askLeave={st.ask}
      askBuild={askBuild}
      onExit={() => st.exit(leave, () => setAskBuild(true))}
      onStay={st.stay}
      onLeaveNoSave={leave}
      onLeaveSave={leave}
      onCloseAskBuild={() => setAskBuild(false)}
      onLeaveNoBuild={leave}
      onBuild={st.build}
      onRecord={st.record}
      onStop={st.stop}
      onPlay={st.play}
      onPrev={st.prev}
      onNext={st.next}
    />
  );
}

/*
 * The demo stands in for the media session: the video follows the demo clock — plays with the original voice, plays MUTED
 * while recording (studio-brief 16) and silently for My take (the prototype has no take audio; the real studio plays the
 * saved take). Idle: the fragment's first frame.
 */
function useDemoVideo(st: Demo, volume: number) {
  const video = useRef<HTMLVideoElement>(null);
  const recording = st.rec === "recording";
  const running = st.live && !st.ask && (recording || st.playing !== "none");
  const { start } = st.frag;
  const frozenAt = st.live ? 0 : st.elapsed;

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (!running) {
      v.pause();
      try {
        v.currentTime = start + frozenAt;
      } catch {
        /* not seekable yet — the #t= fragment in the src shows the right frame */
      }
      return;
    }
    v.currentTime = start;
    v.play().catch(() => {
      // autoplay with sound refused by the browser: play the picture silently instead
      v.muted = true;
      return v.play().catch(() => undefined);
    });
  }, [video, running, start, frozenAt, st.playing, st.rec, st.index]);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.muted = st.playing !== "original" || recording;
    v.volume = volume;
  }, [st.playing, recording, volume, st.index]);
  return video;
}
