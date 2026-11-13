/*
 * The mock adapter: the whole "server" in the browser (plan.md, research R2–R6). State lives in IndexedDB; preparation
 * is derived from server-like timestamps on every read and materialised (with its money effects) in one transaction;
 * the result is rendered by the tab that has the app open (one renderer per version via a Web Lock).
 */

import {
  fail,
  ok,
  projectId,
  type Account,
  type DemoSettings,
  type FileFormat,
  type PrepStep,
  type Project,
  type ProjectId,
  type ProjectState,
  type ProjectSummary,
  type ResultVersion,
  type Section,
  type Services,
  type Take,
  type Turn,
  type VideoInfo,
} from "../contracts";
import { cancel as cancelMoney, cancelCharge, refund, reserve, settle } from "../rules/money";
import { prepStatus, turnsFoundAt, type PrepRun } from "../rules/lifecycle";
import { defaultSection, isAcceptedFile, isValidSection, MAX_FILE_BYTES, MAX_VIDEO_MS, nameFromFile, priceOf } from "../rules/pricing";
import { canReplaceVideo, FREE_SLOT_LIMIT, PAID_SLOT_LIMIT } from "../rules/slots";
import { planTurns, turnCount } from "../rules/turns";
import { captureFixedWindow, decodeAudio, MicrophoneError, probeVideo, waveformRange } from "../media/browser-media";
import { tryAcquire, whenFree } from "../media/capture-lock";
import { recordableFormat, renderMix } from "../media/mixer";
import * as db from "./db";

/* ---------- stored shapes ---------- */

type StoredState = Exclude<ProjectState, "queued">; // queued is derived from the run
type ProjectRecord = {
  id: ProjectId;
  name: string;
  video: VideoInfo;
  section: Section;
  state: StoredState;
  run: PrepRun | null;
  failedAtStep: PrepStep | null;
  charged: number;
  reserved: number;
  notify: boolean;
  currentVersion: number | null;
  pendingVersion: number | null;
  turnsTotal: number;
  createdAt: number;
  changedAt: number;
};
type AccountRecord = { balance: number; slotLimit: 2 | 10 };
type TurnRecord = Turn;
type TakeRecord = Take & { audio: Blob };
type VideoRecord = { projectId: ProjectId; blob: Blob; stamp?: string };
type ResultRecord = ResultVersion & { attempts: number; startedAt: number; blob: Blob | null; mime: string | null; failing: boolean };

const DEFAULT_ACCOUNT: AccountRecord = { balance: 120, slotLimit: FREE_SLOT_LIMIT };
const DEFAULT_SETTINGS: DemoSettings = { outcome: "ready", assemblyFails: false, turns: 0, turnMs: 0, speed: 1 };

const now = () => Date.now();
const newId = () => projectId(globalThis.crypto.randomUUID().slice(0, 8));

/* ---------- small helpers ---------- */

async function account(): Promise<AccountRecord> {
  return (await db.get<AccountRecord>("kv", "account")) ?? DEFAULT_ACCOUNT;
}
async function settings(): Promise<DemoSettings> {
  return { ...DEFAULT_SETTINGS, ...((await db.get<Partial<DemoSettings>>("kv", "settings")) ?? {}) };
}

const reservedTotal = (projects: ProjectRecord[]) => projects.reduce((sum, p) => sum + p.reserved, 0);

function stateOf(p: ProjectRecord, t: number): { state: ProjectState; step: PrepStep | null; stepProgress: number; secondsLeft: number | null; turnsFound: number } {
  if (p.state === "preparing" && p.run) {
    const s = prepStatus(p.run, t);
    if (s.phase === "queued") return { state: "queued", step: null, stepProgress: 0, secondsLeft: Math.ceil(s.msLeft / 1000), turnsFound: 0 };
    if (s.phase === "preparing") return { state: "preparing", step: s.step, stepProgress: s.stepProgress, secondsLeft: Math.ceil(s.msLeft / 1000), turnsFound: turnsFoundAt(s, p.turnsTotal) };
  }
  return { state: p.state, step: null, stepProgress: 0, secondsLeft: null, turnsFound: p.state === "recording" || p.state === "done" || p.state === "assembling" ? p.turnsTotal : 0 };
}

