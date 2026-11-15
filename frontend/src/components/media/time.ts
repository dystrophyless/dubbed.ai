/** 0:07 · 1:04 · 12:30 — media clock (tabular numbers in UI). Fractions are floored. */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/** 1.4 → "1.4" (EN) / "1,4" (RU); whole seconds without decimals. Pass the UI language. */
export function formatSeconds(seconds: number, lang?: string): string {
  const r = Math.round(seconds * 10) / 10;
  return new Intl.NumberFormat(lang, { maximumFractionDigits: 1, minimumFractionDigits: Number.isInteger(r) ? 0 : 1 }).format(r);
}

/** Credits are 1 per started second (brief §3): 12.4 s → 13. */
export const creditsFor = (seconds: number) => Math.ceil(seconds - 1e-9);
