import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { invalidateFor, qk } from "./index";
import { projectId } from "./contracts";
import { createMockServices } from "./mock";

describe("service change feed query invalidation", () => {
  const id = projectId("cross-tab");
  it.each(["project", "removed"])("invalidates cached source video and thumbnail on %s", async (kind) => {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    const remoteTab = new BroadcastChannel("dubbed-mock-changes");
    const observerTab = createMockServices();
    const unsubscribe = observerTab.subscribe((e) => invalidateFor(client, e));
    try {
      // ProjectsPage thumbnails and useVideoUrl share this key.
      await client.fetchQuery({ queryKey: qk.videoUrl(id), queryFn: async () => "blob:old" });
      remoteTab.postMessage({ projectId: id, kind });
      await vi.waitFor(() => expect(client.getQueryState(qk.videoUrl(id))?.isInvalidated).toBe(true));
      expect(await client.fetchQuery({ queryKey: qk.videoUrl(id), queryFn: async () => "blob:new" })).toBe("blob:new");
    } finally {
      unsubscribe();
      remoteTab.close();
      client.clear();
    }
  });

  it("invalidates every mutable project cache but keeps result progress scoped", () => {
    const client = new QueryClient();
    const keys = [qk.account, qk.projects, qk.draft, qk.project(id), qk.turns(id), qk.takes(id), qk.takeUrl(id, 1), qk.videoUrl(id), qk.result(id), qk.player(id, 1)];
    for (const key of keys) client.setQueryData(key, "cached");
    invalidateFor(client, { projectId: id, kind: "result-progress" });
    for (const key of keys) expect(client.getQueryState(key)?.isInvalidated).toBe(key[0] === "result");
    invalidateFor(client, { projectId: id, kind: "project" });
    for (const key of keys) expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    client.clear();
  });
});
