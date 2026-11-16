import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { CreditsView, type CreditsNotice, type CreditsViewState, type HistoryItem } from "@/features/credits/views/CreditsView";
import { projectId, purchaseId, useAccount, useCreditsHistory, usePacks, useProject, useProjects, usePurchase, useServices, type HistoryRow, type ReturnTo } from "@/services";
import { packForNeed } from "@/services/rules/credits";
import { slotLimitAfterPurchase, slotsOffer } from "@/services/rules/slots";

/*
 * S1 — Credits on the real route: the approved CreditsView over `['account']`, `['credits','packs']`,
 * `['credits','history',page]` and `['projects']` (the projects holding the reserve).
 * Buy → startPurchase(packId, returnTo) → the payment page; `?purchase=<id>` shows the outcome notice.
 * Context (US3): `?from=new&project=<id>&need=<n>` → shortfall notice (the need is the URL's, as New dub computed it) with the
 * smallest covering pack chosen; `?from=slots` → slots notice. returnTo is stored on the purchase, so after the payment page
 * the success notice offers "Back to New dub" (`/new?project=<id>`, or `/new` for slots).
 */
const projectHref = (id: string) => `/projects/${id}/processing`;

function returnToFromUrl(params: URLSearchParams, atMax: boolean): ReturnTo {
  const from = params.get("from");
  if (from === "slots") return atMax ? null : { kind: "slots", from: params.get("back") === "projects" ? "projects" : "new" }; // at the maximum a purchase adds no slots: no slots context
  const project = params.get("project");
  const need = Number(params.get("need"));
  if (from === "new" && project && Number.isInteger(need) && need >= 1) return { kind: "new", projectId: projectId(project), need };
  return null;
}

function toItem(row: HistoryRow): HistoryItem {
  switch (row.kind) {
    case "welcome":
    case "adjustment":
      return { id: row.id, kind: row.kind, at: row.at, amount: row.amount };
    case "purchase":
      return { id: row.id, kind: "purchase", at: row.at, amount: row.amount, credits: row.pack.credits, priceCents: row.pack.price.cents };
    case "run":
      return {
        id: row.id, kind: "run", at: row.at, amount: row.amount, projectName: row.projectName, runState: row.state,
        reserved: row.reserved, charged: row.charged, returned: row.returned,
        projectHref: row.state === "reserved" ? projectHref(row.projectId) : undefined,
      };
  }
}

/*
 * The operation state (buying, buyFailed, chosen pack, the sweep) belongs to one route + query lifecycle: the screen is keyed
 * by it, so a new URL gets a fresh instance and a finishing request of the old one can never touch the new one's state.
 */
export function CreditsPage() {
  const location = useLocation();
  return <CreditsScreen key={`${location.pathname}${location.search}`} />;
}

