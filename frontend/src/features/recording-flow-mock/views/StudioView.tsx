import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { StudioShell } from "@/app/shells/Shells";
import { Icon } from "@/components/icons";
import {
  AudioTrack, RecordButton, SceneColumn, TurnDots, TurnLine, VideoStage, VolumeButton, formatSeconds,
  type RecordState, type TurnDir,
} from "@/components/media";
import { Alert, Button, Dialog, Skeleton, SkeletonText, TextLink, Tooltip } from "@/components/ui";
import { cx } from "@/components/ui/kit/cx";
import type { ClipShape } from "./NewDubView";
import s from "./studio.module.css";

/*
 * Recording studio (S3) — the approved concept A, presentational (studio-brief.md 11–16), plus the D2 lock notice.
 * Renders inside StudioShell (the focused shell) itself, because the shell's header carries the turn dots and the volume.
 * The page container (or the prototype's demo clock) owns the recorder, the clock and the <video>: the view only draws.
 */
export type Playing = "none" | "original" | "take";
export type RecordBlock = null | "microphone" | "other-tab";
export const STUDIO_STAGE_RATIO = 960 / 408;

export type StudioViewProps = {
  loading: boolean;
  /** the project name */
  title: string;
  index: number;
  total: number;
  dir: TurnDir;
  /** does turn i (0-based) have a saved take */
  isDone: (i: number) => boolean;
  /** the turn's line */
  lineText: string;
  rec: RecordState;
  /** seconds elapsed inside the turn's window (recording / playing) and the window's length */
  elapsed: number;
  windowSeconds: number;
  playing: Playing;
  hasTake: boolean;
  /** a take is on screen as a result of this visit (announces "Take saved") */
  live: boolean;
  /** re-record mode (US3): every turn has a take, › moves on, "Build the new version" after the first new take */
  rerecord: boolean;
  /** turns re-recorded in this visit (re-record mode) */
  freshCount: number;
  canPrev: boolean;
  canNext: boolean;
  originalPeaks: number[];
  takePeaks: number[];
  /** the turn's fragment of the source video, with its #t= fragment; the owner of the clock drives playback through videoRef */
  videoSrc: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  shape?: ClipShape;
  volume: number;
  onVolume: (v: number) => void;
  /** D2: one notice at a time; the microphone wins over the lock */
  recordBlock: RecordBlock;
  onRetryRecordBlock: () => void;
  settingsHref: string;
  /** "Leave with an unsaved take?" (recording / saving) */
  askLeave: boolean;
  /** re-record mode: "Build a new version before you leave?" */
  askBuild: boolean;
  onExit: () => void;
  onStay: () => void;
  onLeaveNoSave: () => void;
  onLeaveSave: () => void;
  onCloseAskBuild: () => void;
  onLeaveNoBuild: () => void;
  onBuild: () => void;
  onRecord: () => void;
  onStop: () => void;
  onPlay: (what: Exclude<Playing, "none">) => void;
  onPrev: () => void;
  onNext: () => void;
};

