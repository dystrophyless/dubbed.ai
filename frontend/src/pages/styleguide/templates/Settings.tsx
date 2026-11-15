import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useViewState } from "@/components/dev/view-state";
import { Icon } from "@/components/icons";
import { Container, Stack } from "@/components/layout";
import { LevelMeter } from "@/components/media";
import {
  Alert, Button, Card, CardBody, CardHeader, Dialog, EmptyState, IconTile, List, ListItem, PageHeader, PasswordField, Select, SkeletonText, Text, toast,
} from "@/components/ui";
import { DEMO_DEVICES, DEMO_USER } from "./mocks";
import { InAppShell } from "./TemplateFrame";
import s from "./templates.module.css";

export const SETTINGS_STATES = ["default", "loading", "saving", "error"] as const;

/*
 * Settings — /styleguide/templates/settings. Two panels in the Clean language (title inside the panel, rows below):
 *   Account: email · password (Change → dialog) · delete account (→ confirm)
 *   Microphone: device, a thin level bar, "Test" in the panel header — the only place besides sign-up with a level meter.
 * The interface language is not here: it lives in the top bar.
 */
export function SettingsTemplate() {
  const { t } = useTranslation();
  const state = useViewState(SETTINGS_STATES);
  const [device, setDevice] = useState("default");
  const [testing, setTesting] = useState(false);
  const [level, setLevel] = useState(0);
  const [heard, setHeard] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [password, setPassword] = useState(state === "saving");
  const [current, setCurrent] = useState(state === "saving" ? "old-password" : "");
  const [next, setNext] = useState(state === "saving" ? "correct horse" : "");
  const [tried, setTried] = useState(false);
  useEffect(() => {
    if (!testing) return;
    let n = 0;
    const id = window.setInterval(() => {
      n += 1;
      setLevel(n % 14 < 9 ? 0.35 + Math.random() * 0.3 : Math.random() * 0.08); // demo only
      if (n === 18) setHeard(true);
      if (n >= 45) { setTesting(false); setLevel(0); }
    }, 90);
    return () => window.clearInterval(id);
  }, [testing]);
  const loading = state === "loading";

  return (
    <InAppShell states={SETTINGS_STATES} credits={1046}>
      <Container width="narrow">
        <Stack gap={24}>
          <PageHeader title={t("tpl.settings.title")} />
          {state === "error" ? (
            <Card>
              <EmptyState icon="error" tone="danger" title={t("tpl.settings.errorTitle")} description={t("tpl.projects.errorText")}
                actions={<Button variant="secondary" icon={<Icon name="retry" />} onClick={() => toast({ tone: "info", title: t("kit.retry") })}>{t("kit.retry")}</Button>} />
            </Card>
          ) : (
            <>
              <Card padding="none" aria-busy={loading || undefined}>
                <CardHeader title={t("tpl.settings.account")} />
                <List>
                  <ListItem
                    leading={<IconTile icon="email" />}
                    title={t("tpl.auth.email")}
                    subtitle={loading ? <SkeletonText size="sm" width={140} /> : DEMO_USER.email}
                  />
                  <ListItem
                    leading={<IconTile icon="password" />}
                    title={t("tpl.settings.password")}
                    subtitle={t("tpl.settings.passwordSet")}
                    actions={<Button variant="secondary" size="sm" disabled={loading} onClick={() => setPassword(true)}>{t("tpl.settings.change")}</Button>}
                  />
                  <ListItem
                    leading={<IconTile icon="delete" tone="danger" />}
                    title={t("tpl.settings.delete")}
                    subtitle={t("tpl.settings.deleteWarning")}
                    actions={<Button variant="destructive" size="sm" disabled={loading} onClick={() => setConfirm(true)}>{t("tpl.settings.deleteShort")}</Button>}
                  />
                </List>
              </Card>

              <Card padding="none" aria-busy={loading || undefined}>
                <CardHeader
                  title={t("tpl.settings.microphone")}
                  actions={<Button variant="secondary" size="sm" icon={<Icon name="record" size={14} />} loading={testing} disabled={loading} onClick={() => { setHeard(false); setTesting(true); }}>{t("tpl.settings.micTest")}</Button>}
                />
                <CardBody>
                  {loading ? <Stack gap={8}><SkeletonText size="lg" width="100%" /><SkeletonText width="40%" /></Stack> : (
                    <Stack gap={12}>
                      <Select label={t("tpl.auth.micDevice")} hideLabel value={device} onChange={(v) => { setDevice(v); setHeard(false); }} options={DEMO_DEVICES.map((d) => ({ value: d.value, label: d.label }))} />
                      <LevelMeter level={level} label={t("tpl.auth.micLevel")} />
                      {heard ? (
                        <span className={s.heard} role="status"><Icon name="success" size={14} />{t("tpl.auth.micHeard")}</span>
                      ) : (
                        <Text size="sm" tone="muted">{testing ? t("tpl.auth.micSay") : t("tpl.settings.micIdle")}</Text>
                      )}
                    </Stack>
                  )}
                </CardBody>
              </Card>
            </>
          )}
        </Stack>
      </Container>

      <Dialog
        open={password}
        onClose={() => setPassword(false)}
        title={t("tpl.settings.changePassword")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPassword(false)}>{t("sg.buttons.cancel")}</Button>
            <Button
              loading={state === "saving"}
              onClick={() => {
                setTried(true);
                if (current && next.length >= 8) { setPassword(false); setTried(false); toast({ title: t("tpl.settings.passwordSaved") }); }
              }}
            >
              {t("tpl.settings.changePassword")}
            </Button>
          </>
        }
      >
        <Stack gap={16}>
          <PasswordField label={t("tpl.settings.currentPassword")} autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)}
            error={tried && !current ? t("tpl.settings.currentRequired") : undefined} />
          <PasswordField label={t("tpl.settings.newPassword")} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)}
            hint={t("tpl.auth.passwordHint")} error={tried && next.length < 8 ? t("tpl.settings.passwordShort") : undefined} />
        </Stack>
      </Dialog>

      <Dialog
        open={confirm}
        role="alertdialog"
        onClose={() => setConfirm(false)}
        title={t("tpl.settings.deleteConfirmTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(false)}>{t("sg.buttons.cancel")}</Button>
            <Button variant="destructive" onClick={() => { setConfirm(false); toast({ tone: "info", title: t("tpl.settings.deleted") }); }}>{t("tpl.settings.deleteButton")}</Button>
          </>
        }
      >
        <Alert tone="danger" title={t("tpl.settings.deleteConfirmText")} />
      </Dialog>
    </InAppShell>
  );
}