async function takesOf(id: ProjectId): Promise<TakeRecord[]> {
  return db.getAll<TakeRecord>("takes", db.byProject(id));
}

function toProject(p: ProjectRecord, takes: TakeRecord[], t = now()): Project {
  const d = stateOf(p, t);
  return {
    id: p.id,
    name: p.name,
    video: p.video,
    section: p.section,
    price: priceOf(p.section),
    state: d.state,
    step: d.step,
    stepProgress: d.stepProgress,
    turnsFound: d.turnsFound,
    secondsLeft: d.secondsLeft,
    failedAtStep: p.failedAtStep,
    charged: p.charged,
    reserved: p.reserved,
    notify: p.notify,
    currentVersion: p.currentVersion,
    pendingVersion: p.pendingVersion,
    takesDone: takes.length,
    turnsTotal: p.turnsTotal,
    createdAt: p.createdAt,
    changedAt: p.changedAt,
  };
}

/* ---------- preparation: materialise derived outcomes with their money effects ---------- */

const decoding = new Set<string>();

async function advance(id: ProjectId): Promise<ProjectRecord | undefined> {
  const before = await db.get<ProjectRecord>("projects", id);
  if (!before || before.state !== "preparing" || !before.run) return before;
  const status = prepStatus(before.run, now());
  if (status.phase !== "failed" && status.phase !== "ready" && status.phase !== "no_dialogue") return before;

  const after = await db.write(["projects", "kv", "turns"], async (s) => {
    const p = (await db.req(s.projects.get(id))) as ProjectRecord | undefined;
    if (!p || p.state !== "preparing" || !p.run) return p; // another tab got here first
    const all = (await db.req(s.projects.getAll())) as ProjectRecord[];
    const acc = ((await db.req(s.kv.get("account"))) as AccountRecord | undefined) ?? DEFAULT_ACCOUNT;
    const ledger = { balance: acc.balance, reserved: reservedTotal(all) };
    const money = { reserved: p.reserved, charged: p.charged };
    let next: ProjectRecord;
    if (status.phase === "failed") {
      const [a, m] = refund(ledger, money);
      s.kv.put({ ...acc, balance: a.balance }, "account");
      next = { ...p, ...m, state: "failed", failedAtStep: status.step, run: null, changedAt: status.at };
    } else {
      const [a, m] = settle(ledger, money);
      s.kv.put({ ...acc, balance: a.balance }, "account");
      next = { ...p, ...m, state: status.phase === "ready" ? "recording" : "no_dialogue", run: null, failedAtStep: null, changedAt: status.at };
      if (status.phase === "ready") {
        const cfg = ((await db.req(s.kv.get("settings"))) as Partial<DemoSettings> | undefined) ?? {};
        for (const plan of planTurns(p.section, p.turnsTotal, cfg.turnMs)) {
          s.turns.put({ projectId: id, n: plan.n, startMs: plan.startMs, windowMs: plan.windowMs, text: plan.text, originalPeaks: [] } satisfies TurnRecord);
        }
      }
    }
    s.projects.put(next);
    return next;
  });
  db.emit({ projectId: id, kind: "project" });
  if (after?.state === "recording") void decodeTurnPeaks(id);
  return after;
}

/** Original peaks for each turn window, decoded from the user's own video (outside the transaction). */
async function decodeTurnPeaks(id: ProjectId): Promise<void> {
  if (decoding.has(id) || typeof window === "undefined" || !window.AudioContext) return;
  decoding.add(id);
  try {
    const video = await db.get<VideoRecord>("videos", id);
    const turns = await db.getAll<TurnRecord>("turns", db.byProject(id));
    if (!video || turns.every((t) => t.originalPeaks.length > 0)) return;
    const buffer = await decodeAudio(video.blob);
    await db.write(["turns"], (s) => {
      for (const t of turns) s.turns.put({ ...t, originalPeaks: buffer ? waveformRange(buffer, t.startMs, t.startMs + t.windowMs) : t.originalPeaks.length ? t.originalPeaks : Array(64).fill(0.05) });
    });
    db.emit({ projectId: id, kind: "turns" });
  } finally {
    decoding.delete(id);
  }
}

/* ---------- result rendering ---------- */

const rendering = new Map<string, Promise<void>>();
const progressMem = new Map<string, number>();
const renderKey = (id: string, n: number) => `${id}:${n}`;

