import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router";
import { Icon, type IconName } from "@/components/icons";
import { cx } from "./cx";
import s from "./Misc.module.css";

export type TagTone = "neutral" | "accent" | "success" | "warning" | "danger" | "outline";

/** Status tag / badge (filter-menu chip shape). Tone is a small signal; the text always says the status. */
export function Tag({ tone = "neutral", size = "md", overline, dot, icon, children }: { tone?: TagTone; size?: "sm" | "md"; overline?: boolean; dot?: boolean; icon?: ReactNode; children: ReactNode }) {
  return (
    <span className={cx(s.tag, s[`tag-${tone}`])} data-size={size} data-overline={overline ? "" : undefined}>
      {dot && <span className={s.dot} aria-hidden="true" />}
      {icon}
      {children}
    </span>
  );
}

/** Avatar: photo or initials on the track fill with the Clean avatar ring (comment-thread-clean.md:424). */
/** `decorative`: inside a control that already names the person/account — hidden from assistive tech. */
export function Avatar({ name, src, size = 32, decorative }: { name: string; src?: string; size?: 24 | 32 | 40; decorative?: boolean }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  return (
    <span className={cx(s.avatar, s[`avatar-${size}`])} role={decorative ? undefined : "img"} aria-label={decorative ? undefined : name} aria-hidden={decorative || undefined}>
      {src ? <img src={src} alt="" /> : initials}
    </span>
  );
}

function pages(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total));
  const list = [...set].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  list.forEach((p, i) => {
    if (i && p - list[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

/** Pagination: prev / numbers / next on desktop; prev · "3 of 12" · next on phones (compact). */
export function Pagination({ page, total, onChange, compact }: { page: number; total: number; onChange: (p: number) => void; compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <nav className={s.pagination} aria-label={t("kit.pagination")}>
      <button type="button" className={s.page} onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label={t("kit.previousPage")}>
        <Icon name="prev" />
      </button>
      {compact ? (
        <span className={s.pageStatus} aria-live="polite">{t("kit.pageOf", { page, total })}</span>
      ) : (
        pages(page, total).map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className={s.ellipsis} aria-hidden="true">…</span>
          ) : (
            <button key={p} type="button" className={s.page} aria-current={p === page ? "page" : undefined} onClick={() => onChange(p)} aria-label={t("kit.page", { page: p })}>
              {p}
            </button>
          ),
        )
      )}
      <button type="button" className={s.page} onClick={() => onChange(page + 1)} disabled={page >= total} aria-label={t("kit.nextPage")}>
        <Icon name="next" />
      </button>
    </nav>
  );
}

/** Inline text link (router-aware). */
export function TextLink({ to, children }: { to: string; children: ReactNode }) {
  return <RouterLink to={to} className={s.link}>{children}</RouterLink>;
}

/** "← Back" link above a page title. */
export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <RouterLink to={to} className={s.backLink}>
      <Icon name="back" />
      {children}
    </RouterLink>
  );
}

/** A 32px tinted tile with one icon — gives a row or a panel its kind at a glance (history kinds, settings rows). */
export function IconTile({ icon, tone = "neutral", size = 32 }: { icon: IconName; tone?: "neutral" | "accent" | "success" | "warning" | "danger"; size?: 32 | 40 }) {
  return (
    <span className={cx(s.tile, s[`tile-${tone}`])} data-size={size} aria-hidden="true">
      <Icon name={icon} size={size === 40 ? 20 : 16} />
    </span>
  );
}
