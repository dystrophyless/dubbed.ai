import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { create } from "zustand";
import { Icon, type IconName } from "@/components/icons";
import { cx } from "./cx";
import s from "./Feedback.module.css";

export type Tone = "info" | "success" | "warning" | "danger" | "neutral";
const TONE_ICON: Record<Tone, IconName> = { info: "info", success: "success", warning: "warning", danger: "error", neutral: "info" };

/* ---------------- Dialog ---------------- */

/**
 * Modal dialog. Focus moves in and is trapped; Escape and the close button call onClose; focus returns to the opener.
 * Destructive confirmations put the destructive button last (rightmost) and name the action ("Delete project").
 */
export function Dialog({
  open, onClose, title, children, footer, role = "dialog", "data-testid": testId,
}: { open: boolean; onClose: () => void; title: ReactNode; children?: ReactNode; footer?: ReactNode; role?: "dialog" | "alertdialog"; "data-testid"?: string }) {
  const { t } = useTranslation();
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const focusables = () => Array.from(el?.querySelectorAll<HTMLElement>("button, [href], input, textarea, [tabindex]:not([tabindex='-1'])") ?? []).filter((n) => !n.hasAttribute("disabled"));
    (focusables()[0] ?? el)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
      if (e.key === "Tab") {
        const f = focusables();
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      opener?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className={s.backdrop} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role={role} aria-modal="true" aria-labelledby={`${id}-title`} tabIndex={-1} className={s.dialog} data-testid={testId}>
        <div className={s.dialogHead}>
          <h2 className={s.dialogTitle} id={`${id}-title`}>{title}</h2>
          <button type="button" className={s.iconButton} onClick={onClose} aria-label={t("kit.close")}>
            <Icon name="close" />
          </button>
        </div>
        {children && <div className={s.dialogBody}>{children}</div>}
        {footer && <div className={s.dialogFooter}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* ---------------- Toast ---------------- */

export type ToastInput = { tone?: Tone; title: string; description?: string; action?: ReactNode; duration?: number };
type ToastItem = ToastInput & { id: number };
type ToastStore = { items: ToastItem[]; push: (t: ToastInput) => number; dismiss: (id: number) => void };
let seq = 0;

/** Client-only UI state → Zustand. Call `toast({ title })` from anywhere; <Toaster /> renders once in the app shell. */
export const useToasts = create<ToastStore>((set, get) => ({
  items: [],
  push: (input) => {
    const id = ++seq;
    set({ items: [...get().items.slice(-2), { ...input, id }] });
    const ms = input.duration ?? (input.action ? 8000 : 4000);
    if (ms > 0) window.setTimeout(() => get().dismiss(id), ms);
    return id;
  },
  dismiss: (id) => set({ items: get().items.filter((t) => t.id !== id) }),
}));
export const toast = (input: ToastInput) => useToasts.getState().push(input);

export function Toaster() {
  const { t } = useTranslation();
  const items = useToasts((st) => st.items);
  const dismiss = useToasts((st) => st.dismiss);
  return createPortal(
    <div className={s.toaster} aria-live="polite" aria-relevant="additions" data-testid="toaster">
      {items.map((it) => {
        const tone = it.tone ?? "success";
        return (
          <div key={it.id} className={cx(s.toast, s[`tone-${tone}`])} role={tone === "danger" ? "alert" : "status"}>
            <span className={cx(s.toastIcon, s.toneIcon)}><Icon name={TONE_ICON[tone]} /></span>
            <div className={s.toastText}>
              <div className={s.toastTitle}>{it.title}</div>
              {it.description && <div className={s.toastDescription}>{it.description}</div>}
            </div>
            {it.action && <div className={s.toastAction}>{it.action}</div>}
            <button type="button" className={s.iconButton} onClick={() => dismiss(it.id)} aria-label={t("kit.dismiss")}>
              <Icon name="close" size={14} />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}

/* ---------------- Alert ---------------- */

/** Inline message inside a page or card. Not for transient feedback (toast) or blocking decisions (dialog). */
export function Alert({ tone = "info", title, children, action }: { tone?: Tone; title?: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={cx(s.alert, s[`tone-${tone}`])} role={tone === "danger" ? "alert" : "status"}>
      <span className={cx(s.toastIcon, s.toneIcon)}>
        <Icon name={TONE_ICON[tone]} />
      </span>
      <div className={s.alertBody}>
        {title && <div className={s.alertTitle}>{title}</div>}
        {children && <div className={s.alertText}>{children}</div>}
      </div>
      {action && <div className={s.alertAction}>{action}</div>}
    </div>
  );
}

/* ---------------- Empty state ---------------- */

/** Empty / error / no-result block: icon tile (otp-input's mail tile), title, one sentence, one or two actions. */
export function EmptyState({
  icon = "info", tone = "neutral", title, description, actions, "data-testid": testId,
}: { icon?: IconName; tone?: Tone; title: ReactNode; description?: ReactNode; actions?: ReactNode; "data-testid"?: string }) {
  return (
    <div className={cx(s.empty, s[`tone-${tone}`])} data-testid={testId} role={tone === "danger" ? "alert" : undefined}>
      <span className={s.emptyIcon} aria-hidden="true"><Icon name={icon} /></span>
      <h3 className={s.emptyTitle}>{title}</h3>
      {description && <p className={s.emptyText}>{description}</p>}
      {actions && <div className={s.emptyActions}>{actions}</div>}
    </div>
  );
}

/* ---------------- Progress & spinner ---------------- */

export function ProgressBar({ label, value, max = 100, valueText, hideLabel }: { label: string; value?: number; max?: number; valueText?: string; hideLabel?: boolean }) {
  const indeterminate = value === undefined;
  const pct = indeterminate ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  const id = useId();
  return (
    <div className={s.progress}>
      {!hideLabel && (
        <div className={s.progressHead}>
          <span id={id}>{label}</span>
          {!indeterminate && <span className={s.progressValue}>{valueText ?? `${Math.round(pct)}%`}</span>}
        </div>
      )}
      <div
        className={s.bar}
        role="progressbar"
        aria-labelledby={hideLabel ? undefined : id}
        aria-label={hideLabel ? label : undefined}
        aria-valuemin={indeterminate ? undefined : 0}
        aria-valuemax={indeterminate ? undefined : max}
        aria-valuenow={indeterminate ? undefined : value}
        aria-valuetext={valueText}
        data-indeterminate={indeterminate ? "" : undefined}
      >
        <div className={s.barFill} style={indeterminate ? undefined : { width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Spinner({ size = 16, label }: { size?: 14 | 16 | 20 | 24; label?: string }) {
  return (
    <svg
      className={s.spinner}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <circle cx="12" cy="12" r="8.5" opacity={0.2} />
      <path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5" />
    </svg>
  );
}
