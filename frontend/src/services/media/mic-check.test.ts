import { describe, expect, it } from "vitest";
import { detectVoice, VOICE_RMS } from "./mic-check";

const initial = () => ({ startedAt: 0, lastAt: 0, lastLevel: 0, voiceMs: 0, heard: false, silent: false });

describe("microphone voice detector", () => {
  it("hears 300 ms at 0.03 but not 250 ms", () => {
    const start = detectVoice(initial(), 0.03, 0);
    expect(detectVoice(start, 0.03, 250).heard).toBe(false);
    expect(detectVoice(start, 0.03, 300).heard).toBe(true);
  });

  it("reports silence at 10 seconds below threshold", () => {
    const start = detectVoice(initial(), 0.01, 0);
    expect(detectVoice(start, 0.01, 9999).silent).toBe(false);
    expect(detectVoice(start, 0.01, 10000)).toMatchObject({ heard: false, silent: true });
  });

  it("does not report silence after voice was heard", () => {
    const heard = detectVoice(detectVoice(initial(), VOICE_RMS, 0), 0, 300);
    expect(detectVoice(heard, 0, 10000)).toMatchObject({ heard: true, silent: false });
  });

  it("adds separate voice intervals and ignores muted intervals", () => {
    let state = detectVoice(initial(), 0.03, 0);
    state = detectVoice(state, 0, 150);
    state = detectVoice(state, 0.03, 500);
    expect(detectVoice(state, 0, 650).heard).toBe(true);
    expect(detectVoice(detectVoice(initial(), 0, 0), 0, 10000).heard).toBe(false);
  });
});
