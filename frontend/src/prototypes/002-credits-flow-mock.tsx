import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { AppShell } from "@/app/shells/Shells";
import { StateSwitcher } from "@/components/dev/StateSwitcher";
import { useViewState } from "@/components/dev/view-state";
import { CheckoutView, type CheckoutViewState } from "@/features/checkout/views/CheckoutView";
import { DEMO_CHECKOUT_PACK, DEMO_PACKS, olderHistory, scenario } from "@/features/credits/mocks";
import { CreditsView, type CreditsViewState } from "@/features/credits/views/CreditsView";
import { DEMO_USER } from "@/pages/styleguide/templates/mocks";

/*
 * Feature 002 — credits flow on mock services.
 *   /prototypes/002-credits-flow-mock/credits?state=…   the approved Credits template (Gate 3) + the new rows and messages.
 *       default (every history row kind, 3 pages) · loading · empty-history · error · purchasing (→ opens the checkout page)
 *       success · success-first (first purchase: 10 slots) · success-return (from New dub: primary "Back to New dub")
 *       declined · buy-error (Buy failed, nothing charged) · shortfall (from New dub) · slots (from a slot-full notice) · zero-balance
 *   /prototypes/002-credits-flow-mock/checkout?state=…  the simulated payment page, outside the product shell
 *       default · loading · paying · returning · completed · cancelled · not-found · error · pay-error (Pay failed, nothing charged)
 *       Pay runs paying → returning → Credits (success; add &outcome=declined for the declined message).
 * Links go to each other, so the whole trip works: Credits → Buy → checkout → Pay → Credits → Back to New dub.
 */
export const CREDITS_STATES = [
  "default", "loading", "empty-history", "error", "purchasing",
  "success", "success-first", "success-return", "declined", "buy-error", "shortfall", "slots", "zero-balance",
] as const;
export const CHECKOUT_STATES = ["default", "loading", "paying", "returning", "completed", "cancelled", "not-found", "error", "pay-error"] as const;

const BASE = "/prototypes/002-credits-flow-mock";
const LINKS = { home: "/prototypes/001-recording-flow-mock/projects", credits: `${BASE}/credits`, settings: "/styleguide/templates/settings" };

export function CreditsPrototype() {
  const { t } = useTranslation();
  const state = useViewState(CREDITS_STATES);
  return (
    <>
      <AppShell
        credits={0}
        hideCredits
        user={DEMO_USER}
        links={LINKS}
        nav={[
          { to: LINKS.home, label: t("tpl.nav.projects"), icon: "projects" },
          { to: "/prototypes/new-dub/page", label: t("tpl.nav.newDub"), icon: "add" },
        ]}
      >
        <CreditsScreen key={state} state={state} />
      </AppShell>
      <StateSwitcher states={CREDITS_STATES} />
    </>
  );
}

function CreditsScreen({ state }: { state: (typeof CREDITS_STATES)[number] }) {
  const navigate = useNavigate();
  const [now] = useState(() => Date.now());
  const sc = useMemo(() => scenario(state === "purchasing" ? "default" : state, now), [state, now]);
  const [packId, setPackId] = useState(sc.packId);
  const [page, setPage] = useState(1);
  const [buying, setBuying] = useState(state === "purchasing");
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const viewState: CreditsViewState = state === "loading" ? "loading" : state === "error" ? "error" : state === "empty-history" ? "empty-history" : buying ? "purchasing" : "default";
  const history = page === 1 ? sc.history : olderHistory(page, now);

  return (
    <CreditsView
      state={viewState}
      balance={sc.balance}
      reserved={sc.reserved}
      packs={DEMO_PACKS}
      packId={packId}
      onPackChange={setPackId}
      onBuy={() => {
        setBuying(true);
        timer.current = window.setTimeout(() => navigate(`${BASE}/checkout`), 900);
      }}
      notice={sc.notice}
      onBack={sc.canGoBack || sc.notice?.kind === "slots" ? () => navigate("/prototypes/new-dub/page?state=ready") : undefined}
      history={history}
      page={page}
      pages={sc.pages}
      onPage={setPage}
      onRetry={() => navigate(`${BASE}/credits`)}
      now={now}
    />
  );
}

export function CheckoutPrototype() {
  const state = useViewState(CHECKOUT_STATES);
  return (
    <>
      <CheckoutScreen key={state} state={state} />
      <StateSwitcher states={CHECKOUT_STATES} />
    </>
  );
}

function CheckoutScreen({ state }: { state: CheckoutViewState | "pay-error" }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const declined = params.get("outcome") === "declined";
  const [phase, setPhase] = useState<CheckoutViewState>(state === "pay-error" ? "default" : state);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const pack = state === "loading" || state === "not-found" || state === "error" ? undefined : DEMO_CHECKOUT_PACK;

  const goCredits = (s: string) => navigate(`${BASE}/credits${s ? `?state=${s}` : ""}`);
  const pay = () => {
    setPhase("paying");
    timer.current = window.setTimeout(() => {
      setPhase("returning");
      timer.current = window.setTimeout(() => goCredits(declined ? "declined" : "success"), 700);
    }, 1200);
  };
  return (
    <CheckoutView
      state={state === "default" || state === "pay-error" ? phase : state}
      payError={state === "pay-error" && phase === "default"}
      pack={pack}
      onPay={pay}
      onBack={() => goCredits("")}
      onRetry={() => navigate(`${BASE}/checkout`)}
      brandHref={LINKS.credits}
    />
  );
}
