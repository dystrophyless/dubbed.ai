import { useTranslation } from "react-i18next";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui";
import s from "./processing.module.css";

export type NotifyState = "off" | "on" | "denied";
export type NotifyProps = { state: NotifyState; onAsk: () => void; onTurnOff: () => void };

/*
 * "Notify me when it's ready" (owner answer 7): the browser is asked for permission only when the button is pressed;
 * on → "We'll notify you…" with Turn off; denied → how to allow it. Shared by Processing and Result (assembling).
 */
export function NotifyControl({ state, onAsk, onTurnOff }: NotifyProps) {
  const { t } = useTranslation();
  return (
    <div className={s.notify} data-testid="processing-notify" data-state={state} aria-live="polite">
      {state === "off" && (
        <Button variant="secondary" icon={<Icon name="notify" />} onClick={onAsk}>{t("processing.notify.button")}</Button>
      )}
      {state === "on" && (
        <>
          <span className={s.notifyOn}>
            <Icon name="success" />
            {t("processing.notify.on")}
          </span>
          <Button variant="ghost" size="sm" onClick={onTurnOff}>{t("processing.notify.off")}</Button>
        </>
      )}
      {state === "denied" && (
        <span className={s.notifyDenied}>
          <Icon name="notifyOff" />
          {t("processing.notify.denied")}
        </span>
      )}
    </div>
  );
}
