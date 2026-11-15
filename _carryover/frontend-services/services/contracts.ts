export type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type ActorId = Brand<string, 'ActorId'>;
export type ProjectId = Brand<string, 'ProjectId'>;
export type TurnId = Brand<string, 'TurnId'>;
export type OperationId = Brand<string, 'OperationId'>;
export type CandidateId = Brand<string, 'CandidateId'>;
export type CaptureGrantId = Brand<string, 'CaptureGrantId'>;
export type SnapshotId = Brand<string, 'SnapshotId'>;
export type GenerationId = Brand<string, 'GenerationId'>;
export type Locale = 'en' | 'ru';
export type LayoutVariant = 'A' | 'B';
export type CapturePurpose = 'verification-only' | 'recording';

export const actorId = (value: string): ActorId => value as ActorId;
export const projectId = (value: string): ProjectId => value as ProjectId;
export const turnId = (value: string): TurnId => value as TurnId;
export const operationId = (value: string): OperationId => value as OperationId;
export const captureGrantId = (value: string): CaptureGrantId => value as CaptureGrantId;
export const snapshotId = (value: string): SnapshotId => value as SnapshotId;
export const generationId = (value: string): GenerationId => value as GenerationId;

export const resultStartOperationId = (id: SnapshotId): OperationId => operationId(`result-start:${id}`);

export interface IdentityScope {
  actorId: ActorId;
  projectId: ProjectId;
}

export interface PreparedWindow {
  id: TurnId;
  revision: number;
  startMs: number;
  endMs: number;
  text: Readonly<Record<Locale, string>>;
  sourceWaveform: readonly number[];
  sourceWaveformProvenance: string;
}

export interface PreparedProject {
  id: ProjectId;
  accountId: ActorId;
  revision: number;
  preparationRevision: string;
  title: string;
  source: {
    url: string;
    bytes: number;
    sha256: string;
    durationSeconds: number;
    width: number;
    height: number;
    rotationDegrees: number;
    attribution: string;
    license: string;
  };
  windows: readonly PreparedWindow[];
  draftCandidateByTurn: Readonly<Record<string, CandidateId | undefined>>;
  acceptedByTurn: Readonly<Record<string, CandidateId | undefined>>;
  acceptedProjectRevisionByTurn: Readonly<Record<string, number | undefined>>;
  acceptedOperationByTurn: Readonly<Record<string, OperationId | undefined>>;
  acceptedHistory: readonly CandidateId[];
  initialResultSnapshotId?: SnapshotId;
  latestResultSnapshotId?: SnapshotId;
  latestResultGenerationId?: GenerationId;
  tombstonedAt: number | null;
}

export interface AudioProbe {
  mimeType: string;
  byteSize: number;
  durationSeconds: number | null;
  decodedFrames: number | null;
  channelCount: number | null;
  sampleRate: number | null;
  decodeStatus: 'decoded' | 'unavailable' | 'zero-data';
  waveformPeaks: readonly number[];
}

export interface VideoProbe {
  mimeType: string;
  byteSize: number;
  durationSeconds: number | null;
  width: number;
  height: number;
  decodedFrame: boolean;
}

export interface NativeCapture {
  purpose: CapturePurpose;
  blob: Blob;
  mimeType: string;
  startedAt: number;
  stoppedAt: number;
  elapsedMs: number;
  endReason: 'fixed-window' | 'interrupted';
  probe: AudioProbe;
}

export interface CaptureCandidate {
  purpose: CapturePurpose;
  id: CandidateId;
  actorId: ActorId;
  projectId: ProjectId;
  turnId: TurnId;
  turnRevision: number;
  operationId: OperationId;
  captureGrantId?: CaptureGrantId;
  captureGrantFence?: number;
  projectRevision: number;
  mimeType: string;
  byteSize: number;
  sha256: string;
  capturedAt: number;
  startedAt: number;
  stoppedAt: number;
  elapsedMs: number;
  endReason: 'fixed-window' | 'interrupted';
  probe: AudioProbe;
}

export interface StoredCandidate extends CaptureCandidate {
  blob: Blob;
}

export interface SaveCandidateRequest {
  scope: IdentityScope;
  turnId: TurnId;
  expectedTurnRevision: number;
  expectedProjectRevision: number;
  operationId: OperationId;
  captureGrant?: CaptureGrant;
  capture: NativeCapture;
}

export type WriteOutcome =
  | { kind: 'committed'; operationId: OperationId; candidateId: CandidateId; projectRevision: number; sha256: string; snapshotId?: SnapshotId; navigationIntent?: NavigationIntent }
  | { kind: 'unknown'; operationId: OperationId; reason: string };

export type NavigationIntent =
  | { kind: 'advance'; targetTurnId: TurnId; layout: LayoutVariant }
  | { kind: 'previous'; targetTurnId: TurnId; layout: LayoutVariant }
  | { kind: 'exit' }
  | { kind: 'settings'; path: string; layout: LayoutVariant }
  | { kind: 'result'; snapshotId: SnapshotId; layout: LayoutVariant }
  | { kind: 'stay' };

