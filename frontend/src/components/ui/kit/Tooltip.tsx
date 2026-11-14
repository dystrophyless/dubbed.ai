import { cloneElement, useEffect, useId, useRef, useState, type FocusEvent, type PointerEvent, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { cx } from "./cx";
import s from "./Popover.module.css";
import { useAnchoredPosition } from "./usePopover";

type Child = ReactElement<{
  ref?: unknown;
  "aria-describedby"?: string;
  onPointerEnter?: (e: PointerEvent) => void;
  onPointerLeave?: (e: PointerEvent) => void;
  onFocus?: (e: FocusEvent) => void;
  onBlur?: (e: FocusEvent) => void;
}>;

/*
 * Tooltip — the Clean white tip above a control (message-actions-clean.md:821): after a beat on mouse hover,
 * at once on keyboard focus, hidden on Escape. Supplementary only: never the sole label, never needed on touch.
 */
export function Tooltip({ content, children, closeOn }: { content: string; children: Child; closeOn?: unknown }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  // `closeOn`: when this value changes the tip closes (e.g. the control changed its meaning and focus stays on it)
  const [seen, setSeen] = useState(closeOn);
  if (seen !== closeOn) {
    setSeen(closeOn);
    setOpen(false);
  }
  const anchor = useRef<HTMLElement | null>(null);
  const tip = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const pos = useAnchoredPosition(anchor, tip, open, "top", 6);
  const show = (delay: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    setOpen(false);
  };
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && hide();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  // the ref below is a callback that runs on attach, not during render (oxlint false positive)
  // oxlint-disable-next-line react/refs
  const child = cloneElement(children, {
    ref: (el: HTMLElement | null) => {
      anchor.current = el;
    },
    "aria-describedby": open ? id : undefined,
    onPointerEnter: (e: PointerEvent) => {
      if (e.pointerType === "mouse") show(380);
    },
    onPointerLeave: hide,
    onFocus: (e: FocusEvent) => {
      if ((e.target as HTMLElement).matches(":focus-visible")) show(0);
    },
    onBlur: hide,
  });
  return (
    <>
      {child}
      {open &&
        createPortal(
          <div
            ref={tip}
            id={id}
            role="tooltip"
            className={cx(s.tooltip, !pos && s.measuring)}
            style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0 }}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
