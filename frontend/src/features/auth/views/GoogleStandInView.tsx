import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/icons";
import { Stack } from "@/components/layout";
import { Alert, Button, RadioGroup, TextField } from "@/components/ui";
import { AuthPage, K, LinkButton, Panel, type EmailIssue } from "./AuthFrame";
import s from "./auth.module.css";

export type GoogleStandInState = "default" | "submitting" | "failed";

export type DemoIdentity = { id: string; name: string; email: string };

export type GoogleStandInViewProps = {
  state: GoogleStandInState;
  identities: DemoIdentity[];
  fieldError?: EmailIssue;
  /** start on "Another email" (id "other") with this text typed */
  initialOther?: string;
  hrefs: { home: string };
  /** Continue: the chosen demo identity, or the typed email (the page derives the name) */
  onContinue: (v: { email: string; name: string }) => void;
  /** Cancel — back to the page the user came from */
  onCancel: () => void;
  /** failed state: ask again */
  onRetry: () => void;
};

/*
 * The mock-only Google step (research R7). It stands in for Google's page, so like the Checkout stand-in it sits OUTSIDE
 * the product (brand + language only), is clearly marked as a simulation, and has no password or personal-data fields.
 */
export function GoogleStandInView(p: GoogleStandInViewProps) {
  const { t } = useTranslation();
  const [choice, setChoice] = useState<string>(p.initialOther !== undefined ? "other" : (p.identities[0]?.id ?? "other"));
  const [other, setOther] = useState(p.initialOther ?? "");
  const busy = p.state === "submitting";

  if (p.state === "failed") {
    return (
      <AuthPage testId="google-page" state={p.state} brandHref={p.hrefs.home}>
        <Panel
          icon="error"
          tone="danger"
          title={t(`${K}.google.failedTitle`)}
          subtitle={t(`${K}.google.failedText`)}
          footer={<LinkButton onClick={p.onCancel}>{t(`${K}.google.cancel`)}</LinkButton>}
        >
          <div className={s.full}>
            <Button type="button" size="lg" icon={<Icon name="retry" />} onClick={p.onRetry} data-testid="google-retry">{t("kit.retry")}</Button>
          </div>
        </Panel>
      </AuthPage>
    );
  }

  const chosen = p.identities.find((i) => i.id === choice);
  const submit = () => {
    if (chosen) p.onContinue({ email: chosen.email, name: chosen.name });
    else p.onContinue({ email: other, name: "" });
  };
  return (
    <AuthPage testId="google-page" state={p.state} brandHref={p.hrefs.home}>
      <Panel
        icon="user"
        title={t(`${K}.google.title`)}
        subtitle={t(`${K}.google.subtitle`)}
        busy={busy}
        footer={<LinkButton disabled={busy} onClick={p.onCancel} testId="google-cancel">{t(`${K}.google.cancel`)}</LinkButton>}
      >
        <form onSubmit={(e) => { e.preventDefault(); if (!busy) submit(); }} noValidate aria-busy={busy || undefined} data-testid="google-form">
          <Stack gap={16}>
            <Alert tone="warning" title={t(`${K}.google.demoTitle`)}>{t(`${K}.google.demoText`)}</Alert>
            <RadioGroup
              legend={t(`${K}.google.legend`)}
              value={choice}
              onChange={setChoice}
              disabled={busy}
              options={[
                ...p.identities.map((i) => ({ value: i.id, label: i.name, description: i.email })),
                { value: "other", label: t(`${K}.google.other`) },
              ]}
            />
            {!chosen && (
              <TextField
                label={t(`${K}.email`)}
                type="email"
                inputMode="email"
                autoComplete="off"
                autoFocus
                placeholder={t(`${K}.emailPlaceholder`)}
                value={other}
                onChange={(e) => setOther(e.target.value)}
                error={p.fieldError ? t(`${K}.errors.email.${p.fieldError}`) : undefined}
                disabled={busy}
              />
            )}
            <div className={s.full}>
              <Button type="submit" size="lg" loading={busy} data-testid="auth-submit">
                {busy ? t(`${K}.google.continuing`) : t(`${K}.google.continue`)}
              </Button>
            </div>
          </Stack>
        </form>
      </Panel>
    </AuthPage>
  );
}
