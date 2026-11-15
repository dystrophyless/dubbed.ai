import {
  type ActorId,
  type AcceptCandidateRequest,
  type AcceptOutcome,
  type CaptureGrant,
  type CaptureGrantId,
  type CandidateId,
  type DiscardCandidateRequest,
  type IdentityScope,
  type ImmutableResultSnapshot,
  type NavigationIntent,
  type OperationId,
  type OperationLookup,
  type PreparedProject,
  type ProjectPort,
  type ResultPort,
  type MockGenerationFixture,
  type MockResultJob,
  type MockResultWorkspace,
  type ResultCommandOutcome,
  type ResultMediaPayload,
  type ResultOperationLookup,
  type ResultSnapshotRequest,
  type SnapshotAuthorizationOutcome,
  type SnapshotId,
  type SaveCandidateRequest,
  type StoredCandidate,
  type WriteOutcome,
  type TurnId,
  type GenerationId,
  resultStartOperationId,
  generationId,
  snapshotId,
  projectId,
} from '../contracts';
import { createSeedProject, RESULT_FIXTURES, SEEDED_PROJECT_ID } from './fixtures';

const DATABASE_VERSION = 3;
const PROJECTS = 'projects';
const MEDIA = 'media';
const OPERATIONS = 'operations';
const GRANTS = 'grants';
const SNAPSHOTS = 'snapshots';
const RESULT_OPERATIONS = 'resultOperations';
const RESULT_JOBS = 'resultJobs';
const RESULT_MEDIA = 'resultMedia';

type JournalState = 'pending' | 'committed' | 'failed' | 'rejected';
type JournalKind = 'save-candidate' | 'accept-candidate' | 'discard-candidate' | 'authorize-result' | 'tombstone-project';

interface JournalRecord {
  id: OperationId;
  actorId: ActorId;
  projectId: string;
  kind: JournalKind;
  turnId?: TurnId;
  fingerprint: string;
  state: JournalState;
  createdAt: number;
  candidateId?: CandidateId;
  projectRevision?: number;
  sha256?: string;
  snapshotId?: SnapshotId;
  navigationIntent?: NavigationIntent;
  navigationCompleted?: boolean;
  code?: string;
}

interface GrantRecord {
  projectId: string;
  actorId: ActorId;
  id: CaptureGrantId;
  ownerTabId: string;
  fence: number;
  acquiredAt: number;
  state: 'active' | 'released';
}

interface ResultOperationRecord {
  id: OperationId;
  actorId: ActorId;
  projectId: string;
  snapshotId: SnapshotId;
  fingerprint: string;
  state: 'committed' | 'failed';
  generationId?: GenerationId;
  createdAt: number;
  code?: string;
}

interface StoredResultMedia {
  id: GenerationId;
  actorId: ActorId;
  projectId: string;
  blob: Blob;
  filename: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
}

type DatabaseProject = PreparedProject;
type DatabaseMedia = StoredCandidate;

export interface MockStoreFaults {
  failOpen?: boolean;
  loseAcknowledgementFor?: Set<string>;
  quotaExceededFor?: Set<string>;
  failAcceptFor?: Set<string>;
  failSnapshotFor?: Set<string>;
  failResultStartFor?: Set<string>;
  loseResultStartAcknowledgementFor?: Set<string>;
  failResultRetryFor?: Set<string>;
  loseResultRetryAcknowledgementFor?: Set<string>;
  failResultFixtureFor?: Set<string>;
}

export interface IndexedDbProjectStoreOptions {
  databaseName?: string;
  idbFactory?: IDBFactory;
  faults?: MockStoreFaults;
  resultFixtures?: readonly MockGenerationFixture[];
  fetcher?: typeof fetch;
}

export class ServiceStorageUnavailableError extends Error {
  constructor(message = 'Browser storage is unavailable. No data was saved.') {
    super(message);
    this.name = 'ServiceStorageUnavailableError';
  }
}

export class ServiceStorageFullError extends Error {
  constructor() {
    super('Browser storage is full. The previous saved media remains unchanged.');
    this.name = 'ServiceStorageFullError';
  }
}

export class ProjectNotFoundError extends Error {
  constructor() {
    super('This prepared project is unavailable for the current account.');
    this.name = 'ProjectNotFoundError';
  }
}

export class ProjectDeletedError extends Error {
  constructor() {
    super('This project was deleted. Its local data cannot be restored by a stale write.');
    this.name = 'ProjectDeletedError';
  }
}

export class ProjectRevisionConflictError extends Error {
  constructor() {
    super('The prepared project changed. Reload it before starting a new operation.');
    this.name = 'ProjectRevisionConflictError';
  }
}

export class CandidateRevisionConflictError extends Error {
  constructor() {
    super('This dialogue window changed. Reload it before starting a new operation.');
    this.name = 'CandidateRevisionConflictError';
  }
}

export class IdempotencyConflictError extends Error {
  constructor() {
    super('This operation ID already belongs to a different request. No write was made.');
    this.name = 'IdempotencyConflictError';
  }
}

export class OperationStillPendingError extends Error {
  constructor() {
    super('The operation is still unresolved. Look it up before attempting another write.');
    this.name = 'OperationStillPendingError';
  }
}

export class ZeroDataCaptureError extends Error {
  constructor() {
    super('The browser returned zero bytes. Nothing was saved.');
    this.name = 'ZeroDataCaptureError';
  }
}

export class CaptureGrantUnavailableError extends Error {
  constructor() {
    super('The exclusive local recording grant is missing or has been replaced. No write was made.');
    this.name = 'CaptureGrantUnavailableError';
  }
}

export class CandidateUnavailableError extends Error {
  constructor() {
    super('This take is no longer the current recoverable candidate. No acceptance was made.');
    this.name = 'CandidateUnavailableError';
  }
}

export class ResultAuthorizationUnavailableError extends Error {
  constructor() {
    super('Every prepared dialogue window needs an accepted take before a result snapshot can be authorized.');
    this.name = 'ResultAuthorizationUnavailableError';
  }
}

export class ResultSnapshotChangedError extends Error {
  constructor() {
    super('The authorized result snapshot no longer matches the current project revision. Authorize the result again from Record.');
    this.name = 'ResultSnapshotChangedError';
  }
}

export class ResultMediaUnavailableError extends Error {
  constructor() {
    super('This result fixture is unavailable for the current account or project.');
    this.name = 'ResultMediaUnavailableError';
  }
}

function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

function mapStorageError(error: unknown): Error {
  const mapped = asError(error);
  if (mapped.name === 'QuotaExceededError') return new ServiceStorageFullError();
  if (['SecurityError', 'NotAllowedError', 'InvalidStateError'].includes(mapped.name)) {
    return new ServiceStorageUnavailableError();
  }
  return mapped;
}

function sha256(bytes: ArrayBuffer): Promise<string> {
  return globalThis.crypto.subtle.digest('SHA-256', bytes).then((digest) =>
    Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(''),
  );
}

function operationFingerprint(parts: readonly unknown[]): Promise<string> {
  return sha256(new TextEncoder().encode(JSON.stringify(parts)).buffer);
}

interface Reservation {
  kind: 'new' | 'committed' | 'pending' | 'failed' | 'conflict';
  record?: JournalRecord;
}

interface CommitResult {
  kind: 'committed' | 'rejected';
  record?: JournalRecord;
  code?: string;
}

export class IndexedDbProjectStore implements ProjectPort, ResultPort {
  private readonly databaseName: string;
  private readonly factory: IDBFactory;
  private readonly faults: MockStoreFaults;
  private readonly resultFixtures: readonly MockGenerationFixture[];
  private readonly fetcher: typeof fetch;
  private readonly resultListeners = new Map<string, Set<() => void>>();
  private readonly materializationInFlight = new Set<GenerationId>();
  private databasePromise: Promise<IDBDatabase> | undefined;

  constructor(options: IndexedDbProjectStoreOptions = {}) {
    this.databaseName = options.databaseName ?? 'dubbed-core-local-v1';
    this.factory = options.idbFactory ?? indexedDB;
    this.faults = options.faults ?? {};
    this.resultFixtures = options.resultFixtures ?? RESULT_FIXTURES;
    this.fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
  }

  async initialize(): Promise<void> {
    await this.transaction([PROJECTS], 'readwrite', (transaction, complete, fail) => {
      const store = transaction.objectStore(PROJECTS);
      const request = store.get(SEEDED_PROJECT_ID);
      request.onsuccess = () => {
        if (!request.result) store.add(createSeedProject());
        complete(undefined);
      };
      request.onerror = () => fail(request.error ?? new Error('Could not read the local seed.'));
    });
  }

  async loadPreparedProject(scope: IdentityScope): Promise<PreparedProject | null> {
    const record = await this.transaction<DatabaseProject | undefined>([PROJECTS], 'readonly', (transaction, complete) => {
      const request = transaction.objectStore(PROJECTS).get(scope.projectId);
      request.onsuccess = () => complete(request.result as DatabaseProject | undefined);
    });
    if (!record || record.accountId !== scope.actorId || record.tombstonedAt !== null) return null;
    return record;
  }

  async acquireCaptureGrant(scope: IdentityScope, id: CaptureGrantId, ownerTabId: string): Promise<CaptureGrant> {
    const acquiredAt = Date.now();
    const outcome = await this.transaction<{ grant?: CaptureGrant; error?: Error }>([PROJECTS, GRANTS], 'readwrite', (transaction, complete) => {
      const projectRequest = transaction.objectStore(PROJECTS).get(scope.projectId);
      const grants = transaction.objectStore(GRANTS);
      const grantRequest = grants.get(scope.projectId);
      let project: DatabaseProject | undefined;
      let previous: GrantRecord | undefined;
      let reads = 0;
      const finish = () => {
        reads += 1;
        if (reads !== 2) return;
        if (!project || project.accountId !== scope.actorId) {
          complete({ error: new ProjectNotFoundError() });
          return;
        }
        if (project.tombstonedAt !== null) {
          complete({ error: new ProjectDeletedError() });
          return;
        }
        const grant: CaptureGrant = {
          id, scope, ownerTabId, fence: (previous?.fence ?? 0) + 1, acquiredAt,
        };
        grants.put({
          projectId: scope.projectId,
          actorId: scope.actorId,
          id,
          ownerTabId,
          fence: grant.fence,
          acquiredAt,
          state: 'active',
        } satisfies GrantRecord);
        complete({ grant });
      };
      projectRequest.onsuccess = () => { project = projectRequest.result as DatabaseProject | undefined; finish(); };
      grantRequest.onsuccess = () => { previous = grantRequest.result as GrantRecord | undefined; finish(); };
    });
    if (outcome.error) throw outcome.error;
    if (!outcome.grant) throw new Error('The local recording grant could not be persisted.');
    return outcome.grant;
  }

  async releaseCaptureGrant(scope: IdentityScope, grant: CaptureGrant): Promise<void> {
    await this.transaction<void>([GRANTS], 'readwrite', (transaction, complete) => {
      const store = transaction.objectStore(GRANTS);
      const request = store.get(scope.projectId);
      request.onsuccess = () => {
        const current = request.result as GrantRecord | undefined;
        if (current?.actorId === scope.actorId && current.id === grant.id && current.fence === grant.fence) {
          store.put({ ...current, state: 'released' });
        }
        complete(undefined);
      };
    });
  }

