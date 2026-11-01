import { IDBFactory } from 'fake-indexeddb';
import { afterEach, describe, expect, it } from 'vitest';
import {
  actorId,
  captureGrantId,
  operationId,
  turnId,
  type NativeCapture,
  type CaptureGrant,
  type NavigationIntent,
  type StoredCandidate,
  type SaveCandidateRequest,
} from '../../services/contracts';
import {
  CandidateRevisionConflictError,
  CaptureGrantUnavailableError,
  IdempotencyConflictError,
  IndexedDbProjectStore,
  ProjectDeletedError,
  ProjectNotFoundError,
  ProjectRevisionConflictError,
  ServiceStorageFullError,
  ServiceStorageUnavailableError,
  ZeroDataCaptureError,
  type MockStoreFaults,
} from './IndexedDbProjectStore';
import { SEEDED_ACTOR_ID, SEEDED_PROJECT_ID } from './fixtures';

let databaseSequence = 0;
const stores: IndexedDbProjectStore[] = [];

function makeStore(faults: MockStoreFaults = {}) {
  const store = new IndexedDbProjectStore({
    idbFactory: new IDBFactory(),
    databaseName: `dubbed-test-${Date.now()}-${databaseSequence++}`,
    faults,
  });
  stores.push(store);
  return store;
}

afterEach(() => {
  stores.splice(0).forEach((store) => store.close());
});

function makeCapture(content: string, purpose: NativeCapture['purpose'] = 'recording'): NativeCapture {
  const blob = new Blob([content], { type: 'audio/webm;codecs=opus' });
  const startedAt = 1_000;
  const stoppedAt = 2_200;
  return {
    purpose,
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
      waveformPeaks: Array.from({ length: 64 }, (_, index) => (index % 3) / 3),
    },
  };
}

function request(capture = makeCapture('native bytes'), operation = 'op-capture-1', expectedProjectRevision = 1, grant?: CaptureGrant, targetTurnId = turnId('sintel-turn-1')): SaveCandidateRequest {
  return {
    scope: { actorId: SEEDED_ACTOR_ID, projectId: SEEDED_PROJECT_ID },
    turnId: targetTurnId,
    expectedTurnRevision: 1,
    expectedProjectRevision,
    operationId: operationId(operation),
    captureGrant: grant,
    capture,
  };
}

function acceptance(candidate: StoredCandidate, grant: CaptureGrant, expectedProjectRevision: number, operation: string, navigationIntent: NavigationIntent) {
  return {
    scope: { actorId: SEEDED_ACTOR_ID, projectId: SEEDED_PROJECT_ID },
    grant,
    turnId: candidate.turnId,
    candidateId: candidate.id,
    expectedTurnRevision: candidate.turnRevision,
    expectedProjectRevision,
    operationId: operationId(operation),
    navigationIntent,
  };
}

function acquireGrant(store: IndexedDbProjectStore) {
  return store.acquireCaptureGrant(
    { actorId: SEEDED_ACTOR_ID, projectId: SEEDED_PROJECT_ID },
    captureGrantId(`grant-${databaseSequence}-${globalThis.crypto.randomUUID()}`),
    'test-tab',
  );
}

