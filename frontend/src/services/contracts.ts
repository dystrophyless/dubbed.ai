/*
 * The services contract the screens use (specs/001-recording-flow-mock/contracts/services.md + data-model.md).
 * The mock adapter (services/mock) implements it in the browser; a real HTTP adapter will implement the same ports later.
 * Expected failures come back as typed outcomes, never as thrown errors.
 */

export type ProjectId = string & { readonly __brand: "ProjectId" };
export const projectId = (value: string) => value as ProjectId;

export type PurchaseId = string & { readonly __brand: "PurchaseId" };
export const purchaseId = (value: string) => value as PurchaseId;

export type Outcome<T, E extends string> = { ok: true; value: T } | { ok: false; error: E };
export const ok = <T>(value: T): { ok: true; value: T } => ({ ok: true, value });
export const fail = <E extends string>(error: E): { ok: false; error: E } => ({ ok: false, error });

/* ---------- Account ---------- */

export type Account = {
  /** credits that can be spent now (int ≥ 0) */
  balance: number;
  /** credits held by queued / preparing projects (int ≥ 0) */
  reserved: number;
  /** 2, 10, 15 … 50 — rules/slots.ts */
  slotLimit: number;
  /** projects in any state except cancelled */
  slotsUsed: number;
};

/* ---------- Project ---------- */

export type ProjectState =
  | "draft"
  | "queued"
  | "preparing"
  | "recording"
  | "assembling"
  | "done"
  | "no_dialogue"
  | "failed"
  | "assembly_failed";

export type Section = { startMs: number; endMs: number };
export type PrepStep = 1 | 2 | 3;
export type FileFormat = "webm" | "mp4";

export type VideoInfo = {
  durationMs: number;
  width: number;
  height: number;
  fileName: string;
  mime: string;
  /** identity of the uploaded source: a replacement gets a new one even when the project id is kept */
  sourceId?: string;
};

export type Project = {
  id: ProjectId;
  name: string;
  video: VideoInfo;
  section: Section;
  /** ceil(section length / 1 000) */
  price: number;
  state: ProjectState;
  /** while preparing */
  step: PrepStep | null;
  /** progress inside the current step, 0..1 (0 when not preparing) */
  stepProgress: number;
  /** turns found so far (from step 2), final count once recording */
  turnsFound: number;
  /** whole seconds until preparation is expected to finish (queued / preparing) */
  secondsLeft: number | null;
  /** the step preparation failed at (Try again resumes there) */
  failedAtStep: PrepStep | null;
  /** credits settled for this project */
  charged: number;
  /** credits currently reserved for this project */
  reserved: number;
  notify: boolean;
  /** number of the current result version, if any */
  currentVersion: number | null;
  /** number of a version being assembled or ready but not switched to */
  pendingVersion: number | null;
  /** turns with a saved take / total turns (recording progress) */
  takesDone: number;
  turnsTotal: number;
  /** lowest turn (1..turnsTotal) without a saved take; turnsTotal when all are taken */
  nextTurn: number;
  createdAt: number;
  changedAt: number;
};

export type ProjectSummary = Pick<
  Project,
  "id" | "name" | "state" | "step" | "takesDone" | "turnsTotal" | "nextTurn" | "currentVersion" | "pendingVersion" | "changedAt" | "video" | "section"
> & { pendingAssembling: boolean };

/* ---------- Studio ---------- */

export type Turn = {
  projectId: ProjectId;
  /** 1-based */
  n: number;
  /** position in the source video */
  startMs: number;
  windowMs: number;
  text: { en: string; ru: string };
  /** 64 peaks of the original audio for the window, 0..1 */
  originalPeaks: number[];
};

export type Take = {
  projectId: ProjectId;
  n: number;
  mime: string;
  peaks: number[];
  durationMs: number;
  savedAt: number;
  /** version it was built into; null = a new take not built yet (re-record mode) */
  inVersion: number | null;
};

export type CaptureLease = { projectId: ProjectId; release(): Promise<void> };

/* ---------- Result ---------- */

export type ResultVersionState = "assembling" | "ready" | "failed";

