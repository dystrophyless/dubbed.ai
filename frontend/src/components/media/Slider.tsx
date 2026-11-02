import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { cx } from "@/components/ui/kit/cx";
import s from "./media.module.css";

/*
 * Slider — role="slider" with pointer drag and keys (arrows ±step, PageUp/Down ±10 steps, Home/End).
 * Used by the scrubber and the volume control. Track = the Clean 4px line bar; fill = accent; thumb = white with
 * the card shadow (the segmented-control "raised pill" language). 12px thumb, 20px hit area (28px on touch).
 */
export function Slider({
  label, value, min = 0, max, step = 1, onChange, onCommit, valueText, disabled, className, buffered,
}: {
  label: string; value: number; min?: number; max: number; step?: number; onChange: (v: number) => void;
  onCommit?: (v: number) => void; valueText?: string; disabled?: boolean; className?: string; buffered?: number;
}) {
  const track = useRef<HTMLDivElement>(null);
  const span = Math.max(max - min, 1e-9);
  const pct = ((Math.min(max, Math.max(min, value)) - min) / span) * 100;
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));
  const fromPointer = (e: PointerEvent) => {
    const r = track.current!.getBoundingClientRect();
    return clamp(min + ((e.clientX - r.left) / r.width) * span);
  };
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    onChange(fromPointer(e));
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    onChange(fromPointer(e));
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    onCommit?.(fromPointer(e));
  };
  const onKey = (e: KeyboardEvent) => {
    const big = step * 10;
    const next =
      e.key === "ArrowRight" || e.key === "ArrowUp" ? value + step
      : e.key === "ArrowLeft" || e.key === "ArrowDown" ? value - step
      : e.key === "PageUp" ? value + big
      : e.key === "PageDown" ? value - big
      : e.key === "Home" ? min
      : e.key === "End" ? max
      : null;
    if (next === null) return;
    e.preventDefault();
    const v = clamp(next);
    onChange(v);
    onCommit?.(v);
  };
  return (
    <div
      className={cx(s.slider, className)}
      data-disabled={disabled ? "" : undefined}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
    >
      <div ref={track} className={s.sliderTrack}>
        {buffered !== undefined && <div className={s.sliderBuffered} style={{ width: `${Math.min(100, buffered * 100)}%` }} />}
        <div className={s.sliderFill} style={{ width: `${pct}%` }} />
        <div
          className={s.sliderThumb}
          style={{ left: `${pct}%` }}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={Math.round(value * 100) / 100}
          aria-valuetext={valueText}
          aria-disabled={disabled || undefined}
          onKeyDown={onKey}
        />
      </div>
    </div>
  );
}
