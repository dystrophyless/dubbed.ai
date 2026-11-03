import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { StudioShell } from "@/app/shells/Shells";
import { StateSwitcher } from "@/components/dev/StateSwitcher";
import { useViewState } from "@/components/dev/view-state";
import { Icon } from "@/components/icons";
import {
  AudioTrack, RecordButton, SceneColumn, TurnDots, TurnLine, VideoStage, VolumeButton, demoPeaks, formatSeconds,
  type RecordState, type TurnDir,
} from "@/components/media";
import { Alert, Button, Dialog, Skeleton, SkeletonText, TextLink, Tooltip } from "@/components/ui";
import { cx } from "@/components/ui/kit/cx";
import s from "./studio.module.css";

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
  "no-take", "arrival", "recording", "saving", "saved", "playing-take", "last", "exit-unsaved", "mic-blocked", "loading",
] as const;
type Preview = (typeof STUDIO_STATES)[number];
type Playing = "none" | "original" | "take";

const CLIP = "/media/scene.mp4";
/*
 * owner 2026-11-03: the stage is always 2.35:1 ("scope", the demo clip's own shape). A narrower clip (16:9, 9:16) fills
 * the stage's height, centred, with black bars at the sides.
 */
const STAGE_RATIO = 960 / 408;
type ClipShape = "scope" | "16x9" | "portrait";
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
    index, total, dir, takes, rec, elapsed, playing, live, ask, micBlocked, frag, win, hasTake, busy, last, canPrev, canNext,
    rerecord, fresh, build,
    lineKey: LINES[index % LINES.length],
    record: () => {
      if (micBlocked || busy) return;
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
  const loading = preview === "loading";
  const ratio = STAGE_RATIO;

  useStudioKeys(st, loading);

  return (
    <StudioShell
      title={t("studio.project")}
      exitLabel={t("studio.exit")}
      onExit={() => st.exit(leave, () => setAskBuild(true))}
      ratio={ratio}
      busy={loading}
      data-testid="studio"
      progress={<TurnDots total={st.total} index={st.index} done={(i) => st.takes.has(i)} dir={st.dir} />}
      right={<VolumeButton label={t("studio.volume")} value={volume} onChange={setVolume} />}
    >
      {loading ? (
        <LoadingScene ratio={ratio} />
      ) : (
        <div key={st.index} className={s.scene} data-dir={st.dir} data-clip={shape}>
          <SceneColumn ratio={ratio} maxHeight="var(--video-h)">
            <Stage st={st} ratio={ratio} volume={volume} />
            <div data-testid="turn-line"><TurnLine text={t(`studio.lines.${st.lineKey}`)} /></div>
            <div className={s.trackWrap} data-testid="audio-track" data-mode={st.rec === "recording" ? "recording" : st.hasTake ? "saved" : "original"}>
              <Track st={st} />
              <TrackHint st={st} />
            </div>
          </SceneColumn>
        </div>
      )}

      {st.micBlocked && !loading && <BottomNotice>
          {/* owner 2026-11-03: a notification pinned to the bottom, outside the layout — nothing on the page moves when it appears.
              Amber, not red: red is kept for recording (README rule 6). */}
          <Alert
            tone="warning"
            title={t("studio.mic.title")}
            action={<Button variant="secondary" size="sm" icon={<Icon name="retry" size={14} />} onClick={st.retryMic}>{t("studio.mic.retry")}</Button>}
          >
            <span id="studio-mic-reason">{t("studio.mic.text")}</span>{" "}
            {/* prototype stand-in for /settings (Microphone) */}
            <TextLink to="/styleguide/templates/settings">{t("studio.mic.settings")}</TextLink>
          </Alert>
      </BottomNotice>}

      {loading ? <LoadingActions /> : <Actions st={st} />}

      <Dialog
        open={st.ask}
        onClose={st.stay}
        title={t("studio.leave.title")}
        data-testid="leave-dialog"
        footer={
          <>
            <Button variant="ghost" onClick={st.stay}>{t("studio.leave.stay")}</Button>
            <Button variant="secondary" onClick={leave}>{t("studio.leave.noSave")}</Button>
            <Button onClick={leave}>{t("studio.leave.save")}</Button>
          </>
        }
      >
        <p className={s.dialogText}>{t("studio.leave.text", { n: st.index + 1 })}</p>
      </Dialog>

      <Dialog
        open={askBuild}
        onClose={() => setAskBuild(false)}
        title={t("studio.rerecord.leaveTitle")}
        data-testid="leave-build-dialog"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAskBuild(false)}>{t("studio.leave.stay")}</Button>
            <Button variant="secondary" onClick={leave}>{t("studio.rerecord.leaveNoBuild")}</Button>
            <Button onClick={st.build}>{t("studio.rerecord.leaveBuild")}</Button>
          </>
        }
      >
        <p className={s.dialogText}>{t("studio.rerecord.leaveText", { count: st.fresh.size })}</p>
      </Dialog>
    </StudioShell>
  );
}

