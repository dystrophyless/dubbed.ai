import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { ThinkingLoader } from "../affect/thinking-loader";
import { cx } from "./cx";
import s from "./StepProgress.module.css";

/*
 * StepProgress — multi-step server work (patterns.md §4) in one block (Phase 4, processing):
 *   the kit's waiting pill (ThinkingLoader) names the step that runs now — the name rolls from step to step, the spinner
 *   turns into a check when everything is done — with a quiet meta line beside it ("Step 2 of 3 · About a minute left"),
 *   and one bar segment per step under them that fill one after another.
 * `current` = 0 while waiting (no step started), 1..n while step n runs; `fraction` (0..1) is how far the current step is
 * (an estimate — pass 0 to move only on real step boundaries). The segments form one progressbar for assistive tech
 * (`valueText` says the step in words); the pill announces each new step politely. Motion: the fill glides; under
 * prefers-reduced-motion the fill jumps and the pill's roll/shine are off — words and numbers still change.
 * The meta slot is always there (empty while waiting, if you pass none), so the bar never moves when it appears.
 */
export function StepProgress({
  label, steps, current, fraction = 0, waitingLabel, done = false, doneLabel, meta, valueText, className, ...rest
}: {
  /** accessible name of the bar, e.g. "Preparing" */
  label: string;
  /** step names, one segment each */
  steps: readonly string[];
  current: number;
  fraction?: number;
  waitingLabel: string;
  done?: boolean;
  doneLabel: string;
  /** shown beside the pill (wraps under it on narrow screens) */
  meta?: ReactNode;
  valueText?: string;
  className?: string;
  "data-testid"?: string;
}) {
  const n = steps.length;
  // the pill measures its label once per label; re-mount it whenever a web font (e.g. the Cyrillic subset) arrives
  const [fonts, setFonts] = useState(0);
  useEffect(() => {
    const set = typeof document === "undefined" ? undefined : document.fonts;
    if (!set) return;
    const bump = () => setFonts((n) => n + 1);
    set.addEventListener("loadingdone", bump);
    void set.ready.then(bump);
    return () => set.removeEventListener("loadingdone", bump);
  }, []);
  const fill = (i: number) => {
    if (done || i < current) return 1;
    if (i > current) return 0;
    return Math.min(1, Math.max(0, fraction));
  };
  const total = done ? n : Math.max(0, current - 1) + (current > 0 ? fill(current) : 0);
  const percent = Math.round((total / n) * 100);
  return (
    <div className={cx(s.root, className)} data-done={done || undefined} data-step={current} {...rest}>
      <div className={s.head}>
        <ThinkingLoader key={fonts} phases={[waitingLabel, ...steps]} phase={done ? n : current} done={done} doneLabel={doneLabel} />
        <span className={s.meta} aria-hidden={meta ? undefined : true}>{meta}</span>
      </div>
      <div
        className={s.segments}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={valueText}
      >
        {steps.map((name, k) => (
          <span key={name} className={s.segment}>
            <span className={s.fill} style={{ "--fill": fill(k + 1) } as CSSProperties} />
          </span>
        ))}
      </div>
    </div>
  );
}
