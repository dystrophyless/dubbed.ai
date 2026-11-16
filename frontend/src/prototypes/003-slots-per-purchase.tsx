import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { AppShell } from "@/app/shells/Shells";
import { StateSwitcher } from "@/components/dev/StateSwitcher";
import { useViewState } from "@/components/dev/view-state";
import { DEMO_PACKS } from "@/features/credits/mocks";
import { CreditsView } from "@/features/credits/views/CreditsView";
import { demoCancelInfo, prototypeHref } from "@/features/recording-flow-mock/mocks";
import { NewDubView } from "@/features/recording-flow-mock/views/NewDubView";
import { ProjectsView } from "@/features/recording-flow-mock/views/ProjectsView";
import { NEXT_AFTER_BUY, manyProjects, slotsCredits, type SlotsCreditsState } from "@/features/slots-per-purchase/mocks";
import { InAppShell } from "@/pages/styleguide/templates/TemplateFrame";
import { DEMO_USER } from "@/pages/styleguide/templates/mocks";

/*
 * Feature 003 - more project slots with every purchase. Only the changed parts of approved screens:
 *   /prototypes/003-slots-per-purchase/new-dub?state=no-slot-more|no-slot-free|no-slot-more-45|no-slot-max
 *       the "No free project slot" notice by slot limit (10 · 2 · 45 · 50). Buy credits -> Credits.
 *   /prototypes/003-slots-per-purchase/projects?state=slots-full-more|slots-full-free|slots-full-max|after-purchase
 *       the "All project slots are used" alert by slot limit; after-purchase = the list at 10 of 15.
 *   /prototypes/003-slots-per-purchase/credits?state=slots-more|slots-free|slots-more-projects|line-free|line-more|line-max|
 *       success-first|success-more|success-more-projects|success-plain|success-max|success-at-max
 *       the slots notice, the slots line near the packs and the success notice by limit. In this prototype Buy goes straight
 *       to the matching success state (the payment page is the approved 002 one) and "Back" returns to the screen of origin.
 */
const BASE = "/prototypes/003-slots-per-purchase";
const PROJECTS = `${BASE}/projects`;
const CREDITS = `${BASE}/credits`;

export const NEW_DUB_STATES = ["no-slot-more", "no-slot-free", "no-slot-more-45", "no-slot-max"] as const;
export const PROJECTS_STATES = ["slots-full-more", "slots-full-free", "slots-full-max", "after-purchase"] as const;
export const CREDITS_STATES = [
  "slots-more", "slots-free", "slots-more-projects", "line-free", "line-more", "line-max",
  "success-first", "success-more", "success-more-projects", "success-plain", "success-max", "success-at-max",
] as const;

const LIMIT = { "no-slot-more": 10, "no-slot-free": 2, "no-slot-more-45": 45, "no-slot-max": 50 } as const;

export function NewDubSlotsPrototype() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const state = useViewState(NEW_DUB_STATES);
  const limit = LIMIT[state];
  return (
    <InAppShell states={NEW_DUB_STATES} credits={14}>
      <NewDubView
        key={state}
        phase="no-slot"
        error="length"
        progress={0}
        fileName={t("newDub.demoFile")}
        name=""
        videoSrc="/media/scene.mp4"
        duration={13.4}
        range={[0, 13.4]}
        balance={14}
        starting={false}
        slotsOffer={limit === 2 ? "first" : limit === 50 ? "max" : "more"}
        slotLimit={limit}
        onFile={() => undefined}
        onCancelUpload={() => undefined}
        onRange={() => undefined}
        onStart={() => undefined}
        onBuyCredits={() => navigate(`${CREDITS}?state=${limit === 2 ? "slots-free" : "slots-more"}`)}
        onOpenProjects={() => navigate(`${PROJECTS}?state=${limit === 2 ? "slots-full-free" : limit === 50 ? "slots-full-max" : "slots-full-more"}`)}
      />
    </InAppShell>
  );
}

export function ProjectsSlotsPrototype() {
  const navigate = useNavigate();
  const state = useViewState(PROJECTS_STATES);
  const total = state === "slots-full-free" ? 2 : state === "slots-full-max" ? 50 : state === "after-purchase" ? 15 : 10;
  const used = state === "after-purchase" ? 10 : total;
  const [items, setItems] = useState(() => manyProjects(used));
  return (
    <InAppShell states={PROJECTS_STATES} credits={14}>
      <ProjectsView
        key={state}
        state={state === "after-purchase" ? "default" : "slots-full"}
        projects={items}
        slotsTotal={total}
        slotsOffer={state === "slots-full-free" ? "first" : state === "slots-full-max" ? "max" : "more"}
        hrefOf={prototypeHref}
        cancelInfo={demoCancelInfo}
        onRename={() => undefined}
        onDelete={(id) => setItems((l) => l.filter((x) => x.id !== id))}
        onNewDub={() => navigate("/prototypes/new-dub/page")}
        onBuyCredits={() => navigate(`${CREDITS}?state=${state === "slots-full-free" ? "slots-free" : "slots-more-projects"}`)}
        onRetry={() => undefined}
      />
    </InAppShell>
  );
}

export function CreditsSlotsPrototype() {
  const state = useViewState(CREDITS_STATES);
  const { t } = useTranslation();
  return (
    <>
      <AppShell
        credits={0}
        hideCredits
        user={DEMO_USER}
        links={{ home: PROJECTS, credits: CREDITS, settings: "/styleguide/templates/settings" }}
        nav={[
          { to: PROJECTS, label: t("tpl.nav.projects"), icon: "projects" },
          { to: "/prototypes/new-dub/page", label: t("tpl.nav.newDub"), icon: "add" },
        ]}
      >
        <CreditsSlotsScreen key={state} state={state} />
      </AppShell>
      <StateSwitcher states={CREDITS_STATES} />
    </>
  );
}

function CreditsSlotsScreen({ state }: { state: SlotsCreditsState }) {
  const navigate = useNavigate();
  const [now] = useState(() => Date.now());
  const sc = useMemo(() => slotsCredits(state, now), [state, now]);
  const [packId, setPackId] = useState(sc.packId);
  const [buying, setBuying] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const next = NEXT_AFTER_BUY[state];
  return (
    <CreditsView
      state={buying ? "purchasing" : "default"}
      balance={sc.balance}
      reserved={sc.reserved}
      packs={DEMO_PACKS}
      packId={packId}
      onPackChange={setPackId}
      onBuy={() => {
        setBuying(true);
        timer.current = window.setTimeout(() => (next ? navigate(`${CREDITS}?state=${next}`) : setBuying(false)), 900);
      }}
      notice={sc.notice}
      onBack={sc.canGoBack ? () => navigate(sc.backTo === "projects" ? `${PROJECTS}?state=after-purchase` : "/prototypes/new-dub/page?state=ready") : undefined}
      backTo={sc.backTo}
      slots={sc.slots}
      history={sc.history}
      page={1}
      pages={1}
      onPage={() => undefined}
      onRetry={() => undefined}
      now={now}
    />
  );
}
