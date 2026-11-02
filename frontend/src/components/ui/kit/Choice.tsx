import { useEffect, useId, useRef, type ComponentPropsWithRef, type ReactNode } from "react";
import { cx } from "./cx";
import s from "./Choice.module.css";

type Base = Omit<ComponentPropsWithRef<"input">, "type" | "children"> & { label: ReactNode; description?: ReactNode };

const Tick = () => (
  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2.5 6.2 5 8.5l4.5-5" />
  </svg>
);

function Label({ label, description }: { label: ReactNode; description?: ReactNode }) {
  return (
    <span className={s.text}>
      <span>{label}</span>
      {description && <span className={s.description}>{description}</span>}
    </span>
  );
}

export function Checkbox({ label, description, className, disabled, indeterminate, ...input }: Base & { indeterminate?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate);
  }, [indeterminate]);
  return (
    <label className={cx(s.row, className)} data-disabled={disabled ? "" : undefined}>
      <input ref={ref} type="checkbox" className={s.native} disabled={disabled} {...input} />
      <span className={s.box} aria-hidden="true"><Tick /></span>
      <Label label={label} description={description} />
    </label>
  );
}

export function Switch({ label, description, className, disabled, ...input }: Base) {
  return (
    <label className={cx(s.row, className)} data-disabled={disabled ? "" : undefined}>
      <input type="checkbox" role="switch" className={s.native} disabled={disabled} {...input} />
      <span className={s.track} aria-hidden="true" />
      <Label label={label} description={description} />
    </label>
  );
}

export type RadioOption<T extends string> = { value: T; label: ReactNode; description?: ReactNode; disabled?: boolean };

/** A fieldset of radios. Use for 2–5 visible choices; more → Select. */
export function RadioGroup<T extends string>({
  legend, name, options, value, onChange, disabled, className,
}: { legend: ReactNode; name?: string; options: RadioOption<T>[]; value: T; onChange: (v: T) => void; disabled?: boolean; className?: string }) {
  const auto = useId();
  return (
    <fieldset className={cx(s.group, className)} disabled={disabled}>
      <legend className={s.legend}>{legend}</legend>
      {options.map((o) => (
        <label key={o.value} className={s.row} data-disabled={disabled || o.disabled ? "" : undefined}>
          <input
            type="radio"
            className={s.native}
            name={name ?? auto}
            value={o.value}
            checked={value === o.value}
            disabled={o.disabled}
            onChange={() => onChange(o.value)}
          />
          <span className={s.dot} aria-hidden="true" />
          <Label label={o.label} description={o.description} />
        </label>
      ))}
    </fieldset>
  );
}
