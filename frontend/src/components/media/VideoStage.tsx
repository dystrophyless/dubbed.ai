import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/affect/button";
import { Spinner } from "@/components/ui/kit/Feedback";
import { formatTime } from "./time";
import { Slider } from "./Slider";
import s from "./media.module.css";

export type StageState = "ready" | "loading" | "error";

/*
 * VideoStage — the picture at its own aspect ratio, never letterboxed, nothing printed over the image.
 * The frame is the Clean card (10px radius, hairline shadow). It fits the width and never exceeds `maxHeight`
 * (the width shrinks to keep the ratio). Loading = shimmer surface + spinner; error = a calm message with retry.
 */
export function VideoStage({
  src, poster, ratio, state = "ready", maxHeight = "60vh", videoRef, onRetry, muted, children, label, onRatio,
}: {
  src?: string; poster?: string; ratio?: number; state?: StageState; maxHeight?: string;
  videoRef?: RefObject<HTMLVideoElement | null>; onRetry?: () => void; muted?: boolean; children?: ReactNode; label: string;
  /** reports the clip's own aspect ratio once known (SceneColumn uses it to size the column) */
  onRatio?: (ratio: number) => void;
}) {
  const { t } = useTranslation();
  const own = useRef<HTMLVideoElement>(null);
  const ref = videoRef ?? own;
  const [natural, setNatural] = useState<number | null>(null);
  const r = ratio ?? natural ?? 16 / 9;
  const style = { "--ratio": r, "--max-h": maxHeight } as CSSProperties;
  return (
    <figure className={s.stage} style={style} data-state={state} aria-label={label}>
      {state !== "error" && src && (
        <video
          ref={ref}
          className={s.video}
          // "#t=0.001" makes browsers paint the first frame when there is no poster
          src={poster || src.includes("#") ? src : `${src}#t=0.001`}
          poster={poster}
          playsInline
          preload="metadata"
          muted={muted}
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            if (v.videoWidth && v.videoHeight) {
              setNatural(v.videoWidth / v.videoHeight);
              onRatio?.(v.videoWidth / v.videoHeight);
            }
          }}
        />
      )}
      {state === "loading" && (
        <div className={s.stageOverlay} data-kind="loading">
          <Spinner size={20} label={t("media.loading")} />
        </div>
      )}
      {state === "error" && (
        <div className={s.stageOverlay} data-kind="error" role="alert">
          <Icon name="noPoster" size={20} />
          <span>{t("media.videoError")}</span>
          {onRetry && <Button variant="secondary" size="sm" icon={<Icon name="retry" size={14} />} onClick={onRetry}>{t("kit.retry")}</Button>}
        </div>
      )}
      {children}
    </figure>
  );
}

/** Play / pause + elapsed / total + scrubber, bound to a <video>. Controls share one 32px height. */
export function Transport({ videoRef, disabled }: { videoRef: RefObject<HTMLVideoElement | null>; disabled?: boolean }) {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const sync = () => {
      setPlaying(!v.paused);
      setTime(v.currentTime);
      setDuration(Number.isFinite(v.duration) ? v.duration : 0);
    };
    sync();
    const evs = ["play", "pause", "timeupdate", "loadedmetadata", "durationchange", "ended", "seeked"];
    evs.forEach((ev) => v.addEventListener(ev, sync));
    return () => evs.forEach((ev) => v.removeEventListener(ev, sync));
  }, [videoRef]);
  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };
  return (
    <div className={s.transport}>
      <Button
        variant="secondary"
        size="lg"
        icon={<Icon name={playing ? "pause" : "play"} />}
        aria-label={playing ? t("media.pause") : t("media.play")}
        onClick={toggle}
        disabled={disabled}
      />
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
    </div>
  );
}

/** Stage + transport, the standard way to show a playable clip. */
export function VideoPlayer({ src, label, ratio, state, onRetry, maxHeight }: { src: string; label: string; ratio?: number; state?: StageState; onRetry?: () => void; maxHeight?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  return (
    <div className={s.player}>
      <VideoStage src={src} label={label} ratio={ratio} state={state} onRetry={onRetry} videoRef={ref} maxHeight={maxHeight} />
      <Transport videoRef={ref} disabled={state !== undefined && state !== "ready"} />
    </div>
  );
}

/*
 * SceneColumn — the studio's centre column (owner decision 2026-11-02): video, then the turn's text, then the audio
 * track — all exactly as wide as the picture. The width follows the clip's aspect ratio and the height limit.
 */
export function SceneColumn({ ratio, maxHeight = "56vh", children }: { ratio: number; maxHeight?: string; children: ReactNode }) {
  const style = { "--ratio": ratio, "--max-h": maxHeight } as CSSProperties;
  return <div className={s.column} style={style}>{children}</div>;
}

/** The turn's line under the video. Sound captions such as [laughs] are shown quieter than spoken words. */
export function TurnLine({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\])/g).filter(Boolean);
  return (
    <p className={s.line}>
      {parts.map((p, i) => (p.startsWith("[") ? <span key={i} className={s.lineCaption}>{p}</span> : <span key={i}>{p}</span>))}
    </p>
  );
}
