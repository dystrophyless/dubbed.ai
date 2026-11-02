import type { ElementType, ReactNode } from "react";
import { cx } from "./cx";
import s from "./Typography.module.css";

type Tone = "strong" | "ink" | "text" | "muted" | "danger" | "success";

/** Page title row: h1 + optional description on the left, page actions on the right (wraps on phones). */
export function PageHeader({ title, description, actions, eyebrow }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <header className={s.pageHeader}>
      <div className={s.pageHeaderText}>
        {eyebrow}
        <h1 className={s.h1}>{title}</h1>
        {description && <p className={s.description}>{description}</p>}
      </div>
      {actions}
    </header>
  );
}

export function Heading({ level = 2, display, children, id, className }: { level?: 1 | 2 | 3; display?: boolean; children: ReactNode; id?: string; className?: string }) {
  const Tag = `h${level}` as const;
  const cls = display ? s.display : level === 1 ? s.h1 : level === 2 ? s.h2 : s.h3;
  return <Tag id={id} className={cx(cls, className)}>{children}</Tag>;
}

export function Text({
  as: As = "p", size = "md", tone = "ink", medium, tabular, className, children, id,
}: { as?: ElementType; size?: "md" | "sm"; tone?: Tone; medium?: boolean; tabular?: boolean; className?: string; children: ReactNode; id?: string }) {
  return <As id={id} className={cx(size === "md" ? s.text : s.small, s[`tone-${tone}`], medium && s.medium, tabular && s.tabular, className)}>{children}</As>;
}

export function Overline({ children }: { children: ReactNode }) {
  return <p className={s.overline}>{children}</p>;
}
