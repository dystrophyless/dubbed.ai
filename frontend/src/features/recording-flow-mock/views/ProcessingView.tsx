import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/icons";
import { Container, Stack } from "@/components/layout";
import { VideoStage, formatTime } from "@/components/media";
import { Button, Card, CardBody, CardFooter, Dialog, IconTile, PageHeader, StepProgress, Text, TextLink } from "@/components/ui";
import type { ClipShape } from "./NewDubView";
import { NotifyControl, type NotifyProps } from "./NotifyControl";
import s from "./processing.module.css";

/*
 * Processing (S2) — the approved "scene, waiting" design, presentational. The page container supplies the shell and the
 * project status; the prototype supplies a demo clock. Brief: design-system/processing-brief.md.
 */
export type ProcessingPhase = "queued" | "running" | "ready" | "no-dialogue" | "failed";
export const PROCESSING_STEPS = 3;
const STAGE_RATIO = 960 / 408;

export type ProcessingViewProps = {
  phase: ProcessingPhase;
  /** step in progress, 0 while queued */
  current: number;
  /** progress inside the current step, 0..1 */
  fraction: number;
  /** rough time left, seconds (shown rounded, never a countdown) */
  remainingSeconds: number;
  turnsFound: number;
  /** credits reserved (running) or charged (ready / no dialogue) */
  cost: number;
  name: string;
  /** the section, seconds in the source video */
  from: number;
  to: number;
  videoSrc: string;
  /** where the first frame is taken in `videoSrc` (prototype maps the section start into its short clip) */
  firstFrameAt?: number;
  shape?: ClipShape;
  /** "Ready — opening the studio" only when the studio opens by itself */
  opening: boolean;
  /** cancel dialog: finished steps, the credits charged now, credits that go back */
  cancel: { open: boolean; stepsDone: number; charge: number; back: number };
  deleteOpen: boolean;
  busy: boolean;
  notify: NotifyProps | null;
  projectsHref: string;
  onOpenCancel: () => void;
  onCloseCancel: () => void;
  onConfirmCancel: () => void;
  onOpenDelete: () => void;
  onCloseDelete: () => void;
  onConfirmDelete: () => void;
  onRetry: () => void;
  onOpenStudio: () => void;
  onTryAnother: () => void;
};

/** "About 2 min left" · "About a minute left" · "Almost done" — rounded to minutes, never a countdown (owner answer 4). */
function useLeft(remaining: number) {
  const { t } = useTranslation();
  if (remaining >= 90) return t("processing.left.min", { count: Math.round(remaining / 60) });
  if (remaining >= 40) return t("processing.left.minute");
  return t("processing.left.less");
}

export function ProcessingView(pr: ProcessingViewProps) {
  const { t } = useTranslation();
  const seconds = Math.max(1, Math.round(pr.to - pr.from));
  return (
    <>
      <Container className={s.page}>
        <div className={s.column} data-testid="processing" data-phase={pr.phase}>
          <Stack gap={24}>
            <PageHeader
              title={<span className={s.name}>{pr.name}</span>}
              description={t("processing.section", { from: formatTime(pr.from), to: formatTime(pr.to), seconds })}
            />
            <ProcessingCard pr={pr} />
            <LeaveNote pr={pr} />
          </Stack>
        </div>
      </Container>
      <Dialogs pr={pr} />
    </>
  );
}

/*
 * One card that keeps its shape in every state: the stage (2.35:1, the section's first frame, dimmed until ready) ·
 * the status (StepProgress + "N turns found so far", or the ending's message) · the footer (the reserve + Cancel, or the
 * one primary action of the state).
 */