  async saveCandidate(request: SaveCandidateRequest): Promise<WriteOutcome> {
    if (request.capture.blob.size === 0) throw new ZeroDataCaptureError();
    if (request.capture.purpose === 'recording' && !request.captureGrant) throw new CaptureGrantUnavailableError();
    if (request.capture.probe.byteSize !== request.capture.blob.size) {
      throw new Error('Captured byte metadata does not match the Blob.');
    }
    const contentHash = await sha256(await request.capture.blob.arrayBuffer());
    const fingerprint = await operationFingerprint([
      'save-candidate', request.capture.purpose, request.scope.actorId, request.scope.projectId, request.turnId,
      request.expectedTurnRevision, request.expectedProjectRevision, contentHash,
      request.captureGrant?.id, request.captureGrant?.fence,
    ]);
    const reservation = await this.reserveOperation({
      id: request.operationId,
      actorId: request.scope.actorId,
      projectId: request.scope.projectId,
      kind: 'save-candidate',
      turnId: request.turnId,
      fingerprint,
      createdAt: request.capture.stoppedAt,
    });
    if (reservation.kind === 'conflict') throw new IdempotencyConflictError();
    if (reservation.kind === 'committed' && reservation.record) {
      return this.toWriteOutcome(reservation.record);
    }
    if (reservation.kind === 'pending') return { kind: 'unknown', operationId: request.operationId, reason: 'The same operation is already pending.' };
    if (reservation.kind === 'failed') throw new OperationStillPendingError();

    if (this.consumeFault(this.faults.quotaExceededFor, request.operationId)) {
      await this.markOperation(request.operationId, 'failed', 'quota-exceeded');
      throw new ServiceStorageFullError();
    }

    try {
      const result = await this.commitCandidate(request, contentHash, fingerprint);
      if (result.kind === 'rejected') this.throwRejected(result.code);
      const record = result.record;
      if (!record?.candidateId || record.projectRevision === undefined || !record.sha256) {
        return { kind: 'unknown', operationId: request.operationId, reason: 'The committed journal entry is incomplete.' };
      }
      if (this.consumeFault(this.faults.loseAcknowledgementFor, request.operationId)) {
        return { kind: 'unknown', operationId: request.operationId, reason: 'The write committed, but its acknowledgement was lost.' };
      }
      return this.toWriteOutcome(record);
    } catch (error) {
      if (error instanceof ProjectNotFoundError || error instanceof ProjectDeletedError
        || error instanceof ProjectRevisionConflictError || error instanceof CandidateRevisionConflictError
        || error instanceof IdempotencyConflictError) throw error;

      const lookup = await this.lookupOperation(request.scope, request.operationId).catch(() => ({ kind: 'not-found', operationId: request.operationId } as const));
      if (lookup.kind === 'committed' || lookup.kind === 'pending') {
        return { kind: 'unknown', operationId: request.operationId, reason: 'The write outcome needs lookup; no retry was attempted.' };
      }
      const mapped = mapStorageError(error);
      if (mapped instanceof ServiceStorageFullError) {
        await this.markOperation(request.operationId, 'failed', 'quota-exceeded').catch(() => false);
        throw mapped;
      }
      await this.markOperation(request.operationId, 'failed', 'transaction-aborted').catch(() => false);
      throw mapped;
    }
  }

  async acceptCandidate(request: AcceptCandidateRequest): Promise<AcceptOutcome> {
    const project = await this.loadPreparedProject(request.scope);
    if (!project) throw new ProjectNotFoundError();
    if (project.revision !== request.expectedProjectRevision) throw new ProjectRevisionConflictError();
    const window = project.windows.find((item) => item.id === request.turnId);
    if (!window || window.revision !== request.expectedTurnRevision) throw new CandidateRevisionConflictError();
    const candidate = await this.getCandidate(request.scope, request.candidateId);
    if (!candidate || candidate.turnId !== request.turnId || candidate.purpose !== 'recording') throw new CandidateUnavailableError();
    if (project.draftCandidateByTurn[request.turnId] !== request.candidateId) throw new CandidateUnavailableError();

    const acceptedAfter = { ...project.acceptedByTurn, [request.turnId]: request.candidateId };
    const initialCompletion = !project.initialResultSnapshotId
      && project.windows.every((item) => acceptedAfter[item.id] !== undefined);
    const explicitCompletedRevision = Boolean(project.initialResultSnapshotId && request.navigationIntent.kind === 'result');
    const newProjectRevision = project.revision + 1;
    let firstSnapshot: ImmutableResultSnapshot | undefined;
    if (initialCompletion || explicitCompletedRevision) {
      const takes = await this.readSnapshotTakes(project, acceptedAfter, request.turnId, candidate, newProjectRevision, request.operationId);
      firstSnapshot = await this.createSnapshotDraft({
        scope: request.scope,
        project,
        id: snapshotId(`snapshot:${request.operationId}`),
        projectRevision: newProjectRevision,
        authorizationOperationId: request.operationId,
        takes,
        authorization: initialCompletion ? 'initial-completion' : 'explicit-completed-revision',
      });
    }

    const fingerprint = await operationFingerprint([
      'accept-candidate', request.scope.actorId, request.scope.projectId, request.turnId, request.candidateId,
      request.expectedTurnRevision, request.expectedProjectRevision, request.grant.id, request.grant.fence,
      candidate.sha256, request.navigationIntent, firstSnapshot?.contentSha256,
    ]);
    const reservation = await this.reserveOperation({
      id: request.operationId,
      actorId: request.scope.actorId,
      projectId: request.scope.projectId,
      kind: 'accept-candidate',
      turnId: request.turnId,
      fingerprint,
      createdAt: Date.now(),
      candidateId: request.candidateId,
      navigationIntent: request.navigationIntent,
      navigationCompleted: false,
    });
    if (reservation.kind === 'conflict') throw new IdempotencyConflictError();
    if (reservation.kind === 'committed' && reservation.record) return this.toAcceptOutcome(reservation.record);
    if (reservation.kind === 'pending') return { kind: 'unknown', operationId: request.operationId, reason: 'The same acceptance is still unresolved.' };
    if (reservation.kind === 'failed') throw new OperationStillPendingError();
    if (this.consumeFault(this.faults.failAcceptFor, request.operationId)) {
      await this.markOperation(request.operationId, 'failed', 'injected-acceptance-failure');
      throw new Error('The take could not be accepted. The saved candidate and previous accepted take remain unchanged.');
    }

    const result = await this.commitAcceptance(request, fingerprint, candidate, firstSnapshot);
    if (result.kind === 'rejected') this.throwRejected(result.code);
    if (!result.record) return { kind: 'unknown', operationId: request.operationId, reason: 'The acceptance receipt is incomplete.' };
    if (this.consumeFault(this.faults.loseAcknowledgementFor, request.operationId)) {
      return { kind: 'unknown', operationId: request.operationId, reason: 'The take was accepted, but its acknowledgement was lost.' };
    }
    return this.toAcceptOutcome(result.record);
  }

  async discardCandidate(request: DiscardCandidateRequest): Promise<WriteOutcome> {
    const candidate = await this.getCandidate(request.scope, request.candidateId);
    if (!candidate || candidate.turnId !== request.turnId || candidate.purpose !== 'recording') throw new CandidateUnavailableError();
    const project = await this.loadPreparedProject(request.scope);
    if (!project) throw new ProjectNotFoundError();
    if (project.revision !== request.expectedProjectRevision) throw new ProjectRevisionConflictError();
    let resultSnapshot: ImmutableResultSnapshot | undefined;
    if (project.initialResultSnapshotId && request.navigationIntent.kind === 'result') {
      if (!project.windows.every((window) => project.acceptedByTurn[window.id] !== undefined)) {
        throw new ResultAuthorizationUnavailableError();
      }
      const takes = await this.readSnapshotTakes(project, project.acceptedByTurn, undefined, undefined, project.revision + 1);
      resultSnapshot = await this.createSnapshotDraft({
        scope: request.scope,
        project,
        id: snapshotId(`snapshot:${request.operationId}`),
        projectRevision: project.revision + 1,
        authorizationOperationId: request.operationId,
        takes,
        authorization: 'explicit-completed-revision',
      });
      if (request.navigationIntent.snapshotId !== resultSnapshot.id) throw new ResultSnapshotChangedError();
    }
    const fingerprint = await operationFingerprint([
      'discard-candidate', request.scope.actorId, request.scope.projectId, request.turnId,
      request.candidateId, request.expectedProjectRevision, request.grant.id, request.grant.fence,
      request.navigationIntent, resultSnapshot?.contentSha256,
    ]);
    const reservation = await this.reserveOperation({
      id: request.operationId,
      actorId: request.scope.actorId,
      projectId: request.scope.projectId,
      kind: 'discard-candidate',
      turnId: request.turnId,
      fingerprint,
      createdAt: Date.now(),
      candidateId: request.candidateId,
      navigationIntent: request.navigationIntent,
      navigationCompleted: false,
      snapshotId: resultSnapshot?.id,
    });
    if (reservation.kind === 'conflict') throw new IdempotencyConflictError();
    if (reservation.kind === 'committed' && reservation.record) return this.toWriteOutcome(reservation.record);
    if (reservation.kind === 'pending') return { kind: 'unknown', operationId: request.operationId, reason: 'The discard is still unresolved.' };
    if (reservation.kind === 'failed') throw new OperationStillPendingError();
    const result = await this.commitDiscard(request, fingerprint, candidate.sha256, resultSnapshot);
    if (result.kind === 'rejected') this.throwRejected(result.code);
    if (!result.record) return { kind: 'unknown', operationId: request.operationId, reason: 'The discard receipt is incomplete.' };
    if (this.consumeFault(this.faults.loseAcknowledgementFor, request.operationId)) {
      return { kind: 'unknown', operationId: request.operationId, reason: 'The discard committed, but its acknowledgement was lost.' };
    }
    return this.toWriteOutcome(result.record);
  }

  async authorizeResultSnapshot(request: ResultSnapshotRequest): Promise<SnapshotAuthorizationOutcome> {
    const project = await this.loadPreparedProject(request.scope);
    if (!project) throw new ProjectNotFoundError();
    if (project.revision !== request.expectedProjectRevision) throw new ProjectRevisionConflictError();
    if (!project.windows.every((window) => project.acceptedByTurn[window.id] !== undefined)) {
      throw new ResultAuthorizationUnavailableError();
    }
    const takes = await this.readSnapshotTakes(project, project.acceptedByTurn, undefined, undefined, project.revision + 1);
    const snapshot = await this.createSnapshotDraft({
      scope: request.scope,
      project,
      id: snapshotId(`snapshot:${request.operationId}`),
      projectRevision: project.revision + 1,
      authorizationOperationId: request.operationId,
      takes,
      authorization: 'explicit-completed-revision',
    });
    const fingerprint = await operationFingerprint([
      'authorize-result', request.scope.actorId, request.scope.projectId, request.expectedProjectRevision,
      request.grant.id, request.grant.fence, snapshot.contentSha256, request.navigationIntent,
    ]);
    const reservation = await this.reserveOperation({
      id: request.operationId,
      actorId: request.scope.actorId,
      projectId: request.scope.projectId,
      kind: 'authorize-result',
      fingerprint,
      createdAt: snapshot.createdAt,
      snapshotId: snapshot.id,
      navigationIntent: request.navigationIntent,
      navigationCompleted: false,
    });
    if (reservation.kind === 'conflict') throw new IdempotencyConflictError();
    if (reservation.kind === 'committed' && reservation.record?.snapshotId) {
      const saved = await this.getResultSnapshot(request.scope, reservation.record.snapshotId);
      if (saved) return { kind: 'committed', operationId: request.operationId, snapshot: saved };
      return { kind: 'unknown', operationId: request.operationId, reason: 'The authorized snapshot needs reconciliation.' };
    }
    if (reservation.kind === 'pending') return { kind: 'unknown', operationId: request.operationId, reason: 'The snapshot authorization is still unresolved.' };
    if (reservation.kind === 'failed') throw new OperationStillPendingError();
    if (this.consumeFault(this.faults.failSnapshotFor, request.operationId)) {
      await this.markOperation(request.operationId, 'failed', 'injected-snapshot-failure');
      throw new Error('The result snapshot could not be authorized. The accepted takes remain unchanged.');
    }
    const result = await this.commitSnapshotAuthorization(request, fingerprint, snapshot);
    if (result.kind === 'rejected') this.throwRejected(result.code);
    if (!result.record) return { kind: 'unknown', operationId: request.operationId, reason: 'The snapshot authorization receipt is incomplete.' };
    if (this.consumeFault(this.faults.loseAcknowledgementFor, request.operationId)) {
      return { kind: 'unknown', operationId: request.operationId, reason: 'The snapshot was authorized, but its acknowledgement was lost.' };
    }
    return { kind: 'committed', operationId: request.operationId, snapshot };
  }

