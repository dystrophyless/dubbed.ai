import { useTranslation } from "react-i18next";
import { Icon } from "@/components/icons";
import { Stack } from "@/components/layout";
import { LevelMeter } from "@/components/media";
import { Alert, Button, Select, Spinner } from "@/components/ui";
import { AuthPage, K, Panel, ServiceAlert } from "./AuthFrame";
import s from "./auth.module.css";

export type MicPhase = "asking" | "listening" | "heard" | "silent" | "blocked" | "missing";

export type MicrophoneViewProps = {
  phase: MicPhase;
  /** live level 0..1 from the analyser (ignored unless the microphone is open) */
  level: number;
  devices: { value: string; label: string }[];
  deviceId: string;
  onDevice: (id: string) => void;
  /** "Finish setup" is running (account activation) */
  finishing?: boolean;
  /** activation failed: retryable, the microphone stays open */
  serviceError?: boolean;
  hrefs: { home: string };
  /** Try again — asks for the microphone again (blocked / missing) */
  onRetry: () => void;
  onFinish: () => void;
};

/* Step 3 of sign-up. Mandatory, no skip: Finish enables only once the voice has been heard on the live level. */
export function MicrophoneView(p: MicrophoneViewProps) {
  const { t } = useTranslation();

  if (p.phase === "blocked" || p.phase === "missing") {
    const blocked = p.phase === "blocked";
    return (
      <AuthPage testId="microphone-page" state={p.phase} brandHref={p.hrefs.home}>
        <Panel
          icon="micOff"
          tone="danger"
          step={3}
          title={t(`${K}.mic.${blocked ? "blockedTitle" : "missingTitle"}`)}
          subtitle={t(`${K}.mic.${blocked ? "blockedText" : "missingText"}`)}
        >
          <Stack gap={16}>
            {blocked && (
              <ol className={s.steps} data-testid="mic-how-to">
                <li>{t(`${K}.mic.step1`)}</li>
                <li>{t(`${K}.mic.step2`)}</li>
                <li>{t(`${K}.mic.step3`)}</li>
              </ol>
            )}
            <div className={s.full}>
              <Button type="button" size="lg" icon={<Icon name="retry" />} onClick={p.onRetry} data-testid="mic-retry">{t("kit.retry")}</Button>
            </div>
          </Stack>
        </Panel>
      </AuthPage>
    );
  }

  const asking = p.phase === "asking";
  const heard = p.phase === "heard";
  const several = p.devices.length > 1;
  const current = p.devices.find((d) => d.value === p.deviceId) ?? p.devices[0];
  return (
    <AuthPage testId="microphone-page" state={p.phase} brandHref={p.hrefs.home}>
      <Panel
        icon="record"
        step={3}
        title={t(`${K}.mic.title`)}
        subtitle={t(`${K}.mic.subtitle`)}
        busy={p.finishing}
        footer={<span className={s.footHint}><Icon name="headphones" size={14} />{t(`${K}.mic.headphones`)}</span>}
      >
        <Stack gap={16}>
          {p.serviceError && <ServiceAlert onRetry={p.onFinish} />}
          {!asking && current && (
            several ? (
              <Select label={t(`${K}.mic.device`)} value={p.deviceId} onChange={p.onDevice} options={p.devices} disabled={p.finishing} />
            ) : (
              <div className={s.deviceLabel}>
                <span className={s.fieldLabel}>{t(`${K}.mic.device`)}</span>
                <div className={s.deviceRow} data-testid="mic-device"><Icon name="record" size={14} />{current.label}</div>
              </div>
            )
          )}
          <Stack gap={8}>
            <LevelMeter level={asking ? 0 : p.level} label={t(`${K}.mic.level`)} />
            {asking && <span className={s.status} role="status"><Spinner size={14} />{t(`${K}.mic.asking`)}</span>}
            {p.phase === "listening" && <span className={s.status} role="status">{t(`${K}.mic.say`)}</span>}
            {heard && <span className={`${s.status} ${s.heard}`} role="status" data-testid="mic-heard"><Icon name="success" size={14} />{t(`${K}.mic.heard`)}</span>}
            {p.phase === "silent" && (
              <div data-testid="mic-silent">
                <Alert tone="info" title={t(`${K}.mic.silentTitle`)}>{t(`${K}.mic.${several ? "silentText" : "silentTextOne"}`)}</Alert>
              </div>
            )}
          </Stack>
          <div className={s.full}>
            <Button type="button" size="lg" disabled={!heard} loading={p.finishing} onClick={p.onFinish} data-testid="mic-finish">
              {p.finishing ? t(`${K}.mic.finishing`) : t(`${K}.mic.finish`)}
            </Button>
          </div>
        </Stack>
      </Panel>
    </AuthPage>
  );
}
