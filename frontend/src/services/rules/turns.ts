import type { Section } from "../contracts";

/*
 * Demo preparation (research R4): split the chosen section into N turns with 2.5–4.5 s windows spread across it.
 * N = clamp(round(section / 4.5 s), 1, 40); a section shorter than 2 s has no dialogue.
 */

export const MAX_TURNS = 40;

export const DEMO_LINES: { en: string; ru: string }[] = [
  { en: "Don't look at me like that. I only borrowed it.", ru: "Не смотри на меня так. Я его только одолжил." },
  { en: "[laughs] You always say that.", ru: "[смеётся] Ты всегда так говоришь." },
  { en: "Then where is it now?", ru: "Тогда где он сейчас?" },
  { en: "Somewhere safe. Trust me.", ru: "В надёжном месте. Поверь мне." },
  { en: "[sighs] That's what worries me.", ru: "[вздыхает] Вот это меня и тревожит." },
  { en: "We leave at sunrise, with or without it.", ru: "Уходим на рассвете — с ним или без него." },
  { en: "Fine. Give me one more night.", ru: "Ладно. Дай мне ещё одну ночь." },
  { en: "One night. Not a minute more.", ru: "Одну ночь. Ни минутой больше." },
];

export type TurnPlan = { n: number; startMs: number; windowMs: number; text: { en: string; ru: string } };

export function turnCount(section: Section, forced = 0): number {
  if (!Number.isInteger(forced) || forced < 0) throw new RangeError("turn count must be a positive integer (0 = automatic)");
  const len = section.endMs - section.startMs;
  if (len < 2_000) return 0;
  if (forced > 0) return Math.min(MAX_TURNS, forced);
  return Math.max(1, Math.min(MAX_TURNS, Math.round(len / 4_500)));
}

export function planTurns(section: Section, forced = 0, turnMs = 0): TurnPlan[] {
  const n = turnCount(section, forced);
  const len = section.endMs - section.startMs;
  const slot = len / Math.max(1, n);
  return Array.from({ length: n }, (_, i) => {
    // deterministic window length per turn: 2.5–4.5 s, never longer than its share of the section
    const wanted = 2_500 + ((i * 7) % 5) * 500;
    const windowMs = Math.min(turnMs > 0 ? turnMs : wanted, Math.floor(slot));
    const startMs = Math.round(section.startMs + i * slot + (slot - windowMs) / 2);
    return { n: i + 1, startMs, windowMs, text: DEMO_LINES[i % DEMO_LINES.length]! };
  });
}
