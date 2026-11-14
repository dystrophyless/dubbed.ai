import { IDBFactory } from 'fake-indexeddb';
import { afterEach, describe, expect, it } from 'vitest';
import {
  actorId,
  captureGrantId,
  operationId,
  resultStartOperationId,
  snapshotId,
  type CaptureGrant,
  type MockGenerationFixture,
  type MockResultJob,
  type NativeCapture,
} from '../../services/contracts';
import {
  IndexedDbProjectStore,
  ResultMediaUnavailableError,
  ResultSnapshotChangedError,
  type MockStoreFaults,
} from './IndexedDbProjectStore';
import { SEEDED_ACTOR_ID, SEEDED_PROJECT_ID } from './fixtures';

const stores: IndexedDbProjectStore[] = [];
let databaseSequence = 0;

afterEach(() => {
  stores.splice(0).forEach((store) => store.close());
});

function responseFor(bytes: ArrayBuffer, status = 200): Response {
  return new Response(bytes.slice(0), { status, headers: { 'content-type': 'video/mp4' } });
}

async function createStore(options: {
  faults?: MockStoreFaults;
  fetcher?: typeof fetch;
} = {}) {
  const encoded = new TextEncoder().encode('phase-three-result-fixture-bytes');
  const bytes = encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength) as ArrayBuffer;
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes.slice(0));
  const sha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  const fixture: MockGenerationFixture = {
    id: 'phase-three-result-fixture',
    url: '/fixtures/phase-three-result.mp4',
    filename: 'phase-three-result.mp4',
    mimeType: 'video/mp4',
    bytes: bytes.byteLength,
    sha256,
    durationSeconds: 3.2,
    width: 640,
    height: 360,
    rotationDegrees: 0,
    provenance: 'Unit test fixture; not a user render.',
    productRendered: false,
    assembledFromAcceptedTakes: false,
  };
  const store = new IndexedDbProjectStore({
    databaseName: `dubbed-result-test-${Date.now()}-${databaseSequence++}`,
    idbFactory: new IDBFactory(),
    faults: options.faults,
    resultFixtures: [fixture],
    fetcher: options.fetcher ?? (async () => responseFor(bytes)),
  });
  stores.push(store);
  return { store, fixture, bytes };
}

function makeCapture(content: string): NativeCapture {
  const blob = new Blob([content], { type: 'audio/webm;codecs=opus' });
  const startedAt = Date.now();
  const stoppedAt = startedAt + 1_200;
  return {
    purpose: 'recording',
    blob,
    mimeType: blob.type,
    startedAt,
    stoppedAt,
    elapsedMs: stoppedAt - startedAt,
    endReason: 'fixed-window',
    probe: {
      mimeType: blob.type,
      byteSize: blob.size,
      durationSeconds: 1.2,
      decodedFrames: 57_600,
      channelCount: 1,
      sampleRate: 48_000,
      decodeStatus: 'decoded',
      waveformPeaks: [0.2, 0.4, 0.3],
    },
  };
}

async function authorizeInitialSnapshot(store: IndexedDbProjectStore) {
  const scope = { actorId: SEEDED_ACTOR_ID, projectId: SEEDED_PROJECT_ID };
  await store.initialize();
  let project = await store.loadPreparedProject(scope);
  if (!project) throw new Error('The prepared test project was not seeded.');
  const grant: CaptureGrant = await store.acquireCaptureGrant(
    scope,
    captureGrantId(`phase-three-grant-${databaseSequence}-${globalThis.crypto.randomUUID()}`),
    'phase-three-test-tab',
  );
  let authorizedSnapshotId = null as ReturnType<typeof snapshotId> | null;

  for (const [index, window] of project.windows.entries()) {
    const captureOperation = operationId(`phase-three-capture-${index}`);
    const saved = await store.saveCandidate({
      scope,
      turnId: window.id,
      expectedTurnRevision: window.revision,
      expectedProjectRevision: project.revision,
      operationId: captureOperation,
      captureGrant: grant,
      capture: makeCapture(`accepted take ${index}`),
    });
    if (saved.kind !== 'committed') throw new Error('The test candidate write did not commit.');
    const candidate = await store.getCandidate(scope, saved.candidateId);
    if (!candidate) throw new Error('The test candidate bytes were not persisted.');
    project = await store.loadPreparedProject(scope) ?? project;
    const acceptanceOperation = operationId(`phase-three-accept-${index}`);
    const last = index === project.windows.length - 1;
    const targetSnapshotId = snapshotId(`snapshot:${acceptanceOperation}`);
    const accepted = await store.acceptCandidate({
      scope,
      grant,
      turnId: window.id,
      candidateId: candidate.id,
      expectedTurnRevision: window.revision,
      expectedProjectRevision: project.revision,
      operationId: acceptanceOperation,
      navigationIntent: last
        ? { kind: 'result', snapshotId: targetSnapshotId, layout: 'A' }
        : { kind: 'advance', targetTurnId: project.windows[index + 1].id, layout: 'A' },
    });
    if (accepted.kind !== 'committed') throw new Error('The test take acceptance did not commit.');
    if (last) authorizedSnapshotId = accepted.snapshotId ?? null;
    project = await store.loadPreparedProject(scope) ?? project;
  }

  if (!authorizedSnapshotId) throw new Error('The completed project did not authorize a result snapshot.');
  return { scope, grant, snapshotId: authorizedSnapshotId };
}

