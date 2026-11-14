import type { DemoOutcome, PrepStep, ProjectState } from "../contracts";

/*
 * Simulated server time (research R3). Preparation state is derived from timestamps on every read, so reloads and
 * background tabs stay correct without timers. Default demo timings: queue 2 s, steps 4 / 5 / 4 s (÷ speed).
 */

export const QUEUE_MS = 2_000;
export const STEP_MS: Record<PrepStep, number> = { 1: 4_000, 2: 5_000, 3: 4_000 };

export type PrepRun = {
  /** when this run (Start or Try again) began, server ms */
  startedAt: number;
  /** step the run starts at (Try again resumes at the failed step) */
  fromStep: PrepStep;
  /** a fresh Start waits in the queue first */
  queued: boolean;
  outcome: DemoOutcome;
  speed: number;
};

export type PrepStatus =
  | { phase: "queued"; msLeft: number }
  | { phase: "preparing"; step: PrepStep; stepProgress: number; msLeft: number; stepsDone: number }
  | { phase: "failed"; step: PrepStep; at: number }
  | { phase: "ready"; at: number }
  | { phase: "no_dialogue"; at: number };

const failStep = (outcome: DemoOutcome): PrepStep | null =>
  outcome.startsWith("failed@") ? (Number(outcome.slice(7)) as PrepStep) : null;

export function prepStatus(run: PrepRun, now: number): PrepStatus {
  const scale = 1 / Math.max(0.01, run.speed);
  const queueMs = run.queued ? QUEUE_MS * scale : 0;
  const steps = ([1, 2, 3] as PrepStep[]).filter((s) => s >= run.fromStep);
  const total = queueMs + steps.reduce((sum, s) => sum + STEP_MS[s] * scale, 0);
  let t = now - run.startedAt;
  if (t < queueMs) return { phase: "queued", msLeft: Math.max(0, total - t) };
  t -= queueMs;
  let cursor = run.startedAt + queueMs;
  const failing = failStep(run.outcome);
  for (const step of steps) {
    const len = STEP_MS[step] * scale;
    if (failing === step && t >= len / 2) return { phase: "failed", step, at: cursor + len / 2 };
    if (t < len) {
      const elapsed = now - run.startedAt;
      return { phase: "preparing", step, stepProgress: t / len, msLeft: Math.max(0, total - elapsed), stepsDone: step - 1 };
    }
    t -= len;
    cursor += len;
  }
  return run.outcome === "no-dialogue" ? { phase: "no_dialogue", at: cursor } : { phase: "ready", at: cursor };
}

/** Turns found so far: none in step 1, growing through steps 2–3, all when ready. */
export function turnsFoundAt(status: PrepStatus, total: number): number {
  if (status.phase === "ready") return total;
  if (status.phase !== "preparing" || status.step === 1) return 0;
  const progress = status.step === 2 ? status.stepProgress * 0.7 : 0.7 + status.stepProgress * 0.3;
  return Math.min(total, Math.max(1, Math.floor(total * progress)));
}

/** Where `/projects/:id` and the My projects row lead (ia.md redirect table). */
export function redirectTarget(id: string, state: ProjectState, firstTurnWithoutTake: number | null): string {
  switch (state) {
    case "draft":
      return "/new";
    case "queued":
    case "preparing":
    case "failed":
    case "no_dialogue":
      return `/projects/${id}/processing`;
    case "recording":
      return `/projects/${id}/turns/${firstTurnWithoutTake ?? 1}`;
    case "assembling":
    case "done":
    case "assembly_failed":
      return `/projects/${id}/result`;
  }
}

/** Studio is open only while recording or after (re-record mode). */
export const canOpenStudio = (state: ProjectState) => state === "recording" || state === "done";
