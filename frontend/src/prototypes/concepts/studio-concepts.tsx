import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/icons";
import { Show, Stack } from "@/components/layout";
import { RecordControl, TurnNav, VolumeControl } from "@/components/media";
import { Button, Card, SegmentedControl } from "@/components/ui";
import { ConceptPage, Scene, TurnCount, WINDOW, type Studio } from "./studio-shared";
import s from "./concepts.module.css";

/* Shared low-fi controls — the same kit components in every concept; only their placement differs. */
function PlayOriginal({ st, label, variant = "secondary" }: { st: Studio; label?: string; variant?: "secondary" | "ghost" }) {
  const { t } = useTranslation();
  const on = st.playing === "original";
  return (
    <Button variant={variant} size="lg" icon={<Icon name={on ? "pause" : "play"} />} aria-pressed={on} onClick={() => st.play("original")} disabled={st.busy}>
      {label ?? t("concepts.studio.original")}
    </Button>
  );
}

function PlayTake({ st }: { st: Studio }) {
  const { t } = useTranslation();
  const on = st.playing === "take";
  return (
    <Button variant="secondary" size="lg" icon={<Icon name={on ? "pause" : "headphones"} />} aria-pressed={on} onClick={() => st.play("take")} disabled={!st.hasTake || st.busy}>
      {t("concepts.studio.myTake")}
    </Button>
  );
}

function Record({ st }: { st: Studio }) {
  return <RecordControl state={st.rec} window={WINDOW} elapsed={st.elapsed} onRecord={st.record} onStop={st.stop} />;
}

