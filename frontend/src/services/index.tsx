/*
 * The services layer entry (plan.md, research R7): createServices("mock"), the React provider, TanStack Query keys and
 * hooks. Screens talk to the server only through these hooks + contracts.ts, so a real adapter can replace mock/ later.
 */

import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { ChangeEvent, DemoOutcome, Project, ProjectId, PurchaseId, Services } from "./contracts";
import { createMockServices } from "./mock";
import { currentAccountId } from "./mock/db";
import type { AuthPort, Session } from "./contracts";
import { isSlotLimit } from "./rules/slots";
import { signInUrl } from "./rules/auth";

export * from "./contracts";

export function createServices(adapter: "mock" = "mock"): Services {
  if (adapter !== "mock") throw new Error("Only the mock adapter exists for now.");
  return createMockServices();
}

/* ---------- query keys ---------- */

export const qk = {
  session: ["session"] as const,
  account: ["account"] as const,
  credits: { packs: ["credits", "packs"] as const, history: (page: number) => ["credits", "history", page] as const },
  purchase: (id: string) => ["purchase", id] as const,
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

export function invalidateFor(client: QueryClient, e: ChangeEvent) {
  if (e.kind === "session") {
    void client.invalidateQueries({ queryKey: qk.session });
    return;
  }
  if (e.kind === "result-progress" && e.projectId) {
    void client.invalidateQueries({ queryKey: qk.result(e.projectId) });
    return;
  }
  if (["credits", "purchase", "project", "removed"].includes(e.kind)) {
    void client.invalidateQueries({ queryKey: ["credits", "history"] });
  }
  if (e.kind === "purchase" && e.purchaseId) void client.invalidateQueries({ queryKey: qk.purchase(e.purchaseId) });
  if (e.kind === "credits" || e.kind === "purchase") {
    void client.invalidateQueries({ queryKey: qk.account });
    return;
  }
  void client.invalidateQueries({ queryKey: qk.account });
  void client.invalidateQueries({ queryKey: qk.projects });
  void client.invalidateQueries({ queryKey: qk.draft });
  if (e.projectId) {
    for (const key of [qk.project(e.projectId), qk.turns(e.projectId), qk.takes(e.projectId), qk.videoUrl(e.projectId), qk.result(e.projectId), ["take-url", e.projectId], ["player", e.projectId]]) {
      void client.invalidateQueries({ queryKey: key });
    }
  } else {
    void client.invalidateQueries({ predicate: (query) => query.queryKey[0] !== "credits" || query.queryKey[1] !== "packs" });
  }
}

/* ---------- demo presets: ?demo=reset|balance:40|slots:full|slots:10|outcome:…|assembly-failed|turns:6|speed:4 ---------- */

const wholeNumber = (arg: string | undefined) => {
  const v = Number(arg);
  return Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
};

/** One `?demo=` value as a demo patch; null when it is not a known preset. Numbers are finite and sane. */
export function parseDemo(key: string | undefined, arg: string | undefined): Parameters<NonNullable<Services["demo"]>["set"]>[0] | null {
  const num = Number(arg);
  if (key === "signin" && arg === undefined) return { signin: true };
  if (key === "signout" && arg === undefined) return { signout: true };
  if (key === "code" && arg === "expire") return { codeExpire: true };
  if (key === "fail" && arg === "auth") return { failAuth: true };
  if (key === "google" && arg === "fail") return { googleFail: true };
  if (key === "balance") return { balance: wholeNumber(arg) };
  if (key === "payment" && (arg === "success" || arg === "declined")) return { payment: arg };
  if (key === "paydelay" && arg !== undefined && arg !== "" && Number.isFinite(num) && num >= 0) return { paymentDelayMs: Math.floor(num) };
  if (key === "startdelay" && arg !== undefined && arg !== "" && Number.isFinite(num) && num >= 0) return { startDelayMs: Math.floor(num) };
  if (key === "fail" && arg === "start") return { failStart: true };
  if (key === "fail" && arg === "pay") return { failPay: true };
  if (key === "fail" && arg === "projects") return { failProjects: true };
  if (key === "fail" && arg === "none") return { failStart: false, failPay: false, failProjects: false };
  if (key === "slots" && arg === "full") return { fillSlots: true };
  if (key === "slots" && isSlotLimit(num)) return { slotLimit: num };
  if (key === "outcome" && arg === "assembly-failed") return { assemblyFails: true };
  if (key === "outcome" && arg) return { outcome: arg as DemoOutcome };
  if (key === "assembly-failed") return { assemblyFails: true };
  if (key === "turns") return { turns: wholeNumber(arg) };
  if (key === "turnms" && Number.isFinite(num) && Math.floor(num) > 0) return { turnMs: Math.floor(num) };
  if (key === "speed") return { speed: Number.isFinite(num) && arg !== "" && arg !== undefined ? Math.min(100, Math.max(0.1, num)) : 1 };
  return null;
}

export async function applyDemoParams(services: Services, search = window.location.search): Promise<boolean> {
  const params = new URLSearchParams(search);
  const values = params.getAll("demo").flatMap((v) => v.split(","));
  if (!services.demo || values.length === 0) return false;
  for (const v of values) {
    const [key, arg] = v.split(":");
    if (key === "reset") await services.demo.reset();
    else {
      const patch = parseDemo(key, arg);
      if (patch) await services.demo.set(patch);
    }
  }
  params.delete("demo");
  const rest = params.toString();
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${rest ? `?${rest}` : ""}${window.location.hash}`);
  return true;
}

/* ---------- provider ---------- */

const ServicesContext = createContext<Services | null>(null);

export function accountChangeTarget(opened: string | null, session: Session | null, next: string): string | null {
  if (!opened || opened === session?.accountId) return null;
  return session ? "/projects" : signInUrl(next);
}

/** Set while this tab's own Sign out runs: the one account-switch reload then goes to a plain /sign-in (the user chose to leave). */
let ownSignOut = false;
export const markOwnSignOut = (on: boolean) => { ownSignOut = on; };

function reloadIfAccountChanged(opened: string | null, session: Session | null) {
  const target = accountChangeTarget(opened, session, `${window.location.pathname}${window.location.search}`);
  if (target && ownSignOut && !session) { window.location.replace("/sign-in"); return; }
  if (target) window.location.replace(target);
}

export function ServicesProvider({ services, children }: { services?: Services; children: ReactNode }) {
  const [value] = useState(() => services ?? createServices("mock"));
  const client = useQueryClient();
  const [ready, setReady] = useState(() => !new URLSearchParams(window.location.search).has("demo"));
  const readyRef = useRef(ready);
  useEffect(() => { readyRef.current = ready; }, [ready]);

  useEffect(() => value.subscribe((e) => {
    // `?demo=reset,signin` signs out and in while the app is still starting: no page is open yet, so nothing to reload
    if (e.kind === "session" && readyRef.current) {
      const opened = value.adapter === "mock" ? currentAccountId() : null;
      void value.auth.session().then((session) => reloadIfAccountChanged(opened, session));
    }
    invalidateFor(client, e);
  }), [value, client]);
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

/* ---------- auth hooks ---------- */

export function useSession() {
  const s = useServices();
  return useQuery({ queryKey: qk.session, queryFn: async () => {
    const session = await s.auth.session();
    reloadIfAccountChanged(s.adapter === "mock" ? currentAccountId() : null, session);
    return session;
  }, refetchOnWindowFocus: true });
}

function useAuthMutation<K extends Exclude<keyof AuthPort, "session">>(method: K) {
  const s = useServices();
  const mutationFn = s.auth[method] as (arg: Parameters<AuthPort[K]>[0]) => Promise<Awaited<ReturnType<AuthPort[K]>>>;
  return useMutation<Awaited<ReturnType<AuthPort[K]>>, Error, Parameters<AuthPort[K]>[0]>({ mutationFn });
}
export const useSignUp = () => useAuthMutation("signUp");
export const useChangeEmail = () => useAuthMutation("changeEmail");
export function useResendCode() {
  const s = useServices();
  return useMutation({ mutationFn: (input: { purpose: Parameters<AuthPort["resendCode"]>[0]; email?: string }) => s.auth.resendCode(input.purpose, input.email) });
}
export const useVerifyEmail = () => useAuthMutation("verifyEmail");
export const useCompleteMicrophone = () => useAuthMutation("completeMicrophone");
export const useSignIn = () => useAuthMutation("signIn");
export const useGoogle = () => useAuthMutation("google");
export const useSignOut = () => useAuthMutation("signOut");
export const useStartReset = () => useAuthMutation("startReset");
export const useCheckResetCode = () => useAuthMutation("checkResetCode");
export const useFinishReset = () => useAuthMutation("finishReset");

/* ---------- read hooks ---------- */

export function usePacks() {
  const s = useServices();
  return useQuery({ queryKey: qk.credits.packs, queryFn: () => s.credits.packs(), staleTime: Infinity });
}

export function useCreditsHistory(page: number) {
  const s = useServices();
  // the previous page stays on screen while the next one loads (no skeleton flash when paging)
  return useQuery({ queryKey: qk.credits.history(page), queryFn: () => s.credits.history(page), placeholderData: keepPreviousData });
}

export function usePurchase(id: PurchaseId | string | undefined) {
  const s = useServices();
  return useQuery({ queryKey: qk.purchase(id ?? ""), queryFn: () => s.credits.getPurchase(id as PurchaseId), enabled: Boolean(id) });
}

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
