import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { Icon } from "@/components/icons";
import { Container, Show, Stack, StickyBar, TwoColumn } from "@/components/layout";
import { RangeSelector, formatTime } from "@/components/media";
import { Button, Card, CardBody, CardFooter, CardHeader, PageHeader, ProgressBar, Tag, Text, TextField } from "@/components/ui";
import {
  BuyButton, DURATION, LimitHint, MAX, NewDubPage, Picker, Preview, ReplaceButton, StartButton, type NewDub,
} from "./new-dub-shared";
import s from "./new-dub.module.css";

/* Phase 4 — new-dub concepts (low-fi). See new-dub-shared.tsx and design-system/new-dub-brief.md. */

function Section({ nd }: { nd: NewDub }) {
  return (
    <Stack gap={8}>
      <RangeSelector duration={nd.duration} start={nd.range[0]} end={nd.range[1]} max={MAX} onChange={nd.setRange} />
      <LimitHint nd={nd} />
    </Stack>
  );
}

function FileMeta({ nd }: { nd: NewDub }) {
  const { t } = useTranslation();
  return <Text size="sm" tone="muted" tabular>{t("concepts.newDub.fileMeta", { len: formatTime(nd.duration), size: nd.sizeMb })}</Text>;
}

/** "48 credits left after start" / "32 more credits needed" — what the button does not say. */
function CostNote({ nd }: { nd: NewDub }) {
  const { t } = useTranslation();
  return (
    <Text tone={nd.short ? "danger" : "muted"} tabular>
      {nd.short ? t("concepts.newDub.cost.missing", { count: nd.missing }) : t("concepts.newDub.cost.left", { count: nd.left })}
    </Text>
  );
}

/* ------------------------------------------------------------------------------------------------------------------ */

/** A · One card — choose → see → trim → pay, top to bottom in one card; the content swaps in place. */
export function OneCardConcept() {
  const { t } = useTranslation();
  return (
    <NewDubPage id="one-card">
      {(nd) => (
        <Container width="narrow" className={s.a}>
          <Stack gap={24}>
            <PageHeader title={t("concepts.newDub.title")} description={t("concepts.newDub.subtitle")} />
            {nd.phase !== "ready" ? (
              <Card padding="none"><Picker nd={nd} /></Card>
            ) : (
              <Card padding="none">
                <CardHeader title={nd.fileName} actions={<ReplaceButton nd={nd} />} />
                <CardBody>
                  <Stack gap={16}>
                    <Preview nd={nd} maxHeight="var(--video-h)" meta={<FileMeta nd={nd} />} />
                    <Section nd={nd} />
                  </Stack>
                </CardBody>
                <CardFooter className={s.footer}>
                  <CostNote nd={nd} />
                  <div className={s.footerActions}>
                    {nd.short && <BuyButton nd={nd} variant="secondary" />}
                    <StartButton nd={nd} />
                  </div>
                </CardFooter>
              </Card>
            )}
          </Stack>
        </Container>
      )}
    </NewDubPage>
  );
}

/* ------------------------------------------------------------------------------------------------------------------ */

/** B · Video and receipt — the video gets the room; the receipt beside it always explains the price and holds Start. */
export function ReceiptConcept() {
  const { t } = useTranslation();
  return (
    <NewDubPage id="receipt" hideCredits>
      {(nd) => (
        <Container className={s.b}>
          <Stack gap={24}>
            <PageHeader title={t("concepts.newDub.title")} />
            <TwoColumn
              asideWidth={320}
              sticky
              main={
                nd.phase === "empty" || nd.phase === "error" ? (
                  <Card padding="none"><Picker nd={nd} tall /></Card>
                ) : (
                  <Card>
                    <Stack gap={16}>
                      <Preview nd={nd} maxHeight="var(--video-h)" meta={<ReplaceButton nd={nd} />} />
                      <Section nd={nd} />
                    </Stack>
                  </Card>
                )
              }
              aside={<Show above><Receipt nd={nd} /></Show>}
            />
            <Show below>
              <StickyBar className={s.bBar} data-testid="new-dub-bar">
                <ReceiptAction nd={nd} compact />
              </StickyBar>
            </Show>
          </Stack>
        </Container>
      )}
    </NewDubPage>
  );
}

