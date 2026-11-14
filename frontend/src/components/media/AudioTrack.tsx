import { useLayoutEffect, useMemo, useRef, useState } from "react";
import s from "./media.module.css";

export type TrackMode = "idle" | "recording" | "playing";

/*
 * AudioTrack — the sound of one turn in an outlined box that is exactly as wide as the video above it
 * (owner decision 2026-11-02). Inside:
 *   - the ORIGINAL voice as grey bars (the whole turn window);
 *   - YOUR TAKE drawn on top of it in another colour: red while recording (it grows left → right as you speak),
 *     blue once the take is saved — so you see at a glance how your timing and loudness match the original;
 *   - an ink playhead while something plays.
 * Bars are 2px wide with a 1px gap at any width (peaks are resampled to fit), rounded, mirrored around the centre.
 * Decorative for screen readers — the controls around it state what plays and how long.
 */
export function AudioTrack({
  original, take, mode = "idle", progress = 0, takeProgress = 1, label,
}: {
  /** peaks 0..1 of the original voice across the turn window */
  original: number[];
  /** peaks 0..1 of the take across the same window (omit when there is no take yet) */
  take?: number[];
  mode?: TrackMode;
  /** playhead position 0..1 (shown while playing or recording) */
  progress?: number;
  /** how much of the take exists 0..1 (grows while recording) */
  takeProgress?: number;
  label: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = 48;
  const count = Math.max(8, Math.floor(width / 3));
  const orig = useMemo(() => resample(original, count), [original, count]);
  const mine = useMemo(() => (take ? resample(take, count) : null), [take, count]);
  const cut = Math.round(Math.min(1, Math.max(0, takeProgress)) * count);
  const bar = (p: number) => Math.max(2, Math.min(1, Math.max(0, p)) * H);

  return (
    <div ref={box} className={s.track} data-mode={mode} role="img" aria-label={label}>
      {width > 0 && (
        <svg className={s.trackSvg} viewBox={`0 0 ${count * 3} ${H}`} width={count * 3} height={H} aria-hidden="true">
          {orig.map((p, i) => {
            const h = bar(p);
            return <rect key={`o${i}`} className={s.trackOriginal} x={i * 3} y={(H - h) / 2} width={2} height={h} rx={1} />;
          })}
          {mine &&
            mine.slice(0, cut).map((p, i) => {
              const h = bar(p);
              return <rect key={`t${i}`} className={mode === "recording" ? s.trackLive : s.trackTake} x={i * 3} y={(H - h) / 2} width={2} height={h} rx={1} />;
            })}
        </svg>
      )}
      {mode !== "idle" && <span className={s.trackHead} style={{ left: `${Math.min(1, Math.max(0, progress)) * 100}%` }} />}
    </div>
  );
}

/** Max-pool peaks into `n` buckets so bars keep their 2px / 1px rhythm at any width. */
function resample(peaks: number[], n: number): number[] {
  if (!peaks.length) return Array(n).fill(0);
  return Array.from({ length: n }, (_, i) => {
    const a = Math.floor((i / n) * peaks.length);
    const b = Math.max(a + 1, Math.floor(((i + 1) / n) * peaks.length));
    let m = 0;
    for (let k = a; k < b; k++) m = Math.max(m, peaks[k] ?? 0);
    return m;
  });
}

/** Deterministic demo peaks (speech-like envelope with pauses) for templates and the styleguide. */
export function demoPeaks(count = 160, seed = 7): number[] {
  let x = seed;
  const rnd = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: count }, (_, i) => {
    const t = i / count;
    const env = 0.3 + 0.7 * Math.abs(Math.sin(t * Math.PI * 3.2 + seed));
    const pause = (i + seed * 3) % 37 > 31 ? 0.08 : 1;
    const edge = Math.min(1, t * 12, (1 - t) * 12);
    return Math.min(1, env * pause * edge * (0.35 + rnd() * 0.65));
  });
}
