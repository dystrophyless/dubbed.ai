import { describe, expect, it } from "vitest";
import { cancel, cancelCharge, NotEnoughCredits, refund, reserve, settle } from "./money";
import { defaultSection, isValidSection, nameFromFile, priceOf } from "./pricing";
import { canCreate, canReplaceVideo } from "./slots";
import { prepStatus, redirectTarget, turnsFoundAt, type PrepRun } from "./lifecycle";
import { planTurns, turnCount } from "./turns";
import { applyDisplayGain, displayGain } from "./waveform";

describe("waveform display gain", () => {
  it("scales a quiet clip so its loudest peak reaches 0.9, never past 1", () => {
    const g = displayGain([[0.002, 0.02], [0.01]]);
    expect(g).toBeCloseTo(45);
    const out = applyDisplayGain([0.002, 0.02, 0.5], g);
    expect(out[0]).toBeCloseTo(0.09);
    expect(out[1]).toBeCloseTo(0.9);
    expect(out[2]).toBe(1);
  });
  it("leaves silence flat and loud audio as it is", () => {
    expect(displayGain([[0, 0.004]])).toBe(1);
    expect(displayGain([[0.2, 0.95]])).toBe(1);
    expect(applyDisplayGain([0.1], 1)).toEqual([0.1]);
  });
});

describe("dense turn planning", () => {
  it.each([0, 4500])("keeps 40 windows inside a 2000 ms section with turnMs=%s", (turnMs) => {
    const section = { startMs: 1000, endMs: 3000 };
    const turns = planTurns(section, 40, turnMs);
    expect(turns).toHaveLength(40);
    turns.forEach((turn, i) => {
      expect(turn.windowMs).toBeLessThanOrEqual(50);
      expect(turn.startMs).toBeGreaterThanOrEqual(section.startMs);
      expect(turn.startMs + turn.windowMs).toBeLessThanOrEqual(section.endMs);
      if (i > 0) expect(turn.startMs).toBeGreaterThanOrEqual(turns[i - 1]!.startMs + turns[i - 1]!.windowMs);
    });
  });
  it.each([-1, 1.5, NaN, Infinity])("rejects invalid forced count %s", (count) => {
    expect(() => planTurns({ startMs: 0, endMs: 2000 }, count)).toThrow(RangeError);
  });
});

describe("pricing", () => {
  it("charges 1 credit per started second", () => {
    expect(priceOf({ startMs: 0, endMs: 72_300 })).toBe(73);
    expect(priceOf({ startMs: 0, endMs: 13_000 })).toBe(13);
  });
  it("defaults to 0–2:00 for a 4:12 video and the whole video when short", () => {
    expect(defaultSection(252_000)).toEqual({ startMs: 0, endMs: 120_000 });
    expect(priceOf(defaultSection(252_000))).toBe(120);
    expect(defaultSection(13_000)).toEqual({ startMs: 0, endMs: 13_000 });
  });
  it("keeps sections between 1 s and 120 s", () => {
    expect(isValidSection({ startMs: 0, endMs: 999 }, 10_000)).toBe(false);
    expect(isValidSection({ startMs: 0, endMs: 1_000 }, 10_000)).toBe(true);
    expect(isValidSection({ startMs: 0, endMs: 120_001 }, 200_000)).toBe(false);
  });
  it("names the project from the file", () => {
    expect(nameFromFile("kitchen_scene-final.v2.mp4")).toBe("Kitchen scene final v2");
    expect(nameFromFile("scene.mp4")).toBe("Scene");
  });
});

describe("money", () => {
  const total = (a: { balance: number; reserved: number }, p: { charged: number }) => a.balance + a.reserved + p.charged;

  it("reserves, then settles on delivery without creating credits", () => {
    const [a1, p1] = reserve({ balance: 120, reserved: 0 }, { reserved: 0, charged: 0 }, 73);
    expect(a1).toEqual({ balance: 47, reserved: 73 });
    const [a2, p2] = settle(a1, p1);
    expect(a2).toEqual({ balance: 47, reserved: 0 });
    expect(p2.charged).toBe(73);
    expect(total(a2, p2)).toBe(120);
  });
  it("refuses to start without enough credits", () => {
    expect(() => reserve({ balance: 40, reserved: 0 }, { reserved: 0, charged: 0 }, 72)).toThrow(NotEnoughCredits);
  });
  it("refunds the whole reserve on failure", () => {
    const [a1, p1] = reserve({ balance: 120, reserved: 0 }, { reserved: 0, charged: 0 }, 13);
    const [a2, p2] = refund(a1, p1);
    expect(a2).toEqual({ balance: 120, reserved: 0 });
    expect(p2).toEqual({ reserved: 0, charged: 0 });
  });
  it("charges only finished steps on cancel", () => {
    expect(cancelCharge(94, 0)).toBe(0);
    expect(cancelCharge(94, 1)).toBe(24);
    expect(cancelCharge(94, 2)).toBe(66);
    const [a1, p1] = reserve({ balance: 120, reserved: 0 }, { reserved: 0, charged: 0 }, 94);
    const [a2, p2] = cancel(a1, p1, cancelCharge(94, 1));
    expect(a2).toEqual({ balance: 96, reserved: 0 });
    expect(p2.charged).toBe(24);
    expect(total(a2, p2)).toBe(120);
  });
});

