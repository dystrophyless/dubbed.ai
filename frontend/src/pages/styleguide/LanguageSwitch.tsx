import { useTranslation } from "react-i18next";
import { LANGUAGES } from "@/i18n";

/* Phase 0 stub: plain buttons. Replaced by the kit's segmented control in Phase 1. */
export function LanguageSwitch() {
  const { t, i18n } = useTranslation();
  return (
    <div role="group" aria-label={t("common.language")} data-testid="language-switch">
      {LANGUAGES.map((lng) => (
        <button key={lng} type="button" aria-pressed={i18n.language === lng} onClick={() => void i18n.changeLanguage(lng)}>
          {lng.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
