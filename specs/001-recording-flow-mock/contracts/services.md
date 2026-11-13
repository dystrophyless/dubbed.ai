# Contract: the services layer used by the screens

The screens depend only on these ports (TypeScript in `frontend/src/services/contracts.ts`). The mock adapter implements
them in the browser; the future real adapter implements the same ports over HTTP. Every method is async; errors are
returned as typed outcomes, never thrown for expected cases.

```ts
type ProjectId = string & { readonly __brand: "ProjectId" };

interface AccountPort {
  get(): Promise<Account>;                                   // balance, reserved, slotLimit, slotsUsed
}

interface UploadPort {
  /** browser-side check (type, size) before any upload */
  precheck(file: File): Outcome<void, "type" | "size">;
  /** uploads + server check; creates a Draft that holds a slot; cancel aborts without a slot */
  upload(file: File, opts: { signal: AbortSignal; onProgress(p: number): void; replace?: ProjectId }):
    Promise<Outcome<Project, "no-slot" | "length" | "no-audio" | "broken" | "aborted">>;
}

interface ProjectPort {
  list(): Promise<ProjectSummary[]>;                          // My projects (cancelled excluded)
  get(id: ProjectId): Promise<Project | null>;                // state derived from server time
  setSection(id: ProjectId, s: { startMs: number; endMs: number }): Promise<Outcome<Project, "range">>;
  start(id: ProjectId): Promise<Outcome<Project, "credits" | "state">>;          // reserve, queue
  cancelQuote(id: ProjectId): Promise<{ charge: number; refund: number }>;      // live amount for the dialog
  cancel(id: ProjectId): Promise<Outcome<{ charged: number }, "state">>;
  retry(id: ProjectId): Promise<Outcome<Project, "credits" | "state">>;         // failed → resume failed step
  setNotify(id: ProjectId, on: boolean): Promise<void>;
  rename(id: ProjectId, name: string): Promise<void>;
  remove(id: ProjectId): Promise<void>;                       // frees the slot
  videoUrl(id: ProjectId): Promise<string>;                   // object URL of the source video
}

interface StudioPort {
  turns(id: ProjectId): Promise<Turn[]>;
  take(id: ProjectId, n: number): Promise<Take | null>;
  takeUrl(id: ProjectId, n: number): Promise<string | null>;
  /** acquire the single recording lock for this tab (WebLock); released on stop/unmount */
  acquireCapture(id: ProjectId): Promise<Outcome<CaptureLease, "busy-elsewhere">>;
  record(lease: CaptureLease, n: number, opts: {
    windowMs: number; signal: AbortSignal;
    onStarted(): void; onProgress(p: { elapsedMs: number; peaks: number[] }): void;
  }): Promise<Outcome<Take, "mic-blocked" | "mic-missing" | "interrupted">>;     // resolves after the durable save
  buildResult(id: ProjectId): Promise<Outcome<ResultVersion, "missing-takes">>;  // first version (recording → assembling)
  buildNewVersion(id: ProjectId): Promise<Outcome<ResultVersion, "nothing-new" | "assembling">>;
}

interface ResultPort {
  get(id: ProjectId): Promise<{ current: ResultVersion | null; pending: ResultVersion | null }>;
  /** live mix for playback: the muted section video + takes at their turn starts */
  player(id: ProjectId, version: number): Promise<MixPlayer>;
  file(id: ProjectId, version: number): Promise<{ blob: Blob; fileName: string; mime: string }>;
  switchTo(id: ProjectId, version: number): Promise<void>;    // deletes the old version
  retry(id: ProjectId, version: number): Promise<void>;
}

interface Services {
  readonly adapter: "mock" | "real";
  account: AccountPort; upload: UploadPort; projects: ProjectPort; studio: StudioPort; result: ResultPort;
  /** change feed for cache invalidation across tabs */
  subscribe(listener: (e: { projectId?: ProjectId; kind: string }) => void): () => void;
  /** mock only — demo presets and outcomes; absent on the real adapter */
  demo?: { reset(): Promise<void>; set(p: Partial<DemoSettings>): Promise<void> };
}
```

`Outcome<T, E>` = `{ ok: true; value: T } | { ok: false; error: E }`. Field shapes: see `../data-model.md`.

## UI ↔ contract map

| Screen / action | Port call | Error → UI |
|---|---|---|
| New dub: choose file | `upload.precheck` → `upload.upload` | type/size → refused before upload; length/no-audio/broken → error state; no-slot → no-slot state |
| New dub: section | `projects.setSection` | range → limit hint at 120 s |
| New dub: Start | `projects.start` → navigate to Processing | credits → disabled Start + shortfall |
| Processing | `projects.get` (polled while active), `cancelQuote`, `cancel`, `retry`, `setNotify` | failed / no-dialogue states |
| Studio | `studio.turns/take/takeUrl/acquireCapture/record`, `buildResult`, `buildNewVersion` | mic-blocked → bottom notice; busy-elsewhere → notice "recording in another tab" |
| Result | `result.get` (polled while assembling), `player`, `file`, `switchTo`, `retry` | failed → Try again |
| My projects | `projects.list`, `rename`, `remove` | — |