function Receipt({ nd }: { nd: NewDub }) {
  const { t, i18n } = useTranslation();
  const fmt = new Intl.NumberFormat(i18n.resolvedLanguage);
  const chosen = nd.phase === "ready" || nd.phase === "uploading";
  return (
    <Card padding="none" data-testid="new-dub-receipt">
      <CardHeader title={t("concepts.newDub.receipt.title")} />
      <CardBody>
        <dl className={s.rows}>
          <div className={s.row}>
            <dt>{t("concepts.newDub.receipt.video")}</dt>
            <dd className={s.ellipsis}>{chosen ? nd.fileName : t("concepts.newDub.receipt.none")}</dd>
          </div>
          <div className={s.row}>
            <dt>{t("concepts.newDub.receipt.price")}</dt>
            <dd>{t("concepts.newDub.cost.perSecond")}</dd>
          </div>
          <div className={s.row}>
            <dt>{t("concepts.newDub.receipt.balance")}</dt>
            <dd className={s.tabular}>
              {nd.phase === "ready" && !nd.short
                ? t("concepts.newDub.receipt.after", { from: fmt.format(nd.balance), to: fmt.format(nd.left) })
                : t("concepts.newDub.cost.have", { count: nd.balance })}
            </dd>
          </div>
        </dl>
      </CardBody>
      <CardFooter className={s.receiptFoot}>
        <ReceiptAction nd={nd} />
      </CardFooter>
    </Card>
  );
}

/** The receipt's foot (and the phone bar): hint → upload progress → Start, or Buy credits when short. */
function ReceiptAction({ nd, compact }: { nd: NewDub; compact?: boolean }) {
  const { t } = useTranslation();
  if (nd.phase === "empty" || nd.phase === "error") return <Text tone="muted">{t("concepts.newDub.receipt.hint")}</Text>;
  if (nd.phase === "uploading")
    return <div className={s.grow}><ProgressBar label={t("concepts.newDub.pick.uploading")} value={nd.progress} /></div>;
  return (
    <Stack gap={8} className={s.grow}>
      {nd.short ? <Text tone="danger" tabular>{t("concepts.newDub.cost.missing", { count: nd.missing })}</Text> : compact && <CostNote nd={nd} />}
      {nd.short ? <BuyButton nd={nd} full /> : <StartButton nd={nd} full />}
    </Stack>
  );
}

/* ------------------------------------------------------------------------------------------------------------------ */

/** C · Two steps — step 1 choose a video; step 2 choose the section (drag or type) and start. */
export function TwoStepsConcept() {
  return <NewDubPage id="two-steps">{(nd) => <TwoSteps nd={nd} />}</NewDubPage>;
}

function TwoSteps({ nd }: { nd: NewDub }) {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  if (nd.phase !== "ready")
    return (
      <Container width="narrow" className={s.c}>
        <div className={s.cStep1}>
          <Stack gap={24}>
            <PageHeader eyebrow={t("concepts.newDub.steps.step", { n: 1, total: 2 })} title={t("concepts.newDub.steps.chooseTitle")} />
            <Card padding="none">
              <Picker nd={nd} />
              <CardFooter><Text size="sm" tone="muted">{t("concepts.newDub.cost.perSecond")}</Text></CardFooter>
            </Card>
          </Stack>
        </div>
      </Container>
    );
  return (
    <Container width="narrow" className={s.c}>
      <Stack gap={16}>
        <div>
          <Button variant="ghost" icon={<Icon name="back" />} onClick={nd.reset}>{t("concepts.newDub.steps.back")}</Button>
        </div>
        <PageHeader eyebrow={t("concepts.newDub.steps.step", { n: 2, total: 2 })} title={t("concepts.newDub.steps.sectionTitle")} />
        <Card padding="none">
          <CardBody>
            <Stack gap={16}>
              <Preview nd={nd} maxHeight="var(--video-h)" meta={<Text size="sm" tone="muted" className={s.ellipsis}>{nd.fileName}</Text>} />
              <TimedSection nd={nd} typedTooLong={params.get("state") === "limit"} />
            </Stack>
          </CardBody>
          <CardFooter className={s.footer}>
            <CostNote nd={nd} />
            <div className={s.footerActions}>
              {nd.short && <BuyButton nd={nd} variant="secondary" />}
              <StartButton nd={nd} />
            </div>
          </CardFooter>
        </Card>
      </Stack>
    </Container>
  );
}

/** m:ss or plain seconds → seconds; NaN when it is not a time. */
function parseTime(v: string): number {
  const m = /^\s*(\d{1,2}):([0-5]\d)\s*$/.exec(v);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  return /^\s*\d{1,3}\s*$/.test(v) ? Number(v) : Number.NaN;
}