function Volume({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const { t } = useTranslation();
  return <VolumeControl label={t("concepts.studio.originalVolume")} value={value} onChange={onChange} />;
}

function Prev({ st, iconOnly }: { st: Studio; iconOnly?: boolean }) {
  const { t } = useTranslation();
  return (
    <Button variant="secondary" size="lg" icon={<Icon name="prev" />} aria-label={iconOnly ? t("media.turn.prev") : undefined} onClick={st.prev} disabled={st.index === 0}>
      {iconOnly ? undefined : t("media.turn.prev")}
    </Button>
  );
}

function Next({ st, iconOnly, label }: { st: Studio; iconOnly?: boolean; label?: string }) {
  const { t } = useTranslation();
  const text = label ?? t("media.turn.next");
  return (
    <Button
      variant={st.canNext ? "primary" : "secondary"}
      size="lg"
      iconRight={<Icon name="next" />}
      aria-label={iconOnly ? text : undefined}
      onClick={st.next}
      disabled={!st.canNext || st.index >= st.total - 1}
    >
      {iconOnly ? undefined : text}
    </Button>
  );
}

/* ------------------------------------------------------------------------------------------------------------------ */

/** A · Under the track — every control in one block right under the audio track; volume in the top bar. */
export function UnderTrackConcept() {
  const [volume, setVolume] = useState(0.8);
  return (
    <ConceptPage id="under-track" right={() => <Show above><Volume value={volume} onChange={setVolume} /></Show>}>
      {(st, portrait) => (
        <Stack gap={16}>
          <Scene studio={st} portrait={portrait} />
          <Stack gap={16} className={s.controls}>
            <div className={s.aRow}>
              <div><PlayOriginal st={st} /></div>
              <Record st={st} />
              <div><PlayTake st={st} /></div>
            </div>
            <TurnNav index={st.index} total={st.total} canNext={st.canNext} onPrev={st.prev} onNext={st.next} nextPrimary={st.canNext} />
            <Show below><Volume value={volume} onChange={setVolume} /></Show>
          </Stack>
        </Stack>
      )}
    </ConceptPage>
  );
}

/** B · Side panels — listen on the left, act on the right, Previous / Next at the panels' bottom corners. */
export function SidePanelsConcept() {
  const { t } = useTranslation();
  const [volume, setVolume] = useState(0.8);
  return (
    <ConceptPage id="side-panels" right={(st) => <TurnCount studio={st} />}>
      {(st, portrait) => (
        <div className={s.bGrid}>
          <Scene studio={st} portrait={portrait} className={s.bScene} />
          <Card className={s.bPanel} data-side="listen">
            <h2 className={s.panelTitle}>{t("concepts.studio.panelListen")}</h2>
            <div className={`${s.full} ${s.bOrig}`}><PlayOriginal st={st} /></div>
            <div className={s.bVol}><Volume value={volume} onChange={setVolume} /></div>
            <span className={s.spacer} />
            <div className={`${s.full} ${s.bPrev}`}><Prev st={st} /></div>
          </Card>
          <Card className={s.bPanel} data-side="act">
            <h2 className={s.panelTitle}>{t("concepts.studio.panelTake")}</h2>
            <div className={s.bRec}><Record st={st} /></div>
            <div className={`${s.full} ${s.bTake}`}><PlayTake st={st} /></div>
            <span className={s.spacer} />
            <Stack gap={4} className={`${s.full} ${s.bNext}`}>
              <Next st={st} />
              {!st.canNext && <span className={s.hint}>{t("media.turn.needTake")}</span>}
            </Stack>
          </Card>
        </div>
      )}
    </ConceptPage>
  );
}

/** C · Thumb dock — the scene alone on top; one dock at the bottom: which voice to hear + Play, then Prev · Record · Next. */
export function ThumbDockConcept() {
  return (
    <ConceptPage id="thumb-dock" right={(st) => <TurnCount studio={st} />}>
      {(st, portrait) => <DockLayout st={st} portrait={portrait} />}
    </ConceptPage>
  );
}

function DockLayout({ st, portrait }: { st: Studio; portrait: boolean }) {
  const { t } = useTranslation();
  const [volume, setVolume] = useState(0.8);
  const [voice, setVoice] = useState<"original" | "take">(st.hasTake ? "take" : "original");
  const which = voice === "take" && st.hasTake ? "take" : "original";
  const on = st.playing === which;
  return (
    <>
      <Scene studio={st} portrait={portrait} />
      <Show below><div className={s.center}><Volume value={volume} onChange={setVolume} /></div></Show>
      <div className={s.dock}>
        <Card padding="sm">
          <div className={s.dockInner}>
            <div className={s.dockListen}>
              <SegmentedControl<"original" | "take">
                aria-label={t("concepts.studio.voice")}
                size="lg"
                variant="tray"
                value={which}
                onChange={setVoice}
                options={[
                  { value: "original", label: t("concepts.studio.original") },
                  { value: "take", label: t("concepts.studio.myTake"), disabled: !st.hasTake },
                ]}
              />
              <Button variant="secondary" size="lg" icon={<Icon name={on ? "pause" : "play"} />} onClick={() => st.play(which)} disabled={st.busy}>
                {on ? t("media.pause") : t("media.play")}
              </Button>
              <Show above><Volume value={volume} onChange={setVolume} /></Show>
            </div>
            <div className={s.dockMain}>
              <div><Show above><Prev st={st} /></Show><Show below><Prev st={st} iconOnly /></Show></div>
              <Record st={st} />
              <div><Show above><Next st={st} /></Show><Show below><Next st={st} iconOnly /></Show></div>
            </div>
            {!st.canNext && <span className={s.hint}>{t("media.turn.needTake")}</span>}
          </div>
        </Card>
      </div>
    </>
  );
}

/** D · Next step — only what makes sense now: Record first; after a take, "Next turn" becomes the one big action. */
export function NextStepConcept() {
  const { t } = useTranslation();
  const [volume, setVolume] = useState(0.8);
  return (
    <ConceptPage id="next-step" right={(st) => <TurnCount studio={st} />}>
      {(st, portrait) => {
        const done = st.hasTake && !st.busy;
        return (
          <Stack gap={16}>
            <Scene studio={st} portrait={portrait} />
            <Stack gap={16} className={s.controls}>
              {!done ? (
                <>
                  <div className={s.center}><Record st={st} /></div>
                  {!st.busy && (
                    <div className={s.dNav}>
                      <PlayOriginal st={st} variant="ghost" label={t("concepts.studio.hearOriginal")} />
                      <Volume value={volume} onChange={setVolume} />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className={s.full}><Next st={st} label={t("concepts.studio.nextTurn")} /></div>
                  <div className={s.dEqual}>
                    <PlayTake st={st} />
                    <PlayOriginal st={st} />
                    <Button variant="secondary" size="lg" icon={<Icon name="record" />} onClick={st.record}>{t("media.record.again")}</Button>
                  </div>
                </>
              )}
              {!st.busy && (
                <div className={s.dNav}>
                  <Prev st={st} />
                  {done ? (
                    <Volume value={volume} onChange={setVolume} />
                  ) : (
                    <div className={s.dNext}>
                      <span className={s.hint}>{t("media.turn.needTake")}</span>
                      <Next st={st} />
                    </div>
                  )}
                </div>
              )}
            </Stack>
          </Stack>
        );
      }}
    </ConceptPage>
  );
}
