import { describe, expect, it } from "vitest";
import { projectId, type HistoryRow } from "../contracts";
import { balanceFromHistory, minutesOf, PACKS, packForNeed, runAfter, runAmount } from "./credits";

describe("credits rules", () => {
  it("selects packs for shortfalls or the best pack", () => {
    for (const [need, credits] of [[9, 300], [32, 300], [301, 1000], [5000, 3000]]) {
      expect(packForNeed(PACKS, need)?.credits).toBe(credits);
    }
    expect(packForNeed(PACKS)?.credits).toBe(1000);
    expect(packForNeed([], 9)).toBeUndefined();
    expect(packForNeed([...PACKS].reverse(), 301)?.credits).toBe(1000);
  });
  it("rounds minutes down", () => {
    expect(minutesOf(59)).toBe(0);
    expect(minutesOf(983)).toBe(16);
  });
  it("maps every run event and its amount", () => {
    const cases = [
      [runAfter("start", 73), { reserved: 73, charged: 0, returned: 0, state: "reserved" }, -73],
      [runAfter("settle", 73), { reserved: 0, charged: 73, returned: 0, state: "charged" }, -73],
      [runAfter("cancel-waiting", 73), { reserved: 0, charged: 0, returned: 73, state: "returned" }, 0],
      [runAfter("cancel-after-steps", 73, 20), { reserved: 0, charged: 20, returned: 53, state: "partly_charged" }, -20],
      [runAfter("failure", 73), { reserved: 0, charged: 0, returned: 73, state: "failed_returned" }, 0],
    ] as const;
    for (const [actual, expected, amount] of cases) {
      expect(actual).toEqual(expected);
      expect(runAmount(actual)).toBe(amount);
    }
  });
  it("sums history to the spendable balance", () => {
    const run = runAfter("start", 73);
    const rows: HistoryRow[] = [
      { id: "welcome", kind: "welcome", at: 0, amount: 120 },
      { id: "run", kind: "run", at: 1, updatedAt: 1, amount: runAmount(run), projectId: projectId("p"), projectName: "Scene", ...run },
    ];
    expect(balanceFromHistory(rows)).toBe(47);
  });
});