export type OperationLookup =
  | { kind: 'committed'; operationId: OperationId; candidateId?: CandidateId; projectRevision: number; sha256?: string; snapshotId?: SnapshotId; navigationIntent?: NavigationIntent }
  | { kind: 'pending'; operationId: OperationId }
  | { kind: 'failed'; operationId: OperationId; code: string }
  | { kind: 'not-found'; operationId: OperationId };

export interface CaptureGrant {
  id: CaptureGrantId;
  scope: IdentityScope;
  ownerTabId: string;
  fence: number;
  acquiredAt: number;
}

export type CaptureGrantAcquire =
  | { kind: 'acquired'; grant: CaptureGrant; release(): Promise<void> }
  | { kind: 'held' }
  | { kind: 'unavailable'; reason: string };

export interface CaptureGrantPort {
  acquire(scope: IdentityScope): Promise<CaptureGrantAcquire>;
}

export interface AcceptedTakeSnapshot {
  turnId: TurnId;
  turnRevision: number;
  windowStartMs: number;
  windowEndMs: number;
  acceptedCandidateId: CandidateId;
  candidateSha256: string;
  captureOperationId: OperationId;
  acceptOperationId: OperationId;
  acceptedProjectRevision: number;
  byteSize: number;
  mimeType: string;
  capturedAt: number;
  endReason: NativeCapture['endReason'];
}

export interface ResultWindowSnapshot {
  turnId: TurnId;
  turnRevision: number;
  startMs: number;
  endMs: number;
}

export interface ResultBackgroundSnapshot {
  kind: 'source-audio-reference';
  sourceSha256: string;
  preparationRevision: string;
  provenance: string;
}

export interface ImmutableResultSnapshot {
  id: SnapshotId;
  scope: IdentityScope;
  projectRevision: number;
  preparationRevision: string;
  authorizationOperationId: OperationId;
  source: PreparedProject['source'];
  sourceSha256: string;
  selection: {
    sourceSha256: string;
    windows: readonly ResultWindowSnapshot[];
  };
  background: ResultBackgroundSnapshot;
  takes: readonly AcceptedTakeSnapshot[];
  contentSha256: string;
  createdAt: number;
  authorization: 'initial-completion' | 'explicit-completed-revision';
}

export interface AcceptCandidateRequest {
  scope: IdentityScope;
  grant: CaptureGrant;
  turnId: TurnId;
  candidateId: CandidateId;
  expectedTurnRevision: number;
  expectedProjectRevision: number;
  operationId: OperationId;
  navigationIntent: NavigationIntent;
}

export type AcceptOutcome =
  | { kind: 'committed'; operationId: OperationId; candidateId: CandidateId; projectRevision: number; snapshotId?: SnapshotId; navigationIntent: NavigationIntent }
  | { kind: 'unknown'; operationId: OperationId; reason: string };

export interface DiscardCandidateRequest {
  scope: IdentityScope;
  grant: CaptureGrant;
  turnId: TurnId;
  candidateId: CandidateId;
  expectedProjectRevision: number;
  operationId: OperationId;
  navigationIntent: NavigationIntent;
}

export interface ResultSnapshotRequest {
  scope: IdentityScope;
  grant: CaptureGrant;
  expectedProjectRevision: number;
  operationId: OperationId;
  navigationIntent: NavigationIntent;
}

export type SnapshotAuthorizationOutcome =
  | { kind: 'committed'; operationId: OperationId; snapshot: ImmutableResultSnapshot }
  | { kind: 'unknown'; operationId: OperationId; reason: string };

export interface ResultGenerationIdentity {
  id: GenerationId;
  scope: IdentityScope;
  projectRevision: number;
  snapshotId: SnapshotId;
  snapshotContentSha256: string;
  authorizationOperationId: OperationId;
  operationId: OperationId;
  fixtureId: string;
  mediaSha256: string;
  productRendered: false;
  assembledFromAcceptedTakes: false;
}

export type MockResultStatus = 'queued' | 'assembling' | 'retrying' | 'ready' | 'failed';

export interface MockResultJob extends ResultGenerationIdentity {
  status: MockResultStatus;
  fixture: MockGenerationFixture;
  previousGenerationId?: GenerationId;
  attempt: number;
  automaticRetryCount: number;
  manualRetryCount: number;
  retryLineageId: OperationId;
  retryOperationIds: readonly OperationId[];
  errorCode?: string;
  progressPercent?: number;
  createdAt: number;
  updatedAt: number;
  readyAt?: number;
}

export interface MockResultWorkspace {
  snapshot: ImmutableResultSnapshot;
  job: MockResultJob | null;
  currentGeneration: MockResultJob | null;
  latestAuthorizedSnapshotId: SnapshotId | null;
  isLatestAuthorization: boolean;
}

