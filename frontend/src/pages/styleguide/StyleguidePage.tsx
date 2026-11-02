import { useTranslation } from "react-i18next";
import { LanguageSwitch } from "@/app/shells/LanguageSwitch";
import { Container } from "@/components/layout";
import { PageHeader, Toaster } from "@/components/ui";
import { Buttons, Choices, Fields, Otp } from "./sections/Controls";
import { Feedback } from "./sections/Feedback";
import { Foundations } from "./sections/Foundations";
import { LayoutSection } from "./sections/Layout";
import { MediaSection } from "./sections/Media";
import { AffectComposites, Overlays } from "./sections/Overlays";
import s from "./sg.module.css";

const SECTIONS = ["foundations", "buttons", "fields", "choices", "otp", "feedback", "overlays", "affect", "media", "layout"] as const;

/* /styleguide — every kit component in every state, EN and RU, desktop and phone (BOOTSTRAP Phase 1). */
export function StyleguidePage() {
  const { t } = useTranslation();
  return (
    <Container className={s.page} data-testid="styleguide">
      <div className={s.header}>
        <PageHeader title={t("styleguide.title")} description={t("styleguide.description")} />
        <LanguageSwitch />
      </div>
      <nav className={s.toc} aria-label={t("styleguide.contents")}>
        {SECTIONS.map((id) => (
          <a key={id} href={`#${id}`} className={s.tocLink}>{t(`sg.${id}.title`)}</a>
        ))}
      </nav>
      <div className={s.sections}>
        <Foundations />
        <Buttons />
        <Fields />
        <Choices />
        <Otp />
        <Feedback />
        <Overlays />
        <AffectComposites />
        <MediaSection />
        <LayoutSection />
      </div>
      <Toaster />
    </Container>
  );
}
