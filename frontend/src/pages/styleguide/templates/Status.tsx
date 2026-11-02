import { useEffect, useMemo, useState } from "react";
import type { IconName } from "@/components/icons";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useViewState } from "@/components/dev/view-state";
import { Icon } from "@/components/icons";
import { Container, Stack } from "@/components/layout";
import { Button, Card, CardHeader, IconTile, List, ListItem, Spinner, Text, toast } from "@/components/ui";
import { InAppShell, TEMPLATE_LINKS } from "./TemplateFrame";
import s from "./templates.module.css";

export const STATUS_STATES = ["not-found", "error", "offline"] as const;
type StatusState = (typeof STATUS_STATES)[number];

/* One plain, recognisable icon per state (owner 2026-11-03: no codes, no abstract pictures). */
const LOOK: Record<StatusState, { icon: IconName; tone: "neutral" | "danger" | "warning" }> = {
  "not-found": { icon: "search", tone: "neutral" },
  error: { icon: "error", tone: "danger" },
  offline: { icon: "globe", tone: "warning" },
};

/*
 * Status — /styleguide/templates/status. Whole-page states in the ordinary shell; no card around the message.
 *   icon tile · title · one line · one primary action (+ one secondary) ·
 *   a panel that actually helps: where to go (404) · what to tell support (error) · reconnecting (offline).
 */
export function StatusTemplate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const state = useViewState(STATUS_STATES);
  const home = () => navigate(TEMPLATE_LINKS.home);
  const retry = () => toast({ tone: "info", title: t("kit.retry") });
  const code = useMemo(() => "E-4F2A-91C7", []);
  const [left, setLeft] = useState(10);
  useEffect(() => {
    if (state !== "offline") return;
    const id = window.setInterval(() => setLeft((v) => (v <= 1 ? 10 : v - 1)), 1000);
    return () => window.clearInterval(id);
  }, [state]);

  return (
    <InAppShell states={STATUS_STATES} credits={1046}>
      <Container width="narrow" className={s.statusWrap}>
        <Stack gap={32} className={s.statusPage}>
          <div className={s.statusText}>
            <IconTile icon={LOOK[state].icon} tone={LOOK[state].tone} size={40} />
            <h1 className={s.statusTitle}>{t(`tpl.status.${state}.title`)}</h1>
            <p className={s.statusLead}>{t(`tpl.status.${state}.text`)}</p>
            <div className={s.statusActions}>
              {state === "not-found" ? (
                <Button size="lg" icon={<Icon name="projects" />} onClick={home}>{t("tpl.status.toProjects")}</Button>
              ) : (
                <>
                  <Button size="lg" icon={<Icon name="retry" />} onClick={retry}>{t("kit.retry")}</Button>
                  <Button size="lg" variant="secondary" onClick={home}>{t("tpl.status.toProjects")}</Button>
                </>
              )}
            </div>
          </div>

          {state === "not-found" && (
            <Card padding="none">
              <CardHeader title={t("tpl.status.goTitle")} />
              <List>
                <ListItem leading={<IconTile icon="projects" tone="accent" />} title={t("tpl.nav.projects")} subtitle={t("tpl.status.goProjects")} to={TEMPLATE_LINKS.home} />
                <ListItem leading={<IconTile icon="add" tone="accent" />} title={t("tpl.nav.newDub")} subtitle={t("tpl.status.goNew")} onClick={() => toast({ tone: "info", title: t("tpl.nav.newDub") })} />
                <ListItem leading={<IconTile icon="credits" tone="accent" />} title={t("shell.credits")} subtitle={t("tpl.status.goCredits")} to={TEMPLATE_LINKS.credits} />
              </List>
            </Card>
          )}

          {state === "error" && (
            <Card padding="none">
              <List>
                <ListItem leading={<IconTile icon="success" tone="success" />} title={t("tpl.status.noCharge")} subtitle={t("tpl.status.noChargeText")} />
                <ListItem
                  leading={<IconTile icon="help" />}
                  title={t("tpl.status.codeTitle")}
                  subtitle={<span className={s.code}>{code}</span>}
                  actions={
                    <Button variant="secondary" size="sm" icon={<Icon name="copy" size={14} />} onClick={() => { void navigator.clipboard?.writeText(code); toast({ title: t("tpl.status.copied") }); }}>
                      {t("tpl.status.copy")}
                    </Button>
                  }
                />
              </List>
            </Card>
          )}

          {state === "offline" && (
            <Card padding="none">
              <List>
                <ListItem
                  leading={<span className={s.spinTile}><Spinner size={16} /></span>}
                  title={t("tpl.status.reconnecting")}
                  subtitle={t("tpl.status.nextTry", { s: left })}
                />
                <ListItem leading={<IconTile icon="success" tone="success" />} title={t("tpl.status.takesSafe")} subtitle={t("tpl.status.takesSafeText")} />
              </List>
            </Card>
          )}

          {state === "error" && <Text size="sm" tone="muted" className={s.statusFoot}>{t("tpl.status.help")}</Text>}
        </Stack>
      </Container>
    </InAppShell>
  );
}