function CreditsScreen() {
  const services = useServices();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const location = useLocation();
  const purchaseParam = params.get("purchase") ?? undefined;
  const account = useAccount();
  const packs = usePacks();
  const projects = useProjects();
  const [page, setPage] = useState(1);
  const history = useCreditsHistory(page);
  const purchase = usePurchase(purchaseParam);
  // the context the user came from: the URL (from New dub / a slot-full notice) or, after the payment page, the purchase
  const urlReturn = returnToFromUrl(params, account.data !== undefined && slotsOffer(account.data.slotLimit) === "max");
  const urlProject = useProject(urlReturn?.kind === "new" && !purchaseParam ? urlReturn.projectId : undefined);
  const [now] = useState(Date.now);
  const [chosen, setChosen] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [buyFailed, setBuyFailed] = useState(false); // the last Buy failed: inline alert, the pack stays chosen, Buy is the retry
  const buyingRef = useRef(false);
  // Lifecycle token: bumped when the page is left or its route/query changes. Async steps compare it after every await.
  const life = useRef(0);
  useEffect(() => {
    life.current += 1;
    return () => {
      life.current += 1;
    };
  }, [location.pathname, location.search]);

  // Abandoned checkouts are cancelled once on open (R5); the purchase we are coming back from is kept.
  // The promise resolves to false when the sweep failed; Buy then repeats it (a failed sweep must not leave stale awaiting purchases).
  const swept = useRef<Promise<boolean> | null>(null);
  const sweep = () => services.credits.sweep(purchaseParam ? purchaseId(purchaseParam) : undefined).then(() => true, () => false);
  useEffect(() => {
    swept.current ??= services.credits.sweep(purchaseParam ? purchaseId(purchaseParam) : undefined).then(() => true, () => false);
  }, [services, purchaseParam]);

  const finished = purchase.data?.ok ? purchase.data.value : null;
  const packList = (packs.data ?? []).map((p) => ({ id: p.id, credits: p.credits, priceCents: p.price.cents, best: p.best }));
  const declinedPack = finished?.state === "declined" || finished?.state === "completed" ? finished.pack.id : null;
  const returnTo: ReturnTo = purchaseParam ? (finished?.returnTo ?? null) : urlReturn;
  const needPack = !purchaseParam && urlReturn?.kind === "new" ? packForNeed(packs.data ?? [], urlReturn.need)?.id : undefined;
  const packId = chosen ?? declinedPack ?? needPack ?? packList.find((p) => p.best)?.id ?? packList[0]?.id ?? "";
  const rows = (history.data?.rows ?? []).map(toItem);

  const projectName = urlProject.data?.name;
  const notice: CreditsNotice | null =
    buyFailed ? { kind: "buy-error" }
      : finished?.state === "completed" && account.data
      ? { kind: "success", credits: finished.pack.credits, balance: account.data.balance, slotLimit: finished.slotsBefore !== null && finished.slotsAfter !== null && finished.slotsAfter > finished.slotsBefore ? finished.slotsAfter : null }
      : finished?.state === "declined" ? { kind: "declined" }
      : purchaseParam ? null
      : urlReturn?.kind === "new" && projectName ? { kind: "shortfall", need: urlReturn.need, projectName }
      : urlReturn?.kind === "slots" && account.data ? { kind: "slots", limit: account.data.slotLimit, next: slotLimitAfterPurchase(account.data.slotLimit) }
      : null;
  const backTo = returnTo?.kind === "new" ? `/new?project=${encodeURIComponent(returnTo.projectId)}` : returnTo?.kind === "slots" ? (returnTo.from === "projects" ? "/projects" : "/new") : null;
  const slotsLine = account.data && !notice?.kind.startsWith("slots") && !(notice?.kind === "success" && notice.slotLimit !== null) && slotsOffer(account.data.slotLimit) !== "max"
    ? { limit: account.data.slotLimit, offer: slotsOffer(account.data.slotLimit) }
    : undefined;

  // a returning ?purchase=<id> is part of the page: Buy is not possible until the purchase has been read
  const readsPurchase = Boolean(purchaseParam);
  // every read the page shows takes part: the project names behind a reserve, and the project of a shortfall notice
  const needsProjects = (account.data?.reserved ?? 0) > 0;
  const readsProject = urlReturn?.kind === "new" && !purchaseParam;
  const failed = account.isError || packs.isError || history.isError || (readsPurchase && purchase.isError)
    || (needsProjects && projects.isError) || (readsProject && urlProject.isError);
  // after a completed purchase nothing is shown from an account that may predate it: wait for a read made on this page
  const awaitingAccount = finished?.state === "completed" && !account.isError && account.dataUpdatedAt < now; // polling refetches never put it back
  const pending = account.isPending || packs.isPending || history.isPending || (readsPurchase && purchase.isPending) || awaitingAccount
    || (needsProjects && projects.isPending) || (readsProject && urlProject.isPending);
  const state: CreditsViewState = failed ? "error" : pending ? "loading" : buying ? "purchasing" : rows.length === 0 ? "empty-history" : "default";

  // a queued or preparing project is exactly one that holds a reserve
  const holding = (projects.data ?? []).filter((p) => p.state === "queued" || p.state === "preparing");
  const reservedCredits = account.data?.reserved ?? 0;

  const buy = async () => {
    if (buyingRef.current || !packId) return; // repeated presses are ignored
    buyingRef.current = true;
    setBuying(true);
    setBuyFailed(false);
    const token = life.current;
    const live = () => life.current === token;
    let navigated = false;
    try {
      let clean = await swept.current;
      if (!clean) {
        swept.current = sweep();
        clean = await swept.current;
      }
      if (!live()) return;
      if (!clean) {
        setBuyFailed(true);
        return;
      }
      const result = await services.credits.startPurchase(packId, returnTo);
      if (result.ok) {
        if (live()) {
          navigated = true;
          if (purchaseParam) {
            // Back from the payment page must land on a clean Credits, not on the outcome of the previous purchase
            const clean = new URLSearchParams(params);
            clean.delete("purchase");
            const qs = clean.toString();
            navigate(`${location.pathname}${qs ? `?${qs}` : ""}`, { replace: true });
          }
          navigate(result.value.checkoutUrl); // pushed: the browser back button returns here (and cancels the payment)
        } else {
          void services.credits.cancelPurchase(result.value.id).catch(() => undefined); // the page was left: abandoned
        }
        return;
      }
      if (live()) setBuyFailed(true);
    } catch {
      if (live()) setBuyFailed(true); // the page returns to its normal state with the alert; Buy is the retry
    } finally {
      if (!navigated) {
        buyingRef.current = false;
        if (live()) setBuying(false);
      }
    }
  };

  return (
    <CreditsView
      state={state}
      balance={account.data?.balance ?? 0}
      reserved={{
        credits: reservedCredits,
        projects: reservedCredits > 0 ? holding.map((p) => ({ id: p.id, name: p.name, href: projectHref(p.id) })) : [],
      }}
      packs={packList}
      packId={packId}
      onPackChange={setChosen}
      onBuy={() => void buy()}
      notice={notice}
      onBack={backTo ? () => navigate(backTo) : undefined}
      backTo={returnTo?.kind === "slots" && returnTo.from === "projects" ? "projects" : "new"}
      slots={slotsLine}
      history={rows}
      page={page}
      pages={history.data?.pages ?? 1}
      onPage={setPage}
      onRetry={() => {
        void account.refetch();
        void packs.refetch();
        void history.refetch();
        if (readsPurchase) void purchase.refetch();
        if (needsProjects) void projects.refetch();
        if (readsProject) void urlProject.refetch();
      }}
      now={now}
    />
  );
}
