import { useId, type ReactNode } from "react";
import { cx } from "./cx";
import s from "./OptionCards.module.css";

export type OptionCard<T extends string> = { value: T; title: ReactNode; subtitle?: ReactNode; meta?: ReactNode; badge?: ReactNode; disabled?: boolean };

/*
 * OptionCards — choose one of a few rich options (credit packs, quality presets). Native radios under white cards:
 * hairline card at rest, accent ring + accent wash + check when chosen. Arrows move between options (radio group).
 * Use for 2–4 options that need more than a label; one primary button elsewhere acts on the choice.
 */
export function OptionCards<T extends string>({
  legend, options, value, onChange, disabled, className,
}: { legend: string; options: OptionCard<T>[]; value: T; onChange: (v: T) => void; disabled?: boolean; className?: string }) {
  const name = useId();
  return (
    <fieldset className={cx(s.group, className)} disabled={disabled}>
      <legend className="sr-only">{legend}</legend>
      {options.map((o) => (
        <label key={o.value} className={s.card} data-checked={o.value === value ? "" : undefined} data-disabled={disabled || o.disabled ? "" : undefined}>
          <input
            type="radio"
            className={s.native}
            name={name}
            value={o.value}
            checked={o.value === value}
            disabled={o.disabled}
            onChange={() => onChange(o.value)}
          />
          <span className={s.top}>
            {o.badge ? <span className={s.badge}>{o.badge}</span> : <span />}
            <span className={s.check} aria-hidden="true">
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.2 5 8.5l4.5-5" /></svg>
            </span>
          </span>
          <span className={s.title}>{o.title}</span>
          {o.subtitle && <span className={s.subtitle}>{o.subtitle}</span>}
          {o.meta && <span className={s.meta}>{o.meta}</span>}
        </label>
      ))}
    </fieldset>
  );
}
