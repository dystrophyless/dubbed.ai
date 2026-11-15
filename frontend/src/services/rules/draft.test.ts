import { describe, expect, it } from "vitest";
import type { Project } from "../contracts";
import { draftSourceKey } from "./draft";

const draft = (id: string, sourceId?: string) => ({ id, video: { sourceId } }) as unknown as Pick<Project, "id" | "video">;

describe("draftSourceKey", () => {
  it("changes when the video is replaced under the same project id", () => {
    expect(draftSourceKey(draft("p1", "a"))).not.toBe(draftSourceKey(draft("p1", "b")));
  });
  it("is stable across refreshes of the same source and differs between projects", () => {
    expect(draftSourceKey(draft("p1", "a"))).toBe(draftSourceKey(draft("p1", "a")));
    expect(draftSourceKey(draft("p1", "a"))).not.toBe(draftSourceKey(draft("p2", "a")));
  });
});
