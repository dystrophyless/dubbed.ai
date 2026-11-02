import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { PROTOTYPES } from "./registry";

/* Renders /prototypes, /prototypes/:feature and /prototypes/:feature/:screen. Phase 0: unstyled index. */
export function PrototypeRoute() {
  const { t } = useTranslation();
  const { feature, screen } = useParams();
  const entry = PROTOTYPES.find((p) => p.id === feature);
  const target = entry && screen ? entry.screens[screen] : undefined;
  if (target) return <target.Component />;

  const list = entry ? [entry] : PROTOTYPES;
  return (
    <main data-testid="prototypes">
      <h1>{t("prototypes.title")}</h1>
      {list.length === 0 ? (
        <p>{t("prototypes.empty")}</p>
      ) : (
        list.map((p) => (
          <section key={p.id}>
            <h2>{p.id} · {p.title}</h2>
            {Object.entries(p.screens).map(([id, s]) => (
              <p key={id}>
                <Link to={`/prototypes/${p.id}/${id}`}>{s.title}</Link> — {t("prototypes.states")}: {s.states.join(" · ")}
              </p>
            ))}
          </section>
        ))
      )}
    </main>
  );
}
