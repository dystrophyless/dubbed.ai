import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { FocusedShell } from "@/app/shells/Shells";
import { useViewState } from "@/components/dev/view-state";
import { Stack } from "@/components/layout";
import { AudioTrack, SceneColumn, TurnLine, VideoStage, demoPeaks, type RecordState } from "@/components/media";
import { Button, Card, CardBody, CardFooter, CardHeader, Dialog, SegmentedControl, Text, TextLink } from "@/components/ui";
import s from "./concepts.module.css";

/*
 * Phase 4 — studio CONCEPTS (low-fi). Structure and hierarchy only: the centre column is the owner's fixed layout
 * (SceneColumn · grey video box · TurnLine · AudioTrack); the concepts differ only in where the controls sit.
 * Review aid: ?state=no-take | recording | saved and ?ratio=portrait. Never used by real pages.
 */

export const STUDIO_STATES = ["no-take", "recording", "saved"] as const;
export type StudioPreview = (typeof STUDIO_STATES)[number];
export const CONCEPT_IDS = ["under-track", "side-panels", "thumb-dock", "next-step"] as const;
export type ConceptId = (typeof CONCEPT_IDS)[number];
const LETTER: Record<ConceptId, string> = { "under-track": "A", "side-panels": "B", "thumb-dock": "C", "next-step": "D" };

export const WINDOW = 4.4;
export const TOTAL = 12;
const ORIGINAL = demoPeaks(160);
const TAKE = demoPeaks(160, 31);
const LINES = ["line0", "line1", "line2", "line3"] as const;

export type Studio = ReturnType<typeof useStudio>;

/** Demo-only studio state: turn index, takes per turn, record state and a fake clock for recording and playback. */
function useStudio(preview: StudioPreview) {
  const [index, setIndex] = useState(2);
  const [takes, setTakes] = useState<Set<number>>(() => new Set(preview === "saved" ? [0, 1, 2] : [0, 1]));
  const [rec, setRec] = useState<RecordState>(preview === "recording" ? "recording" : preview === "saved" ? "saved" : "idle");
  const [elapsed, setElapsed] = useState(preview === "recording" ? 1.9 : 0);
  const [live, setLive] = useState(false); // a ?state=recording preview is frozen; a real click runs the clock
  const [playing, setPlaying] = useState<"none" | "original" | "take">("none");

  useEffect(() => {
    const running = (rec === "recording" && live) || playing !== "none";
    if (!running) return;
    const started = performance.now(); // record and play both start from 0
    const id = window.setInterval(() => {
      const e = (performance.now() - started) / 1000;
      if (e < WINDOW) return setElapsed(e);
      setElapsed(WINDOW);
      if (rec === "recording") setRec("saving");
      else setPlaying("none");
    }, 50);
    return () => window.clearInterval(id);
  }, [rec, live, playing]);

  useEffect(() => {
    if (rec !== "saving") return;
    const id = window.setTimeout(() => {
      setRec("saved");
      setTakes((t) => new Set(t).add(index));
    }, 700);
    return () => window.clearTimeout(id);
  }, [rec, index]);

  const hasTake = takes.has(index);
  const busy = rec === "recording" || rec === "saving";
  const go = (to: number) => {
    setIndex(to);
    setRec(takes.has(to) ? "saved" : "idle");
    setPlaying("none");
    setElapsed(0);
  };
  return {
    index, total: TOTAL, rec, elapsed, playing, hasTake, busy,
    canNext: hasTake && !busy,
    lineKey: LINES[index % LINES.length],
    record: () => { setPlaying("none"); setElapsed(0); setLive(true); setRec("recording"); },
    stop: () => setRec("saving"),
    play: (what: "original" | "take") => {
      if (busy) return;
      setElapsed(0);
      setPlaying((p) => (p === what ? "none" : what));
    },
    prev: () => index > 0 && go(index - 1),
    next: () => hasTake && !busy && index < TOTAL - 1 && go(index + 1),
  };
}

/** The owner's fixed centre column. The video is a grey box (low-fi); its height limit comes from the concept's CSS. */
export function Scene({ studio, portrait, className }: { studio: Studio; portrait: boolean; className?: string }) {
  const { t } = useTranslation();
  const ratio = portrait ? 9 / 16 : 16 / 9;
  const recording = studio.rec === "recording";
  return (
    <div className={className}>
      <SceneColumn ratio={ratio} maxHeight="var(--video-h)">
        <VideoStage label={t("concepts.studio.video")} ratio={ratio} maxHeight="var(--video-h)">
          <span className={s.videoLabel} aria-hidden="true">
            {t("concepts.studio.videoBox", { ratio: portrait ? "9:16" : "16:9" })}
            {studio.playing !== "none" && ` · ${t(studio.playing === "take" ? "concepts.studio.playingTake" : "concepts.studio.playingOriginal")}`}
          </span>
        </VideoStage>
        <TurnLine text={t(`concepts.studio.${studio.lineKey}`)} />
        <AudioTrack
          label={t("concepts.studio.track")}
          original={ORIGINAL}
          take={recording || studio.rec === "saving" || studio.hasTake ? TAKE : undefined}
          takeProgress={recording ? studio.elapsed / WINDOW : 1}
          mode={recording ? "recording" : studio.playing !== "none" ? "playing" : "idle"}
          progress={studio.elapsed / WINDOW}
        />
      </SceneColumn>
    </div>
  );
}

