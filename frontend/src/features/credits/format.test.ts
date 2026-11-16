import { afterEach, describe, expect, it, vi } from "vitest";
import { formatMoney, minutesOf, timeFormatter } from "./format";

const DateTimeFormat = Intl.DateTimeFormat;

function browserLocale(locale: string) {
  vi.spyOn(Intl, "DateTimeFormat").mockImplementation((function (locales, options) {
    return new DateTimeFormat(locales === undefined ? locale : locales, options);
  }) as typeof Intl.DateTimeFormat);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("credits formatting", () => {
  it.each([
    ["en", "en-US", "h12"],
    ["en", "en-GB", "h23"],
    ["ru", "en-US", "h12"],
    ["ru", "ru-RU", "h23"],
  ] as const)("formats %s UI times using the %s browser clock", (ui, browser, cycle) => {
    browserLocale(browser);
    const date = new Date(2026, 10, 15, 18, 20);
    const formatter = timeFormatter(ui);
    const expected = new DateTimeFormat(ui, { hour: "2-digit", minute: "2-digit", hourCycle: cycle }).format(date);
    expect(formatter.format(date)).toBe(expected);
    expect(formatter.resolvedOptions().locale).toMatch(new RegExp(`^${ui}`));
    expect(formatter.resolvedOptions().hourCycle).toBe(cycle);
  });

  it("formats USD prices independently of UI language", () => {
    expect(formatMoney(900)).toBe("$9");
    expect(formatMoney(250)).toBe("$2.50");
  });

  it("rounds credit minutes down", () => {
    expect(minutesOf(59)).toBe(0);
    expect(minutesOf(60)).toBe(1);
    expect(minutesOf(119)).toBe(1);
  });
});
