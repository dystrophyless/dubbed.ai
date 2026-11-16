import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitch } from "@/app/shells/LanguageSwitch";
import { Brand } from "@/app/shells/Shells";
import { Icon, type IconName } from "@/components/icons";
import { Alert, Button, Card, IconTile, SkeletonText, Spinner } from "@/components/ui";
import { formatMoney, minutesOf } from "@/features/credits/format";
import s from "./checkout.module.css";

export type CheckoutViewState = "default" | "loading" | "paying" | "returning" | "completed" | "cancelled" | "not-found" | "error";

export type CheckoutViewProps = {
  state: CheckoutViewState;
  /** the pack as it was when the purchase started; absent for loading / not-found / error */
  pack?: { credits: number; priceCents: number };
  /** the last Pay failed (nothing charged): an inline danger alert above Pay; Pay is the retry */
  payError?: boolean;
  /** Pay — ignored while paying */
  onPay: () => void;
  /** "Back to Dubbed" — cancels an awaiting purchase and returns to Credits; on a finished one it just returns */
  onBack: () => void;
  onRetry: () => void;
  /** the brand link target (Credits) */
  brandHref: string;
};

const K = "features.checkout" as const;

/*
 * The simulated payment page. It stands in for a payment provider's hosted checkout, so it sits OUTSIDE the product
 * shell (brand + language only, like Auth). It names no real provider and has no card or personal-data fields.
 */
export function CheckoutView(p: CheckoutViewProps) {
  const { t, i18n } = useTranslation();
  const n = (v: number) => new Intl.NumberFormat(i18n.resolvedLanguage).format(v);
  const price = p.pack ? formatMoney(p.pack.priceCents) : "";
  const paying = p.state === "paying";

  return (
    <div className={s.page} data-testid="checkout-page" data-state={p.state}>
      <header className={s.top}>
        <Brand to={p.brandHref} />
        <LanguageSwitch />
      </header>
      <main className={s.main} id="main">
        {p.state === "default" || p.state === "paying" ? (
          <Panel
            icon="purchase"
            title={t(`${K}.title`)}
            subtitle={t(`${K}.subtitle`)}
            footer={<Button variant="ghost" onClick={p.onBack} disabled={paying}>{t(`${K}.back`)}</Button>}
            busy={paying}
          >
            <Alert tone="warning" title={t(`${K}.demoTitle`)}>{t(`${K}.demoText`)}</Alert>
            {p.pack && (
              <div className={s.summary} data-testid="checkout-pack">
                <span className={s.summaryText}>
                  <span className={s.summaryName}>{t(`${K}.pack`)}</span>
                  <span className={s.summaryMeta}>{t(`${K}.packText`, { count: p.pack.credits, n: n(p.pack.credits), min: minutesOf(p.pack.credits) })}</span>
                </span>
                <span className={s.price}>{price}</span>
              </div>
            )}
            <div className={s.actions}>
              {p.payError && !paying && (
                <div data-testid="checkout-pay-error"><Alert tone="danger" title={t(`${K}.payError`)} /></div>
              )}
              <Button size="lg" loading={paying} icon={<Icon name="purchase" />} onClick={paying ? undefined : p.onPay} data-testid="checkout-pay">
                {paying ? t(`${K}.paying`) : t(`${K}.pay`, { price })}
              </Button>
              {paying && <p className={s.note} role="status">{t(`${K}.payingNote`)}</p>}
            </div>
          </Panel>
        ) : p.state === "loading" ? (
          <Card padding="none" className={s.card} aria-busy>
            <div className={s.body}>
              <h1 className="sr-only">{t(`${K}.title`)}</h1>
              <div className={s.skeletonBlock}>
                <SkeletonText size="lg" width={200} />
                <SkeletonText width={240} />
              </div>
              <SkeletonText width={320} />
              <SkeletonText size="lg" width={320} />
            </div>
          </Card>
        ) : p.state === "returning" ? (
          <Panel icon={null} lead={<span className={s.spinTile}><Spinner size={20} /></span>} title={t(`${K}.returningTitle`)} subtitle={t(`${K}.returningText`)} busy />
        ) : p.state === "completed" ? (
          <Panel icon="success" tone="success" title={t(`${K}.completedTitle`)} subtitle={t(`${K}.completedText`)}>
            <BackButton onBack={p.onBack} label={t(`${K}.back`)} />
          </Panel>
        ) : p.state === "cancelled" ? (
          <Panel icon="info" title={t(`${K}.cancelledTitle`)} subtitle={t(`${K}.cancelledText`)}>
            <BackButton onBack={p.onBack} label={t(`${K}.back`)} />
          </Panel>
        ) : p.state === "not-found" ? (
          <Panel icon="search" title={t(`${K}.notFoundTitle`)} subtitle={t(`${K}.notFoundText`)}>
            <BackButton onBack={p.onBack} label={t(`${K}.back`)} />
          </Panel>
        ) : (
          <Panel
            icon="error"
            tone="danger"
            title={t(`${K}.errorTitle`)}
            subtitle={t(`${K}.errorText`)}
            footer={<Button variant="ghost" onClick={p.onBack}>{t(`${K}.back`)}</Button>}
          >
            <div className={s.actions}>
              <Button size="lg" icon={<Icon name="retry" />} onClick={p.onRetry}>{t(`${K}.retry`)}</Button>
            </div>
          </Panel>
        )}
      </main>
    </div>
  );
}

function BackButton({ onBack, label }: { onBack: () => void; label: string }) {
  return (
    <div className={s.actions}>
      <Button size="lg" icon={<Icon name="back" />} onClick={onBack}>{label}</Button>
    </div>
  );
}

function Panel({
  icon, tone = "accent", lead, title, subtitle, children, footer, busy,
}: {
  icon: IconName | null; tone?: "accent" | "success" | "danger"; lead?: ReactNode; title: string; subtitle: string; children?: ReactNode; footer?: ReactNode; busy?: boolean;
}) {
  return (
    <Card padding="none" className={s.card} aria-busy={busy || undefined}>
      <div className={s.body}>
        <div className={s.head}>
          <span className={s.icon}>{lead ?? (icon && <IconTile icon={icon} tone={tone === "accent" && icon !== "purchase" ? "neutral" : tone} size={40} />)}</span>
          <h1 className={s.title}>{title}</h1>
          <p className={s.subtitle}>{subtitle}</p>
        </div>
        {children}
      </div>
      {footer && <div className={s.footer}>{footer}</div>}
    </Card>
  );
}
