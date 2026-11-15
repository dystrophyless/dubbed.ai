import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Cluster, Grid, Section, Show, Stack, StickyBar, TwoColumn } from "@/components/layout";
import { Button, Card, Text } from "@/components/ui";
import { SgSection, Specimen } from "../Specimen";
import s from "../sg.module.css";

const Box = ({ children }: { children: string }) => <div className={s.grey}>{children}</div>;

export function LayoutSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <SgSection id="layout" title={t("sg.layout.title")} description={t("sg.layout.description")}>
      <Specimen title="Stack · Cluster" note={t("sg.layout.stackNote")}>
        <Stack gap={8}>
          <Box>Stack gap=8</Box>
          <Box>Stack gap=8</Box>
        </Stack>
        <Cluster gap={8}>
          <Box>Cluster</Box>
          <Box>gap=8</Box>
          <Box>wrap</Box>
        </Cluster>
      </Specimen>
      <Specimen title="Grid min=160" note={t("sg.layout.gridNote")}>
        <Grid min={160} gap={8}>
          {["1", "2", "3", "4", "5"].map((n) => <Box key={n}>{`Grid ${n}`}</Box>)}
        </Grid>
      </Specimen>
      <Specimen title="TwoColumn · Show" wide note={t("sg.layout.twoNote")}>
        <TwoColumn
          asideWidth={280}
          gap={16}
          main={<Box>{t("sg.layout.main")}</Box>}
          aside={
            <Stack gap={8}>
              <Box>{t("sg.layout.aside")}</Box>
              <Show above><Box>{t("sg.layout.desktopOnly")}</Box></Show>
              <Show below><Box>{t("sg.layout.phoneOnly")}</Box></Show>
            </Stack>
          }
        />
      </Specimen>
      <Specimen title="Section" plain note={t("sg.layout.sectionNote")}>
        <Section title={t("sg.layout.sectionTitle")} description={t("sg.layout.sectionText")} actions={<Button size="sm" variant="secondary">{t("sg.feedback.edit")}</Button>}>
          <Card><Text tone="text">{t("sg.feedback.cardText")}</Text></Card>
        </Section>
      </Specimen>
      <Specimen title="StickyBar" plain note={t("sg.layout.stickyNote")}>
        <StickyBar>
          <Button variant="ghost">{t("sg.buttons.cancel")}</Button>
          <Button>{t("sg.buttons.save")}</Button>
        </StickyBar>
      </Specimen>
      <Specimen title={t("sg.layout.shells")} wide note={t("sg.layout.shellsNote")}>
        <Cluster gap={8}>
          <Button variant="secondary" onClick={() => navigate("/styleguide/shells/app")}>{t("sg.layout.appShell")}</Button>
          <Button variant="secondary" onClick={() => navigate("/styleguide/shells/focused")}>{t("sg.layout.focusedShell")}</Button>
        </Cluster>
      </Specimen>
    </SgSection>
  );
}