  async lookupResultOperation(scope: IdentityScope, id: OperationId): Promise<ResultOperationLookup> {
    const record = await this.transaction<ResultOperationRecord | undefined>([RESULT_OPERATIONS], 'readonly', (transaction, complete) => {
      const request = transaction.objectStore(RESULT_OPERATIONS).get(id);
      request.onsuccess = () => complete(request.result as ResultOperationRecord | undefined);
    });
    if (!record || record.actorId !== scope.actorId || record.projectId !== scope.projectId) {
      return { kind: 'not-found', operationId: id };
    }
    if (record.state === 'committed' && record.generationId) {
      const job = await this.getScopedResultJob(scope, record.generationId);
      return job ? { kind: 'committed', operationId: id, job } : { kind: 'failed', operationId: id, code: 'job-receipt-missing' };
    }
    return { kind: 'failed', operationId: id, code: record.code ?? 'result-operation-failed' };
  }

  async getCandidate(scope: IdentityScope, id: CandidateId): Promise<StoredCandidate | null> {
    return this.transaction<StoredCandidate | null>([PROJECTS, MEDIA], 'readonly', (transaction, complete) => {
      const projectRequest = transaction.objectStore(PROJECTS).get(scope.projectId);
      const mediaRequest = transaction.objectStore(MEDIA).get(id);
      let project: DatabaseProject | undefined;
      let media: DatabaseMedia | undefined;
      let completeReads = 0;
      const finish = () => {
        completeReads += 1;
        if (completeReads === 2) {
          if (!project || project.accountId !== scope.actorId || project.tombstonedAt !== null) complete(null);
          else if (!media || media.actorId !== scope.actorId || media.projectId !== scope.projectId) complete(null);
          else complete(media);
        }
      };
      projectRequest.onsuccess = () => { project = projectRequest.result as DatabaseProject | undefined; finish(); };
      mediaRequest.onsuccess = () => { media = mediaRequest.result as DatabaseMedia | undefined; finish(); };
    });
  }

  async getCurrentCandidate(scope: IdentityScope, id: TurnId): Promise<StoredCandidate | null> {
    const project = await this.loadPreparedProject(scope);
    const candidateId = project?.draftCandidateByTurn[id];
    return candidateId ? this.getCandidate(scope, candidateId) : null;
  }

  async getAcceptedCandidate(scope: IdentityScope, id: TurnId): Promise<StoredCandidate | null> {
    const project = await this.loadPreparedProject(scope);
    const candidateId = project?.acceptedByTurn[id];
    return candidateId ? this.getCandidate(scope, candidateId) : null;
  }

  async findPendingCaptureOperation(scope: IdentityScope, id: TurnId): Promise<OperationId | null> {
    const records = await this.transaction<JournalRecord[]>([OPERATIONS], 'readonly', (transaction, complete) => {
      const request = transaction.objectStore(OPERATIONS).getAll();
      request.onsuccess = () => complete(request.result as JournalRecord[]);
    });
    return records
      .filter((record) => record.actorId === scope.actorId && record.projectId === scope.projectId
        && record.turnId === id && record.kind === 'save-candidate' && record.state === 'pending')
      .sort((a, b) => b.createdAt - a.createdAt)[0]?.id ?? null;
  }

  async findPendingAcceptanceOperation(scope: IdentityScope, id: TurnId): Promise<OperationId | null> {
    const records = await this.transaction<JournalRecord[]>([OPERATIONS], 'readonly', (transaction, complete) => {
      const request = transaction.objectStore(OPERATIONS).getAll();
      request.onsuccess = () => complete(request.result as JournalRecord[]);
    });
    return records
      .filter((record) => record.actorId === scope.actorId && record.projectId === scope.projectId
        && record.turnId === id && record.kind === 'accept-candidate' && record.state === 'pending')
      .sort((a, b) => b.createdAt - a.createdAt)[0]?.id ?? null;
  }

  async findIncompleteNavigationIntent(scope: IdentityScope): Promise<{ operationId: OperationId; intent: NavigationIntent } | null> {
    const records = await this.transaction<JournalRecord[]>([OPERATIONS], 'readonly', (transaction, complete) => {
      const request = transaction.objectStore(OPERATIONS).getAll();
      request.onsuccess = () => complete(request.result as JournalRecord[]);
    });
    const record = records
      .filter((item) => item.actorId === scope.actorId && item.projectId === scope.projectId
        && item.navigationIntent && item.navigationCompleted !== true
        && (item.state === 'pending' || item.state === 'committed'))
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    return record?.navigationIntent ? { operationId: record.id, intent: record.navigationIntent } : null;
  }

  async completeNavigationIntent(scope: IdentityScope, id: OperationId): Promise<void> {
    await this.transaction<void>([OPERATIONS], 'readwrite', (transaction, complete) => {
      const store = transaction.objectStore(OPERATIONS);
      const request = store.get(id);
      request.onsuccess = () => {
        const record = request.result as JournalRecord | undefined;
        if (record?.actorId === scope.actorId && record.projectId === scope.projectId && record.navigationIntent) {
          store.put({ ...record, navigationCompleted: true });
        }
        complete(undefined);
      };
    });
  }

  async getResultSnapshot(scope: IdentityScope, id: SnapshotId): Promise<ImmutableResultSnapshot | null> {
    const record = await this.transaction<ImmutableResultSnapshot | undefined>([PROJECTS, SNAPSHOTS], 'readonly', (transaction, complete) => {
      const projects = transaction.objectStore(PROJECTS);
      const snapshots = transaction.objectStore(SNAPSHOTS);
      const projectRequest = projects.get(scope.projectId);
      const snapshotRequest = snapshots.get(id);
      let project: DatabaseProject | undefined;
      let snapshot: ImmutableResultSnapshot | undefined;
      let reads = 0;
      const finish = () => {
        reads += 1;
        if (reads === 2) {
          complete(project?.accountId === scope.actorId && project.tombstonedAt === null
            && snapshot?.scope.actorId === scope.actorId && snapshot.scope.projectId === scope.projectId
            ? snapshot : undefined);
        }
      };
      projectRequest.onsuccess = () => { project = projectRequest.result as DatabaseProject | undefined; finish(); };
      snapshotRequest.onsuccess = () => { snapshot = snapshotRequest.result as ImmutableResultSnapshot | undefined; finish(); };
    });
    return record ?? null;
  }

  async startOrReconcile(input: { scope: IdentityScope; snapshotId: SnapshotId }): Promise<ResultCommandOutcome> {
    const id = resultStartOperationId(input.snapshotId);
    if (this.consumeFault(this.faults.failResultStartFor, id)) {
      throw new Error('The local result job could not start. The accepted snapshot remains authorized.');
    }
    const snapshot = await this.getResultSnapshot(input.scope, input.snapshotId);
    const project = await this.loadPreparedProject(input.scope);
    if (!project || !snapshot) throw new ProjectNotFoundError();
    await this.assertSnapshotMatchesProject(snapshot, project, true);
    if (this.resultFixtures.length === 0) throw new ResultMediaUnavailableError();

    const fingerprint = await operationFingerprint([
      'result-start', input.scope.actorId, input.scope.projectId, snapshot.id,
      snapshot.contentSha256, snapshot.authorizationOperationId,
    ]);
    type Commit = { kind: 'committed'; job: MockResultJob } | { kind: 'rejected'; reason: string };
    const generation = generationId(`generation:${snapshot.id}`);
    const committed = await this.transaction<Commit>(
      [PROJECTS, SNAPSHOTS, RESULT_OPERATIONS, RESULT_JOBS], 'readwrite', (transaction, complete) => {
        const projects = transaction.objectStore(PROJECTS);
        const snapshots = transaction.objectStore(SNAPSHOTS);
        const operations = transaction.objectStore(RESULT_OPERATIONS);
        const jobs = transaction.objectStore(RESULT_JOBS);
        const projectRequest = projects.get(input.scope.projectId);
        const snapshotRequest = snapshots.get(input.snapshotId);
        const operationRequest = operations.get(id);
        const jobRequest = jobs.get(generation);
        const allJobsRequest = jobs.getAll();
        let currentProject: DatabaseProject | undefined;
        let currentSnapshot: ImmutableResultSnapshot | undefined;
        let operation: ResultOperationRecord | undefined;
        let job: MockResultJob | undefined;
        let allJobs: MockResultJob[] = [];
        let reads = 0;
        const finish = () => {
          reads += 1;
          if (reads !== 5) return;
          if (!currentProject || currentProject.accountId !== input.scope.actorId) {
            complete({ kind: 'rejected', reason: 'project-not-found' }); return;
          }
          if (currentProject.tombstonedAt !== null) {
            complete({ kind: 'rejected', reason: 'project-deleted' }); return;
          }
          if (!currentSnapshot || currentSnapshot.scope.actorId !== input.scope.actorId
            || currentSnapshot.scope.projectId !== input.scope.projectId
            || !this.snapshotMatchesProjectMetadata(currentSnapshot, currentProject)) {
            complete({ kind: 'rejected', reason: 'snapshot-changed' }); return;
          }
          if (currentProject.latestResultSnapshotId !== input.snapshotId) {
            complete({ kind: 'rejected', reason: 'snapshot-not-latest' }); return;
          }
          if (operation && (operation.actorId !== input.scope.actorId || operation.projectId !== input.scope.projectId
            || operation.snapshotId !== input.snapshotId || operation.fingerprint !== fingerprint)) {
            complete({ kind: 'rejected', reason: 'operation-conflict' }); return;
          }
          if (operation?.state === 'committed') {
            if (!job || operation.generationId !== generation) {
              complete({ kind: 'rejected', reason: 'job-receipt-missing' }); return;
            }
            complete({ kind: 'committed', job }); return;
          }
          if (operation?.state === 'failed') {
            complete({ kind: 'rejected', reason: operation.code ?? 'start-failed' }); return;
          }
          if (job) {
            if (job.scope.actorId !== input.scope.actorId || job.scope.projectId !== input.scope.projectId
              || job.snapshotId !== input.snapshotId || job.snapshotContentSha256 !== snapshot.contentSha256) {
              complete({ kind: 'rejected', reason: 'generation-conflict' }); return;
            }
            const recovered: ResultOperationRecord = {
              id, actorId: input.scope.actorId, projectId: input.scope.projectId, snapshotId: input.snapshotId,
              fingerprint, state: 'committed', generationId: generation, createdAt: Date.now(),
            };
            operations.add(recovered);
            complete({ kind: 'committed', job }); return;
          }

          const fixture = this.resultFixtures[allJobs.filter((item) =>
            item.scope.actorId === input.scope.actorId && item.scope.projectId === input.scope.projectId).length % this.resultFixtures.length];
          const startedAt = Date.now();
          const previousId = currentProject.latestResultGenerationId;
          const previousJob = previousId ? allJobs.find((item) => item.id === previousId) : undefined;
          const previousGenerationId = previousJob?.status === 'ready'
            ? previousJob.id
            : previousJob?.previousGenerationId;
          const next: MockResultJob = {
            id: generation,
            scope: input.scope,
            projectRevision: snapshot.projectRevision,
            snapshotId: snapshot.id,
            snapshotContentSha256: snapshot.contentSha256,
            authorizationOperationId: snapshot.authorizationOperationId,
            operationId: id,
            fixtureId: fixture.id,
            mediaSha256: fixture.sha256,
            productRendered: false,
            assembledFromAcceptedTakes: false,
            status: 'assembling',
            fixture,
            previousGenerationId,
            attempt: 1,
            automaticRetryCount: 0,
            manualRetryCount: 0,
            retryLineageId: id,
            retryOperationIds: [],
            createdAt: startedAt,
            updatedAt: startedAt,
          };
          const receipt: ResultOperationRecord = {
            id, actorId: input.scope.actorId, projectId: input.scope.projectId, snapshotId: input.snapshotId,
            fingerprint, state: 'committed', generationId: generation, createdAt: startedAt,
          };
          jobs.add(next);
          operations.add(receipt);
          projects.put({ ...currentProject, latestResultGenerationId: generation });
          complete({ kind: 'committed', job: next });
        };
        projectRequest.onsuccess = () => { currentProject = projectRequest.result as DatabaseProject | undefined; finish(); };
        snapshotRequest.onsuccess = () => { currentSnapshot = snapshotRequest.result as ImmutableResultSnapshot | undefined; finish(); };
        operationRequest.onsuccess = () => { operation = operationRequest.result as ResultOperationRecord | undefined; finish(); };
        jobRequest.onsuccess = () => { job = jobRequest.result as MockResultJob | undefined; finish(); };
        allJobsRequest.onsuccess = () => { allJobs = allJobsRequest.result as MockResultJob[]; finish(); };
      },
    );
    if (committed.kind === 'rejected') this.throwResultRejected(committed.reason);
    this.scheduleMaterialization(input.scope, committed.job);
    this.publishResultChange(input.scope);
    if (this.consumeFault(this.faults.loseResultStartAcknowledgementFor, id)) {
      return { kind: 'unknown', operationId: id, reason: 'The result job was committed, but its acknowledgement was lost.' };
    }
    return { kind: 'committed', operationId: id, job: committed.job };
  }

