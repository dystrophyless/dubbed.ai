import { useId, useRef, useState, type DragEvent, type KeyboardEvent, type PointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/affect/button";
import { ProgressBar } from "@/components/ui/kit/Feedback";
import { cx } from "@/components/ui/kit/cx";
import { creditsFor, formatSeconds, formatTime } from "./time";
import s from "./media.module.css";

export type DropState = "idle" | "uploading" | "checking" | "error" | "done";

/*
 * UploadDropzone — a white card with an inset hairline (no dashed borders: Clean has none). Drag-over turns it
 * accent-washed with an accent ring. "Choose a video" opens the OS file dialog (the only acceptable native picker).
 * States: idle · uploading (progress + Cancel) · checking (the server check: indeterminate bar + Cancel) · error (reason
 * + "Choose another video", primary) · done. The title says "Drop a video here" only where drag and drop exists; touch
 * and narrow screens get "Choose a video to dub". One box for every state: pass `className` with a shared min-height
 * so nothing jumps when the state changes.
 */
export function UploadDropzone({
  state, progress, error, fileName, onFile, onCancel, accept = "video/mp4,video/quicktime,video/webm", className,
}: {
  state: DropState; progress?: number; error?: string; fileName?: string; onFile: (f: File) => void;
  /** shown as "Cancel upload" while uploading / checking */
  onCancel?: () => void; accept?: string; className?: string;
}) {
  const { t } = useTranslation();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const busy = state === "uploading" || state === "checking";
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files[0];
    if (f && !busy) onFile(f);
  };
  return (
    <div
      className={cx(s.drop, className)}
      data-state={state}
      data-over={over ? "" : undefined}
      data-testid="upload-dropzone"
      onDragOver={(e) => { e.preventDefault(); if (!busy) setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      <input
        ref={input}
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        data-testid="upload-input"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <span className={s.dropIcon} data-tone={state === "error" ? "danger" : state === "idle" ? "accent" : undefined} aria-hidden="true">
        <Icon name={state === "error" ? "error" : state === "idle" ? "upload" : "video"} size={20} />
      </span>
      {busy ? (
        <div className={s.dropBody}>
          <span className={s.dropTitle}>{fileName}</span>
          {state === "uploading" ? (
            <ProgressBar label={t("media.upload.uploading")} value={progress ?? 0} />
          ) : (
            <ProgressBar label={t("media.upload.checking")} />
          )}
          <span className={s.dropHint} data-quiet="">{state === "checking" ? t("media.upload.checkingHint") : t("media.upload.hint")}</span>
          {onCancel && (
            <div className={s.dropActions}>
              <Button variant="secondary" size="lg" onClick={onCancel}>{t("media.upload.cancel")}</Button>
            </div>
          )}
        </div>
      ) : (
        <div className={s.dropBody}>
          <h2 className={s.dropTitle}>
            {state === "error" ? t("media.upload.errorTitle") : state === "done" ? fileName : (
              <>
                <span className={s.pointerFine}>{t("media.upload.title")}</span>
                <span className={s.pointerCoarse}>{t("media.upload.titleTouch")}</span>
              </>
            )}
          </h2>
          <span className={s.dropHint} data-tone={state === "error" ? "danger" : undefined} role={state === "error" ? "alert" : undefined}>
            {state === "error" ? error : state === "done" ? t("media.upload.ready") : t("media.upload.hint")}
          </span>
          {state === "error" && <span className={s.dropHint} data-quiet="">{t("media.upload.hint")}</span>}
          <div className={s.dropActions}>
            <Button variant={state === "done" ? "secondary" : "primary"} size="lg" icon={<Icon name="upload" />} onClick={() => input.current?.click()}>
              {state === "idle" ? t("media.upload.choose") : t("media.upload.another")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/*
 * RangeSelector — picks the section to dub on the video's timeline: a draggable window (max 120 s, min 1 s) with two
 * handles. Handles are sliders (arrows ±1 s, Shift ±5 s). Shows "0:30 – 2:30 · 120 s" (seconds, never credits). When
 * the window reaches `max` the scale's middle label becomes the reason ("That's the limit — 120 s", announced politely),
 * so the user sees why the edge stopped. `playhead` draws where section playback is; `disabled` locks it (starting).
 */
export function RangeSelector({
  duration, start, end, max = 120, onChange, playhead, disabled,
}: {
  duration: number; start: number; end: number; max?: number; onChange: (start: number, end: number) => void;
  playhead?: number | null; disabled?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: "start" | "end" | "move"; x0: number; s0: number; e0: number } | null>(null);
  const pct = (v: number) => `${(v / duration) * 100}%`;
  const toTime = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    return ((clientX - r.left) / r.width) * duration;
  };
  const apply = (mode: "start" | "end" | "move", s0: number, e0: number, delta: number) => {
    if (mode === "move") {
      const len = e0 - s0;
      const ns = Math.min(Math.max(0, s0 + delta), duration - len);
      onChange(round(ns), round(ns + len));
    } else if (mode === "start") {
      const ns = Math.min(Math.max(0, s0 + delta, e0 - max), e0 - 1);
      onChange(round(ns), e0);
    } else {
      const ne = Math.max(Math.min(duration, e0 + delta, s0 + max), s0 + 1);
      onChange(s0, round(ne));
    }
  };
  const down = (mode: "start" | "end" | "move") => (e: PointerEvent<HTMLElement>) => {
    if (disabled) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { mode, x0: toTime(e.clientX), s0: start, e0: end };
  };
  const move = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    apply(d.mode, d.s0, d.e0, toTime(e.clientX) - d.x0);
  };
  const up = () => {
    drag.current = null;
  };
  const key = (mode: "start" | "end") => (e: KeyboardEvent) => {
    if (disabled) return;
    const step = e.shiftKey ? 5 : 1;
    const delta = e.key === "ArrowRight" || e.key === "ArrowUp" ? step : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -step : 0;
    if (!delta) return;
    e.preventDefault();
    apply(mode, start, end, delta);
  };
  const len = end - start;
  const atMax = duration > max && len >= max - 0.05;
  return (
    <div className={s.range} data-disabled={disabled ? "" : undefined} data-limit={atMax ? "" : undefined} data-testid="range-selector">
      <div className={s.rangeHead}>
        <span className={s.rangeTitle}>{t("media.range.label")}</span>
        <span className={s.rangeValue} data-testid="range-value">
          {formatTime(start)} – {formatTime(end)} · {t("media.range.seconds", { s: formatSeconds(len, i18n.resolvedLanguage) })}
        </span>
      </div>
      <div ref={track} className={s.rangeTrack}>
        <div className={s.rangeWindow} style={{ left: pct(start), width: pct(len) }} onPointerDown={down("move")} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          {(["start", "end"] as const).map((h) => (
            <span
              key={h}
              className={s.rangeHandle}
              data-side={h}
              role="slider"
              tabIndex={disabled ? -1 : 0}
              aria-disabled={disabled || undefined}
              aria-label={h === "start" ? t("media.range.start") : t("media.range.end")}
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              aria-valuenow={Math.round(h === "start" ? start : end)}
              aria-valuetext={formatTime(h === "start" ? start : end)}
              onPointerDown={down(h)}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={up}
              onKeyDown={key(h)}
            />
          ))}
        </div>
        {playhead != null && <span className={s.rangePlayhead} style={{ left: pct(playhead) }} aria-hidden="true" />}
      </div>
      <div className={s.timelineScale}>
        <span aria-hidden="true">{formatTime(0)}</span>
        <span className={s.rangeLimit} role="status" data-testid="range-limit">
          {atMax ? (
            <>
              <Icon name="info" size={14} />
              {t("media.range.limit", { s: max })}
            </>
          ) : (
            <span aria-hidden="true">{t("media.range.max", { s: max })}</span>
          )}
        </span>
        <span aria-hidden="true">{formatTime(duration)}</span>
      </div>
    </div>
  );
}
const round = (v: number) => Math.round(v * 10) / 10;

/*
 * CostButton — the one deliberate action that starts paid processing; it names the exact cost (1 credit per started
 * second) and is the only place on the page that shows the price (owner 2026-11-03). It never repeats the balance (the
 * top bar shows it). With too few credits it is disabled, says how many are missing, and — given `onBuy` — offers
 * "Buy credits" beside it (patterns.md §7). Below 1024px the buttons stack full width.
 */
export function CostButton({
  seconds, balance, onStart, onBuy, loading, label,
}: { seconds: number; balance: number; onStart: () => void; onBuy?: () => void; loading?: boolean; label?: string }) {
  const { t } = useTranslation();
  const noteId = useId();
  const cost = creditsFor(seconds);
  const short = cost > balance;
  return (
    <div className={s.cost} data-short={short ? "" : undefined}>
      <div className={s.costActions}>
        {short && onBuy && (
          <Button variant="secondary" size="lg" className={s.costBuy} icon={<Icon name="purchase" />} onClick={onBuy}>{t("media.cost.buy")}</Button>
        )}
        <Button
          size="lg"
          className={s.costStart}
          icon={<Icon name="credits" />}
          onClick={onStart}
          disabled={short}
          loading={loading}
          aria-describedby={short ? noteId : undefined}
          data-testid="cost-button"
        >
          {`${label ?? t("media.cost.start")} · ${t("media.cost.credits", { count: cost })}`}
        </Button>
      </div>
      {short && <span id={noteId} className={s.costNote}>{t("media.cost.short", { count: cost - balance })}</span>}
    </div>
  );
}
