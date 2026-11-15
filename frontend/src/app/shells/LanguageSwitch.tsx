import { useTranslation } from "react-i18next";
import { SegmentedControl } from "@/components/ui";
import { LANGUAGES, type Language } from "@/i18n";

/** EN / RU switch — the Clean segmented control (tray variant, small). Remembered per browser. */
export function LanguageSwitch() {
  const { t, i18n } = useTranslation();
  return (
    <span data-testid="language-switch">
    <SegmentedControl<Language>
      aria-label={t("common.language")}
      size="sm"
      variant="tray"
      value={(i18n.resolvedLanguage as Language) ?? "en"}
      onChange={(lng) => void i18n.changeLanguage(lng)}
      options={LANGUAGES.map((l) => ({ value: l, label: l.toUpperCase(), ariaLabel: t(`common.languageName.${l}`) }))}
    />
    </span>
  );
}
