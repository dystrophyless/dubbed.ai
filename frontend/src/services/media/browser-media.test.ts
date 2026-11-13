import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureFixedWindow } from "./browser-media";

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