async function waitForJob(
  store: IndexedDbProjectStore,
  scope: { actorId: typeof SEEDED_ACTOR_ID; projectId: typeof SEEDED_PROJECT_ID },
  id: ReturnType<typeof snapshotId>,
  predicate: (job: MockResultJob | null) => boolean,
): Promise<MockResultJob> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const workspace = await store.loadWorkspace(scope, id);
    if (workspace?.job && predicate(workspace.job)) return workspace.job;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error('The local result job did not reach the expected state.');
}

describe('IndexedDB mock ResultPort', () => {
  it('recovers a lost start acknowledgement by the same operation and serves the exact persisted fixture bytes', async () => {
    const lostStartAcks = new Set<string>();
    const { store, bytes, fixture } = await createStore({
      faults: { loseResultStartAcknowledgementFor: lostStartAcks },
    });
    const authorized = await authorizeInitialSnapshot(store);
    const startOperation = resultStartOperationId(authorized.snapshotId);
    lostStartAcks.add(startOperation);

    await expect(store.startOrReconcile({ scope: authorized.scope, snapshotId: authorized.snapshotId }))
      .resolves.toMatchObject({ kind: 'unknown', operationId: startOperation });
    await expect(store.lookupResultOperation(authorized.scope, startOperation))
      .resolves.toMatchObject({ kind: 'committed', operationId: startOperation });
    const duplicate = await store.startOrReconcile({ scope: authorized.scope, snapshotId: authorized.snapshotId });
    expect(duplicate).toMatchObject({ kind: 'committed', operationId: startOperation });
    const ready = await waitForJob(store, authorized.scope, authorized.snapshotId, (job) => job?.status === 'ready');
    const payload = await store.readGenerationMedia(authorized.scope, ready.id);
    expect(payload.filename).toBe(fixture.filename);
    expect(payload.sha256).toBe(fixture.sha256);
    expect(payload.byteSize).toBe(bytes.byteLength);
    expect(await payload.blob.arrayBuffer()).toEqual(bytes);

    const otherAccount = { actorId: actorId('phase-three-other-account'), projectId: authorized.scope.projectId };
    await expect(store.loadWorkspace(otherAccount, authorized.snapshotId)).resolves.toBeNull();
    await expect(store.readGenerationMedia(otherAccount, ready.id)).rejects.toBeInstanceOf(ResultMediaUnavailableError);

    const project = await store.loadPreparedProject(authorized.scope);
    if (!project) throw new Error('The active project disappeared before tombstoning.');
    await store.tombstoneProject(authorized.scope, project.revision, operationId('phase-three-delete-after-result'));
    await expect(store.readGenerationMedia(authorized.scope, ready.id)).rejects.toBeInstanceOf(ResultMediaUnavailableError);
  });

  it('tries one automatic materialization retry, then resolves a lost manual retry acknowledgement without duplicating the job', async () => {
    const retryAckLosses = new Set<string>();
    let attempts = 0;
    const mediaBytes: { value?: ArrayBuffer } = {};
    const harness = await createStore({
      faults: { loseResultRetryAcknowledgementFor: retryAckLosses },
      fetcher: async () => {
        attempts += 1;
        if (attempts <= 2) return new Response('temporary fixture failure', { status: 503 });
        if (!mediaBytes.value) throw new Error('Fixture bytes were not initialized.');
        return responseFor(mediaBytes.value);
      },
    });
    mediaBytes.value = harness.bytes;
    const authorized = await authorizeInitialSnapshot(harness.store);
    const start = await harness.store.startOrReconcile({ scope: authorized.scope, snapshotId: authorized.snapshotId });
    expect(start.kind).toBe('committed');
    const failed = await waitForJob(harness.store, authorized.scope, authorized.snapshotId, (job) => job?.status === 'failed');
    expect(failed.automaticRetryCount).toBe(1);
    expect(attempts).toBe(2);

    const retryOperation = operationId('phase-three-retry-after-failure');
    retryAckLosses.add(retryOperation);
    await expect(harness.store.retryAssembly({
      scope: authorized.scope,
      snapshotId: authorized.snapshotId,
      operationId: retryOperation,
    })).resolves.toMatchObject({ kind: 'unknown', operationId: retryOperation });
    await expect(harness.store.lookupResultOperation(authorized.scope, retryOperation))
      .resolves.toMatchObject({ kind: 'committed', operationId: retryOperation });
    const ready = await waitForJob(harness.store, authorized.scope, authorized.snapshotId, (job) => job?.status === 'ready');
    expect(ready.manualRetryCount).toBe(1);
    expect(ready.retryOperationIds).toEqual([retryOperation]);
    expect(attempts).toBe(3);
    expect((await harness.store.readGenerationMedia(authorized.scope, ready.id)).sha256).toBe(harness.fixture.sha256);
  });

  it('keeps the previous generation available while an explicitly authorized completed revision materializes', async () => {
    let attempts = 0;
    let resolveSecondFetch: (() => void) | undefined;
    const fixtureBytes: { value?: ArrayBuffer } = {};
    const harness = await createStore({
      fetcher: async () => {
        attempts += 1;
        if (attempts === 2) {
          await new Promise<void>((resolve) => { resolveSecondFetch = resolve; });
        }
        if (!fixtureBytes.value) throw new Error('Fixture bytes were not initialized.');
        return responseFor(fixtureBytes.value);
      },
    });
    fixtureBytes.value = harness.bytes;
    const initial = await authorizeInitialSnapshot(harness.store);
    await harness.store.startOrReconcile({ scope: initial.scope, snapshotId: initial.snapshotId });
    const firstReady = await waitForJob(harness.store, initial.scope, initial.snapshotId, (job) => job?.status === 'ready');
    const immutableBeforeRevision = await harness.store.getResultSnapshot(initial.scope, initial.snapshotId);
    if (!immutableBeforeRevision) throw new Error('The initial immutable snapshot could not be read.');

    let project = await harness.store.loadPreparedProject(initial.scope);
    if (!project) throw new Error('The project disappeared before the completed revision.');
    const firstWindow = project.windows[0];
    const grant = await harness.store.acquireCaptureGrant(
      initial.scope,
      captureGrantId(`phase-three-revision-grant-${globalThis.crypto.randomUUID()}`),
      'phase-three-revision-tab',
    );
    const saved = await harness.store.saveCandidate({
      scope: initial.scope,
      turnId: firstWindow.id,
      expectedTurnRevision: firstWindow.revision,
      expectedProjectRevision: project.revision,
      operationId: operationId('phase-three-revision-capture'),
      captureGrant: grant,
      capture: makeCapture('replacement accepted take'),
    });
    if (saved.kind !== 'committed') throw new Error('The revised candidate did not persist.');
    const replacement = await harness.store.getCandidate(initial.scope, saved.candidateId);
    if (!replacement) throw new Error('The revised candidate bytes were missing.');
    project = await harness.store.loadPreparedProject(initial.scope) ?? project;

    const revisedOperation = operationId('phase-three-explicit-revision');
    const revisedSnapshotId = snapshotId(`snapshot:${revisedOperation}`);
    const authorization = await harness.store.acceptCandidate({
      scope: initial.scope,
      grant,
      turnId: firstWindow.id,
      candidateId: replacement.id,
      expectedTurnRevision: firstWindow.revision,
      expectedProjectRevision: project.revision,
      operationId: revisedOperation,
      navigationIntent: { kind: 'result', snapshotId: revisedSnapshotId, layout: 'A' },
    });
    expect(authorization).toMatchObject({ kind: 'committed', snapshotId: revisedSnapshotId });
    const revised = await harness.store.getResultSnapshot(initial.scope, revisedSnapshotId);
    expect(revised).toMatchObject({ authorization: 'explicit-completed-revision', projectRevision: project.revision + 1 });
    expect(revised?.takes[0].acceptedCandidateId).toBe(replacement.id);
    expect((await harness.store.getResultSnapshot(initial.scope, initial.snapshotId))?.contentSha256)
      .toBe(immutableBeforeRevision.contentSha256);

    await harness.store.startOrReconcile({ scope: initial.scope, snapshotId: revisedSnapshotId });
    for (let attempt = 0; attempt < 100 && !resolveSecondFetch; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    expect(resolveSecondFetch).toBeDefined();
    const pending = await harness.store.loadWorkspace(initial.scope, revisedSnapshotId);
    expect(pending?.job).toMatchObject({ status: 'assembling', previousGenerationId: firstReady.id });
    expect(pending?.currentGeneration?.id).toBe(firstReady.id);
    await expect(harness.store.loadWorkspace(initial.scope, initial.snapshotId)).resolves.toMatchObject({ isLatestAuthorization: false });
    await expect(harness.store.startOrReconcile({ scope: initial.scope, snapshotId: initial.snapshotId }))
      .rejects.toBeInstanceOf(ResultSnapshotChangedError);

    resolveSecondFetch?.();
    const revisedReady = await waitForJob(harness.store, initial.scope, revisedSnapshotId, (job) => job?.status === 'ready');
    expect(revisedReady.id).not.toBe(firstReady.id);
    expect((await harness.store.loadWorkspace(initial.scope, revisedSnapshotId))?.currentGeneration?.id).toBe(revisedReady.id);
  });
});
