import { describe, expect, it } from "vitest";
import { parseDemo } from "./index";

describe("parseDemo", () => {
  it("parses auth presets and rejects unrelated arguments", () => {
    expect(parseDemo("signin", undefined)).toEqual({ signin: true });
    expect(parseDemo("signout", undefined)).toEqual({ signout: true });
    expect(parseDemo("code", "expire")).toEqual({ codeExpire: true });
    expect(parseDemo("fail", "auth")).toEqual({ failAuth: true });
    expect(parseDemo("google", "fail")).toEqual({ googleFail: true });
    expect(parseDemo("signin", "other")).toBeNull();
    expect(parseDemo("code", "other")).toBeNull();
    expect(parseDemo("google", "other")).toBeNull();
  });
  it("keeps balance and turns finite whole numbers", () => {
    expect(parseDemo("balance", "Infinity")).toEqual({ balance: 0 });
    expect(parseDemo("balance", "40.5")).toEqual({ balance: 40 });
    expect(parseDemo("balance", "-3")).toEqual({ balance: 0 });
    expect(parseDemo("turns", "abc")).toEqual({ turns: 0 });
    expect(parseDemo("turns", "6.9")).toEqual({ turns: 6 });
  });
  it("parses payment outcomes and finite non-negative payment delays", () => {
    expect(parseDemo("payment", "success")).toEqual({ payment: "success" });
    expect(parseDemo("payment", "declined")).toEqual({ payment: "declined" });
    expect(parseDemo("payment", "other")).toBeNull();
    expect(parseDemo("paydelay", "1200.9")).toEqual({ paymentDelayMs: 1200 });
    expect(parseDemo("paydelay", "0")).toEqual({ paymentDelayMs: 0 });
    for (const value of [undefined, "", "Infinity", "NaN", "-1"]) expect(parseDemo("paydelay", value)).toBeNull();
  });
  it("accepts every valid slot limit and the full preset, rejecting invalid limits", () => {
    for (const slotLimit of [2, 10, 15, 20, 25, 30, 35, 40, 45, 50]) {
      expect(parseDemo("slots", String(slotLimit))).toEqual({ slotLimit });
    }
    expect(parseDemo("slots", "full")).toEqual({ fillSlots: true });
    for (const arg of [undefined, "", "0", "3", "5", "12", "15.5", "55", "Infinity", "NaN"]) {
      expect(parseDemo("slots", arg)).toBeNull();
    }
  });
  it("clamps speed and checks turnms", () => {
    expect(parseDemo("speed", "Infinity")).toEqual({ speed: 1 });
    expect(parseDemo("speed", "1000")).toEqual({ speed: 100 });
    expect(parseDemo("speed", "0")).toEqual({ speed: 0.1 });
    expect(parseDemo("speed", undefined)).toEqual({ speed: 1 });
    expect(parseDemo("speed", "4")).toEqual({ speed: 4 });
    expect(parseDemo("turnms", "700.8")).toEqual({ turnMs: 700 });
    expect(parseDemo("turnms", "Infinity")).toBeNull();
    expect(parseDemo("nope", "1")).toBeNull();
  });
});
