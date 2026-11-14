import { useId, useState, type ComponentPropsWithRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/icons";
import { cx } from "./cx";
import s from "./Field.module.css";

type FieldFrame = {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  className?: string;
};

/** Label + control + hint / error. The error replaces the hint and is linked with aria-describedby. */
function Frame({ id, label, hint, error, optional, className, children, extra }: FieldFrame & { id: string; children: ReactNode; extra?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className={cx(s.field, className)}>
      <label className={s.label} htmlFor={id}>
        {label}
        {optional && <>{" "}<span className={s.optional}>{t("kit.optional")}</span></>}
      </label>
      {children}
      {error ? (
        <p className={s.error} id={`${id}-msg`} role="alert">
          <Icon name="error" size={14} />
          {error}
        </p>
      ) : hint ? (
        <p className={s.hint} id={`${id}-msg`}>{hint}</p>
      ) : null}
      {extra}
    </div>
  );
}

type InputProps = Omit<ComponentPropsWithRef<"input">, "size"> & FieldFrame & { icon?: ReactNode };

export function TextField({ label, hint, error, optional, className, icon, id, disabled, ...input }: InputProps) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Frame id={fid} label={label} hint={hint} error={error} optional={optional} className={className}>
      <div className={s.box} data-invalid={error ? "" : undefined} data-disabled={disabled ? "" : undefined}>
        {icon && <span className={s.adornment} aria-hidden="true">{icon}</span>}
        <input
          id={fid}
          className={s.input}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${fid}-msg` : undefined}
          {...input}
        />
      </div>
    </Frame>
  );
}

export function PasswordField({ label, hint, error, optional, className, id, disabled, ...input }: Omit<InputProps, "type" | "icon">) {
  const { t } = useTranslation();
  const auto = useId();
  const fid = id ?? auto;
  const [shown, setShown] = useState(false);
  return (
    <Frame id={fid} label={label} hint={hint} error={error} optional={optional} className={className}>
      <div className={s.box} data-invalid={error ? "" : undefined} data-disabled={disabled ? "" : undefined}>
        <input
          id={fid}
          type={shown ? "text" : "password"}
          className={s.input}
          disabled={disabled}
          autoComplete="current-password"
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${fid}-msg` : undefined}
          {...input}
        />
        <button
          type="button"
          className={s.reveal}
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? t("kit.hidePassword") : t("kit.showPassword")}
          aria-pressed={shown}
          disabled={disabled}
        >
          <Icon name={shown ? "hide" : "show"} />
        </button>
      </div>
    </Frame>
  );
}

export function TextArea({
  label, hint, error, optional, className, id, disabled, maxLength, value, ...area
}: ComponentPropsWithRef<"textarea"> & FieldFrame) {
  const auto = useId();
  const fid = id ?? auto;
  const length = typeof value === "string" ? value.length : undefined;
  return (
    <Frame
      id={fid} label={label} hint={hint} error={error} optional={optional} className={className}
      extra={maxLength && length !== undefined ? <span className={s.counter} aria-live="polite">{length} / {maxLength}</span> : undefined}
    >
      <div className={s.box} data-invalid={error ? "" : undefined} data-disabled={disabled ? "" : undefined}>
        <textarea
          id={fid}
          className={cx(s.input, s.textarea)}
          disabled={disabled}
          maxLength={maxLength}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${fid}-msg` : undefined}
          {...area}
        />
      </div>
    </Frame>
  );
}
