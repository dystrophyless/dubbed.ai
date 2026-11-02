import { useSearchParams } from "react-router";
import { SegmentedControl } from "@/components/ui";
import s from "./state-switcher.module.css";

/** Floating switcher (bottom-left) for reviewing ?state= values. Only in styleguide templates and prototypes. */
export function StateSwitcher({ states }: { states: readonly string[] }) {
  const [params, setParams] = useSearchParams();
  const current = params.get("state") ?? states[0];
  return (
    <div className={s.switcher} data-testid="state-switcher">
      <SegmentedControl
        aria-label="Preview state"
        size="sm"
        variant="tray"
        value={states.includes(current) ? current : states[0]}
        onChange={(value) => {
          const next = new URLSearchParams(params);
          if (value === states[0]) next.delete("state");
          else next.set("state", value);
          setParams(next, { replace: true });
        }}
        options={states.map((v) => ({ value: v, label: v }))}
      />
    </div>
  );
}
