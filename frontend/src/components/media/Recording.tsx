import { type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/affect/button";
import { Spinner } from "@/components/ui/kit/Feedback";
import { formatSeconds } from "./time";
import { Slider } from "./Slider";
import s from "./media.module.css";

export type RecordState = "idle" | "recording" | "saving" | "saved";

/*
 * RecordControl — the most frequent action, so it is never pale or small: a 56px red disc (64px on touch).
 *   idle      red disc + mic, label "Record"
 *   recording white disc, red ring that fills as the turn's window runs out, red stop square; "Stop · 2.4 s left"
 *   saving    disc with spinner, inert; "Saving take…"
 *   saved     red disc + mic again (re-record), label "Record again", a small green "Take saved" note
 * Recording starts at once (no countdown) and stops by itself at the end of the window (product rule).
 */
export function RecordControl({
  state, window: win, elapsed = 0, onRecord, onStop, disabled,
}: { state: RecordState; window: number; elapsed?: number; onRecord: () => void; onStop: () => void; disabled?: boolean }) {
  const { t, i18n } = useTranslation();
  const left = Math.max(0, win - elapsed);
  const progress = win > 0 ? Math.min(1, elapsed / win) : 0;
  const label =
    state === "recording" ? t("media.record.stop")
    : state === "saving" ? t("media.record.saving")
    : state === "saved" ? t("media.record.again")
    : t("media.record.start");
  return (
    <div className={s.record} data-state={state}>
      <button
        type="button"
        className={s.recordDisc}
        data-state={state}
        style={{ "--progress": progress } as CSSProperties}
        onClick={state === "recording" ? onStop : onRecord}
        disabled={disabled || state === "saving"}
        aria-label={label}
        aria-pressed={state === "recording"}
      >
        {state === "recording" && (
          <svg className={s.recordRing} viewBox="0 0 56 56" aria-hidden="true">
            <circle cx="28" cy="28" r="26" pathLength={1} />
          </svg>
        )}
        {state === "recording" ? <span className={s.stopSquare} aria-hidden="true" /> : state === "saving" ? <Spinner size={20} /> : <Icon name="record" size={24} />}
      </button>
      <div className={s.recordText}>
        <span className={s.recordLabel}>{label}</span>
        <span className={s.recordMeta} aria-live="polite">
          {state === "recording"
            ? t("media.record.left", { s: formatSeconds(left, i18n.resolvedLanguage) })
            : state === "saved"
              ? <span className={s.saved}><Icon name="success" size={14} />{t("media.record.saved")}</span>
              : t("media.record.window", { s: formatSeconds(win, i18n.resolvedLanguage) })}
        </span>
      </div>
    </div>
  );
}

/**
 * Microphone level — a thin 6px bar in the pack's progress language (progress-tracker bar), not a block meter.
 * Green while healthy, amber when loud, red when clipping. Only in the microphone check (sign-up, Settings). role="meter".
 */
export function LevelMeter({ level, label }: { level: number; label: string }) {
  const v = Math.min(1, Math.max(0, level));
  return (
    <div className={s.meter} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)}>
      <span className={s.meterFill} data-zone={v >= 0.9 ? "clip" : v >= 0.7 ? "hot" : "ok"} style={{ width: `${v * 100}%` }} />
    </div>
  );
}

/** Volume of the original voice (listening only — never affects the recording or the output). */
export function VolumeControl({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const { t } = useTranslation();
  const muted = value === 0;
  return (
    <div className={s.volume}>
      <Button
        variant="ghost"
        size="lg"
        icon={<Icon name={muted ? "mute" : value < 0.5 ? "volumeLow" : "volume"} />}
        aria-label={muted ? t("media.unmute", { what: label }) : t("media.mute", { what: label })}
        onClick={() => onChange(muted ? 1 : 0)}
      />
      <Slider className={s.volumeSlider} label={label} value={Math.round(value * 100)} max={100} step={5} valueText={`${Math.round(value * 100)}%`} onChange={(v) => onChange(v / 100)} />
    </div>
  );
}

/*
 * TurnNav — previous / "Turn 3 of 12" / next. Both directions are real buttons. Going forward needs a take for the
 * current turn (owner rule): then Next is disabled and the reason is written next to it, not hidden in a tooltip.
 */
export function TurnNav({
  index, total, canNext, onPrev, onNext, nextPrimary,
}: { index: number; total: number; canNext: boolean; onPrev: () => void; onNext: () => void; nextPrimary?: boolean }) {
  const { t } = useTranslation();
  const last = index >= total - 1;
  return (
    <div className={s.turnNav}>
      <Button variant="secondary" size="lg" icon={<Icon name="prev" />} onClick={onPrev} disabled={index === 0}>{t("media.turn.prev")}</Button>
      <div className={s.turnCount}>
        <span className={s.turnCountMain}>{t("media.turn.of", { n: index + 1, total })}</span>
        {!canNext && !last && <span className={s.turnHint}>{t("media.turn.needTake")}</span>}
      </div>
      <Button variant={nextPrimary ? "primary" : "secondary"} size="lg" iconRight={<Icon name="next" />} onClick={onNext} disabled={!canNext || last}>
        {t("media.turn.next")}
      </Button>
    </div>
  );
}
