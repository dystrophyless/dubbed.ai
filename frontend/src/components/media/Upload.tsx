import { useId, useRef, useState, type DragEvent, type KeyboardEvent, type PointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/affect/button";
import { ProgressBar } from "@/components/ui/kit/Feedback";
import { creditsFor, formatSeconds, formatTime } from "./time";
import s from "./media.module.css";

export type DropState = "idle" | "uploading" | "error" | "done";

/*
 * UploadDropzone — a white card with an inset hairline (no dashed borders: Clean has none). Drag-over turns it
 * accent-washed with an accent ring. The whole card is the button that opens the file chooser (the OS dialog is
 * the only acceptable native picker). States: idle · uploading (progress) · error (message + choose another) · done.
 */
export function UploadDropzone({
  state, progress, error, fileName, onFile, accept = "video/mp4,video/quicktime,video/webm",
}: { state: DropState; progress?: number; error?: string; fileName?: string; onFile: (f: File) => void; accept?: string }) {
  const { t } = useTranslation();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const busy = state === "uploading";
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files[0];
    if (f && !busy) onFile(f);
  };
  return (
    <div
      className={s.drop}
      data-state={state}
      data-over={over ? "" : undefined}
      onDragOver={(e) => { e.preventDefault(); if (!busy) setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      <input ref={input} id={id} type="file" accept={accept} className="sr-only" tabIndex={-1} aria-label={t("media.upload.choose")} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      <span className={s.dropIcon} aria-hidden="true">
        <Icon name={state === "error" ? "error" : state === "done" ? "video" : "upload"} size={20} />
      </span>
      {state === "uploading" ? (
        <div className={s.dropBody}>
          <span className={s.dropTitle}>{fileName}</span>
          <ProgressBar label={t("media.upload.uploading")} value={progress ?? 0} />
        </div>
      ) : (
        <div className={s.dropBody}>
          <span className={s.dropTitle}>
            {state === "error" ? t("media.upload.errorTitle") : state === "done" ? fileName : t("media.upload.title")}
          </span>
          <span className={s.dropHint} role={state === "error" ? "alert" : undefined}>
            {state === "error" ? error : state === "done" ? t("media.upload.ready") : t("media.upload.hint")}
          </span>
          <div className={s.dropActions}>
            <Button variant={state === "idle" ? "primary" : "secondary"} size="lg" icon={<Icon name="upload" />} onClick={() => input.current?.click()}>
              {state === "idle" ? t("media.upload.choose") : t("media.upload.another")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/*
 * RangeSelector — picks the section to dub on the video's timeline: a draggable window (max 120 s) with two handles.
 * Handles are sliders (arrows ±1 s, Shift ±5 s). Shows "0:30 – 2:30 · 120 s".
 */
export function RangeSelector({
  duration, start, end, max = 120, onChange,
}: { duration: number; start: number; end: number; max?: number; onChange: (start: number, end: number) => void }) {
  const { t } = useTranslation();
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
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { mode, x0: toTime(e.clientX), s0: start, e0: end };
  };
  const move = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    apply(d.mode, d.s0, d.e0, toTime(e.clientX) - d.x0);
  };
  const up = () => { drag.current = null; };
  const key = (mode: "start" | "end") => (e: KeyboardEvent) => {
    const step = e.shiftKey ? 5 : 1;
    const delta = e.key === "ArrowRight" || e.key === "ArrowUp" ? step : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -step : 0;
    if (!delta) return;
    e.preventDefault();
    apply(mode, start, end, delta);
  };
  const len = end - start;
  return (
    <div className={s.range}>
      <div className={s.rangeHead}>
        <span className={s.rangeTitle}>{t("media.range.label")}</span>
        <span className={s.rangeValue}>
          {formatTime(start)} – {formatTime(end)} · {t("media.range.seconds", { s: formatSeconds(len) })}
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
              tabIndex={0}
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
      </div>
      <div className={s.timelineScale} aria-hidden="true">
        <span>{formatTime(0)}</span>
        <span>{t("media.range.max", { s: max })}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
const round = (v: number) => Math.round(v * 10) / 10;

/*
 * CostButton — the one deliberate action that starts paid processing; it names the exact cost (1 credit per started
 * second). With too few credits it is disabled and says how many are missing; the purchase link sits beside it.
 */
export function CostButton({ seconds, balance, onStart, loading, label }: { seconds: number; balance: number; onStart: () => void; loading?: boolean; label?: string }) {
  const { t } = useTranslation();
  const cost = creditsFor(seconds);
  const short = cost > balance;
  return (
    <div className={s.cost}>
      <Button size="lg" icon={<Icon name="credits" />} onClick={onStart} disabled={short} loading={loading}>
        {`${label ?? t("media.cost.start")} · ${t("media.cost.credits", { count: cost })}`}
      </Button>
      <span className={s.costNote} data-short={short ? "" : undefined}>
        {short ? t("media.cost.short", { count: cost - balance }) : t("media.cost.balance", { count: balance })}
      </span>
    </div>
  );
}