  async loadWorkspace(scope: IdentityScope, id: SnapshotId): Promise<MockResultWorkspace | null> {
    const read = await this.transaction<{
      project?: DatabaseProject;
      snapshot?: ImmutableResultSnapshot;
      jobs: MockResultJob[];
    }>([PROJECTS, SNAPSHOTS, RESULT_JOBS], 'readonly', (transaction, complete) => {
      const projectRequest = transaction.objectStore(PROJECTS).get(scope.projectId);
      const snapshotRequest = transaction.objectStore(SNAPSHOTS).get(id);
      const jobsRequest = transaction.objectStore(RESULT_JOBS).getAll();
      let project: DatabaseProject | undefined;
      let snapshot: ImmutableResultSnapshot | undefined;
      let jobs: MockResultJob[] = [];
      let reads = 0;
      const finish = () => {
        reads += 1;
        if (reads === 3) complete({ project, snapshot, jobs });
      };
      projectRequest.onsuccess = () => { project = projectRequest.result as DatabaseProject | undefined; finish(); };
      snapshotRequest.onsuccess = () => { snapshot = snapshotRequest.result as ImmutableResultSnapshot | undefined; finish(); };
      jobsRequest.onsuccess = () => { jobs = jobsRequest.result as MockResultJob[]; finish(); };
    });
    const { project, snapshot } = read;
    if (!project || project.accountId !== scope.actorId || project.tombstonedAt !== null
      || !snapshot || snapshot.scope.actorId !== scope.actorId || snapshot.scope.projectId !== scope.projectId) return null;
    const scopedJobs = read.jobs.filter((job) => job.scope.actorId === scope.actorId && job.scope.projectId === scope.projectId);
    const job = scopedJobs.find((item) => item.snapshotId === id) ?? null;
    const authorizedJob = project.latestResultGenerationId
      ? scopedJobs.find((item) => item.id === project.latestResultGenerationId) ?? null
      : null;
    const currentGeneration = authorizedJob?.status === 'ready'
      ? authorizedJob
      : authorizedJob?.previousGenerationId
        ? scopedJobs.find((item) => item.id === authorizedJob.previousGenerationId && item.status === 'ready') ?? null
        : null;
    const isLatestAuthorization = project.latestResultSnapshotId === id
      && this.snapshotMatchesProjectMetadata(snapshot, project);
    return {
      snapshot,
      job,
      currentGeneration,
      latestAuthorizedSnapshotId: project.latestResultSnapshotId ?? null,
      isLatestAuthorization,
    };
  }

  async retryAssembly(input: { scope: IdentityScope; snapshotId: SnapshotId; operationId: OperationId }): Promise<ResultCommandOutcome> {
    if (this.consumeFault(this.faults.failResultRetryFor, input.operationId)) {
      throw new Error('The retry request could not be recorded. The prior result status remains available.');
    }
    const snapshot = await this.getResultSnapshot(input.scope, input.snapshotId);
    const project = await this.loadPreparedProject(input.scope);
    if (!project || !snapshot) throw new ProjectNotFoundError();
    await this.assertSnapshotMatchesProject(snapshot, project, true);
    const startId = resultStartOperationId(snapshot.id);
    const generation = generationId(`generation:${snapshot.id}`);
    const fingerprint = await operationFingerprint([
      'result-retry', input.scope.actorId, input.scope.projectId, snapshot.id,
      snapshot.contentSha256, startId, generation,
    ]);
    type Commit = { kind: 'committed'; job: MockResultJob } | { kind: 'rejected'; reason: string };
    const committed = await this.transaction<Commit>(
      [PROJECTS, SNAPSHOTS, RESULT_OPERATIONS, RESULT_JOBS], 'readwrite', (transaction, complete) => {
        const projects = transaction.objectStore(PROJECTS);
        const snapshots = transaction.objectStore(SNAPSHOTS);
        const operations = transaction.objectStore(RESULT_OPERATIONS);
        const jobs = transaction.objectStore(RESULT_JOBS);
        const projectRequest = projects.get(input.scope.projectId);
        const snapshotRequest = snapshots.get(input.snapshotId);
        const operationRequest = operations.get(input.operationId);
        const jobRequest = jobs.get(generation);
        let currentProject: DatabaseProject | undefined;
        let currentSnapshot: ImmutableResultSnapshot | undefined;
        let operation: ResultOperationRecord | undefined;
        let job: MockResultJob | undefined;
        let reads = 0;
        const finish = () => {
          reads += 1;
          if (reads !== 4) return;
          if (!currentProject || currentProject.accountId !== input.scope.actorId || currentProject.tombstonedAt !== null) {
            complete({ kind: 'rejected', reason: 'project-not-found' }); return;
          }
          if (!currentSnapshot || currentSnapshot.scope.actorId !== input.scope.actorId
            || currentSnapshot.scope.projectId !== input.scope.projectId
            || currentProject.latestResultSnapshotId !== input.snapshotId
            || !this.snapshotMatchesProjectMetadata(currentSnapshot, currentProject)) {
            complete({ kind: 'rejected', reason: 'snapshot-changed' }); return;
          }
          if (operation && (operation.actorId !== input.scope.actorId || operation.projectId !== input.scope.projectId
            || operation.snapshotId !== input.snapshotId || operation.fingerprint !== fingerprint)) {
            complete({ kind: 'rejected', reason: 'operation-conflict' }); return;
          }
          if (operation?.state === 'committed') {
            if (!job || operation.generationId !== generation) {
              complete({ kind: 'rejected', reason: 'job-receipt-missing' }); return;
            }
            complete({ kind: 'committed', job }); return;
          }
          if (!job || job.status !== 'failed' || job.snapshotId !== input.snapshotId
            || job.snapshotContentSha256 !== snapshot.contentSha256 || currentProject.latestResultGenerationId !== generation) {
            complete({ kind: 'rejected', reason: 'retry-not-available' }); return;
          }
          const now = Date.now();
          const updated: MockResultJob = {
            ...job,
            status: 'assembling',
            attempt: job.attempt + 1,
            manualRetryCount: job.manualRetryCount + 1,
            retryOperationIds: job.retryOperationIds.includes(input.operationId)
              ? job.retryOperationIds : [...job.retryOperationIds, input.operationId],
            updatedAt: now,
            errorCode: undefined,
            progressPercent: undefined,
          };
          const receipt: ResultOperationRecord = {
            id: input.operationId, actorId: input.scope.actorId, projectId: input.scope.projectId,
            snapshotId: input.snapshotId, fingerprint, state: 'committed', generationId: generation, createdAt: now,
          };
          jobs.put(updated);
          operations.add(receipt);
          complete({ kind: 'committed', job: updated });
        };
        projectRequest.onsuccess = () => { currentProject = projectRequest.result as DatabaseProject | undefined; finish(); };
        snapshotRequest.onsuccess = () => { currentSnapshot = snapshotRequest.result as ImmutableResultSnapshot | undefined; finish(); };
        operationRequest.onsuccess = () => { operation = operationRequest.result as ResultOperationRecord | undefined; finish(); };
        jobRequest.onsuccess = () => { job = jobRequest.result as MockResultJob | undefined; finish(); };
      },
    );
    if (committed.kind === 'rejected') this.throwResultRejected(committed.reason);
    this.scheduleMaterialization(input.scope, committed.job);
    this.publishResultChange(input.scope);
    if (this.consumeFault(this.faults.loseResultRetryAcknowledgementFor, input.operationId)) {
      return { kind: 'unknown', operationId: input.operationId, reason: 'The retry was committed, but its acknowledgement was lost.' };
    }
    return { kind: 'committed', operationId: input.operationId, job: committed.job };
  }

  async lookupOperation(scope: IdentityScope, id: OperationId): Promise<OperationLookup> {
    const record = await this.transaction<JournalRecord | undefined>([OPERATIONS], 'readonly', (transaction, complete) => {
      const request = transaction.objectStore(OPERATIONS).get(id);
      request.onsuccess = () => complete(request.result as JournalRecord | undefined);
    });
    if (!record || record.actorId !== scope.actorId || record.projectId !== scope.projectId) {
      return { kind: 'not-found', operationId: id };
    }
    if (record.state === 'committed') {
      return {
        kind: 'committed', operationId: id, candidateId: record.candidateId,
        projectRevision: record.projectRevision ?? 0, sha256: record.sha256,
        snapshotId: record.snapshotId,
        navigationIntent: record.navigationIntent,
      };
    }
    if (record.state === 'pending') return { kind: 'pending', operationId: id };
    return { kind: 'failed', operationId: id, code: record.code ?? 'write-failed' };
  }