export function StudioView(v: StudioViewProps) {
  const { t } = useTranslation();
  const ratio = STUDIO_STAGE_RATIO;
  useStudioKeys(v);

  return (
    <StudioShell
      title={v.title}
      exitLabel={t("studio.exit")}
      onExit={v.onExit}
      ratio={ratio}
      busy={v.loading}
      data-testid="studio"
      progress={<TurnDots total={v.total} index={v.index} done={v.isDone} dir={v.dir} />}
      right={<VolumeButton label={t("studio.volume")} value={v.volume} onChange={v.onVolume} />}
    >
      {v.loading ? (
        <LoadingScene ratio={ratio} />
      ) : (
        <div className={s.scene} data-clip={v.shape ?? "scope"}>
          <SceneColumn ratio={ratio} maxHeight="var(--video-h)">
            {/* the picture stays mounted between turns (no blink); only the line and the track slide in */}
            <Stage v={v} ratio={ratio} />
            <div key={v.index} className={s.turnIn} data-dir={v.dir}>
              <div data-testid="turn-line"><TurnLine text={v.lineText} /></div>
              <div className={s.trackWrap} data-testid="audio-track" data-mode={v.rec === "recording" ? "recording" : v.hasTake ? "saved" : "original"}>
                <Track v={v} />
                <TrackHint v={v} />
              </div>
            </div>
          </SceneColumn>
        </div>
      )}

      {v.recordBlock === "other-tab" && !v.loading && (
        <BottomNotice testId="lock-elsewhere">
          <Alert
            tone="warning"
            title={t("features.recordingFlowMock.studio.lockTitle")}
            action={<Button variant="secondary" size="sm" icon={<Icon name="retry" size={14} />} onClick={v.onRetryRecordBlock}>{t("studio.mic.retry")}</Button>}
          >
            <span id="studio-lock-reason">{t("features.recordingFlowMock.studio.lockText")}</span>
          </Alert>
        </BottomNotice>
      )}

      {v.recordBlock === "microphone" && !v.loading && (
        <BottomNotice>
          {/* owner 2026-11-03: a notification pinned to the bottom, outside the layout — nothing on the page moves when it appears.
              Amber, not red: red is kept for recording (README rule 6). */}
          <Alert
            tone="warning"
            title={t("studio.mic.title")}
            action={<Button variant="secondary" size="sm" icon={<Icon name="retry" size={14} />} onClick={v.onRetryRecordBlock}>{t("studio.mic.retry")}</Button>}
          >
            <span id="studio-mic-reason">{t("studio.mic.text")}</span>{" "}
            <TextLink to={v.settingsHref}>{t("studio.mic.settings")}</TextLink>
          </Alert>
        </BottomNotice>
      )}

      {v.loading ? <LoadingActions /> : <Actions v={v} />}

      <Dialog
        open={v.askLeave}
        onClose={v.onStay}
        title={t("studio.leave.title")}
        data-testid="leave-dialog"
        footer={
          <>
            <Button variant="ghost" onClick={v.onStay}>{t("studio.leave.stay")}</Button>
            <Button variant="secondary" onClick={v.onLeaveNoSave}>{t("studio.leave.noSave")}</Button>
            <Button onClick={v.onLeaveSave}>{t("studio.leave.save")}</Button>
          </>
        }
      >
        <p className={s.dialogText}>{t("studio.leave.text", { n: v.index + 1 })}</p>
      </Dialog>

      <Dialog
        open={v.askBuild}
        onClose={v.onCloseAskBuild}
        title={t("studio.rerecord.leaveTitle")}
        data-testid="leave-build-dialog"
        footer={
          <>
            <Button variant="ghost" onClick={v.onCloseAskBuild}>{t("studio.leave.stay")}</Button>
            <Button variant="secondary" onClick={v.onLeaveNoBuild}>{t("studio.rerecord.leaveNoBuild")}</Button>
            <Button onClick={v.onBuild}>{t("studio.rerecord.leaveBuild")}</Button>
          </>
        }
      >
        <p className={s.dialogText}>{t("studio.rerecord.leaveText", { count: v.freshCount })}</p>
      </Dialog>
    </StudioShell>
  );
}

const isBusy = (v: StudioViewProps) => v.rec === "recording" || v.rec === "saving";
const isLast = (v: StudioViewProps) => v.index >= v.total - 1;

/*
 * The video: the turn's fragment of the clip at its own shape. The owner of the clock plays it (with the original voice,
 * MUTED while recording — studio-brief 16 — and with "your voice" for My take). Idle: the fragment's first frame with a
 * quiet play button (pointer shortcut for Original; keyboard users have Original / Space).
 */
function Stage({ v, ratio }: { v: StudioViewProps; ratio: number }) {
  const { t } = useTranslation();
  const recording = v.rec === "recording";
  const idle = !recording && v.rec !== "saving" && v.playing === "none";
  return (
    <div className={s.stage} data-testid="studio-stage" data-playing={v.playing} data-recording={recording || undefined}>
      <VideoStage
        src={v.videoSrc}
        ratio={ratio}
        maxHeight="var(--video-h)"
        videoRef={v.videoRef}
        muted
        label={recording ? t("studio.videoMuted") : t("studio.video")}
      >
        {idle && (
          // pointer-only shortcut for "Original"; hidden from assistive tech, which has the Original button
          <button type="button" className={s.playOverlay} tabIndex={-1} aria-hidden="true" onClick={() => v.onPlay("original")}>
            <Icon name="play" size={20} />
          </button>
        )}
        {recording && (
          <span className={s.chip} data-testid="stage-muted">
            <Icon name="mute" size={14} />
            {t("studio.muted")}
          </span>
        )}
        {v.playing === "take" && (
          <span className={s.chip} data-testid="stage-take">
            <Icon name="waveform" size={14} />
            {t("studio.yourVoice")}
          </span>
        )}
      </VideoStage>
    </div>
  );
}

