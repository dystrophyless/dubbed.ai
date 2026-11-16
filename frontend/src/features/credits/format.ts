/** Prices are USD in both languages: "$9", "$2.50" (never «9 $»). */
export function formatMoney(cents: number): string {
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(cents / 100);
}

/**
 * Clock for history times: the words / digits follow the UI language, the 12 / 24-hour cycle follows the user's own
 * browser locale (navigator.language: en-US -> 12-hour, en-GB / ru -> 24-hour). Browsers do not expose the OS 12/24 h switch itself.
 */
export function timeFormatter(uiLang: string | undefined): Intl.DateTimeFormat {
  const hourCycle = new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions().hourCycle;
  return new Intl.DateTimeFormat(uiLang, { hour: "2-digit", minute: "2-digit", hourCycle });
}

/** 1 credit = 1 second; whole minutes, rounded down (spec FR-003). */
export function minutesOf(credits: number): number {
  return Math.floor(credits / 60);
}
