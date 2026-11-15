import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/affect/button";
import { Tooltip } from "@/components/ui/kit/Tooltip";
import { cx } from "@/components/ui/kit/cx";
import { Slider } from "./Slider";
import { formatTime } from "./time";
import s from "./media.module.css";

/*
 * The result player (Phase 4, result high-fi): a stage that can go full screen + one row of controls under it.
 *
 *   PlayerScreen    the element that goes full screen — the stage and the controls row together, so the controls stay
 *                   usable there. Click on the picture = play / pause; double-click = full screen (pointer shortcuts —
 *                   keyboard users have the buttons and the keys). In full screen: black, the picture as large as it
 *                   fits (own shape), the white controls row at the bottom (light theme only — never over the picture).
 *   PlayerControls  [▷] 0:04 / 0:13 [━━━━━●──────] [⛶] — play / pause, the clock, the scrubber, full screen.
 *                   Every control is 32px (36 on touch); the scrubber takes the rest of the row.
 *   useFullscreen   the browser Fullscreen API on the screen element; iOS Safari (no element full screen) falls back
 *                   to the video's own full-screen player (`webkitEnterFullscreen`). Esc leaves (the browser's own).
 *   usePlayerKeys   F = full screen, Space / K = play / pause; ignored in fields, sliders, while a dialog or menu is open,
 *                   and Space on a focused button keeps its native meaning.
 * Not for the studio (it plays a turn's fragment with its own Original / My take buttons).
 */

type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => void;
};
type WebkitElement = HTMLElement & { webkitRequestFullscreen?: () => void };
type WebkitVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
};

export type Fullscreen = { active: boolean; supported: boolean; toggle: () => void };

const fsElement = () => {
  const d = document as WebkitDocument;
  return d.fullscreenElement ?? d.webkitFullscreenElement ?? null;
};

export function useFullscreen(
  screenRef: RefObject<HTMLElement | null>,
  videoRef: RefObject<HTMLVideoElement | null>,
): Fullscreen {
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const d = document as WebkitDocument;
    const elementApi = Boolean(d.fullscreenEnabled || d.webkitFullscreenEnabled);
    const video = videoRef.current as WebkitVideo | null;
    setSupported(elementApi || typeof video?.webkitEnterFullscreen === "function");
    const sync = () => {
      const el = fsElement();
      const v = videoRef.current as WebkitVideo | null;
      setActive((el !== null && el === screenRef.current) || Boolean(v?.webkitDisplayingFullscreen));
    };
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    video?.addEventListener("webkitbeginfullscreen", sync);
    video?.addEventListener("webkitendfullscreen", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
      video?.removeEventListener("webkitbeginfullscreen", sync);
      video?.removeEventListener("webkitendfullscreen", sync);
    };
  }, [screenRef, videoRef]);

  const toggle = useCallback(() => {
    const d = document as WebkitDocument;
    const el = screenRef.current as WebkitElement | null;
    const video = videoRef.current as WebkitVideo | null;
    if (fsElement()) {
      if (d.exitFullscreen) void d.exitFullscreen().catch(() => undefined);
      else d.webkitExitFullscreen?.();
      return;
    }
    if (video?.webkitDisplayingFullscreen) {
      video.webkitExitFullscreen?.();
      return;
    }
    // iOS Safari: no element full screen — the video's own full-screen player instead
    const fallback = () => video?.webkitEnterFullscreen?.();
    if (el && d.fullscreenEnabled && el.requestFullscreen) void el.requestFullscreen().catch(fallback);
    else if (el && d.webkitFullscreenEnabled && el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else fallback();
  }, [screenRef, videoRef]);

  return { active, supported, toggle };
}

/** Plays or pauses a <video>; autoplay with sound refused → plays silently rather than not at all. */
export function togglePlay(video: HTMLVideoElement | null) {
  if (!video) return;
  if (video.paused || video.ended) {
    video.play().catch((e: unknown) => {
      // pausing before playback starts rejects play() with AbortError — that is not a refusal of sound
      if (!(e instanceof DOMException && e.name === "NotAllowedError")) return;
      video.muted = true;
      return video.play().catch(() => undefined);
    });
  } else video.pause();
}

/** playing / time / duration of a <video>, kept in sync with its events. */
export function usePlayback(videoRef: RefObject<HTMLVideoElement | null>, knownDuration = 0) {
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const sync = () => {
      setPlaying(!v.paused && !v.ended);
      setTime(v.currentTime);
      // a recorded file can report Infinity: show the known length until the real duration is finite
      setDuration(Number.isFinite(v.duration) && v.duration > 0 ? v.duration : knownDuration);
    };
    sync();
    const evs = ["play", "pause", "timeupdate", "loadedmetadata", "durationchange", "ended", "seeked", "emptied"];
    evs.forEach((ev) => v.addEventListener(ev, sync));
    return () => evs.forEach((ev) => v.removeEventListener(ev, sync));
  }, [videoRef, knownDuration]);
  return { playing, time, duration, setTime };
}