export type ResultVersion = {
  projectId: ProjectId;
  number: number;
  state: ResultVersionState;
  /** 0..1 while assembling */
  progress: number;
  /** turn number → savedAt of the take it was built from */
  takes: Record<number, number>;
  format: FileFormat | null;
  fileName: string | null;
  /** turns re-recorded relative to the previous version */
  rerecorded: number[];
};

/**
 * What the Result player plays: the rendered version itself (the same file the user downloads), so what they watch is
 * what they get. MediaRecorder files carry no duration — load them with `loadWithDuration` (services/media).
 */
export type ResultPlayer = { url: string; durationMs: number; format: FileFormat };

/* ---------- Credits ---------- */

export type Money = { cents: number; currency: "USD" };
export type CreditPack = { id: string; credits: number; price: Money; best: boolean };
export type ReturnTo = { kind: "new"; projectId: ProjectId; need: number } | { kind: "slots"; from: "new" | "projects" } | null;
export type PurchaseState = "awaiting" | "completed" | "declined" | "cancelled";
export type Purchase = {
  id: PurchaseId; pack: CreditPack; state: PurchaseState; returnTo: ReturnTo; checkoutUrl: string;
  /** slotsBefore === 2 */
  firstPurchase: boolean;
  /** null unless completed */
  slotsBefore: number | null; slotsAfter: number | null;
  createdAt: number; finishedAt: number | null;
};
export type RunState = "reserved" | "charged" | "returned" | "partly_charged" | "failed_returned";
export type HistoryRow =
  | { id: string; kind: "welcome"; at: number; amount: number }
  | { id: string; kind: "purchase"; at: number; amount: number; pack: CreditPack }
  | { id: string; kind: "adjustment"; at: number; amount: number }
  | { id: string; kind: "run"; at: number; updatedAt: number; amount: number; projectId: ProjectId; projectName: string;
      reserved: number; charged: number; returned: number; state: RunState };
export type HistoryPage = { rows: HistoryRow[]; page: number; pages: number };
export interface CreditsPort {
  packs(): Promise<CreditPack[]>;
  /** Newest first; page ≥ 1; page size 20. */
  history(page: number): Promise<HistoryPage>;
  startPurchase(packId: string, returnTo: ReturnTo): Promise<Outcome<Purchase, "pack" | "storage">>;
  getPurchase(id: PurchaseId): Promise<Outcome<Purchase, "not-found">>;
  pay(id: PurchaseId): Promise<Outcome<Purchase, "not-found" | "storage">>;
  cancelPurchase(id: PurchaseId): Promise<Outcome<Purchase, "not-found">>;
  sweep(keep?: PurchaseId): Promise<void>;
}

/* ---------- Ports ---------- */

export type UploadError = "no-slot" | "length" | "short" | "no-audio" | "broken" | "aborted" | "storage";

export interface AccountPort {
  get(): Promise<Account>;
}

export interface UploadPort {
  /** browser-side check (type, size) before any upload */
  precheck(file: File): Outcome<void, "type" | "size">;
  /** uploads + server check; creates a Draft that holds a slot; abort leaves no slot. `replace` = a draft or a no-dialogue project: its slot is reused and it becomes a fresh draft */
  upload(
    file: File,
    opts: { signal: AbortSignal; onProgress(p: number): void; onChecking?(): void; replace?: ProjectId },
  ): Promise<Outcome<Project, UploadError>>;
}

export interface ProjectPort {
  list(): Promise<ProjectSummary[]>;
  get(id: ProjectId): Promise<Project | null>;
  /** the draft that is open on New dub, if any; with `id`, that draft (null when it is not a draft any more) */
  currentDraft(id?: ProjectId): Promise<Project | null>;
  setSection(id: ProjectId, s: Section): Promise<Outcome<Project, "range" | "state">>;
  start(id: ProjectId): Promise<Outcome<Project, "credits" | "state" | "storage">>;
  cancelQuote(id: ProjectId): Promise<{ stepsDone: number; charge: number; refund: number }>;
  /** state = no longer cancellable; not-found = already removed. No cancel charge/refund on either error; time advancement may first settle/refund preparation. */
  cancel(id: ProjectId): Promise<Outcome<{ charged: number }, "state" | "not-found">>;
  retry(id: ProjectId): Promise<Outcome<Project, "credits" | "state">>;
  setNotify(id: ProjectId, on: boolean): Promise<void>;
  rename(id: ProjectId, name: string): Promise<void>;
  /** Active preparation requires explicit cancel confirmation; remove returns state without charging. */
  remove(id: ProjectId): Promise<Outcome<void, "state">>;
  /** object URL of the source video */
  videoUrl(id: ProjectId): Promise<string | null>;
}

