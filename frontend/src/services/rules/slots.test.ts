import { describe, expect, it } from "vitest";
import { FREE_SLOT_LIMIT, isSlotLimit, slotLimitAfterPurchase, slotLimitForPurchases, slotsOffer } from "./slots";

describe("slot rules", () => {
  it("derives the same limit from repeated purchases and the purchase count", () => {
    const limits = [2, 10, 15, 20, 25, 30, 35, 40, 45, 50, 50, 50, 50];
    let limit = FREE_SLOT_LIMIT;
    for (let n = 0; n <= 12; n += 1) {
      expect(limit).toBe(limits[n]);
      expect(slotLimitForPurchases(n)).toBe(limit);
      limit = slotLimitAfterPurchase(limit);
    }
  });

  it("recognizes only valid limits", () => {
    for (const limit of [2, 10, 15, 50]) expect(isSlotLimit(limit)).toBe(true);
    for (const limit of [0, 3, 5, 12, 55]) expect(isSlotLimit(limit)).toBe(false);
  });

  it("describes the next purchase offer", () => {
    expect(slotsOffer(2)).toBe("first");
    expect(slotsOffer(10)).toBe("more");
    expect(slotsOffer(45)).toBe("more");
    expect(slotsOffer(50)).toBe("max");
  });
});
