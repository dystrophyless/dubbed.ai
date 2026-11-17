import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui";
import { MicrophoneView, type MicPhase } from "@/features/auth/views/MicrophoneView";
import { qk, useCompleteMicrophone } from "@/services";
import { useAlive } from "@/features/auth/use-alive";
import { MicrophoneError } from "@/services/media/browser-media";
import { openMicCheck } from "@/services/media/mic-check";
import { saveMicrophone } from "@/services/media/mic-preference";

/*
 * S4 Microphone check (feature 004, ui-spec S4). Mandatory, no skip: Finish is enabled by the view only when the voice was
 * heard. The check is stopped on unmount. Errors: blocked / missing (Try again), silent after 10 s, device switch
 * restarts the check; a failed activation keeps the microphone open and offers a retry.
 */
const HREFS = { home: "/sign-in" };

export function MicrophonePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const client = useQueryClient();
  const complete = useCompleteMicrophone();
  const busy = useRef(false);
  const alive = useAlive();

  const [phase, setPhase] = useState<MicPhase>("asking");
  const [level, setLevel] = useState(0);
  const [devices, setDevices] = useState<{ value: string; label: string }[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [wanted, setWanted] = useState<string | undefined>(undefined);
  const [run, setRun] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [serviceError, setServiceError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | undefined;
    openMicCheck(wanted).then((check) => {
      if (cancelled) { check.stop(); return; }
      stop = check.stop;
      setDevices(check.devices.map((d, i) => ({ value: d.deviceId, label: d.label || `${t("features.auth.mic.device")} ${i + 1}` })));
      setDeviceId(check.deviceId);
      setLevel(0);
      setServiceError(false);
      setPhase("listening");
      check.onLevel(setLevel);
      check.onVoice(() => setPhase("heard"));
      check.onSilent(() => setPhase((p) => (p === "heard" ? p : "silent")));
    }).catch((error: unknown) => {
      if (!cancelled) setPhase(error instanceof MicrophoneError && error.kind === "mic-missing" ? "missing" : "blocked");
    });
    return () => { cancelled = true; stop?.(); };
  }, [wanted, run, t]);

  const restart = (device?: string) => {
    /* a new check starts from nothing: no readiness and no activation error carried over from the previous one */
    setPhase("asking");
    setServiceError(false);
    setLevel(0);
    setWanted(device);
    setRun((n) => n + 1);
  };

  const onFinish = async () => {
    /* every path (Finish, the alert's Try again) needs the voice heard on the current check */
    if (busy.current || phase !== "heard") return;
    busy.current = true;
    setServiceError(false);
    setFinishing(true);
    try {
      const res = await complete.mutateAsync();
      if (!alive.current) return;
      if (res.ok) {
        if (res.value.stage === "active" && deviceId) saveMicrophone(res.value.accountId, deviceId);
        toast({ title: t("features.auth.mic.welcome") });
        navigate("/new", { replace: true });
        client.setQueryData(qk.session, res.value);
        return;
      }
      setServiceError(true);
    } catch {
      if (alive.current) setServiceError(true);
    } finally {
      busy.current = false;
      if (alive.current) setFinishing(false);
    }
  };

  return (
    <MicrophoneView
      phase={phase}
      level={level}
      devices={devices}
      deviceId={deviceId}
      onDevice={(id) => restart(id)}
      finishing={finishing}
      serviceError={serviceError}
      hrefs={HREFS}
      onRetry={() => restart(wanted)}
      onFinish={onFinish}
    />
  );
}
