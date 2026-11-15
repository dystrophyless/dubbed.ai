/*
 * Waveform display gain (owner decision 2026-11-12): waveforms are normalised for display so quiet audio stays readable;
 * the audio itself is never changed, and take peaks keep showing the real level.
 */

/** A clip whose loudest peak is below this is treated as silence: it is not amplified into noise. */
export const SILENCE_FLOOR = 0.01;
/** The loudest peak of the clip is drawn at this height. */
const TARGET_PEAK = 0.9;
/** Never amplify more than this (a nearly silent clip stays nearly flat). */
const MAX_GAIN = 60;

/** Display gain for a clip: scales its loudest peak to TARGET_PEAK; never attenuates, never amplifies silence. */
export function displayGain(peaks: number[][]): number {
  let max = 0;
  for (const run of peaks) for (const p of run) if (p > max) max = p;
  if (max < SILENCE_FLOOR) return 1;
  return Math.min(MAX_GAIN, Math.max(1, TARGET_PEAK / max));
}

/** Peaks scaled for display (clamped to 1). */
export function applyDisplayGain(peaks: number[], gain: number): number[] {
  return gain === 1 ? peaks : peaks.map((p) => Math.min(1, p * gain));
}
