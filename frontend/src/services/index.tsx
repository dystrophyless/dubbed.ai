/*
 * The services layer entry (plan.md, research R7): createServices("mock"), the React provider, TanStack Query keys and
 * hooks. Screens talk to the server only through these hooks + contracts.ts, so a real adapter can replace mock/ later.
 */

import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { ChangeEvent, DemoOutcome, Project, ProjectId, Services } from "./contracts";
import { createMockServices } from "./mock";

export * from "./contracts";

export function createServices(adapter: "mock" = "mock"): Services {
  if (adapter !== "mock") throw new Error("Only the mock adapter exists for now.");
  return createMockServices();
}

/* ---------- query keys ---------- */

export const qk = {
  account: ["account"] as const,
  projects: ["projects"] as const,
  draft: ["draft"] as const,
  project: (id: string) => ["project", id] as const,
  turns: (id: string) => ["turns", id] as const,
  takes: (id: string) => ["takes", id] as const,
  takeUrl: (id: string, n: number) => ["take-url", id, n] as const,
  videoUrl: (id: string) => ["video-url", id] as const,
  result: (id: string) => ["result", id] as const,
  player: (id: string, v: number) => ["player", id, v] as const,
};

/** Polling only while the server is working on something (queued / preparing / assembling). */
export const POLL_MS = 500;
export const isActive = (p: Project | null | undefined) =>
  Boolean(p && (p.state === "queued" || p.state === "preparing" || p.state === "assembling" || p.pendingVersion !== null));

function invalidateFor(client: QueryClient, e: ChangeEvent) {
  if (e.kind === "result-progress" && e.projectId) {
    void client.invalidateQueries({ queryKey: qk.result(e.projectId) });
    return;
  }
  void client.invalidateQueries({ queryKey: qk.account });
  void client.invalidateQueries({ queryKey: qk.projects });
  void client.invalidateQueries({ queryKey: qk.draft });
  if (e.projectId) {
    for (const key of [qk.project(e.projectId), qk.turns(e.projectId), qk.takes(e.projectId), qk.result(e.projectId), ["take-url", e.projectId], ["player", e.projectId]]) {
      void client.invalidateQueries({ queryKey: key });
    }
  } else {
    void client.invalidateQueries();
  }
}

/* ---------- demo presets: ?demo=reset|balance:40|slots:full|slots:10|outcome:…|assembly-failed|turns:6|speed:4 ---------- */

export async function applyDemoParams(services: Services, search = window.location.search): Promise<boolean> {
  const params = new URLSearchParams(search);
  const values = params.getAll("demo").flatMap((v) => v.split(","));
  if (!services.demo || values.length === 0) return false;
  for (const v of values) {
    const [key, arg] = v.split(":");
    if (key === "reset") await services.demo.reset();
    else if (key === "balance") await services.demo.set({ balance: Math.max(0, Number(arg) || 0) });
    else if (key === "slots" && arg === "full") await services.demo.set({ fillSlots: true });
    else if (key === "slots" && (arg === "2" || arg === "10")) await services.demo.set({ slotLimit: Number(arg) as 2 | 10 });
    else if (key === "outcome" && arg === "assembly-failed") await services.demo.set({ assemblyFails: true });
    else if (key === "outcome" && arg) await services.demo.set({ outcome: arg as DemoOutcome });
    else if (key === "assembly-failed") await services.demo.set({ assemblyFails: true });
    else if (key === "turns") await services.demo.set({ turns: Math.max(0, Number(arg) || 0) });
    else if (key === "turnms" && Number.isFinite(Number(arg)) && Number(arg) > 0) await services.demo.set({ turnMs: Number(arg) });
    else if (key === "speed") await services.demo.set({ speed: Math.max(0.1, Number(arg) || 1) });
  }
  params.delete("demo");
  const rest = params.toString();
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${rest ? `?${rest}` : ""}${window.location.hash}`);
  return true;
}

/* ---------- provider ---------- */

const ServicesContext = createContext<Services | null>(null);

export function ServicesProvider({ services, children }: { services?: Services; children: ReactNode }) {
  const [value] = useState(() => services ?? createServices("mock"));
  const client = useQueryClient();
  const [ready, setReady] = useState(() => !new URLSearchParams(window.location.search).has("demo"));

  useEffect(() => value.subscribe((e) => invalidateFor(client, e)), [value, client]);
  useEffect(() => {
    if (ready) return;
    void applyDemoParams(value).finally(() => {
      void client.invalidateQueries();
      setReady(true);
    });
  }, [ready, value, client]);

  if (!ready) return null;
  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
  const s = useContext(ServicesContext);
  if (!s) throw new Error("useServices() outside <ServicesProvider>");
  return s;
}

/* ---------- read hooks ---------- */

export function useAccount() {
  const s = useServices();
  return useQuery({ queryKey: qk.account, queryFn: () => s.account.get(), refetchInterval: (q) => (q.state.data?.reserved ? POLL_MS : false) });
}

export function useProjects() {
  const s = useServices();
  return useQuery({
    queryKey: qk.projects,
    queryFn: () => s.projects.list(),
    refetchInterval: (q) => (q.state.data?.some((p) => p.state === "queued" || p.state === "preparing" || p.state === "assembling" || p.pendingAssembling) ? POLL_MS : false),
  });
}

export function useProject(id: ProjectId | string | undefined) {
  const s = useServices();
  return useQuery({
    queryKey: qk.project(id ?? ""),
    queryFn: () => s.projects.get(id as ProjectId),
    enabled: Boolean(id),
    refetchInterval: (q) => (isActive(q.state.data) ? POLL_MS : false),
  });
}

export function useTurns(id: ProjectId | string | undefined) {
  const s = useServices();
  return useQuery({ queryKey: qk.turns(id ?? ""), queryFn: () => s.studio.turns(id as ProjectId), enabled: Boolean(id) });
}

export function useTakes(id: ProjectId | string | undefined) {
  const s = useServices();
  return useQuery({ queryKey: qk.takes(id ?? ""), queryFn: () => s.studio.takes(id as ProjectId), enabled: Boolean(id) });
}

export function useResult(id: ProjectId | string | undefined) {
  const s = useServices();
  return useQuery({
    queryKey: qk.result(id ?? ""),
    queryFn: () => s.result.get(id as ProjectId),
    enabled: Boolean(id),
    refetchInterval: (q) => (q.state.data?.pending?.state === "assembling" ? POLL_MS : false),
  });
}

export function useVideoUrl(id: ProjectId | string | undefined) {
  const s = useServices();
  return useQuery({ queryKey: qk.videoUrl(id ?? ""), queryFn: () => s.projects.videoUrl(id as ProjectId), enabled: Boolean(id), staleTime: Infinity });
}