describe("slots", () => {
  it("blocks a third project on the free plan", () => {
    expect(canCreate(["draft"], 2)).toBe(true);
    expect(canCreate(["draft", "done"], 2)).toBe(false);
    expect(canCreate(["draft", "done"], 10)).toBe(true);
  });
  it("lets a draft or a no-dialogue project take another video in the same slot", () => {
    expect(canReplaceVideo("draft")).toBe(true);
    expect(canReplaceVideo("no_dialogue")).toBe(true);
    expect(canReplaceVideo("recording")).toBe(false);
    expect(canReplaceVideo("failed")).toBe(false);
  });
});

describe("lifecycle", () => {
  const run: PrepRun = { startedAt: 0, fromStep: 1, queued: true, outcome: "ready", speed: 1 };
  it("goes queued → steps 1–3 → ready", () => {
    expect(prepStatus(run, 1_000).phase).toBe("queued");
    expect(prepStatus(run, 3_000)).toMatchObject({ phase: "preparing", step: 1, stepsDone: 0 });
    expect(prepStatus(run, 7_000)).toMatchObject({ phase: "preparing", step: 2, stepsDone: 1 });
    expect(prepStatus(run, 12_000)).toMatchObject({ phase: "preparing", step: 3, stepsDone: 2 });
    expect(prepStatus(run, 15_000)).toMatchObject({ phase: "ready", at: 15_000 });
  });
  it("fails in the middle of the chosen step and resumes there", () => {
    const failing = { ...run, outcome: "failed@2" as const };
    expect(prepStatus(failing, 8_000).phase).toBe("preparing");
    expect(prepStatus(failing, 9_000)).toMatchObject({ phase: "failed", step: 2 });
    const resumed: PrepRun = { startedAt: 20_000, fromStep: 2, queued: false, outcome: "ready", speed: 1 };
    expect(prepStatus(resumed, 20_100)).toMatchObject({ phase: "preparing", step: 2, stepsDone: 1 });
    expect(prepStatus(resumed, 29_000).phase).toBe("ready");
  });
  it("reports no dialogue at the end", () => {
    expect(prepStatus({ ...run, outcome: "no-dialogue" }, 20_000).phase).toBe("no_dialogue");
  });
  it("counts turns found from step 2", () => {
    expect(turnsFoundAt(prepStatus(run, 3_000), 12)).toBe(0);
    expect(turnsFoundAt(prepStatus(run, 9_000), 12)).toBeGreaterThan(0);
    expect(turnsFoundAt(prepStatus(run, 20_000), 12)).toBe(12);
  });
  it("redirects by state", () => {
    expect(redirectTarget("p1", "preparing", null)).toBe("/projects/p1/processing");
    expect(redirectTarget("p1", "recording", 3)).toBe("/projects/p1/turns/3");
    expect(redirectTarget("p1", "done", null)).toBe("/projects/p1/result");
    expect(redirectTarget("p1", "draft", null)).toBe("/new");
  });
});

describe("turns", () => {
  it("splits the 13 s demo scene into 3 turns inside the section", () => {
    const section = { startMs: 0, endMs: 13_000 };
    const turns = planTurns(section);
    expect(turns).toHaveLength(3);
    for (const t of turns) {
      expect(t.startMs).toBeGreaterThanOrEqual(0);
      expect(t.startMs + t.windowMs).toBeLessThanOrEqual(13_000);
      expect(t.windowMs).toBeGreaterThanOrEqual(2_500);
    }
  });
  it("uses the demo turn window without exceeding each slot", () => {
    const section = { startMs: 0, endMs: 13_000 };
    expect(planTurns(section, 1, 8_000)[0]?.windowMs).toBe(8_000);
    expect(planTurns(section, 1, 30_000)[0]?.windowMs).toBe(13_000);
    expect(planTurns(section, 1)[0]?.windowMs).toBe(2_500);
  });
  it("caps at 40 turns and finds none under 2 s", () => {
    expect(turnCount({ startMs: 0, endMs: 120_000 }, 99)).toBe(40);
    expect(turnCount({ startMs: 0, endMs: 1_500 })).toBe(0);
    expect(planTurns({ startMs: 0, endMs: 13_000 }, 6)).toHaveLength(6);
  });
});
