import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureFixedWindow } from "./browser-media";
import * as media from "./browser-media";
import { renderMix } from "./mixer";

class Recorder extends EventTarget {
  static isTypeSupported() { return true; }
  mimeType = "audio/webm";
  state = "inactive";
  start() { this.state = "recording"; }
  stop() {
    this.state = "inactive";
    queueMicrotask(() => {
      this.dispatchEvent(Object.assign(new Event("dataavailable"), { data: new Blob(["take"]) }));
      this.dispatchEvent(new Event("stop"));
    });
  }
}

describe("result audio scheduling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
  it("never schedules a take at a negative WebAudio time", async () => {
    vi.useFakeTimers();
    vi.spyOn(media, "decodeAudio").mockResolvedValueOnce(null).mockResolvedValueOnce({ duration: 1 } as AudioBuffer);
    const start = vi.fn((when: number) => { if (when < 0) throw new RangeError("negative time"); });
    const source = { connect: vi.fn(), start };
    class Context {
      currentTime = 0;
      createBufferSource() { return source; }
      createMediaStreamDestination() { return { stream: { getAudioTracks: () => [] } }; }
      async resume() {}
      async close() {}
    }
    class Video extends EventTarget {
      style = {};
      set src(_value: string) { queueMicrotask(() => this.dispatchEvent(new Event("loadeddata"))); }
      set currentTime(_value: number) { queueMicrotask(() => this.dispatchEvent(new Event("seeked"))); }
      setAttribute() {}
      captureStream() { return { getVideoTracks: () => [] }; }
      async play() {}
      pause() {}
      remove() {}
    }
    vi.stubGlobal("AudioContext", Context);
    vi.stubGlobal("MediaRecorder", Recorder);
    vi.stubGlobal("MediaStream", class {});
    vi.stubGlobal("document", { createElement: () => new Video(), body: { appendChild() {} } });
    vi.stubGlobal("window", { setTimeout, clearTimeout, setInterval, clearInterval });
    const rendered = renderMix({
      video: new Blob(["video"]), section: { startMs: 1000, endMs: 3000 },
      turns: [{ startMs: 0, windowMs: 100, take: new Blob(["take"]) }],
    });
    await vi.advanceTimersByTimeAsync(2200);
    await rendered;
    expect(start).toHaveBeenCalledWith(0, 0, 0.1);
  });
});

describe("microphone acquisition stop requests", () => {
  const track = Object.assign(new EventTarget(), { stop: vi.fn() });
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] } as unknown as MediaStream;
  let acquire: (stream: MediaStream) => void;

  beforeEach(() => {
    vi.useFakeTimers();
    track.stop.mockClear();
    vi.stubGlobal("MediaRecorder", Recorder);
    vi.stubGlobal("window", { MediaRecorder: Recorder, setTimeout, clearTimeout });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn(() => new Promise<MediaStream>((resolve) => { acquire = resolve; })) } });
  });
  afterEach(async () => {
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it.each(["NotFoundError", "OverconstrainedError"])("retries with the default microphone on %s", async (name) => {
    const getUserMedia = vi.fn().mockRejectedValueOnce(Object.assign(new Error(), { name })).mockResolvedValueOnce(stream);
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
    const stop = new AbortController();
    stop.abort();
    const capture = captureFixedWindow({ durationMs: 4000, deviceId: "chosen", stop: stop.signal });
    await vi.advanceTimersByTimeAsync(0);
    await capture;
    expect(getUserMedia.mock.calls).toEqual([
      [{ audio: { deviceId: { ideal: "chosen" } }, video: false }],
      [{ audio: true, video: false }],
    ]);
  });

  it("retries at most once and maps a missing default microphone", async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new DOMException("", "NotFoundError"));
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
    await expect(captureFixedWindow({ durationMs: 4000, deviceId: "chosen" })).rejects.toMatchObject({ kind: "mic-missing" });
    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });

  it("does not retry after acquisition is interrupted", async () => {
    const signal = new AbortController();
    const getUserMedia = vi.fn().mockImplementation(() => {
      signal.abort();
      return Promise.reject(new DOMException("", "NotFoundError"));
    });
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
    await expect(captureFixedWindow({ durationMs: 4000, deviceId: "chosen", signal: signal.signal })).rejects.toMatchObject({ kind: "interrupted" });
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it("does not retry a blocked microphone", async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new DOMException("", "NotAllowedError"));
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
    await expect(captureFixedWindow({ durationMs: 4000, deviceId: "chosen" })).rejects.toMatchObject({ kind: "mic-blocked" });
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it("does not retry a missing default microphone", async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new DOMException("", "NotFoundError"));
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
    await expect(captureFixedWindow({ durationMs: 4000 })).rejects.toMatchObject({ kind: "mic-missing" });
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true, video: false });
  });

  it.each([false, true])("honors Stop before acquisition completes (already stopped: %s)", async (alreadyStopped) => {
    const stop = new AbortController();
    if (alreadyStopped) stop.abort();
    const onStarted = vi.fn();
    const capture = captureFixedWindow({ durationMs: 4000, stop: stop.signal, onStarted });
    if (!alreadyStopped) stop.abort();
    acquire(stream);
    await vi.advanceTimersByTimeAsync(0);
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(await capture).toMatchObject({ endReason: "stopped", elapsedMs: 0, blob: expect.any(Blob) });
    expect(onStarted).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps the existing early-stop path after recording starts", async () => {
    const stop = new AbortController();
    const capture = captureFixedWindow({ durationMs: 4000, stop: stop.signal });
    acquire(stream);
    await vi.advanceTimersByTimeAsync(500);
    stop.abort();
    expect(await capture).toMatchObject({ endReason: "stopped", elapsedMs: 500 });
    expect(track.stop).toHaveBeenCalledTimes(1);
  });

  it("discards Stop followed by abort before the recorder stop event", async () => {
    const signal = new AbortController();
    const stop = new AbortController();
    const capture = captureFixedWindow({ durationMs: 4000, signal: signal.signal, stop: stop.signal });
    const rejection = expect(capture).rejects.toMatchObject({ kind: "interrupted" });
    acquire(stream);
    await vi.advanceTimersByTimeAsync(500);
    stop.abort();
    signal.abort();
    await rejection;
    expect(track.stop).toHaveBeenCalledTimes(1);
  });

  it("discards an interrupted acquisition and releases the acquired tracks", async () => {
    const signal = new AbortController();
    const capture = captureFixedWindow({ durationMs: 4000, signal: signal.signal });
    const rejection = expect(capture).rejects.toMatchObject({ kind: "interrupted" });
    signal.abort();
    acquire(stream);
    await rejection;
    expect(track.stop).toHaveBeenCalledTimes(1);
  });
});