  async readGenerationMedia(scope: IdentityScope, id: GenerationId): Promise<ResultMediaPayload> {
    const read = await this.transaction<{
      project?: DatabaseProject;
      job?: MockResultJob;
      media?: StoredResultMedia;
    }>([PROJECTS, RESULT_JOBS, RESULT_MEDIA], 'readonly', (transaction, complete) => {
      const projectRequest = transaction.objectStore(PROJECTS).get(scope.projectId);
      const jobRequest = transaction.objectStore(RESULT_JOBS).get(id);
      const mediaRequest = transaction.objectStore(RESULT_MEDIA).get(id);
      let project: DatabaseProject | undefined;
      let job: MockResultJob | undefined;
      let media: StoredResultMedia | undefined;
      let reads = 0;
      const finish = () => {
        reads += 1;
        if (reads === 3) complete({ project, job, media });
      };
      projectRequest.onsuccess = () => { project = projectRequest.result as DatabaseProject | undefined; finish(); };
      jobRequest.onsuccess = () => { job = jobRequest.result as MockResultJob | undefined; finish(); };
      mediaRequest.onsuccess = () => { media = mediaRequest.result as StoredResultMedia | undefined; finish(); };
    });
    const { project, job, media } = read;
    if (!project || project.accountId !== scope.actorId || project.tombstonedAt !== null
      || !job || job.status !== 'ready' || job.scope.actorId !== scope.actorId || job.scope.projectId !== scope.projectId
      || !media || media.actorId !== scope.actorId || media.projectId !== scope.projectId
      || media.sha256 !== job.mediaSha256 || media.sha256 !== job.fixture.sha256 || media.byteSize !== job.fixture.bytes) {
      throw new ResultMediaUnavailableError();
    }
    if (await sha256(await media.blob.arrayBuffer()) !== media.sha256) throw new ResultMediaUnavailableError();
    return { job, blob: media.blob, filename: media.filename, mimeType: media.mimeType, byteSize: media.byteSize, sha256: media.sha256 };
  }

  async resumeAuthorized(scope: IdentityScope): Promise<void> {
    const project = await this.loadPreparedProject(scope);
    if (!project?.latestResultSnapshotId) return;
    try {
      await this.startOrReconcile({ scope, snapshotId: project.latestResultSnapshotId });
    } catch (error) {
      if (error instanceof ResultSnapshotChangedError || error instanceof ResultAuthorizationUnavailableError) return;
      throw error;
    }
  }

  subscribe(scope: IdentityScope, listener: () => void): () => void {
    const key = this.resultScopeKey(scope);
    const listeners = this.resultListeners.get(key) ?? new Set<() => void>();
    listeners.add(listener);
    this.resultListeners.set(key, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.resultListeners.delete(key);
    };
  }

  async getCandidateForOperation(scope: IdentityScope, id: OperationId): Promise<StoredCandidate | null> {
    const operation = await this.lookupOperation(scope, id);
    return operation.kind === 'committed' && operation.candidateId
      ? this.getCandidate(scope, operation.candidateId)
      : null;
  }

  async tombstoneProject(scope: IdentityScope, expectedRevision: number, id: OperationId): Promise<number> {
    const fingerprint = await operationFingerprint(['tombstone-project', scope.actorId, scope.projectId, expectedRevision]);
    const reservation = await this.reserveOperation({
      id, actorId: scope.actorId, projectId: scope.projectId, kind: 'tombstone-project', fingerprint, createdAt: Date.now(),
    });
    if (reservation.kind === 'conflict') throw new IdempotencyConflictError();
    if (reservation.kind === 'committed' && reservation.record?.projectRevision !== undefined) return reservation.record.projectRevision;
    if (reservation.kind !== 'new') throw new OperationStillPendingError();
    const result = await this.transaction<CommitResult>([PROJECTS, OPERATIONS, GRANTS], 'readwrite', (transaction, complete) => {
      const projects = transaction.objectStore(PROJECTS);
      const operations = transaction.objectStore(OPERATIONS);
      const grants = transaction.objectStore(GRANTS);
      const projectRequest = projects.get(scope.projectId);
      const operationRequest = operations.get(id);
      const grantRequest = grants.get(scope.projectId);
      let reads = 0;
      let project: DatabaseProject | undefined;
      let operation: JournalRecord | undefined;
      let grant: GrantRecord | undefined;
      const finishReads = () => {
        reads += 1;
        if (reads !== 3) return;
        if (!operation || operation.state !== 'pending') {
          complete({ kind: 'rejected', code: 'operation-state' });
          return;
        }
        if (!project || project.accountId !== scope.actorId) {
          operations.put({ ...operation, state: 'rejected', code: 'project-not-found' });
          complete({ kind: 'rejected', code: 'project-not-found' });
          return;
        }
        if (project.tombstonedAt !== null) {
          operations.put({ ...operation, state: 'rejected', code: 'project-deleted' });
          complete({ kind: 'rejected', code: 'project-deleted' });
          return;
        }
        if (project.revision !== expectedRevision) {
          operations.put({ ...operation, state: 'rejected', code: 'revision-conflict' });
          complete({ kind: 'rejected', code: 'revision-conflict' });
          return;
        }
        const revision = project.revision + 1;
        projects.put({ ...project, revision, tombstonedAt: Date.now() });
        if (grant?.state === 'active') grants.put({ ...grant, state: 'released' });
        operations.put({ ...operation, state: 'committed', projectRevision: revision });
        complete({ kind: 'committed', record: { ...operation, state: 'committed', projectRevision: revision } });
      };
      projectRequest.onsuccess = () => { project = projectRequest.result as DatabaseProject | undefined; finishReads(); };
      operationRequest.onsuccess = () => { operation = operationRequest.result as JournalRecord | undefined; finishReads(); };
      grantRequest.onsuccess = () => { grant = grantRequest.result as GrantRecord | undefined; finishReads(); };
    });
    if (result.kind === 'rejected') this.throwRejected(result.code);
    const revision = result.record?.projectRevision;
    if (revision === undefined) throw new OperationStillPendingError();
    return revision;
  }

  close(): void {
    void this.databasePromise?.then((database) => database.close());
    this.databasePromise = undefined;
  }

  private async readSnapshotTakes(
    project: PreparedProject,
    accepted: Readonly<Record<string, CandidateId | undefined>>,
    overrideTurnId: TurnId | undefined,
    overrideCandidate: StoredCandidate | undefined,
    acceptedProjectRevision: number,
    acceptOperationId?: OperationId,
  ): Promise<ImmutableResultSnapshot['takes']> {
    const takes = [];
    for (const window of project.windows) {
      const candidateId = accepted[window.id];
      if (!candidateId) throw new ResultAuthorizationUnavailableError();
      const candidate = window.id === overrideTurnId && overrideCandidate
        ? overrideCandidate
        : await this.getCandidate({ actorId: project.accountId, projectId: project.id }, candidateId);
      if (!candidate || candidate.id !== candidateId || candidate.turnId !== window.id || candidate.purpose !== 'recording') {
        throw new CandidateUnavailableError();
      }
      if (await sha256(await candidate.blob.arrayBuffer()) !== candidate.sha256) {
        throw new CandidateUnavailableError();
      }
      const isOverride = window.id === overrideTurnId && overrideCandidate?.id === candidateId;
      const acceptedRevision = isOverride ? acceptedProjectRevision : project.acceptedProjectRevisionByTurn[window.id];
      const acceptedOperationId = isOverride ? acceptOperationId : project.acceptedOperationByTurn[window.id];
      if (acceptedRevision === undefined || !acceptedOperationId) throw new CandidateUnavailableError();
      takes.push({
        turnId: window.id,
        turnRevision: candidate.turnRevision,
        windowStartMs: window.startMs,
        windowEndMs: window.endMs,
        acceptedCandidateId: candidate.id,
        candidateSha256: candidate.sha256,
        captureOperationId: candidate.operationId,
        acceptOperationId: acceptedOperationId,
        acceptedProjectRevision: acceptedRevision,
        byteSize: candidate.byteSize,
        mimeType: candidate.mimeType,
        capturedAt: candidate.capturedAt,
        endReason: candidate.endReason,
      });
    }
    return takes;
  }

  private snapshotMatchesProjectMetadata(snapshot: ImmutableResultSnapshot, project: PreparedProject): boolean {
    if (snapshot.scope.actorId !== project.accountId || snapshot.scope.projectId !== project.id
      || snapshot.preparationRevision !== project.preparationRevision || snapshot.sourceSha256 !== project.source.sha256
      || JSON.stringify(snapshot.source) !== JSON.stringify(project.source)
      || snapshot.authorizationOperationId !== snapshot.id.replace(/^snapshot:/, '')
      || snapshot.selection.sourceSha256 !== project.source.sha256
      || snapshot.background.kind !== 'source-audio-reference'
      || snapshot.background.sourceSha256 !== project.source.sha256
      || snapshot.background.preparationRevision !== project.preparationRevision
      || snapshot.takes.length !== project.windows.length
      || snapshot.selection.windows.length !== project.windows.length) return false;

    return project.windows.every((window, index) => {
      const selected = snapshot.selection.windows[index];
      const take = snapshot.takes[index];
      return selected?.turnId === window.id && selected.turnRevision === window.revision
        && selected.startMs === window.startMs && selected.endMs === window.endMs
        && take?.turnId === window.id && take.turnRevision === window.revision
        && take.windowStartMs === window.startMs && take.windowEndMs === window.endMs
        && project.acceptedByTurn[window.id] === take.acceptedCandidateId
        && project.acceptedProjectRevisionByTurn[window.id] === take.acceptedProjectRevision
        && project.acceptedOperationByTurn[window.id] === take.acceptOperationId;
    });
  }

  private async assertSnapshotMatchesProject(
    snapshot: ImmutableResultSnapshot,
    project: PreparedProject,
    verifyCandidateBlobs: boolean,
  ): Promise<void> {
    if (!this.snapshotMatchesProjectMetadata(snapshot, project)) throw new ResultSnapshotChangedError();
    const content = {
      actorId: snapshot.scope.actorId,
      projectId: snapshot.scope.projectId,
      projectRevision: snapshot.projectRevision,
      preparationRevision: snapshot.preparationRevision,
      authorizationOperationId: snapshot.authorizationOperationId,
      source: snapshot.source,
      sourceSha256: snapshot.sourceSha256,
      selection: snapshot.selection,
      background: snapshot.background,
      takes: snapshot.takes,
      authorization: snapshot.authorization,
    };
    if (await operationFingerprint([content]) !== snapshot.contentSha256) throw new ResultSnapshotChangedError();
    if (!verifyCandidateBlobs) return;
    for (const take of snapshot.takes) {
      const candidate = await this.getCandidate(snapshot.scope, take.acceptedCandidateId);
      if (!candidate || candidate.turnId !== take.turnId || candidate.turnRevision !== take.turnRevision
        || candidate.operationId !== take.captureOperationId || candidate.sha256 !== take.candidateSha256
        || candidate.byteSize !== take.byteSize || candidate.mimeType !== take.mimeType
        || await sha256(await candidate.blob.arrayBuffer()) !== take.candidateSha256) {
        throw new ResultSnapshotChangedError();
      }
    }
  }

  private resultScopeKey(scope: IdentityScope): string {
    return `${scope.actorId}\u0000${scope.projectId}`;
  }

  private publishResultChange(scope: IdentityScope): void {
    for (const listener of this.resultListeners.get(this.resultScopeKey(scope)) ?? []) listener();
  }

  private async getScopedResultJob(scope: IdentityScope, id: GenerationId): Promise<MockResultJob | null> {
    const read = await this.transaction<{ project?: DatabaseProject; job?: MockResultJob }>([PROJECTS, RESULT_JOBS], 'readonly', (transaction, complete) => {
      const projectRequest = transaction.objectStore(PROJECTS).get(scope.projectId);
      const jobRequest = transaction.objectStore(RESULT_JOBS).get(id);
      let project: DatabaseProject | undefined;
      let job: MockResultJob | undefined;
      let reads = 0;
      const finish = () => {
        reads += 1;
        if (reads === 2) complete({ project, job });
      };
      projectRequest.onsuccess = () => { project = projectRequest.result as DatabaseProject | undefined; finish(); };
      jobRequest.onsuccess = () => { job = jobRequest.result as MockResultJob | undefined; finish(); };
    });
    return read.project?.accountId === scope.actorId && read.project.tombstonedAt === null
      && read.job?.scope.actorId === scope.actorId && read.job.scope.projectId === scope.projectId ? read.job : null;
  }

