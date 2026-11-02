import { useTranslation } from "react-i18next";
import { useParams } from "react-router";

/* Renders /styleguide/templates and /styleguide/templates/:id. Templates are registered here from Phase 3. */
export function TemplatesRoute() {
  const { t } = useTranslation();
  const { id } = useParams();
  return (
    <main data-testid="templates">
      <h1>{t("styleguide.templatesTitle")}</h1>
      <p>{id ? t("styleguide.templateNotFound", { id }) : t("styleguide.templatesPlaceholder")}</p>
    </main>
  );
}
