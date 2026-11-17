import { afterEach, describe, expect, it, vi } from "vitest";
import { loadMicrophone, saveMicrophone } from "./mic-preference";

afterEach(() => vi.unstubAllGlobals());

describe("microphone preference", () => {
  it("saves and loads choices independently per account", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      setItem: (key: string, value: string) => values.set(key, value),
      getItem: (key: string) => values.get(key) ?? null,
    });
    saveMicrophone("first", "mic-a");
    saveMicrophone("second", "mic-b");
    expect(values.get("dubbed.mic.first")).toBe("mic-a");
    expect(loadMicrophone("first")).toBe("mic-a");
    expect(loadMicrophone("second")).toBe("mic-b");
    expect(loadMicrophone("third")).toBeNull();
  });

  it("handles unavailable storage on read and write", () => {
    vi.stubGlobal("localStorage", {
      setItem: () => { throw new Error("unavailable"); },
      getItem: () => { throw new Error("unavailable"); },
    });
    expect(() => saveMicrophone("first", "mic-a")).not.toThrow();
    expect(loadMicrophone("first")).toBeNull();
  });
});
