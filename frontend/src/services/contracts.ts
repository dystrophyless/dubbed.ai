/*
 * The services contract the screens use (specs/001-recording-flow-mock/contracts/services.md + data-model.md).
 * The mock adapter (services/mock) implements it in the browser; a real HTTP adapter will implement the same ports later.
 * Expected failures come back as typed outcomes, never as thrown errors.
 */

export type ProjectId = string & { readonly __brand: "ProjectId" };
export const projectId = (value: string) => value as ProjectId;

export type Outcome<T, E extends string> = { ok: true; value: T } | { ok: false; error: E };
export const ok = <T>(value: T): { ok: true; value: T } => ({ ok: true, value });
export const fail = <E extends string>(error: E): { ok: false; error: E } => ({ ok: false, error });

/* ---------- Account ---------- */

export type Account = {
  /** credits that can be spent now (int ≥ 0) */
  balance: number;
  /** credits held by queued / preparing projects (int ≥ 0) */
  reserved: number;
  /** 2, or 10 after the first purchase */
  slotLimit: 2 | 10;
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

export type VideoInfo = { durationMs: number; width: number; height: number; fileName: string; mime: string };

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
  createdAt: number;
  changedAt: number;
};

export type ProjectSummary = Pick<
  Project,
  "id" | "name" | "state" | "step" | "takesDone" | "turnsTotal" | "currentVersion" | "pendingVersion" | "changedAt" | "video" | "section"
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

/* ---------- Ports ---------- */

export type UploadError = "no-slot" | "length" | "no-audio" | "broken" | "aborted";

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
  /** the draft that is open on New dub, if any */
  currentDraft(): Promise<Project | null>;
  setSection(id: ProjectId, s: Section): Promise<Outcome<Project, "range" | "state">>;
  start(id: ProjectId): Promise<Outcome<Project, "credits" | "state">>;
  cancelQuote(id: ProjectId): Promise<{ stepsDone: number; charge: number; refund: number }>;
  cancel(id: ProjectId): Promise<Outcome<{ charged: number }, "state">>;
  retry(id: ProjectId): Promise<Outcome<Project, "credits" | "state">>;
  setNotify(id: ProjectId, on: boolean): Promise<void>;
  rename(id: ProjectId, name: string): Promise<void>;
  remove(id: ProjectId): Promise<void>;
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
  buildResult(id: ProjectId): Promise<Outcome<ResultVersion, "missing-takes" | "state">>;
  buildNewVersion(id: ProjectId): Promise<Outcome<ResultVersion, "nothing-new" | "assembling" | "state">>;
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
};

export type ChangeEvent = { projectId?: ProjectId; kind: string };

export interface Services {
  readonly adapter: "mock" | "real";
  account: AccountPort;
  upload: UploadPort;
  projects: ProjectPort;
  studio: StudioPort;
  result: ResultPort;
  /** change feed for cache invalidation, also across tabs */
  subscribe(listener: (e: ChangeEvent) => void): () => void;
  /** mock only — demo presets; absent on the real adapter */
  demo?: {
    reset(): Promise<void>;
    set(p: Partial<DemoSettings> & { balance?: number; slotLimit?: 2 | 10; fillSlots?: boolean }): Promise<void>;
  };
}