async function ensureRendering(id: ProjectId): Promise<void> {
  const versions = await db.getAll<ResultRecord>("results", db.byProject(id));
  for (const v of versions) {
    if (v.state !== "assembling") continue;
    const key = renderKey(id, v.number);
    if (rendering.has(key)) continue;
    const task = runRender(id, v.number).finally(() => rendering.delete(key));
    rendering.set(key, task);
  }
}

async function runRender(id: ProjectId, number: number): Promise<void> {
  const run = async () => {
    const v = await db.get<ResultRecord>("results", [id, number]);
    const p = await db.get<ProjectRecord>("projects", id);
    if (!v || !p || v.state !== "assembling") return;
    const cfg = await settings();
    let blob: Blob | null = null;
    let mime: string | null = null;
    let format: FileFormat | null = null;
    let failed = false;
    for (let attempt = 1; attempt <= 2 && !blob; attempt += 1) {
      // one automatic retry before "failed" (FR-019)
      try {
        if (v.failing || cfg.assemblyFails) {
          await new Promise((r) => setTimeout(r, 1500 / cfg.speed));
          throw new Error("demo failure");
        }
        const video = await db.get<VideoRecord>("videos", id);
        const turns = await db.getAll<TurnRecord>("turns", db.byProject(id));
        const takes = await takesOf(id);
        if (!video) throw new Error("no video");
        const out = await renderMix({
          video: video.blob,
          section: p.section,
          turns: turns.map((t) => ({ startMs: t.startMs, windowMs: t.windowMs, take: takes.find((k) => k.n === t.n)?.audio ?? null })),
          onProgress: (x) => {
            progressMem.set(renderKey(id, number), x);
            db.emit({ projectId: id, kind: "result-progress" });
          },
        });
        blob = out.blob;
        mime = out.mime;
        format = out.format;
      } catch {
        failed = attempt === 2;
      }
    }
    progressMem.delete(renderKey(id, number));
    await db.write(["results", "projects"], async (s) => {
      const cur = (await db.req(s.results.get([id, number]))) as ResultRecord | undefined;
      const proj = (await db.req(s.projects.get(id))) as ProjectRecord | undefined;
      if (!cur || !proj || cur.state !== "assembling") return;
      if (blob && !failed) {
        s.results.put({ ...cur, state: "ready", progress: 1, blob, mime, format, fileName: `${proj.name}.${format}` });
        if (proj.state === "assembling") s.projects.put({ ...proj, state: "done", currentVersion: number, pendingVersion: null, changedAt: now() });
        else s.projects.put({ ...proj, changedAt: now() });
      } else {
        s.results.put({ ...cur, state: "failed", progress: 0 });
        if (proj.state === "assembling") s.projects.put({ ...proj, state: "assembly_failed", changedAt: now() });
        else s.projects.put({ ...proj, changedAt: now() });
      }
    });
    db.emit({ projectId: id, kind: "result" });
  };
  // One renderer per version across tabs; a tab that can't take the lock leaves it to the one that has it.
  if (navigator.locks?.request) {
    await navigator.locks.request(`dubbed:render:${id}:${number}`, { ifAvailable: true }, async (lock) => {
      if (lock) await run();
    });
  } else {
    await run();
  }
}

function toVersion(r: ResultRecord): ResultVersion {
  const { attempts: _a, startedAt: _s, blob: _b, mime: _m, failing: _f, ...v } = r;
  return { ...v, progress: r.state === "assembling" ? (progressMem.get(renderKey(r.projectId, r.number)) ?? r.progress) : r.progress };
}

async function startVersion(p: ProjectRecord, number: number, rerecorded: number[]): Promise<ResultRecord> {
  const takes = await takesOf(p.id);
  const record: ResultRecord = {
    projectId: p.id,
    number,
    state: "assembling",
    progress: 0,
    takes: Object.fromEntries(takes.map((t) => [t.n, t.savedAt])),
    format: recordableFormat()?.format ?? null,
    fileName: null,
    rerecorded,
    attempts: 0,
    startedAt: now(),
    blob: null,
    mime: null,
    failing: false,
  };
  return record;
}

/* ---------- object URLs (one per blob, revoked on change) ---------- */

