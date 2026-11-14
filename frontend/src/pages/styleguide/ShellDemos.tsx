import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { AppShell, FocusedShell } from "@/app/shells/Shells";
import { Icon } from "@/components/icons";
import { Container, Stack } from "@/components/layout";
import { Button, Card, Dialog, PageHeader, Text } from "@/components/ui";
import s from "./sg.module.css";

/* Demo pages for the two shells. Navigation items are placeholders until the IA (Gate 2) fixes the routes. */
export function AppShellDemo() {
  const { t } = useTranslation();
  return (
    <AppShell
      credits={120}
      user={{ name: "Alex Morgan", email: "alex@example.com" }}
      nav={[
        { to: "/styleguide/shells/app", label: t("shell.demo.projects"), icon: "projects" },
        { to: "/styleguide/shells/app/new", label: t("shell.demo.newDub"), icon: "add" },
        { to: "/styleguide/shells/app/credits", label: t("shell.credits"), icon: "credits" },
      ]}
    >
      <Container>
        <Stack gap={24}>
          <PageHeader
            title={t("shell.demo.projects")}
            description={t("shell.demo.projectsText")}
            actions={<Button icon={<Icon name="add" />}>{t("shell.demo.newDub")}</Button>}
          />
          <div className={s.specimens}>
            {[1, 2, 3].map((n) => (
              <Card key={n}><div className={s.grey} style={{ minHeight: 120 }}>{t("shell.demo.placeholder")}</div></Card>
            ))}
          </div>
        </Stack>
      </Container>
    </AppShell>
  );
}

export function FocusedShellDemo() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [ask, setAsk] = useState(false);
  return (
    <FocusedShell title={t("shell.demo.projectName")} onExit={() => setAsk(true)} right={<Text size="sm" tone="muted" tabular>{t("shell.demo.progress")}</Text>}>
      <Container>
        <Card>
          <div className={s.grey} style={{ minHeight: 360 }}>{t("shell.demo.focusedText")}</div>
        </Card>
      </Container>
      <Dialog
        open={ask}
        onClose={() => setAsk(false)}
        title={t("sg.feedback.leaveTitle")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAsk(false)}>{t("sg.feedback.stay")}</Button>
            <Button variant="secondary" onClick={() => navigate("/styleguide#layout")}>{t("sg.feedback.leaveNoSave")}</Button>
            <Button onClick={() => navigate("/styleguide#layout")}>{t("sg.feedback.saveLeave")}</Button>
          </>
        }
      >
        <p style={{ margin: 0 }}>{t("sg.feedback.leaveText")}</p>
      </Dialog>
    </FocusedShell>
  );
}
