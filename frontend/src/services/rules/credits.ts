import type { CreditPack, HistoryRow, RunState } from "../contracts";

export const PACKS: CreditPack[] = [
  { id: "s", credits: 300, price: { cents: 300, currency: "USD" }, best: false },
  { id: "m", credits: 1000, price: { cents: 900, currency: "USD" }, best: true },
  { id: "l", credits: 3000, price: { cents: 2400, currency: "USD" }, best: false },
];

export const minutesOf = (credits: number) => Math.floor(credits / 60);

export function packForNeed(packs: CreditPack[], need?: number): CreditPack | undefined {
  if (need === undefined) return packs.find((p) => p.best);
  const sorted = [...packs].sort ( (a, b) => a.credits - b.credits );
  return sorted.find((p) => p.credits >= need) ?? sorted.at(-1);
}

type RunEvent = "start" | "settle" | "cancel-waiting" | "cancel-after-steps" | "failure";
type RunMoney = { reserved: number; charged: number; returned: number; state: RunState };
export function runAfter(event: RunEvent, price: number, charge = 0): RunMoney {
  switch (event) {
    case "start": return { reserved: price, charged: 0, returned: 0, state: "reserved" };
    case "settle": return { reserved: 0, charged: price, returned: 0, state: "charged" };
    case "cancel-waiting": return { reserved: 0, charged: 0, returned: price, state: "returned" };
    case "cancel-after-steps": return { reserved: 0, charged: charge, returned: price - charge, state: "partly_charged" };
    case "failure": return { reserved: 0, charged: 0, returned: price, state: "failed_returned" };
  }
}
export const runAmount = (row: Pick<RunMoney, "reserved" | "charged">) => 0 - (row.reserved + row.charged);
export const balanceFromHistory = (rows: HistoryRow[]) => rows.reduce((sum, row) => sum + row.amount, 0);