function Track({ v }: { v: StudioViewProps }) {
  const { t } = useTranslation();
  const recording = v.rec === "recording";
  return (
    <AudioTrack
      label={t("studio.track")}
      original={v.originalPeaks}
      take={recording || v.rec === "saving" || v.hasTake ? v.takePeaks : undefined}
      takeProgress={recording ? v.elapsed / v.windowSeconds : 1}
      mode={recording ? "recording" : v.playing !== "none" ? "playing" : "idle"}
      progress={v.elapsed / v.windowSeconds}
    />
  );
}

/** "1.5 s left" / "Saving take…" in the corner of the audio track, next to the take being drawn (owner 2026-11-03). */
function TrackHint({ v }: { v: StudioViewProps }) {
  const { t, i18n } = useTranslation();
  const recording = v.rec === "recording";
  const hint =
    recording ? t("media.record.left", { s: formatSeconds(Math.max(0, v.windowSeconds - v.elapsed), i18n.resolvedLanguage) })
    : v.rec === "saving" ? t("media.record.saving")
    : null;
  if (!hint || v.recordBlock) return null;
  return (
    <span className={s.hint} data-tone={recording ? "recording" : undefined} data-testid="record-hint">
      {hint}
    </span>
  );
}

/*
 * The action row (studio-brief 11, 14). A button that stays keeps its position; slots are kept while hidden.
 *   wide:  [‹] [Original] [My take] ··· [Record] [Next | time hint]
 *   phone: [‹] [Original] [Record]  /  [My take] [Next | time hint]   (Next bottom-right)
 * Recording: only Stop (+ "1.5 s left"); everything else disabled in its slot.
 */
