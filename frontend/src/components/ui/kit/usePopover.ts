import { useEffect, useLayoutEffect, useState, type RefObject } from "react";

/*
 * Anchored, fixed-position popovers rendered in a portal (design-system/patterns.md → Popovers): never clipped by
 * cards or scroll containers, flipped above when there is no room below, clamped inside the viewport with an 8px margin.
 */
export type Placement = "bottom-start" | "bottom-end" | "top" | "bottom";
type Pos = { top: number; left: number; minWidth: number; maxHeight: number; side: "top" | "bottom" };

export function useAnchoredPosition(
  anchor: RefObject<HTMLElement | null>,
  floating: RefObject<HTMLElement | null>,
  open: boolean,
  placement: Placement = "bottom-start",
  offset = 4,
) {
  const [pos, setPos] = useState<Pos | null>(null);

  const update = () => {
    const a = anchor.current, f = floating.current;
    if (!a || !f) return;
    const r = a.getBoundingClientRect();
    const vw = document.documentElement.clientWidth, vh = window.innerHeight, m = 8;
    const fw = f.offsetWidth, fh = f.offsetHeight;
    const below = vh - r.bottom - offset - m, above = r.top - offset - m;
    const wantTop = placement === "top";
    const side: "top" | "bottom" = wantTop ? (above >= fh || above > below ? "top" : "bottom") : (below >= fh || below >= above ? "bottom" : "top");
    const maxHeight = Math.max(120, side === "bottom" ? below : above);
    const h = Math.min(fh, maxHeight);
    const top = side === "bottom" ? r.bottom + offset : r.top - offset - h;
    let left = placement === "bottom-end" ? r.right - fw : placement === "top" || placement === "bottom" ? r.left + r.width / 2 - fw / 2 : r.left;
    left = Math.min(Math.max(m, left), vw - fw - m);
    setPos({ top, left, minWidth: r.width, maxHeight, side });
  };

  useLayoutEffect(() => {
    // Measure-then-place: the popup must exist in the DOM before its size is known, so the position is set here,
    // before paint. This is the intended use of a layout effect.
    // oxlint-disable-next-line react/set-state-in-effect
    if (open) update();
    // oxlint-disable-next-line react/set-state-in-effect
    else setPos(null);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return pos;
}

/** Closes on outside pointerdown and on Escape (focus returns to the anchor). */
export function useDismiss(open: boolean, close: () => void, refs: RefObject<HTMLElement | null>[], anchor?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (refs.some((r) => r.current?.contains(e.target as Node))) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
        anchor?.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, refs, anchor]);
}
