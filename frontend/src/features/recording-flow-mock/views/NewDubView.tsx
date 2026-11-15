import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/icons";
import { Container, Stack } from "@/components/layout";
import { CostButton, PlaySectionButton, RangeSelector, UploadDropzone, VideoStage, useSectionPlayback } from "@/components/media";
import { Button, Card, CardBody, CardFooter, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import s from "./new-dub.module.css";

/*
 * New dub (S1) — the approved "one card" design, presentational. The page container supplies the shell and the data;
 * the prototype supplies a demo clock. See ui-spec.md S1 and design-system/new-dub-brief.md.
 */
export type NewDubPhase = "empty" | "no-slot" | "uploading" | "checking" | "error" | "ready";
export type NewDubReason = "type" | "size" | "length" | "short" | "no-audio" | "broken";
export type ClipShape = "scope" | "16x9" | "portrait";

const ERROR_KEY: Record<NewDubReason, "type" | "size" | "length" | "short" | "noAudio" | "broken"> = {
  type: "type", size: "size", length: "length", short: "short", "no-audio": "noAudio", broken: "broken",
};

/** The stage is always 2.35:1, as wide as the card (owner 2026-11-03). */
export const STAGE_RATIO = 960 / 408;
export const MAX_SECTION_SECONDS = 120;

export type NewDubViewProps = {
  phase: NewDubPhase;
  /** the refusal shown in phase "error" */
  error: NewDubReason;
  /** upload progress 0..100 */
  progress: number;
  /** the chosen file's name (upload / check states) */
  fileName: string;
  /** the project name (from the file name) */
  name: string;
  /** the source video (blob URL or demo clip) */
  videoSrc: string;
  /** length of the whole video, seconds */
  duration: number;
  /** the selected section, seconds */
  range: [number, number];
  balance: number;
  /** Start pressed, the reserve call is in flight */
  starting: boolean;
  shape?: ClipShape;
  /** prototype only: maps section time to the clip's time (a short clip stands in for a long video) */
  toMedia?: (t: number) => number;
  onFile: (file: File) => void;
  onCancelUpload: () => void;
  onRange: (start: number, end: number) => void;
  onStart: () => void;
  onBuyCredits: () => void;
  onOpenProjects: () => void;
};

const identity = (t: number) => t;

export function NewDubView(p: NewDubViewProps) {
  const { t } = useTranslation();
  return (
    <Container className={s.page}>
      <div className={s.column} data-testid="new-dub" data-state={p.phase}>
        <Stack gap={24}>
          <PageHeader title={t("newDub.title")} description={t("newDub.description")} />
          {p.phase === "no-slot" ? (
            <Card padding="none" className={s.box} data-testid="new-dub-no-slot">
              <EmptyState
                icon="warning"
                tone="warning"
                title={t("newDub.noSlot.title")}
                description={t("newDub.noSlot.text")}
                actions={
                  <>
                    <Button size="lg" icon={<Icon name="projects" />} onClick={p.onOpenProjects}>{t("newDub.noSlot.projects")}</Button>
                    <Button variant="secondary" size="lg" icon={<Icon name="purchase" />} onClick={p.onBuyCredits}>{t("newDub.noSlot.buy")}</Button>
                  </>
                }
              />
            </Card>
          ) : p.phase === "ready" ? (
            <Ready {...p} />
          ) : (
            <UploadDropzone
              className={s.box}
              state={p.phase === "empty" ? "idle" : p.phase}
              progress={p.progress}
              fileName={p.fileName}
              error={t(`newDub.errors.${ERROR_KEY[p.error]}`)}
              onFile={p.onFile}
              onCancel={p.onCancelUpload}
            />
          )}
        </Stack>
      </div>
    </Container>
  );
}

/*
 * Ready: one card — the project name + Replace video · the video edge to edge at 2.35:1 · the section ·
 * the footer: Play section | Start dubbing · N credits (the only place with the price). Short of credits: Start disabled
 * with the shortfall, Buy credits beside it.
 */
function Ready(p: NewDubViewProps) {
  const { t } = useTranslation();
  const video = useRef<HTMLVideoElement>(null);
  const [a, b] = p.range;
  const toMedia = p.toMedia ?? identity;
  const play = useSectionPlayback(video, a, b, toMedia);
  const replace = useRef<HTMLInputElement>(null);
  // the src stays fixed (the first frame of the opening section); section changes seek instead of reloading
  const [first] = useState(() => toMedia(a));
  const src = `${p.videoSrc}#t=${first}`;
  return (
    <Card padding="none" className={s.card} data-testid="new-dub-card" aria-busy={p.starting || undefined}>
      <CardHeader
        title={<span className={s.name}>{p.name}</span>}
        actions={
          <>
            <input
              ref={replace}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              data-testid="new-dub-replace-input"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) p.onFile(f);
                e.target.value = "";
              }}
            />
            <Button variant="ghost" icon={<Icon name="refresh" />} disabled={p.starting} onClick={() => replace.current?.click()}>
              {t("newDub.replace")}
            </Button>
          </>
        }
      />
      <div className={s.stage} data-clip={p.shape ?? "scope"} data-testid="new-dub-stage">
        <VideoStage src={src} ratio={STAGE_RATIO} maxHeight="var(--video-h)" videoRef={video} label={t("newDub.video", { name: p.name })}>
          {!play.playing && !p.starting && (
            // pointer-only shortcut for Play section; assistive tech uses the button in the footer
            <button type="button" className={s.playOverlay} tabIndex={-1} aria-hidden="true" onClick={play.toggle}>
              <Icon name="play" size={20} />
            </button>
          )}
        </VideoStage>
      </div>
      <CardBody className={s.body}>
        <RangeSelector duration={p.duration} start={a} end={b} max={MAX_SECTION_SECONDS} onChange={p.onRange} playhead={play.pos} disabled={p.starting} />
      </CardBody>
      <CardFooter className={s.footer}>
        <PlaySectionButton className={s.play} playing={play.playing} onToggle={play.toggle} disabled={p.starting} />
        <div className={s.cost}>
          <CostButton seconds={b - a} balance={p.balance} onStart={p.onStart} onBuy={p.onBuyCredits} loading={p.starting} />
        </div>
      </CardFooter>
    </Card>
  );
}
