import { useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/icons";
import { Container, Stack } from "@/components/layout";
import { Transport, TurnLine, formatTime } from "@/components/media";
import {
  Button, Card, CardBody, CardFooter, CardHeader, Dialog, PageHeader, RadioGroup, SegmentedControl, Spinner, Text, Tooltip,
} from "@/components/ui";
import {
  Assembling, CLIP_SECONDS, DownloadButton, Failed, ResultPage, RetryButton, Stage, TOTAL_TURNS, TURNS, rangeOf, useLine,
  useMeta, type Result,
} from "./result-shared";
import s from "./result.module.css";

/* Phase 4 — result concepts (low-fi). See result-shared.tsx and design-system/result-brief.md. */

/** The card's middle: assembling progress, the failure, or the player's own controls. */
function CardMiddle({ r, player }: { r: Result; player: ReactNode }) {
  if (r.phase === "assembling") return <Assembling r={r} progress={r.progress} />;
  if (r.phase === "failed") return <Failed />;
  return <>{player}</>;
}

/** Footer while there is no result to keep yet (assembling / failed) — the same in every concept. */
function WaitFooter({ r }: { r: Result }) {
  const { t } = useTranslation();
  if (r.phase === "failed") {
    return (
      <>
        <Text tone="muted" className={s.meta}>{t("concepts.result.failed.safe")}</Text>
        <RetryButton onClick={r.retry} />
      </>
    );
  }
  return <Text tone="muted" className={s.meta}>{t("concepts.result.assembling.leave")}</Text>;
}

/**
 * The new version, said in one line with its one action (A and B put it in the card footer, next to Download):
 * assembling → "keep watching this one"; ready → Switch; failed → the current version stays, Try again.
 */
function NewVersionNote({ r, keepOld }: { r: Result; keepOld: boolean }) {
  const { t } = useTranslation();
  const meta = useMeta(r);
  const nv = r.newer;
  if (!nv) return <Text tone="muted" tabular className={s.meta}>{meta}</Text>;
  return (
    <div className={s.notice} role="status" aria-live="polite" data-testid="result-new-version" data-status={nv.status}>
      {nv.status === "assembling" && (
        <>
          <Spinner size={16} />
          <Text tone="text">{t("concepts.result.newVersion.assembling", { n: nv.n, turn: nv.turn })}</Text>
        </>
      )}
      {nv.status === "ready" && (
        <>
          <span className={s.ok}><Icon name="success" /></span>
          <Text tone="text">{t("concepts.result.newVersion.ready", { n: nv.n, turn: nv.turn })}</Text>
          {!keepOld && (
            <Button variant="secondary" size="lg" icon={<Icon name="forward" />} onClick={() => r.switchTo(nv.n, false)} data-testid="result-switch">
              {t("concepts.result.newVersion.switch", { n: nv.n })}
            </Button>
          )}
        </>
      )}
      {nv.status === "failed" && (
        <>
          <span className={s.warn}><Icon name="warning" /></span>
          <Text tone="text">{t("concepts.result.newVersion.failed", { n: nv.n, old: r.shown })}</Text>
          <Button variant="secondary" size="lg" icon={<Icon name="retry" />} onClick={r.retryNew} data-testid="result-retry-new">
            {t("concepts.result.retry")}
          </Button>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------------------------ */

/** A · The script — every turn's text beside the player; the line playing now is highlighted; each line has Re-record. */
export function ScriptConcept() {
  return <ResultPage id="script">{(r) => <Script r={r} />}</ResultPage>;
}

function Script({ r }: { r: Result }) {
  const { t } = useTranslation();
  const line = useLine();
  const ready = r.phase === "ready";
  return (
    <Container className={s.page} data-layout="script">
      <Stack gap={24}>
        <PageHeader title={r.name} description={t("concepts.result.turnsRecorded", { count: TOTAL_TURNS })} />
        <div className={s.aGrid}>
          <Card padding="none" className={s.card} data-testid="result-card">
            <Stage r={r} />
            <CardBody className={s.body}>
              <CardMiddle r={r} player={<Transport videoRef={r.videoRef} />} />
            </CardBody>
            <CardFooter className={s.footer}>
              {ready ? (
                <>
                  <NewVersionNote r={r} keepOld={false} />
                  <DownloadButton r={r} />
                </>
              ) : (
                <WaitFooter r={r} />
              )}
            </CardFooter>
          </Card>

          <div className={s.aAside}>
            <Card padding="none" className={s.aScript} data-testid="result-turns">
              <CardHeader
                title={t("concepts.result.script.title")}
                actions={<Text size="sm" tone="muted">{t("concepts.result.script.hint")}</Text>}
              />
              <ol className={s.aList} aria-label={t("concepts.result.script.title")}>
                {TURNS.map((tn, i) => {
                  const active = ready && i === r.current;
                  return (
                    <li key={i} className={s.aRow} data-active={active || undefined} data-testid={`result-turn-${i + 1}`}>
                      <button
                        type="button"
                        className={s.aLine}
                        onClick={() => r.seek(tn.start)}
                        disabled={!ready}
                        title={t("concepts.result.playTurn", { n: i + 1 })}
                        aria-current={active ? "true" : undefined}
                      >
                        <span className={s.aNum} aria-hidden="true">{i + 1}</span>
                        <span className={s.aText}>{line(i)}</span>
                        <span className={s.aTime}>{formatTime(tn.start)}</span>
                      </button>
                      <Tooltip content={t("concepts.result.rerecordTurn", { n: i + 1 })}>
                        <Button
                          variant="ghost"
                          icon={<Icon name="record" />}
                          aria-label={t("concepts.result.rerecordTurn", { n: i + 1 })}
                          onClick={() => r.rerecord(i)}
                        >
                          <span className={s.aRerecordLabel}>{t("concepts.result.rerecord")}</span>
                        </Button>
                      </Tooltip>
                    </li>
                  );
                })}
              </ol>
            </Card>
          </div>
        </div>
      </Stack>
    </Container>
  );
}

/* ------------------------------------------------------------------------------------------------------------------ */

/** B · The strip — the scene's turns as blocks on the scrubber; the chosen turn's text and Re-record sit under it. */
export function StripConcept() {
  return <ResultPage id="strip">{(r) => <Strip r={r} />}</ResultPage>;
}

function VersionTabs({ r }: { r: Result }) {
  const { t } = useTranslation();
  const nv = r.newer;
  const show = r.kept.length > 1 || nv;
  if (!show) return null;
  const options: { value: string; label: string; disabled?: boolean }[] = r.kept.map((n) => ({
    value: String(n),
    label: t("concepts.result.versions.v", { n }),
  }));
  if (nv) {
    options.push({
      value: String(nv.n),
      label:
        nv.status === "assembling" ? t("concepts.result.versions.assembling", { n: nv.n })
          : nv.status === "failed" ? t("concepts.result.versions.failed", { n: nv.n })
            : t("concepts.result.versions.fresh", { n: nv.n }),
      disabled: nv.status !== "ready",
    });
  }
  return (
    <div data-testid="result-versions">
      <SegmentedControl
        variant="tray"
        aria-label={t("concepts.result.versions.label")}
        options={options}
        value={String(r.shown)}
        onChange={(v) => r.switchTo(Number(v), true)}
      />
    </div>
  );
}

function Strip({ r }: { r: Result }) {
  const { t } = useTranslation();
  const line = useLine();
  const ready = r.phase === "ready";
  const i = r.current;
  const pct = (x: number) => `${(x / CLIP_SECONDS) * 100}%`;
  const go = (k: number) => r.seek(TURNS[Math.min(TOTAL_TURNS - 1, Math.max(0, k))].start, r.playing);
  // a press on a block goes to the start of its turn; anywhere else on the strip goes to that moment
  const seekFromPointer = (e: PointerEvent<HTMLDivElement>) => {
    if (!ready) return;
    const block = (e.target as HTMLElement).dataset.turn;
    if (block) return go(Number(block) - 1);
    const box = e.currentTarget.getBoundingClientRect();
    r.seek(((e.clientX - box.left) / box.width) * CLIP_SECONDS, r.playing);
  };
  // the strip is one slider over the turns: ← / → step a turn, Home / End go to the first / last
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const to = { ArrowLeft: i - 1, ArrowDown: i - 1, ArrowRight: i + 1, ArrowUp: i + 1, Home: 0, End: TOTAL_TURNS - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    go(to);
  };
  return (
    <Container className={s.page} data-layout="strip">
      <div className={s.column}>
        <Stack gap={24}>
          <PageHeader title={r.name} description={t("concepts.result.turnsRecorded", { count: TOTAL_TURNS })} actions={<VersionTabs r={r} />} />
          <Card padding="none" className={s.card} data-testid="result-card">
            <Stage r={r} />
            <CardBody className={s.bBody}>
              <CardMiddle
                r={r}
                player={
                  <Stack gap={16}>
                    <div className={s.bPlayer}>
                      <Button
                        variant="secondary"
                        size="lg"
                        icon={<Icon name={r.playing ? "pause" : "play"} />}
                        aria-label={r.playing ? t("media.pause") : t("media.play")}
                        onClick={r.toggle}
                      />
                      <span className={s.bClock} aria-hidden="true">{`${formatTime(r.time)} / ${r.duration}`}</span>
                      <div
                        className={s.bTrack}
                        onPointerDown={seekFromPointer}
                        onKeyDown={onKey}
                        role="slider"
                        tabIndex={0}
                        aria-label={t("concepts.result.strip.label")}
                        aria-valuemin={1}
                        aria-valuemax={TOTAL_TURNS}
                        aria-valuenow={i + 1}
                        aria-valuetext={`${t("concepts.result.turnOf", { n: i + 1, total: TOTAL_TURNS })}: ${line(i)}`}
                        data-testid="result-strip"
                      >
                        {TURNS.map((tn, k) => (
                          <span
                            key={k}
                            className={s.bBlock}
                            style={{ left: pct(tn.start), width: pct(tn.end - tn.start) }}
                            data-turn={k + 1}
                            data-current={k === i || undefined}
                          />
                        ))}
                        <span className={s.bHead} style={{ left: pct(Math.min(CLIP_SECONDS, r.time)) }} aria-hidden="true" />
                      </div>
                    </div>
                    <div className={s.bTurn} data-testid="result-turn">
                      <div className={s.bTurnText}>
                        <Text size="sm" tone="muted" tabular>
                          {`${t("concepts.result.turnOf", { n: i + 1, total: TOTAL_TURNS })} · ${rangeOf(i)}`}
                        </Text>
                        <TurnLine text={line(i)} />
                      </div>
                      <div className={s.bTurnActions}>
                        <Button
                          variant="secondary"
                          size="lg"
                          icon={<Icon name="prev" />}
                          aria-label={t("concepts.result.strip.prev")}
                          disabled={i === 0}
                          onClick={() => go(i - 1)}
                        />
                        <Button
                          variant="secondary"
                          size="lg"
                          icon={<Icon name="next" />}
                          aria-label={t("concepts.result.strip.next")}
                          disabled={i === TOTAL_TURNS - 1}
                          onClick={() => go(i + 1)}
                        />
                        <Button variant="secondary" size="lg" icon={<Icon name="record" />} onClick={() => r.rerecord(i)} data-testid="result-rerecord">
                          {t("concepts.result.rerecordTurn", { n: i + 1 })}
                        </Button>
                      </div>
                    </div>
                  </Stack>
                }
              />
            </CardBody>
            <CardFooter className={s.footer}>
              {ready ? (
                <>
                  <NewVersionNote r={r} keepOld />
                  <DownloadButton r={r} />
                </>
              ) : (
                <WaitFooter r={r} />
              )}
            </CardFooter>
          </Card>
        </Stack>
      </div>
    </Container>
  );
}

/* ------------------------------------------------------------------------------------------------------------------ */

/** C · Watch, then fix — a clean watch-and-download card; "Re-record a turn" opens a chooser (the playing turn picked). */
export function ChooserConcept() {
  return <ResultPage id="chooser">{(r) => <Chooser r={r} />}</ResultPage>;
}

function Chooser({ r }: { r: Result }) {
  const { t } = useTranslation();
  const line = useLine();
  const meta = useMeta(r);
  const ready = r.phase === "ready";
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState("0");
  const nv = r.newer;
  const openChooser = () => {
    r.videoRef.current?.pause();
    setPick(String(r.current));
    setOpen(true);
  };

  // the page header carries the version: the status line, and the switch when the new version is ready
  const status = !ready ? t("concepts.result.turnsRecorded", { count: TOTAL_TURNS })
    : !nv ? meta
      : nv.status === "assembling" ? t("concepts.result.newVersion.assembling", { n: nv.n, turn: nv.turn })
        : nv.status === "ready" ? t("concepts.result.newVersion.ready", { n: nv.n, turn: nv.turn })
          : t("concepts.result.newVersion.failed", { n: nv.n, old: r.shown });
  const action = ready && nv?.status === "ready" ? (
    <Button variant="secondary" size="lg" icon={<Icon name="forward" />} onClick={() => r.switchTo(nv.n, false)} data-testid="result-switch">
      {t("concepts.result.newVersion.watch", { n: nv.n })}
    </Button>
  ) : ready && nv?.status === "failed" ? (
    <Button variant="secondary" size="lg" icon={<Icon name="retry" />} onClick={r.retryNew} data-testid="result-retry-new">
      {t("concepts.result.retry")}
    </Button>
  ) : undefined;

  return (
    <Container className={s.page} data-layout="chooser">
      <div className={s.column}>
        <Stack gap={24}>
          <PageHeader
            title={r.name}
            description={
              <span className={s.cStatus} role="status" aria-live="polite" data-testid={nv ? "result-new-version" : undefined} data-status={nv?.status}>
                {ready && nv?.status === "assembling" && <Spinner size={14} />}
                {ready && nv?.status === "ready" && <span className={s.ok}><Icon name="success" size={14} /></span>}
                {ready && nv?.status === "failed" && <span className={s.warn}><Icon name="warning" size={14} /></span>}
                <span>{status}</span>
              </span>
            }
            actions={action}
          />
          <Card padding="none" className={s.card} data-testid="result-card">
            <Stage r={r} />
            <CardBody className={s.body}>
              <CardMiddle r={r} player={<Transport videoRef={r.videoRef} />} />
            </CardBody>
            <CardFooter className={s.footer}>
              {ready ? (
                <>
                  <Button variant="secondary" size="lg" icon={<Icon name="record" />} onClick={openChooser} data-testid="result-choose">
                    {t("concepts.result.chooser.open")}
                  </Button>
                  <DownloadButton r={r} />
                </>
              ) : (
                <WaitFooter r={r} />
              )}
            </CardFooter>
          </Card>
        </Stack>
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("concepts.result.chooser.title")}
        data-testid="result-chooser"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>{t("concepts.result.chooser.cancel")}</Button>
            <Button icon={<Icon name="record" />} onClick={() => r.rerecord(Number(pick))}>
              {t("concepts.result.rerecordTurn", { n: Number(pick) + 1 })}
            </Button>
          </>
        }
      >
        <Text size="sm" tone="muted">{t("concepts.result.chooser.hint")}</Text>
        <RadioGroup
          legend={t("concepts.result.script.title")}
          value={pick}
          onChange={setPick}
          options={TURNS.map((_, k) => ({
            value: String(k),
            label: `${k + 1}. ${line(k)}`,
            description: rangeOf(k),
          }))}
        />
      </Dialog>
    </Container>
  );
}