function ProcessingCard({ pr }: { pr: ProcessingViewProps }) {
  const { t } = useTranslation();
  const left = useLeft(pr.remainingSeconds);
  const steps = [t("processing.steps.s1"), t("processing.steps.s2"), t("processing.steps.s3")];
  const isEnd = pr.phase === "no-dialogue" || pr.phase === "failed";
  const ready = pr.phase === "ready";
  const [src] = useState(() => `${pr.videoSrc}#t=${pr.firstFrameAt ?? pr.from}`);
  // waiting in the queue: no time at all (owner answer 4) — the meta line stays reserved so nothing moves
  const meta = ready
    ? t("processing.status.allDone")
    : pr.phase === "queued" ? undefined : `${t("processing.status.step", { n: pr.current })} · ${left}`;
  const found = ready
    ? t("processing.found.ready", { count: pr.turnsFound })
    : pr.current >= 3 ? t("processing.found.total", { count: pr.turnsFound })
      : pr.turnsFound > 0 ? t("processing.found.soFar", { count: pr.turnsFound }) : "";
  return (
    <Card padding="none" className={s.card} data-testid="processing-card">
      <div className={s.stage} data-clip={pr.shape ?? "scope"} data-lit={ready || undefined} data-testid="processing-stage">
        <VideoStage src={src} ratio={STAGE_RATIO} maxHeight="var(--video-h)" muted label={t("processing.video")}>
          <span className={s.dim} aria-hidden="true" />
        </VideoStage>
      </div>

      <CardBody className={s.body}>
        {isEnd ? (
          <Ending pr={pr} />
        ) : (
          <Stack gap={8}>
            <StepProgress
              data-testid="processing-progress"
              label={t("processing.progress")}
              steps={steps}
              current={pr.current}
              fraction={pr.fraction}
              waitingLabel={t("processing.status.queued")}
              done={ready}
              doneLabel={pr.opening ? t("processing.status.opening") : t("processing.status.ready")}
              meta={meta}
              valueText={
                ready ? t("processing.status.ready")
                  : pr.phase === "queued" ? t("processing.status.queued")
                    : t("processing.status.stepText", { n: pr.current, name: steps[pr.current - 1] })
              }
            />
            {/* the line is always there (empty until step 2), so nothing below it moves */}
            <Text tone="muted" tabular className={s.found} as="p">
              <span data-testid="processing-found">{found}</span>
            </Text>
          </Stack>
        )}
      </CardBody>

      <CardFooter className={s.footer}>
        {pr.phase === "no-dialogue" ? (
          <>
            <Button variant="secondary" size="lg" icon={<Icon name="delete" />} onClick={pr.onOpenDelete}>{t("processing.delete")}</Button>
            <Button size="lg" icon={<Icon name="upload" />} onClick={pr.onTryAnother} data-testid="processing-primary">{t("processing.none.another")}</Button>
          </>
        ) : pr.phase === "failed" ? (
          <>
            <Button variant="secondary" size="lg" icon={<Icon name="delete" />} onClick={pr.onOpenDelete}>{t("processing.delete")}</Button>
            <Button size="lg" icon={<Icon name="retry" />} onClick={pr.onRetry} data-testid="processing-primary">{t("processing.failed.retry")}</Button>
          </>
        ) : ready ? (
          <>
            <Text tone="muted" tabular className={s.money}>{t("processing.money.charged", { count: pr.cost })}</Text>
            <Button size="lg" icon={<Icon name="record" />} onClick={pr.onOpenStudio} data-testid="processing-primary">{t("processing.openStudio")}</Button>
          </>
        ) : (
          <>
            <Text tone="muted" tabular className={s.money}>{t("processing.money.reserved", { count: pr.cost })}</Text>
            <Button variant="secondary" size="lg" icon={<Icon name="close" />} onClick={pr.onOpenCancel} data-testid="processing-cancel">
              {t("processing.cancel")}
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}

/** The two endings that are not ready — in the status area, under the same stage. */
function Ending({ pr }: { pr: ProcessingViewProps }) {
  const { t } = useTranslation();
  const none = pr.phase === "no-dialogue";
  return (
    <div className={s.ending} role={none ? "status" : "alert"} data-testid={none ? "processing-no-dialogue" : "processing-failed"}>
      <IconTile icon={none ? "scene" : "error"} tone={none ? "neutral" : "danger"} size={40} />
      <div className={s.endingText}>
        <h2 className={s.endingTitle}>{none ? t("processing.none.title") : t("processing.failed.title")}</h2>
        <Text tone="text">{none ? t("processing.none.text", { count: pr.cost }) : t("processing.failed.text", { count: pr.cost })}</Text>
      </div>
    </div>
  );
}

/**
 * Under the card, only while there is a wait: "You can leave this page — …" and the opt-in "Notify me when it's ready"
 * (owner answer 7). Without the Notification API the control is not shown (the in-app toast still works).
 */
function LeaveNote({ pr }: { pr: ProcessingViewProps }) {
  const { t } = useTranslation();
  const waiting = pr.phase === "queued" || pr.phase === "running";
  return (
    <div className={s.leave} data-testid="processing-leave">
      {waiting && (
        <>
          <Text size="sm" tone="muted">
            {t("processing.leave")} <TextLink to={pr.projectsHref}>{t("processing.leaveLink")}</TextLink>
            {t("processing.leaveEnd")}
          </Text>
          {pr.notify && <NotifyControl {...pr.notify} />}
        </>
      )}
    </div>
  );
}

function Dialogs({ pr }: { pr: ProcessingViewProps }) {
  const { t } = useTranslation();
  const { cancel } = pr;
  return (
    <>
      <Dialog
        open={cancel.open}
        onClose={pr.onCloseCancel}
        role="alertdialog"
        data-testid="processing-cancel-dialog"
        title={t("processing.dialog.title", { name: pr.name })}
        footer={
          <>
            <Button variant="secondary" onClick={pr.onCloseCancel} disabled={pr.busy}>{t("processing.dialog.keep")}</Button>
            <Button variant="destructive" onClick={pr.onConfirmCancel} loading={pr.busy}>{t("processing.cancel")}</Button>
          </>
        }
      >
        <Stack gap={8}>
          {cancel.charge > 0 ? (
            <>
              <Text tone="strong" medium tabular>
                {`${t("processing.dialog.done", { count: cancel.stepsDone })} — ${t("processing.dialog.charged", { count: cancel.charge })}`}
              </Text>
              <Text tabular>{`${t("processing.dialog.back", { count: cancel.back })} ${t("processing.dialog.removed")}`}</Text>
            </>
          ) : (
            <>
              <Text tone="strong" medium>
                {pr.phase === "queued" ? t("processing.dialog.notStarted") : t("processing.dialog.noneDone")}
              </Text>
              <Text tabular>{`${t("processing.dialog.allBack", { count: pr.cost })} ${t("processing.dialog.removed")}`}</Text>
            </>
          )}
        </Stack>
      </Dialog>

      <Dialog
        open={pr.deleteOpen}
        onClose={pr.onCloseDelete}
        role="alertdialog"
        data-testid="processing-delete-dialog"
        title={t("processing.deleteDialog.title", { name: pr.name })}
        footer={
          <>
            <Button variant="secondary" onClick={pr.onCloseDelete} disabled={pr.busy}>{t("processing.deleteDialog.keep")}</Button>
            <Button variant="destructive" onClick={pr.onConfirmDelete} loading={pr.busy}>{t("processing.delete")}</Button>
          </>
        }
      >
        <Text>{pr.phase === "failed" ? t("processing.deleteDialog.failed") : t("processing.deleteDialog.none")}</Text>
      </Dialog>
    </>
  );
}
