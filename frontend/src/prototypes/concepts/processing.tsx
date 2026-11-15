import { useTranslation } from "react-i18next";
import { Icon } from "@/components/icons";
import { Cluster, Container, Stack } from "@/components/layout";
import {
  Card, CardBody, CardFooter, CardHeader, IconTile, List, ListItem, PageHeader, ProgressBar, Spinner, Tag, Text, ThinkingLoader,
} from "@/components/ui";
import {
  CancelButton, EndState, LeaveNote, OpenStudioButton, ProcessingPage, STEPS, useLeft, useStepName, type Processing, type StepState,
} from "./processing-shared";
import s from "./processing.module.css";

/* Phase 4 — processing concepts (low-fi). See processing-shared.tsx and design-system/processing-brief.md. */

const STEP_IDS = [1, 2, 3] as const;

function Title() {
  const { t } = useTranslation();
  return <PageHeader title={t("concepts.processing.name")} description={t("concepts.processing.section")} />;
}

/** "Ready — opening the studio" in a live run; a frozen review state says only "Your scene is ready". */
function useReadyLabel(pr: Processing) {
  const { t } = useTranslation();
  return pr.live ? t("concepts.processing.status.opening") : t("concepts.processing.status.ready");
}

function isEnd(pr: Processing) {
  return pr.phase === "no-dialogue" || pr.phase === "failed";
}

/* ------------------------------------------------------------------------------------------------------------------ */

/** A · Checklist — one card: the three named steps tick off one by one; the cancel price is always written under them. */
export function ChecklistConcept() {
  return <ProcessingPage id="checklist">{(pr) => <Checklist pr={pr} />}</ProcessingPage>;
}

function StepMark({ state, n }: { state: StepState; n: number }) {
  if (state === "done") return <IconTile icon="check" tone="success" />;
  if (state === "now") return <span className={s.mark} data-state="now"><Spinner size={16} /></span>;
  return <span className={s.mark} aria-hidden="true">{n}</span>;
}

function Checklist({ pr }: { pr: Processing }) {
  const { t } = useTranslation();
  const left = useLeft(pr);
  const stepName = useStepName();
  const ready = useReadyLabel(pr);
  const tagTone = { done: "success", now: "accent", next: "neutral" } as const;
  return (
    <Container width="narrow" className={s.page}>
      <Stack gap={24}>
        <Title />
        <Card padding="none" data-testid="processing-card">
          {isEnd(pr) ? (
            <EndState pr={pr} />
          ) : (
            <>
              <CardHeader
                title={pr.phase === "ready" ? ready : pr.phase === "queued" ? t("concepts.processing.status.queued") : t("concepts.processing.status.preparing")}
                actions={pr.phase === "ready" ? undefined : <Text size="sm" tone="muted" tabular>{left}</Text>}
              />
              <div role="status" aria-live="polite" className="sr-only">
                {pr.phase === "running" ? t("concepts.processing.status.step", { n: pr.step }) : pr.phase === "ready" ? ready : t("concepts.processing.status.queued")}
              </div>
              <List dividers={false} label={t("concepts.processing.stepsLabel")}>
                {STEP_IDS.map((i) => {
                  const st = pr.stepState(i);
                  return (
                    <ListItem
                      key={i}
                      data-testid={`processing-step-${i}`}
                      leading={<StepMark state={st} n={i} />}
                      title={stepName(i)}
                      trailing={<Tag tone={tagTone[st]} size="sm">{t(`concepts.processing.stepState.${st}`)}</Tag>}
                    />
                  );
                })}
              </List>
              <CardFooter className={s.footer}>
                {pr.phase === "ready" ? (
                  <>
                    <Text tone="muted">{t("concepts.processing.money.charged", { count: pr.cost })}</Text>
                    <OpenStudioButton pr={pr} />
                  </>
                ) : (
                  <>
                    <Stack gap={2}>
                      <Text tabular>{t("concepts.processing.money.reserved", { count: pr.cost })}</Text>
                      <Text size="sm" tone="muted" tabular>
                        {pr.charge > 0
                          ? t("concepts.processing.money.cancelPaid", { count: pr.charge })
                          : t("concepts.processing.money.cancelFree")}
                      </Text>
                    </Stack>
                    <CancelButton pr={pr} />
                  </>
                )}
              </CardFooter>
            </>
          )}
        </Card>
        <LeaveNote pr={pr} />
      </Stack>
    </Container>
  );
}

/* ------------------------------------------------------------------------------------------------------------------ */

/** B · The scene, waiting — the stage where the studio will open, one thin bar under it and one status line. */
export function StageConcept() {
  return <ProcessingPage id="stage">{(pr) => <SceneWaiting pr={pr} />}</ProcessingPage>;
}