// IndexedDB hands out a fresh Blob object on every read, so identity is a stamp (when it was saved), never the object:
// a re-read must not revoke the URL a <video> / <audio> is playing from.
const urls = new Map<string, { stamp: number | string | undefined; url: string }>();
function urlFor(key: string, blob: Blob, stamp: number | string | undefined): string {
  const cur = urls.get(key);
  if (cur && cur.stamp === stamp) return cur.url;
  if (cur) URL.revokeObjectURL(cur.url);
  const url = URL.createObjectURL(blob);
  urls.set(key, { stamp, url });
  return url;
}

/** A removed project: free every object URL made for it (keys are `<kind>:<projectId>[:…]`). */
function revokeUrls(projectId: string) {
  for (const [key, cur] of urls) {
    if (key.split(":")[1] !== projectId) continue;
    URL.revokeObjectURL(cur.url);
    urls.delete(key);
  }
}

/* ---------- the adapter ---------- */

export function createMockServices(): Services {
  const services: Services = {
    adapter: "mock",
    subscribe: db.subscribe,

    account: {
      async get(): Promise<Account> {
        const all = await db.getAll<ProjectRecord>("projects");
        await Promise.all(all.filter((p) => p.state === "preparing").map((p) => advance(p.id)));
        const fresh = await db.getAll<ProjectRecord>("projects");
        const acc = await account();
        return { balance: acc.balance, reserved: reservedTotal(fresh), slotLimit: acc.slotLimit, slotsUsed: fresh.length };
      },
    },

    upload: {
      precheck(file) {
        if (!isAcceptedFile(file)) return fail("type");
        if (file.size > MAX_FILE_BYTES) return fail("size");
        return ok(undefined);
      },
      async upload(file, opts) {
        const all = await db.getAll<ProjectRecord>("projects");
        const acc = await account();
        const replacing = opts.replace ? all.find((p) => p.id === opts.replace && canReplaceVideo(p.state)) : undefined;
        if (!replacing && all.length >= acc.slotLimit) return fail("no-slot");
        // "Upload": local, so simulate network progress (≈ 1.5 s + size), abortable.
        const total = 1200 + Math.min(3000, file.size / 20_000);
        const t0 = now();
        while (now() - t0 < total) {
          if (opts.signal.aborted) return fail("aborted");
          opts.onProgress(Math.min(1, (now() - t0) / total));
          await new Promise((r) => setTimeout(r, 100));
        }
        opts.onProgress(1);
        opts.onChecking?.();
        let probe;
        try {
          probe = await probeVideo(file);
        } catch {
          return fail("broken");
        }
        if (opts.signal.aborted) return fail("aborted");
        if (probe.durationMs > MAX_VIDEO_MS) return fail("length");
        const audio = await decodeAudio(file);
        if (!audio) return fail("no-audio");
        if (opts.signal.aborted) return fail("aborted");

        const t = now();
        const id = replacing?.id ?? newId();
        const record: ProjectRecord = {
          id,
          name: nameFromFile(file.name),
          video: { durationMs: probe.durationMs, width: probe.width, height: probe.height, fileName: file.name, mime: file.type },
          section: defaultSection(probe.durationMs),
          state: "draft",
          run: null,
          failedAtStep: null,
          charged: 0,
          reserved: 0,
          notify: false,
          currentVersion: null,
          pendingVersion: null,
          turnsTotal: 0,
          createdAt: replacing?.createdAt ?? t,
          changedAt: t,
        };
        const outcome = await db.write(["projects", "videos"], async (s) => {
          const count = ((await db.req(s.projects.getAll())) as ProjectRecord[]).length;
          if (!replacing && count >= acc.slotLimit) return false;
          s.projects.put(record);
          s.videos.put({ projectId: id, blob: file, stamp: globalThis.crypto.randomUUID() } satisfies VideoRecord);
          return true;
        });
        if (!outcome) return fail("no-slot");
        db.emit({ projectId: id, kind: "project" });
        return ok(toProject(record, []));
      },
    },

    projects: {
      async list(): Promise<ProjectSummary[]> {
        const ids = (await db.getAll<ProjectRecord>("projects")).map((p) => p.id);
        const fresh = (await Promise.all(ids.map(advance))).filter((p): p is ProjectRecord => Boolean(p));
        const results = await db.getAll<ResultRecord>("results");
        const out = await Promise.all(
          fresh.map(async (p) => {
            const proj = toProject(p, await takesOf(p.id));
            const pending = results.find((r) => r.projectId === p.id && r.number === p.pendingVersion);
            return {
              id: proj.id,
              name: proj.name,
              state: proj.state,
              step: proj.step,
              takesDone: proj.takesDone,
              turnsTotal: proj.turnsTotal,
              currentVersion: proj.currentVersion,
              pendingVersion: proj.pendingVersion,
              changedAt: proj.changedAt,
              video: proj.video,
              section: proj.section,
              pendingAssembling: pending?.state === "assembling",
            } satisfies ProjectSummary;
          }),
        );
        return out.sort((a, b) => b.changedAt - a.changedAt);
      },

      async get(id) {
        const p = await advance(id);
        if (!p) return null;
        if (p.state === "recording") void decodeTurnPeaks(id);
        if (p.state === "assembling" || p.pendingVersion !== null) void ensureRendering(id);
        return toProject(p, await takesOf(id));
      },

      async currentDraft() {
        const drafts = (await db.getAll<ProjectRecord>("projects")).filter((p) => p.state === "draft");
        drafts.sort((a, b) => b.changedAt - a.changedAt);
        return drafts[0] ? toProject(drafts[0], []) : null;
      },

      async setSection(id, section) {
        const p = await db.get<ProjectRecord>("projects", id);
        if (!p || p.state !== "draft") return fail("state");
        if (!isValidSection(section, p.video.durationMs)) return fail("range");
        const next = { ...p, section, changedAt: now() };
        await db.write(["projects"], (s) => s.projects.put(next));
        db.emit({ projectId: id, kind: "project" });
        return ok(toProject(next, []));
      },

      async start(id) {
        const cfg = await settings();
        const result = await db.write(["projects", "kv"], async (s) => {
          const p = (await db.req(s.projects.get(id))) as ProjectRecord | undefined;
          if (!p || p.state !== "draft") return fail("state" as const);
          const all = (await db.req(s.projects.getAll())) as ProjectRecord[];
          const acc = ((await db.req(s.kv.get("account"))) as AccountRecord | undefined) ?? DEFAULT_ACCOUNT;
          const price = priceOf(p.section);
          if (acc.balance < price) return fail("credits" as const);
          const [a, m] = reserve({ balance: acc.balance, reserved: reservedTotal(all) }, { reserved: p.reserved, charged: p.charged }, price);
          const total = cfg.outcome === "no-dialogue" ? 0 : Math.max(1, turnCount(p.section, cfg.turns));
          const next: ProjectRecord = {
            ...p,
            ...m,
            state: "preparing",
            run: { startedAt: now(), fromStep: 1, queued: true, outcome: cfg.outcome, speed: cfg.speed },
            turnsTotal: total,
            changedAt: now(),
          };
          s.kv.put({ ...acc, balance: a.balance }, "account");
          s.projects.put(next);
          return ok(next);
        });
        if (!result.ok) return result;
        db.emit({ projectId: id, kind: "project" });
        return ok(toProject(result.value, []));
      },

      async cancelQuote(id) {
        const p = await advance(id);
        if (!p || p.state !== "preparing" || !p.run) return { stepsDone: 0, charge: 0, refund: 0 };
        const s = prepStatus(p.run, now());
        const stepsDone = s.phase === "preparing" ? s.stepsDone : 0;
        const charge = cancelCharge(priceOf(p.section), stepsDone);
        return { stepsDone, charge, refund: Math.max(0, p.reserved - charge) };
      },

      async cancel(id) {
        const quote = await services.projects.cancelQuote(id);
        const result = await db.write(["projects", "kv", "videos"], async (s) => {
          const p = (await db.req(s.projects.get(id))) as ProjectRecord | undefined;
          if (!p || p.state !== "preparing") return fail("state" as const);
          const all = (await db.req(s.projects.getAll())) as ProjectRecord[];
          const acc = ((await db.req(s.kv.get("account"))) as AccountRecord | undefined) ?? DEFAULT_ACCOUNT;
          const [a, m] = cancelMoney({ balance: acc.balance, reserved: reservedTotal(all) }, { reserved: p.reserved, charged: p.charged }, quote.charge);
          s.kv.put({ ...acc, balance: a.balance }, "account");
          s.projects.delete(id); // cancelled = removed, slot freed
          s.videos.delete(id);
          return ok({ charged: m.charged });
        });
        db.emit({ projectId: id, kind: "removed" });
        return result;
      },

      async retry(id) {
        const cfg = await settings();
        const result = await db.write(["projects", "kv"], async (s) => {
          const p = (await db.req(s.projects.get(id))) as ProjectRecord | undefined;
          if (!p || p.state !== "failed") return fail("state" as const);
          const all = (await db.req(s.projects.getAll())) as ProjectRecord[];
          const acc = ((await db.req(s.kv.get("account"))) as AccountRecord | undefined) ?? DEFAULT_ACCOUNT;
          const price = priceOf(p.section);
          if (acc.balance < price) return fail("credits" as const);
          const [a, m] = reserve({ balance: acc.balance, reserved: reservedTotal(all) }, { reserved: p.reserved, charged: p.charged }, price);
          // the demo failure happens once: Try again succeeds (unless a new outcome was chosen)
          const outcome = cfg.outcome.startsWith("failed@") ? "ready" : cfg.outcome;
          const next: ProjectRecord = {
            ...p,
            ...m,
            state: "preparing",
            run: { startedAt: now(), fromStep: p.failedAtStep ?? 1, queued: false, outcome, speed: cfg.speed },
            changedAt: now(),
          };
          s.kv.put({ ...acc, balance: a.balance }, "account");
          s.projects.put(next);
          return ok(next);
        });
        if (!result.ok) return result;
        db.emit({ projectId: id, kind: "project" });
        return ok(toProject(result.value, []));
      },

      async setNotify(id, on) {
        const p = await db.get<ProjectRecord>("projects", id);
        if (!p) return;
        await db.write(["projects"], (s) => s.projects.put({ ...p, notify: on }));
        db.emit({ projectId: id, kind: "project" });
      },

      async rename(id, name) {
        const p = await db.get<ProjectRecord>("projects", id);
        const clean = name.trim();
        if (!p || !clean) return;
        await db.write(["projects"], (s) => s.projects.put({ ...p, name: clean, changedAt: now() }));
        db.emit({ projectId: id, kind: "project" });
      },

      async remove(id) {
        const p = await db.get<ProjectRecord>("projects", id);
        if (!p) return;
        if (p.state === "preparing") {
          await services.projects.cancel(id);
          return;
        }
        await db.write(["projects", "videos", "turns", "takes", "results"], (s) => {
          s.projects.delete(id);
          s.videos.delete(id);
          s.turns.delete(db.byProject(id));
          s.takes.delete(db.byProject(id));
          s.results.delete(db.byProject(id));
        });
        revokeUrls(id);
        db.emit({ projectId: id, kind: "removed" });
      },

      async videoUrl(id) {
        const v = await db.get<VideoRecord>("videos", id);
        return v ? urlFor(`video:${id}`, v.blob, v.stamp) : null;
      },
    },

    studio: {
      async turns(id) {
        const turns = await db.getAll<TurnRecord>("turns", db.byProject(id));
        if (turns.some((t) => t.originalPeaks.length === 0)) void decodeTurnPeaks(id);
        return turns.sort((a, b) => a.n - b.n);
      },
      async takes(id) {
        return (await takesOf(id)).map(({ audio: _a, ...t }) => t);
      },
      async take(id, n) {
        const t = await db.get<TakeRecord>("takes", [id, n]);
        if (!t) return null;
        const { audio: _a, ...take } = t;
        return take;
      },
      async takeUrl(id, n) {
        const t = await db.get<TakeRecord>("takes", [id, n]);
        return t ? urlFor(`take:${id}:${n}`, t.audio, t.savedAt) : null;
      },
      async acquireCapture(id) {
        const lock = await tryAcquire(id);
        if (!lock) return fail("busy-elsewhere");
        return ok({ projectId: id, release: () => lock.release() });
      },
      whenCaptureFree: (id, signal) => whenFree(id, signal),

      async record(lease, n, opts) {
        const id = lease.projectId;
        // re-record is blocked while any version assembles: the takes being mixed must not change under the renderer
        const assembling = (await db.getAll<ResultRecord>("results", db.byProject(id))).some((v) => v.state === "assembling");
        if (assembling || (await db.get<ProjectRecord>("projects", id))?.state === "assembling") return fail("assembling");
        try {
          const capture = await captureFixedWindow({
            durationMs: opts.windowMs,
            signal: opts.signal,
            stop: opts.stop,
            onStarted: opts.onStarted,
            onProgress: opts.onProgress,
          });
          const p = await db.get<ProjectRecord>("projects", id);
          const take: TakeRecord = {
            projectId: id,
            n,
            mime: capture.mimeType,
            peaks: capture.peaks,
            durationMs: capture.elapsedMs,
            savedAt: now(),
            // after the first version exists, a new take is "not built yet" until a new version is built
            inVersion: p && p.currentVersion !== null ? null : 0,
            audio: capture.blob,
          };
          // saved = durably written (research R5): resolve only after the transaction commits
          await db.write(["takes", "projects"], async (s) => {
            s.takes.put(take);
            const cur = (await db.req(s.projects.get(id))) as ProjectRecord | undefined;
            if (cur) s.projects.put({ ...cur, changedAt: now() });
          });
          db.emit({ projectId: id, kind: "take" });
          const { audio: _a, ...saved } = take;
          return ok(saved);
        } catch (error) {
          if (error instanceof MicrophoneError) return fail(error.kind);
          return fail("interrupted");
        }
      },

      async buildResult(id) {
        const p = await db.get<ProjectRecord>("projects", id);
        if (!p || (p.state !== "recording" && p.state !== "assembly_failed")) return fail("state");
        const takes = await takesOf(id);
        const turns = await db.getAll<TurnRecord>("turns", db.byProject(id));
        if (turns.some((t) => !takes.find((k) => k.n === t.n))) return fail("missing-takes");
        const version = await startVersion(p, 1, []);
        await db.write(["results", "projects", "takes"], (s) => {
          s.results.put(version);
          s.projects.put({ ...p, state: "assembling", changedAt: now() });
          for (const t of takes) s.takes.put({ ...t, inVersion: 1 });
        });
        db.emit({ projectId: id, kind: "result" });
        void ensureRendering(id);
        return ok(toVersion(version));
      },

      async buildNewVersion(id) {
        const p = await db.get<ProjectRecord>("projects", id);
        if (!p || p.state !== "done" || p.currentVersion === null) return fail("state");
        const versions = await db.getAll<ResultRecord>("results", db.byProject(id));
        if (versions.some((v) => v.state === "assembling")) return fail("assembling");
        const takes = await takesOf(id);
        const fresh = takes.filter((t) => t.inVersion === null);
        if (fresh.length === 0) return fail("nothing-new");
        // a pending version that was never switched to is replaced: the new one also carries its re-recorded turns
        const carried = takes.filter((t) => t.inVersion !== null && t.inVersion === p.pendingVersion);
        const number = Math.max(...versions.map((v) => v.number)) + 1;
        const version = await startVersion(p, number, [...fresh, ...carried].map((t) => t.n).sort((a, b) => a - b));
        await db.write(["results", "projects", "takes"], (s) => {
          // a previous pending version (ready or failed, never switched to) is replaced
          if (p.pendingVersion !== null) s.results.delete([id, p.pendingVersion]);
          s.results.put(version);
          s.projects.put({ ...p, pendingVersion: number, changedAt: now() });
          for (const t of [...fresh, ...carried]) s.takes.put({ ...t, inVersion: number });
        });
        db.emit({ projectId: id, kind: "result" });
        void ensureRendering(id);
        return ok(toVersion(version));
      },
    },

    result: {
      async get(id) {
        const p = await db.get<ProjectRecord>("projects", id);
        if (!p) return { current: null, pending: null };
        void ensureRendering(id);
        const versions = await db.getAll<ResultRecord>("results", db.byProject(id));
        // first version while assembling / failed counts as "pending" with no current
        const currentNo = p.currentVersion;
        const pendingNo = p.pendingVersion ?? (currentNo === null ? Math.max(0, ...versions.map((v) => v.number)) || null : null);
        const current = versions.find((v) => v.number === currentNo);
        const pending = versions.find((v) => v.number === pendingNo);
        return { current: current ? toVersion(current) : null, pending: pending ? toVersion(pending) : null };
      },
      async player(id, number) {
        const v = await db.get<ResultRecord>("results", [id, number]);
        const p = await db.get<ProjectRecord>("projects", id);
        if (!v?.blob || !v.format || !p) return null;
        return { url: urlFor(`result:${id}:${number}`, v.blob, v.startedAt), durationMs: p.section.endMs - p.section.startMs, format: v.format };
      },
      async file(id, number) {
        const v = await db.get<ResultRecord>("results", [id, number]);
        if (!v?.blob || !v.fileName) return null;
        return { blob: v.blob, fileName: v.fileName, mime: v.mime ?? v.blob.type };
      },
      async switchTo(id, number) {
        const p = await db.get<ProjectRecord>("projects", id);
        if (!p || p.pendingVersion !== number) return;
        const v = await db.get<ResultRecord>("results", [id, number]);
        if (v?.state !== "ready") return;
        await db.write(["results", "projects"], (s) => {
          if (p.currentVersion !== null) s.results.delete([id, p.currentVersion]); // the old version is gone
          s.projects.put({ ...p, currentVersion: number, pendingVersion: null, changedAt: now() });
        });
        db.emit({ projectId: id, kind: "result" });
      },
      async retry(id, number) {
        const v = await db.get<ResultRecord>("results", [id, number]);
        const p = await db.get<ProjectRecord>("projects", id);
        if (!v || !p || v.state !== "failed") return;
        await db.write(["results", "projects"], (s) => {
          s.results.put({ ...v, state: "assembling", progress: 0, startedAt: now(), failing: false });
          if (p.state === "assembly_failed") s.projects.put({ ...p, state: "assembling", changedAt: now() });
        });
        // the demo failure happens once per Try again
        await db.write(["kv"], async (s) => {
          const cur = ((await db.req(s.kv.get("settings"))) as Partial<DemoSettings> | undefined) ?? {};
          s.kv.put({ ...cur, assemblyFails: false }, "settings");
        });
        db.emit({ projectId: id, kind: "result" });
        void ensureRendering(id);
      },
    },

    demo: {
      async reset() {
        await db.clearAll();
        await db.write(["kv"], (s) => {
          s.kv.put(DEFAULT_ACCOUNT, "account");
          s.kv.put(DEFAULT_SETTINGS, "settings");
        });
        db.emit({ kind: "reset" });
      },
      async set(p) {
        const { balance, slotLimit, fillSlots, ...rest } = p;
        await db.write(["kv", "projects"], async (s) => {
          const acc = ((await db.req(s.kv.get("account"))) as AccountRecord | undefined) ?? DEFAULT_ACCOUNT;
          const cur = ((await db.req(s.kv.get("settings"))) as Partial<DemoSettings> | undefined) ?? {};
          s.kv.put({ ...acc, ...(balance !== undefined ? { balance } : {}), ...(slotLimit ? { slotLimit } : {}) }, "account");
          s.kv.put({ ...DEFAULT_SETTINGS, ...cur, ...rest }, "settings");
          if (fillSlots) {
            const all = (await db.req(s.projects.getAll())) as ProjectRecord[];
            for (let i = all.length; i < acc.slotLimit; i += 1) s.projects.put(demoDoneProject(i));
          }
        });
        db.emit({ kind: "demo" });
      },
    },
  };
  return services;
}

/** A finished placeholder project used by `?demo=slots:full` (it has no video; it only holds a slot). */
function demoDoneProject(i: number): ProjectRecord {
  const t = now() - (i + 1) * 3_600_000;
  return {
    id: projectId(`demo-${i + 1}`),
    name: ["Harbour at dawn", "Rooftop argument", "Night train"][i % 3]!,
    video: { durationMs: 13_000, width: 1280, height: 544, fileName: "demo.mp4", mime: "video/mp4" },
    section: { startMs: 0, endMs: 13_000 },
    state: "no_dialogue",
    run: null,
    failedAtStep: null,
    charged: 13,
    reserved: 0,
    notify: false,
    currentVersion: null,
    pendingVersion: null,
    turnsTotal: 0,
    createdAt: t,
    changedAt: t,
  };
}

export { PAID_SLOT_LIMIT };
