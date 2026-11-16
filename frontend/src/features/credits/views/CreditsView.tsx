import { Fragment, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Icon, type IconName } from "@/components/icons";
import { Container, Show, Stack } from "@/components/layout";
import {
  Alert, Button, Card, CardFooter, CardHeader, EmptyState, IconTile, List, ListGroup, ListItem, NumberTicker, OptionCards,
  PageHeader, Pagination, SkeletonText, Text, TextLink,
} from "@/components/ui";
import { formatMoney, minutesOf, timeFormatter } from "../format";
import s from "./credits.module.css";

export type CreditsViewState = "default" | "loading" | "empty-history" | "error" | "purchasing";

export type PackItem = { id: string; credits: number; priceCents: number; best?: boolean };

export type RunState = "reserved" | "charged" | "returned" | "partly_charged" | "failed_returned";

/** One history row. `at` is epoch ms; `amount` is the signed effect on spendable + reserved credits. */
export type HistoryItem =
  | { id: string; kind: "welcome"; at: number; amount: number }
  | { id: string; kind: "purchase"; at: number; amount: number; credits: number; priceCents: number }
  | { id: string; kind: "adjustment"; at: number; amount: number }
  | {
      id: string; kind: "run"; at: number; amount: number; projectName: string; runState: RunState;
      reserved: number; charged: number; returned: number;
      /** only a run still in reserve links to its Processing page */
      projectHref?: string;
    };

/** The message above the panels. One at a time; success beats the others. */
export type CreditsNotice =
  | { kind: "success"; credits: number; balance: number; firstPurchase: boolean; slotLimit: number }
  | { kind: "declined" }
  | { kind: "buy-error" }
  | { kind: "shortfall"; need: number; projectName: string }
  | { kind: "slots"; slotLimit: number };

export type CreditsViewProps = {
  state: CreditsViewState;
  balance: number;
  /** credits held by runs in preparation, and the projects holding them (each links to its Processing page) */
  reserved: { credits: number; projects: { id: string; name: string; href: string }[] };
  packs: PackItem[];
  packId: string;
  onPackChange: (id: string) => void;
  /** presses of Buy are ignored while `state` is "purchasing" */
  onBuy: () => void;
  notice: CreditsNotice | null;
  /** "Back to New dub" — present only when the user came from New dub or a slot-full notice */
  onBack?: () => void;
  history: HistoryItem[];
  page: number;
  pages: number;
  onPage: (page: number) => void;
  onRetry: () => void;
  /** "now" for Today / Yesterday grouping; the page passes Date.now() */
  now: number;
};

const KIND: Record<string, { icon: IconName; tone: "neutral" | "accent" | "success" | "warning" }> = {
  welcome: { icon: "magic", tone: "accent" },
  purchase: { icon: "purchase", tone: "success" },
  adjustment: { icon: "wallet", tone: "neutral" },
  reserved: { icon: "duration", tone: "warning" },
  charged: { icon: "scene", tone: "neutral" },
  partly_charged: { icon: "scene", tone: "neutral" },
  returned: { icon: "retry", tone: "success" },
  failed_returned: { icon: "retry", tone: "success" },
};

const C = "features.credits" as const;

