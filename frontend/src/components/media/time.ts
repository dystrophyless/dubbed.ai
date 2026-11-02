/** 0:07 · 1:04 · 12:30 — media clock (tabular numbers in UI). Fractions are floored. */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/** 1.4 → "1.4 s"; whole seconds without decimals. */
export function formatSeconds(seconds: number): string {
  const r = Math.round(seconds * 10) / 10;
  return Number.isInteger(r) ? `${r}` : r.toFixed(1);
}

/** Credits are 1 per started second (brief §3): 12.4 s → 13. */
export const creditsFor = (seconds: number) => Math.ceil(seconds - 1e-9);
