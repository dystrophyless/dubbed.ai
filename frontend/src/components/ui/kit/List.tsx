import type { ReactNode } from "react";
import { Link } from "react-router";
import { Icon } from "@/components/icons";
import { cx } from "./cx";
import s from "./List.module.css";

/*
 * List — rows inside a Card (padding="none"), the Clean row language (profile-menu items, filter-menu options):
 * leading visual · title + one muted line · trailing meta · optional actions. Hairline between rows.
 * A row with `to` is one big link (title, meta and a chevron); `actions` (e.g. a ⋯ Menu) sit outside the link so
 * there are never nested interactive elements.
 */
/** `dividers={false}`: no hairlines between rows — for grouped lists where ListGroup labels already separate the groups. */
export function List({ children, label, dividers = true, "data-testid": testId }: { children: ReactNode; label?: string; dividers?: boolean; "data-testid"?: string }) {
  return <ul className={s.list} aria-label={label} data-testid={testId} data-dividers={dividers ? undefined : "off"}>{children}</ul>;
}

export function ListItem({
  leading, title, subtitle, trailing, to, onClick, actions, "data-testid": testId,
}: {
  leading?: ReactNode; title: ReactNode; subtitle?: ReactNode; trailing?: ReactNode;
  to?: string; onClick?: () => void; actions?: ReactNode; "data-testid"?: string;
}) {
  const body = (
    <>
      {leading && <span className={s.leading}>{leading}</span>}
      <span className={s.text}>
        <span className={s.title}>{title}</span>
        {subtitle && <span className={s.subtitle}>{subtitle}</span>}
      </span>
      {trailing && <span className={s.trailing}>{trailing}</span>}
      {(to || onClick) && <span className={s.chevron} aria-hidden="true"><Icon name="next" /></span>}
    </>
  );
  return (
    <li className={s.row} data-testid={testId}>
      {to ? (
        <Link to={to} className={cx(s.main, s.interactive)}>{body}</Link>
      ) : onClick ? (
        <button type="button" className={cx(s.main, s.interactive)} onClick={onClick}>{body}</button>
      ) : (
        <div className={s.main}>{body}</div>
      )}
      {actions && <span className={s.actions}>{actions}</span>}
    </li>
  );
}

/** A group label inside a List ("Today", "31 October") — a quiet overline row, not a heading of its own. */
export function ListGroup({ children }: { children: ReactNode }) {
  return <li className={s.group}>{children}</li>;
}
