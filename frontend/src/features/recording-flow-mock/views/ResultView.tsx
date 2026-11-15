import { useRef, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/icons";
import { Container, Stack } from "@/components/layout";
import { PlayerControls, PlayerScreen, VideoStage, formatTime, useFullscreen, usePlayback, usePlayerKeys } from "@/components/media";
import { Button, Card, CardBody, CardFooter, Dialog, IconTile, PageHeader, RadioGroup, Spinner, StepProgress, Text } from "@/components/ui";
import type { ClipShape } from "./NewDubView";
import { NotifyControl, type NotifyProps } from "./NotifyControl";
import s from "./result.module.css";

/*
 * Result (S4) — the approved concept C "watch, then fix", presentational, plus D1 (the real file format beside Download).
 * The page container supplies the shell and the version status; the prototype supplies a demo clock.
 * Brief, owner answers and assumptions: design-system/result-brief.md.
 */
export type ResultPhase = "assembling" | "ready" | "failed";
export type NewVersionStatus = "assembling" | "ready" | "failed";
export type NewVersion = { n: number; turns: number[]; status: NewVersionStatus };
/** one turn inside the video on screen: where it starts / ends (seconds) and its line */
export type ResultTurn = { start: number; end: number; text: string };

const STAGE_RATIO = 960 / 408; // always 2.35:1, as in the studio, New dub and processing

/** Index of the turn under the playhead (or the last one before it). */
export function turnAt(turns: { start: number }[], at: number): number {
  let idx = 0;
  turns.forEach((tn, i) => {
    if (at >= tn.start - 0.05) idx = i;
  });
  return idx;
}

export type ResultViewProps = {
  phase: ResultPhase;
  /** assembling progress 0..1 and the rough time left (seconds, shown rounded) — of the version being assembled */
  progress: number;
  remainingSeconds: number;
  /** the version on screen, and the turns it re-recorded */
  shown: number;
  shownTurns: number[];
  /** a version being assembled / ready / failed behind the one on screen */
  newer: NewVersion | null;
  name: string;
  total: number;
  turns: ResultTurn[];
  /** the section's length in seconds: the clock shows it until the file reports a finite duration */
  lengthS?: number;
  /** the video: the rendered file when ready, the section's first frame while assembling */
  videoSrc: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  shape?: ClipShape;
  /** D1: the real file format, shown beside Download. null = the approved prototype's "Download MP4" copy */
  downloadFormat: "webm" | "mp4" | null;
  chooser: boolean;
  /** index of the chosen turn in the chooser */
  pick: number;
  notify: NotifyProps | null;
  /** announce "Your video is ready" politely (the first version just finished while the user watched) */
  announceReady?: boolean;
  onPick: (index: number) => void;
  /** the playhead (seconds) when the chooser opens — the container selects the turn under it */
  onOpenChooser: (at: number) => void;
  onCloseChooser: () => void;
  onRerecord: () => void;
  onDownload: () => void;
  /** "Watch version N": the container switches; the new version plays from the start */
  onSwitch: () => void;
  onRetry: () => void;
  onRetryNew: () => void;
};

/** { count, list: "3 and 5" } for the plural "turn 3" / "turns 3 and 5" keys (count is 1 or 2: one / several). */
function useTurnList() {
  const { i18n } = useTranslation();
  return (list: number[]) => ({
    count: Math.min(2, Math.max(1, list.length)),
    list: new Intl.ListFormat(i18n.resolvedLanguage, { type: "conjunction" }).format(list.map(String)),
  });
}

/** "About a minute left" · "Almost done" — rounded, never a countdown (as in processing). */
function useLeft(remaining: number) {
  const { t } = useTranslation();
  return remaining >= 30 ? t("result.left.minute") : t("result.left.less");
}

type Rest = Omit<ResultViewProps, "videoRef">;

export function ResultView({ videoRef, ...r }: ResultViewProps) {
  const { t } = useTranslation();
  const ready = r.phase === "ready";
  const screenRef = useRef<HTMLDivElement>(null);
  const fullscreen = useFullscreen(screenRef, videoRef);
  const { playing } = usePlayback(videoRef);
  usePlayerKeys(videoRef, fullscreen, ready && !r.chooser);
  const fmt = r.downloadFormat;

  const openChooser = () => {
    const v = videoRef.current;
    v?.pause();
    r.onOpenChooser(v?.currentTime ?? 0);
  };
  const switchToNew = () => {
    r.onSwitch();
    // the button that was pressed disappears: focus goes to Play
    window.setTimeout(() => screenRef.current?.querySelector<HTMLElement>('[data-testid="player-controls"] button')?.focus(), 0);
  };

  return (
    <>
      <Container className={s.page}>
        <div
          className={s.column}
          data-testid="result"
          data-phase={r.phase}
          data-shown={r.shown}
          data-newer={r.newer?.status ?? "none"}
        >
          <Stack gap={24}>
            <PageHeader
              title={<span className={s.name}>{r.name}</span>}
              description={<Status r={r} plain={fmt !== null} />}
              actions={<HeaderAction r={r} onSwitch={switchToNew} />}
            />
            <Card padding="none" className={s.card} data-testid="result-card">
              <PlayerScreen
                screenRef={screenRef}
                videoRef={videoRef}
                fullscreen={fullscreen}
                playing={playing}
                disabled={!ready}
                className={s.screen}
                data-testid="result-screen"
                controls={ready ? <PlayerControls videoRef={videoRef} fullscreen={fullscreen} className={s.controls} knownDuration={r.lengthS} /> : undefined}
              >
                <div className={s.stage} data-clip={r.shape ?? "scope"} data-lit={ready || undefined} data-testid="result-stage">
                  <VideoStage
                    src={r.videoSrc}
                    ratio={STAGE_RATIO}
                    maxHeight="var(--video-h)"
                    videoRef={videoRef}
                    label={ready ? t("result.video", { n: r.shown }) : t("result.videoWaiting")}
                  >
                    <span className={s.dim} aria-hidden="true" />
                  </VideoStage>
                </div>
              </PlayerScreen>

              {!ready && (
                <CardBody className={s.middle}>
                  {r.phase === "assembling" ? <Assembling r={r} /> : <Failed />}
                </CardBody>
              )}

              <CardFooter className={s.footer}>
                {r.phase === "assembling" ? (
                  <>
                    <RerecordButton reason={t("result.rerecordLater")} />
                    {r.notify && <NotifyControl {...r.notify} />}
                  </>
                ) : r.phase === "failed" ? (
                  <>
                    <span aria-hidden="true" />
                    <Button size="lg" icon={<Icon name="retry" />} onClick={r.onRetry} data-testid="result-retry">
                      {t("result.retry")}
                    </Button>
                  </>
                ) : (
                  <>
                    <RerecordButton
                      onClick={openChooser}
                      reason={r.newer?.status === "assembling" ? t("result.rerecordLaterVersion", { n: r.newer.n }) : undefined}
                    />
                    <span className={s.download}>
                      {fmt && (
                        <Text size="sm" tone="muted" id="result-format">{fmt === "webm" ? "WebM" : "MP4"}</Text>
                      )}
                      <Button
                        size="lg"
                        icon={<Icon name="download" />}
                        onClick={r.onDownload}
                        aria-describedby={fmt ? "result-format" : undefined}
                        data-testid="result-download"
                      >
                        {fmt
                          ? (r.newer?.status === "ready" ? t("features.recordingFlowMock.result.downloadVersion", { n: r.shown }) : t("features.recordingFlowMock.result.download"))
                          : (r.newer?.status === "ready" ? t("result.downloadVersion", { n: r.shown }) : t("result.download"))}
                      </Button>
                    </span>
                  </>
                )}
              </CardFooter>
            </Card>
            {r.phase === "assembling" && (
              <Text size="sm" tone="muted" className={s.leave}>{t("result.leave")}</Text>
            )}
          </Stack>
        </div>
        <span className="sr-only" role="status">{ready && !r.newer && r.shown === 1 && r.announceReady ? t("result.readyNow") : ""}</span>
      </Container>
      <Chooser r={r} />
    </>
  );
}

/**
 * The status line under the title — the one place that talks about versions (concept C): what is on screen, what is
 * being assembled, what is ready, what failed. Spoken politely when it changes.
 */
function Status({ r, plain }: { r: Rest; plain: boolean }) {
  const { t } = useTranslation();
  const turnList = useTurnList();
  const nv = r.newer;
  const ready = r.phase === "ready";
  const text = !ready ? t("result.turnsRecorded", { count: r.total })
    : nv?.status === "assembling" ? t("result.newVersion.assembling", { n: nv.n, ...turnList(nv.turns) })
      : nv?.status === "ready" ? t("result.newVersion.ready", { n: nv.n, ...turnList(nv.turns) })
        : nv?.status === "failed" ? t("result.newVersion.failed", { n: nv.n, old: r.shown })
          : r.shown > 1 ? t(plain ? "features.recordingFlowMock.result.metaVersion" : "result.metaVersion", { n: r.shown, ...turnList(r.shownTurns) })
            : t(plain ? "features.recordingFlowMock.result.meta" : "result.meta", { count: r.total });
  return (
    <span className={s.status} role="status" aria-live="polite" data-testid="result-status" data-status={ready ? nv?.status ?? "current" : r.phase}>
      {ready && nv?.status === "assembling" && <Spinner size={14} />}
      {ready && nv?.status === "ready" && <span className={s.ok}><Icon name="success" size={14} /></span>}
      {ready && nv?.status === "failed" && <span className={s.warn}><Icon name="warning" size={14} /></span>}
      <span>{text}</span>
    </span>
  );
}

/**
 * "Re-record a turn" — disabled while a version is assembling (owner answer 5), with the reason written next to it
 * (not only in a tooltip) and linked as its description.
 */
function RerecordButton({ onClick, reason }: { onClick?: () => void; reason?: string }) {
  const { t } = useTranslation();
  return (
    <div className={s.rerecord}>
      <Button
        variant="secondary"
        size="lg"
        icon={<Icon name="record" />}
        onClick={onClick}
        disabled={Boolean(reason)}
        aria-describedby={reason ? "result-rerecord-reason" : undefined}
        data-testid="result-choose"
      >
        {t("result.chooser.open")}
      </Button>
      {reason && (
        <Text size="sm" tone="text" id="result-rerecord-reason" className={s.reason}>
          <span data-testid="result-rerecord-reason">{reason}</span>
        </Text>
      )}
    </div>
  );
}

/** Beside the title: "Watch version 2" when it is ready, "Try again" when it failed (both free); nothing otherwise. */
function HeaderAction({ r, onSwitch }: { r: Rest; onSwitch: () => void }) {
  const { t } = useTranslation();
  const nv = r.newer;
  if (r.phase !== "ready" || !nv || nv.status === "assembling") return null;
  return nv.status === "ready" ? (
    <Button variant="secondary" size="lg" icon={<Icon name="play" />} onClick={onSwitch} data-testid="result-switch" className={s.headerAction}>
      {t("result.newVersion.watch", { n: nv.n })}
    </Button>
  ) : (
    <Button variant="secondary" size="lg" icon={<Icon name="retry" />} onClick={r.onRetryNew} data-testid="result-retry-new" className={s.headerAction}>
      {t("result.retry")}
    </Button>
  );
}

/** Assembling: the processing language — the waiting pill names the one step, one segment fills, a rough estimate. */
function Assembling({ r }: { r: Rest }) {
  const { t } = useTranslation();
  const left = useLeft(r.remainingSeconds);
  return (
    <StepProgress
      data-testid="result-assembling"
      label={t("result.assembling.label")}
      steps={[t("result.assembling.step")]}
      current={1}
      fraction={r.progress}
      waitingLabel={t("result.assembling.step")}
      doneLabel={t("result.assembling.done")}
      meta={left}
      valueText={t("result.assembling.step")}
    />
  );
}

/** The first assembly failed (after the server's own retry): a service problem — the takes are safe, Try again is free. */
function Failed() {
  const { t } = useTranslation();
  return (
    <div className={s.ending} role="alert" data-testid="result-failed">
      <IconTile icon="error" tone="danger" size={40} />
      <div className={s.endingText}>
        <h2 className={s.endingTitle}>{t("result.failed.title")}</h2>
        <Text tone="text">{t("result.failed.text")}</Text>
      </div>
    </div>
  );
}

/** "Which turn do you want to re-record?" — the turn under the playhead is selected; change it by its text. */
function Chooser({ r }: { r: Rest }) {
  const { t } = useTranslation();
  return (
    <Dialog
      open={r.chooser}
      onClose={r.onCloseChooser}
      title={t("result.chooser.title")}
      data-testid="result-chooser"
      footer={
        <>
          <Button variant="secondary" onClick={r.onCloseChooser}>{t("result.chooser.cancel")}</Button>
          <Button icon={<Icon name="record" />} onClick={r.onRerecord} data-testid="result-chooser-go">
            {t("result.chooser.go", { n: r.pick + 1 })}
          </Button>
        </>
      }
    >
      <Stack gap={12}>
        <Text size="sm" tone="text">
          {t("result.chooser.hint")}
        </Text>
        <RadioGroup
          className={s.turnList}
          legend={<span className="sr-only">{t("result.chooser.legend")}</span>}
          value={String(r.pick)}
          onChange={(v) => r.onPick(Number(v))}
          options={r.turns.map((tn, k) => ({
            value: String(k),
            label: `${k + 1}. ${tn.text}`,
            description: `${formatTime(tn.start)} – ${formatTime(tn.end)}`,
          }))}
        />
      </Stack>
    </Dialog>
  );
}
