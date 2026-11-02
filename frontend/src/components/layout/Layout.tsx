import type { CSSProperties, ElementType, ReactNode } from "react";
import styles from "./layout.module.css";
import { space, type Space } from "./space";

/*
 * Layout primitives (design-system/components.md → Layout). Pages compose these; no ad-hoc flex/grid in feature CSS.
 * One breakpoint switches layouts: 1024px (phones and small tablets below, desktop above).
 */

type Align = "start" | "center" | "end" | "stretch" | "baseline";
type Justify = "start" | "center" | "end" | "between";
const JUSTIFY = { start: "flex-start", center: "center", end: "flex-end", between: "space-between" } as const;
const ALIGN = { start: "flex-start", center: "center", end: "flex-end", stretch: "stretch", baseline: "baseline" } as const;

type BoxProps = { as?: ElementType; className?: string; children?: ReactNode; "data-testid"?: string; id?: string };
const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

export function Stack({ as: As = "div", gap = 12, align, className, children, ...rest }: BoxProps & { gap?: Space; align?: Align }) {
  const style = { "--gap": space(gap), alignItems: align ? ALIGN[align] : undefined } as CSSProperties;
  return <As className={cx(styles.stack, className)} style={style} {...rest}>{children}</As>;
}

export function Cluster({
  as: As = "div", gap = 8, align = "center", justify = "start", wrap = true, className, children, ...rest
}: BoxProps & { gap?: Space; align?: Align; justify?: Justify; wrap?: boolean }) {
  const style = { "--gap": space(gap), alignItems: ALIGN[align], justifyContent: JUSTIFY[justify] } as CSSProperties;
  return <As className={cx(styles.cluster, !wrap && styles.nowrap, className)} style={style} {...rest}>{children}</As>;
}

/** Responsive grid: as many columns as fit, each at least `min` px wide. */
export function Grid({ as: As = "div", gap = 16, min = 240, className, children, ...rest }: BoxProps & { gap?: Space; min?: 160 | 200 | 240 | 280 | 320 }) {
  const style = { "--gap": space(gap), "--min": `${min}px` } as CSSProperties;
  return <As className={cx(styles.grid, className)} style={style} {...rest}>{children}</As>;
}

export function Container({ as: As = "div", width = "content", className, children, ...rest }: BoxProps & { width?: "content" | "narrow" | "form" }) {
  return <As className={cx(styles.container, styles[width], className)} {...rest}>{children}</As>;
}

/** A titled block of a page. Neighbouring sections share their header shape: all with a description or none. */
export function Section({
  title, description, actions, gap = 12, className, children, ...rest
}: BoxProps & { title?: ReactNode; description?: ReactNode; actions?: ReactNode; gap?: Space }) {
  return (
    <section className={cx(styles.section, className)} style={{ gap: space(gap) }} {...rest}>
      {(title || actions) && (
        <div className={styles.sectionHead}>
          <div>
            {title && <h2 className={styles.sectionTitle}>{title}</h2>}
            {description && <p className={styles.sectionDescription}>{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/** Main + aside; stacks below 1024px. The aside can stick under the top bar. */
export function TwoColumn({
  main, aside, side = "end", asideWidth = 360, sticky = false, gap = 24, className, ...rest
}: Omit<BoxProps, "children"> & { main: ReactNode; aside: ReactNode; side?: "start" | "end"; asideWidth?: 280 | 320 | 360 | 400; sticky?: boolean; gap?: Space }) {
  const style = { "--gap": space(gap), "--aside": `${asideWidth}px` } as CSSProperties;
  return (
    <div className={cx(styles.twoColumn, className)} data-side={side} style={style} {...rest}>
      {side === "start" && <aside className={sticky ? styles.sticky : undefined}>{aside}</aside>}
      <div>{main}</div>
      {side === "end" && <aside className={sticky ? styles.sticky : undefined}>{aside}</aside>}
    </div>
  );
}

/** Action bar that stays at the bottom of the viewport while its section scrolls. */
export function StickyBar({ className, children, ...rest }: BoxProps) {
  return <div className={cx(styles.stickyBar, className)} {...rest}>{children}</div>;
}

/** Shows children only above or below the 1024px breakpoint. */
export function Show({ above, below, children }: { above?: boolean; below?: boolean; children: ReactNode }) {
  if (above) return <div className={styles.hideBelow}>{children}</div>;
  if (below) return <div className={styles.hideAbove}>{children}</div>;
  return <>{children}</>;
}