  private scheduleMaterialization(scope: IdentityScope, job: MockResultJob): void {
    if (job.status === 'ready' || job.status === 'failed' || this.materializationInFlight.has(job.id)) return;
    this.materializationInFlight.add(job.id);
    void this.materializeGeneration(scope, job.id).finally(() => this.materializationInFlight.delete(job.id));
  }

  private async materializeGeneration(scope: IdentityScope, id: GenerationId): Promise<void> {
    let job = await this.getScopedResultJob(scope, id);
    if (!job || (job.status !== 'assembling' && job.status !== 'retrying')) return;
    try {
      const blob = await this.fetchFixture(job.fixture);
      await this.commitReadyGeneration(scope, job, blob);
      return;
    } catch {
      job = await this.getScopedResultJob(scope, id);
      if (!job) return;
      if (job.automaticRetryCount < 1) {
        const retrying = await this.updateMaterializationJob(scope, job, {
          status: 'retrying',
          attempt: job.attempt + 1,
          automaticRetryCount: job.automaticRetryCount + 1,
          updatedAt: Date.now(),
          errorCode: undefined,
        });
        if (!retrying) return;
        this.publishResultChange(scope);
        try {
          const blob = await this.fetchFixture(retrying.fixture);
          await this.commitReadyGeneration(scope, retrying, blob);
          return;
        } catch {
          job = await this.getScopedResultJob(scope, id);
        }
      }
      if (job) {
        const failed = await this.updateMaterializationJob(scope, job, {
          status: 'failed',
          updatedAt: Date.now(),
          errorCode: 'fixture-unavailable',
        });
        if (failed) this.publishResultChange(scope);
      }
    }
  }