function dayKey(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/* Presentational: the page container supplies the shell (AppShell with hideCredits) and the data. */
export function CreditsView(p: CreditsViewProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const fmt = new Intl.NumberFormat(lang);
  const dayFmt = new Intl.DateTimeFormat(lang, { day: "numeric", month: "long" });
  const timeFmt = timeFormatter(lang);
  const loading = p.state === "loading";
  const buying = p.state === "purchasing";
  const chosen = p.packs.find((x) => x.id === p.packId) ?? p.packs[0];
  const today = dayKey(p.now);
  const dayLabel = (ms: number) => {
    const k = dayKey(ms);
    return k === today ? t(`${C}.today`) : k === dayKey(today - 1) ? t(`${C}.yesterday`) : dayFmt.format(ms);
  };
  const n = (v: number) => fmt.format(v);
  const backAvailable = Boolean(p.onBack && p.notice?.kind === "success");

  return (
    <Container width="narrow">
      <Stack gap={24}>
        <PageHeader title={t(`${C}.title`)} description={t(`${C}.subtitle`)} />

        {p.state === "error" ? (
          <Card>
            <EmptyState
              level={2}
              icon="error"
              tone="danger"
              data-testid="credits-error"
              title={t(`${C}.errorTitle`)}
              description={t(`${C}.errorText`)}
              actions={<Button variant="secondary" icon={<Icon name="retry" />} onClick={p.onRetry}>{t("kit.retry")}</Button>}
            />
          </Card>
        ) : (
          <>
            {!loading && p.notice && <Notice notice={p.notice} n={n} onBack={backAvailable ? p.onBack : undefined} />}

            <Card padding="lg" aria-busy={loading || undefined} data-testid="credits-balance">
              <div className={s.balance}>
                <IconTile icon="credits" tone="accent" size={40} />
                <Stack gap={2}>
                  <Text size="sm" tone="muted">{t(`${C}.balance`)}</Text>
                  {loading ? (
                    <><SkeletonText size="lg" width={180} /><SkeletonText width={240} /></>
                  ) : (
                    <>
                      <span className={s.balanceValue}>
                        <NumberTicker value={p.balance} locale={lang} />
                        <span className={s.balanceUnit}>{t(`${C}.unit`, { count: p.balance })}</span>
                      </span>
                      <span className={s.balanceLines}>
                        <Text tone="text">
                          {p.balance === 0 ? t(`${C}.zero`) : minutesOf(p.balance) < 1 ? t(`${C}.worthLess`) : t(`${C}.worth`, { min: minutesOf(p.balance) })}
                        </Text>
                      </span>
                      {p.reserved.credits > 0 && (
                        <div data-testid="credits-reserved"><Text tone="text">
                          {t(`${C}.reservedFor`, { count: p.reserved.credits, n: n(p.reserved.credits) })}{" "}
                          {p.reserved.projects.map((r, i) => (
                            <Fragment key={r.id}>{i > 0 && ", "}<TextLink to={r.href}>{r.name}</TextLink></Fragment>
                          ))}
                        </Text></div>
                      )}
                    </>
                  )}
                </Stack>
              </div>
            </Card>

            <Card padding="none" aria-busy={loading || undefined} data-testid="credits-packs">
              <CardHeader level={2} title={t(`${C}.packs`)} actions={<span className={s.headerMeta}>{t(`${C}.packsText`)}</span>} />
              <div className={s.packBody}>
                {loading ? (
                  <div className={s.packSkeleton}>{[0, 1, 2].map((i) => <span key={i} />)}</div>
                ) : (
                  <OptionCards
                    legend={t(`${C}.packs`)}
                    value={p.packId}
                    onChange={p.onPackChange}
                    disabled={buying}
                    options={p.packs.map((x) => ({
                      value: x.id,
                      title: n(x.credits),
                      subtitle: t(`${C}.packMinutes`, { min: minutesOf(x.credits) }),
                      meta: formatMoney(x.priceCents),
                      badge: x.best ? t(`${C}.best`) : undefined,
                    }))}
                  />
                )}
                {buying && <Alert tone="info" title={t(`${C}.checkoutTitle`)}>{t(`${C}.checkoutText`)}</Alert>}
              </div>
              <CardFooter>
                <span>{t(`${C}.packsNote`)}</span>
                <Button
                  size="lg"
                  variant={backAvailable ? "secondary" : "primary"}
                  loading={buying}
                  disabled={loading}
                  icon={<Icon name="purchase" />}
                  onClick={buying ? undefined : p.onBuy}
                  data-testid="credits-buy"
                >
                  {chosen && t(`${C}.buyPack`, { credits: n(chosen.credits), price: formatMoney(chosen.priceCents) })}
                </Button>
              </CardFooter>
            </Card>

            <Card padding="none" aria-busy={loading || undefined}>
              <CardHeader level={2} title={t(`${C}.history`)} />
              {loading ? (
                <List>
                  {[0, 1, 2].map((i) => (
                    <ListItem key={i} leading={<span className={s.tilePlaceholder} />} title={<SkeletonText width={[200, 160, 220][i]} />} subtitle={<SkeletonText size="sm" width={80} />} />
                  ))}
                </List>
              ) : p.history.length === 0 ? (
                <EmptyState icon="history" title={t(`${C}.emptyTitle`)} description={t(`${C}.emptyText`)} data-testid="credits-history-empty" />
              ) : (
                <>
                  <List dividers={false} data-testid="credits-history">
                    {p.history.map((h, i) => (
                      <Fragment key={h.id}>
                        {(i === 0 || dayKey(p.history[i - 1].at) !== dayKey(h.at)) && <ListGroup>{dayLabel(h.at)}</ListGroup>}
                        <Row item={h} time={timeFmt.format(h.at)} n={n} />
                      </Fragment>
                    ))}
                  </List>
                  {p.pages > 1 && (
                    <div className={s.historyFoot}>
                      <Show above><Pagination page={p.page} total={p.pages} onChange={p.onPage} /></Show>
                      <Show below><Pagination page={p.page} total={p.pages} onChange={p.onPage} compact /></Show>
                    </div>
                  )}
                </>
              )}
            </Card>
          </>
        )}
      </Stack>
    </Container>
  );
}

function Notice({ notice, n, onBack }: { notice: CreditsNotice; n: (v: number) => string; onBack?: () => void }) {
  const { t } = useTranslation();
  switch (notice.kind) {
    case "success":
      return (
        <div data-testid="credits-notice" data-kind="success">
          <Alert
            tone="success"
            title={t(`${C}.notice.successTitle`, { count: notice.credits, n: n(notice.credits) })}
            action={onBack && <Button icon={<Icon name="back" />} onClick={onBack}>{t(`${C}.notice.back`)}</Button>}
          >
            {t(`${C}.notice.successText`, { balance: n(notice.balance) })}
            {notice.firstPurchase && <> {t(`${C}.notice.firstPurchase`, { slots: notice.slotLimit })}</>}
          </Alert>
        </div>
      );
    case "declined":
      return (
        <div data-testid="credits-notice" data-kind="declined">
          <Alert tone="warning" title={t(`${C}.notice.declinedTitle`)}>{t(`${C}.notice.declinedText`)}</Alert>
        </div>
      );
    case "buy-error":
      return (
        <div data-testid="credits-notice" data-kind="buy-error">
          <Alert tone="danger" title={t(`${C}.notice.buyError`)} />
        </div>
      );
    case "shortfall":
      return (
        <div data-testid="credits-notice" data-kind="shortfall">
          <Alert tone="info" title={t(`${C}.notice.shortfallTitle`, { count: notice.need, n: n(notice.need), project: notice.projectName })}>
            {t(`${C}.notice.shortfallText`)}
          </Alert>
        </div>
      );
    case "slots":
      return (
        <div data-testid="credits-notice" data-kind="slots">
          <Alert tone="info" title={t(`${C}.notice.slotsTitle`, { slots: notice.slotLimit })}>
            {t(`${C}.notice.slotsText`, { slots: notice.slotLimit })}
          </Alert>
        </div>
      );
  }
}

function Row({ item, time, n }: { item: HistoryItem; time: string; n: (v: number) => string }): ReactNode {
  const { t } = useTranslation();
  const sign = item.amount > 0 ? "plus" : item.amount < 0 ? "minus" : "zero";
  const amount = (
    <span className={s.amount} data-sign={sign}>
      {item.amount > 0 ? "+" : item.amount < 0 ? "−" : ""}{n(Math.abs(item.amount))}
    </span>
  );
  let kind = item.kind as string;
  let title: ReactNode;
  let hint: string;
  let href: string | undefined;
  switch (item.kind) {
    case "welcome":
      title = t(`${C}.welcome`);
      hint = t(`${C}.welcomeHint`);
      break;
    case "purchase":
      title = t(`${C}.purchaseRow`, { count: item.credits, n: n(item.credits) });
      hint = `${formatMoney(item.priceCents)} · ${t(`${C}.purchaseHint`)}`;
      break;
    case "adjustment":
      title = t(`${C}.adjustment`);
      hint = t(`${C}.adjustmentHint`);
      break;
    case "run":
      kind = item.runState;
      title = item.projectName;
      href = item.runState === "reserved" ? item.projectHref : undefined;
      hint =
        item.runState === "reserved" ? t(`${C}.run.reserved`, { n: n(item.reserved) })
        : item.runState === "charged" ? t(`${C}.run.charged`, { n: n(item.charged) })
        : item.runState === "partly_charged" ? t(`${C}.run.partly`, { charged: n(item.charged), returned: n(item.returned) })
        : item.runState === "returned" ? t(`${C}.run.returned`, { n: n(item.returned) })
        : t(`${C}.run.failed`);
      break;
  }
  return (
    <ListItem
      data-testid="history-row"
      leading={<IconTile icon={KIND[kind].icon} tone={KIND[kind].tone} />}
      title={title}
      subtitle={<>{hint} · {time}</>}
      trailing={amount}
      to={href}
    />
  );
}