/** "Turn 3 of 12" for the focused shell's right slot. */
export function TurnCount({ studio }: { studio: Studio }) {
  const { t } = useTranslation();
  return <Text size="md" tone="ink" medium tabular>{t("media.turn.of", { n: studio.index + 1, total: studio.total })}</Text>;
}

/*
 * ConceptPage — focused shell + the concept's studio + the unsaved-take exit dialog + the note card that states the
 * idea and its trade-offs. The state / scene-shape pickers live in the note card (not floating over the controls).
 */
export function ConceptPage({
  id, right, children,
}: {
  id: ConceptId;
  right?: (studio: Studio) => ReactNode;
  children: (studio: Studio, portrait: boolean) => ReactNode;
}) {
  const preview = useViewState(STUDIO_STATES);
  const [params] = useSearchParams();
  const portrait = params.get("ratio") === "portrait";
  return <ConceptBody key={`${preview}-${portrait}`} id={id} preview={preview} portrait={portrait} right={right}>{children}</ConceptBody>;
}

function ConceptBody({
  id, preview, portrait, right, children,
}: {
  id: ConceptId; preview: StudioPreview; portrait: boolean;
  right?: (studio: Studio) => ReactNode;
  children: (studio: Studio, portrait: boolean) => ReactNode;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const studio = useStudio(preview);
  const [ask, setAsk] = useState(false);
  const leave = () => navigate("/prototypes/concepts");
  return (
    <FocusedShell
      title={t("concepts.studio.project")}
      onExit={() => (studio.busy ? setAsk(true) : leave())}
      right={right?.(studio)}
    >
      <div className={s.page} data-concept={id} style={{ "--ratio": portrait ? 9 / 16 : 16 / 9 } as CSSProperties}>
        {children(studio, portrait)}
      </div>
      <div className={s.noteWrap}>
        <ConceptNote id={id} portrait={portrait} preview={preview} />
      </div>
      <Dialog
        open={ask}
        onClose={() => setAsk(false)}
        title={t("sg.feedback.leaveTitle")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAsk(false)}>{t("sg.feedback.stay")}</Button>
            <Button variant="secondary" onClick={leave}>{t("sg.feedback.leaveNoSave")}</Button>
            <Button onClick={leave}>{t("sg.feedback.saveLeave")}</Button>
          </>
        }
      >
        <p className={s.dialogText}>{t("sg.feedback.leaveText")}</p>
      </Dialog>
    </FocusedShell>
  );
}

function ConceptNote({ id, portrait, preview }: { id: ConceptId; portrait: boolean; preview: StudioPreview }) {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };
  const rows = ["laptop", "phone", "sound", "discover", "thumb"] as const;
  return (
    <Card padding="none" data-testid="concept-note">
      <CardHeader title={t("concepts.studio.note.title", { letter: LETTER[id], name: t(`concepts.studio.c.${id}.name`) })} />
      <CardBody>
        <Stack gap={12}>
          <Text tone="strong" medium>{t(`concepts.studio.c.${id}.idea`)}</Text>
          <dl className={s.tradeoffs}>
            {rows.map((r) => (
              <div key={r} className={s.tradeoff}>
                <dt>{t(`concepts.studio.note.${r}`)}</dt>
                <dd>{t(`concepts.studio.c.${id}.${r}`)}</dd>
              </div>
            ))}
          </dl>
          <Text size="sm" tone="muted">{t("concepts.studio.note.fixed")}</Text>
          <div className={s.pickers}>
            <SegmentedControl<StudioPreview>
              aria-label={t("concepts.studio.note.state")}
              size="sm"
              variant="tray"
              value={preview}
              onChange={(v) => set("state", v === "no-take" ? null : v)}
              options={STUDIO_STATES.map((v) => ({ value: v, label: t(`concepts.studio.note.states.${v}`) }))}
            />
            <SegmentedControl<"landscape" | "portrait">
              aria-label={t("concepts.studio.note.ratio")}
              size="sm"
              variant="tray"
              value={portrait ? "portrait" : "landscape"}
              onChange={(v) => set("ratio", v === "portrait" ? v : null)}
              options={(["landscape", "portrait"] as const).map((v) => ({ value: v, label: t(`concepts.studio.note.ratios.${v}`) }))}
            />
          </div>
        </Stack>
      </CardBody>
      <CardFooter>
        <div className={s.others}>
          <Text size="sm" tone="muted">{t("concepts.studio.note.others")}</Text>
          {CONCEPT_IDS.filter((c) => c !== id).map((c) => (
            <TextLink key={c} to={`/prototypes/concepts/studio/${c}`}>
              {`${LETTER[c]} · ${t(`concepts.studio.c.${c}.name`)}`}
            </TextLink>
          ))}
        </div>
      </CardFooter>
    </Card>
  );
}