/*
 * The video: the turn's fragment of the clip at its own shape. Follows the demo clock — plays with the original voice,
 * plays MUTED while recording (studio-brief 16) and with "your voice" for My take (the prototype has no take audio, so
 * the picture plays silently; the real studio mixes the take in through Web Audio). Idle: the fragment's first frame
 * with a quiet play button (pointer shortcut for Original; keyboard users have Original / Space).
 */
function Stage({ st, ratio, volume }: { st: Demo; ratio: number; volume: number }) {
  const { t } = useTranslation();
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
  }, [running, start, frozenAt, st.playing, st.rec]);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.muted = st.playing !== "original" || recording;
    v.volume = volume;
  }, [st.playing, recording, volume]);

  const idle = !recording && st.rec !== "saving" && st.playing === "none";
  return (
    <div className={s.stage} data-testid="studio-stage" data-playing={st.playing} data-recording={recording || undefined}>
      <VideoStage
        src={`${CLIP}#t=${start}`}
        ratio={ratio}
        maxHeight="var(--video-h)"
        videoRef={video}
        muted
        label={recording ? t("studio.videoMuted") : t("studio.video")}
      >
        {idle && (
          // pointer-only shortcut for "Original"; hidden from assistive tech, which has the Original button
          <button type="button" className={s.playOverlay} tabIndex={-1} aria-hidden="true" onClick={() => st.play("original")}>
            <Icon name="play" size={20} />
          </button>
        )}
        {recording && (
          <span className={s.chip} data-testid="stage-muted">
            <Icon name="mute" size={14} />
            {t("studio.muted")}
          </span>
        )}
        {st.playing === "take" && (
          <span className={s.chip} data-testid="stage-take">
            <Icon name="waveform" size={14} />
            {t("studio.yourVoice")}
          </span>
        )}
      </VideoStage>
    </div>
  );
}

function Track({ st }: { st: Demo }) {
  const { t } = useTranslation();
  const original = useMemo(() => demoPeaks(160, 7 + st.index * 3), [st.index]);
  const take = useMemo(() => demoPeaks(160, 31 + st.index * 5), [st.index]);
  const recording = st.rec === "recording";
  return (
    <AudioTrack
      label={t("studio.track")}
      original={original}
      take={recording || st.rec === "saving" || st.hasTake ? take : undefined}
      takeProgress={recording ? st.elapsed / st.win : 1}
      mode={recording ? "recording" : st.playing !== "none" ? "playing" : "idle"}
      progress={st.elapsed / st.win}
    />
  );
}

/*
 * The action row (studio-brief 11, 14). A button that stays keeps its position; slots are kept while hidden.
 *   wide:  [‹] [Original] [My take] ··· [Record] [Next | time hint]
 *   phone: [‹] [Original] [Record]  /  [My take] [Next | time hint]   (Next bottom-right)
 * Recording: only Stop (+ "1.5 s left"); everything else hidden in its slot.
 */
/** "1.5 s left" / "Saving take…" in the corner of the audio track, next to the take being drawn (owner 2026-11-03). */
function TrackHint({ st }: { st: Demo }) {
  const { t, i18n } = useTranslation();
  const recording = st.rec === "recording";
  const hint =
    recording ? t("media.record.left", { s: formatSeconds(Math.max(0, st.win - st.elapsed), i18n.resolvedLanguage) })
    : st.rec === "saving" ? t("media.record.saving")
    : null;
  if (!hint || st.micBlocked) return null;
  return (
    <span className={s.hint} data-tone={recording ? "recording" : undefined} data-testid="record-hint">
      {hint}
    </span>
  );
}

