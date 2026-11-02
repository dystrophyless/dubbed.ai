import { useTranslation } from "react-i18next";
import { LanguageSwitch } from "./LanguageSwitch";

/* Phase 0 placeholder. Phase 1 fills it with every kit component in every state (EN/RU, desktop/phone). */
export function StyleguidePage() {
  const { t } = useTranslation();
  return (
    <main data-testid="styleguide">
      <h1>{t("styleguide.title")}</h1>
      <LanguageSwitch />
      <p>{t("styleguide.placeholder")}</p>
    </main>
  );
}
