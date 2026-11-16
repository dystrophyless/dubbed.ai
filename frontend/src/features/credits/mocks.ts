import type { CreditsNotice, HistoryItem, PackItem } from "./views/CreditsView";

/* Demo data for the Credits prototype. Placeholder packs follow the approved template (brief §5). Never real people or IDs. */
export const DEMO_PACKS: PackItem[] = [
  { id: "s", credits: 300, priceCents: 300 },
  { id: "m", credits: 1000, priceCents: 900, best: true },
  { id: "l", credits: 3000, priceCents: 2400 },
];

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const PROCESSING = "/prototypes/processing/page?state=running";

export type CreditsScenario = {
  balance: number;
  reserved: { credits: number; projects: { id: string; name: string; href: string }[] };
  history: HistoryItem[];
  pages: number;
  packId: string;
  notice: CreditsNotice | null;
  canGoBack: boolean;
};

/*
 * Every scripted case keeps the invariant of spec FR-011:
 *   balance = Σ history amounts, and balance + reserved = welcome + purchases ± adjustments − charged.
 * Full history (every row kind): 120 + 1000 + 50 − 73 (reserve) − 64 − 20 − 30 = 983 spendable, 73 in reserve.
 */
export function scenario(name: string, now: number): CreditsScenario {
  const reserveRun: HistoryItem = {
    id: "r1", kind: "run", at: now - 12 * MIN, amount: -73,
    projectName: "Rooftop argument", runState: "reserved", reserved: 73, charged: 0, returned: 0, projectHref: PROCESSING,
  };
  const full: HistoryItem[] = [
    reserveRun,
    { id: "r2", kind: "run", at: now - DAY - 2 * HOUR, amount: -64, projectName: "Kitchen scene", runState: "charged", reserved: 0, charged: 64, returned: 0 },
    { id: "r3", kind: "run", at: now - DAY - 5 * HOUR, amount: -20, projectName: "Bus stop", runState: "partly_charged", reserved: 0, charged: 20, returned: 53 },
    { id: "r4", kind: "run", at: now - 2 * DAY, amount: 0, projectName: "Lighthouse call", runState: "returned", reserved: 0, charged: 0, returned: 58 },
    { id: "h5", kind: "purchase", at: now - 3 * DAY, amount: 1000, credits: 1000, priceCents: 900 },
    { id: "r5", kind: "run", at: now - 3 * DAY - 3 * HOUR, amount: -30, projectName: "Silent film test", runState: "charged", reserved: 0, charged: 30, returned: 0 },
    { id: "r6", kind: "run", at: now - 4 * DAY, amount: 0, projectName: "A very long file name from a phone camera 2026-11-02 final cut v7 export", runState: "failed_returned", reserved: 0, charged: 0, returned: 81 },
    { id: "a1", kind: "adjustment", at: now - 4 * DAY - HOUR, amount: 50 },
    { id: "w1", kind: "welcome", at: now - 5 * DAY, amount: 120 },
  ];
  const reserved = { credits: 73, projects: [{ id: "p-preparing", name: "Rooftop argument", href: PROCESSING }] };
  const base: CreditsScenario = { balance: 983, reserved, history: full, pages: 3, packId: "m", notice: null, canGoBack: false };

  switch (name) {
    case "empty-history":
      return { ...base, history: [], pages: 1, balance: 0, reserved: { credits: 0, projects: [] } };
    case "declined":
      return { ...base, notice: { kind: "declined" } };
    case "buy-error":
      return { ...base, notice: { kind: "buy-error" } };
    case "success": {
      const bought: HistoryItem = { id: "h9", kind: "purchase", at: now - 4 * MIN, amount: 1000, credits: 1000, priceCents: 900 };
      return { ...base, balance: 1983, history: [bought, ...full], notice: { kind: "success", credits: 1000, balance: 1983, firstPurchase: false, slotLimit: 10 } };
    }
    case "success-first": {
      const bought: HistoryItem = { id: "h9", kind: "purchase", at: now - 4 * MIN, amount: 300, credits: 300, priceCents: 300 };
      const welcome: HistoryItem = { id: "w1", kind: "welcome", at: now - 2 * DAY, amount: 120 };
      return {
        ...base, balance: 420, packId: "s", reserved: { credits: 0, projects: [] }, history: [bought, welcome], pages: 1,
        notice: { kind: "success", credits: 300, balance: 420, firstPurchase: true, slotLimit: 10 },
      };
    }
    case "success-return": {
      const bought: HistoryItem = { id: "h9", kind: "purchase", at: now - 4 * MIN, amount: 300, credits: 300, priceCents: 300 };
      const hist: HistoryItem[] = [
        bought,
        { id: "r2", kind: "run", at: now - 3 * HOUR, amount: -80, projectName: "Kitchen scene", runState: "charged", reserved: 0, charged: 80, returned: 0 },
        { id: "w1", kind: "welcome", at: now - 2 * DAY, amount: 120 },
      ];
      return {
        ...base, balance: 340, packId: "s", reserved: { credits: 0, projects: [] }, history: hist, pages: 1, canGoBack: true,
        notice: { kind: "success", credits: 300, balance: 340, firstPurchase: false, slotLimit: 10 },
      };
    }
    case "shortfall":
      return {
        ...base, balance: 40, packId: "s", reserved: { credits: 0, projects: [] }, pages: 1,
        history: [
          { id: "r2", kind: "run", at: now - 3 * HOUR, amount: -80, projectName: "Kitchen scene", runState: "charged", reserved: 0, charged: 80, returned: 0 },
          { id: "w1", kind: "welcome", at: now - 2 * DAY, amount: 120 },
        ],
        notice: { kind: "shortfall", need: 32, projectName: "Rooftop argument" },
      };
    case "slots":
      return {
        ...base, balance: 14, reserved: { credits: 0, projects: [] }, pages: 1,
        history: [
          { id: "r2", kind: "run", at: now - 3 * HOUR, amount: -64, projectName: "Kitchen scene", runState: "charged", reserved: 0, charged: 64, returned: 0 },
          { id: "r3", kind: "run", at: now - DAY, amount: -42, projectName: "Train station", runState: "charged", reserved: 0, charged: 42, returned: 0 },
          { id: "w1", kind: "welcome", at: now - 2 * DAY, amount: 120 },
        ],
        notice: { kind: "slots", slotLimit: 10 },
      };
    case "zero-balance":
      return {
        ...base, balance: 0, reserved: { credits: 0, projects: [] }, pages: 1,
        history: [
          { id: "r2", kind: "run", at: now - 3 * HOUR, amount: -64, projectName: "Kitchen scene", runState: "charged", reserved: 0, charged: 64, returned: 0 },
          { id: "r3", kind: "run", at: now - DAY, amount: -56, projectName: "Train station", runState: "charged", reserved: 0, charged: 56, returned: 0 },
          { id: "w1", kind: "welcome", at: now - 2 * DAY, amount: 120 },
        ],
      };
    default:
      return base;
  }
}

/** Page 2 / 3 of the default history (older rows), so paging is reachable in the prototype. */
export function olderHistory(page: number, now: number): HistoryItem[] {
  return Array.from({ length: 6 }, (_, i) => ({
    id: `old-${page}-${i}`,
    kind: "run" as const,
    at: now - (page * 6 + i) * DAY,
    amount: -(20 + i * 7),
    projectName: ["Harbour at dawn", "Night market", "Train station", "Bus stop", "Kitchen scene", "Lighthouse call"][i],
    runState: "charged" as const,
    reserved: 0,
    charged: 20 + i * 7,
    returned: 0,
  }));
}

export const DEMO_CHECKOUT_PACK = { credits: 1000, priceCents: 900 };
