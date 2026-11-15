import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitch } from "@/app/shells/LanguageSwitch";
import { Brand } from "@/app/shells/Shells";
import { StateSwitcher } from "@/components/dev/StateSwitcher";
import { useViewState } from "@/components/dev/view-state";
import { Icon, type IconName } from "@/components/icons";
import { Container, Stack } from "@/components/layout";
import { AudioTrack, SceneColumn, TurnLine, VideoStage, demoPeaks } from "@/components/media";
import { Button, Card, IconTile, Tag, Text, Toaster, toast } from "@/components/ui";
import s from "./templates.module.css";

export const LANDING_STATES = ["default"] as const;
const ORIGINAL = demoPeaks(160);
const TAKE = demoPeaks(160, 31);

/*
 * Landing — /styleguide/templates/landing (public). Public bar: brand · EN/RU · Sign in · Start dubbing (primary).
 * Hero: display title, one line, the primary action and the welcome offer; the visual is the product itself —
 * the studio's scene column (video · line · audio track with a take drawn over the original).
 * Then: how it works in 3 steps, 4 short answers, a closing call to action, a quiet footer.
 * (The owner preferred this version over a later one with a 44px hero, facts strip and a solid-indigo CTA — 2026-11-03.)
 */
export function LandingTemplate() {
  const { t } = useTranslation();
  useViewState(LANDING_STATES);
  const [ratio, setRatio] = useState(16 / 9);
  const start = () => toast({ tone: "info", title: t("tpl.landing.toSignUp") });
  const steps: { icon: IconName; title: string; text: string }[] = [
    { icon: "upload", title: t("tpl.landing.step1"), text: t("tpl.landing.step1Text") },
    { icon: "record", title: t("tpl.landing.step2"), text: t("tpl.landing.step2Text") },
    { icon: "download", title: t("tpl.landing.step3"), text: t("tpl.landing.step3Text") },
  ];
  const faq = ["q1", "q2", "q3", "q4"] as const;
  return (
    <div className={s.landing}>
      <header className={s.publicBar}>
        <Container>
          <div className={s.publicBarInner}>
            <Brand to="/styleguide/templates/landing" />
            <span className={s.grow} />
            <LanguageSwitch />
            <Button variant="ghost" onClick={() => toast({ tone: "info", title: t("tpl.auth.signIn") })}>{t("tpl.auth.signIn")}</Button>
            <Button onClick={start}>{t("tpl.landing.start")}</Button>
          </div>
        </Container>
      </header>

      <main id="main">
        <Container>
          <section className={s.hero}>
            <div className={s.heroText}>
              <Tag tone="accent" icon={<Icon name="credits" size={14} />}>{t("tpl.landing.offer")}</Tag>
              <h1 className={s.heroTitle}>{t("tpl.landing.title")}</h1>
              <p className={s.heroLead}>{t("tpl.landing.lead")}</p>
              <div className={s.heroActions}>
                <Button size="lg" iconRight={<Icon name="forward" />} onClick={start}>{t("tpl.landing.start")}</Button>
                <Text size="sm" tone="muted">{t("tpl.landing.noCard")}</Text>
              </div>
            </div>
            <Card padding="md" className={s.heroVisual}>
              <SceneColumn ratio={ratio} maxHeight="300px">
                <VideoStage src="/media/scene.mp4" label={t("sg.media.scene")} ratio={ratio} onRatio={setRatio} />
                <TurnLine text={t("sg.media.demoLine")} />
                <AudioTrack label={t("sg.media.trackLabel")} original={ORIGINAL} take={TAKE} mode="playing" progress={0.42} />
              </SceneColumn>
            </Card>
          </section>

          <section className={s.landingSection} aria-labelledby="how">
            <h2 id="how" className={s.sectionTitle}>{t("tpl.landing.how")}</h2>
            <div className={s.steps3}>
              {steps.map((st, i) => (
                <Card key={st.title}>
                  <Stack gap={12}>
                    <IconTile icon={st.icon} tone={i === 1 ? "danger" : "accent"} size={40} />
                    <Stack gap={4}>
                      <Text size="sm" tone="muted" tabular>{t("tpl.auth.step", { n: i + 1, total: 3 })}</Text>
                      <Text medium tone="strong">{st.title}</Text>
                      <Text tone="text">{st.text}</Text>
                    </Stack>
                  </Stack>
                </Card>
              ))}
            </div>
          </section>

          <section className={s.landingSection} aria-labelledby="faq">
            <h2 id="faq" className={s.sectionTitle}>{t("tpl.landing.faq")}</h2>
            <Card padding="none">
              {faq.map((q) => (
                <details key={q} className={s.faqItem}>
                  <summary className={s.faqQ}>
                    <span>{t(`tpl.landing.${q}`)}</span>
                    <span className={s.faqIcon} aria-hidden="true"><Icon name="expand" /></span>
                  </summary>
                  <p className={s.faqA}>{t(`tpl.landing.${q}a`)}</p>
                </details>
              ))}
            </Card>
          </section>

          <section className={s.cta}>
            <h2 className={s.ctaTitle}>{t("tpl.landing.ctaTitle")}</h2>
            <Button size="lg" iconRight={<Icon name="forward" />} onClick={start}>{t("tpl.landing.start")}</Button>
          </section>
        </Container>
      </main>

      <footer className={s.footer}>
        <Container>
          <div className={s.footerInner}>
            <span>© 2026 Dubbed</span>
            <span>{t("tpl.landing.footer")}</span>
          </div>
        </Container>
      </footer>
      <Toaster />
      <StateSwitcher states={LANDING_STATES} />
    </div>
  );
}
