/*
 * Browser media helpers re-imported from _carryover/frontend-services/services/browser-media/NativeBrowserMedia.ts
 * (research R1): fixed-window microphone capture with live peaks, waveform decoding and a video probe.
 * Adapted to the 001 contract: no manifest hashing; decoding works on the user's own uploaded video Blob.
 */

export type CaptureResult = {
  blob: Blob;
  mimeType: string;
  elapsedMs: number;
  endReason: "fixed-window" | "stopped" | "interrupted";
  peaks: number[];
};

export type VideoProbe = { durationMs: number; width: number; height: number };

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4;codecs=mp4a.40.2", "audio/mp4"];
export const PEAK_BARS = 64;

function preferredMimeType(): string | undefined {
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
}

function peakFromTimeData(data: Uint8Array): number {
  let peak = 0;
  for (const sample of data) peak = Math.max(peak, Math.abs(sample - 128) / 128);
  return Number(peak.toFixed(3));
}

export function waveformRange(buffer: AudioBuffer, startMs: number, endMs: number, bars = PEAK_BARS): number[] {
  const start = Math.max(0, Math.floor((startMs / 1000) * buffer.sampleRate));
  const end = Math.min(buffer.length, Math.ceil((endMs / 1000) * buffer.sampleRate));
  if (end <= start) return Array.from({ length: bars }, () => 0);
  return Array.from({ length: bars }, (_, bar) => {
    const first = start + Math.floor(((end - start) * bar) / bars);
    const last = Math.min(end, Math.max(first + 1, start + Math.floor(((end - start) * (bar + 1)) / bars)));
    let peak = 0;
    for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
      const data = buffer.getChannelData(ch);
      for (let i = first; i < last; i += 1) peak = Math.max(peak, Math.abs(data[i] ?? 0));
    }
    return Number(peak.toFixed(3));
  });
}

/** Decodes the audio track of a Blob (video or audio); null when there is no decodable audio. */
export async function decodeAudio(blob: Blob): Promise<AudioBuffer | null> {
  if (!window.AudioContext) return null;
  const context = new AudioContext();
  try {
    return await context.decodeAudioData(await blob.arrayBuffer());
  } catch {
    return null;
  } finally {
    await context.close().catch(() => undefined);
  }
}

/** Duration and size of a video whose first frame the browser can show. Rejects when it can't be read. */
export async function probeVideo(blob: Blob): Promise<VideoProbe> {
  const url = URL.createObjectURL(blob);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  let timeout = 0;
  try {
    return await new Promise<VideoProbe>((resolve, reject) => {
      const fail = () => reject(new Error("unreadable"));
      const loaded = () => {
        if (video.videoWidth <= 0 || video.videoHeight <= 0 || !Number.isFinite(video.duration)) {
          fail();
          return;
        }
        resolve({ durationMs: Math.round(video.duration * 1000), width: video.videoWidth, height: video.videoHeight });
      };
      timeout = window.setTimeout(fail, 15_000);
      video.addEventListener("loadeddata", loaded, { once: true });
      video.addEventListener("error", fail, { once: true });
      video.src = url;
      video.load();
    });
  } finally {
    window.clearTimeout(timeout);
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

export class MicrophoneError extends Error {
  readonly kind: "mic-blocked" | "mic-missing" | "interrupted";
  constructor(kind: "mic-blocked" | "mic-missing" | "interrupted") {
    super(kind);
    this.kind = kind;
  }
}

/**
 * Records the microphone for a fixed window, or until `stop` aborts (Stop early). Live peaks go to onProgress.
 * Throws MicrophoneError for a blocked / missing microphone; `signal` aborting = interrupted (nothing kept).
 */
export async function captureFixedWindow(input: {
  durationMs: number;
  signal?: AbortSignal;
  stop?: AbortSignal;
  onStarted?: () => void;
  onProgress?: (p: { elapsedMs: number; peaks: number[] }) => void;
}): Promise<CaptureResult> {
  if (!Number.isFinite(input.durationMs) || input.durationMs <= 0) throw new RangeError("window");
  if (input.signal?.aborted) throw new MicrophoneError("interrupted");
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new MicrophoneError("mic-missing");

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch (error) {
    const name = error instanceof DOMException ? error.name : "";
    if (name === "NotFoundError" || name === "OverconstrainedError") throw new MicrophoneError("mic-missing");
    throw new MicrophoneError("mic-blocked");
  }
  if (input.signal?.aborted) {
    stream.getTracks().forEach((t) => t.stop());
    throw new MicrophoneError("interrupted");
  }

  const mimeType = preferredMimeType();
  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  const chunks: BlobPart[] = [];
  const peaks = Array.from({ length: PEAK_BARS }, () => 0);
  let startedAt = 0;
  let endReason: CaptureResult["endReason"] = "fixed-window";
  let stopTimer = 0;
  let frame = 0;
  let audioContext: AudioContext | undefined;

  const done = new Promise<CaptureResult>((resolve, reject) => {
    recorder.addEventListener("dataavailable", (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    });
    recorder.addEventListener("error", () => reject(new MicrophoneError("interrupted")));
    recorder.addEventListener(
      "stop",
      () => {
        const finalMime = recorder.mimeType || mimeType || "audio/webm";
        resolve({
          blob: new Blob(chunks, { type: finalMime }),
          mimeType: finalMime,
          elapsedMs: Math.min(input.durationMs, Math.max(0, Date.now() - startedAt)),
          endReason,
          peaks: [...peaks],
        });
      },
      { once: true },
    );
  });

  const stopWith = (reason: CaptureResult["endReason"]) => {
    if (recorder.state === "inactive") return;
    endReason = reason;
    recorder.stop();
  };
  const onAbort = () => stopWith("interrupted");
  const onStop = () => stopWith("stopped");
  const onTrackEnded = () => stopWith("interrupted");
  input.signal?.addEventListener("abort", onAbort, { once: true });
  input.stop?.addEventListener("abort", onStop, { once: true });
  stream.getAudioTracks().forEach((t) => t.addEventListener("ended", onTrackEnded, { once: true }));

  try {
    recorder.start(250);
    startedAt = Date.now();
    input.onStarted?.();
    stopTimer = window.setTimeout(() => stopWith("fixed-window"), input.durationMs);
    if (input.onProgress && window.AudioContext) {
      audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const tick = () => {
        if (recorder.state === "inactive") return;
        const elapsedMs = Math.min(input.durationMs, Date.now() - startedAt);
        analyser.getByteTimeDomainData(data);
        const bar = Math.min(PEAK_BARS - 1, Math.floor((elapsedMs / input.durationMs) * PEAK_BARS));
        peaks[bar] = Math.max(peaks[bar] ?? 0, peakFromTimeData(data));
        input.onProgress?.({ elapsedMs, peaks: [...peaks] });
        frame = requestAnimationFrame(tick);
      };
      void audioContext.resume().then(tick).catch(() => undefined);
    }
    const result = await done;
    if (result.endReason === "interrupted") throw new MicrophoneError("interrupted");
    return result;
  } finally {
    window.clearTimeout(stopTimer);
    cancelAnimationFrame(frame);
    input.signal?.removeEventListener("abort", onAbort);
    input.stop?.removeEventListener("abort", onStop);
    stream.getTracks().forEach((t) => t.stop());
    await audioContext?.close().catch(() => undefined);
  }
}
