import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useViewState } from "@/components/dev/view-state";
import { Icon, type IconName } from "@/components/icons";
import { Container, Show, Stack } from "@/components/layout";
import {
  Alert, Button, Card, CardFooter, CardHeader, EmptyState, IconTile, List, ListGroup, ListItem, NumberTicker, OptionCards,
  PageHeader, Pagination, SkeletonText, Text, toast,
} from "@/components/ui";
import { DEMO_HISTORY, DEMO_PACKS, type HistoryKind } from "./mocks";
import { InAppShell } from "./TemplateFrame";
import s from "./templates.module.css";

export const CREDITS_STATES = ["default", "loading", "empty-history", "error", "purchasing"] as const;

const KIND: Record<HistoryKind, { icon: IconName; tone: "neutral" | "accent" | "success" | "warning" }> = {
  welcome: { icon: "magic", tone: "accent" },
  purchase: { icon: "purchase", tone: "success" },
  reserved: { icon: "duration", tone: "warning" },
  charged: { icon: "scene", tone: "neutral" },
  refund: { icon: "retry", tone: "success" },
};

/*
 * Credits — /styleguide/templates/credits. Three panels (narrow 720):
 *   Balance — accent tile, the number, what it is worth in minutes, what is held in reserve;
 *   Buy credits — OptionCards (credits · minutes · price, "Best value"), ONE primary that names the purchase;
 *                 purchasing = cards locked, the button loading, a note about the secure checkout window;
 *   History — grouped by day; each kind has its own tinted tile; amounts signed, top-ups in green.
 * The top-bar balance is hidden on this page (no duplicated information). Prices are placeholders (brief §5).
 */
