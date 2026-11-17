import { MicrophoneError } from "./browser-media";

export const VOICE_RMS = 0.02;

type Detector = { startedAt: number; lastAt: number; lastLevel: number; voiceMs: number; heard: boolean; silent: boolean };

/** Advance the detector using the preceding sample's level over the elapsed interval. */
export function detectVoice(state: Detector, level: number, at: number): Detector {
  const voiceMs = state.voiceMs + (state.lastLevel >= VOICE_RMS ? Math.max(0, at - state.lastAt) : 0);
  const heard = state.heard || voiceMs >= 300;
  return { ...state, lastAt: at, lastLevel: level, voiceMs, heard, silent: !heard && at - state.startedAt >= 10_000 };
}

export async function openMicCheck(deviceId?: string) {
  if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) throw new MicrophoneError("mic-missing");
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: deviceId ? { deviceId: { ideal: deviceId } } : true });
  } catch (error) {
    const name = error instanceof DOMException ? error.name : "";
    throw new MicrophoneError(name === "NotFoundError" || name === "OverconstrainedError" ? "mic-missing" : "mic-blocked");
  }
  let context: AudioContext | undefined;
  try {
    const startedAt = performance.now();
    const devices = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === "audioinput");
    context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    context.createMediaStreamSource(stream).connect(analyser);
    await context.resume();
    const data = new Float32Array(analyser.fftSize);
    let detector: Detector = { startedAt, lastAt: startedAt, lastLevel: 0, voiceMs: 0, heard: false, silent: false };
    let levelCallback: (level: number) => void = () => undefined;
    let voiceCallback: () => void = () => undefined;
    let silentCallback: () => void = () => undefined;
    let frame = 0;
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      analyser.getFloatTimeDomainData(data);
      let sum = 0;
      for (const sample of data) sum += sample * sample;
      const level = Math.min(1, Math.sqrt(sum / data.length));
      const previous = detector;
      detector = detectVoice(detector, level, performance.now());
      levelCallback(level);
      if (!previous.heard && detector.heard) voiceCallback();
      if (!previous.silent && detector.silent) silentCallback();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const audioContext = context;
    return {
      devices,
      deviceId: stream.getAudioTracks()[0]?.getSettings().deviceId ?? "",
      onLevel(cb: (level: number) => void) { levelCallback = cb; },
      onVoice(cb: () => void) { voiceCallback = cb; },
      onSilent(cb: () => void) { silentCallback = cb; },
      stop() {
        if (stopped) return;
        stopped = true;
        cancelAnimationFrame(frame);
        stream.getTracks().forEach((track) => track.stop());
        void audioContext.close().catch(() => undefined);
      },
    };
  } catch {
    stream.getTracks().forEach((track) => track.stop());
    await context?.close().catch(() => undefined);
    throw new MicrophoneError("mic-missing");
  }
}