  private async fetchFixture(fixture: MockGenerationFixture): Promise<Blob> {
    if (this.faults.failResultFixtureFor?.has(fixture.id)) throw new ResultMediaUnavailableError();
    const response = await this.fetcher(fixture.url, { cache: 'no-cache' });
    if (!response.ok) throw new ResultMediaUnavailableError();
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength !== fixture.bytes || await sha256(bytes) !== fixture.sha256) throw new ResultMediaUnavailableError();
    return new Blob([bytes], { type: fixture.mimeType });
  }

  private async updateMaterializationJob(
    scope: IdentityScope,
    expected: MockResultJob,
    patch: Partial<MockResultJob>,
  ): Promise<MockResultJob | null> {
    return this.transaction<MockResultJob | null>([PROJECTS, RESULT_JOBS], 'readwrite', (transaction, complete) => {
      const projects = transaction.objectStore(PROJECTS);
      const jobs = transaction.objectStore(RESULT_JOBS);
      const projectRequest = projects.get(scope.projectId);
      const jobRequest = jobs.get(expected.id);
      let project: DatabaseProject | undefined;
      let job: MockResultJob | undefined;
      let reads = 0;
      const finish = () => {
        reads += 1;
        if (reads !== 2) return;
        if (!project || project.accountId !== scope.actorId || project.tombstonedAt !== null
          || !job || job.scope.actorId !== scope.actorId || job.scope.projectId !== scope.projectId
          || job.snapshotId !== expected.snapshotId || job.snapshotContentSha256 !== expected.snapshotContentSha256
          || (job.status !== 'assembling' && job.status !== 'retrying')) {
          complete(null); return;
        }
        const updated = { ...job, ...patch };
        jobs.put(updated);
        complete(updated);
      };
      projectRequest.onsuccess = () => { project = projectRequest.result as DatabaseProject | undefined; finish(); };
      jobRequest.onsuccess = () => { job = jobRequest.result as MockResultJob | undefined; finish(); };
    });
  }

  private async commitReadyGeneration(scope: IdentityScope, expected: MockResultJob, blob: Blob): Promise<void> {
    const digest = await sha256(await blob.arrayBuffer());
    if (blob.size !== expected.fixture.bytes || digest !== expected.mediaSha256) throw new ResultMediaUnavailableError();
    const media: StoredResultMedia = {
      id: expected.id,
      actorId: scope.actorId,
      projectId: scope.projectId,
      blob,
      filename: expected.fixture.filename,
      mimeType: expected.fixture.mimeType,
      byteSize: blob.size,
      sha256: digest,
    };
    const readyAt = Date.now();
    const saved = await this.transaction<boolean>([PROJECTS, RESULT_JOBS, RESULT_MEDIA], 'readwrite', (transaction, complete) => {
      const projects = transaction.objectStore(PROJECTS);
      const jobs = transaction.objectStore(RESULT_JOBS);
      const projectRequest = projects.get(scope.projectId);
      const jobRequest = jobs.get(expected.id);
      let project: DatabaseProject | undefined;
      let job: MockResultJob | undefined;
      let reads = 0;
      const finish = () => {
        reads += 1;
        if (reads !== 2) return;
        if (!project || project.accountId !== scope.actorId || project.tombstonedAt !== null
          || !job || job.scope.actorId !== scope.actorId || job.scope.projectId !== scope.projectId
          || job.snapshotId !== expected.snapshotId || job.snapshotContentSha256 !== expected.snapshotContentSha256
          || (job.status !== 'assembling' && job.status !== 'retrying')) {
          complete(false); return;
        }
        const ready: MockResultJob = { ...job, status: 'ready', updatedAt: readyAt, readyAt, progressPercent: undefined, errorCode: undefined };
        transaction.objectStore(RESULT_MEDIA).put(media);
        jobs.put(ready);
        complete(true);
      };
      projectRequest.onsuccess = () => { project = projectRequest.result as DatabaseProject | undefined; finish(); };
      jobRequest.onsuccess = () => { job = jobRequest.result as MockResultJob | undefined; finish(); };
    });
    if (saved) this.publishResultChange(scope);
  }

  private throwResultRejected(reason: string): never {
    if (reason === 'project-not-found' || reason === 'project-deleted') throw new ProjectNotFoundError();
    if (reason === 'operation-conflict' || reason === 'generation-conflict') throw new IdempotencyConflictError();
    if (reason === 'snapshot-changed' || reason === 'snapshot-not-latest' || reason === 'job-receipt-missing') {
      throw new ResultSnapshotChangedError();
    }
    if (reason === 'retry-not-available') throw new Error('This result can only be retried after an assembly failure for the latest authorized snapshot.');
    throw new Error(`Local result operation rejected (${reason}).`);
  }

  private async createSnapshotDraft(input: {
    scope: IdentityScope;
    project: PreparedProject;
    id: SnapshotId;
    projectRevision: number;
    authorizationOperationId: OperationId;
    takes: ImmutableResultSnapshot['takes'];
    authorization: ImmutableResultSnapshot['authorization'];
  }): Promise<ImmutableResultSnapshot> {
    const source = { ...input.project.source };
    const selection: ImmutableResultSnapshot['selection'] = {
      sourceSha256: source.sha256,
      windows: input.project.windows.map((window) => ({
        turnId: window.id,
        turnRevision: window.revision,
        startMs: window.startMs,
        endMs: window.endMs,
      })),
    };
    const background: ImmutableResultSnapshot['background'] = {
      kind: 'source-audio-reference',
      sourceSha256: source.sha256,
      preparationRevision: input.project.preparationRevision,
      provenance: 'Prepared source audio reference; no mix or user-derived render is produced by the local mock.',
    };
    const content = {
      actorId: input.scope.actorId,
      projectId: input.scope.projectId,
      projectRevision: input.projectRevision,
      preparationRevision: input.project.preparationRevision,
      authorizationOperationId: input.authorizationOperationId,
      source,
      sourceSha256: source.sha256,
      selection,
      background,
      takes: input.takes,
      authorization: input.authorization,
    };
    return {
      ...content,
      id: input.id,
      scope: input.scope,
      contentSha256: await operationFingerprint([content]),
      createdAt: Date.now(),
    };
  }

  private async commitCandidate(request: SaveCandidateRequest, contentHash: string, fingerprint: string): Promise<CommitResult> {
    const candidateId = `candidate:${request.operationId}` as CandidateId;
    return this.transaction<CommitResult>([PROJECTS, MEDIA, OPERATIONS, GRANTS], 'readwrite', (transaction, complete) => {
      const projects = transaction.objectStore(PROJECTS);
      const media = transaction.objectStore(MEDIA);
      const operations = transaction.objectStore(OPERATIONS);
      const grants = transaction.objectStore(GRANTS);
      const projectRequest = projects.get(request.scope.projectId);
      const operationRequest = operations.get(request.operationId);
      const grantRequest = grants.get(request.scope.projectId);
      let reads = 0;
      let project: DatabaseProject | undefined;
      let operation: JournalRecord | undefined;
      let activeGrant: GrantRecord | undefined;
      const finishReads = () => {
        reads += 1;
        if (reads !== 3) return;
        if (operation && operation.fingerprint !== fingerprint) {
          complete({ kind: 'rejected', code: 'operation-conflict' });
          return;
        }
        if (operation?.state === 'committed') {
          complete({ kind: 'committed', record: operation });
          return;
        }
        if (!operation || operation.state !== 'pending') {
          complete({ kind: 'rejected', code: 'operation-state' });
          return;
        }
        if (!project || project.accountId !== request.scope.actorId) {
          operations.put({ ...operation, state: 'rejected', code: 'project-not-found' });
          complete({ kind: 'rejected', code: 'project-not-found' });
          return;
        }
        if (project.tombstonedAt !== null) {
          operations.put({ ...operation, state: 'rejected', code: 'project-deleted' });
          complete({ kind: 'rejected', code: 'project-deleted' });
          return;
        }
        if (request.capture.purpose === 'recording'
          && (!request.captureGrant || activeGrant?.state !== 'active'
            || activeGrant.actorId !== request.scope.actorId || activeGrant.id !== request.captureGrant.id
            || activeGrant.fence !== request.captureGrant.fence)) {
          operations.put({ ...operation, state: 'rejected', code: 'capture-grant-lost' });
          complete({ kind: 'rejected', code: 'capture-grant-lost' });
          return;
        }
        if (project.revision !== request.expectedProjectRevision) {
          operations.put({ ...operation, state: 'rejected', code: 'revision-conflict' });
          complete({ kind: 'rejected', code: 'revision-conflict' });
          return;
        }
        const window = project.windows.find((item) => item.id === request.turnId);
        if (!window || window.revision !== request.expectedTurnRevision) {
          operations.put({ ...operation, state: 'rejected', code: 'turn-revision-conflict' });
          complete({ kind: 'rejected', code: 'turn-revision-conflict' });
          return;
        }

        const isRecording = request.capture.purpose === 'recording';
        const nextRevision = project.revision + (isRecording ? 1 : 0);
        const candidate: StoredCandidate = {
          purpose: request.capture.purpose,
          id: candidateId,
          actorId: request.scope.actorId,
          projectId: projectId(request.scope.projectId),
          turnId: request.turnId,
          turnRevision: window.revision,
          operationId: request.operationId,
          captureGrantId: request.captureGrant?.id,
          captureGrantFence: request.captureGrant?.fence,
          projectRevision: nextRevision,
          mimeType: request.capture.mimeType || request.capture.probe.mimeType,
          byteSize: request.capture.blob.size,
          sha256: contentHash,
          capturedAt: request.capture.stoppedAt,
          startedAt: request.capture.startedAt,
          stoppedAt: request.capture.stoppedAt,
          elapsedMs: request.capture.elapsedMs,
          endReason: request.capture.endReason,
          probe: request.capture.probe,
          blob: request.capture.blob,
        };
        const updatedProject: DatabaseProject = isRecording ? {
          ...project,
          revision: nextRevision,
          draftCandidateByTurn: { ...project.draftCandidateByTurn, [request.turnId]: candidateId },
        } : project;
        const updatedOperation: JournalRecord = {
          ...operation,
          state: 'committed',
          candidateId,
          projectRevision: nextRevision,
          sha256: contentHash,
        };
        media.put(candidate);
        if (isRecording) projects.put(updatedProject);
        operations.put(updatedOperation);
        complete({ kind: 'committed', record: updatedOperation });
      };
      projectRequest.onsuccess = () => { project = projectRequest.result as DatabaseProject | undefined; finishReads(); };
      operationRequest.onsuccess = () => { operation = operationRequest.result as JournalRecord | undefined; finishReads(); };
      grantRequest.onsuccess = () => { activeGrant = grantRequest.result as GrantRecord | undefined; finishReads(); };
    });
  }

  private async commitAcceptance(
    request: AcceptCandidateRequest,
    fingerprint: string,
    expectedCandidate: StoredCandidate,
    initialSnapshot: ImmutableResultSnapshot | undefined,
  ): Promise<CommitResult> {
    return this.transaction<CommitResult>([PROJECTS, MEDIA, OPERATIONS, GRANTS, SNAPSHOTS], 'readwrite', (transaction, complete) => {
      const projects = transaction.objectStore(PROJECTS);
      const media = transaction.objectStore(MEDIA);
      const operations = transaction.objectStore(OPERATIONS);
      const grants = transaction.objectStore(GRANTS);
      const snapshots = transaction.objectStore(SNAPSHOTS);
      const projectRequest = projects.get(request.scope.projectId);
      const candidateRequest = media.get(request.candidateId);
      const operationRequest = operations.get(request.operationId);
      const grantRequest = grants.get(request.scope.projectId);
      let project: DatabaseProject | undefined;
      let candidate: StoredCandidate | undefined;
      let operation: JournalRecord | undefined;
      let activeGrant: GrantRecord | undefined;
      let reads = 0;
      const finish = () => {
        reads += 1;
        if (reads !== 4) return;
        if (operation && operation.fingerprint !== fingerprint) {
          complete({ kind: 'rejected', code: 'operation-conflict' });
          return;
        }
        if (operation?.state === 'committed') {
          complete({ kind: 'committed', record: operation });
          return;
        }
        if (!operation || operation.state !== 'pending') {
          complete({ kind: 'rejected', code: 'operation-state' });
          return;
        }
        if (!project || project.accountId !== request.scope.actorId) {
          operations.put({ ...operation, state: 'rejected', code: 'project-not-found' });
          complete({ kind: 'rejected', code: 'project-not-found' });
          return;
        }
        if (project.tombstonedAt !== null) {
          operations.put({ ...operation, state: 'rejected', code: 'project-deleted' });
          complete({ kind: 'rejected', code: 'project-deleted' });
          return;
        }
        if (activeGrant?.state !== 'active' || activeGrant.actorId !== request.scope.actorId
          || activeGrant.id !== request.grant.id || activeGrant.fence !== request.grant.fence) {
          operations.put({ ...operation, state: 'rejected', code: 'capture-grant-lost' });
          complete({ kind: 'rejected', code: 'capture-grant-lost' });
          return;
        }
        if (project.revision !== request.expectedProjectRevision) {
          operations.put({ ...operation, state: 'rejected', code: 'revision-conflict' });
          complete({ kind: 'rejected', code: 'revision-conflict' });
          return;
        }
        const window = project.windows.find((item) => item.id === request.turnId);
        if (!window || window.revision !== request.expectedTurnRevision) {
          operations.put({ ...operation, state: 'rejected', code: 'turn-revision-conflict' });
          complete({ kind: 'rejected', code: 'turn-revision-conflict' });
          return;
        }
        if (!candidate || candidate.id !== request.candidateId || candidate.sha256 !== expectedCandidate.sha256
          || candidate.actorId !== request.scope.actorId || candidate.projectId !== request.scope.projectId
          || candidate.turnId !== request.turnId || candidate.purpose !== 'recording'
          || project.draftCandidateByTurn[request.turnId] !== request.candidateId) {
          operations.put({ ...operation, state: 'rejected', code: 'candidate-unavailable' });
          complete({ kind: 'rejected', code: 'candidate-unavailable' });
          return;
        }

        const nextRevision = project.revision + 1;
        const acceptedByTurn = { ...project.acceptedByTurn, [request.turnId]: request.candidateId };
        const completesInitial = !project.initialResultSnapshotId
          && project.windows.every((item) => acceptedByTurn[item.id] !== undefined);
        const createsExplicitRevision = Boolean(project.initialResultSnapshotId && request.navigationIntent.kind === 'result');
        const shouldCreateSnapshot = completesInitial || createsExplicitRevision;
        if (shouldCreateSnapshot !== Boolean(initialSnapshot)
          || (initialSnapshot && initialSnapshot.authorization !== (completesInitial ? 'initial-completion' : 'explicit-completed-revision'))
          || (initialSnapshot && initialSnapshot.projectRevision !== nextRevision)
          || (request.navigationIntent.kind === 'result' && initialSnapshot?.id !== request.navigationIntent.snapshotId)) {
          operations.put({ ...operation, state: 'rejected', code: 'snapshot-state-changed' });
          complete({ kind: 'rejected', code: 'snapshot-state-changed' });
          return;
        }
        const remainingDrafts = { ...project.draftCandidateByTurn };
        delete remainingDrafts[request.turnId];
        const nextIntent: NavigationIntent = project.initialResultSnapshotId && request.navigationIntent.kind === 'advance'
          ? { kind: 'stay' }
          : initialSnapshot && request.navigationIntent.kind === 'advance'
            ? { kind: 'result', snapshotId: initialSnapshot.id, layout: request.navigationIntent.layout }
            : request.navigationIntent;
        const updatedProject: DatabaseProject = {
          ...project,
          revision: nextRevision,
          draftCandidateByTurn: remainingDrafts,
          acceptedByTurn,
          acceptedProjectRevisionByTurn: { ...project.acceptedProjectRevisionByTurn, [request.turnId]: nextRevision },
          acceptedOperationByTurn: { ...project.acceptedOperationByTurn, [request.turnId]: request.operationId },
          acceptedHistory: project.acceptedHistory.includes(request.candidateId)
            ? project.acceptedHistory : [...project.acceptedHistory, request.candidateId],
          ...(initialSnapshot ? {
            ...(initialSnapshot.authorization === 'initial-completion' ? { initialResultSnapshotId: initialSnapshot.id } : {}),
            latestResultSnapshotId: initialSnapshot.id,
          } : {}),
        };
        if (initialSnapshot) snapshots.add(initialSnapshot);
        projects.put(updatedProject);
        const updatedOperation: JournalRecord = {
          ...operation,
          state: 'committed',
          candidateId: request.candidateId,
          projectRevision: nextRevision,
          sha256: candidate.sha256,
          snapshotId: initialSnapshot?.id,
          navigationIntent: nextIntent,
          navigationCompleted: nextIntent.kind === 'stay',
        };
        operations.put(updatedOperation);
        complete({ kind: 'committed', record: updatedOperation });
      };
      projectRequest.onsuccess = () => { project = projectRequest.result as DatabaseProject | undefined; finish(); };
      candidateRequest.onsuccess = () => { candidate = candidateRequest.result as StoredCandidate | undefined; finish(); };
      operationRequest.onsuccess = () => { operation = operationRequest.result as JournalRecord | undefined; finish(); };
      grantRequest.onsuccess = () => { activeGrant = grantRequest.result as GrantRecord | undefined; finish(); };
    });
  }

  private async commitDiscard(
    request: DiscardCandidateRequest,
    fingerprint: string,
    candidateHash: string,
    resultSnapshot?: ImmutableResultSnapshot,
  ): Promise<CommitResult> {
    return this.transaction<CommitResult>([PROJECTS, MEDIA, OPERATIONS, GRANTS, SNAPSHOTS], 'readwrite', (transaction, complete) => {
      const projects = transaction.objectStore(PROJECTS);
      const media = transaction.objectStore(MEDIA);
      const operations = transaction.objectStore(OPERATIONS);
      const grants = transaction.objectStore(GRANTS);
      const snapshots = transaction.objectStore(SNAPSHOTS);
      const projectRequest = projects.get(request.scope.projectId);
      const candidateRequest = media.get(request.candidateId);
      const operationRequest = operations.get(request.operationId);
      const grantRequest = grants.get(request.scope.projectId);
      let project: DatabaseProject | undefined;
      let candidate: StoredCandidate | undefined;
      let operation: JournalRecord | undefined;
      let activeGrant: GrantRecord | undefined;
      let reads = 0;
      const finish = () => {
        reads += 1;
        if (reads !== 4) return;
        if (operation && operation.fingerprint !== fingerprint) {
          complete({ kind: 'rejected', code: 'operation-conflict' });
          return;
        }
        if (operation?.state === 'committed') {
          complete({ kind: 'committed', record: operation });
          return;
        }
        if (!operation || operation.state !== 'pending') {
          complete({ kind: 'rejected', code: 'operation-state' });
          return;
        }
        if (!project || project.accountId !== request.scope.actorId) {
          operations.put({ ...operation, state: 'rejected', code: 'project-not-found' });
          complete({ kind: 'rejected', code: 'project-not-found' });
          return;
        }
        if (project.tombstonedAt !== null) {
          operations.put({ ...operation, state: 'rejected', code: 'project-deleted' });
          complete({ kind: 'rejected', code: 'project-deleted' });
          return;
        }
        if (activeGrant?.state !== 'active' || activeGrant.actorId !== request.scope.actorId
          || activeGrant.id !== request.grant.id || activeGrant.fence !== request.grant.fence) {
          operations.put({ ...operation, state: 'rejected', code: 'capture-grant-lost' });
          complete({ kind: 'rejected', code: 'capture-grant-lost' });
          return;
        }
        if (project.revision !== request.expectedProjectRevision) {
          operations.put({ ...operation, state: 'rejected', code: 'revision-conflict' });
          complete({ kind: 'rejected', code: 'revision-conflict' });
          return;
        }
        if (!candidate || candidate.sha256 !== candidateHash || project.draftCandidateByTurn[request.turnId] !== request.candidateId) {
          operations.put({ ...operation, state: 'rejected', code: 'candidate-unavailable' });
          complete({ kind: 'rejected', code: 'candidate-unavailable' });
          return;
        }
        const shouldCreateSnapshot = Boolean(project.initialResultSnapshotId && request.navigationIntent.kind === 'result');
        if (shouldCreateSnapshot !== Boolean(resultSnapshot)
          || (resultSnapshot && (resultSnapshot.authorization !== 'explicit-completed-revision'
            || resultSnapshot.authorizationOperationId !== request.operationId
            || request.navigationIntent.kind !== 'result'
            || resultSnapshot.id !== request.navigationIntent.snapshotId
            || resultSnapshot.projectRevision !== project.revision + 1
            || !this.snapshotMatchesProjectMetadata(resultSnapshot, project)))) {
          operations.put({ ...operation, state: 'rejected', code: 'snapshot-state-changed' });
          complete({ kind: 'rejected', code: 'snapshot-state-changed' });
          return;
        }
        const remainingDrafts = { ...project.draftCandidateByTurn };
        delete remainingDrafts[request.turnId];
        const revision = project.revision + 1;
        if (resultSnapshot) snapshots.add(resultSnapshot);
        projects.put({
          ...project,
          revision,
          draftCandidateByTurn: remainingDrafts,
          ...(resultSnapshot ? { latestResultSnapshotId: resultSnapshot.id } : {}),
        });
        media.delete(request.candidateId);
        const updatedOperation: JournalRecord = {
          ...operation, state: 'committed', candidateId: request.candidateId,
          projectRevision: revision, sha256: candidate.sha256,
          snapshotId: resultSnapshot?.id,
          navigationIntent: request.navigationIntent,
          navigationCompleted: request.navigationIntent.kind === 'stay',
        };
        operations.put(updatedOperation);
        complete({ kind: 'committed', record: updatedOperation });
      };
      projectRequest.onsuccess = () => { project = projectRequest.result as DatabaseProject | undefined; finish(); };
      candidateRequest.onsuccess = () => { candidate = candidateRequest.result as StoredCandidate | undefined; finish(); };
      operationRequest.onsuccess = () => { operation = operationRequest.result as JournalRecord | undefined; finish(); };
      grantRequest.onsuccess = () => { activeGrant = grantRequest.result as GrantRecord | undefined; finish(); };
    });
  }

  private async commitSnapshotAuthorization(
    request: ResultSnapshotRequest,
    fingerprint: string,
    snapshot: ImmutableResultSnapshot,
  ): Promise<CommitResult> {
    return this.transaction<CommitResult>([PROJECTS, OPERATIONS, GRANTS, SNAPSHOTS], 'readwrite', (transaction, complete) => {
      const projects = transaction.objectStore(PROJECTS);
      const operations = transaction.objectStore(OPERATIONS);
      const grants = transaction.objectStore(GRANTS);
      const snapshots = transaction.objectStore(SNAPSHOTS);
      const projectRequest = projects.get(request.scope.projectId);
      const operationRequest = operations.get(request.operationId);
      const grantRequest = grants.get(request.scope.projectId);
      let project: DatabaseProject | undefined;
      let operation: JournalRecord | undefined;
      let activeGrant: GrantRecord | undefined;
      let reads = 0;
      const finish = () => {
        reads += 1;
        if (reads !== 3) return;
        const currentProject = project;
        if (operation && operation.fingerprint !== fingerprint) {
          complete({ kind: 'rejected', code: 'operation-conflict' });
          return;
        }
        if (operation?.state === 'committed') {
          complete({ kind: 'committed', record: operation });
          return;
        }
        if (!operation || operation.state !== 'pending') {
          complete({ kind: 'rejected', code: 'operation-state' });
          return;
        }
        if (!currentProject || currentProject.accountId !== request.scope.actorId) {
          operations.put({ ...operation, state: 'rejected', code: 'project-not-found' });
          complete({ kind: 'rejected', code: 'project-not-found' });
          return;
        }
        if (currentProject.tombstonedAt !== null) {
          operations.put({ ...operation, state: 'rejected', code: 'project-deleted' });
          complete({ kind: 'rejected', code: 'project-deleted' });
          return;
        }
        if (activeGrant?.state !== 'active' || activeGrant.actorId !== request.scope.actorId
          || activeGrant.id !== request.grant.id || activeGrant.fence !== request.grant.fence) {
          operations.put({ ...operation, state: 'rejected', code: 'capture-grant-lost' });
          complete({ kind: 'rejected', code: 'capture-grant-lost' });
          return;
        }
        if (currentProject.revision !== request.expectedProjectRevision
          || !currentProject.windows.every((window) => currentProject.acceptedByTurn[window.id] !== undefined)
          || snapshot.projectRevision !== currentProject.revision + 1) {
          operations.put({ ...operation, state: 'rejected', code: 'revision-conflict' });
          complete({ kind: 'rejected', code: 'revision-conflict' });
          return;
        }
        if (!snapshot.takes.every((take) => currentProject.acceptedByTurn[take.turnId] === take.acceptedCandidateId
          && currentProject.acceptedProjectRevisionByTurn[take.turnId] === take.acceptedProjectRevision
          && currentProject.acceptedOperationByTurn[take.turnId] === take.acceptOperationId)) {
          operations.put({ ...operation, state: 'rejected', code: 'candidate-unavailable' });
          complete({ kind: 'rejected', code: 'candidate-unavailable' });
          return;
        }
        const revision = currentProject.revision + 1;
        snapshots.add(snapshot);
        projects.put({ ...currentProject, revision, latestResultSnapshotId: snapshot.id });
        const updatedOperation: JournalRecord = {
          ...operation, state: 'committed', projectRevision: revision,
          snapshotId: snapshot.id,
          navigationIntent: request.navigationIntent,
          navigationCompleted: request.navigationIntent.kind === 'stay',
        };
        operations.put(updatedOperation);
        complete({ kind: 'committed', record: updatedOperation });
      };
      projectRequest.onsuccess = () => { project = projectRequest.result as DatabaseProject | undefined; finish(); };
      operationRequest.onsuccess = () => { operation = operationRequest.result as JournalRecord | undefined; finish(); };
      grantRequest.onsuccess = () => { activeGrant = grantRequest.result as GrantRecord | undefined; finish(); };
    });
  }

  private async reserveOperation(record: Omit<JournalRecord, 'state'>): Promise<Reservation> {
    return this.transaction<Reservation>([OPERATIONS], 'readwrite', (transaction, complete) => {
      const store = transaction.objectStore(OPERATIONS);
      const request = store.get(record.id);
      request.onsuccess = () => {
        const existing = request.result as JournalRecord | undefined;
        if (!existing) {
          const pending: JournalRecord = { ...record, state: 'pending' };
          store.add(pending);
          complete({ kind: 'new', record: pending });
          return;
        }
        if (existing.actorId !== record.actorId || existing.projectId !== record.projectId
          || existing.kind !== record.kind || existing.fingerprint !== record.fingerprint) {
          complete({ kind: 'conflict', record: existing });
        } else if (existing.state === 'committed') complete({ kind: 'committed', record: existing });
        else if (existing.state === 'pending') complete({ kind: 'pending', record: existing });
        else complete({ kind: 'failed', record: existing });
      };
    });
  }

  private async markOperation(id: OperationId, state: 'failed', code: string): Promise<boolean> {
    return this.transaction<boolean>([OPERATIONS], 'readwrite', (transaction, complete) => {
      const store = transaction.objectStore(OPERATIONS);
      const request = store.get(id);
      request.onsuccess = () => {
        const existing = request.result as JournalRecord | undefined;
        if (!existing || existing.state !== 'pending') complete(false);
        else {
          store.put({ ...existing, state, code });
          complete(true);
        }
      };
    });
  }

  private async openDatabase(): Promise<IDBDatabase> {
    if (this.databasePromise) return this.databasePromise;
    const databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (this.faults.failOpen) {
        reject(new ServiceStorageUnavailableError());
        return;
      }
      let request: IDBOpenDBRequest;
      try {
        request = this.factory.open(this.databaseName, DATABASE_VERSION);
      } catch (error) {
        reject(mapStorageError(error));
        return;
      }
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(PROJECTS)) database.createObjectStore(PROJECTS, { keyPath: 'id' });
        if (!database.objectStoreNames.contains(MEDIA)) database.createObjectStore(MEDIA, { keyPath: 'id' });
        if (!database.objectStoreNames.contains(OPERATIONS)) database.createObjectStore(OPERATIONS, { keyPath: 'id' });
        if (!database.objectStoreNames.contains(GRANTS)) database.createObjectStore(GRANTS, { keyPath: 'projectId' });
        if (!database.objectStoreNames.contains(SNAPSHOTS)) database.createObjectStore(SNAPSHOTS, { keyPath: 'id' });
        if (!database.objectStoreNames.contains(RESULT_OPERATIONS)) database.createObjectStore(RESULT_OPERATIONS, { keyPath: 'id' });
        if (!database.objectStoreNames.contains(RESULT_JOBS)) database.createObjectStore(RESULT_JOBS, { keyPath: 'id' });
        if (!database.objectStoreNames.contains(RESULT_MEDIA)) database.createObjectStore(RESULT_MEDIA, { keyPath: 'id' });
      };
      request.onerror = () => reject(mapStorageError(request.error ?? new Error('Could not open browser storage.')));
      request.onblocked = () => reject(new ServiceStorageUnavailableError('Close the older Dubbed tab before opening local storage.'));
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => database.close();
        resolve(database);
      };
    }).catch((error: unknown) => {
      this.databasePromise = undefined;
      throw error;
    });
    this.databasePromise = databasePromise;
    return databasePromise;
  }

  private async transaction<T>(
    stores: string[],
    mode: IDBTransactionMode,
    work: (transaction: IDBTransaction, complete: (value: T) => void, fail: (error: unknown) => void) => void,
  ): Promise<T> {
    const database = await this.openDatabase();
    return new Promise<T>((resolve, reject) => {
      let transaction: IDBTransaction;
      let result: T | undefined;
      let hasResult = false;
      let failure: unknown;
      try {
        transaction = database.transaction(stores, mode);
      } catch (error) {
        reject(mapStorageError(error));
        return;
      }
      transaction.oncomplete = () => {
        if (hasResult) resolve(result as T);
        else reject(new Error('IndexedDB transaction completed without a result.'));
      };
      transaction.onerror = () => { /* onabort supplies the final transaction outcome */ };
      transaction.onabort = () => reject(mapStorageError(failure ?? transaction.error ?? new Error('IndexedDB transaction aborted.')));
      const complete = (value: T) => { result = value; hasResult = true; };
      const fail = (error: unknown) => {
        failure = error;
        try { transaction.abort(); } catch { reject(mapStorageError(error)); }
      };
      try {
        work(transaction, complete, fail);
      } catch (error) {
        fail(error);
      }
    });
  }

  private consumeFault(faults: Set<string> | undefined, id: OperationId): boolean {
    if (!faults?.has(id)) return false;
    faults.delete(id);
    return true;
  }

  private toWriteOutcome(record: JournalRecord): WriteOutcome {
    if (!record.candidateId || record.projectRevision === undefined || !record.sha256) {
      return { kind: 'unknown', operationId: record.id, reason: 'The journal entry does not include a candidate receipt.' };
    }
    return {
      kind: 'committed', operationId: record.id, candidateId: record.candidateId,
      projectRevision: record.projectRevision, sha256: record.sha256,
      snapshotId: record.snapshotId,
      navigationIntent: record.navigationIntent,
    };
  }

  private toAcceptOutcome(record: JournalRecord): AcceptOutcome {
    if (!record.candidateId || record.projectRevision === undefined || !record.navigationIntent) {
      return { kind: 'unknown', operationId: record.id, reason: 'The acceptance journal entry is incomplete.' };
    }
    return {
      kind: 'committed',
      operationId: record.id,
      candidateId: record.candidateId,
      projectRevision: record.projectRevision,
      snapshotId: record.snapshotId,
      navigationIntent: record.navigationIntent,
    };
  }

  private throwRejected(code = 'write-rejected'): never {
    if (code === 'project-not-found') throw new ProjectNotFoundError();
    if (code === 'project-deleted') throw new ProjectDeletedError();
    if (code === 'revision-conflict') throw new ProjectRevisionConflictError();
    if (code === 'turn-revision-conflict') throw new CandidateRevisionConflictError();
    if (code === 'operation-conflict') throw new IdempotencyConflictError();
    if (code === 'capture-grant-lost') throw new CaptureGrantUnavailableError();
    if (code === 'candidate-unavailable') throw new CandidateUnavailableError();
    if (code === 'snapshot-missing' || code === 'snapshot-state-changed') throw new ResultAuthorizationUnavailableError();
    throw new Error(`Local operation rejected (${code}).`);
  }
}