export type ResultCommandOutcome =
  | { kind: 'committed'; operationId: OperationId; job: MockResultJob }
  | { kind: 'unknown'; operationId: OperationId; reason: string };

export type ResultOperationLookup =
  | { kind: 'committed'; operationId: OperationId; job: MockResultJob }
  | { kind: 'pending'; operationId: OperationId }
  | { kind: 'failed'; operationId: OperationId; code: string }
  | { kind: 'not-found'; operationId: OperationId };

export interface ResultMediaPayload {
  job: MockResultJob;
  blob: Blob;
  filename: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
}

export interface MockGenerationFixture {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  bytes: number;
  sha256: string;
  durationSeconds: number;
  width: number;
  height: number;
  rotationDegrees: number;
  provenance: string;
  productRendered: false;
  assembledFromAcceptedTakes: false;
}

export interface BrowserMediaPort {
  decodeSourceWaveforms(input: {
    url: string;
    expectedSha256: string;
    windows: readonly { startMs: number; endMs: number }[];
    signal?: AbortSignal;
  }): Promise<readonly (readonly number[])[]>;
  captureFixedWindow(input: {
    durationMs: number;
    purpose: CapturePurpose;
    signal?: AbortSignal;
    interruptSignal?: AbortSignal;
    onWindowStart?: (startCapture: () => void) => void | Promise<void>;
    getWindowProgressMs?: () => number | null;
    onCaptureStarted?: () => void;
    onProgress?: (progress: { elapsedMs: number; waveformPeaks: readonly number[] }) => void;
  }): Promise<NativeCapture>;
  createObjectUrl(blob: Blob): string;
  revokeObjectUrl(url: string): void;
  probeVideo(blob: Blob): Promise<VideoProbe>;
}

export interface ResultPort {
  startOrReconcile(input: { scope: IdentityScope; snapshotId: SnapshotId }): Promise<ResultCommandOutcome>;
  loadWorkspace(scope: IdentityScope, snapshotId: SnapshotId): Promise<MockResultWorkspace | null>;
  retryAssembly(input: { scope: IdentityScope; snapshotId: SnapshotId; operationId: OperationId }): Promise<ResultCommandOutcome>;
  lookupResultOperation(scope: IdentityScope, operationId: OperationId): Promise<ResultOperationLookup>;
  readGenerationMedia(scope: IdentityScope, id: GenerationId): Promise<ResultMediaPayload>;
  resumeAuthorized(scope: IdentityScope): Promise<void>;
  subscribe(scope: IdentityScope, listener: () => void): () => void;
}

export interface ProjectPort {
  loadPreparedProject(scope: IdentityScope): Promise<PreparedProject | null>;
  acquireCaptureGrant(scope: IdentityScope, id: CaptureGrantId, ownerTabId: string): Promise<CaptureGrant>;
  releaseCaptureGrant(scope: IdentityScope, grant: CaptureGrant): Promise<void>;
  saveCandidate(request: SaveCandidateRequest): Promise<WriteOutcome>;
  acceptCandidate(request: AcceptCandidateRequest): Promise<AcceptOutcome>;
  discardCandidate(request: DiscardCandidateRequest): Promise<WriteOutcome>;
  authorizeResultSnapshot(request: ResultSnapshotRequest): Promise<SnapshotAuthorizationOutcome>;
  getResultSnapshot(scope: IdentityScope, id: SnapshotId): Promise<ImmutableResultSnapshot | null>;
  getAcceptedCandidate(scope: IdentityScope, turnId: TurnId): Promise<StoredCandidate | null>;
  lookupOperation(scope: IdentityScope, operationId: OperationId): Promise<OperationLookup>;
  findPendingCaptureOperation(scope: IdentityScope, turnId: TurnId): Promise<OperationId | null>;
  findPendingAcceptanceOperation(scope: IdentityScope, turnId: TurnId): Promise<OperationId | null>;
  findIncompleteNavigationIntent(scope: IdentityScope): Promise<{ operationId: OperationId; intent: NavigationIntent } | null>;
  completeNavigationIntent(scope: IdentityScope, operationId: OperationId): Promise<void>;
  getCandidate(scope: IdentityScope, candidateId: CandidateId): Promise<StoredCandidate | null>;
  getCandidateForOperation(scope: IdentityScope, operationId: OperationId): Promise<StoredCandidate | null>;
  getCurrentCandidate(scope: IdentityScope, turnId: TurnId): Promise<StoredCandidate | null>;
  tombstoneProject(scope: IdentityScope, expectedRevision: number, operationId: OperationId): Promise<number>;
}

export interface Services {
  readonly adapter: 'mock';
  readonly actorId: ActorId;
  readonly projects: ProjectPort;
  readonly grants: CaptureGrantPort;
  readonly media: BrowserMediaPort;
  readonly results: ResultPort;
  readonly resultFixtures: readonly MockGenerationFixture[];
  initialize(): Promise<void>;
}