function Actions({ st }: { st: Demo }) {
  const { t } = useTranslation();
  const recording = st.rec === "recording";
  const saving = st.rec === "saving";
  const saved = st.hasTake && !st.busy;
  const status = recording ? t("studio.status.recording") : saving ? t("media.record.saving") : saved && st.live ? t("studio.status.saved") : "";
  const origOn = st.playing === "original";
  const takeOn = st.playing === "take";
  return (
    <div className={s.actions} data-testid="studio-actions" data-state={st.rec}>
      <div className={s.group}>
        {/* owner 2026-11-03: no empty slot on turn 1 — ‹ exists only when there is somewhere to go back to.
            Owner 2026-11-03: while recording / saving every button stays where it is, disabled — the row keeps its shape. */}
        {st.index > 0 && (
          <span className={cx(s.cell, s.backCell)}>
            <Tooltip content={t("studio.tip.prev")}>
              <Button variant="secondary" size="lg" icon={<Icon name="prev" />} aria-label={t("studio.prev")} aria-keyshortcuts="ArrowLeft" disabled={st.busy} onClick={st.prev} />
            </Tooltip>
          </span>
        )}
        {st.rerecord && !st.last && (
          <span className={cx(s.cell, s.backCell)}>
            <Tooltip content={t("studio.rerecord.tipNext")}>
              <Button variant="secondary" size="lg" icon={<Icon name="next" />} aria-label={t("studio.rerecord.next")} aria-keyshortcuts="ArrowRight" disabled={st.busy} onClick={st.next} data-testid="studio-forward" />
            </Tooltip>
          </span>
        )}
        <span className={cx(s.cell, s.origCell)}>
          <Tooltip content={origOn ? t("studio.tip.pause") : t("studio.tip.original")}>
            <Button variant="secondary" size="lg" icon={<Icon name={origOn ? "pause" : "play"} />} aria-pressed={origOn} aria-keyshortcuts="Space" disabled={st.busy} onClick={() => st.play("original")}>
              {t("studio.original")}
            </Button>
          </Tooltip>
        </span>
        {st.hasTake && (
          <span className={cx(s.cell, s.takeCell)}>
            <Tooltip content={t("studio.tip.myTake")}>
              <Button variant="secondary" size="lg" icon={<Icon name={takeOn ? "pause" : "waveform"} />} aria-pressed={takeOn} disabled={st.busy} onClick={() => st.play("take")}>
                {t("studio.myTake")}
              </Button>
            </Tooltip>
          </span>
        )}
      </div>
      <div className={s.group}>
        <span className={cx(s.cell, s.recCell)}>
          {st.micBlocked && !st.busy ? (
            // disabled; the reason is the bottom notice (linked for screen readers), not a tooltip
            <RecordButton mode={st.hasTake ? "again" : "record"} disabled aria-describedby="studio-mic-reason" />
          ) : (
            <Tooltip content={st.busy ? t("studio.tip.stop") : st.hasTake ? t("studio.tip.again") : t("studio.tip.record")}>
              <RecordButton
                mode={st.busy ? "stop" : st.hasTake ? "again" : "record"}
                progress={recording ? st.elapsed / st.win : 1}
                loading={saving}
                aria-keyshortcuts="R"
                onClick={st.busy ? st.stop : st.record}
              />
            </Tooltip>
          )}
        </span>
        {st.rerecord ? (
          // re-record mode: "Build the new version" exists once a turn has a new take (no Next — › moves on)
          st.fresh.size > 0 && (
            <span className={cx(s.cell, s.nextCell)}>
              <Tooltip content={t("studio.rerecord.tipBuild")}>
                <Button variant="primary" size="lg" disabled={st.busy} onClick={st.build} data-testid="studio-build">
                  {t("studio.buildNew")}
                </Button>
              </Tooltip>
            </span>
          )
        ) : st.hasTake && (
          <span className={cx(s.cell, s.nextCell)}>
            <Tooltip content={st.last ? t("studio.tip.build") : t("studio.tip.next")}>
              <Button
                variant="primary"
                size="lg"
                // "Build the result" has no arrow: it ends the studio (and fits the phone cell in RU)
                iconRight={st.last ? undefined : <Icon name="forward" />}
                aria-keyshortcuts={st.last ? undefined : "ArrowRight"}
                disabled={st.busy}
                onClick={st.next}
                data-testid="studio-next"
              >
                {st.last ? t("studio.build") : t("studio.next")}
              </Button>
            </Tooltip>
          </span>
        )}
      </div>
      <span className="sr-only" role="status">{status}</span>
    </div>
  );
}

