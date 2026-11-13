import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decodeAudio, probeVideo } from "../media/browser-media";
import { MAX_FILE_BYTES, MAX_VIDEO_MS } from "../rules/pricing";
import { createMockServices } from "./index";
import * as db from "./db";

vi.mock("../media/browser-media", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../media/browser-media")>()),
  probeVideo: vi.fn(),
  decodeAudio: vi.fn(),
}));

/* Moved from the frozen New dub error previews: exercise the adapter, not a preselected alert. */
describe("mock upload validation", () => {
  let services = createMockServices();
  const file = () => new File(["video"], "scene.mp4", { type: "video/mp4" });

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-04T10:00:00Z"));
    vi.mocked(probeVideo).mockReset();
    vi.mocked(decodeAudio).mockReset();
    services = createMockServices();
    await services.demo!.reset();
  });
  afterEach(() => vi.useRealTimers());

  async function upload(signal = new AbortController().signal) {
    return services.upload.upload(file(), {
      signal,
      // Skip simulated network time without faking IndexedDB's event loop or browser media time.
      onProgress: () => vi.setSystemTime(Date.now() + 2_000),
    });
  }

  async function expectNoDraftOrSlot() {
    expect(await db.getAll("projects")).toEqual([]);
    expect(await db.getAll("videos")).toEqual([]);
    expect(await services.account.get()).toMatchObject({ balance: 120, reserved: 0, slotsUsed: 0 });
  }

  it("refreshes the URL for a different replacement of equal size", async () => {
    vi.mocked(probeVideo).mockResolvedValue({ durationMs: 13_000, width: 1280, height: 544 });
    vi.mocked(decodeAudio).mockResolvedValue({} as AudioBuffer);
    const create = vi.spyOn(URL, "createObjectURL").mockReturnValueOnce("blob:first").mockReturnValueOnce("blob:second");
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    try {
      const first = await upload();
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      const id = first.value.id;
      expect(await services.projects.videoUrl(id)).toBe("blob:first");
      expect(await services.projects.videoUrl(id)).toBe("blob:first");
      const replacement = await services.upload.upload(new File(["other"], "other.mp4", { type: "video/mp4" }), {
        signal: new AbortController().signal,
        replace: id,
        onProgress: () => vi.setSystemTime(Date.now() + 2_000),
      });
      expect(replacement.ok).toBe(true);
      expect(await services.projects.videoUrl(id)).toBe("blob:second");
      expect(revoke).toHaveBeenCalledWith("blob:first");
      expect(create).toHaveBeenCalledTimes(2);
    } finally {
      create.mockRestore();
      revoke.mockRestore();
    }
  });

  it.each(["start", "remove"] as const)("rejects replacement if another tab performs %s during checking", async (action) => {
    vi.mocked(probeVideo).mockResolvedValue({ durationMs: 13_000, width: 1280, height: 544 });
    vi.mocked(decodeAudio).mockResolvedValue({} as AudioBuffer);
    const first = await upload();
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const otherTab = createMockServices();
    vi.mocked(probeVideo).mockImplementationOnce(async () => {
      await otherTab.projects[action](first.value.id);
      return { durationMs: 13_000, width: 1280, height: 544 };
    });
    expect(await services.upload.upload(file(), {
      replace: first.value.id,
      signal: new AbortController().signal,
      onProgress: () => vi.setSystemTime(Date.now() + 2_000),
    })).toEqual({ ok: false, error: "no-slot" });
    if (action === "start") {
      expect(await services.projects.get(first.value.id)).toMatchObject({ state: "queued", reserved: 13 });
      expect(await services.account.get()).toMatchObject({ balance: 107, reserved: 13 });
    } else {
      expect(await services.projects.get(first.value.id)).toBeNull();
    }
  });

  it("checks the current slot limit after checking instead of the pre-upload account", async () => {
    await services.demo!.set({ slotLimit: 10 });
    vi.mocked(probeVideo).mockImplementation(async () => {
      const otherTab = createMockServices();
      await otherTab.demo!.set({ slotLimit: 2 });
      await otherTab.demo!.set({ fillSlots: true });
      return { durationMs: 13_000, width: 1280, height: 544 };
    });
    vi.mocked(decodeAudio).mockResolvedValue({} as AudioBuffer);
    expect(await upload()).toEqual({ ok: false, error: "no-slot" });
    expect(await services.account.get()).toMatchObject({ slotLimit: 2, slotsUsed: 2 });
  });

  it("does not restore removed turns when background peak decoding finishes", async () => {
    vi.mocked(probeVideo).mockResolvedValue({ durationMs: 13_000, width: 1280, height: 544 });
    vi.mocked(decodeAudio).mockResolvedValue({} as AudioBuffer);
    const uploaded = await upload();
    expect(uploaded.ok).toBe(true);
    if (!uploaded.ok) return;
    const id = uploaded.value.id;
    let finish!: (buffer: AudioBuffer | null) => void;
    vi.mocked(decodeAudio).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    vi.stubGlobal("window", { AudioContext: function () {} });
    const decoded = new Promise<void>((resolve) => {
      const unsubscribe = services.subscribe((event) => {
        if (event.kind === "turns") { unsubscribe(); resolve(); }
      });
    });
    try {
      await services.projects.start(id);
      vi.setSystemTime(Date.now() + 20_000);
      await services.projects.get(id);
      await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
      await services.projects.remove(id);
      finish(null);
      await decoded;
      expect(await db.getAll("turns")).toEqual([]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("rejects a file over 250 MB at precheck, before probing or decoding", async () => {
    const oversized = file();
    Object.defineProperty(oversized, "size", { value: MAX_FILE_BYTES + 1 });
    expect(services.upload.precheck(oversized)).toEqual({ ok: false, error: "size" });
    expect(probeVideo).not.toHaveBeenCalled();
    expect(decodeAudio).not.toHaveBeenCalled();
    await expectNoDraftOrSlot();
  });

  it("accepts the exact 250 MB boundary at precheck", () => {
    const maximum = file();
    Object.defineProperty(maximum, "size", { value: MAX_FILE_BYTES });
    expect(services.upload.precheck(maximum).ok).toBe(true);
  });

  it("rejects duration over ten minutes without creating a draft or taking a slot", async () => {
    vi.mocked(probeVideo).mockResolvedValue({ durationMs: MAX_VIDEO_MS + 1, width: 1280, height: 544 });
    expect(await upload()).toEqual({ ok: false, error: "length" });
    expect(probeVideo).toHaveBeenCalledOnce();
    expect(decodeAudio).not.toHaveBeenCalled();
    await expectNoDraftOrSlot();
  });

  it("maps a rejected video probe to broken without creating a draft or taking a slot", async () => {
    vi.mocked(probeVideo).mockRejectedValue(new Error("unreadable"));
    expect(await upload()).toEqual({ ok: false, error: "broken" });
    expect(decodeAudio).not.toHaveBeenCalled();
    await expectNoDraftOrSlot();
  });

  it("rejects missing audio after the video check without consuming a slot", async () => {
    vi.mocked(probeVideo).mockResolvedValue({ durationMs: 13_000, width: 1280, height: 544 });
    vi.mocked(decodeAudio).mockResolvedValue(null);
    expect(await upload()).toEqual({ ok: false, error: "no-audio" });
    expect(decodeAudio).toHaveBeenCalledOnce();
    await expectNoDraftOrSlot();
  });

  it("does not leave a late draft when cancelled during the check", async () => {
    const controller = new AbortController();
    vi.mocked(probeVideo).mockImplementation(async () => {
      controller.abort();
      return { durationMs: 13_000, width: 1280, height: 544 };
    });
    expect(await upload(controller.signal)).toEqual({ ok: false, error: "aborted" });
    expect(decodeAudio).not.toHaveBeenCalled();
    await expectNoDraftOrSlot();
  });
});
