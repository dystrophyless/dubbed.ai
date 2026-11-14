import type { ElementType, ReactNode } from "react";
import { cx } from "./cx";
import s from "./Card.module.css";

type CardProps = {
  as?: ElementType;
  padding?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
  className?: string;
  children?: ReactNode;
  "data-testid"?: string;
  "aria-labelledby"?: string;
  "aria-busy"?: boolean;
};

/** The one surface of the system. No card-in-card: inner groups use dividers or a wash. */
export function Card({ as: As = "div", padding = "md", interactive, className, children, ...rest }: CardProps) {
  return <As className={cx(s.card, s[`pad-${padding}`], interactive && s.interactive, className)} {...rest}>{children}</As>;
}

/** Header row of a card with padding="none": title left, actions right (filter-menu head, audit §9). */
export function CardHeader({ title, actions, id }: { title: ReactNode; actions?: ReactNode; id?: string }) {
  return (
    <div className={s.header}>
      <h3 className={s.title} id={id}>{title}</h3>
      {actions}
    </div>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx(s.body, className)}>{children}</div>;
}

/** Last row of a card behind a hairline: meta on the left, actions on the right. */
export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx(s.footer, className)}>{children}</div>;
}

export function Divider() {
  return <hr className={s.divider} />;
}
