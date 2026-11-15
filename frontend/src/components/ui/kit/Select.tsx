import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icons";
import { cx } from "./cx";
import fs from "./Field.module.css";
import s from "./Popover.module.css";
import { useAnchoredPosition, useDismiss } from "./usePopover";

export type SelectOption<T extends string> = { value: T; label: string; icon?: ReactNode; disabled?: boolean };

/*
 * Select — our own listbox (never a native <select> popup). Button + aria-haspopup="listbox"; arrows, Home/End,
 * Enter/Space, Escape and type-ahead work; the list is a portal so cards never clip it.
 */
export function Select<T extends string>({
  label, options, value, onChange, placeholder, hint, error, disabled, className, hideLabel,
}: {
  label: string; options: SelectOption<T>[]; value: T | null; onChange: (v: T) => void; placeholder?: string;
  hint?: ReactNode; error?: ReactNode; disabled?: boolean; className?: string; hideLabel?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const pos = useAnchoredPosition(trigger, list, open, "bottom-start");
  const close = useCallback(() => setOpen(false), []);
  const placed = pos !== null;
  useLayoutEffect(() => {
    // focus once positioned: while measuring the popup is visibility:hidden and cannot take focus
    if (open && placed) list.current?.focus({ preventScroll: true });
  }, [open, placed]);
  const refs = useMemo(() => [trigger, list], []);
  useDismiss(open, close, refs, trigger);
  const selected = options.find((o) => o.value === value);
  const current = Math.max(0, options.findIndex((o) => o.value === value));

  const openAt = (index: number) => {
    setActive(index);
    setOpen(true);
  };
  const enabled = (i: number, dir: 1 | -1) => {
    let n = i;
    for (let k = 0; k < options.length; k++) {
      n = (n + dir + options.length) % options.length;
      if (!options[n].disabled) return n;
    }
    return i;
  };
  const pick = (i: number) => {
    const o = options[i];
    if (!o || o.disabled) return;
    onChange(o.value);
    setOpen(false);
    trigger.current?.focus();
  };
  const onTriggerKey = (e: KeyboardEvent) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      openAt(current);
    }
  };
  const onListKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => enabled(i, 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => enabled(i, -1)); }
    else if (e.key === "Home") { e.preventDefault(); setActive(enabled(-1, 1)); }
    else if (e.key === "End") { e.preventDefault(); setActive(enabled(options.length, -1)); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(active); }
    else if (e.key === "Tab") setOpen(false);
    else if (e.key.length === 1) {
      const now = e.timeStamp;
      typed.current = { text: (now - typed.current.at > 600 ? "" : typed.current.text) + e.key.toLowerCase(), at: now };
      const i = options.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(typed.current.text));
      if (i >= 0) setActive(i);
    }
  };

  return (
    <div className={cx(fs.field, className)}>
      <span className={cx(fs.label, hideLabel && "sr-only")} id={`${id}-label`}>{label}</span>
      <button
        ref={trigger}
        type="button"
        className={s.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-value`}
        aria-describedby={error || hint ? `${id}-msg` : undefined}
        aria-invalid={error ? true : undefined}
        data-invalid={error ? "" : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openAt(current))}
        onKeyDown={onTriggerKey}
      >
        {selected?.icon && <span className={s.itemIcon} aria-hidden="true">{selected.icon}</span>}
        <span id={`${id}-value`} className={cx(s.itemLabel, !selected && s.placeholder)}>{selected?.label ?? placeholder}</span>
        <span className={s.chevron} aria-hidden="true"><Icon name="expand" /></span>
      </button>
      {error ? (
        <p className={fs.error} id={`${id}-msg`} role="alert"><Icon name="error" size={14} />{error}</p>
      ) : hint ? (
        <p className={fs.hint} id={`${id}-msg`}>{hint}</p>
      ) : null}
      {open &&
        createPortal(
          <div
            ref={list}
            role="listbox"
            tabIndex={-1}
            aria-labelledby={`${id}-label`}
            aria-activedescendant={`${id}-opt-${active}`}
            className={cx(s.surface, !pos && s.measuring)}
            data-side={pos?.side}
            style={pos ? { top: pos.top, left: pos.left, minWidth: pos.minWidth, maxHeight: pos.maxHeight } : { top: 0, left: 0 }}
            onKeyDown={onListKey}
          >
            {options.map((o, i) => (
              <div
                key={o.value}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={o.value === value}
                aria-disabled={o.disabled || undefined}
                className={s.item}
                data-active={i === active ? "" : undefined}
                onPointerMove={() => !o.disabled && setActive(i)}
                onClick={() => pick(i)}
              >
                {o.icon && <span className={s.itemIcon} aria-hidden="true">{o.icon}</span>}
                <span className={s.itemLabel}>{o.label}</span>
                {o.value === value && <span className={s.check} aria-hidden="true"><Icon name="check" /></span>}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
