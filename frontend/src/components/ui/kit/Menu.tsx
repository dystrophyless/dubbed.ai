import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactElement, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { cx } from "./cx";
import s from "./Popover.module.css";
import { useAnchoredPosition, useDismiss, type Placement } from "./usePopover";

export type MenuItem =
  | { id: string; label: string; icon?: ReactNode; tone?: "danger"; disabled?: boolean; onSelect: () => void }
  | { id: string; separator: true };

export type MenuTriggerProps = {
  ref: (el: HTMLButtonElement | null) => void;
  onClick: () => void;
  onKeyDown: (e: KeyboardEvent) => void;
  "aria-haspopup": "menu";
  "aria-expanded": boolean;
  "aria-controls": string;
};

/*
 * Action menu (menu button pattern). `trigger` renders the button and receives the props to spread on it.
 * Arrow keys move, Enter/Space selects, Escape closes and returns focus. The list is a portal.
 */
export function Menu({
  trigger, items, placement = "bottom-end", label,
}: {
  trigger: (p: MenuTriggerProps) => ReactElement;
  items: MenuItem[];
  placement?: Placement;
  label: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const anchor = useRef<HTMLButtonElement | null>(null);
  const menu = useRef<HTMLDivElement>(null);
  const pos = useAnchoredPosition(anchor, menu, open, placement);
  const close = useCallback(() => setOpen(false), []);
  const placed = pos !== null;
  useLayoutEffect(() => {
    // focus once positioned: while measuring the popup is visibility:hidden and cannot take focus
    if (open && placed) menu.current?.focus({ preventScroll: true });
  }, [open, placed]);
  const refs = useMemo(() => [anchor, menu] as RefObject<HTMLElement | null>[], []);
  useDismiss(open, close, refs, anchor);
  const actionable = items.map((it, i) => ("separator" in it || it.disabled ? -1 : i)).filter((i) => i >= 0);

  const show = (first: boolean) => {
    setActive(first ? actionable[0] ?? -1 : actionable[actionable.length - 1] ?? -1);
    setOpen(true);
  };
  const step = (dir: 1 | -1) => {
    const k = actionable.indexOf(active);
    setActive(actionable[(k + dir + actionable.length) % actionable.length]);
  };
  const run = (i: number) => {
    const it = items[i];
    if (!it || "separator" in it || it.disabled) return;
    setOpen(false);
    anchor.current?.focus();
    it.onSelect();
  };

  return (
    <>
      {/* the ref below is a callback that runs on attach, not during render (oxlint false positive) */}
      {/* oxlint-disable-next-line react/refs */}
      {trigger({
        ref: (el) => {
          anchor.current = el;
        },
        onClick: () => (open ? setOpen(false) : show(true)),
        onKeyDown: (e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); show(true); }
          if (e.key === "ArrowUp") { e.preventDefault(); show(false); }
        },
        "aria-haspopup": "menu",
        "aria-expanded": open,
        "aria-controls": `${id}-menu`,
      })}
      {open &&
        createPortal(
          <div
            ref={menu}
            id={`${id}-menu`}
            role="menu"
            aria-label={label}
            tabIndex={-1}
            aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
            className={cx(s.surface, !pos && s.measuring)}
            data-side={pos?.side}
            style={pos ? { top: pos.top, left: pos.left, maxHeight: pos.maxHeight } : { top: 0, left: 0 }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); step(1); }
              else if (e.key === "ArrowUp") { e.preventDefault(); step(-1); }
              else if (e.key === "Home") { e.preventDefault(); setActive(actionable[0]); }
              else if (e.key === "End") { e.preventDefault(); setActive(actionable[actionable.length - 1]); }
              else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); run(active); }
              else if (e.key === "Tab") setOpen(false);
            }}
          >
            {items.map((it, i) =>
              "separator" in it ? (
                <hr key={it.id} className={s.separator} />
              ) : (
                <div
                  key={it.id}
                  id={`${id}-${i}`}
                  role="menuitem"
                  aria-disabled={it.disabled || undefined}
                  className={s.item}
                  data-tone={it.tone}
                  data-active={i === active ? "" : undefined}
                  onPointerMove={() => !it.disabled && setActive(i)}
                  onClick={() => run(i)}
                >
                  {it.icon && <span className={s.itemIcon} aria-hidden="true">{it.icon}</span>}
                  <span className={s.itemLabel}>{it.label}</span>
                </div>
              ),
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