describe('IndexedDB mock project port', () => {
  it('persists actual Blob bytes before returning a committed receipt and deduplicates the same operation', async () => {
    const store = makeStore();
    await store.initialize();
    const write = request(makeCapture('native bytes'), 'op-capture-1', 1, await acquireGrant(store));
    const first = await store.saveCandidate(write);
    expect(first.kind).toBe('committed');
    if (first.kind !== 'committed') throw new Error('Expected a committed write.');

    const saved = await store.getCandidate(write.scope, first.candidateId);
    expect(saved).not.toBeNull();
    expect(await saved?.blob.text()).toBe('native bytes');
    expect(saved?.byteSize).toBe(saved?.blob.size);
    expect(saved?.sha256).toBe(first.sha256);

    const duplicate = await store.saveCandidate(write);
    expect(duplicate).toEqual(first);
    expect((await store.loadPreparedProject(write.scope))?.revision).toBe(2);
  });

  it('surfaces an unknown acknowledgement and reconciles by the original operation ID without retrying', async () => {
    const operation = operationId('op-lost-ack');
    const store = makeStore({ loseAcknowledgementFor: new Set([operation]) });
    await store.initialize();
    const write = request(makeCapture('unknown outcome bytes'), operation, 1, await acquireGrant(store));
    const outcome = await store.saveCandidate(write);
    expect(outcome).toMatchObject({ kind: 'unknown', operationId: operation });

    const lookup = await store.lookupOperation(write.scope, operation);
    expect(lookup).toMatchObject({ kind: 'committed', operationId: operation });
    if (lookup.kind !== 'committed' || !lookup.candidateId) throw new Error('Expected a committed journal entry.');
    const recovered = await store.getCandidate(write.scope, lookup.candidateId);
    expect(await recovered?.blob.text()).toBe('unknown outcome bytes');
    expect(lookup.sha256).toBe(recovered?.sha256);
    expect((await store.loadPreparedProject(write.scope))?.revision).toBe(2);
  });

  it('keeps verification captures outside the draft association while still persisting their bytes', async () => {
    const store = makeStore();
    await store.initialize();
    const write = request(makeCapture('verification bytes', 'verification-only'), 'op-verification');
    const outcome = await store.saveCandidate(write);
    expect(outcome.kind).toBe('committed');
    if (outcome.kind !== 'committed') throw new Error('Expected a committed write.');
    expect((await store.loadPreparedProject(write.scope))?.revision).toBe(1);
    expect((await store.loadPreparedProject(write.scope))?.draftCandidateByTurn[write.turnId]).toBeUndefined();
    expect((await store.getCandidateForOperation(write.scope, write.operationId))?.purpose).toBe('verification-only');
  });

  it('rejects conflicting IDs and stale account, turn, and project revisions', async () => {
    const store = makeStore();
    await store.initialize();
    const grant = await acquireGrant(store);
    const original = request(makeCapture('native bytes'), 'op-capture-1', 1, grant);
    await store.saveCandidate(original);
    await expect(store.saveCandidate(request(makeCapture('different bytes'), 'op-capture-1', 1, grant))).rejects.toBeInstanceOf(IdempotencyConflictError);

    const otherAccount = { actorId: actorId('different-account'), projectId: SEEDED_PROJECT_ID };
    await expect(store.loadPreparedProject(otherAccount)).resolves.toBeNull();
    await expect(store.saveCandidate({ ...request(makeCapture('cross-account bytes'), 'op-cross-account', 1, grant), scope: otherAccount }))
      .rejects.toBeInstanceOf(ProjectNotFoundError);

    await expect(store.saveCandidate(request(makeCapture('stale bytes'), 'op-stale', 1, grant)))
      .rejects.toBeInstanceOf(ProjectRevisionConflictError);
    const staleTurn = { ...request(makeCapture('stale turn bytes'), 'op-stale-turn', 2, grant), expectedTurnRevision: 99 };
    await expect(store.saveCandidate(staleTurn)).rejects.toBeInstanceOf(CandidateRevisionConflictError);
    expect((await store.loadPreparedProject(original.scope))?.revision).toBe(2);
  });

  it('keeps the previous draft on quota failure and marks the failed operation for lookup', async () => {
    const quotaOperation = operationId('op-quota');
    const store = makeStore({ quotaExceededFor: new Set([quotaOperation]) });
    await store.initialize();
    const grant = await acquireGrant(store);
    const firstRequest = request(makeCapture('previous draft'), 'op-previous', 1, grant);
    const first = await store.saveCandidate(firstRequest);
    if (first.kind !== 'committed') throw new Error('Expected the first write to commit.');

    await expect(store.saveCandidate(request(makeCapture('quota bytes'), quotaOperation, 2, grant))).rejects.toBeInstanceOf(ServiceStorageFullError);
    expect((await store.loadPreparedProject(firstRequest.scope))?.revision).toBe(2);
    expect((await store.getCurrentCandidate(firstRequest.scope, firstRequest.turnId))?.id).toBe(first.candidateId);
    expect(await store.lookupOperation(firstRequest.scope, quotaOperation)).toMatchObject({ kind: 'failed', code: 'quota-exceeded' });
  });

  it('fails safely when storage is denied and rejects zero-byte capture without an operation write', async () => {
    const denied = makeStore({ failOpen: true });
    await expect(denied.initialize()).rejects.toBeInstanceOf(ServiceStorageUnavailableError);

    const store = makeStore();
    await store.initialize();
    const grant = await acquireGrant(store);
    const empty = makeCapture('');
    await expect(store.saveCandidate(request(empty, 'op-zero', 1, grant))).rejects.toBeInstanceOf(ZeroDataCaptureError);
    await expect(store.lookupOperation(request(empty, 'op-zero').scope, operationId('op-zero'))).resolves.toMatchObject({ kind: 'not-found' });
  });

  it('tombstones once and fences stale writes without reseeding the account project', async () => {
    const store = makeStore();
    await store.initialize();
    const scope = { actorId: SEEDED_ACTOR_ID, projectId: SEEDED_PROJECT_ID };
    const grant = await acquireGrant(store);
    await expect(store.tombstoneProject(scope, 1, operationId('op-delete'))).resolves.toBe(2);
    await expect(store.loadPreparedProject(scope)).resolves.toBeNull();
    await store.initialize();
    await expect(store.loadPreparedProject(scope)).resolves.toBeNull();
    await expect(store.saveCandidate(request(makeCapture('stale after delete'), 'op-after-delete', 2, grant)))
      .rejects.toBeInstanceOf(ProjectDeletedError);
    await expect(store.tombstoneProject(scope, 1, operationId('op-delete-again')))
      .rejects.toBeInstanceOf(ProjectDeletedError);
  });

  it('fences a late callback when a fresh local grant replaces the previous grant', async () => {
    const store = makeStore();
    await store.initialize();
    const oldGrant = await acquireGrant(store);
    const freshGrant = await store.acquireCaptureGrant(
      { actorId: SEEDED_ACTOR_ID, projectId: SEEDED_PROJECT_ID },
      captureGrantId(`grant-fresh-${globalThis.crypto.randomUUID()}`),
      'fresh-tab',
    );
    await expect(store.saveCandidate(request(makeCapture('stale callback'), 'op-stale-callback', 1, oldGrant)))
      .rejects.toBeInstanceOf(CaptureGrantUnavailableError);
    await expect(store.saveCandidate(request(makeCapture('fresh tab bytes'), 'op-fresh-tab', 1, freshGrant)))
      .resolves.toMatchObject({ kind: 'committed' });
  });

  it('freezes exact accepted candidates when the final missing window is in the middle', async () => {
    const finalAcceptId = operationId('op-accept-middle-final');
    const store = makeStore({ loseAcknowledgementFor: new Set([finalAcceptId]) });
    await store.initialize();
    const grant = await acquireGrant(store);
    const scope = { actorId: SEEDED_ACTOR_ID, projectId: SEEDED_PROJECT_ID };
    const turn1 = turnId('sintel-turn-1');
    const turn2 = turnId('sintel-turn-2');
    const turn3 = turnId('sintel-turn-3');
    let revision = 1;
    const acceptedCandidates = new Map<string, StoredCandidate>();

    for (const [target, content, saveOperation] of [
      [turn1, 'accepted bytes 1', 'op-save-window-1'],
      [turn3, 'accepted bytes 3', 'op-save-window-3'],
      [turn2, 'accepted bytes 2', 'op-save-window-2'],
    ] as const) {
      const saved = await store.saveCandidate(request(makeCapture(content), saveOperation, revision, grant, target));
      if (saved.kind !== 'committed') throw new Error('A candidate did not commit.');
      revision = saved.projectRevision;
      const candidate = await store.getCandidate(scope, saved.candidateId);
      if (!candidate) throw new Error('A saved Blob-backed candidate could not be read.');
      acceptedCandidates.set(target, candidate);
      const acceptId = target === turn2 ? finalAcceptId : operationId(`op-accept-${target}`);
      const accepted = await store.acceptCandidate(acceptance(
        candidate,
        grant,
        revision,
        acceptId,
        { kind: 'advance', targetTurnId: turn2, layout: 'B' },
      ));
      revision += 1;
      if (target === turn2) expect(accepted).toMatchObject({ kind: 'unknown', operationId: finalAcceptId });
      else expect(accepted.kind).toBe('committed');
    }

    const reconciled = await store.lookupOperation(scope, finalAcceptId);
    expect(reconciled.kind).toBe('committed');
    if (reconciled.kind !== 'committed' || !reconciled.snapshotId) throw new Error('The initial snapshot was not journaled.');
    expect(reconciled.navigationIntent).toEqual({ kind: 'result', snapshotId: reconciled.snapshotId, layout: 'B' });
    const initialSnapshot = await store.getResultSnapshot(scope, reconciled.snapshotId);
    expect(initialSnapshot?.authorization).toBe('initial-completion');
    expect(initialSnapshot?.takes.map((take) => take.turnId)).toEqual([turn1, turn2, turn3]);
    expect(initialSnapshot?.takes.map((take) => take.acceptedCandidateId)).toEqual([
      acceptedCandidates.get(turn1)?.id,
      acceptedCandidates.get(turn2)?.id,
      acceptedCandidates.get(turn3)?.id,
    ]);
    expect(initialSnapshot?.takes.map((take) => take.captureOperationId)).toEqual([
      'op-save-window-1', 'op-save-window-2', 'op-save-window-3',
    ]);
    expect(initialSnapshot?.contentSha256).toMatch(/^[a-f0-9]{64}$/);
    expect((await store.loadPreparedProject(scope))?.initialResultSnapshotId).toBe(initialSnapshot?.id);

    const replacementSaved = await store.saveCandidate(request(makeCapture('replacement bytes'), 'op-replacement-save', revision, grant, turn1));
    if (replacementSaved.kind !== 'committed') throw new Error('The replacement candidate did not commit.');
    revision = replacementSaved.projectRevision;
    const replacement = await store.getCandidate(scope, replacementSaved.candidateId);
    if (!replacement) throw new Error('The replacement candidate is missing.');
    const replacementAccepted = await store.acceptCandidate(acceptance(
      replacement, grant, revision, 'op-replacement-accept', { kind: 'advance', targetTurnId: turn2, layout: 'B' },
    ));
    expect(replacementAccepted).toMatchObject({ kind: 'committed', navigationIntent: { kind: 'stay' } });
    revision += 1;
    expect((await store.loadPreparedProject(scope))?.initialResultSnapshotId).toBe(initialSnapshot?.id);
    expect((await store.loadPreparedProject(scope))?.acceptedByTurn[turn1]).toBe(replacement.id);

    const explicitOperation = operationId('op-authorize-latest-result');
    const explicitSnapshotId = `snapshot:${explicitOperation}` as import('../contracts').SnapshotId;
    const authorized = await store.authorizeResultSnapshot({
      scope,
      grant,
      expectedProjectRevision: revision,
      operationId: explicitOperation,
      navigationIntent: { kind: 'result', snapshotId: explicitSnapshotId, layout: 'B' },
    });
    expect(authorized.kind).toBe('committed');
    if (authorized.kind !== 'committed') throw new Error('The latest snapshot did not commit.');
    expect(authorized.snapshot.authorization).toBe('explicit-completed-revision');
    expect(authorized.snapshot.takes[0]?.acceptedCandidateId).toBe(replacement.id);
    expect((await store.loadPreparedProject(scope))?.latestResultSnapshotId).toBe(authorized.snapshot.id);
  });

  it('removes only the current candidate and preserves the previously accepted take', async () => {
    const store = makeStore();
    await store.initialize();
    const grant = await acquireGrant(store);
    const scope = { actorId: SEEDED_ACTOR_ID, projectId: SEEDED_PROJECT_ID };
    const first = await store.saveCandidate(request(makeCapture('accepted take bytes'), 'op-accepted-take', 1, grant));
    if (first.kind !== 'committed') throw new Error('The accepted candidate did not save.');
    const acceptedCandidate = await store.getCandidate(scope, first.candidateId);
    if (!acceptedCandidate) throw new Error('The accepted candidate is missing.');
    const acceptResult = await store.acceptCandidate(acceptance(
      acceptedCandidate, grant, first.projectRevision, 'op-accept-take', { kind: 'stay' },
    ));
    if (acceptResult.kind !== 'committed') throw new Error('The candidate was not accepted.');
    const draft = await store.saveCandidate(request(makeCapture('candidate to discard'), 'op-disposable-draft', acceptResult.projectRevision, grant));
    if (draft.kind !== 'committed') throw new Error('The disposable candidate did not save.');
    const draftCandidate = await store.getCandidate(scope, draft.candidateId);
    if (!draftCandidate) throw new Error('The disposable candidate is missing.');
    const discarded = await store.discardCandidate({
      scope,
      grant,
      turnId: draftCandidate.turnId,
      candidateId: draftCandidate.id,
      expectedProjectRevision: draft.projectRevision,
      operationId: operationId('op-discard-draft'),
      navigationIntent: { kind: 'exit' },
    });
    expect(discarded).toMatchObject({ kind: 'committed', navigationIntent: { kind: 'exit' } });
    const project = await store.loadPreparedProject(scope);
    expect(project?.acceptedByTurn[draftCandidate.turnId]).toBe(acceptedCandidate.id);
    expect(project?.draftCandidateByTurn[draftCandidate.turnId]).toBeUndefined();
    expect(await store.getCandidate(scope, draftCandidate.id)).toBeNull();
    expect(await store.getCandidate(scope, acceptedCandidate.id)).not.toBeNull();
    expect(await store.findIncompleteNavigationIntent(scope)).toMatchObject({ intent: { kind: 'exit' } });
  });
});