/** The element that goes full screen: the stage (children) and the controls row (`controls`). */
export function PlayerScreen({
  screenRef, videoRef, fullscreen, controls, children, className, playing, disabled, "data-testid": testId,
}: {
  screenRef: RefObject<HTMLDivElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  fullscreen: Fullscreen;
  /** the controls row (PlayerControls); omit while there is nothing to play yet */
  controls?: ReactNode;
  /** the stage (a VideoStage) */
  children: ReactNode;
  className?: string;
  playing: boolean;
  /** no pointer shortcuts (nothing to play yet) */
  disabled?: boolean;
  "data-testid"?: string;
}) {
  return (
    <div
      ref={screenRef}
      className={cx(s.screen, className)}
      data-fullscreen={fullscreen.active || undefined}
      data-testid={testId}
    >
      <div className={s.screenStage}>
        {children}
        {!disabled && (
          // pointer-only shortcuts over the picture; hidden from assistive tech, which has the controls row
          <button
            type="button"
            className={s.screenHit}
            tabIndex={-1}
            aria-hidden="true"
            data-testid="player-picture"
            onClick={() => togglePlay(videoRef.current)}
            onDoubleClick={fullscreen.supported ? fullscreen.toggle : undefined}
          >
            {!playing && (
              <span className={s.screenPlay}>
                <Icon name="play" size={20} />
              </span>
            )}
          </button>
        )}
      </div>
      {controls}
    </div>
  );
}

/** [▷] 0:04 / 0:13 [scrubber] [⛶] — bound to a <video>; one 32px row (36 on touch). */
export function PlayerControls({
  videoRef, fullscreen, disabled, className, knownDuration,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  /** from useFullscreen; the button is left out when the browser has no way to go full screen */
  fullscreen?: Fullscreen;
  disabled?: boolean;
  className?: string;
  /** seconds shown until the file reports a finite duration (a recorded file may report Infinity) */
  knownDuration?: number;
}) {
  const { t } = useTranslation();
  const { playing, time, duration, setTime } = usePlayback(videoRef, knownDuration);
  return (
    <div className={cx(s.playerControls, className)} data-testid="player-controls">
      <Tooltip content={playing ? t("media.tip.pause") : t("media.tip.play")}>
        <Button
          variant="secondary"
          size="lg"
          icon={<Icon name={playing ? "pause" : "play"} />}
          aria-label={playing ? t("media.pause") : t("media.play")}
          aria-keyshortcuts="Space"
          onClick={() => togglePlay(videoRef.current)}
          disabled={disabled}
        />
      </Tooltip>
      <span className={s.clock} aria-hidden="true">{formatTime(time)} / {formatTime(duration)}</span>
      <Slider
        className={s.grow}
        label={t("media.seek")}
        value={time}
        max={duration || 1}
        step={0.1}
        disabled={disabled || !duration}
        valueText={t("media.timeOf", { time: formatTime(time), total: formatTime(duration) })}
        onChange={(v) => {
          setTime(v);
          if (videoRef.current) videoRef.current.currentTime = v;
        }}
      />
      {fullscreen?.supported && (
        <Tooltip content={fullscreen.active ? t("media.tip.exitFullscreen") : t("media.tip.fullscreen")}>
          <Button
            variant="secondary"
            size="lg"
            icon={<Icon name={fullscreen.active ? "exitFullscreen" : "fullscreen"} />}
            aria-label={fullscreen.active ? t("media.exitFullscreen") : t("media.fullscreen")}
            aria-keyshortcuts="F"
            onClick={fullscreen.toggle}
            disabled={disabled}
            data-testid="player-fullscreen"
          />
        </Tooltip>
      )}
    </div>
  );
}

/** F = full screen, Space / K = play / pause (see the header comment for when they are ignored). */
export function usePlayerKeys(videoRef: RefObject<HTMLVideoElement | null>, fullscreen: Fullscreen, enabled: boolean) {
  const latest = useRef({ fullscreen, enabled });
  useEffect(() => {
    latest.current = { fullscreen, enabled };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { fullscreen: fs, enabled: on } = latest.current;
      if (!on || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.repeat) return;
      if (document.querySelector("[role=dialog], [role=alertdialog], [role=menu]")) return;
      const el = e.target instanceof HTMLElement ? e.target : null;
      if (el?.closest("input, textarea, select, [contenteditable=true]")) return;
      if (e.code === "KeyF") {
        if (!fs.supported) return;
        e.preventDefault();
        fs.toggle();
      } else if (e.key === " " || e.code === "KeyK") {
        if (el?.closest("button, a, [role=slider]")) return;
        e.preventDefault();
        togglePlay(videoRef.current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [videoRef]);
}
