/*
 * The demo result (owner option B, research R6): the user's section with the scene's sound muted under each turn and
 * their takes placed at the turn starts, rendered in the browser at real time:
 *   picture  — a hidden muted <video> of the source, captured with captureStream()
 *   sound    — the decoded original audio (silenced inside every turn window) + the decoded takes, mixed with Web Audio
 *              into a MediaStreamAudioDestinationNode
 *   file     — MediaRecorder over both tracks: WebM (or MP4 where the browser records only MP4)
 */

import type { FileFormat, Section } from "../contracts";
import { decodeAudio } from "./browser-media";

export type MixTurn = { startMs: number; windowMs: number; take: Blob | null };

const VIDEO_TYPES: { mime: string; format: FileFormat }[] = [
  { mime: "video/webm;codecs=vp9,opus", format: "webm" },
  { mime: "video/webm;codecs=vp8,opus", format: "webm" },
  { mime: "video/webm", format: "webm" },
  { mime: "video/mp4;codecs=avc1,mp4a.40.2", format: "mp4" },
  { mime: "video/mp4", format: "mp4" },
];

export function recordableFormat(): { mime: string; format: FileFormat } | null {
  if (typeof MediaRecorder === "undefined") return null;
  return VIDEO_TYPES.find((t) => MediaRecorder.isTypeSupported(t.mime)) ?? null;
}

type CapturableVideo = HTMLVideoElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream };

const FADE_S = 0.04;

export async function renderMix(input: {
  video: Blob;
  section: Section;
  turns: MixTurn[];
  signal?: AbortSignal;
  onProgress?: (p: number) => void;
}): Promise<{ blob: Blob; mime: string; format: FileFormat }> {
  const type = recordableFormat();
  if (!type) throw new Error("This browser cannot record video.");
  const lengthS = (input.section.endMs - input.section.startMs) / 1000;

  const [original, ...takes] = await Promise.all([decodeAudio(input.video), ...input.turns.map((t) => (t.take ? decodeAudio(t.take) : null))]);

  const url = URL.createObjectURL(input.video);
  const video = document.createElement("video") as CapturableVideo;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  // Attached but invisible: some browsers stop decoding frames of detached videos.
  video.setAttribute("aria-hidden", "true");
  Object.assign(video.style, { position: "fixed", left: "0", top: "0", width: "2px", height: "2px", opacity: "0", pointerEvents: "none" });
  document.body.appendChild(video);
  const ctx = new AudioContext();
  let timer = 0;
  let progressTimer = 0;

  try {
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.addEventListener("loadeddata", () => resolve(), { once: true });
      video.addEventListener("error", () => reject(new Error("The source video could not be read.")), { once: true });
    });
    video.currentTime = input.section.startMs / 1000;
    await new Promise<void>((resolve) => video.addEventListener("seeked", () => resolve(), { once: true }));

    const capture = video.captureStream?.() ?? video.mozCaptureStream?.();
    if (!capture) throw new Error("This browser cannot capture video.");
    const dest = ctx.createMediaStreamDestination();
    await ctx.resume();

    const stream = new MediaStream([...capture.getVideoTracks(), ...dest.stream.getAudioTracks()]);
    const recorder = new MediaRecorder(stream, { mimeType: type.mime });
    const chunks: BlobPart[] = [];
    recorder.addEventListener("dataavailable", (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    });
    const stopped = new Promise<void>((resolve, reject) => {
      recorder.addEventListener("stop", () => resolve(), { once: true });
      recorder.addEventListener("error", () => reject(new Error("Recording the result failed.")), { once: true });
    });

    await video.play();
    recorder.start(1000);
    const t0 = ctx.currentTime + 0.05;

    if (original) {
      const src = ctx.createBufferSource();
      src.buffer = original;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(1, t0);
      for (const turn of input.turns) {
        const start = t0 + (turn.startMs - input.section.startMs) / 1000;
        const end = start + turn.windowMs / 1000;
        gain.gain.setValueAtTime(1, Math.max(t0, start - FADE_S));
        gain.gain.linearRampToValueAtTime(0, Math.max(t0, start));
        gain.gain.setValueAtTime(0, end);
        gain.gain.linearRampToValueAtTime(1, end + FADE_S);
      }
      src.connect(gain).connect(dest);
      src.start(t0, input.section.startMs / 1000, lengthS);
    }
    input.turns.forEach((turn, i) => {
      const buffer = takes[i];
      if (!buffer) return;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(dest);
      src.start(t0 + (turn.startMs - input.section.startMs) / 1000, 0, Math.min(buffer.duration, turn.windowMs / 1000));
    });

    const started = performance.now();
    progressTimer = window.setInterval(() => input.onProgress?.(Math.min(0.99, (performance.now() - started) / 1000 / lengthS)), 250);
    await new Promise<void>((resolve, reject) => {
      timer = window.setTimeout(resolve, lengthS * 1000 + 100);
      input.signal?.addEventListener("abort", () => reject(new DOMException("Render cancelled.", "AbortError")), { once: true });
    });
    video.pause();
    recorder.stop();
    await stopped;
    input.onProgress?.(1);
    return { blob: new Blob(chunks, { type: type.mime.split(";")[0] }), mime: type.mime, format: type.format };
  } finally {
    window.clearTimeout(timer);
    window.clearInterval(progressTimer);
    video.pause();
    video.remove();
    URL.revokeObjectURL(url);
    await ctx.close().catch(() => undefined);
  }
}

/**
 * MediaRecorder files have no duration in their header (the browser reports Infinity), which breaks the clock and
 * the scrubber. Seeking far past the end makes the browser scan the file and learn the real duration.
 */
export function loadWithDuration(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      if (Number.isFinite(video.duration)) {
        video.removeEventListener("durationchange", check);
        video.currentTime = 0;
        resolve();
      }
    };
    const onMeta = () => {
      if (Number.isFinite(video.duration)) {
        resolve();
        return;
      }
      video.addEventListener("durationchange", check);
      video.currentTime = 1e101;
    };
    if (video.readyState >= 1) onMeta();
    else video.addEventListener("loadedmetadata", onMeta, { once: true });
  });
}
