import { beforeEach, describe, expect, it } from "vitest";
import type { HistoryRow } from "../contracts";
import { PACKS } from "../rules/credits";
import * as db from "./db";
import { createMockServices } from "./index";

describe("mock credits catalog and history", () => {
  const services = createMockServices();
  beforeEach(async () => {
    await db.write(["history"], (s) => { s.history.clear(); });
  });

  it("returns the packs", async () => {
    expect(await services.credits.packs()).toEqual(PACKS);
  });

  it("pages 45 rows newest first", async () => {
    const rows: HistoryRow[] = Array.from({ length: 45 }, (_, at) => ({ id: String(at), kind: "adjustment", at, amount: 1 }));
    await db.write(["history"], (s) => { for (const row of rows) s.history.put(row); });
    const sorted = [...rows].reverse();
    for (const page of [1, 2, 3]) {
      expect(await services.credits.history(page)).toEqual({ rows: sorted.slice((page - 1) * 20, page * 20), page, pages: 3 });
    }
  });

  it("returns one empty page for an empty store", async () => {
    expect(await services.credits.history(1)).toEqual({ rows: [], page: 1, pages: 1 });
  });
});