/* Loading the turn's fragment: skeletons in the shape of the scene and the action row. */
function LoadingScene({ ratio }: { ratio: number }) {
  const { t } = useTranslation();
  return (
    <SceneColumn ratio={ratio} maxHeight="var(--video-h)">
      <VideoStage state="loading" ratio={ratio} maxHeight="var(--video-h)" label={t("studio.loading")} />
      <div className={s.lineSkeleton}>
        <SkeletonText size="lg" width="60%" />
      </div>
      <Skeleton height={72} radius="var(--radius-card)" />
    </SceneColumn>
  );
}

function LoadingActions() {
  const bar = (width: number) => <Skeleton width={width} height="var(--control-lg)" radius="var(--radius-control)" />;
  return (
    <div className={s.actions} aria-hidden="true" data-testid="studio-actions-loading">
      <div className={s.group}>
        <span className={cx(s.cell, s.backCell)}>{bar(32)}</span>
        <span className={cx(s.cell, s.origCell)}>{bar(96)}</span>
      </div>
      <div className={s.group}>
        <span className={cx(s.cell, s.recCell)}>{bar(92)}</span>
        <span className={cx(s.cell, s.nextCell, s.nextSkeleton)}>{bar(72)}</span>
      </div>
    </div>
  );
}

/*
 * Keyboard (shown in the tooltips): Space = play / pause the original, R = record / stop, ← / → = previous / next turn
 * (only when allowed). Ignored while a dialog or popover is open, in text fields and sliders; Space on a focused button
 * keeps its native meaning (press that button).
 */
function useStudioKeys(st: Demo, off: boolean) {
  const ref = useRef(st);
  useEffect(() => {
    ref.current = st;
  });
  useEffect(() => {
    if (off) return;
    const onKey = (e: KeyboardEvent) => {
      const d = ref.current;
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.repeat) return;
      if (d.ask || document.querySelector("[role=dialog], [role=menu]")) return;
      const el = e.target instanceof HTMLElement ? e.target : null;
      if (el?.closest("input, textarea, select, [contenteditable=true], [role=slider]")) return;
      if (e.key === " ") {
        if (el?.closest("button, a")) return;
        e.preventDefault();
        if (!d.busy) d.play("original");
      } else if (e.code === "KeyR") {
        e.preventDefault();
        if (d.rec === "recording") d.stop();
        else d.record();
      } else if (e.key === "ArrowLeft" && d.canPrev) {
        e.preventDefault();
        d.prev();
      } else if (e.key === "ArrowRight" && d.canNext && !d.last) {
        e.preventDefault();
        d.next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [off]);
}

/*
 * A notification pinned to the bottom (owner 2026-11-03). It sits outside the layout, so nothing jumps when it appears;
 * when it would cover the action row, the studio frees exactly that much room: the picture gets shorter by that amount,
 * its top stays where it was (the extra bottom padding and the shorter picture cancel out in the centring).
 */
function BottomNotice({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = ref.current?.closest<HTMLElement>('[data-testid="studio"]');
    if (!root) return;
    const fit = () => {
      const notice = ref.current;
      const actions = root.querySelector('[data-testid="studio-actions"]');
      if (!notice || !actions) return;
      const gap = 16;
      const current = Number.parseFloat(root.style.getPropertyValue("--notice-room")) || 0;
      // the notice's resting top (ignores its slide-in transform): viewport bottom − margin − height
      const noticeTop = window.innerHeight - gap - notice.offsetHeight;
      const need = Math.max(0, Math.ceil(actions.getBoundingClientRect().bottom + current + gap - noticeTop));
      root.style.setProperty("--notice-room", `${need}px`);
    };
    // on phones the picture is width-bound, so the room comes from the centring (half per pass): settle in a few passes
    const settle = () => {
      for (let i = 0; i < 6; i++) fit();
    };
    settle();
    window.addEventListener("resize", settle);
    return () => {
      window.removeEventListener("resize", settle);
      root.style.removeProperty("--notice-room");
    };
  }, []);
  return (
    <div ref={ref} className={s.notice} data-testid="mic-blocked">
      {children}
    </div>
  );
}
