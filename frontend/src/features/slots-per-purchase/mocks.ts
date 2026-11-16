import { scenario, type CreditsScenario } from "@/features/credits/mocks";
import type { SlotsOffer } from "@/features/credits/slots";
import type { HistoryItem } from "@/features/credits/views/CreditsView";
import { LIFECYCLE_PROJECTS } from "@/features/recording-flow-mock/mocks";
import type { ProjectItem } from "@/features/recording-flow-mock/views/ProjectsView";

/* Demo data for the 003 prototype. Never real people or IDs. Limits follow the rule: 2, 10, 15 ... 50. */
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export type SlotsCreditsState =
  | "slots-free" | "slots-more" | "slots-more-projects"
  | "line-free" | "line-more" | "line-max"
  | "success-first" | "success-more" | "success-more-projects" | "success-plain" | "success-max" | "success-at-max";

export type SlotsCredits = CreditsScenario & { slots: { limit: number; offer: SlotsOffer }; backTo: "new" | "projects" };

const offerOf = (limit: number): SlotsOffer => (limit === 2 ? "first" : limit >= 50 ? "max" : "more");

/** Every credits state reuses the 002 history rows, so only the slots wording differs between screens. */
export function slotsCredits(state: SlotsCreditsState, now: number): SlotsCredits {
  const small = scenario("slots", now); // 14 credits, three rows, no reserve
  const bought = (credits: number, cents: number): HistoryItem => ({ id: "h9", kind: "purchase", at: now - 4 * MIN, amount: credits, credits, priceCents: cents });
  const paidRows: HistoryItem[] = [
    { id: "r2", kind: "run", at: now - 3 * HOUR, amount: -64, projectName: "Kitchen scene", runState: "charged", reserved: 0, charged: 64, returned: 0 },
    { id: "h5", kind: "purchase", at: now - 3 * DAY, amount: 1000, credits: 1000, priceCents: 900 },
    { id: "w1", kind: "welcome", at: now - 5 * DAY, amount: 120 },
  ];
  const after = (credits: number, cents: number, slotLimit: number | null, limit: number, backTo: "new" | "projects", canGoBack: boolean): SlotsCredits => ({
    ...small,
    balance: 14 + credits,
    packId: "m",
    history: [bought(credits, cents), ...paidRows],
    canGoBack,
    backTo,
    notice: { kind: "success", credits, balance: 14 + credits, slotLimit },
    slots: { limit, offer: offerOf(limit) },
  });
  const plain = (limit: number): SlotsCredits => ({ ...small, notice: null, history: paidRows, balance: 14, backTo: "new", slots: { limit, offer: offerOf(limit) } });

  switch (state) {
    case "slots-free": return { ...small, backTo: "new", notice: { kind: "slots", limit: 2, next: 10 }, slots: { limit: 2, offer: "first" } };
    case "slots-more": return { ...small, history: paidRows, backTo: "new", notice: { kind: "slots", limit: 10, next: 15 }, slots: { limit: 10, offer: "more" } };
    case "slots-more-projects": return { ...small, history: paidRows, backTo: "projects", notice: { kind: "slots", limit: 10, next: 15 }, slots: { limit: 10, offer: "more" } };
    case "line-free": return { ...plain(2), history: small.history };
    case "line-more": return plain(20);
    case "line-max": return plain(50);
    case "success-first": return { ...after(1000, 900, 10, 10, "new", false), history: [bought(1000, 900), ...small.history] };
    case "success-more": return after(1000, 900, 15, 15, "new", true);
    case "success-more-projects": return after(1000, 900, 15, 15, "projects", true);
    case "success-plain": return after(300, 300, 15, 15, "new", false);
    case "success-max": return after(1000, 900, 50, 50, "new", true);
    case "success-at-max": return after(1000, 900, null, 50, "new", false);
  }
}

/** Where the demo's Buy leads (the real flow goes through the payment page and `?purchase=`). */
export const NEXT_AFTER_BUY: Partial<Record<SlotsCreditsState, SlotsCreditsState>> = {
  "slots-free": "success-first",
  "slots-more": "success-more",
  "slots-more-projects": "success-more-projects",
  "line-free": "success-first",
  "line-more": "success-plain",
  "line-max": "success-at-max",
};

/** `n` projects for a full account (the lifecycle fixtures repeated). */
export const manyProjects = (n: number): ProjectItem[] =>
  Array.from({ length: n }, (_, i) => {
    const src = LIFECYCLE_PROJECTS[i % LIFECYCLE_PROJECTS.length]!;
    return i < LIFECYCLE_PROJECTS.length ? src : { ...src, id: `${src.id}-${i}`, name: `${src.name} ${i + 1}` };
  });