export function CreditsTemplate() {
  const { t, i18n } = useTranslation();
  const state = useViewState(CREDITS_STATES);
  const [balance, setBalance] = useState(1046);
  const [pack, setPack] = useState("m");
  const [buying, setBuying] = useState(state === "purchasing");
  const [page, setPage] = useState(1);
  const lang = i18n.resolvedLanguage;
  const fmt = new Intl.NumberFormat(lang);
  const dayFmt = new Intl.DateTimeFormat(lang, { day: "numeric", month: "long" });
  const history = state === "empty-history" ? [] : DEMO_HISTORY;
  const loading = state === "loading";
  const chosen = DEMO_PACKS.find((p) => p.id === pack)!;
  const dayLabel = (d: number) => (d === 0 ? t("tpl.credits.today") : d === 1 ? t("tpl.credits.yesterday") : dayFmt.format(new Date(Date.UTC(2026, 10, 3 - d))));

  return (
    <InAppShell states={CREDITS_STATES} credits={balance} hideCredits>
      <Container width="narrow">
        <Stack gap={24}>
          <PageHeader title={t("tpl.credits.title")} description={t("tpl.credits.subtitle")} />
          {state === "error" ? (
            <Card>
              <EmptyState icon="error" tone="danger" title={t("tpl.credits.errorTitle")} description={t("tpl.projects.errorText")}
                actions={<Button variant="secondary" icon={<Icon name="retry" />} onClick={() => toast({ tone: "info", title: t("kit.retry") })}>{t("kit.retry")}</Button>} />
            </Card>
          ) : (
            <>
              <Card padding="lg" aria-busy={loading || undefined}>
                <div className={s.balance}>
                  <IconTile icon="credits" tone="accent" size={40} />
                  <Stack gap={2}>
                    <Text size="sm" tone="muted">{t("tpl.credits.balance")}</Text>
                    {loading ? (
                      <><SkeletonText size="lg" width={180} /><SkeletonText width={240} /></>
                    ) : (
                      <>
                        <span className={s.balanceValue}>
                          <NumberTicker value={balance} locale={lang} />
                          <span className={s.balanceUnit}>{t("tpl.credits.unit", { count: balance })}</span>
                        </span>
                        <Text tone="text">
                          {t("tpl.credits.worth", { min: Math.floor(balance / 60) })} · {t("tpl.credits.reserved", { count: 118 })}
                        </Text>
                      </>
                    )}
                  </Stack>
                </div>
              </Card>

              <Card padding="none" aria-busy={loading || undefined}>
                <CardHeader title={t("tpl.credits.packs")} actions={<span className={s.headerMeta}>{t("tpl.credits.packsText")}</span>} />
                <div className={s.packBody}>
                  {loading ? (
                    <div className={s.packSkeleton}>{[0, 1, 2].map((i) => <span key={i} />)}</div>
                  ) : (
                    <OptionCards
                      legend={t("tpl.credits.packs")}
                      value={pack}
                      onChange={setPack}
                      disabled={buying}
                      options={DEMO_PACKS.map((p) => ({
                        value: p.id,
                        title: fmt.format(p.credits),
                        subtitle: t("tpl.credits.packMinutes", { count: p.credits, min: Math.round(p.credits / 60) }),
                        meta: p.price,
                        badge: p.best ? t("tpl.credits.best") : undefined,
                      }))}
                    />
                  )}
                  {buying && <Alert tone="info" title={t("tpl.credits.checkoutTitle")}>{t("tpl.credits.checkoutText")}</Alert>}
                </div>
                <CardFooter>
                  <span>{t("tpl.credits.packsNote")}</span>
                  <Button
                    size="lg"
                    loading={buying}
                    disabled={loading}
                    icon={<Icon name="purchase" />}
                    onClick={() => {
                      setBuying(true);
                      window.setTimeout(() => { setBuying(false); setBalance((b) => b + chosen.credits); toast({ title: t("tpl.credits.bought", { count: chosen.credits }) }); }, 1600);
                    }}
                  >
                    {t("tpl.credits.buyPack", { credits: fmt.format(chosen.credits), price: chosen.price })}
                  </Button>
                </CardFooter>
              </Card>

              <Card padding="none">
                <CardHeader title={t("tpl.credits.history")} />
                {loading ? (
                  <List>
                    {[0, 1, 2].map((i) => (
                      <ListItem key={i} leading={<span className={s.tilePlaceholder} />} title={<SkeletonText width={[200, 160, 220][i]} />} subtitle={<SkeletonText size="sm" width={80} />} />
                    ))}
                  </List>
                ) : history.length === 0 ? (
                  <EmptyState icon="history" title={t("tpl.credits.emptyTitle")} description={t("tpl.credits.emptyText")} />
                ) : (
                  <>
                    <List dividers={false} data-testid="credits-history">
                      {history.map((h, i) => (
                        <HistoryRow key={h.id} first={i === 0 || history[i - 1].daysAgo !== h.daysAgo} group={dayLabel(h.daysAgo)}>
                          <ListItem
                            leading={<IconTile icon={KIND[h.kind].icon} tone={KIND[h.kind].tone} />}
                            title={t(`tpl.credits.kind.${h.kind}`)}
                            subtitle={h.project ?? t(`tpl.credits.kindHint.${h.kind}`)}
                            trailing={<span className={s.amount} data-sign={h.amount > 0 ? "plus" : "minus"}>{h.amount > 0 ? "+" : "−"}{fmt.format(Math.abs(h.amount))}</span>}
                          />
                        </HistoryRow>
                      ))}
                    </List>
                    <div className={s.historyFoot}>
                      <Show above><Pagination page={page} total={3} onChange={setPage} /></Show>
                      <Show below><Pagination page={page} total={3} onChange={setPage} compact /></Show>
                    </div>
                  </>
                )}
              </Card>
            </>
          )}
        </Stack>
      </Container>
    </InAppShell>
  );
}

function HistoryRow({ first, group, children }: { first: boolean; group: string; children: ReactNode }) {
  return (
    <>
      {first && <ListGroup>{group}</ListGroup>}
      {children}
    </>
  );
}
