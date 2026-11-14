import { useSearchParams } from "react-router";
import { Icon } from "@/components/icons";
import { Button, Menu } from "@/components/ui";
import s from "./state-switcher.module.css";

/**
 * Review aid for ?state= (styleguide templates and prototypes only, never real pages).
 * A compact button in the bottom-left corner that opens a menu — it never covers the page's own controls.
 */
export function StateSwitcher({ states }: { states: readonly string[] }) {
  const [params, setParams] = useSearchParams();
  const raw = params.get("state");
  const current = raw && states.includes(raw) ? raw : states[0];
  return (
    <div className={s.switcher} data-testid="state-switcher">
      <Menu
        label="Preview state"
        placement="top"
        trigger={(p) => (
          <Button variant="secondary" size="sm" iconRight={<Icon name="expand" size={14} />} {...p}>
            {`state: ${current}`}
          </Button>
        )}
        items={states.map((v) => ({
          id: v,
          label: v === current ? `${v} ✓` : v,
          onSelect: () => {
            const next = new URLSearchParams(params);
            if (v === states[0]) next.delete("state");
            else next.set("state", v);
            setParams(next, { replace: true });
          },
        }))}
      />
    </div>
  );
}