function Actions({ v }: { v: StudioViewProps }) {
  const { t } = useTranslation();
  const recording = v.rec === "recording";
  const saving = v.rec === "saving";
  const busy = isBusy(v);
  const last = isLast(v);
  const saved = v.hasTake && !busy;
  const status = recording ? t("studio.status.recording") : saving ? t("media.record.saving") : saved && v.live ? t("studio.status.saved") : "";
  const origOn = v.playing === "original";
  const takeOn = v.playing === "take";
  const blocked = v.recordBlock !== null;
  return (
    <div className={s.actions} data-testid="studio-actions" data-state={v.rec}>
      <div className={s.group}>
        {/* owner 2026-11-03: no empty slot on turn 1 — ‹ exists only when there is somewhere to go back to.
            Owner 2026-11-03: while recording / saving every button stays where it is, disabled — the row keeps its shape. */}
        {v.index > 0 && (
          <span className={cx(s.cell, s.backCell)}>
            <Tooltip content={t("studio.tip.prev")}>
              <Button variant="secondary" size="lg" icon={<Icon name="prev" />} aria-label={t("studio.prev")} aria-keyshortcuts="ArrowLeft" disabled={busy} onClick={v.onPrev} data-testid="studio-prev" />
            </Tooltip>
          </span>
        )}
        {v.rerecord && !last && (
          <span className={cx(s.cell, s.backCell)}>
            <Tooltip content={t("studio.rerecord.tipNext")}>
              <Button variant="secondary" size="lg" icon={<Icon name="next" />} aria-label={t("studio.rerecord.next")} aria-keyshortcuts="ArrowRight" disabled={busy} onClick={v.onNext} data-testid="studio-forward" />
            </Tooltip>
          </span>
        )}
        <span className={cx(s.cell, s.origCell)}>
          <Tooltip content={origOn ? t("studio.tip.pause") : t("studio.tip.original")}>
            <Button variant="secondary" size="lg" icon={<Icon name={origOn ? "pause" : "play"} />} aria-pressed={origOn} aria-keyshortcuts="Space" disabled={busy} onClick={() => v.onPlay("original")}>
              {t("studio.original")}
            </Button>
          </Tooltip>
        </span>
        {v.hasTake && (
          <span className={cx(s.cell, s.takeCell)}>
            <Tooltip content={t("studio.tip.myTake")}>
              <Button variant="secondary" size="lg" icon={<Icon name={takeOn ? "pause" : "waveform"} />} aria-pressed={takeOn} disabled={busy} onClick={() => v.onPlay("take")}>
                {t("studio.myTake")}
              </Button>
            </Tooltip>
          </span>
        )}
      </div>
      <div className={s.group}>
        <span className={cx(s.cell, s.recCell)}>
          {blocked && !busy ? (
            // disabled; the reason is the bottom notice (linked for screen readers), not a tooltip
            <RecordButton mode={v.hasTake ? "again" : "record"} disabled aria-describedby={v.recordBlock === "other-tab" ? "studio-lock-reason" : "studio-mic-reason"} />
          ) : (
            <Tooltip content={busy ? t("studio.tip.stop") : v.hasTake ? t("studio.tip.again") : t("studio.tip.record")} closeOn={busy}>
              <RecordButton
                mode={busy ? "stop" : v.hasTake ? "again" : "record"}
                progress={recording ? v.elapsed / v.windowSeconds : 1}
                loading={saving}
                aria-keyshortcuts="R"
                onClick={busy ? v.onStop : v.onRecord}
              />
            </Tooltip>
          )}
        </span>
        {v.rerecord ? (
          // re-record mode: "Build the new version" exists once a turn has a new take (no Next — › moves on)
          v.freshCount > 0 && (
            <span className={cx(s.cell, s.nextCell)}>
              <Tooltip content={t("studio.rerecord.tipBuild")}>
                <Button variant="primary" size="lg" disabled={busy} onClick={v.onBuild} data-testid="studio-build">
                  {t("studio.buildNew")}
                </Button>
              </Tooltip>
            </span>
          )
        ) : v.hasTake && (
          <span className={cx(s.cell, s.nextCell)}>
            <Tooltip content={last ? t("studio.tip.build") : t("studio.tip.next")}>
              <Button
                variant="primary"
                size="lg"
                // "Build the result" has no arrow: it ends the studio (and fits the phone cell in RU)
                iconRight={last ? undefined : <Icon name="forward" />}
                aria-keyshortcuts={last ? undefined : "ArrowRight"}
                disabled={busy}
                onClick={v.onNext}
                data-testid="studio-next"
              >
                {last ? t("studio.build") : t("studio.next")}
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
function useStudioKeys(v: StudioViewProps) {
  const ref = useRef(v);
  useEffect(() => {
    ref.current = v;
  });
  const off = v.loading;
  useEffect(() => {
    if (off) return;
    const onKey = (e: KeyboardEvent) => {
      const d = ref.current;
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.repeat) return;
      if (d.askLeave || d.askBuild || document.querySelector("[role=dialog], [role=menu]")) return;
      const el = e.target instanceof HTMLElement ? e.target : null;
      if (el?.closest("input, textarea, select, [contenteditable=true], [role=slider]")) return;
      const busy = isBusy(d);
      if (e.key === " ") {
        if (el?.closest("button, a")) return;
        e.preventDefault();
        if (!busy) d.onPlay("original");
      } else if (e.code === "KeyR") {
        e.preventDefault();
        if (d.rec === "recording") d.onStop();
        else if (!busy) d.onRecord();
      } else if (e.key === "ArrowLeft" && d.canPrev) {
        e.preventDefault();
        d.onPrev();
      } else if (e.key === "ArrowRight" && d.canNext && !isLast(d)) {
        e.preventDefault();
        d.onNext();
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
function BottomNotice({ children, testId = "mic-blocked" }: { children: ReactNode; testId?: string }) {
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
    <div ref={ref} className={s.notice} data-testid={testId}>
      {children}
    </div>
  );
}
