import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/icons";
import { Button, type ButtonProps } from "@/components/ui/affect/button";
import { cx } from "@/components/ui/kit/cx";
import pop from "@/components/ui/kit/Popover.module.css";
import { useAnchoredPosition, useDismiss } from "@/components/ui/kit/usePopover";
import { VolumeControl } from "./Recording";
import s from "./studio.module.css";

/* Studio controls (Phase 4 high-fi, design-system/components.md → Media; owner decisions in studio-brief.md 11–16). */

export type TurnDir = "next" | "prev" | "none";

/*
 * TurnDots — progress through the scene's turns (studio-brief 13). One dot per turn: done (take saved) = accent,
 * ahead = grey, current = a wider accent pill that grows out of its dot; next to it "3 of 12" with the number rolling in
 * the direction we moved. Display only: the dots and the visible count are aria-hidden, one sr-only sentence carries the
 * meaning. Smaller dots above 16 turns, smallest above 32, so a long scene still fits a phone.
 */
export function TurnDots({ total, index, done, dir = "none" }: { total: number; index: number; done: (i: number) => boolean; dir?: TurnDir }) {
  const { t } = useTranslation();
  const size = total > 32 ? "xs" : total > 16 ? "sm" : "md";
  return (
    <span className={s.progress} data-testid="turn-dots">
      <span className={s.dots} data-size={size} aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={s.dot} data-s={i === index ? "current" : done(i) ? "done" : "ahead"} />
        ))}
      </span>
      <span className={s.count} aria-hidden="true">
        <span key={index} className={s.countNum} data-dir={dir}>{index + 1}</span>
        <span className={s.countOf}>{t("studio.countOf", { total })}</span>
      </span>
      <span className="sr-only">{t("media.turn.of", { n: index + 1, total })}</span>
    </span>
  );
}

export type RecordMode = "record" | "stop" | "again";

/*
 * RecordButton — the studio's record action in the Clean button (DUBBED PATCH 5):
 *   record  solid red, mic icon, "Record"
 *   stop    solid red, a ring that fills as the turn's window runs out around a stop square, "Stop"
 *           (studio-brief 10: the user sees the automatic stop coming); `loading` while the take is saved
 *   again   red outline, mic icon, "Record again" — no longer the next step, so not solid
 * Same height as every button in the row (lg: 32px, 36px on touch).
 */
export function RecordButton({
  mode, progress = 0, children, ...rest
}: Omit<ButtonProps, "variant" | "icon" | "iconRight"> & { mode: RecordMode; progress?: number }) {
  const { t } = useTranslation();
  const label = mode === "stop" ? t("media.record.stop") : mode === "again" ? t("media.record.again") : t("media.record.start");
  return (
    <Button
      variant={mode === "again" ? "secondary" : "primary"}
      size="lg"
      data-record={mode === "again" ? "outline" : "solid"}
      data-testid="record-button"
      data-mode={mode}
      icon={mode === "stop" ? <StopRing progress={progress} /> : <Icon name="record" />}
      {...rest}
    >
      {children ?? label}
    </Button>
  );
}

/** 16px: a faint full ring, the elapsed part solid, a stop square inside. */
function StopRing({ progress }: { progress: number }) {
  const p = Math.min(1, Math.max(0, progress));
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.75" stroke="currentColor" strokeOpacity={0.4} strokeWidth={1.5} />
      <circle
        className={s.ring}
        cx="8"
        cy="8"
        r="6.75"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - p}
        transform="rotate(-90 8 8)"
      />
      <rect x="5.25" y="5.25" width="5.5" height="5.5" rx="1" fill="currentColor" />
    </svg>
  );
}

/*
 * VolumeButton — volume of the ORIGINAL voice (listening only; never the take or the result): an icon button in the
 * studio header that opens a small popover with the kit's VolumeControl. The slider takes focus when it opens;
 * Escape / Tab / outside click close it. In the real studio the value drives a Web Audio GainNode on the original
 * voice stem (the music and effects stay as they are); the prototype applies it to the <video> element.
 */
export function VolumeButton({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const pos = useAnchoredPosition(anchor, panel, open, "bottom-end");
  const close = useCallback(() => setOpen(false), []);
  const refs = useMemo(() => [anchor, panel] as RefObject<HTMLElement | null>[], []);
  useDismiss(open, close, refs, anchor);
  const placed = pos !== null;
  useLayoutEffect(() => {
    if (open && placed) panel.current?.querySelector<HTMLElement>("[role=slider]")?.focus({ preventScroll: true });
  }, [open, placed]);
  return (
    <>
      <Button
        ref={anchor}
        variant="ghost"
        size="lg"
        icon={<Icon name={value === 0 ? "mute" : value < 0.5 ? "volumeLow" : "volume"} />}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? `${id}-volume` : undefined}
        data-testid="volume-button"
        onClick={() => setOpen((o) => !o)}
      />
      {open &&
        createPortal(
          <div
            ref={panel}
            id={`${id}-volume`}
            role="dialog"
            aria-label={label}
            className={cx(pop.surface, s.volumePanel, !pos && pop.measuring)}
            data-side={pos?.side}
            style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0 }}
            onKeyDown={(e) => e.key === "Tab" && setOpen(false)}
          >
            <VolumeControl label={label} value={value} onChange={onChange} />
          </div>,
          document.body,
        )}
    </>
  );
}