function SceneWaiting({ pr }: { pr: Processing }) {
  const { t } = useTranslation();
  const left = useLeft(pr);
  const stepName = useStepName();
  const ready = useReadyLabel(pr);
  const headline = pr.phase === "ready" ? ready : pr.phase === "queued" ? t("concepts.processing.status.queued") : stepName(pr.step);
  const sub = pr.phase === "ready"
    ? t("concepts.processing.money.charged", { count: pr.cost })
    : pr.phase === "queued" ? left : `${t("concepts.processing.status.stepShort", { n: pr.step })} · ${left}`;
  return (
    <Container className={s.page}>
      <div className={s.bColumn}>
        <Stack gap={24}>
          <Title />
          <Card padding="none" className={s.bCard} data-testid="processing-card">
            {isEnd(pr) ? (
              <EndState pr={pr} />
            ) : (
              <>
                <div className={s.bStage} data-phase={pr.phase} aria-hidden="true">
                  {pr.phase === "ready" ? (
                    <span className={s.bReady}><Icon name="success" size={24} />{t("concepts.processing.stage.ready")}</span>
                  ) : (
                    <span className={s.bLabel}>{t("concepts.processing.stage.label")}</span>
                  )}
                </div>
                <ProgressBar
                  hideLabel
                  label={t("concepts.processing.progressLabel")}
                  value={pr.phase === "queued" ? undefined : pr.percent}
                  valueText={pr.phase === "queued" ? undefined : `${pr.percent}%`}
                />
                <CardBody>
                  <div className={s.bStatus} role="status" aria-live="polite">
                    <h2 className={s.bHeadline}>{headline}</h2>
                    <Text tone="muted" tabular>{sub}</Text>
                    {pr.turnsFound > 0 && (
                      <Text size="sm" tone="muted" tabular>{t("concepts.processing.stage.found", { count: pr.turnsFound })}</Text>
                    )}
                  </div>
                </CardBody>
                <CardFooter className={s.footer}>
                  {pr.phase === "ready" ? (
                    <>
                      <span />
                      <OpenStudioButton pr={pr} />
                    </>
                  ) : (
                    <>
                      <Text tone="muted" tabular>{t("concepts.processing.money.reservedLong", { count: pr.cost })}</Text>
                      <CancelButton pr={pr} variant="ghost" />
                    </>
                  )}
                </CardFooter>
              </>
            )}
          </Card>
          <LeaveNote pr={pr} />
        </Stack>
      </div>
    </Container>
  );
}

/* ------------------------------------------------------------------------------------------------------------------ */

/** C · Get ready while you wait — a compact status strip on top; the page teaches how recording works meanwhile. */
export function TipsConcept() {
  return <ProcessingPage id="tips">{(pr) => <Tips pr={pr} />}</ProcessingPage>;
}

const TIPS = [
  { id: "headphones", icon: "headphones" },
  { id: "noCountdown", icon: "record" },
  { id: "original", icon: "play" },
  { id: "next", icon: "next" },
] as const;

function Tips({ pr }: { pr: Processing }) {
  const { t } = useTranslation();
  const left = useLeft(pr);
  const stepName = useStepName();
  const ready = useReadyLabel(pr);
  const phases = [t("concepts.processing.status.queued"), stepName(1), stepName(2), stepName(3)];
  const meta = pr.phase === "queued"
    ? left
    : `${t("concepts.processing.status.stepShort", { n: pr.step })} · ${left}`;
  return (
    <Container width="narrow" className={s.page}>
      <Stack gap={24}>
        <Title />
        <Card padding="none" data-testid="processing-card">
          {isEnd(pr) ? (
            <EndState pr={pr} />
          ) : (
            <>
              <CardBody>
                <Stack gap={12}>
                  <Cluster gap={12} justify="between">
                    <ThinkingLoader
                      phases={phases}
                      phase={pr.phase === "queued" ? 0 : pr.step}
                      done={pr.phase === "ready"}
                      doneLabel={ready}
                    />
                    {pr.phase !== "ready" && <Text size="sm" tone="muted" tabular>{meta}</Text>}
                  </Cluster>
                  <div className={s.segments}>
                    {STEP_IDS.map((i) => (
                      <ProgressBar
                        key={i}
                        hideLabel
                        label={t("concepts.processing.segment", { n: i, total: STEPS, name: stepName(i) })}
                        value={Math.round(pr.stepFraction(i) * 100)}
                      />
                    ))}
                  </div>
                </Stack>
              </CardBody>
              <CardFooter className={s.footer}>
                {pr.phase === "ready" ? (
                  <>
                    <Text tone="muted">{t("concepts.processing.money.charged", { count: pr.cost })}</Text>
                    <OpenStudioButton pr={pr} />
                  </>
                ) : (
                  <>
                    <Text tone="muted" tabular>{t("concepts.processing.money.reservedLong", { count: pr.cost })}</Text>
                    <CancelButton pr={pr} />
                  </>
                )}
              </CardFooter>
            </>
          )}
        </Card>

        {!isEnd(pr) && (
          <Card padding="none" data-testid="processing-tips">
            <CardHeader title={t("concepts.processing.tips.title")} />
            <List dividers={false}>
              {TIPS.map((tip) => (
                <ListItem
                  key={tip.id}
                  leading={<IconTile icon={tip.icon} tone={tip.id === "noCountdown" ? "danger" : "accent"} />}
                  title={t(`concepts.processing.tips.${tip.id}.title`)}
                  subtitle={t(`concepts.processing.tips.${tip.id}.text`)}
                />
              ))}
            </List>
          </Card>
        )}
        <LeaveNote pr={pr} />
      </Stack>
    </Container>
  );
}