/** The section selector + Start / End fields (m:ss). The `limit` preview opens with "3:40" typed into End. */
function TimedSection({ nd, typedTooLong }: { nd: NewDub; typedTooLong: boolean }) {
  const { t } = useTranslation();
  const [a, b] = nd.range;
  const [draft, setDraft] = useState({ start: formatTime(a), end: typedTooLong ? "3:40" : formatTime(b) });
  const [err, setErr] = useState<{ start?: string; end?: string }>(
    typedTooLong ? { end: t("concepts.newDub.steps.tooLong", { max: formatTime(a + MAX) }) } : {},
  );
  const shown = useRef(`${a}-${b}`); // sync only on a real change (StrictMode runs effects twice)
  useEffect(() => {
    if (shown.current === `${a}-${b}`) return;
    shown.current = `${a}-${b}`;
    setDraft({ start: formatTime(a), end: formatTime(b) }); // the selector moved: the fields follow it
    setErr({});
  }, [a, b]);

  const commit = (field: "start" | "end") => {
    const st = parseTime(draft.start);
    const en = parseTime(draft.end);
    if (Number.isNaN(st)) return setErr({ start: t("concepts.newDub.steps.badTime") });
    if (Number.isNaN(en)) return setErr({ end: t("concepts.newDub.steps.badTime") });
    if (en > DURATION) return setErr({ end: t("concepts.newDub.steps.pastEnd", { end: formatTime(DURATION) }) });
    if (en <= st) return setErr({ [field]: t("concepts.newDub.steps.afterEnd") });
    if (en - st > MAX) return setErr({ end: t("concepts.newDub.steps.tooLong", { max: formatTime(st + MAX) }) });
    setErr({});
    if (st !== a || en !== b) nd.setRange(st, en);
  };
  const field = (f: "start" | "end") => (
    <TextField
      label={t(`concepts.newDub.steps.${f}`)}
      hint={t("concepts.newDub.steps.timeHint")}
      error={err[f]}
      inputMode="numeric"
      value={draft[f]}
      onChange={(e) => setDraft((d) => ({ ...d, [f]: e.target.value }))}
      onBlur={() => commit(f)}
      onKeyDown={(e) => e.key === "Enter" && commit(f)}
    />
  );
  return (
    <Stack gap={12}>
      <RangeSelector duration={nd.duration} start={a} end={b} max={MAX} onChange={nd.setRange} />
      <div className={s.cFields}>
        {field("start")}
        {field("end")}
      </div>
      {!err.end && !err.start && <LimitHint nd={nd} />}
    </Stack>
  );
}

/* ------------------------------------------------------------------------------------------------------------------ */

/** D · Price on the selection — the video is the hero, the price rides on the selected window, one action bar below. */
export function PriceOnSelectionConcept() {
  const { t } = useTranslation();
  return (
    <NewDubPage id="price-on-selection">
      {(nd) => (
        <Container className={s.d}>
          <div className={s.dCol}>
            <Stack gap={16}>
              <PageHeader title={t("concepts.newDub.title")} actions={nd.phase === "ready" ? <ReplaceButton nd={nd} variant="secondary" /> : undefined} />
              {nd.phase !== "ready" ? (
                <div className={s.dFrame}><Picker nd={nd} bare /></div>
              ) : (
                <>
                  <Preview nd={nd} maxHeight="var(--video-h)" meta={<FileMeta nd={nd} />} />
                  <Stack gap={4}>
                    <PriceTag nd={nd} />
                    <RangeSelector duration={nd.duration} start={nd.range[0]} end={nd.range[1]} max={MAX} onChange={nd.setRange} />
                    <LimitHint nd={nd} />
                  </Stack>
                  <StickyBar className={s.dBar} data-testid="new-dub-bar">
                    <CostNote nd={nd} />
                    <div className={s.dBarActions}>
                      {nd.short ? (
                        <>
                          <Button variant="secondary" size="lg" icon={<Icon name="trim" />} onClick={() => nd.setRange(nd.range[0], Math.min(DURATION, nd.range[0] + nd.affordable))}>
                            {t("concepts.newDub.cost.shorten", { s: nd.affordable })}
                          </Button>
                          <BuyButton nd={nd} />
                        </>
                      ) : (
                        <StartButton nd={nd} />
                      )}
                    </div>
                  </StickyBar>
                </>
              )}
            </Stack>
          </div>
        </Container>
      )}
    </NewDubPage>
  );
}

/** The cost riding above the middle of the selected window (clamped inside the track). */
function PriceTag({ nd }: { nd: NewDub }) {
  const { t } = useTranslation();
  const mid = ((nd.range[0] + nd.range[1]) / 2 / nd.duration) * 100;
  return (
    <div className={s.dTagRow} style={{ "--mid": `${mid}%` } as CSSProperties} data-testid="new-dub-price">
      <span className={s.dTag}>
        <Tag tone={nd.short ? "danger" : "accent"}>{t("concepts.newDub.cost.credits", { count: nd.cost })}</Tag>
      </span>
    </div>
  );
}