export type RecordError = "mic-blocked" | "mic-missing" | "interrupted" | "assembling";

export interface StudioPort {
  turns(id: ProjectId): Promise<Turn[]>;
  takes(id: ProjectId): Promise<Take[]>;
  take(id: ProjectId, n: number): Promise<Take | null>;
  takeUrl(id: ProjectId, n: number): Promise<string | null>;
  /** the single recording lock for this project (Web Locks) */
  acquireCapture(id: ProjectId): Promise<Outcome<CaptureLease, "busy-elsewhere">>;
  /** resolves when another tab releases the lock (for the D2 notice to clear itself) */
  whenCaptureFree(id: ProjectId, signal: AbortSignal): Promise<void>;
  record(
    lease: CaptureLease,
    n: number,
    opts: { windowMs: number; signal: AbortSignal; stop?: AbortSignal; onStarted(): void; onProgress(p: { elapsedMs: number; peaks: number[] }): void },
  ): Promise<Outcome<Take, RecordError>>;
  /** first version (recording → assembling) */
  buildResult(id: ProjectId): Promise<Outcome<ResultVersion, "missing-takes" | "state" | "storage">>;
  buildNewVersion(id: ProjectId): Promise<Outcome<ResultVersion, "nothing-new" | "assembling" | "state" | "storage">>;
}

export interface ResultPort {
  get(id: ProjectId): Promise<{ current: ResultVersion | null; pending: ResultVersion | null }>;
  player(id: ProjectId, version: number): Promise<ResultPlayer | null>;
  file(id: ProjectId, version: number): Promise<{ blob: Blob; fileName: string; mime: string } | null>;
  switchTo(id: ProjectId, version: number): Promise<void>;
  retry(id: ProjectId, version: number): Promise<void>;
}

export type DemoOutcome = "ready" | "no-dialogue" | "failed@1" | "failed@2" | "failed@3";

export type DemoSettings = {
  /** preparation outcome for the next started project */
  outcome: DemoOutcome;
  /** assembly fails (after the automatic retry) */
  assemblyFails: boolean;
  /** force N turns (0 = derived from the section) */
  turns: number;
  /** forced turn window in milliseconds (0 = derived) */
  turnMs: number;
  /** time scale for the simulated server (1 = default demo timings) */
  speed: number;
  payment: "success" | "declined";
  paymentDelayMs: number;
  /** demo/e2e only: how long Buy takes to create the purchase (0 = immediately) */
  startDelayMs?: number;
  /** demo/e2e only: startPurchase / pay fail with "storage" (nothing is created or charged) until cleared */
  failStart?: boolean;
  failPay?: boolean;
  /** demo/e2e only: the projects list read fails until cleared */
  failProjects?: boolean;
};

export type ChangeEvent = { projectId?: ProjectId; purchaseId?: PurchaseId; kind: string };

export interface Services {
  readonly adapter: "mock" | "real";
  account: AccountPort;
  credits: CreditsPort;
  upload: UploadPort;
  projects: ProjectPort;
  studio: StudioPort;
  result: ResultPort;
  /** change feed for cache invalidation, also across tabs */
  subscribe(listener: (e: ChangeEvent) => void): () => void;
  /** mock only — demo presets; absent on the real adapter */
  demo?: {
    reset(): Promise<void>;
    /** slotLimit must satisfy isSlotLimit. */
    set(p: Partial<DemoSettings> & { balance?: number; slotLimit?: number; fillSlots?: boolean }): Promise<void>;
  };
}
